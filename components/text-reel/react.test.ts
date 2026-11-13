// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {TextReel} from './src/react';
it('keeps the live controller subtree when text and presentation props change',async()=>{
 const scope=globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT?:boolean};scope.IS_REACT_ACT_ENVIRONMENT=true;
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(createElement(TextReel,{leading:'We build',words:['First'],mode:'on-demand'})));
  const reel=host.querySelector('.text-reel'),button=host.querySelector('button');
  await act(async()=>root.render(createElement(TextReel,{leading:'We ship',words:['Current'],mode:'on-demand',className:'changed'})));
  expect(host.querySelector('.text-reel')).toBe(reel);expect(host.querySelector('button')).toBe(button);expect(host.querySelector('[data-arclen-role="leading"]')?.textContent).toBe('We ship');expect(host.querySelector('[data-arclen-role="accessible"]')?.textContent).toContain('Current');
  await act(async()=>root.render(createElement(TextReel,{leading:'We ship',words:['Current'],mode:'on-demand',className:'another'})));expect(host.querySelector('.text-reel')).toBe(reel);
 }finally{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();delete scope.IS_REACT_ACT_ENVIRONMENT;}
});
