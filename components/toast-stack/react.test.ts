// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {ToastStack} from './src/react';
import type {Controller} from './src/core';
const scope=globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT?:boolean};
beforeEach(()=>{scope.IS_REACT_ACT_ENVIRONMENT=true;vi.useFakeTimers();});
afterEach(()=>{vi.useRealTimers();delete scope.IS_REACT_ACT_ENVIRONMENT;});
describe('Toast Stack React settings',()=>{
 it('restores removed props to defaults without remounting or restarting notification lifetime',async()=>{
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);const ready=vi.fn<(api:Controller)=>void>();
  try{
   await act(async()=>{root.render(createElement(ToastStack,{title:"Saved",theme:"dark",gradientMode:"custom",gradientShape:"wash",gradientColor:"#abcdef",gradientStrength:60,showClose:false,duration:1000,animate:false,onReady:ready}));});
   const region=host.querySelector('.ats')!,card=host.querySelector('.ats-card')!;
   expect(region.getAttribute('data-theme')).toBe('dark');expect(region.getAttribute('data-gradient')).toBe('custom');expect(region.getAttribute('data-gradient-shape')).toBe('wash');expect((region as HTMLElement).style.getPropertyValue('--gradientStrength')).toBe('60%');expect(card.querySelector('.ats-close')).toBeNull();
   await act(async()=>{vi.advanceTimersByTime(700);root.render(createElement(ToastStack,{title:"Saved",duration:1000,animate:false,onReady:ready}));});
   expect(ready).toHaveBeenCalledTimes(1);expect(host.querySelector('.ats')).toBe(region);expect(host.querySelector('.ats-card')).toBe(card);
   expect(region.getAttribute('data-theme')).toBe('light');expect(region.getAttribute('data-gradient')).toBe('status');expect(region.getAttribute('data-gradient-shape')).toBe('spotlight');expect((region as HTMLElement).style.getPropertyValue('--gradientStrength')).toBe('17%');expect(card.querySelector('.ats-close')).not.toBeNull();
   await act(async()=>{vi.advanceTimersByTime(299);});expect(host.querySelector('.ats-card')).toBe(card);
   await act(async()=>{vi.advanceTimersByTime(1);});expect(host.querySelector('.ats-card')).toBeNull();
  }finally{await act(async()=>root.unmount());host.remove();}
 });
 it('keeps onReady configuration through mount and presentation-only rerenders',async()=>{
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  const ready=vi.fn((api:Controller)=>api.update({showAction:false}));
  try{
   await act(async()=>root.render(createElement(ToastStack,{title:'Saved',duration:0,animate:false,onReady:ready})));
   const card=host.querySelector('.ats-card');expect(host.querySelector('.ats-action')).toBeNull();
   await act(async()=>root.render(createElement(ToastStack,{title:'Saved',duration:0,animate:false,onReady:ready,className:'updated'})));
   expect(host.querySelector('.ats-card')).toBe(card);expect(host.querySelector('.ats-action')).toBeNull();expect(ready).toHaveBeenCalledTimes(1);
   await act(async()=>root.render(createElement(ToastStack,{title:'Saved',duration:0,animate:false,onReady:ready,className:'updated',theme:'dark'})));
   expect(host.querySelector('.ats-card')).toBe(card);expect(host.querySelector('.ats-action')).not.toBeNull();
  }finally{await act(async()=>root.unmount());host.remove();}
 });

});
