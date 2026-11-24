import { items } from './content';
import { defaults, resolveSettings, type Settings } from './settings';
export { defaults, resolveSettings };

const html = (value: string) => String(value).replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]!));
// Choose an ink colour that stays legible when a panel colour is edited.
function inkFor(hex: string) {
  const channels = [1, 3, 5].map(i => {
    const srgb = parseInt(hex.slice(i, i + 2), 16) / 255;
    return srgb <= .04045 ? srgb / 12.92 : ((srgb + .055) / 1.055) ** 2.4;
  });
  const luminance = .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
  return luminance > .179 ? '#101010' : '#ffffff';
}
const clamp = (value: number, lo=0, hi=1) => Math.min(hi, Math.max(lo, value));
const mix = (a:number,b:number,t:number) => a+(b-a)*t;
function fade(start:number,end:number,value:number) {
  const t=clamp((value-start)/(end-start));
  return t*t*(3-2*t);
}
let nextId=0;
const instances=new WeakMap<HTMLElement,{destroy():void}>();
const icon=(paths:string)=>'<svg class="aa-glyph" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+paths+'</svg>';
const plus=icon('<path d="M5 12h14"/><path d="M12 5v14"/>');
const playback=icon('<path class="aa-pause-icon" d="M9 5v14m6-14v14"/><path class="aa-play-icon" d="m8 5 11 7-11 7z"/>');
const progress='<svg class="aa-progress" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><circle class="aa-ring-progress" cx="16" cy="16" r="15" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" transform="rotate(-90 16 16)"/></svg>';

type Item = typeof items[number];

function panelSurface(item: Item, settings: Settings) {
  return settings.theme === 'light' ? settings[`${item.id}LightColor`] : settings[item.colourKey];
}
function barSurface(settings: Settings) {
  return settings.theme === 'light' ? settings.lightCoverColor : settings.coverColor;
}
function artwork(item: Item, settings: Settings) {
  const silver = settings.finish === 'silver' || (settings.finish === 'theme' && settings.theme === 'light');
  return silver ? item.silver : item.image;
}
function sceneStyles(s: Settings): Record<string,string> {
  return {
    '--aa-gap': s.gap+'px', '--aa-radius': s.radius+'px', '--aa-plate-opacity': String(s.backplateStrength/100),
    '--aa-cover': barSurface(s), '--aa-cover-ink': inkFor(barSurface(s)), '--aa-max-width': s.maxWidth+'px',
    '--aa-rim': String(s.rim/100), '--aa-title-size': s.titleSize+'px', '--aa-body-size': s.bodySize+'px',
    '--aa-leading': String(s.lineHeight), '--aa-button-size': s.buttonSize+'px', '--aa-glyph-size':s.glyphSize+'px',
    '--aa-divider':String(s.divider/100), '--aa-shadow':String(s.artShadow/100)
  };
}

export function render(input:unknown={}, instanceId='aa-'+(++nextId)) {
  const settings=resolveSettings(input);
  const cards=items.map((item,i)=>{
    const open=i===Number(settings.initialItem)-1;
    const id=html(instanceId)+'-'+i;
    return `<article class="aa-card" data-open="${open}" style="--aa-tone:${panelSurface(item,settings)};--aa-ink:${inkFor(panelSurface(item,settings))}">
      <div class="aa-tone" aria-hidden="true"></div>
      <h3 class="aa-heading"><button class="aa-trigger" type="button" id="${id}-trigger" aria-controls="${id}-region" aria-expanded="${open}"><span class="aa-index" aria-hidden="true">0${i+1}</span><span class="aa-title">${html(settings[`${item.id}Title`])}</span><span class="aa-thumb-space" aria-hidden="true"></span><span class="aa-end-space" aria-hidden="true"></span></button></h3>
      <span class="aa-mark" aria-hidden="true"><span class="aa-plus aa-control-face">${plus}</span></span>
      <div class="aa-region" id="${id}-region" role="region" aria-labelledby="${id}-trigger" aria-hidden="${!open}" ${open?'':'inert'}><a class="aa-link" href="${html(settings[`${item.id}Url`])}" target="_blank" rel="noopener noreferrer" tabindex="${open?0:-1}"><div class="aa-art-slot"></div><div class="aa-copy"><p>${html(settings[`${item.id}Description`])}</p><div class="aa-ticket"><span class="aa-ticket-label">${html(settings[`${item.id}Action`])}</span></div></div></a></div>
      <div class="aa-art-clip"><div class="aa-art"><img src="${html(artwork(item,settings))}" alt="${html(item.alt)}" draggable="false"></div></div>
    </article>`;
  }).join('');
  return `<section class="aa-scene" data-theme="${settings.theme}" data-light-bar="${inkFor(barSurface(settings))!=='#ffffff'}" style="${Object.entries(sceneStyles(settings)).map(([key,value])=>key+':'+value).join(';')}" aria-label="Workspace connections"><div class="aa-viewport"><div class="aa-track">${cards}<button class="aa-timer" type="button" aria-label="Pause autoplay"><span class="aa-control-face">${playback}${progress}</span></button></div></div></section>`;
}

