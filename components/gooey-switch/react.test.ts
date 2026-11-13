// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {GooeySwitch} from './src/react';
const scope=globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT?:boolean};
beforeEach(()=>{scope.IS_REACT_ACT_ENVIRONMENT=true;vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));});
afterEach(()=>{vi.unstubAllGlobals();delete scope.IS_REACT_ACT_ENVIRONMENT;});
describe('GooeySwitch React ownership',()=>{
 it('retains uncontrolled user choice across unrelated props and calls only the latest callback',async()=>{
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host),first=vi.fn(),latest=vi.fn();
  try{
   await act(async()=>root.render(createElement(GooeySwitch,{defaultChecked:false,onCheckedChange:first})));
   const button=host.querySelector<HTMLButtonElement>('button')!;
   await act(async()=>button.click());expect(button.getAttribute('aria-checked')).toBe('true');expect(first).toHaveBeenCalledTimes(1);
   await act(async()=>root.render(createElement(GooeySwitch,{defaultChecked:false,onCheckedChange:latest,className:'changed'})));
   expect(host.querySelector('button')).toBe(button);expect(button.getAttribute('aria-checked')).toBe('true');
   await act(async()=>button.click());expect(button.getAttribute('aria-checked')).toBe('false');expect(first).toHaveBeenCalledTimes(1);expect(latest).toHaveBeenCalledTimes(1);expect(latest.mock.calls[0][0]).toBe(false);
   await act(async()=>root.unmount());button.click();expect(latest).toHaveBeenCalledTimes(1);
  }finally{await act(async()=>root.unmount());host.remove();}
 });
 it('requests controlled changes without overriding checked props',async()=>{
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host),changed=vi.fn();
  try{
   await act(async()=>root.render(createElement(GooeySwitch,{checked:false,onCheckedChange:changed})));
   const button=host.querySelector<HTMLButtonElement>('button')!;
   await act(async()=>button.click());expect(changed.mock.calls[0][0]).toBe(true);expect(button.getAttribute('aria-checked')).toBe('false');
   await act(async()=>root.render(createElement(GooeySwitch,{checked:true,onCheckedChange:changed})));
   expect(host.querySelector('button')).toBe(button);expect(button.getAttribute('aria-checked')).toBe('true');
   await act(async()=>root.render(createElement(GooeySwitch,{checked:false,onCheckedChange:changed})));expect(button.getAttribute('aria-checked')).toBe('false');
  }finally{await act(async()=>root.unmount());host.remove();}
 });
});
