import manifest from '../../component.json';
import {resolveGeometry} from './geometry';
import {createPlanMemory} from './selection';
export type Plan = 'free' | 'monthly' | 'annual';
export interface Settings {
  value: Plan; accessibleName: string;
  freeLabel: string; premiumLabel: string; monthlyLabel: string; annualLabel: string;
  width: number; height: number; outerPadding: number; sectionGap: number; textSize: number; shadowStrength: number; radius: number; duration: number;
  trackColor: string; activeColor: string; selectedColor: string;
  textColor: string; activeTextColor: string; mutedColor: string;
}
export const defaults = Object.fromEntries(manifest.settings.map(setting=>[setting.key,setting.default])) as unknown as Settings;
const own = (v: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(v, k);
export function resolveSettings(input: unknown = {}): Settings {
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const s = {...defaults};
  const textKeys = ['accessibleName','freeLabel','premiumLabel','monthlyLabel','annualLabel'] as const;
  for (const key of textKeys) if (own(raw,key) && typeof raw[key] === 'string' && raw[key].trim()) s[key] = raw[key].trim().slice(0,key==='accessibleName'?80:24);
  for (const definition of manifest.settings) {
    if (definition.kind !== 'number') continue;
    const {key,min,max,step} = definition;
    const v = raw[key];
    if (own(raw,key) && typeof v === 'number' && Number.isFinite(v)) {
      const bounded = Math.min(max!,Math.max(min!,v));
      (s as unknown as Record<string,unknown>)[key] = Number((Math.round(bounded / step!) * step!).toFixed(2));
    }
  }
  for (const key of ['trackColor','activeColor','selectedColor','textColor','activeTextColor','mutedColor'] as const) {
    const v = raw[key]; if (own(raw,key) && typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) s[key] = v.toLowerCase();
  }
  if (own(raw,'value') && typeof raw.value === 'string' && ['free','monthly','annual'].includes(raw.value)) s.value = raw.value as Plan;
  return s;
}
const escape = (v: string) => v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function button(value: Plan, label: string, s: Settings, extra = '') {
  return `<button type="button" class="ps-label ps-${value}${extra}" data-go="${value}" data-anim aria-pressed="${s.value===value}" title="${escape(label)}">${escape(label)}</button>`;
}
export function render(input: unknown = {}): string {
  const s = resolveSettings(input);
  const geometry = resolveGeometry(s);
  const variables = `--ps-height:${s.height}px;--ps-pad:${geometry.padding}px;--ps-cell-height:${geometry.targetHeight}px;--ps-inner-inset:${geometry.innerInset}px;--ps-gap:${s.sectionGap}px;--ps-text-size:${s.textSize}px;--ps-shadow:${s.shadowStrength};--ps-width:${s.width}px;--ps-radius:${s.radius}px;--ps-track:${s.trackColor};--ps-active:${s.activeColor};--ps-selected:${s.selectedColor};--ps-text:${s.textColor};--ps-active-text:${s.activeTextColor};--ps-muted:${s.mutedColor};--ps-duration:${s.duration}ms`;
  const body = `<div class="ps-cell">${button('free',s.freeLabel,s)}</div><div class="ps-cell"><button type="button" class="ps-label ps-premium" data-go="premium" data-anim aria-pressed="false"${s.value!=='free'?' hidden inert':''} title="${escape(s.premiumLabel)}">${escape(s.premiumLabel)}</button><div class="ps-sub"${s.value==='free'?' hidden inert':''}>${button('monthly',s.monthlyLabel,s,' ps-opt')}${button('annual',s.annualLabel,s,' ps-opt')}</div></div><span class="ps-pill ps-pill--selected" aria-hidden="true"></span><span class="ps-pill ps-pill--active" aria-hidden="true"></span>`;
  return `<div class="ps" data-price-switch data-value="${s.value}" data-motion="rest" role="group" aria-label="${escape(s.accessibleName)}" style="${variables}">${body}</div>`;
}
// Frequency independently fitted to measured progress samples. Duration scales time only.
const FITTED_FREQUENCY = 22.485724735358133;
export function spring(elapsed: number, duration = 400): number {
  if (elapsed >= duration) return 1;
  const t = Math.max(0,elapsed) / duration * 0.4;
  const damping = 0.8, wd = FITTED_FREQUENCY * Math.sqrt(1-damping*damping);
  return 1-Math.exp(-damping*FITTED_FREQUENCY*t)*(Math.cos(wd*t)+(damping*FITTED_FREQUENCY/wd)*Math.sin(wd*t));
}
interface Box {x:number; y:number; w:number; h:number}
const mix = (a:number,b:number,p:number) => a+(b-a)*p;
const mixBox = (a:Box,b:Box,p:number):Box=>({x:mix(a.x,b.x,p),y:mix(a.y,b.y,p),w:mix(a.w,b.w,p),h:mix(a.h,b.h,p)});
const channels = (css:string) => {
  const values=(css.match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi)??['0','0','0']).slice(0,3).map(Number);
  return css.startsWith('color(srgb ') ? values.map(value=>value*255) : values;
};
const mixChannel = (a:number,b:number,p:number) => Math.sqrt(Math.max(0,a*a+(b*b-a*a)*p));
export interface MountOptions { controlled?: boolean; onValueChange?: (value:Plan)=>void }
export interface Controller { update(settings:Partial<Settings>):void; pause():void; resume():void; destroy():void; readonly value:Plan }
const mounts = new WeakMap<HTMLElement,Controller>();
export function mount(host:HTMLElement, input:unknown = {}, options:MountOptions = {}):Controller {
  mounts.get(host)?.destroy();
  let s = resolveSettings(input), destroyed = false, paused = false, offscreen = false, raf = 0;
  const memory = createPlanMemory(s.value);
  const doc = host.ownerDocument, win = doc.defaultView!;
  const reduce = win.matchMedia('(prefers-reduced-motion: reduce)');
  host.innerHTML = render(s);
  let el = host.querySelector<HTMLElement>('[data-price-switch]')!;
  const clear = () => {
    if (raf) win.cancelAnimationFrame(raf); raf=0;
    for (const n of el.querySelectorAll<HTMLElement>('.ps-pill')) n.style.left=n.style.top=n.style.width=n.style.height=n.style.opacity='';
    for (const n of el.querySelectorAll<HTMLElement>('[data-anim]')) n.style.translate=n.style.color=n.style.opacity='';
    el.dataset.motion='rest';
  };
  const canAnimate = () => !paused&&!offscreen&&!doc.hidden&&!reduce.matches;
  const rect = (node:Element, origin:DOMRect):Box => {const r=node.getBoundingClientRect();return {x:r.left-origin.left,y:r.top-origin.top,w:r.width,h:r.height};};
  const sync = () => {
    const focused=doc.activeElement as HTMLElement|null;
    const focusPlan=focused&&el.contains(focused)?focused.dataset.go:null;
    el.dataset.value=s.value;
    const free=s.value==='free';
    const premium=el.querySelector<HTMLButtonElement>('[data-go="premium"]')!;
    const periods=el.querySelector<HTMLElement>('.ps-sub')!;
    premium.hidden=!free;premium.inert=!free;
    periods.hidden=free;periods.inert=free;
    if((focusPlan==='premium'&&!free)||(free&&(focusPlan==='monthly'||focusPlan==='annual'))){
      el.querySelector<HTMLButtonElement>(`[data-go="${s.value}"]`)?.focus({preventScroll:true});
    }
    for (const b of el.querySelectorAll<HTMLButtonElement>('[data-go]')) {
      const isOption=b.hasAttribute('data-anim');
      if(isOption)b.setAttribute('aria-pressed',String(b.dataset.go===s.value));
    }
  };
  const setValue = (value:Plan, notify=false) => {
    if(destroyed||value===s.value)return;
    if(notify&&options.controlled){options.onValueChange?.(value);return;}
    const origin=el.getBoundingClientRect();
    const pills=Array.from(el.querySelectorAll<HTMLElement>('.ps-pill'));
    const labels=Array.from(el.querySelectorAll<HTMLElement>('[data-anim]'));
    const wasFree=s.value==='free';
    const fromP=pills.map(n=>rect(n,origin));
    const fromL=labels.map(n=>({...rect(n,origin),visible:!n.closest('[hidden]'),opacity:Number(win.getComputedStyle(n).opacity),c:channels(win.getComputedStyle(n).color)}));
    clear();s={...s,value};memory.commit(value);sync();
    const toP=pills.map(n=>rect(n,origin));
    const toL=labels.map(n=>({...rect(n,origin),visible:!n.closest('[hidden]'),c:channels(win.getComputedStyle(n).color)}));
    if(notify){options.onValueChange?.(value);host.dispatchEvent(new win.CustomEvent('pricechange',{detail:{value},bubbles:true}));}
    if(!canAnimate())return;
    const start=win.performance.now();el.dataset.motion='running';
    const frame=(now:number)=>{
      raf=0;
      if(destroyed||!canAnimate()||now-start>=s.duration){clear();return;}
      const progress=spring(now-start,s.duration);
      pills.forEach((n,i)=>{const revealing=wasFree&&value!=='free'&&n.classList.contains('ps-pill--selected');const b=revealing?toP[i]:mixBox(fromP[i],toP[i],progress);if(revealing)n.style.opacity=String(Math.min(1,Math.max(0,progress)));n.style.left=`${b.x}px`;n.style.top=`${b.y}px`;n.style.width=`${b.w}px`;n.style.height=`${b.h}px`;});
      labels.forEach((n,i)=>{const a=fromL[i],b=toL[i];if(!b.visible)return;if(!a.visible){n.style.opacity=String(Math.min(1,Math.max(0,progress)));n.style.translate=`0 ${4*(1-progress)}px`;return;}n.style.opacity=String(mix(a.opacity,1,Math.min(1,Math.max(0,progress))));n.style.translate=`${mix(a.x,b.x,progress)-b.x}px ${mix(a.y,b.y,progress)-b.y}px`;n.style.color=`rgb(${a.c.map((c,k)=>mixChannel(c,b.c[k],progress)).join(',')})`;});
      raf=win.requestAnimationFrame(frame);
    };
    frame(start);
  };
  const click=(event:MouseEvent)=>{
    const button=(event.target as Element).closest<HTMLButtonElement>('[data-go]');
    if(!button||!el.contains(button)||button.closest('[hidden],[inert]'))return;
    const value=memory.request(button.dataset.go as Plan|'premium');
    setValue(value,true);
  };
  const settle=()=>clear();
  host.addEventListener('click',click);
  doc.addEventListener('visibilitychange',settle);
  reduce.addEventListener('change',settle);
  const resize = typeof win.ResizeObserver==='function'?new win.ResizeObserver(settle):null;
  resize?.observe(el);
  const observer=typeof win.IntersectionObserver==='function'?new win.IntersectionObserver(entries=>{offscreen=!entries[0]?.isIntersecting;if(offscreen)clear();}):null;
  observer?.observe(el);
  const controller:Controller = {
    get value(){return s.value;},
    update(next){
      if(destroyed)return;
      const merged=resolveSettings({...s,...next});
      const onlyValue=Object.keys(merged).every(k=>k==='value'||merged[k as keyof Settings]===s[k as keyof Settings]);
      if(onlyValue){setValue(merged.value);return;}
      const focused=doc.activeElement as HTMLElement|null;
      const focusPlan=focused&&el.contains(focused)?focused.dataset.go:null;
      clear();s=merged;memory.commit(s.value);resize?.unobserve(el);observer?.unobserve(el);
      host.innerHTML=render(s);el=host.querySelector<HTMLElement>('[data-price-switch]')!;
      resize?.observe(el);observer?.observe(el);
      if(focusPlan){
        const focusTarget=focusPlan==='premium'?(s.value==='free'?'premium':s.value):s.value==='free'&&focusPlan!=='free'?'free':focusPlan;
        el.querySelector<HTMLButtonElement>(`[data-anim][data-go="${focusTarget}"]`)?.focus({preventScroll:true});
      }
    },
    pause(){if(!destroyed){paused=true;clear();}},
    resume(){if(!destroyed)paused=false;},
    destroy(){if(destroyed)return;clear();destroyed=true;resize?.disconnect();observer?.disconnect();host.removeEventListener('click',click);doc.removeEventListener('visibilitychange',settle);reduce.removeEventListener('change',settle);if(mounts.get(host)===controller){mounts.delete(host);host.replaceChildren();}},
  };
  mounts.set(host,controller);
  return controller;
}
