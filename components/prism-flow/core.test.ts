// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {defaults,mount,render,resolveSettings} from './src/core';

afterEach(()=>{
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('bounds uniforms and escapes supplied captions in the initial HTML',()=>{
  expect(resolveSettings({width:99,grain:-1,palette:'constructor',background:'blue'})).toMatchObject({
    width:5,grain:0,palette:defaults.palette,background:defaults.background,
  });
  expect(render({caption:'<sample> & light'})).toContain('&lt;sample&gt; &amp; light');
});

it('keeps fallback controls usable and disposes the previous mount on replay',()=>{
  const disconnect=vi.fn();
  vi.stubGlobal('ResizeObserver',class {observe(){} disconnect=disconnect;});
  vi.stubGlobal('IntersectionObserver',class {
    constructor(private report:(entries:object[])=>void){}
    observe(){this.report([{isIntersecting:true,intersectionRatio:1}]);}
    disconnect=disconnect;
  });
  vi.stubGlobal('matchMedia',()=>Object.assign(new EventTarget(),{matches:false}));
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(()=>{throw new Error('WebGL unavailable');});
  const frame=vi.spyOn(window,'requestAnimationFrame');
  const host=document.createElement('section');
  const first=mount(host);
  expect(host.firstElementChild?.getAttribute('data-renderer')).toBe('fallback');
  first.update({palette:'lagoon',caption:'Sea'});
  expect(host.querySelector('p')?.textContent).toBe('Sea');
  expect(host.firstElementChild?.getAttribute('style')).toContain('#00d4ff');
  const second=mount(host,{caption:'Silver'});
  first.destroy();
  expect(host.textContent).toBe('Silver');
  second.pause();
  second.resume();
  second.destroy();
  expect(host.children.length).toBe(0);
  expect(disconnect).toHaveBeenCalledTimes(4);
  expect(frame).not.toHaveBeenCalled();
});
