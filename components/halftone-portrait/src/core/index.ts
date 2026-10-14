import {DEFAULT_PROPS,parseHalftoneProps,type HalftoneProps} from './props';
import {mountHalftone} from './mount';
import {imageSource} from './assets';
export type Settings=HalftoneProps;
export const defaults=DEFAULT_PROPS;
export function resolveSettings(input:unknown={}):Settings {
 const result={...defaults};
 if(input&&typeof input==='object'&&!Array.isArray(input))for(const [key,value] of Object.entries(input)) {
  if(!(key in defaults))continue;
  const parsed=parseHalftoneProps({...result,[key]:value});if(parsed.ok)Object.assign(result,parsed.value);
 }
 return result;
}
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function style(p:Settings):string{return `background:${p.background};border-radius:${p.borderRadius}px;aspect-ratio:${p.aspectRatio};--halftone-cursor-color:${p.cursorColor};${p.fade?`mask-image:linear-gradient(#000 ${100-p.fade*100}%,transparent 100%);`:''}`;}
function imageStyle(p:Settings):string{return `object-fit:${p.fit};object-position:${p.focalX*100}% ${p.focalY*100}%;transform:scale(${p.scale})`;}
export function render(input:unknown={}):string {const p=resolveSettings(input);return `<div class="arclen-halftone" style="${style(p)}" role="img" aria-label="${escape(p.alt)}" tabindex="0"><img class="arclen-halftone__fallback" data-arclen-halftone-image src="${escape(imageSource(p.src))}" alt="${escape(p.alt)}" style="${imageStyle(p)}"></div>`;}
export function mount(host:HTMLElement,input:unknown={}){
 let settings=resolveSettings(input),paused=false,destroyed=false;
 host.classList.add('aui-halftone-portrait');host.innerHTML=render(settings);
 const root=host.firstElementChild as HTMLElement;
 const fallback=root.querySelector('img')!;
 const controller=mountHalftone(root,settings,imageSource(settings.src));
 return {update(next:unknown){if(destroyed)return;settings=resolveSettings(next);root.style.cssText=style(settings);fallback.src=imageSource(settings.src);fallback.alt=settings.alt;fallback.style.cssText=imageStyle(settings);controller.update({...settings,motion:settings.motion&&!paused},imageSource(settings.src));},pause(){paused=true;controller.pause();},resume(){paused=false;controller.update(settings,imageSource(settings.src));controller.resume();},destroy(){if(destroyed)return;destroyed=true;controller.destroy();}};
}
