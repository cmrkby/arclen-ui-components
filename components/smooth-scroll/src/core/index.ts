import manifest from '../../component.json';
import {createField} from './field';
import {fieldSettings, type Palette} from './palettes';
export interface Settings { palette:Palette; enabled:boolean; duration:number; height:number; background:string; navy:string; midnight:string; indigo:string; cobalt:string; blue:string; accent:string; lavender:string; violet:string; magenta:string; rose:string; coral:string; foreground:string; progressColor:string; buttonColor:string; buttonHover:string; buttonForeground:string; grain:number; grainSize:number; caption:string; showProgress:boolean; showReturn:boolean; returnLabel:string }
export const defaults = Object.fromEntries(manifest.settings.map(s=>[s.key,s.default])) as unknown as Settings;
export function resolveSettings(input:unknown = {}):Settings {
 if(!input || typeof input!=='object' || Array.isArray(input)) throw new Error('Settings must be an object');
 const result={...defaults};
 for(const [key,value] of Object.entries(input)) {
  const rule=manifest.settings.find(s=>s.key===key);
  if(!rule) throw new Error(`Unknown setting: ${key}`);
  if(typeof value!==typeof rule.default) throw new Error(`Invalid setting: ${key}`);
  if(rule.kind==='number' && (typeof value!=='number'||!Number.isFinite(value)||value<(rule.min??-Infinity)||value>(rule.max??Infinity))) throw new Error(`Invalid number: ${key}`);
  if(rule.kind==='select' && !rule.options?.some(option=>option.value===value)) throw new Error(`Invalid selection: ${key}`);
  if(rule.kind==='color' && (typeof value!=='string'||(value!=='transparent'&&!/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(value)))) throw new Error(`Invalid color: ${key}`);
  if(typeof value==='string'&&value.length>(rule.maxLength??1000)) throw new Error(`Text too long: ${key}`);
  Object.assign(result,{[key]:value});
 }
 return result;
}
const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function vars(settings:Settings){const s=fieldSettings(settings);return `--ss-height:${s.height}px;--ss-background:${s.background};--ss-navy:${s.navy};--ss-midnight:${s.midnight};--ss-indigo:${s.indigo};--ss-cobalt:${s.cobalt};--ss-blue:${s.blue};--ss-accent:${s.accent};--ss-lavender:${s.lavender};--ss-violet:${s.violet};--ss-magenta:${s.magenta};--ss-rose:${s.rose};--ss-coral:${s.coral};--ss-foreground:${s.foreground};--ss-progressColor:${s.progressColor};--ss-buttonColor:${s.buttonColor};--ss-buttonHover:${s.buttonHover};--ss-buttonForeground:${s.buttonForeground};--ss-grain:${s.grain*.1};--ss-grain-size:${180*s.grainSize}px`;}
export function render(input:unknown = {}):string {
 const s=resolveSettings(input);
 return `<section class="ss-root" style="${vars(s)}" aria-label="Smooth scrolling surface"><div class="ss-viewport" tabindex="0" role="region" aria-label="Scrollable content"><div class="ss-content"><canvas class="ss-field" aria-hidden="true"></canvas></div></div><div class="ss-progress" aria-hidden="true"${s.showProgress?'':' hidden'}><span></span></div><div class="ss-caption"><p>${escape(s.caption)}</p></div><button class="ss-return" type="button" aria-label="${escape(s.returnLabel)}" title="${escape(s.returnLabel)}" data-visible="false" aria-hidden="true" tabindex="-1"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg></button></section>`;
}

const mounted = new WeakMap<HTMLElement, {destroy():void}>();

