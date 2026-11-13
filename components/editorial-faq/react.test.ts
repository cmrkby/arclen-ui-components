// @vitest-environment jsdom
import {act,createElement,StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {EditorialFAQ} from './src/react';
import {mount} from './src/core';
vi.mock('./src/core',async importOriginal=>{
 const actual=await importOriginal<typeof import('./src/core')>();
 return {...actual,mount:vi.fn((...args:Parameters<typeof actual.mount>)=>{
  const controller=actual.mount(...args);
  return {...controller,update:vi.fn(controller.update),pause:vi.fn(controller.pause),resume:vi.fn(controller.resume),destroy:vi.fn(controller.destroy)};
 })};
});
const scope=globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT?:boolean};
beforeEach(()=>{scope.IS_REACT_ACT_ENVIRONMENT=true;vi.mocked(mount).mockClear();});
afterEach(()=>{delete scope.IS_REACT_ACT_ENVIRONMENT;});
describe('Editorial FAQ React lifecycle',()=>{
 it('mounts once while live settings, presentation and pause changes use the same controller',async()=>{
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  try{
   await act(async()=>root.render(createElement(EditorialFAQ,{titles:['First'],descriptions:['Initial answer'],initialOpen:0,paused:true})));
   const element=host.querySelector('.efq')!,button=host.querySelector('button')!,id=button.id,controller=vi.mocked(mount).mock.results[0].value;
   expect(vi.mocked(mount)).toHaveBeenCalledTimes(1);expect(element.getAttribute('data-quiet')).toBe('true');expect(button.getAttribute('aria-expanded')).toBe('true');
   await act(async()=>root.render(createElement(EditorialFAQ,{titles:['Changed'],descriptions:['New answer'],initialOpen:0,theme:'light',maxWidth:640,paused:false,className:'changed'})));
   expect(mount).toHaveBeenCalledTimes(1);expect(host.querySelector('.efq')).toBe(element);expect(host.querySelector('button')).toBe(button);expect(button.id).toBe(id);
   expect(button.textContent).toContain('Changed');expect(element.querySelector('p')?.textContent).toBe('New answer');expect(element.getAttribute('data-theme')).toBe('light');expect(element.getAttribute('data-quiet')).toBe('false');expect(controller.resume).toHaveBeenCalled();
   await act(async()=>{button.click();});expect(button.getAttribute('aria-expanded')).toBe('false');
   await act(async()=>root.render(createElement(EditorialFAQ,{titles:['Changed'],descriptions:['New answer'],initialOpen:0,theme:'light',maxWidth:640,paused:true,className:'presentation-only'})));
   expect(mount).toHaveBeenCalledTimes(1);expect(button.getAttribute('aria-expanded')).toBe('false');expect(element.getAttribute('data-quiet')).toBe('true');
   await act(async()=>root.unmount());expect(controller.destroy).toHaveBeenCalledTimes(1);expect(host.childElementCount).toBe(0);
  }finally{await act(async()=>root.unmount());host.remove();}
 });
 it('cleans StrictMode rehearsal and the live controller separately without losing current props',async()=>{
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  try{
   const props={titles:['Strict question'],descriptions:['Strict answer'],initialOpen:-1,paused:true};
   await act(async()=>root.render(createElement(StrictMode,null,createElement(EditorialFAQ,props))));
   expect(mount).toHaveBeenCalledTimes(2);const [first,live]=vi.mocked(mount).mock.results.map(result=>result.value);
   expect(first.destroy).toHaveBeenCalledTimes(1);expect(live.destroy).not.toHaveBeenCalled();expect(host.querySelector('button')?.disabled).toBe(false);
   await act(async()=>root.render(createElement(StrictMode,null,createElement(EditorialFAQ,{...props,titles:['Updated strict question'],paused:false}))));
   expect(mount).toHaveBeenCalledTimes(2);expect(host.querySelector('button')?.textContent).toContain('Updated strict question');expect(live.resume).toHaveBeenCalled();
   await act(async()=>{host.querySelector('button')!.click();});expect(host.querySelector('button')?.getAttribute('aria-expanded')).toBe('true');
   await act(async()=>root.unmount());expect(first.destroy).toHaveBeenCalledTimes(1);expect(live.destroy).toHaveBeenCalledTimes(1);
  }finally{await act(async()=>root.unmount());host.remove();}
 });
});
