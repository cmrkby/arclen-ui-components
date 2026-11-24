import {createField} from './gl';
import {palettes,resolveSettings,type Settings} from './settings';
export {defaults,resolveSettings,type Settings} from './settings';

const escape = (s:string) => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function style(s:Settings) {
  return ['--pf-bg:'+s.background,'--pf-radius:'+s.radius+'px',...palettes[s.palette].map((c,i)=>'--pf-c'+i+':'+c)].join(';');
}
export function render(input:unknown={}) {
  const s=resolveSettings(input);
  return `<div class="pf-stage" data-entrance="${s.entrance}" style="${style(s)}"><canvas aria-hidden="true"></canvas><p class="pf-caption">${escape(s.caption)}</p></div>`;
}

const mounted = new WeakMap<HTMLElement, {destroy(): void}>();

export function mount(host:HTMLElement,input:unknown={},_id?:string,options:{paused?:boolean}={}) {
  mounted.get(host)?.destroy();
  let s=resolveSettings(input);
  const doc=host.ownerDocument, win=doc.defaultView!;
  host.innerHTML=render(s);
  const stage=host.firstElementChild as HTMLElement;
  const canvas=stage.querySelector('canvas')!, caption=stage.querySelector('p')!;
  const media=win.matchMedia('(prefers-reduced-motion: reduce)');
  const listeners=new win.AbortController();
  const on={signal:listeners.signal};
  let field=createField(canvas);
  let phase=4,grainTime=0,frame=0,previous=0,visible=false,paused=!!options.paused,disposed=false;
  let x=0,y=0,strength=0,tx=0,ty=0,target=0;
  function paint() {
    field?.draw(phase,grainTime,x,y,strength);
    stage.dataset.renderer=field?'webgl':'fallback';
  }
  function tick(now:number) {
    frame=0;
    const dt=previous?Math.min(.05,(now-previous)/1000):0;
    previous=now;
    phase+=dt*s.speed;
    grainTime+=dt;
    x+=(tx-x)*(1-Math.exp(-3*dt));
    y+=(ty-y)*(1-Math.exp(-3*dt));
    strength+=(target-strength)*(1-Math.exp(-2.5*dt));
    paint();
    frame=win.requestAnimationFrame(tick);
  }
  function sync() {
    win.cancelAnimationFrame(frame);frame=0;previous=0;
    if(disposed || !visible || doc.hidden) return;
    paint();
    if(field && !paused && !media.matches) frame=win.requestAnimationFrame(tick);
  }
  function resize() {
    const dpr=Math.min(win.devicePixelRatio||1,1.25);
    const w=Math.max(1,Math.round(canvas.clientWidth*dpr)), h=Math.max(1,Math.round(canvas.clientHeight*dpr));
    if(canvas.width!==w || canvas.height!==h){canvas.width=w; canvas.height=h;}
    sync();
  }
  function configure() {
    field?.configure(s);
    caption.textContent=s.caption;
    stage.style.cssText=style(s);
    stage.dataset.entrance=String(s.entrance);
    if(!s.followPointer) target=0;
    resize();
  }
  stage.addEventListener('pointermove',event=>{
    if(!s.followPointer || media.matches) return;
    const rect=stage.getBoundingClientRect();
    tx=2*(event.clientX-rect.left-rect.width/2)/rect.height;
    ty=1-2*(event.clientY-rect.top)/rect.height;
    target=1;
  },on);
  for(const type of ['pointerleave','pointercancel']) stage.addEventListener(type,()=>{target=0;},on);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();field=null;stage.dataset.renderer='fallback';sync();},on);
  canvas.addEventListener('webglcontextrestored',()=>{field=createField(canvas);configure();},on);
  doc.addEventListener('visibilitychange',sync,on);
  media.addEventListener('change',sync,on);
  const size=new win.ResizeObserver(resize);size.observe(stage);
  const observer=new win.IntersectionObserver(([entry])=>{visible=entry.isIntersecting && entry.intersectionRatio>=.05;sync();},{threshold:[0,.05]});
  observer.observe(stage);
  configure();
  const api = {
    update(patch:unknown){if(!disposed){s=resolveSettings({...s,...(typeof patch==='object'?patch:{})});configure();}},
    pause(){paused=true;sync();},resume(){paused=false;sync();},
    destroy(){if(disposed)return; disposed=true;mounted.delete(host);sync();listeners.abort();observer.disconnect();size.disconnect();field?.release();stage.remove();},
  };
  mounted.set(host,api);
  return api;
}
