import {glyphs,type IslandIcon} from './icons';
import manifest from '../../component.json';

export interface Settings {
  labels:string[]; destinations:string[]; icons:IslandIcon[]; compactOnScroll:boolean; hoverDwell:number;
  placement:'top'|'bottom'; alignment:'start'|'center'|'end';
  radius:number; iconSize:number; menuWidth:number; blur:number; darkOpacity:number; lightOpacity:number; rim:number;
  breakpoint:number; compactDistance:number; darkAccent:string; lightAccent:string; darkCanvas:string; lightCanvas:string;
  topOffset:number; surface:string; lightSurface:string; headingColor:string; showBadge:boolean; badgeLabel:string; badgeHref:string;
}
export const defaults=Object.fromEntries(manifest.settings.map(field=>[field.key,field.default])) as unknown as Settings;
function url(value:unknown,fallback:string):string {
  if(typeof value!=='string'||value.length>512||/[\\\u0000-\u001f]/.test(value)||value.startsWith('//'))return fallback;
  if(/^(?:#[\w-]+|\/(?!\/)|https?:\/\/)/i.test(value))return value;
  return fallback;
}
const text=(value:unknown,fallback:string,length:number)=>typeof value==='string'&&value.trim()&&value.trim().length<=length?value.trim():fallback;
const color=(value:unknown,fallback:string)=>typeof value==='string'&&/^#[\da-f]{6}$/i.test(value)?value:fallback;
function number(value:unknown,fallback:number,min:number,max:number){return typeof value==='number'&&Number.isFinite(value)?Math.round(Math.min(max,Math.max(min,value))):fallback;}
export function resolveSettings(input:unknown={}):Settings {
  const a=input&&typeof input==='object'?input as Record<string,unknown>:{};
  const labels=Array.isArray(a.labels)&&a.labels.length>=2&&a.labels.length<=12&&a.labels.every(v=>typeof v==='string'&&v.trim()&&v.trim().length<=60)?a.labels.map(v=>v.trim()):[...defaults.labels];
  const targets=Array.isArray(a.destinations)?a.destinations:defaults.destinations;
  const icons=Array.isArray(a.icons)?a.icons:[];
  return {labels,icons:labels.map((_,i)=>typeof icons[i]==='string'&&Object.hasOwn(glyphs,icons[i])?icons[i] as IslandIcon:defaults.icons[i]??'Grid'),destinations:labels.map((_,i)=>url(targets[i],defaults.destinations[i]??'#section-'+(i+1))),
    placement:a.placement==='bottom'?'bottom':'top',
    alignment:a.alignment==='start'||a.alignment==='end'?a.alignment:'center',
    radius:number(a.radius,defaults.radius,8,32),
    iconSize:number(a.iconSize,defaults.iconSize,14,28),
    menuWidth:number(a.menuWidth,defaults.menuWidth,220,600),
    blur:number(a.blur,defaults.blur,0,48),
    darkOpacity:number(a.darkOpacity,defaults.darkOpacity,0,100),
    lightOpacity:number(a.lightOpacity,defaults.lightOpacity,0,100),
    rim:number(a.rim,defaults.rim,0,100),
    breakpoint:number(a.breakpoint,defaults.breakpoint,320,1024),
    compactDistance:number(a.compactDistance,defaults.compactDistance,0,600),
    darkAccent:color(a.darkAccent,defaults.darkAccent),
    lightAccent:color(a.lightAccent,defaults.lightAccent),
    darkCanvas:color(a.darkCanvas,defaults.darkCanvas),
    lightCanvas:color(a.lightCanvas,defaults.lightCanvas),
    compactOnScroll:typeof a.compactOnScroll==='boolean'?a.compactOnScroll:defaults.compactOnScroll,
    showBadge:typeof a.showBadge==='boolean'?a.showBadge:defaults.showBadge,
    topOffset:number(a.topOffset,defaults.topOffset,6,64),hoverDwell:number(a.hoverDwell,defaults.hoverDwell,0,400),
    surface:color(a.surface,defaults.surface),lightSurface:color(a.lightSurface,defaults.lightSurface),headingColor:color(a.headingColor,defaults.headingColor),
    badgeLabel:text(a.badgeLabel,defaults.badgeLabel,40),badgeHref:url(a.badgeHref,defaults.badgeHref)};
}
const esc=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const svg=(body:string)=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+body+'</svg>';
let instanceCount=0;
export function render(input:unknown={},id='dynamic-island'):string{
  const s=resolveSettings(input),prefix=esc(id.replace(/[^\w-]/g,'-'));
  const links=(panel:boolean)=>s.labels.map((label,i)=>{
    const href=s.destinations[i],fragment=href.startsWith('#');
    const target=fragment?'#'+prefix+'-'+i:esc(href);
    const attrs=fragment?'data-local=""':(/^https?:/i.test(href)?'target="_blank" rel="noopener noreferrer"':'');
    return '<a class="'+(panel?'din-row':'din-link')+'" data-index="'+i+'" href="'+target+'" '+attrs+' aria-label="'+esc(label)+'" '+(i===0?'aria-current="location"':'')+' style="--din-delay:'+(70+28*i)+'ms"><span class="din-icon">'+svg(glyphs[s.icons[i]])+'</span><span class="'+(panel?'din-row-name':'din-word')+'">'+esc(label)+'</span></a>';
  }).join('');
  const sections=s.labels.map((label,i)=>'<section class="din-section" id="'+prefix+'-'+i+'"><h'+(i?2:1)+'>'+esc(label)+'</h'+(i?2:1)+'></section>').join('');
  const badge=s.showBadge?'<a class="din-badge" aria-label="'+esc(s.badgeLabel)+'" href="'+esc(s.badgeHref)+'" target="_blank" rel="noopener noreferrer">'+svg('<path d="m4 17 6-12h4l6 12h-4l-4-8-4 8z"/>')+'<span class="din-badge-window" aria-hidden="true"><span class="din-badge-track"><span>'+esc(s.badgeLabel)+'</span><span>'+esc(s.badgeLabel)+'</span></span></span></a>':'';
  const variables=[
    `--din-top:${s.topOffset}px`,`--din-heading:${s.headingColor}`,`--din-dark:${s.surface}`,`--din-light:${s.lightSurface}`,
    `--din-radius:${s.radius}px`,`--din-icon-size:${s.iconSize}px`,`--din-blur:${s.blur}px`,`--din-rim:${s.rim/100}`,
    `--din-dark-opacity:${s.darkOpacity}%`,`--din-light-opacity:${s.lightOpacity}%`,`--din-align:${s.alignment}`,
    `--din-dark-accent:${s.darkAccent}`,`--din-light-accent:${s.lightAccent}`,`--din-dark-canvas:${s.darkCanvas}`,`--din-light-canvas:${s.lightCanvas}`
  ].join(';');
  return '<div class="din-scene" data-placement="'+s.placement+'" style="'+variables+'"><div class="din-scroll" tabindex="0" aria-label="Scrollable sections">'+sections+'</div><nav class="din-nav" aria-label="Section navigation"><div class="din-shell"><div class="din-clip"><div class="din-bar">'+links(false)+'<button type="button" class="din-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="'+prefix+'-panel" hidden><span class="din-current-name" aria-hidden="true">'+esc(s.labels[0])+'</span><span class="din-menu-icon" aria-hidden="true"></span><span class="din-more" aria-hidden="true">•••</span></button></div><div id="'+prefix+'-panel" class="din-panel" hidden>'+links(true)+'</div></div></div></nav>'+badge+'</div>';
}
type Spring={x:number;v:number};
const spring=(x:number):Spring=>({x,v:0});
function advance(s:Spring,target:number,dt:number,k=400,c=32){
  if(dt===0){s.x=target;s.v=0;return;}
  const n=Math.ceil(dt*240),step=dt/n;
  for(let i=0;i<n;i++){s.v+=(k*(target-s.x)-c*s.v)*step;s.x+=s.v*step;}
  if(Math.abs(s.x-target)<.002&&Math.abs(s.v)<.02){s.x=target;s.v=0;}
}
const clamp=(x:number)=>Math.min(1,Math.max(0,x));
function ease(x:number){const t=clamp((x-.3)/.7);return t*t*(3-2*t);}
export function mount(host:HTMLElement,input:unknown={},id='din-'+(++instanceCount)){
  const win=host.ownerDocument.defaultView!;
  let settings=resolveSettings(input),destroyed=false,paused=false,visible=true,dispose=()=>{},refresh=()=>{};
  const media=win.matchMedia?.('(prefers-reduced-motion: reduce)');
  function setup(){
    host.innerHTML=render(settings,id);
    const node=<T extends HTMLElement>(sel:string)=>host.querySelector<T>(sel)!;
    const scene=node('.din-scene'),scroll=node('.din-scroll'),nav=node('.din-nav'),shell=node('.din-shell'),toggle=node<HTMLButtonElement>('.din-toggle'),panel=node('.din-panel');
    const currentName=node('.din-current-name');
    const links=Array.from(host.querySelectorAll<HTMLAnchorElement>('.din-link')),rows=Array.from(host.querySelectorAll<HTMLAnchorElement>('.din-row')),words=links.map(a=>a.querySelector<HTMLElement>('.din-word')!);
    let tracked=0,reading=0,compact=false,open=false,mobile=false,forced=false,frame=0,last=0,scrollOrigin=0,openScroll=0,living=true;
    let dwell=0,stability=0,expander=0,restore=0;
    const visibility=links.map(()=>spring(1)),reveal=links.map((_,i)=>spring(i===0?1:0));
    const height=spring(52),width=spring(0);
    let extras:number[]=[];
    let swap:{old:number;next:number;progress:Spring}|null=null;
    const quiet=()=>paused||!visible||host.ownerDocument.hidden||!!media?.matches;
    const small=()=>mobile||(compact&&!forced);
    function draw(dt:number){
      const slim=small();let x=6,moving=false;
      if(swap&&(!slim||open))swap=null;
      const step=(s:Spring,t:number,k?:number,c?:number)=>{advance(s,t,dt,k,c);if(s.x!==t)moving=true;return s.x;};
      if(swap&&step(swap.progress,1,200,1.8*Math.sqrt(200))===1)swap=null;
      const blend=swap?clamp(swap.progress.x):1;
      links.forEach((a,i)=>{
        const show=!mobile&&!open&&(!slim||i===tracked),label=i===tracked||(!slim&&i===reading);
        const outgoing=swap?.old===i,incoming=swap?.next===i;
        const v=clamp(step(visibility[i],show?1:0)),r=clamp(step(reveal[i],label?1:0));
        const extent=swap&&incoming?extras[swap.old]+(extras[i]-extras[swap.old])*blend:extras[i];
        const w=outgoing?40+extras[i]:incoming?40+extent:v*(40+r*extent);
        const gap=i===links.length-1&&!slim?0:4*(incoming?1:v);
        a.style.width=w+'px';a.style.marginRight=gap+'px';a.style.opacity=String(v);
        a.style.transform='scale('+(0.55+0.45*v)+')';a.inert=!show;
        words[i].style.opacity=String(ease(r));words[i].style.transform='translateX('+(-6*(1-r))+'px)';words[i].style.filter=r>.01&&r<.985?'blur('+(3*(1-r))+'px)':'';
        a.style.position=outgoing?'absolute':'relative';
        a.style.left=outgoing?'6px':'';
        if(swap&&(outgoing||incoming)){
          const dir=Math.sign(swap.next-swap.old),c=outgoing?1-blend:blend;
          a.style.transform='translateY('+((outgoing?-dir:dir)*15.2*(1-c))+'px)';
          a.style.filter='blur('+(3*(1-c))+'px)';
          a.style.opacity=String(clamp((c-(outgoing?.5:.22))/(outgoing?.5:.63)));
          words[i].style.opacity='1';words[i].style.filter='';words[i].style.transform='';
        }else a.style.filter='';
        if(!outgoing)x+=w+gap;
        for(const el of [a,rows[i]]){if(i===tracked)el.setAttribute('aria-current','location');else el.removeAttribute('aria-current');}
      });
      if(currentName.textContent!==settings.labels[tracked])currentName.textContent=settings.labels[tracked];
      toggle.hidden=!slim&&!open;toggle.setAttribute('aria-label',mobile?settings.labels[tracked]+(open?' · Close navigation':' · Open navigation'):'Expand navigation');toggle.setAttribute('aria-expanded',String(open));
      panel.hidden=!open&&height.x<=52.01;panel.inert=!open;
      const goalWidth=open?Math.min(settings.menuWidth,nav.clientWidth):mobile?Math.min(nav.clientWidth,72+extras[tracked]):x+6+(slim?40:0);
      shell.style.width=step(width,goalWidth)+'px';shell.style.height=step(height,open?56+52*links.length:52)+'px';
      if(moving&&dt>0)frame=win.requestAnimationFrame(tick);
    }
    function tick(time:number){frame=0;const dt=Math.min(.05,Math.max(.001,(time-last)/1000));last=time;draw(quiet()?0:dt);}
    function paint(snap=false){
      scene.dataset.quiet=String(quiet());shell.dataset.open=String(open);shell.dataset.mobile=String(mobile);
      if(snap||quiet()||!win.requestAnimationFrame){if(frame)win.cancelAnimationFrame(frame);frame=0;draw(0);}
      else if(!frame){last=win.performance.now();frame=win.requestAnimationFrame(tick);}
    }
    function measure(){
      shell.dataset.measuring='true';
      extras=words.map(word=>Math.ceil(word.getBoundingClientRect().width)-4);
      delete shell.dataset.measuring;
      swap=null;mobile=scene.clientWidth<settings.breakpoint||12+44*links.length-4+[...extras].sort((a,b)=>b-a).slice(0,2).reduce((sum,value)=>sum+value,0)>nav.clientWidth+.5;if(!mobile)open=false;paint(true);}
    function close(focus=false){open=false;paint();if(focus)toggle.focus({preventScroll:true});}
    function reset(){win.clearTimeout(dwell);reading=tracked;paint();}
    const events=new win.AbortController();
    const on=(target:EventTarget,type:string,handler:EventListener)=>target.addEventListener(type,handler,{signal:events.signal});
    const indexOf=(e:Event)=>Number((e.target as Element).closest<HTMLElement>('[data-index]')?.dataset.index);
    on(shell,'pointerover',e=>{
      if((e as PointerEvent).pointerType==='touch')return;
      win.clearTimeout(restore);
      if((e.target as Element).closest('.din-toggle')&&compact&&!mobile){win.clearTimeout(expander);expander=win.setTimeout(()=>{forced=true;paint();},180);return;}
      const i=indexOf(e);if(!Number.isInteger(i)||small())return;win.clearTimeout(dwell);
      dwell=win.setTimeout(()=>{reading=i;paint();},settings.hoverDwell);
    });
    on(shell,'pointerleave',()=>{win.clearTimeout(expander);reset();restore=win.setTimeout(()=>{forced=false;paint();},260);});
    on(shell,'focusin',e=>{const i=indexOf(e);if(Number.isInteger(i)&&!small()&&(e.target as HTMLElement).matches(':focus-visible')){reading=i;paint();}});
    on(shell,'focusout',e=>{if(!shell.contains((e as FocusEvent).relatedTarget as Node))reset();});
    on(toggle,'click',()=>{if(mobile){open=!open;openScroll=scroll.scrollTop;if(open)panel.hidden=false;paint();}else{forced=true;paint();links[tracked].focus({preventScroll:true});}});
    on(nav,'click',e=>{const link=(e.target as Element).closest<HTMLAnchorElement>('[data-index]');if(!link)return;
      if(link.hasAttribute('data-local')&&!(e as MouseEvent).metaKey&&!(e as MouseEvent).ctrlKey){e.preventDefault();const i=Number(link.dataset.index);scroll.scrollTo?.({top:(scroll.children[i] as HTMLElement).offsetTop,behavior:quiet()?'instant':'smooth'});}
      if(open)close(true);
    });
    on(host.ownerDocument,'pointerdown',e=>{if(open&&!shell.contains(e.target as Node))close();});
    on(host.ownerDocument,'keydown',e=>{if(open&&(e as KeyboardEvent).key==='Escape'){e.preventDefault();close(true);}});
    let candidate=0;
    on(scroll,'scroll',()=>{
      const y=scroll.scrollTop,delta=y-scrollOrigin;
      if(y<=settings.compactDistance||Math.abs(delta)>10){compact=settings.compactOnScroll&&y>settings.compactDistance&&delta>0;forced=false;scrollOrigin=y;}
      if(open&&Math.abs(y-openScroll)>64)close();
      const h=scroll.clientHeight,nearest=h?Math.round(y/h):0;
      const eligible=Math.abs(y-nearest*h)<=h*.2&&nearest>=0&&nearest<links.length?nearest:-1;
      if(eligible!==candidate){
        candidate=eligible;win.clearTimeout(stability);
        if(eligible>=0&&eligible!==tracked)stability=win.setTimeout(()=>{
          if(!mobile&&small()&&!open&&!quiet())swap={old:tracked,next:eligible,progress:spring(0)};
          tracked=reading=eligible;paint();
        },140);
      }
      paint();
    });
    const resize=win.ResizeObserver?new win.ResizeObserver(measure):null;resize?.observe(scene);
    const observer=win.IntersectionObserver?new win.IntersectionObserver(entries=>{visible=entries[0].isIntersecting;paint(true);}):null;observer?.observe(scene);
    refresh=()=>paint(true);on(host.ownerDocument,'visibilitychange',refresh);media?.addEventListener?.('change',refresh);
    measure();host.ownerDocument.fonts?.ready.then(()=>{if(living)measure();});
    dispose=()=>{living=false;events.abort();resize?.disconnect();observer?.disconnect();media?.removeEventListener?.('change',refresh);
      if(frame)win.cancelAnimationFrame(frame);for(const timer of [dwell,stability,expander,restore])win.clearTimeout(timer);};
  }
  setup();
  return {update(next:unknown){if(destroyed)return;const s=resolveSettings(next);if(JSON.stringify(s)===JSON.stringify(settings))return;dispose();settings=s;setup();},
    pause(){if(!destroyed){paused=true;refresh();}},resume(){if(!destroyed){paused=false;refresh();}},
    destroy(){if(!destroyed){destroyed=true;dispose();host.replaceChildren();}}};
}
