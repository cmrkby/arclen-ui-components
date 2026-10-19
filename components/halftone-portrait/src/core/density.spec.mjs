import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {fileURLToPath} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

// Normal regression: node components/halftone-portrait/src/core/density.spec.mjs [output].
// Optional exact-source differential uses HALFTONE_REFERENCE_DIR and HALFTONE_BASELINE_REF.
const directory=fileURLToPath(new URL('.',import.meta.url));
const repository=path.resolve(directory,'../../../..');
const output=process.argv[2];if(output)await mkdir(output,{recursive:true});
const variants=['fixed'];
const dpr=Number(process.env.HALFTONE_DPR||2);
if(process.env.HALFTONE_REFERENCE_DIR)variants.push('original');
if(process.env.HALFTONE_BASELINE_REF)variants.push('before');
const bundles={};
for(const variant of variants){
 const plugins=[{name:'renderer-source',setup(api){
  api.onLoad({filter:/\/(engine|math)\.ts$/},async args=>{
   if(variant==='fixed')return;
   const contents=variant==='original'?await readFile(path.join(process.env.HALFTONE_REFERENCE_DIR,path.basename(args.path)),'utf8'):execFileSync('git',['show',`${process.env.HALFTONE_BASELINE_REF}:${path.relative(repository,args.path)}`],{cwd:repository,encoding:'utf8'});
   return {contents,loader:'ts',resolveDir:directory};
  });
 }}];
 const built=await build({stdin:{contents:`import {HalftonePortrait} from './engine';import {defaults} from './index';import {artwork} from './assets';window.start=(name,settings={})=>{window.engine?.destroy();window.engine=new HalftonePortrait(document.querySelector('#root'),{...defaults,fit:'contain',...settings,src:artwork[name]});};window.start('ronin');`,resolveDir:directory,loader:'ts'},bundle:true,write:false,format:'iife',loader:{'.webp':'dataurl'},plugins});
 bundles[variant]=built.outputFiles[0].text;
}
const html=variant=>'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#0a0a0a}#root{position:relative;width:100vw;height:var(--height);outline:none}.portrait-status[hidden]{display:none}</style><div id="root"></div><script>document.documentElement.style.setProperty("--height",new URLSearchParams(location.search).get("height")+"px")</script><script src="/'+variant+'.js"></script>';
const server=createServer((req,res)=>{const url=new URL(req.url,'http://localhost');const variant=url.pathname.slice(1).replace('.js','')||'fixed';res.setHeader('Content-Type',url.pathname.endsWith('.js')?'application/javascript':'text/html');res.end(url.pathname.endsWith('.js')?bundles[variant]:html(variant));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true}),results=[];
const layouts=[{width:375,height:520},{width:768,height:760},{width:992,height:760},{width:1440,height:1100}].filter(layout=>!process.env.HALFTONE_WIDTHS||process.env.HALFTONE_WIDTHS.split(',').map(Number).includes(layout.width));
const snapshot=page=>page.evaluate(()=>{
 const e=window.engine;e.reset(true);e.stop();e.draw(performance.now());const coordinates=e.points.every(p=>p.homeX%e.options.spacing===0&&p.homeY%e.options.spacing===0);
 return {width:e.width,height:e.height,dpr:e.dpr,canvasWidth:e.canvas.width,canvasHeight:e.canvas.height,points:e.points.length,coordinates,bitmap:e.canvas.toDataURL(),frame:e.frame};
});
try{
 for(const layout of layouts){
  const captures={};
  for(const variant of variants){
   const page=await browser.newPage({viewport:{width:layout.width,height:Math.max(layout.height,800)},deviceScaleFactor:dpr}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{window.frameCosts=[];window.tasks=[];const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>raf(time=>{const t=performance.now();callback(time);window.frameCosts.push(performance.now()-t);});new PerformanceObserver(list=>window.tasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});});
   await page.goto(`http://127.0.0.1:${server.address().port}/${variant}?height=${layout.height}`);
   await page.waitForFunction(()=>window.engine?.points.length>0&&window.engine.frame===0);
   const portraits=[];
   for(const example of [{artwork:'ronin'},{artwork:'eclipse'},{artwork:'sentinel'},{artwork:'ronin',settings:{size:3,variation:0}},{artwork:'ronin',settings:{colorMode:'original'}},{artwork:'ronin',settings:{colorMode:'photo'}}]){
    const {artwork,settings}=example;
    await page.evaluate(example=>window.start(example.artwork,example.settings),example);
    await page.waitForFunction(()=>window.engine?.points.length>0&&window.engine.frame===0);
    const capture=await snapshot(page);const {bitmap,...metrics}=capture;
    portraits.push({artwork,settings:settings??{},...metrics,pixelHash:createHash('sha256').update(bitmap).digest('hex')});
    if(output&&artwork==='ronin'&&!settings)await page.locator('#root').screenshot({path:`${output}/${variant}-${layout.width}-dpr${dpr}.png`});
   }
   const motion=[];
   for(const settings of [{cursorMode:'repel'},{cursorMode:'attract'},{cursorMode:'swirl'},{size:3,variation:0},{colorMode:'original'},{colorMode:'photo'}]){
    await page.evaluate(settings=>window.start('ronin',settings),settings);
    await page.waitForFunction(()=>window.engine?.points.length>0&&window.engine.frame===0);
    await page.waitForTimeout(50);
    const hashes=await page.evaluate(async()=>{
     const e=window.engine,hashes=[];e.stop();e.reset(true);e.stop();e.draw(1000);e.stop();
     const positions=[[.5,.5],[.52,.52],[.7,.6],[1,.5],[.5,.5],[.3,.4],[0,0],[.5,1],[.5,.5]];
     for(let i=0;i<positions.length+4;i++){
      if(i===positions.length+1)await e.setOptions({force:33});
      if(i===positions.length+2)await e.setOptions({color:'#ff9900',size:2});
      if(i===positions.length+3)await e.setOptions({color:'#ffffff',size:1});
      const pos=positions[i];e.pointer=pos?{x:e.width*pos[0],y:e.height*pos[1],active:true}:{x:e.width*.5,y:e.height*.5,active:false};
      e.stop();e.draw(1000+(i+1)*16.6667);e.stop();
      const pixels=e.context.getImageData(0,0,e.canvas.width,e.canvas.height).data;
      if('needsFullDraw' in e){
       // Repaint the same positions in full as an independent check on dirty bounds.
       // Zero response/smoothing freezes coordinates, not the rendering geometry.
       const speed=e.options.returnSpeed,smoothing=e.options.cursorSmoothing;
       e.options.returnSpeed=0;e.options.cursorSmoothing=0;e.needsFullDraw=true;
       e.stop();e.draw(1000+(i+1)*16.6667);e.stop();
       e.options.returnSpeed=speed;e.options.cursorSmoothing=smoothing;
       const full=e.context.getImageData(0,0,e.canvas.width,e.canvas.height).data;
       const a=new Uint32Array(pixels.buffer,pixels.byteOffset,pixels.byteLength/4),b=new Uint32Array(full.buffer,full.byteOffset,full.byteLength/4);let equal=true;for(let pixel=0;pixel<a.length;pixel++)if(a[pixel]!==b[pixel]){equal=false;break;}
       if(!equal)throw Error('Dirty redraw differs from full redraw: '+JSON.stringify({frame:i,mode:e.options.cursorMode,colorMode:e.options.colorMode,size:e.options.size}));
      }
      hashes.push([...new Uint8Array(await crypto.subtle.digest('SHA-256',pixels))].map(x=>x.toString(16).padStart(2,'0')).join(''));
     }
     return hashes;
    });
    motion.push({settings,hashes});
   }
   const behaviors={};
   await page.evaluate(()=>window.start('ronin'));
   await page.waitForFunction(()=>window.engine?.points.length>0&&window.engine.frame===0);
   await page.evaluate(()=>{window.frameCosts=[];window.tasks=[];});
   for(let i=0;i<20;i++)await page.mouse.move(layout.width*(.35+i*.015),layout.height*(.4+(i%2)*.02));
   await page.mouse.move(layout.width+20,0);
   await page.waitForFunction(()=>window.engine.frame===0);
   const pointerCosts=await page.evaluate(()=>({frames:window.frameCosts.length,maxFrameMs:Math.max(...window.frameCosts),p95FrameMs:[...window.frameCosts].sort((a,b)=>a-b)[Math.floor(window.frameCosts.length*.95)],longTasks:window.tasks}));
   if(variant==='fixed'){
    assert.ok(portraits.every(p=>p.coordinates),'Every sample must remain on the authored 2px grid');
    assert.ok(portraits.every(p=>p.canvasWidth===Math.round(layout.width*dpr)&&p.canvasHeight===Math.round(layout.height*dpr)));
    await page.evaluate(()=>window.start('ronin',{showCursor:true}));
    await page.waitForFunction(()=>window.engine?.points.length>0&&window.engine.frame===0);
    await page.mouse.move(layout.width/2,layout.height/2);
    await page.waitForFunction(()=>window.engine.pointer.active&&window.engine.points.some(p=>Math.abs(p.x-p.homeX)>.5||Math.abs(p.y-p.homeY)>.5));
    behaviors.pointerDisplaces=true;
    await page.evaluate(()=>window.engine.reset(true));
    await page.waitForFunction(()=>window.engine.frame===0);
    assert.equal(await page.evaluate(()=>window.engine.points.every(p=>p.x===p.homeX&&p.y===p.homeY)),true);behaviors.resetRestores=true;
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.mouse.move(layout.width/2+20,layout.height/2+20);
    await page.waitForFunction(()=>window.engine.frame===0);
    behaviors.reducedMotion=await page.evaluate(()=>window.engine.reduced&&!window.engine.pointer.active&&window.engine.points.every(p=>p.x===p.homeX&&p.y===p.homeY));assert.ok(behaviors.reducedMotion);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.evaluate(()=>document.querySelector('#root').style.transform='translateY(3000px)');
    await page.waitForFunction(()=>!window.engine.visible&&window.engine.frame===0);behaviors.offscreenSuspends=true;
    await page.evaluate(()=>document.querySelector('#root').style.transform='');
    await page.waitForFunction(()=>window.engine.visible&&window.engine.frame===0);
    behaviors.visibleResumes=true;
    behaviors.coalescedUpdates=await page.evaluate(async()=>{
      const first=window.engine.setOptions({color:'#ff9900'});
      const second=window.engine.setOptions({color:'#00aaff'});
      const deferred=window.engine.width*window.engine.height>1_000_000;
      const sharedJob=!deferred||first===second;
      const acknowledged=!deferred||(!window.engine.status.hidden&&window.engine.host.dataset.rendering==='true');
      await Promise.all([first,second]);window.engine.stop();window.engine.draw(performance.now());window.engine.stop();
      return {sharedJob,acknowledged,latestColor:window.engine.points.every(p=>p.color==='#00aaff')};
    });
    assert.deepEqual(behaviors.coalescedUpdates,{sharedJob:true,acknowledged:true,latestColor:true});
    // Opaque white image makes the expected sample count exact, independent of artwork tones.
    await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=c.height=2;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,2,2);await window.engine.setOptions({fit:'cover',variation:0});await window.engine.setImage(c.toDataURL());});
    await page.waitForFunction(()=>window.engine.frame===0);
    const solid=await snapshot(page);behaviors.solidPoints=solid.points;
    assert.equal(solid.points,Math.ceil(layout.width/2)*Math.ceil(layout.height/2),'Large hosts must not silently thin the sampling grid');
    await page.evaluate(async()=>{const pending=window.engine.setOptions({contrast:1.2});window.engine.destroy();await pending;});
    await page.waitForTimeout(80);
    behaviors.cleanup=await page.evaluate(()=>window.engine.destroyed&&window.engine.frame===0&&window.engine.points.length===0&&!document.querySelector('canvas')&&!document.querySelector('.portrait-status'));assert.ok(behaviors.cleanup);
   }
   const costs=await page.evaluate(()=>({frames:window.frameCosts.length,maxFrameMs:Math.max(...window.frameCosts),p95FrameMs:[...window.frameCosts].sort((a,b)=>a-b)[Math.floor(window.frameCosts.length*.95)],longTasks:window.tasks}));
   assert.deepEqual(errors,[]);captures[variant]={portraits,motion};results.push({variant,layout,dpr,portraits,motion,behaviors,pointerCosts,costs,errors});await page.close();
  }
  if(captures.original)assert.deepEqual(captures.fixed,captures.original,'Fixed renderer must match original sample counts and exact canvas pixels');
 }
 const report={createdAt:new Date().toISOString(),baselineRef:process.env.HALFTONE_BASELINE_REF??null,referenceDirectory:process.env.HALFTONE_REFERENCE_DIR??null,results};
 if(output)await writeFile(output+'/report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(results.map(r=>({variant:r.variant,width:r.layout.width,portraits:r.portraits.map(p=>({artwork:p.artwork,points:p.points})),behaviors:r.behaviors,costs:r.costs})),null,2));
}finally{await browser.close();server.close();}
