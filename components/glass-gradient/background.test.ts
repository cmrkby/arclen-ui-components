import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import Ajv from 'ajv';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import manifest from './component.json';
import schema from '../../packages/spec/component.schema.json';
import {validateSettings,type ComponentManifest} from '../../packages/spec';
import {Component} from './src/react';
import {defaults,resolveSettings,render,mount} from './src/core';

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

describe('Glass Gradient settings and markup',()=>{
 it('agrees with the current schema and manifest defaults',()=>{
  const valid = new Ajv({strict:false}).compile(schema);
  expect(valid(manifest),JSON.stringify(valid.errors)).toBe(true);
  expect(defaults).toEqual(Object.fromEntries(manifest.settings.map(setting=>[setting.key,setting.default])));
  expect(resolveSettings({})).toEqual(defaults);
  expect(validateSettings(manifest as ComponentManifest,defaults)).toEqual(defaults);
  for (const preview of manifest.previews) expect(()=>resolveSettings(preview.settings)).not.toThrow();
 });
 it('rejects unsafe or unbounded input before creating CSS',()=>{
  for (const input of [null,[],true,{noSuchSetting:1},{speed:0},{speed:Infinity},{speed:NaN},{speed:'1'},{animate:1},{variant:'unknown'},{variant:'panes'},{colorA:'red;position:fixed'},{colorA:'url(https://example.com)'},{fixedHeight:1201}]) expect(()=>resolveSettings(input)).toThrow();
  expect(resolveSettings({colorA:'#01020380'}).colorA).toBe('#01020380');
 });
 it('renders complete still markup and deterministic React SSR',()=>{
  expect(render()).toContain('aria-hidden="true"');
  expect(render()).toContain('data-live="false"');
  expect(render()).toContain('data-running="false"');
  expect(render({animate:false})).toContain('data-still="true"');
  expect(render({heightMode:'fixed',fixedHeight:420})).toContain('--gg-height:420px');
  expect(render()).not.toMatch(/<script|<canvas|https?:\/\//);
  const a = renderToStaticMarkup(createElement(Component,{variant:'bands',style:{height:420}}));
  const b = renderToStaticMarkup(createElement(Component,{variant:'bands',style:{height:420}}));
  expect(a).toBe(b);
  expect(a).toContain('height:420px');
 });
 it('maps every declared setting to an observable render parameter',()=>{
  const changes:Record<string,unknown> = {variant:'bands',axis:'horizontal',colorA:'#112233',colorB:'#223344',colorC:'#334455',colorD:'#445566',tintColor:'#010203',tint:0.2,diffusion:60,speed:2,reverse:true,animate:false,heightMode:'fixed',fixedHeight:420,radius:16};
  expect(Object.keys(changes).sort()).toEqual(manifest.settings.map(setting=>setting.key).sort());
  for (const [key,value] of Object.entries(changes)) {
   const condition = key === 'fixedHeight' ? {heightMode:'fixed' as const} : {};
   expect(render({...condition,[key]:value}),key).not.toBe(render(condition));
  }
 });
});

describe('Glass Gradient lifecycle',()=>{
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
  scene.update({variant:'bands'});
  expect(root.getAttribute('data-variant')).toBe('bands');
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

it('keeps the wash on a fixed surface and moves only its background image',()=>{
 const css=readFileSync(new URL('./src/styles.css',import.meta.url),'utf8');
 const wash=css.match(/\[data-variant="wash"\] \.aui-glass-gradient__field \{([^}]+)\}/)![1];
 expect(wash).toContain('inset: 0;');expect(wash).toContain('filter: none;');expect(wash).toContain('transform: none;');
 expect(wash).toContain('background-blend-mode: overlay;');expect(wash).toContain('background-size: var(--gg-field-size) var(--gg-field-size)');
 const keyframes=css.slice(css.indexOf('@keyframes aui-gg-wash'),css.indexOf('@keyframes aui-gg-band'));
 expect(keyframes).toContain('0%, 100%');expect(keyframes).toContain('50%');expect(keyframes).not.toContain('transform');
 expect(render()).toContain('--gg-field-size:200%');expect(render()).toContain('--gg-opacity:0.7');
 expect(render()).not.toMatch(/__bloom|__tint/);expect(render({variant:'bands'})).toContain('__band');
 expect(render({reverse:true})).toContain('--gg-start-x:100%');expect(render({reverse:true})).toContain('--gg-position-x:0%');
});
