// @vitest-environment jsdom
import {expect,it,vi} from 'vitest';
import {defaults,mount,render,resolveSettings} from './index';

it('selects nine distinct images and restores copy when switching sets',()=>{
  const host=document.createElement('div');
  const api=mount(host);
  const photos=new Set<string>();
  for(const collection of ['signal','obsidian','optical','signal']){
    api.update({collection});
    host.querySelectorAll('img').forEach(i=>photos.add(i.src));
    expect(host.querySelectorAll('.cc-models')).toHaveLength(collection==='optical'?0:3);
  }
  expect(photos.size).toBe(9);
  api.pause();expect(host.firstElementChild?.hasAttribute('data-paused')).toBe(true);
  api.resume();api.destroy();expect(host.childElementCount).toBe(0);
});

it('validates settings, protects custom text and keeps card tweaks independent',()=>{
  expect(resolveSettings(null)).toEqual(defaults);
  expect(resolveSettings({rowGap:200,cropX1:80}).rowGap).toBe(14);
  const host=document.createElement('div');
  host.innerHTML=render({cropX1:80,title1:'<b>Test</b>',href1:'javascript:alert(1)'});
  const [a,b]=host.querySelectorAll('a');
  expect(a.hasAttribute('href')).toBe(false);
  expect(a.querySelector('b')).toBe(null);
  expect(a.style.getPropertyValue('--cc-crop-x')).toBe('80%');
  expect(b.style.getPropertyValue('--cc-crop-x')).toBe('50%');
});

it('uses the layout width when a desktop preview is visually scaled down',()=>{
  const dimensions=vi.spyOn(HTMLElement.prototype,'clientWidth','get').mockReturnValue(1200);
  try{
    const host=document.createElement('div');
    const api=mount(host);
    for(const collection of ['obsidian','optical','signal']){
      api.update({collection});
      expect(host.querySelector('.cc-grid')?.getAttribute('data-cols')).toBe('3');
    }
    api.destroy();
  }finally{dimensions.mockRestore();}
});
