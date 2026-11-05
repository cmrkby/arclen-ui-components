import manifest from '../../component.json';
import {easings,originPoint,revealFrames,type Theme,type MotionSettings} from './motion';
export {createThemeReveal} from './page';
export type {PageRevealOptions,PageRevealController,RevealResult} from './page';
export type {Theme,MotionSettings,Origin} from './motion';
export interface Settings extends MotionSettings {initialTheme:Theme;disabled:boolean;accessibleName:string;toggleWidth:number;toggleHeight:number;thumbInset:number;iconSize:number;iconStroke:number;canvasMinHeight:number;lightBackground:string;darkBackground:string;lightTrack:string;darkTrack:string;lightThumb:string;darkThumb:string;lightIcon:string;darkIcon:string;lightBorder:string;darkBorder:string;accentColor:string}
export const defaults=Object.freeze(Object.fromEntries(manifest.settings.map(s=>[s.key,s.default]))) as unknown as Readonly<Settings>;
export function resolveSettings(input:unknown={}):Settings{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Theme Reveal settings must be an object');
 const result={...defaults} as unknown as Record<string,unknown>;
 for(const[key,value]of Object.entries(input)){
  const s=manifest.settings.find(s=>s.key===key) as {kind:string;min?:number;max?:number;maxLength?:number;options?:{value:string}[]}|undefined;
  if(!s)throw new TypeError(`Unknown Theme Reveal setting: ${key}`);
  if(s.kind==='number'){if(typeof value!=='number'||!Number.isFinite(value)||value<s.min!||value>s.max!)throw new TypeError(`Invalid number: ${key}`);}
  else if(s.kind==='boolean'){if(typeof value!=='boolean')throw new TypeError(`Invalid boolean: ${key}`);}
  else{if(typeof value!=='string'||value.length>(s.maxLength??120))throw new TypeError(`Invalid string: ${key}`);if(s.kind==='color'&&!/^(?:transparent|#[0-9a-f]{6}(?:[0-9a-f]{2})?)$/i.test(value))throw new TypeError(`Invalid color: ${key}`);if(s.kind==='select'&&!s.options?.some(o=>o.value===value))throw new TypeError(`Invalid option: ${key}`);if(key==='accessibleName'&&!value.trim())throw new TypeError(`Blank label: ${key}`);}
  result[key]=value;
 }
 return result as unknown as Settings;
}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const vars=(s:Settings)=>`--tr-width:${s.toggleWidth}px;--tr-height:${s.toggleHeight}px;--tr-inset:${s.thumbInset}px;--tr-icon:${s.iconSize}px;--tr-stroke:${s.iconStroke};--tr-canvas-height:${s.canvasMinHeight}px;--tr-light:${s.lightBackground};--tr-dark:${s.darkBackground};--tr-light-track:${s.lightTrack};--tr-dark-track:${s.darkTrack};--tr-light-thumb:${s.lightThumb};--tr-dark-thumb:${s.darkThumb};--tr-light-icon:${s.lightIcon};--tr-dark-icon:${s.darkIcon};--tr-light-border:${s.lightBorder};--tr-dark-border:${s.darkBorder};--tr-accent:${s.accentColor}`;
const moon=`<svg data-tr-icon="moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19.6 15.1A8.3 8.3 0 0 1 8.9 4.4a8.4 8.4 0 1 0 10.7 10.7Z"/></svg>`;
const sun=`<svg data-tr-icon="sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3.6"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;
export function render(input:unknown=defaults,_id?:string):string{const s=resolveSettings(input);return `<section class="theme-reveal" data-theme-reveal data-theme="${s.initialTheme}" data-phase="idle" style="${vars(s)}"><div class="theme-reveal__surface" data-tr-dark aria-hidden="true" inert style="opacity:${s.initialTheme==='dark'?1:0}"></div><button type="button" class="theme-reveal__trigger" data-tr-trigger aria-label="${escape(s.accessibleName)}" aria-pressed="${s.initialTheme==='dark'}" disabled><span class="theme-reveal__track" data-tr-track aria-hidden="true"><span class="theme-reveal__thumb" data-tr-thumb></span>${moon}${sun}</span></button></section>`;}

export interface Controller {update(input:unknown):void;pause():void;resume():void;destroy():void}
export function mount(host:HTMLElement,input:unknown=defaults,id?:string):Controller{
 let settings=resolveSettings(input),theme=settings.initialTheme,dead=false,paused=false,visible=true,animation:Animation|null=null;
 host.innerHTML=render(settings,id);const root=host.querySelector<HTMLElement>('[data-theme-reveal]')!,dark=root.querySelector<HTMLElement>('[data-tr-dark]')!,button=root.querySelector<HTMLButtonElement>('[data-tr-trigger]')!;
 const doc=host.ownerDocument,win=doc.defaultView!;const media=win.matchMedia?.('(prefers-reduced-motion: reduce)');
 const canAnimate=()=>!paused&&visible&&!doc.hidden&&!media?.matches&&typeof dark.animate==='function';
 function sync(){root.dataset.theme=theme;button.setAttribute('aria-pressed',String(theme==='dark'));button.disabled=settings.disabled||paused;button.setAttribute('aria-label',settings.accessibleName);}
 function settle(){animation?.cancel();animation=null;dark.style.opacity=theme==='dark'?'1':'0';dark.style.background='';root.style.background='';root.dataset.phase='idle';sync();}
 function animate(previous:Theme){
  const moving=canAnimate();if(moving)root.dataset.phase='revealing';sync();if(!moving){settle();return;}
  if(settings.revealStyle==='curtain'){
   animation?.cancel();root.style.background=theme==='dark'?'var(--tr-dark)':'var(--tr-light)';dark.style.background=previous==='dark'?'var(--tr-dark)':'var(--tr-light)';dark.style.opacity='1';
   const a=dark.animate(revealFrames(settings),{duration:settings.duration,easing:easings[settings.easing],fill:'both'});animation=a;a.onfinish=()=>{if(animation===a)settle();};return;
  }
  if(animation){animation.playbackRate=theme==='dark'?1:-1;animation.play();root.dataset.phase='revealing';return;}
  const box=root.getBoundingClientRect();const frames=revealFrames(settings,box.width,box.height,originPoint(settings,box.width,box.height,button,{x:box.left,y:box.top}));
  dark.style.opacity='1';const a=dark.animate(frames,{duration:settings.duration,easing:easings[settings.easing],fill:'both'});animation=a;a.pause();a.currentTime=theme==='dark'?0:settings.duration;a.playbackRate=theme==='dark'?1:-1;root.dataset.phase='revealing';a.onfinish=()=>{if(animation===a)settle();};a.play();
 }
 function click(){if(dead||button.disabled)return;const previous=theme;theme=theme==='light'?'dark':'light';animate(previous);}
 function change(){if(!canAnimate())settle();}
 function resize(){if(animation)settle();}
 button.addEventListener('click',click);doc.addEventListener('visibilitychange',change);media?.addEventListener?.('change',change);
 const observer=typeof win.IntersectionObserver==='function'?new win.IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);change();}):null;observer?.observe(root);
 const ro=typeof win.ResizeObserver==='function'?new win.ResizeObserver(resize):null;ro?.observe(root);sync();
 return{update(value){if(dead)return;if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('Settings must be an object');const next=resolveSettings({...settings,...value});const changedTheme=Object.prototype.hasOwnProperty.call(value,'initialTheme')&&next.initialTheme!==theme;const changed=changedTheme||manifest.settings.some(s=>next[s.key as keyof Settings]!==settings[s.key as keyof Settings]);if(!changed)return;settings=next;if(changedTheme)theme=next.initialTheme;settle();root.setAttribute('style',vars(settings));sync();},pause(){if(dead)return;paused=true;settle();},resume(){if(dead)return;paused=false;sync();},destroy(){if(dead)return;dead=true;settle();button.disabled=true;button.removeEventListener('click',click);doc.removeEventListener('visibilitychange',change);media?.removeEventListener?.('change',change);observer?.disconnect();ro?.disconnect();}};
}