// Subdivide spring integration so the same handoff survives low frame rates and retargets.
class Spring {
  velocity=0;
  goal:number;
  constructor(public value:number, private stiffness=260, private damping=34){this.goal=value;}
  snap(){this.value=this.goal;this.velocity=0;}
  step(dt:number){
    if(this.value===this.goal && this.velocity===0)return false;
    const steps=Math.ceil(dt*240);
    for(let i=0;i<steps;i++){
      const h=dt/steps;
      this.velocity+=(this.stiffness*(this.goal-this.value)-this.damping*this.velocity)*h;
      this.value+=this.velocity*h;
    }
    if(Math.abs(this.value-this.goal)<.0001 && Math.abs(this.velocity)<.001)this.snap();
    return this.value!==this.goal || this.velocity!==0;
  }
}

export function mount(host:HTMLElement, input:unknown={}, instanceId?:string, options:{paused?:boolean}={}) {
  instances.get(host)?.destroy();
  const doc=host.ownerDocument, win=doc.defaultView!;
  let settings=resolveSettings(input), active=Number(settings.initialItem)-1;
  host.innerHTML=render(settings,instanceId);
  const scene=host.querySelector<HTMLElement>('.aa-scene')!;
  const viewport=scene.querySelector<HTMLElement>('.aa-viewport')!;
  const track=scene.querySelector<HTMLElement>('.aa-track')!;
  const control=track.querySelector<HTMLButtonElement>('.aa-timer')!;
  const ring=control.querySelector<SVGCircleElement>('.aa-ring-progress')!;
  const cards=Array.from(track.querySelectorAll<HTMLElement>('.aa-card'),(el,i)=>{
    const get=<T extends HTMLElement=HTMLElement>(s:string)=>el.querySelector<T>(s)!;
    return {el,trigger:get<HTMLButtonElement>('.aa-trigger'),region:get('.aa-region'),link:get<HTMLAnchorElement>('.aa-link'),
      clip:get('.aa-art-clip'),art:get('.aa-art'),image:get<HTMLImageElement>('img'),copy:get('.aa-copy'),paragraph:get('p'),ticket:get('.aa-ticket'),action:get('.aa-ticket-label'),title:get('.aa-title'),
      tone:get('.aa-tone'),plus:get('.aa-plus'),openness:new Spring(i===active?1:0),dimension:new Spring(0),
      engagement:new Spring(0,90,21),dx:new Spring(0,180,27),dy:new Spring(0,180,27),head:96,slot:220,side:220,linesHeight:50};
  });
  const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
  const fine=win.matchMedia('(hover: hover) and (pointer: fine)');
  const ac=new win.AbortController(), listener={signal:ac.signal};
  let width=0,row=false,rowHeight=520,pad=24,copyWidth=400;
  let measureFrame=0,frame=0,previous=0,elapsed=0,phase=0,dead=false,inView=true,timerVisible=true,settled=true,bringIntoView=false;
  let inside=false,pointerResume=false,manualPause=false,hostPause=!!options.paused;
  let hoverIndex=-1,focusIndex=-1,hoverTimer=0,hoverOpened=-1,hoverAt=-Infinity,scrollAt=-Infinity;

  function schedule(){if(!dead&&!frame&&!doc.hidden&&inView)frame=win.requestAnimationFrame(tick);}
  function cancelHover(){win.clearTimeout(hoverTimer);hoverTimer=0;}
  function targets(jump:boolean){
    const available=Number(track.style.width.slice(0,-2));
    const closedRow=(available-(cards.length-1)*settings.gap)/cards.length;
    cards.forEach((c,i)=>{
      const open=i===active;
      c.openness.goal=open?1:0;
      if(row)c.dimension.goal=active<0?closedRow:open?112+copyWidth+2*pad:112;
      else c.dimension.goal=c.head+(open?2*pad+c.slot+c.linesHeight+c.ticket.offsetHeight+20:0);
      if(jump){c.openness.snap();c.dimension.snap();}
      c.el.dataset.open=String(open);
      c.trigger.setAttribute('aria-expanded',String(open));
      c.region.setAttribute('aria-hidden',String(!open));
      c.region.inert=!open;c.link.tabIndex=open?0:-1;
    });
    settled=jump;schedule();
  }
  function layout(estimate=false){
    if(dead)return;
    const w=viewport.clientWidth;
    if(w<=0)return;
    const orientation=w>=820;
    const jump=width===0 || orientation!==row || reduced.matches;
    width=w;row=orientation;pad=w<600?Math.max(10,settings.padding-4):settings.padding;
    scene.dataset.layout=row?'row':'stack';scene.dataset.compact=String(w<600);scene.dataset.thin=String(w<340);
    const trackWidth=row?Math.max(w,4*(112+settings.gap)+442):w;
    const bodyWidth=row?trackWidth-5*112-4*settings.gap:w;
    copyWidth=bodyWidth-2*pad;
    track.style.width=trackWidth+'px';
    scene.style.setProperty('--aa-body-width',bodyWidth+'px');
    scene.style.setProperty('--aa-pad',pad+'px');
    rowHeight=settings.panelHeight;
    for(const c of cards){
      c.el.style.width=row?(c.dimension.value||112)+'px':w+'px';
      c.head=row?96:Math.max(96,c.title.offsetHeight+2*pad);
      c.el.style.setProperty('--aa-head',c.head+'px');
      c.linesHeight=estimate?(row?50:25):c.paragraph.offsetHeight;
      if(row) rowHeight=Math.max(rowHeight,2*pad+c.linesHeight+c.ticket.offsetHeight+20+220,94+c.title.offsetHeight+200);
    }
    for(const c of cards){
      c.slot=row?Math.max(220,rowHeight-2*pad-c.linesHeight-c.ticket.offsetHeight-20):clamp(.98*copyWidth,180,390);
      c.side=Math.max(1,Math.min(copyWidth,c.slot));
      c.el.style.setProperty('--aa-art-slot',c.slot+'px');
      if(row)c.el.style.height=rowHeight+'px';
      c.art.style.width=c.art.style.height=c.side+'px';
    }
    targets(jump);paint();
  }
  function applySettings(){
    scene.dataset.theme = settings.theme;
    scene.dataset.lightBar = String(inkFor(barSurface(settings)) !== '#ffffff');
    for (const [key,value] of Object.entries(sceneStyles(settings))) scene.style.setProperty(key,value);
    for (const [i,card] of cards.entries()) {
      const item = items[i];
      card.title.textContent = settings[`${item.id}Title`];
      card.paragraph.textContent = settings[`${item.id}Description`];
      card.action.textContent = settings[`${item.id}Action`];
      card.link.href = settings[`${item.id}Url`];
      const surface = panelSurface(item,settings);
      card.el.style.setProperty('--aa-tone',surface);
      card.el.style.setProperty('--aa-ink',inkFor(surface));
      const src = artwork(item,settings);
      if (card.image.getAttribute('src') !== src) card.image.src = src;
    }
  }
  function paint(drawCards=true){
    let offset=0;
    const wave=Math.sin(phase);
    if(drawCards)for(const [i,c] of cards.entries()){
      const u=clamp(c.openness.value);
      if(row)c.el.style.width=c.dimension.value+'px';else c.el.style.height=c.dimension.value+'px';
      c.tone.style.opacity=String(fade(0,1,u));
      c.copy.style.opacity=String(focusIndex===i && doc.activeElement===c.link?1:fade(.3,.92,u));
      const glyph=fade(.18,.92,u);
      c.plus.style.opacity=String(1-glyph);
      const gate=fade(.2,.95,u),g=c.engagement.value*gate*settings.hoverMotion/100;
      const closedX=row?98:width-pad-58,closedY=row?rowHeight-65:c.head/2;
      const x=mix(closedX,(row?112:0)+pad+copyWidth/2,u)+.65*wave*g+c.dx.value*gate*settings.hoverMotion/100 + settings[`${items[i].id}X`]*copyWidth*u/100;
      const y=mix(closedY,(row?0:c.head)+pad+c.slot/2,u)+(-5+1.4*wave)*g+c.dy.value*gate*settings.hoverMotion/100 + settings[`${items[i].id}Y`]*c.slot*u/100;
      const size=mix(row?Math.min(230,.74*c.side):48,.94*c.side,u)*settings.artScale*settings[items[i].scaleKey];
      const angle=([-.8,.7,-.65,.9,-.8][i]+.24*wave)*g+clamp(.16*c.dx.value,-.6,.6)*gate*settings.hoverMotion/100;
      const clipTop = row ? 0 : c.head*u;
      const clipBottom = Math.max(0,c.dimension.value-(c.head+pad+c.slot));
      const bottomInset = row ? rowHeight-pad-c.slot : clipBottom;
      c.clip.style.clipPath = `inset(${clipTop}px 0 ${bottomInset*u}px ${row?112*u:0}px)`;
      c.art.style.transform=`translate(${x-c.side/2}px,${y-c.side/2}px) rotate(${angle}deg) scale(${size/c.side*(1+.022*g)})`;
      c.art.style.opacity=String(width<340?fade(.1,.8,u):1);
      if(i===active){
        control.style.left=(row?offset+56:width-pad-33)+'px';
        control.style.top=(row?18:offset+c.head/2-22)+'px';
        control.style.opacity=String(glyph);
      }
      offset+=c.dimension.value+settings.gap;
    }
    control.hidden=active<0 || reduced.matches || !settings.autoPlay;
    const paused=manualPause||hostPause;
    control.dataset.paused=String(paused);
    control.disabled=hostPause;
    control.setAttribute('aria-label',paused?'Resume autoplay':'Pause autoplay');
    ring.style.strokeDashoffset=String(1-clamp(elapsed/(settings.interval*1000)));
  }
  function select(index:number){
    if(index===active)return;
    if(active>=0&&doc.activeElement===cards[active].link)cards[active].trigger.focus({preventScroll:true});
    active=index;elapsed=0;bringIntoView=row&&index>=0;
    if(index<0)manualPause=true;
    targets(reduced.matches);paint();
  }
  function tick(now:number){
    frame=0;
    if(!inView||dead||doc.hidden){previous=0;return;}
    const ms=previous?now-previous:0;previous=now;
    const dt=Math.min(ms/1000,.08)*settings.motionSpeed;
    let moving=false,artMoving=false;
    for(const [i,c] of cards.entries()){
      c.engagement.goal=settings.hoverMotion>0 && !reduced.matches && timerVisible && i===active && (i===hoverIndex||i===focusIndex)?1:0;
      for(const spring of [c.openness,c.dimension]){if(reduced.matches)spring.snap();else if(spring.step(dt))moving=true;}
      for(const spring of [c.engagement,c.dx,c.dy]){if(reduced.matches)spring.snap();else if(spring.step(dt))artMoving=true;}
      if(c.engagement.value>.001&&!reduced.matches)artMoving=true;
    }
    if(artMoving)phase=(phase+dt*2*Math.PI/6.8)%(2*Math.PI);
    const redraw=moving||artMoving||!settled;
    const advancing=timerVisible && !moving && settled && settings.autoPlay && !manualPause && !hostPause && active>=0 && !reduced.matches && (!inside||pointerResume);
    if(advancing)elapsed+=ms;
    settled=!moving;
    if(settled&&bringIntoView&&active>=0){
      bringIntoView=false;
      const card=cards[active].el;
      const left=card.offsetLeft, right=left+card.offsetWidth;
      if(left<viewport.scrollLeft || right>viewport.scrollLeft+width){
        viewport.scrollTo({left:left<viewport.scrollLeft?left:right-width,behavior:reduced.matches?'instant':'smooth'});
      }
    }
    paint(redraw);
    if(elapsed>=settings.interval*1000 && advancing)select((active+1)%cards.length);
    if(moving||artMoving||advancing||(timerVisible&&!manualPause&&!hostPause&&settings.autoPlay&&active>=0&&!reduced.matches&&(!inside||pointerResume)))schedule();
    else previous=0;
  }
  function setHovered(i:number){hoverIndex=i;for(const c of cards){c.dx.goal=0;c.dy.goal=0;}schedule();}
  function activate(i:number,keyboard:boolean){
    if(!keyboard && active===i && hoverOpened===i && win.performance.now()-hoverAt<650)return;
    select(active===i?-1:i);
  }
  for(const [i,c] of cards.entries()){
    let anchorX=0,anchorY=0;
    c.trigger.addEventListener('click',e=>activate(i,e.detail===0),listener);
    c.trigger.addEventListener('keydown',e=>{
      let next=i;
      if(e.key==='Home')next=0;else if(e.key==='End')next=cards.length-1;
      else if(e.key==='ArrowDown'||(row&&e.key==='ArrowRight'))next=(i+1)%cards.length;
      else if(e.key==='ArrowUp'||(row&&e.key==='ArrowLeft'))next=(i+cards.length-1)%cards.length;
      else return;
      e.preventDefault();cards[next].trigger.focus();
    },listener);
    c.el.addEventListener('pointerenter',e=>{if(fine.matches&&e.pointerType!=='touch')setHovered(i);},listener);
    c.el.addEventListener('pointerleave',()=>{cancelHover();setHovered(-1);},listener);
    c.trigger.addEventListener('pointerenter',e=>{anchorX=e.clientX;anchorY=e.clientY;},listener);
    c.trigger.addEventListener('pointerleave',cancelHover,listener);
    c.trigger.addEventListener('pointermove',e=>{
      if(!fine.matches||e.pointerType==='touch'||e.buttons||i===active||hoverTimer||win.performance.now()-scrollAt<160)return;
      if(Math.abs(anchorX-e.clientX)+Math.abs(anchorY-e.clientY)<4)return;
      hoverTimer=win.setTimeout(()=>{
        hoverTimer=0;
        if(c.trigger.matches(':hover')&&!scene.querySelector('.aa-link:focus-visible')){
          select(i);hoverOpened=i;hoverAt=win.performance.now();
        }
      },settings.hoverDelay);
    },listener);
    c.link.addEventListener('pointermove',e=>{
      if(i!==active||!fine.matches||e.pointerType==='touch'||reduced.matches)return;
      const rect=c.link.getBoundingClientRect();
      c.dx.goal=4*clamp(2*(e.clientX-rect.left)/Math.max(1,rect.width)-1,-1,1);
      c.dy.goal=2.6*clamp(2*(e.clientY-rect.top)/Math.max(1,rect.height)-1,-1,1);
      schedule();
    },listener);
    c.link.addEventListener('pointerleave',()=>{c.dx.goal=c.dy.goal=0;schedule();},listener);
    c.el.addEventListener('focusin',e=>{
      if((e.target as HTMLElement).matches(':focus-visible')){focusIndex=i;manualPause=true;schedule();}
    },listener);
    c.el.addEventListener('focusout',()=>{focusIndex=-1;schedule();},listener);
  }
  track.addEventListener('pointerdown',e=>{cancelHover();if(e.pointerType==='touch'&&!control.contains(e.target as Node)){manualPause=true;schedule();}},listener);
  track.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'){inside=true;pointerResume=false;previous=0;schedule();}},listener);
  track.addEventListener('pointerleave',()=>{inside=false;pointerResume=false;previous=0;cancelHover();schedule();},listener);
  viewport.addEventListener('scroll',()=>{cancelHover();scrollAt=win.performance.now();},listener);
  win.addEventListener('scroll',cancelHover,{...listener,capture:true,passive:true});
  control.addEventListener('focusin',()=>{if(control.matches(':focus-visible')){manualPause=true;schedule();}},listener);
  control.addEventListener('click',()=>{
    manualPause=!manualPause;
    if(!manualPause)pointerResume=inside;
    previous=0;paint();schedule();
  },listener);
  function refreshVisibility(){
    win.cancelAnimationFrame(frame);frame=previous=0;schedule();
  }
  reduced.addEventListener('change',()=>{if(reduced.matches)for(const c of cards){c.engagement.goal=c.dx.goal=c.dy.goal=0;c.engagement.snap();c.dx.snap();c.dy.snap();}layout();},listener);
  doc.addEventListener('visibilitychange',refreshVisibility,listener);
  const observer=new win.IntersectionObserver(entries=>{
    const entry=entries[entries.length-1];
    inView=entry.isIntersecting;timerVisible=inView&&entry.intersectionRatio>=.25;
    refreshVisibility();
  },{threshold:[0,.25]});observer.observe(viewport);
  const resize=new win.ResizeObserver(()=>{if(viewport.clientWidth!==width)layout();});
  resize.observe(viewport);
  applySettings();layout(true);
  measureFrame=win.requestAnimationFrame(()=>{layout();void doc.fonts?.ready.then(()=>layout());});
  const api={
    update(patch:unknown){
      const old=settings;settings=resolveSettings({...old,...(typeof patch==='object'&&patch?patch:{})});
      if(settings.initialItem!==old.initialItem)select(Number(settings.initialItem)-1);
      if(settings.interval!==old.interval)elapsed=elapsed/old.interval*settings.interval;
      applySettings();layout();
    },
    pause(){hostPause=true;previous=0;paint();schedule();},
    resume(){hostPause=false;pointerResume=inside;previous=0;paint();schedule();},
    destroy(){
      if(dead)return;dead=true;cancelHover();win.cancelAnimationFrame(frame);win.cancelAnimationFrame(measureFrame);ac.abort();observer.disconnect();resize.disconnect();
      scene.remove();instances.delete(host);
    }
  };
  instances.set(host,api);return api;
}
