/** Bounded, stepped hover fill for the demo replay control. */
export interface PixelButtonSettings {
 label:string; disabled:boolean; animate:boolean; textColor:string;
 scatterColor?:string; backgroundColor:string; cornerColor:string;
}
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
const columns=18, rows=6, stagger=23, cellDuration=30;
const maxDistance=Math.hypot(columns-1,rows-1);
const sweepDuration=maxDistance*stagger+cellDuration;
const closed='inset(0 100% 0 0)', open='inset(0)';
/** Radial cell order matches the page sweep: distance from the top-left corner. */
export function pixelFront(radius:number):string {
 const points=['0% 0%'];
 for(let row=0;row<rows;row++){
  const count=radius<row?0:Math.min(columns,Math.floor(Math.sqrt(Math.max(0,radius*radius-row*row))+1e-8)+1);
  const x=count/columns*100;
  points.push(`${x}% ${row/rows*100}%`,`${x}% ${(row+1)/rows*100}%`);
 }
 points.push('0% 100%');return `polygon(${points.join(',')})`;
}
const distances=[...new Set(Array.from({length:columns*rows},(_,i)=>Math.hypot(i%columns,Math.floor(i/columns))))].sort((a,b)=>a-b);
// One shared mask keeps the contrasting label registered to every revealed cell.
// Each cell switches at the midpoint of the page's short opacity ramp.
const frames=[{clipPath:pixelFront(-1),offset:0,easing:'steps(1,end)'},
 ...distances.map(distance=>({clipPath:pixelFront(distance),offset:(distance*stagger+cellDuration/2)/sweepDuration,easing:'steps(1,end)'})),
 {clipPath:pixelFront(maxDistance),offset:1}];
export function renderPixelButton(settings:PixelButtonSettings,id?:string):string {
 const label=escape(settings.label);
 return `<button type="button" class="pt-pixel-button"${id?` id="${escape(id)}"`:''} aria-label="${label}"${settings.disabled?' disabled':''}><span class="pt-pixel-label" aria-hidden="true">${label}</span><span class="pt-pixel-fill" aria-hidden="true"><span>${label}</span></span>${['tl','tr','bl','br'].map(c=>`<span class="pt-pixel-corner pt-pixel-${c}" aria-hidden="true"></span>`).join('')}</button>`;
}
interface PixelButtonController {update(settings:Partial<PixelButtonSettings>):void;pause():void;resume():void;destroy():void}
const attached=new WeakMap<HTMLButtonElement,PixelButtonController>();
export function attachPixelButton(button:HTMLButtonElement,initial:PixelButtonSettings):PixelButtonController {
 attached.get(button)?.destroy();
 let settings={...initial},paused=false,destroyed=false,visible=true,hovered=false,focused=false,filled=false;
 let animation:Animation|null=null;
 const fill=button.querySelector<HTMLElement>('.pt-pixel-fill')!;
 const doc=button.ownerDocument,win=doc.defaultView;
 const reduced=win?.matchMedia('(prefers-reduced-motion: reduce)');
 const fine=win?.matchMedia('(hover: hover) and (pointer: fine)');
 function cancel(){if(animation){animation.onfinish=null;animation.cancel();animation=null;}}
 function reset(){cancel();filled=false;hovered=false;focused=false;fill.style.clipPath=closed;button.removeAttribute('data-pixel-active');}
 function target(active:boolean){
  if(destroyed||paused||!visible||doc.hidden||settings.disabled){reset();return;}
  button.toggleAttribute('data-pixel-active',active);
  if(!settings.animate||reduced?.matches||typeof fill.animate!=='function'){
   cancel();filled=active;fill.style.clipPath=active?open:closed;return;
  }
  if(!animation){
   if(filled===active)return;
   animation=fill.animate(frames,{duration:sweepDuration,fill:'both'});
   animation.pause();animation.currentTime=filled?sweepDuration:0;
   animation.onfinish=()=>{
    const completed=animation;
    filled=button.hasAttribute('data-pixel-active');fill.style.clipPath=filled?open:closed;
    animation=null;if(completed){completed.onfinish=null;completed.cancel();}
   };
  }
  animation.playbackRate=active?1:-3;animation.play();
 }
 function enter(event:PointerEvent){if(event.pointerType==='touch'||!fine?.matches)return;hovered=true;target(true);}
 function leave(){hovered=false;target(focused);}
 function focus(){focused=button.matches(':focus-visible');if(focused)target(true);}
 function blur(){focused=false;target(hovered);}
 function eligibility(){if(doc.hidden||reduced?.matches)reset();}
 function configure(){
  button.disabled=settings.disabled;button.setAttribute('aria-label',settings.label);
  button.querySelector('.pt-pixel-label')!.textContent=settings.label;fill.firstElementChild!.textContent=settings.label;
 }
 button.addEventListener('pointerenter',enter);button.addEventListener('pointerleave',leave);
 button.addEventListener('focus',focus);button.addEventListener('blur',blur);
 doc.addEventListener('visibilitychange',eligibility);reduced?.addEventListener('change',eligibility);
 const observer=win?.IntersectionObserver?new win.IntersectionObserver(entries=>{
  if(destroyed)return;visible=entries.find(entry=>entry.target===button)?.isIntersecting??visible;if(!visible)reset();
 }):null;
 observer?.observe(button);configure();reset();
 const controller:PixelButtonController={
  update(input){if(destroyed)return;settings={...settings,...input};configure();reset();},
  pause(){if(!destroyed){paused=true;reset();}},resume(){if(!destroyed)paused=false;},
  destroy(){if(destroyed)return;reset();destroyed=true;observer?.disconnect();
   button.removeEventListener('pointerenter',enter);button.removeEventListener('pointerleave',leave);
   button.removeEventListener('focus',focus);button.removeEventListener('blur',blur);
   doc.removeEventListener('visibilitychange',eligibility);reduced?.removeEventListener('change',eligibility);
   if(attached.get(button)===controller)attached.delete(button);
  },
 };attached.set(button,controller);return controller;
}
