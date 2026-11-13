// @vitest-environment jsdom
import {act,createElement,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {PageTransitions} from './src/react';
import {mount,createPageTransition} from './src/core';
vi.mock('./src/core',async importOriginal=>{
 const actual=await importOriginal<typeof import('./src/core')>();
 const observe=(api:ReturnType<typeof actual.createPageTransition>)=>Object.assign(api,{replay:vi.fn(api.replay),update:vi.fn(api.update),destroy:vi.fn(api.destroy)});
 return {...actual,mount:vi.fn((...args:Parameters<typeof actual.mount>)=>observe(actual.mount(...args))),createPageTransition:vi.fn((...args:Parameters<typeof actual.createPageTransition>)=>observe(actual.createPageTransition(...args)))};
});
const scope=globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT?:boolean};
beforeEach(()=>{scope.IS_REACT_ACT_ENVIRONMENT=true;vi.mocked(mount).mockClear();vi.mocked(createPageTransition).mockClear();vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));});
afterEach(()=>{vi.unstubAllGlobals();delete scope.IS_REACT_ACT_ENVIRONMENT;});
function StatefulContent(){const[count,setCount]=useState(0);return createElement('button',{onClick:()=>setCount(value=>value+1)},`Count ${count}`);}
it('preserves live demo settings, custom child state and route replay across mode changes',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(createElement(PageTransitions,{heading:'Initial',autoplay:false,routeKey:'one'})));
  const demo=vi.mocked(mount).mock.results[0].value;
  await act(async()=>root.render(createElement(PageTransitions,{heading:'Current',autoplay:false,routeKey:'one'})));
  expect(mount).toHaveBeenCalledTimes(1);expect(demo.update).toHaveBeenLastCalledWith(expect.objectContaining({heading:'Current'}));expect(host.querySelector('h2')?.textContent).toBe('Current');
  await act(async()=>root.render(createElement(PageTransitions,{heading:'Custom current',autoplay:false,routeKey:'one'},createElement(StatefulContent))));
  expect(demo.destroy).toHaveBeenCalledTimes(1);expect(createPageTransition).toHaveBeenCalledTimes(1);const live=vi.mocked(createPageTransition).mock.results[0].value;
  const button=host.querySelector<HTMLButtonElement>('button')!;await act(async()=>button.click());expect(button.textContent).toBe('Count 1');
  await act(async()=>root.render(createElement(PageTransitions,{heading:'Latest',background:'#123456',autoplay:false,routeKey:'two'},createElement(StatefulContent))));
  expect(createPageTransition).toHaveBeenCalledTimes(1);expect(host.querySelector('button')).toBe(button);expect(button.textContent).toBe('Count 1');expect(live.update).toHaveBeenLastCalledWith(expect.objectContaining({heading:'Latest',background:'#123456'}));expect(live.replay).toHaveBeenCalledTimes(1);
  await act(async()=>root.render(createElement(PageTransitions,{heading:'Latest',background:'#123456',autoplay:false,routeKey:'three',paused:true},createElement(StatefulContent))));expect(live.replay).toHaveBeenCalledTimes(1);
  await act(async()=>root.render(createElement(PageTransitions,{heading:'Latest',background:'#123456',autoplay:false,routeKey:'three',paused:false},createElement(StatefulContent))));expect(live.replay).toHaveBeenCalledTimes(1);
  await act(async()=>root.render(createElement(PageTransitions,{heading:'Returned demo',autoplay:false,routeKey:'three'})));
  expect(live.destroy).toHaveBeenCalledTimes(1);expect(mount).toHaveBeenCalledTimes(2);expect(host.querySelector('h2')?.textContent).toBe('Returned demo');
  const returned=vi.mocked(mount).mock.results[1].value;await act(async()=>root.unmount());expect(returned.destroy).toHaveBeenCalledTimes(1);
 }finally{await act(async()=>root.unmount());host.remove();}
});
it('treats null children as custom content and cancels pending navigation on unmount',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(createElement(PageTransitions,{autoplay:false},null)));
  expect(mount).not.toHaveBeenCalled();expect(createPageTransition).toHaveBeenCalledTimes(1);const live=vi.mocked(createPageTransition).mock.results[0].value;
  const ready=vi.fn(()=>new Promise<void>(()=>{})),commit=vi.fn();let pending:ReturnType<typeof live.navigate>;
  await act(async()=>{pending=live.navigate({ready,commit});});expect(ready).toHaveBeenCalledTimes(1);expect(live.phase).toBe('covered');
  await act(async()=>root.unmount());expect(await pending!).toEqual({status:'cancelled'});expect(commit).not.toHaveBeenCalled();expect(live.phase).toBe('destroyed');expect(live.destroy).toHaveBeenCalledTimes(1);expect(host.childElementCount).toBe(0);
 }finally{await act(async()=>root.unmount());host.remove();}
});
