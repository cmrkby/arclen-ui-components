import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
const entry=fileURLToPath(new URL('./index.ts',import.meta.url));
const {outputFiles}=await build({stdin:{contents:`import {mount} from ${JSON.stringify(entry)};window.field=mount(document.querySelector('#root'),{showText:false});`,resolveDir:fileURLToPath(new URL('.',import.meta.url)),loader:'ts'},bundle:true,write:false,format:'iife',loader:{'.webp':'dataurl'}});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:800,height:500}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<style>'+await readFile(new URL('../styles.css',import.meta.url),'utf8')+'</style><div id="root" style="height:450px"></div>');
 await page.addScriptTag({content:outputFiles[0].text});
 const headline=page.locator('[data-signal-layer="text"]');
 assert.equal(await headline.count(),1);
 assert.equal(await headline.isVisible(),false);
 await page.evaluate(()=>window.field.update({showText:true}));
 assert.equal(await headline.isVisible(),true);
 assert.equal(await headline.textContent(),'Motion, made visible.');
 await page.evaluate(()=>{window.field.pause();window.field.update({showText:true,text:'Changed headline'});});
 assert.equal(await headline.isVisible(),true);assert.equal(await headline.textContent(),'Changed headline');
 await page.evaluate(()=>window.field.update({showText:false}));assert.equal(await headline.isVisible(),false);
 await page.evaluate(()=>window.field.resume());assert.equal(await headline.isVisible(),false);
 assert.deepEqual(errors,[]);
 console.log('PASS: mounted Signal headline toggles false → true → edited while paused → false without errors.');
}finally{await browser.close();}
