// @vitest-environment jsdom
import {act,createElement,StrictMode} from 'react';
import {renderToString} from 'react-dom/server';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {NumberReel,Component} from './src/react';
import {mount} from './src/core';
vi.mock('./src/core',async importOriginal=>{
 const actual=await importOriginal<typeof import('./src/core')>();
 return {...actual,mount:vi.fn((...args:Parameters<typeof actual.mount>)=>{
  const controller=actual.mount(...args);
  return {...controller,update:vi.fn(controller.update),pause:vi.fn(controller.pause),resume:vi.fn(controller.resume),destroy:vi.fn(controller.destroy)};
 })};
});
const scope=globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT?:boolean};
let now:number,id:number,frames:Map<number,FrameRequestCallback>,disconnected:number;
beforeEach(()=>{
 scope.IS_REACT_ACT_ENVIRONMENT=true;vi.mocked(mount).mockClear();now=100;id=0;frames=new Map();disconnected=0;
 vi.spyOn(performance,'now').mockImplementation(()=>now);
 vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.set(++id,callback);return id;});
 vi.stubGlobal('cancelAnimationFrame',(key:number)=>frames.delete(key));
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){disconnected++;}});
 vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){disconnected++;}});
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();delete scope.IS_REACT_ACT_ENVIRONMENT;});
const step=(time:number)=>{now=time;const batch=[...frames.values()];frames.clear();batch.forEach(callback=>callback(time));};
describe('Number Reel React lifecycle',()=>{
 it('preserves the exported alias and initial SSR host nesting and value',()=>{
  expect(Component).toBe(NumberReel);const host=document.createElement('div');host.innerHTML=renderToString(createElement(NumberReel,{value:12,fractionDigits:0,className:'metric'}));
  expect(host.firstElementChild?.tagName).toBe('SPAN');expect(host.firstElementChild?.firstElementChild?.tagName).toBe('SPAN');expect(host.querySelector('.nr-accessible')?.textContent).toBe('12');expect(host.firstElementChild?.className).toBe('metric');expect(mount).not.toHaveBeenCalled();
 });
 it('animates value and format changes on one controller, freezes pauses and cleans pending work',async()=>{
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  try{
   await act(async()=>root.render(createElement(NumberReel,{value:9,fractionDigits:0})));
   const outer=host.firstElementChild,inner=outer?.firstElementChild,stage=host.querySelector('.nr-stage'),controller=vi.mocked(mount).mock.results[0].value;
   await act(async()=>root.render(createElement(NumberReel,{value:10,fractionDigits:0,className:'updated'})));
   expect(mount).toHaveBeenCalledTimes(1);expect(host.firstElementChild).toBe(outer);expect(outer?.firstElementChild).toBe(inner);expect(host.querySelector('.nr-stage')).toBe(stage);expect(frames.size).toBe(1);
   step(300);const frozen=stage?.innerHTML;
   await act(async()=>root.render(createElement(NumberReel,{value:10,fractionDigits:0,paused:true})));
   expect(frames.size).toBe(0);step(500);expect(stage?.innerHTML).toBe(frozen);expect(controller.pause).toHaveBeenCalled();
   await act(async()=>root.render(createElement(NumberReel,{value:42,format:'currency',currency:'USD',fractionDigits:2,paused:true})));
   expect(frames.size).toBe(0);expect(mount).toHaveBeenCalledTimes(1);expect(controller.update).toHaveBeenLastCalledWith(expect.objectContaining({value:42,format:'currency',fractionDigits:2}));
   await act(async()=>root.render(createElement(NumberReel,{value:42,format:'currency',currency:'USD',fractionDigits:2,paused:false})));
   expect(frames.size).toBe(1);step(600);step(2000);expect(frames.size).toBe(0);expect(host.querySelector('.nr-accessible')?.textContent).toBe('$42.00');
   await act(async()=>root.render(createElement(NumberReel,{value:99,fractionDigits:0})));expect(frames.size).toBe(1);
   await act(async()=>root.unmount());expect(frames.size).toBe(0);expect(controller.destroy).toHaveBeenCalledTimes(1);expect(disconnected).toBe(2);
  }finally{await act(async()=>root.unmount());host.remove();}
 });
 it('destroys StrictMode rehearsal separately and updates the surviving instance',async()=>{
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  try{
   await act(async()=>root.render(createElement(StrictMode,null,createElement(NumberReel,{value:3,fractionDigits:0,paused:true}))));
   expect(mount).toHaveBeenCalledTimes(2);const[first,live]=vi.mocked(mount).mock.results.map(result=>result.value);expect(first.destroy).toHaveBeenCalledTimes(1);expect(live.destroy).not.toHaveBeenCalled();
   await act(async()=>root.render(createElement(StrictMode,null,createElement(NumberReel,{value:8,fractionDigits:0,paused:false}))));
   expect(mount).toHaveBeenCalledTimes(2);expect(frames.size).toBe(1);step(200);step(2000);expect(host.querySelector('.nr-accessible')?.textContent).toBe('8');
   await act(async()=>root.unmount());expect(first.destroy).toHaveBeenCalledTimes(1);expect(live.destroy).toHaveBeenCalledTimes(1);expect(frames.size).toBe(0);expect(disconnected).toBe(4);
  }finally{await act(async()=>root.unmount());host.remove();}
 });
});
