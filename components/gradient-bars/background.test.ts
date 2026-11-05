import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import Ajv from 'ajv';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import manifest from './component.json';
import schema from '../../packages/spec/component.schema.json';
import {validateSettings,type ComponentManifest} from '../../packages/spec';
import {Component} from './src/react';
import {defaults,resolveSettings,render,mount,barGeometry,gradientStops} from './src/core';

class NodeFixture {
 attributes = new Map<string,string>();
 style = {cssText:''};
 childNodes: NodeFixture[] = [];
 parent: NodeFixture | null = null;
 private markup = '';
 replacements = 0;
 constructor(readonly ownerDocument:DocumentFixture) {}
 set innerHTML(markup:string) {
  this.markup = markup;
  this.replacements++;
  const node = new NodeFixture(this.ownerDocument);
  const head = markup.slice(0, markup.indexOf('>'));
  for (const match of head.matchAll(/([\w-]+)="([^"]*)"/g)) node.setAttribute(match[1],match[2]);
  node.style.cssText = node.getAttribute('style') ?? '';
  node.markup = markup;
  this.replaceChildren(node);
 }
 get innerHTML() { return this.markup; }
 get firstElementChild() { return this.childNodes[0] ?? null; }
 setAttribute(key:string,value:string) { this.attributes.set(key,value); }
 getAttribute(key:string) { return this.attributes.get(key) ?? null; }
 replaceChildren(...children:NodeFixture[]) {
  for (const child of this.childNodes) child.parent = null;
  this.childNodes = [];
  for (const child of children) this.appendChild(child);
 }
 appendChild(child:NodeFixture) {
  child.remove();
  child.parent = this;
  this.childNodes.push(child);
  return child;
 }
 remove() {
  if (!this.parent) return;
  this.parent.childNodes = this.parent.childNodes.filter(child => child !== this);
  this.parent = null;
 }
}
class DocumentFixture {
 hidden = false;
 listeners = new Set<()=>void>();
 mediaListeners = new Set<()=>void>();
 media = {matches:false,addEventListener:(_event:string,fn:()=>void)=>this.mediaListeners.add(fn),removeEventListener:(_event:string,fn:()=>void)=>this.mediaListeners.delete(fn)};
 observers: Array<{active:boolean;callback:(entries:unknown[])=>void;target:unknown}> = [];
 defaultView: unknown;
 constructor(apis=true) {
  const entries = this.observers;
  this.defaultView = apis ? {
   matchMedia:()=>this.media,
   IntersectionObserver:class {
    record:{active:boolean;callback:(entries:unknown[])=>void;target:unknown};
    constructor(callback:(entries:unknown[])=>void) { this.record={active:true,callback,target:null};entries.push(this.record); }
    observe(target:unknown) { this.record.target=target; }
    disconnect() { this.record.active=false; }
   }
  } : {};
 }
 createElement() { return new NodeFixture(this); }
 addEventListener(_event:string,fn:()=>void) { this.listeners.add(fn); }
 removeEventListener(_event:string,fn:()=>void) { this.listeners.delete(fn); }
 visibility(hidden:boolean) { this.hidden=hidden;for (const fn of this.listeners) fn(); }
 reduced(matches:boolean) { this.media.matches=matches;for (const fn of this.mediaListeners) fn(); }
 intersection(visible:boolean) { for (const observer of this.observers.filter(entry=>entry.active)) observer.callback([{target:observer.target,isIntersecting:visible}]); }
}
function fixture(apis=true) {
 const document = new DocumentFixture(apis);
 const host = new NodeFixture(document);
 const child = new NodeFixture(document);
 host.appendChild(child);
 host.setAttribute('class','consumer-class');
 host.style.cssText='height:600px;color:red';
 return {document,host,child,root:()=>host.firstElementChild!,element:host as unknown as HTMLElement};
}

