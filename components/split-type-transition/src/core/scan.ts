/** A quiet, native replay control for editorial demos. */
export interface TacticalSettings {
 label:string; disabled:boolean; animate:boolean; textColor:string;
 scatterColor?:string; backgroundColor:string; cornerColor:string;
}
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function renderTacticalButton(settings:TacticalSettings,id?:string):string {
 return `<button type="button" class="pt-editorial-button"${id?` id="${escape(id)}"`:''}${settings.disabled?' disabled':''}><span>${escape(settings.label)}</span><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M19 7v5h-5M18.2 12a6.5 6.5 0 1 0-1.6 4.7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
}
/** Native focus/hover needs no animation loop, observer, or event listeners. */
export function attachTactical(button:HTMLButtonElement,initial:TacticalSettings) {
 let settings={...initial};
 return {
  update(patch:Partial<TacticalSettings>){settings={...settings,...patch};button.disabled=settings.disabled;const label=button.querySelector('span');if(label)label.textContent=settings.label;},
  pause(){},resume(){},destroy(){},
 };
}