export function mount(host:HTMLElement,input:unknown = {}) {
 const resolved=resolveSettings(input);
 mounted.get(host)?.destroy();
 let settings=resolved,dead=false,paused=false,visible=true,raf=0,target=0,position=0,last=0;
 if(!host.querySelector('.ss-root')) host.innerHTML=render(settings);
 const root=host.querySelector<HTMLElement>('.ss-root')!;
 const viewport=root.querySelector<HTMLElement>('.ss-viewport')!;
 const content=root.querySelector<HTMLElement>('.ss-content')!;
 const field=createField(root.querySelector<HTMLCanvasElement>('.ss-field'));
 const drawField=()=>field?.draw(viewport.clientWidth,fieldSettings(settings));
 const progress=root.querySelector<HTMLElement>('.ss-progress')!;
 const bar=progress.firstElementChild as HTMLElement;
 const button=root.querySelector<HTMLButtonElement>('.ss-return')!;
 const media=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
 const max=()=>Math.max(0,viewport.scrollHeight-viewport.clientHeight);
 const cancel=()=>{if(raf) cancelAnimationFrame(raf);raf=0;target=position=viewport.scrollTop;last=0;};
 const active=()=>!dead&&!paused&&visible&&!document.hidden&&!media?.matches&&settings.enabled;
 const paint=()=>{const fraction=max()?viewport.scrollTop/max():0;bar.style.transform=`scaleX(${fraction})`;const shown=settings.showReturn&&viewport.scrollTop>400;button.dataset.visible=String(shown);button.setAttribute('aria-hidden',String(!shown));button.tabIndex=shown?0:-1;};
 const frame=(time:number)=>{raf=0;if(!active())return;const dt=last?Math.min(time-last,64):16;last=time;target=Math.max(0,Math.min(max(),target));const distance=target-position;position+=distance*(1-Math.exp(-dt/(settings.duration*1000/5)));viewport.scrollTop=position;paint();if(Math.abs(target-position)>1.1)raf=requestAnimationFrame(frame);else{viewport.scrollTop=position=target;last=0;paint();}};
 const travel=(y:number)=>{target=Math.max(0,Math.min(max(),y));if(!active()){viewport.scrollTop=position=target;paint();return;}if(!raf){position=viewport.scrollTop;raf=requestAnimationFrame(frame);}};
 const nestedCanScroll=(node:EventTarget|null,delta:number)=>{let el=node instanceof Element?node:null;while(el&&el!==viewport){if(el instanceof HTMLElement&&/(auto|scroll)/.test(getComputedStyle(el).overflowY)&&el.scrollHeight>el.clientHeight&&((delta<0&&el.scrollTop>0)||(delta>0&&el.scrollTop<el.scrollHeight-el.clientHeight)))return true;el=el.parentElement;}return false;};
 const wheel=(event:WheelEvent)=>{if(!active()||event.ctrlKey||event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||nestedCanScroll(event.target,event.deltaY))return;const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?viewport.clientHeight:1);if(!delta)return;const current=raf?target:viewport.scrollTop;if((delta<0&&viewport.scrollTop<=0)||(delta>0&&viewport.scrollTop>=max())){cancel();return;}event.preventDefault();travel(current+delta);};
 const nativeInput=()=>cancel();
 const scroll=()=>{if(!raf)target=position=viewport.scrollTop;paint();};
 const top=()=>{travel(0);viewport.focus({preventScroll:true});};
 const preference=()=>{cancel();paint();};
 viewport.addEventListener('wheel',wheel,{passive:false});viewport.addEventListener('scroll',scroll,{passive:true});
 viewport.addEventListener('pointerdown',nativeInput,{passive:true});viewport.addEventListener('touchstart',nativeInput,{passive:true});viewport.addEventListener('keydown',nativeInput);viewport.addEventListener('click',nativeInput);
 button.addEventListener('click',top);document.addEventListener('visibilitychange',preference);media?.addEventListener?.('change',preference);
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;if(!visible)cancel();},{threshold:0}):null;observer?.observe(root);
 const resize=typeof ResizeObserver==='function'?new ResizeObserver(()=>{target=Math.min(target,max());drawField();paint();}):null;resize?.observe(viewport);resize?.observe(content);
 const update=(value:unknown)=>{if(dead)return;const next=resolveSettings(value);cancel();settings=next;root.setAttribute('style',vars(settings));root.querySelector('.ss-caption p')!.textContent=settings.caption;button.setAttribute('aria-label',settings.returnLabel);button.title=settings.returnLabel;progress.hidden=!settings.showProgress;drawField();paint();};
 update(settings);
 const controller={update,pause(){if(!dead){paused=true;cancel();}},resume(){if(!dead){paused=false;paint();}},destroy(){if(dead)return;dead=true;cancel();field?.destroy();observer?.disconnect();resize?.disconnect();media?.removeEventListener?.('change',preference);document.removeEventListener('visibilitychange',preference);viewport.removeEventListener('wheel',wheel);viewport.removeEventListener('scroll',scroll);viewport.removeEventListener('pointerdown',nativeInput);viewport.removeEventListener('touchstart',nativeInput);viewport.removeEventListener('keydown',nativeInput);viewport.removeEventListener('click',nativeInput);button.removeEventListener('click',top);if(mounted.get(host)===controller){root.remove();mounted.delete(host);}}};
 mounted.set(host,controller);
 return controller;
}
