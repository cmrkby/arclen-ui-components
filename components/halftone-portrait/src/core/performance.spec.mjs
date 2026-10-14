import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {fileURLToPath} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
const entry=fileURLToPath(new URL('./index.ts',import.meta.url));
const {outputFiles}=await build({stdin:{contents:`import {mount} from ${JSON.stringify(entry)};window.baseSettings=new URLSearchParams(location.search).get('site')?{fit:'contain'}:{};window.portrait=mount(document.querySelector('#root'),window.baseSettings);`,resolveDir:fileURLToPath(new URL('.',import.meta.url)),loader:'ts'},bundle:true,write:false,format:'iife'});
const css=await readFile(new URL('../styles.css',import.meta.url),'utf8');
const html='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#0a0a0a}*{box-sizing:border-box}#root{width:100%;min-height:480px;position:relative}img{max-width:100%}'+css+'</style><div id="root"></div><script src="/component.js"></script>';
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/component.js'?'application/javascript':'text/html');res.end(req.url==='/component.js'?outputFiles[0].text:html);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true}),results=[];
const output=process.argv[2];if(output)await mkdir(output,{recursive:true});
try{
 for(const width of [390,768,992,1440]){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.tasks=[];window.frameCosts=[];const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>raf(time=>{const start=performance.now();callback(time);window.frameCosts.push(performance.now()-start);});new PerformanceObserver(list=>window.tasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});});
  await page.goto('http://127.0.0.1:'+server.address().port+(width===992?'/?site=1':''),{waitUntil:'networkidle'});await page.locator('[data-state="ready"]').waitFor();if(width===992){await page.evaluate(()=>document.querySelector('#root').style.height='760px');await page.waitForTimeout(100);}
  const start=await page.evaluate(()=>performance.now());const interactionStart=Date.now();let moves=0;
  while(Date.now()-interactionStart<5000){await page.mouse.move(Math.min(width-20,100+(moves%20)*45),300+(moves%2)*40);moves++;await page.waitForTimeout(16);}
  const interactionEnd=await page.evaluate(()=>performance.now());

  const result=await page.evaluate(start=>({width:innerWidth,height:document.querySelector('.arclen-halftone').clientHeight,background:getComputedStyle(document.querySelector('.arclen-halftone')).backgroundColor,points:Number(document.querySelector('.arclen-halftone').dataset.points),frames:Number(document.querySelector('.arclen-halftone').dataset.frames),frameCosts:{count:window.frameCosts.length,max:Math.max(...window.frameCosts),p95:[...window.frameCosts].sort((a,b)=>a-b)[Math.floor(window.frameCosts.length*.95)]},longTasks:window.tasks,steadyLongTasks:window.tasks.filter(t=>t.start>=start)}),start);
  const feedback=await page.evaluate(async()=>{
   const host=document.querySelector('.arclen-halftone'),box=host.getBoundingClientRect();
   let started=performance.now();host.dispatchEvent(new PointerEvent('pointermove',{clientX:box.left+box.width/2,clientY:box.top+300,pointerType:'mouse'}));await new Promise(requestAnimationFrame);const pointerMs=performance.now()-started;
   const settings=[];
   for(const [key,value]of [['force',33],['color','#f54e00'],['spacing',3],['contrast',1.25]]){
    started=performance.now();window.portrait.update({...window.baseSettings,[key]:value});await new Promise(requestAnimationFrame);
    const feedbackMs=performance.now()-started,pending=host.dataset.rendering==='true';
    const status=host.querySelector('[role=status]'),box=status.getBoundingClientRect(),style=getComputedStyle(status);
    const statusVisible=pending&&!status.hidden&&style.display!=='none'&&style.visibility!=='hidden'&&box.width>0&&box.height>0&&box.top>=0&&box.bottom<=innerHeight;
    if(pending){while(host.dataset.rendering==='true')await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);}
    settings.push({key,value,feedbackMs,pending,statusVisible,settledPaintMs:performance.now()-started});
   }
   return {pointerMs,settings};
  });
  result.interaction={durationMs:interactionEnd-start,moves};result.feedback=feedback;
  assert.equal(result.background,'rgba(0, 0, 0, 0)');assert.equal(errors.length,0);assert.ok(result.points>0);
  if(output)await page.screenshot({path:output+'/halftone-'+width+'.png',fullPage:true});results.push({...result,errors,runtime:{node:process.version,browser:browser.version()}});await page.close();
 }
 console.log(JSON.stringify(results,null,2));if(output)await writeFile(output+'/halftone-performance.json',JSON.stringify(results,null,2));assert.ok(results.every(r=>r.steadyLongTasks.length<2),'Repeated steady-state long tasks');assert.ok(results.every(r=>r.feedback.pointerMs<100&&r.feedback.settings.every(s=>s.feedbackMs<100&&(!s.pending||s.statusVisible))),'Feedback exceeds 100ms');
}finally{await browser.close();server.close();}
