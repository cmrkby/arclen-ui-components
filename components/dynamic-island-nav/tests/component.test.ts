// @vitest-environment jsdom
import {describe,it,expect,vi} from 'vitest';
import {defaults,render,resolveSettings,mount} from '../src/core';
describe('Island Nav',()=>{
 it('bounds geometry and rejects unsafe destinations',()=>{
  const value=resolveSettings({labels:['Work','Contact'],destinations:['javascript:alert(1)','https://example.org'],topOffset:500});
  expect(value.topOffset).toBe(64);expect(value.destinations).toEqual(['#home','https://example.org']);expect(resolveSettings({labels:['Only']}).labels).toEqual(defaults.labels);
 });
 it('applies portable glass and placement settings with bounded geometry',()=>{
  const host=document.createElement('div');
  host.innerHTML=render({placement:'bottom',alignment:'end',blur:99,rim:35,darkCanvas:'#364152'});
  const scene=host.querySelector<HTMLElement>('.din-scene')!;
  expect(scene.dataset.placement).toBe('bottom');
  expect(scene.style.getPropertyValue('--din-align')).toBe('end');
  expect(scene.style.getPropertyValue('--din-blur')).toBe('48px');
  expect(scene.style.getPropertyValue('--din-rim')).toBe('0.35');
  expect(scene.style.getPropertyValue('--din-dark-canvas')).toBe('#364152');
  expect(resolveSettings({alignment:'invalid',darkOpacity:NaN})).toMatchObject({alignment:'center',darkOpacity:62});
 });
 it('keeps each chosen icon with its link and uses positional defaults for legacy settings',()=>{
  expect(resolveSettings({}).icons).toEqual(defaults.icons);
  const labels=Array.from({length:12},(_,i)=>'Item '+i);
  const host=document.createElement('div');
  host.innerHTML=render({labels,icons:['Mail','unknown'],destinations:['/contact']});
  expect(host.querySelectorAll('.din-row')).toHaveLength(12);
  for(const selector of ['.din-row','.din-link']){
   const link=host.querySelector(selector)!;
   expect(link.getAttribute('href')).toBe('/contact');
   expect(link.querySelector('svg rect')?.getAttribute('rx')).toBe('3');
  }
  expect(resolveSettings({labels,icons:['Mail','unknown']}).icons.slice(0,2)).toEqual(['Mail','Grid']);
 });
 it('renders escaped labels and unique fragment targets',()=>{
  const html=render({labels:['<Test>','Two']},'alpha');
  expect(html).toContain('&lt;Test&gt;');expect(html).toContain('href="#alpha-1"');expect(html).not.toContain('<Test>');
 });
 it('keeps the current desktop label visible while reading another destination',async()=>{
  const width=vi.spyOn(Element.prototype,'clientWidth','get').mockReturnValue(900);
  const host=document.createElement('div');document.body.append(host);
  const api=mount(host,{hoverDwell:0});api.pause();
  try {
   const links=host.querySelectorAll<HTMLElement>('.din-link');
   links[1].dispatchEvent(new Event('pointerover',{bubbles:true}));
   await new Promise(resolve=>setTimeout(resolve,5));
   for(const i of [0,1])expect(links[i].querySelector<HTMLElement>('.din-word')!.style.opacity).toBe('1');
  } finally {api.destroy();host.remove();width.mockRestore()}
 });
 it('supports mobile panel toggle, Escape, updating and destroy',()=>{
  const host=document.createElement('div');document.body.append(host);const api=mount(host,{});api.pause();
  const toggle=host.querySelector<HTMLButtonElement>('.din-toggle')!;expect(toggle.textContent).toContain('Home');toggle.click();expect(toggle.getAttribute('aria-expanded')).toBe('true');
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',cancelable:true}));expect(toggle.getAttribute('aria-expanded')).toBe('false');
  api.update({showBadge:false});expect(host.querySelector('.din-badge')).toBeNull();api.resume();api.destroy();api.update({});expect(host.childElementCount).toBe(0);host.remove();
 });
});
