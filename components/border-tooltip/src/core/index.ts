import manifest from '../../component.json';

export interface Settings { labels:string[]; theme:'auto'|'light'|'dark'; placement:'top'|'bottom'; scale:number; gap:number; duration:number; accent:string }
export const defaults = Object.fromEntries(manifest.settings.map(s => [s.key, Array.isArray(s.default) ? [...s.default] : s.default])) as unknown as Settings;
export function resolveSettings(input:unknown = {}):Settings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Settings must be an object');
  const result = {...defaults, labels:[...defaults.labels]};
  for (const [key,value] of Object.entries(input)) {
    const rule = manifest.settings.find(s => s.key === key);
    if (!rule) throw new Error('Unknown setting: '+key);
    if (rule.kind === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < rule.min! || value > rule.max!) throw new Error('Invalid number: '+key);
    } else if (rule.kind === 'string-list') {
      if (!Array.isArray(value) || value.length !== 3 || value.some(v => typeof v !== 'string' || !v.trim() || v.length > 180)) throw new Error('Provide three nonempty descriptions, up to 180 characters each');
    } else if (typeof value !== 'string' || (rule.kind === 'select' && !rule.options?.includes(value)) || (rule.kind === 'color' && value !== 'transparent' && !/^#[\da-f]{6}([\da-f]{2})?$/i.test(value))) throw new Error('Invalid setting: '+key);
    Object.assign(result, {[key]: Array.isArray(value) ? [...value] : value});
  }
  return result;
}
const escape = (s:string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const solidGlyph = '<svg class="bt-glyph-solid" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><circle cx="12" cy="7.5" r="1.2" fill="var(--bt-mark)"/><path d="M10.6 10.6h1.8v6h1.2" fill="none" stroke="var(--bt-mark)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export function render(input:unknown = defaults, identity='border-tooltip'):string {
  const s = resolveSettings(input), id=escape(identity);
  return `<div class="bt" data-direction="A" data-theme="${s.theme}" style="--bt-scale:${s.scale};--bt-accent:${s.accent};--bt-duration:${s.duration}ms">${s.labels.map((label,i)=>`<div class="bt-item" data-size="${i===2?'double':'standard'}"><button type="button" class="bt-trigger" aria-label="${['Curved','Angular','Large'][i]} information" aria-describedby="${id}-${i}">${solidGlyph}</button><span class="bt-description" role="tooltip" id="${id}-${i}">${escape(label)}</span></div>`).join('')}</div>`;
}
let sequence=0;
export function mount(host:HTMLElement, input:unknown = defaults) {
  let settings=resolveSettings(input), destroyed=false, paused=false, offscreen=false;
  const doc=host.ownerDocument, win=doc.defaultView!;
  const original=host.innerHTML, uid=`border-tooltip-${++sequence}`;
  host.innerHTML=render(settings,uid);
  const root=host.querySelector<HTMLElement>('.bt')!;
  const abort=new AbortController();
  const on=(target:EventTarget,type:string,handler:EventListener,options:AddEventListenerOptions={})=>target.addEventListener(type,handler,{...options,signal:abort.signal});
  const states=Array.from(root.querySelectorAll<HTMLButtonElement>('.bt-trigger')).map((button,index)=>{
    const floating=doc.createElement('div');
    floating.className='bt-floating'; floating.dataset.direction='A'; floating.dataset.size=index===2?'double':'standard'; floating.dataset.pointer=index===1?'angular':'curved';
    floating.setAttribute('aria-hidden','true');
    const beak=index===1?'<svg class="bt-beak" viewBox="0 0 25 9" aria-hidden="true"><path d="M0 -1H25V.5L12.5 8.5L0 .5Z" fill="var(--bt-surface)"/><path d="M0 .5L12.5 8.5L25 .5" fill="none" stroke="var(--bt-line)" stroke-width="1"/></svg>':'<svg class="bt-beak" viewBox="0 0 31 11" aria-hidden="true"><path d="M0 -1H31V.5C24 .5 21 2 18.5 7Q15.5 14 12.5 7C10 2 7 .5 0 .5Z" fill="var(--bt-surface)"/><path d="M0 .5C7 .5 10 2 12.5 7Q15.5 14 18.5 7C21 2 24 .5 31 .5" fill="none" stroke="var(--bt-line)" stroke-width="1"/></svg>';
    floating.innerHTML='<div class="bt-bubble"><span class="bt-label"></span>'+beak+'</div>';
    doc.body.append(floating);
    return {button,floating,index,hover:false,focus:false,pinned:false,dismissed:false};
  });
  type State=typeof states[number];
  const active=(state:State)=>!paused&&!offscreen&&!doc.hidden&&!state.dismissed&&(state.hover||state.focus||state.pinned);
  const position=(state:State)=>{
    const {button,floating}=state, r=button.getBoundingClientRect();
    const viewport=win.visualViewport, left=viewport?.offsetLeft??0, top=viewport?.offsetTop??0, width=viewport?.width??win.innerWidth, height=viewport?.height??win.innerHeight;
    const margin=Math.min(20,width/8,height/8), gap=((state.index===2?16:state.index===1?4:6)+settings.gap-12)*settings.scale;
    floating.style.maxWidth=`${Math.max(1,width-margin*2)}px`;
    const measured=floating.getBoundingClientRect();
    const w=measured.width,h=measured.height;
    const space={top:r.top-top-margin,bottom:top+height-margin-r.bottom};
    const sides=[settings.placement,settings.placement==='top'?'bottom':'top'] as const;
    const side=sides.find(v=>space[v]>=h+gap)??sides.reduce((a,b)=>space[a]>space[b]?a:b);
    let x=r.left+(r.width-w)/2,y=side==='top'?r.top-h-gap:r.bottom+gap;
    x=Math.max(left+margin,Math.min(x,left+width-margin-w)); y=Math.max(top+margin,Math.min(y,top+height-margin-h));
    floating.style.left=`${x}px`; floating.style.top=`${y}px`; floating.dataset.side=side;
    const center=r.left+r.width/2-x, edge=state.index===2?34:18;
    floating.style.setProperty('--bt-pointer-position',`${Math.max(edge,Math.min(center,w-edge))}px`);
  };
  const paint=(state:State)=>{if(destroyed)return; const open=active(state); if(open)position(state); state.floating.dataset.open=String(open); state.button.dataset.open=String(open);};
  const enter=(state:State)=>{state.hover=true;state.dismissed=false;paint(state);};
  // Join the nearest parallel edges with a linearly widening travel corridor.
  const inTravelRegion=(state:State,x:number,y:number)=>{
    const a=state.button.getBoundingClientRect(),b=state.floating.getBoundingClientRect();
    const inside=(r:DOMRect)=>x>=r.left-2&&x<=r.right+2&&y>=r.top-2&&y<=r.bottom+2;
    if(inside(a)||inside(b))return true;
    if(b.bottom<a.top||a.bottom<b.top){
      const upper=b.bottom<a.top?b:a,lower=upper===a?b:a;
      if(y<upper.bottom||y>lower.top)return false;
      const fraction=(y-upper.bottom)/(lower.top-upper.bottom);
      return x>=upper.left+(lower.left-upper.left)*fraction-2&&x<=upper.right+(lower.right-upper.right)*fraction+2;
    }
    return false;
  };
  const leave=(state:State,event:PointerEvent)=>{state.hover=inTravelRegion(state,event.clientX,event.clientY);paint(state);};
  on(doc,'pointermove',((event:PointerEvent)=>{
    if(event.pointerType==='touch')return;
    states.forEach(state=>{if(state.hover&&!inTravelRegion(state,event.clientX,event.clientY)){state.hover=false;paint(state);}});
  }) as EventListener,{passive:true});
  states.forEach(state=>{
    const {button,floating}=state;
    on(button,'pointerenter',((e:PointerEvent)=>{if(e.pointerType!=='touch')enter(state);}) as EventListener);
    on(button,'pointerleave',((e:PointerEvent)=>{if(e.pointerType!=='touch')leave(state,e);}) as EventListener);
    on(floating,'pointerenter',()=>enter(state)); on(floating,'pointerleave',((e:PointerEvent)=>leave(state,e)) as EventListener);
    on(button,'focus',()=>{state.focus=true;state.dismissed=false;paint(state);});
    on(button,'blur',()=>{state.focus=false;state.pinned=false;paint(state);});
    on(button,'click',()=>{state.pinned=!state.pinned;state.dismissed=!state.pinned;paint(state);});
  });
  on(doc,'keydown',((e:KeyboardEvent)=>{if(e.key==='Escape')states.forEach(s=>{s.pinned=false;s.dismissed=true;paint(s);});}) as EventListener);
  on(doc,'pointerdown',((e:PointerEvent)=>{states.forEach(s=>{if(!s.button.contains(e.target as Node)&&!s.floating.contains(e.target as Node)){s.pinned=false;s.dismissed=true;paint(s);}});}) as EventListener);
  const reposition=()=>states.forEach(s=>{if(active(s))position(s);});
  on(win,'resize',reposition); on(doc,'scroll',reposition,{capture:true,passive:true});
  if(win.visualViewport){on(win.visualViewport,'resize',reposition);on(win.visualViewport,'scroll',reposition);}
  on(doc,'visibilitychange',()=>states.forEach(paint));
  const resize=new ResizeObserver(reposition); resize.observe(root);states.forEach(s=>resize.observe(s.floating));
  const intersection=new IntersectionObserver(entries=>{offscreen=!entries[0].isIntersecting;states.forEach(paint);});intersection.observe(root);
  const apply=()=>{
    root.dataset.theme=settings.theme;
    root.style.setProperty('--bt-scale',String(settings.scale)); root.style.setProperty('--bt-accent',settings.accent);root.style.setProperty('--bt-duration',settings.duration+'ms');
    states.forEach(s=>{s.floating.dataset.theme=settings.theme;s.floating.style.setProperty('--bt-scale',String(settings.scale));s.floating.style.setProperty('--bt-duration',settings.duration+'ms');s.floating.querySelector('.bt-label')!.textContent=settings.labels[s.index];root.querySelectorAll('.bt-description')[s.index].textContent=settings.labels[s.index];paint(s);});
  };
  apply();
  return {
    update(next:unknown){if(destroyed)return;const validated=resolveSettings(next);settings=validated;apply();},
    pause(){if(destroyed)return;paused=true;states.forEach(s=>{s.floating.dataset.paused='true';paint(s);});root.dataset.paused='true';},
    resume(){if(destroyed)return;paused=false;delete root.dataset.paused;states.forEach(s=>{delete s.floating.dataset.paused;paint(s);});},
    destroy(){if(destroyed)return;destroyed=true;abort.abort();resize.disconnect();intersection.disconnect();states.forEach(s=>{s.floating.remove();});host.innerHTML=original;}
  };
}