describe('Gradient Bars settings and markup',()=>{
 it('agrees with the current schema and manifest defaults',()=>{
  const valid = new Ajv({strict:false}).compile(schema);
  expect(valid(manifest),JSON.stringify(valid.errors)).toBe(true);
  expect(defaults).toEqual(Object.fromEntries(manifest.settings.map(setting=>[setting.key,setting.default])));
  expect(resolveSettings({})).toEqual(defaults);
  expect(validateSettings(manifest as ComponentManifest,defaults)).toEqual(defaults);
  for (const preview of manifest.previews) expect(()=>resolveSettings(preview.settings)).not.toThrow();
 });
 it('rejects unsafe or unbounded input before creating CSS',()=>{
  for (const input of [null,[],true,{noSuchSetting:1},{speed:0},{speed:Infinity},{speed:NaN},{speed:'1'},{animate:1},{variant:'unknown'},{colorA:'red;position:fixed'},{colorA:'url(https://example.com)'},{fixedHeight:1201}]) expect(()=>resolveSettings(input)).toThrow();
  expect(resolveSettings({colorA:'#01020380'}).colorA).toBe('#01020380');
 });
 it('renders complete still markup and deterministic React SSR',()=>{
  expect(render()).toContain('aria-hidden="true"');
  expect(render()).toContain('data-live="false"');
  expect(render()).toContain('data-running="false"');
  expect(render({animate:false})).toContain('data-still="true"');
  expect(render({heightMode:'fixed',fixedHeight:420})).toContain('--gb-height:420px');
  expect(render()).not.toMatch(/<script|<canvas|https?:\/\//);
  const a = renderToStaticMarkup(createElement(Component,{variant:'flat',style:{height:420}}));
  const b = renderToStaticMarkup(createElement(Component,{variant:'flat',style:{height:420}}));
  expect(a).toBe(b);
  expect(a).toContain('height:420px');
 });
 it('maps every declared setting to an observable render parameter',()=>{
  const changes:Record<string,unknown> = {stops:'3',variant:'flat',shape:'ramp',barCount:7,peakHeight:70,gap:4,spread:60,angle:40,anchor:'top',baseColor:'#010203',colorA:'#112233',colorB:'#223344',colorC:'#334455',colorD:'#445566',tipColor:'#556677',entry:'reverse',entryDuration:1.2,stagger:0.04,pulse:0.12,pulseDuration:5,speed:2,animate:false,heightMode:'fixed',fixedHeight:420,radius:16};
  expect(Object.keys(changes).sort()).toEqual(manifest.settings.map(setting=>setting.key).sort());
  for (const [key,value] of Object.entries(changes)) {
   const condition = key === 'fixedHeight' ? {heightMode:'fixed' as const} : {};
   expect(render({...condition,[key]:value}),key).not.toBe(render(condition));
  }
 });
});

describe('Gradient Bars lifecycle',()=>{
 it('updates without replacing the scene for palette and speed patches',()=>{
  const env=fixture();
  const scene=mount(env.element);
  const root=env.root();
  const initialReplacements=root.replacements;
  expect(root.getAttribute('data-running')).toBe('true');
  scene.update({colorA:'#112233',speed:2});
  expect(env.root()).toBe(root);
  expect(root.replacements).toBe(initialReplacements);
  expect(root.style.cssText).toContain('#112233');
  const before=root.style.cssText;
  expect(()=>scene.update({speed:-1})).toThrow();
  expect(root.style.cssText).toBe(before);
  scene.update({variant:'flat'});
  expect(root.getAttribute('data-variant')).toBe('flat');
  expect(root.replacements).toBe(initialReplacements+1);
  scene.update(defaults);
  expect(root.style.cssText).not.toContain('#112233');
  scene.destroy();
 });
 it('keeps manual pause through visibility, offscreen and reduced-motion changes',()=>{
  const env=fixture();const scene=mount(env.element);const root=env.root();
  env.document.visibility(true);expect(root.getAttribute('data-running')).toBe('false');
  env.document.visibility(false);expect(root.getAttribute('data-running')).toBe('true');
  env.document.intersection(false);expect(root.getAttribute('data-running')).toBe('false');
  env.document.intersection(true);expect(root.getAttribute('data-running')).toBe('true');
  scene.pause();env.document.visibility(true);env.document.visibility(false);expect(root.getAttribute('data-running')).toBe('false');
  scene.resume();expect(root.getAttribute('data-running')).toBe('true');
  env.document.reduced(true);expect(root.getAttribute('data-still')).toBe('true');expect(root.getAttribute('data-running')).toBe('false');
  env.document.reduced(false);expect(root.getAttribute('data-running')).toBe('true');
  scene.update({animate:false});expect(root.getAttribute('data-still')).toBe('true');
  scene.resume();expect(root.getAttribute('data-running')).toBe('false');scene.destroy();
 });
 it('isolates multiple mounts and releases all listeners/observers across ten cycles',()=>{
  const first=fixture();const second=fixture();
  const other=mount(second.element,{colorA:'#778899'});
  for(let i=0;i<10;i++) {
   const scene=mount(first.element);const root=first.root();
   expect(first.document.listeners.size).toBe(1);expect(first.document.mediaListeners.size).toBe(1);
   expect(first.document.observers.filter(observer=>observer.active)).toHaveLength(1);
   const callback=first.document.observers.at(-1)!.callback;
   scene.destroy();scene.destroy();
   expect(first.host.childNodes).toEqual([first.child]);
   expect(first.host.getAttribute('class')).toBe('consumer-class');expect(first.host.style.cssText).toBe('height:600px;color:red');
   expect(first.document.listeners.size).toBe(0);expect(first.document.mediaListeners.size).toBe(0);
   expect(first.document.observers.filter(observer=>observer.active)).toHaveLength(0);
   const state=root.getAttribute('data-running');
   callback([{target:first.host,isIntersecting:false}]);scene.pause();scene.resume();scene.update({speed:2});
   expect(root.getAttribute('data-running')).toBe(state);
   expect(second.root().style.cssText).toContain('#778899');
  }
  other.destroy();
 });
 it('retains a useful lifecycle when optional browser APIs are unavailable',()=>{
  const env=fixture(false);env.document.hidden=true;
  const scene=mount(env.element);expect(env.root().getAttribute('data-running')).toBe('false');
  env.document.visibility(false);expect(env.root().getAttribute('data-running')).toBe('true');
  scene.destroy();expect(env.document.listeners.size).toBe(0);
 });
 it('preserves consumer nodes added during the mounted lifetime',()=>{
  const env=fixture();const scene=mount(env.element);const later=new NodeFixture(env.document);env.host.appendChild(later);
  scene.destroy();expect(env.host.childNodes).toContain(later);expect(env.host.childNodes).toContain(env.child);
 });
});

describe('Gradient Bars shape and sequence',()=>{
 it('makes a symmetric curved hill with nearest-center entry first',()=>{
  const bars=barGeometry();
  expect(bars).toHaveLength(45);
  expect(bars[22].level).toBeCloseTo(1,8);expect(bars[0].level).toBeCloseTo(0.3,8);
  expect(bars[22].rank).toBe(0);expect(bars[0].rank).toBe(22);
  expect(bars[11].level).toBeCloseTo(0.69105048,6);expect(bars[17].level).toBeCloseTo(0.92745327,6);
  for(let i=0;i<22;i++){expect(bars[i].level).toBeCloseTo(bars[44-i].level,8);expect(bars[i+1].level).toBeGreaterThan(bars[i].level);}
 });
 it('uses a full-height flat field and a sparse ascending reverse-entry ramp',()=>{
  const flat=barGeometry({variant:'flat'});expect(flat.every(bar=>bar.level===1)).toBe(true);expect(flat[0].rank).toBe(0);expect(flat.at(-1)!.rank).toBe(44);
  const ramp=barGeometry({variant:'ramp',barCount:7});expect(ramp).toHaveLength(7);expect(ramp[0].level).toBeCloseTo(.1,8);expect(ramp[6].level).toBeCloseTo(1,8);expect(ramp[0].rank).toBe(6);expect(ramp[6].rank).toBe(0);
  for(let i=0;i<6;i++)expect(ramp[i+1].level).toBeGreaterThan(ramp[i].level);
 });
 it('keeps geometry finite and bounded at every allowed count and shape',()=>{
  for(const barCount of [3,4,45,96])for(const shape of ['hill','flat','ramp'] as const){const bars=barGeometry({barCount,shape});expect(bars).toHaveLength(barCount);for(const bar of bars){expect(bar.level).toBeGreaterThan(0);expect(bar.level).toBeLessThanOrEqual(1);expect(Number.isFinite(bar.rank)).toBe(true);expect(Math.abs(bar.position)).toBeLessThanOrEqual(1);}}
  expect(()=>barGeometry({barCount:4.5})).toThrow();expect(()=>barGeometry({barCount:97})).toThrow();
 });
 it('resolves explicit entry and shape independently of the direction',()=>{
  const bars=barGeometry({variant:'flat',shape:'ramp',entry:'center',barCount:7});expect(bars[0].level).toBeCloseTo(.1,8);expect(bars[3].rank).toBe(0);
  expect(barGeometry({entry:'together'}).every(bar=>bar.rank===0)).toBe(true);
 });
});

it('compresses full-height OKLCH strips and schedules pulse directly after each entry',()=>{
 const css=readFileSync(new URL('./src/styles.css',import.meta.url),'utf8');
 const strip=css.match(/\.aui-gradient-bars__bar \{([^}]+)\}/)![1];
 expect(strip).toContain('height: var(--gb-peak)');expect(strip).toContain('transform: scaleY(var(--gb-level))');
 expect(css).toContain('in oklch');expect(css).toContain('animation-name: aui-gb-rise, aui-gb-pulse');
 expect(css).toContain('calc(var(--gb-rank) * var(--gb-stagger) + var(--gb-entry))');
 expect(css).not.toContain('--gb-phase');expect(css).not.toMatch(/__ink[^}]+animation:/);
 expect(render()).toContain('--gb-pulse:0.7');expect(render()).toContain('--gb-overlap:1px');expect(render({gap:3})).toContain('--gb-overlap:0px');
 expect(render()).toContain('--gb-base:#020612');expect(render()).toContain('--gb-tip:#030817');
});

it('keeps three, four and five palette stops configurable across the complete presets',()=>{
 const [hill,flat,ramp]=manifest.previews.map(preview=>resolveSettings(preview.settings));
 expect([hill.barCount,flat.barCount,ramp.barCount]).toEqual([45,24,7]);
 expect([hill.pulse,flat.pulse,ramp.pulse]).toEqual([.3,.24,.17]);
 expect(gradientStops(flat)).toBe('#23395d 0%, #3454f1 33.333333%, #8fb9d2 66.666667%, #eef4ed 100%');
 expect(gradientStops(ramp)).toBe('#baffc6 0%, #3454f1 50%, #121212 100%');
 expect(gradientStops(hill)).toBe('#ffe2a0 0%, #ff985d 25%, #e56286 50%, #6a5abb 75%, #030817 100%');
 expect(barGeometry(flat).every(bar=>bar.level===1)).toBe(true);
 expect(barGeometry(ramp).map(bar=>bar.rank)).toEqual([6,5,4,3,2,1,0]);
 expect(barGeometry(ramp).map(bar=>Number(bar.level.toFixed(2)))).toEqual([.1,.25,.4,.55,.7,.85,1]);
 expect(()=>resolveSettings({stops:'6'})).toThrow();
});
