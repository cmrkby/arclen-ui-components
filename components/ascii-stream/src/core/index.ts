import manifest from '../../component.json';
import {makeField, type FieldSettings} from './field';

export type {FieldSettings};
export const defaults=Object.fromEntries(manifest.settings.map(rule=>[rule.key,rule.default])) as unknown as FieldSettings;
const paletteKeys=['background','inner','outer','beamTint','flareColor'] as const;
type Palette=Pick<FieldSettings,typeof paletteKeys[number]>;
const palettes:Record<Exclude<FieldSettings['colourway'],'custom'>,Palette>={
  'silver-ember':{background:'#090909',inner:'#858587',outer:'#b7b9bd',beamTint:'#dedbd9',flareColor:'#f54e00'},
  'violet-ember':{background:'#090909',inner:'#8975b4',outer:'#d152ff',beamTint:'#e8dbfa',flareColor:'#f54e00'},
  'ember-rose':{
    background:defaults.background,inner:defaults.inner,outer:defaults.outer,
    beamTint:defaults.beamTint,flareColor:defaults.flareColor
  },
  ultraviolet:{background:'#0d0914',inner:'#8962da',outer:'#dda3ef',beamTint:'#d1beff',flareColor:'#e776c2'},
  glacier:{background:'#070e16',inner:'#4787bc',outer:'#9de1f0',beamTint:'#b5f3ff',flareColor:'#6ca6ff'},
  verdigris:{background:'#090f0e',inner:'#539389',outer:'#a6cdb6',beamTint:'#def2dc',flareColor:'#e98b58'}
};
export function resolveSettings(input:unknown={},previous:FieldSettings=defaults):FieldSettings {
  const values:Record<string,unknown>={...previous};
  const source=(input && typeof input==='object'?input:{}) as Record<string,unknown>;
  // A named selection replaces the shared colours. Explicit colour fields in the same patch win.
  if(typeof source.colourway==='string' && Object.hasOwn(palettes,source.colourway)){
    Object.assign(values,palettes[source.colourway as keyof typeof palettes]);
  }
  for(const rule of manifest.settings){
    const v=source[rule.key];
    if(rule.kind==='number' && typeof v==='number' && Number.isFinite(v)){
      const bounded=Math.min(rule.max!,Math.max(rule.min!,v));
      values[rule.key]=rule.step===1?Math.round(bounded):bounded;
    }
    if(rule.kind==='color' && typeof v==='string' && /^#[a-f\d]{6}$/i.test(v))values[rule.key]=v;
    if(rule.kind==='boolean' && typeof v==='boolean')values[rule.key]=v;
    if(rule.kind==='select' && rule.options?.some(o=>o.value===v))values[rule.key]=v;
    if(rule.kind==='text' && typeof v==='string')values[rule.key]=Array.from(v).slice(0,64).join('');
  }
  const selected=values.colourway as FieldSettings['colourway'];
  if(selected!=='custom' && paletteKeys.some(key=>String(values[key]).toLowerCase()!==palettes[selected][key])){
    values.colourway='custom';
  }
  return values as unknown as FieldSettings;
}
export function render(settings:unknown={}){
  const {background}=resolveSettings(settings);
  return '<div class="ascii-stream" style="background:'+background+'"><canvas aria-hidden="true"></canvas></div>';
}
export function mount(host:HTMLElement,input:unknown={},_id?:string,options:{paused?:boolean}={}){
  let settings=resolveSettings(input),paused=!!options.paused,visible=true,disposed=false;
  host.innerHTML=render(settings);
  const root=host.firstElementChild as HTMLElement,canvas=root.querySelector('canvas')!;
  const context=canvas.getContext('2d'),field=context?makeField(canvas,context):null;
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  let time=0,age=paused||preference.matches?Infinity:0,last:number|undefined,frame=0,width=0,height=0,ratio=0;
  function paint(){
    const duration=settings.duration*(canvas.dataset.axis==='vertical'?.87:1);
    const progressAt=(start:number)=>!settings.intro||preference.matches?1:
      Math.max(0,Math.min(1,(age*1000-start)/duration));
    const ribbons=progressAt(settings.delay);
    const beam=progressAt(Math.max(0,settings.delay+settings.beamEntranceOffset));
    field?.draw(time,ribbons,beam);
  }
  function stop(){cancelAnimationFrame(frame);frame=0;last=undefined;}
  function tick(now:number){
    frame=0;
    const dt=last===undefined?0:Math.max(0,(now-last)/1000);
    time+=dt;age+=dt;last=now;paint();schedule();
  }
  function schedule(){
    if(disposed||!field||!width||!height||paused||preference.matches||document.hidden||!visible){stop();return;}
    if(!frame)frame=requestAnimationFrame(tick);
  }
  function resize(force=false){
    const w=root.clientWidth,h=root.clientHeight;
    const dpr=Math.min(devicePixelRatio||1,2,Math.sqrt(3000000/Math.max(1,w*h)));
    if(force||w!==width||h!==height||dpr!==ratio){
      width=w;height=h;ratio=dpr;
      if(w && h){field?.configure(settings,w,h,dpr);paint();}
    }
    schedule();
  }
  const observer=new ResizeObserver(()=>resize());observer.observe(root);
  const viewport=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;schedule();});
  viewport.observe(root);
  const events=new AbortController(),listen={signal:events.signal};
  function point(e:PointerEvent,click:boolean){
    if(paused||!settings.interactive||preference.matches||!width||!height)return;
    const box=root.getBoundingClientRect();
    field?.pointer((e.clientX-box.left)*width/box.width,(e.clientY-box.top)*height/box.height,time,click);
  }
  root.addEventListener('pointermove',e=>point(e,false),listen);
  root.addEventListener('pointerleave',()=>field?.leave(),listen);
  root.addEventListener('pointerdown',e=>point(e,true),listen);
  document.addEventListener('visibilitychange',schedule,listen);
  preference.addEventListener('change',()=>{age=Infinity;paint();schedule();},listen);
  window.addEventListener('resize',()=>resize(),listen);
  resize();
  return {
    update(patch:Partial<FieldSettings>){settings=resolveSettings(patch,settings);root.style.background=settings.background;resize(true);return {...settings};},
    pause(){paused=true;stop();},
    resume(){paused=false;schedule();},
    destroy(){disposed=true;stop();events.abort();observer.disconnect();viewport.disconnect();root.remove();}
  };
}
