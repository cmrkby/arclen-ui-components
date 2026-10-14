import {createSignalField} from './create-signal-field';
import {DEFAULT_SIGNAL_FIELD_OPTIONS, resolveSignalFieldOptions} from './options';
import type {SignalFieldOptions,ResolvedSignalFieldOptions} from './types';
import {poster} from './poster';
export type Settings = ResolvedSignalFieldOptions;
export const defaults = DEFAULT_SIGNAL_FIELD_OPTIONS;
export function resolveSettings(input:unknown = {}):Settings {return resolveSignalFieldOptions(input && typeof input === 'object' && !Array.isArray(input) ? input as SignalFieldOptions : {});}
const escape = (s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function render(input:unknown = {}):string {const s=resolveSettings(input);const hex=s.baseColor.slice(1),luminance=[0,2,4].reduce((sum,offset,index)=>sum+parseInt(hex.slice(offset,offset+2),16)/255*[.2126,.7152,.0722][index]!,0);return `<div class="aui-signal-field__surface" aria-hidden="true" style="background:linear-gradient(132deg,${s.surfaceColor},${s.baseColor} 48%,${s.accentColor} 78%,${s.secondaryAccentColor})">${poster?`<img class="aui-signal-field__poster" src="${poster}" alt="">`:''}</div>${s.showText?`<span class="aui-signal-field__fallback-text" aria-hidden="true" style="color:${luminance>.5?'#211e34':'#ffffff'}">${escape(s.text)}</span>`:''}`;}
export function mount(host:HTMLElement,input:unknown = {}) {
 let settings=resolveSettings(input),paused=false,destroyed=false;
 host.classList.add('aui-signal-field');host.innerHTML=render(settings);
 const fallback=host.querySelector<HTMLElement>('.aui-signal-field__fallback-text');fallback?.remove();
 const surface=host.querySelector<HTMLElement>('.aui-signal-field__surface')!;
 const controller=createSignalField(surface,settings);
 return {update(next:unknown){if(destroyed)return;settings=resolveSettings(next);controller.setOptions({...settings,animate:settings.animate&&!paused});},pause(){paused=true;controller.setOptions({animate:false});},resume(){paused=false;controller.setOptions({animate:settings.animate});},destroy(){if(destroyed)return;destroyed=true;controller.destroy();host.innerHTML=render(settings);}};
}
