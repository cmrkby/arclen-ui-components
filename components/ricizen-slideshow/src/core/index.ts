import manifest from '../../component.json';
const redDustPoster = new URL('../../assets/red-dust-poster.png', import.meta.url).href;
const redDustStudio = new URL('../../assets/red-dust-studio.webp', import.meta.url).href;
const nightfireAction = new URL('../../assets/nightfire-action.webp', import.meta.url).href;
const nightfireStudio = new URL('../../assets/nightfire-studio.webp', import.meta.url).href;
const film = new URL('../../assets/red-dust.mp4', import.meta.url).href;

const posters=[redDustPoster,redDustStudio,nightfireAction,nightfireStudio];
const alts=['A helmeted rider carving through red dust on a downhill bike','Red Dust downhill bike in profile under warm studio light','Nightfire rider cornering on a floodlit forest trail','Nightfire downhill bike in profile against a dark studio backdrop'];
type Settings=Record<string,string|number|boolean>;
export const defaults:Settings=Object.fromEntries(manifest.settings.map(r=>[r.key,r.default]));
export function resolveSettings(input:unknown={}):Settings {
  const values=(input && typeof input==='object'?input:{}) as Settings;
  const result={...defaults};
  for(const r of manifest.settings){
    const v=values[r.key];
    if(r.kind==='number' && typeof v==='number' && Number.isFinite(v))result[r.key]=Math.max(r.min!,Math.min(r.max!,v));
    if(r.kind==='boolean' && typeof v==='boolean')result[r.key]=v;
    if(typeof v!=='string')continue;
    if(r.kind==='select' && r.options?.some(o=>o.value===v))result[r.key]=v;
    if(r.kind==='color' && /^#[\da-f]{6}$/i.test(v))result[r.key]=v;
    if(r.kind==='text'){
      if(r.key.endsWith('_href') && !/^(?:#|https?:\/\/)/i.test(v))continue;
      result[r.key]=v.slice(0,r.key.endsWith('_href')?2048:360);
    }
  }
  return result;
}
const esc=(v:unknown)=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const number=(i:number)=>String(i+1).padStart(2,'0');
const field=(s:Settings,i:number,k:string)=>String(s['s'+(i+1)+'_'+k]);
const arrow=(left=false)=>'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="'+(left?'M19 12H5m0 0 6 6m-6-6 6-6':'M5 12h14m0 0-6-6m6 6-6 6')+'"/></svg>';
function slideCopy(s:Settings,i:number){
  const f=(k:string)=>esc(field(s,i,k));
  return '<div class="rz-copy-motion"><p class="rz-eyebrow">'+f('eyebrow')+'</p><h1 class="rz-title">'+f('heading')+'</h1><p class="rz-description">'+f('description')+'</p><a class="rz-cta" href="'+f('href')+'">'+f('action')+arrow()+'</a></div>';
}
function marquee(s:Settings,i:number){
  const word=esc(field(s,i,'marquee')),star='<em>✳</em>';
  const run='<span class="rz-marquee-copy">'+word+' '+star+' '+word+' '+star+'</span>';
  return '<div class="rz-marquee-track">'+run+run+'</div>';
}
const hint=(i:number)=>i===0?'Play video':'Expand image';
function media(i:number){
  const layers=posters.map((src,j)=>`<img class="rz-photo" src="${esc(src)}" alt="${alts[j]}" aria-hidden="${i!==j}" data-current="${i===j}" draggable="false">`).join('');
  return '<span class="rz-photos">'+layers+'</span><video class="rz-slide-video" muted loop playsinline preload="metadata" poster="'+esc(redDustPoster)+'" src="'+esc(film)+'"></video>'+
    '<span class="rz-image-hint"><b>↗</b><span>'+hint(i)+'</span></span><span class="rz-close-hint" aria-hidden="true">×　Back to story</span>';
}
function rail(s:Settings,active:number){
  return posters.map((src,i)=>'<button type="button" class="rz-thumb'+(active===i?' rz-thumb-active':'')+'" data-slide="'+i+'" aria-pressed="'+(active===i)+'" aria-label="Show slide '+(i+1)+': '+esc(field(s,i,'heading'))+'"><img src="'+esc(src)+'" alt="" draggable="false"><span class="rz-thumb-index">'+number(i)+'</span></button>').join('');
}
function controlShadow(strength:number) {
  if (strength === 0) return 'none';
  const scale = strength / 100;
  return `0 1px 1px rgb(0 0 0 / ${0.24 * scale}), inset 0 1px 0 rgb(255 255 255 / ${0.06 * scale}), inset 0 0 0 1px rgb(255 255 255 / ${0.04 * scale})`;
}
function style(s:Settings,i:number){
  return {
    '--rz-headline-weight':String(s.headlineWeight), '--rz-photo-border':s.photoBorder+'%',
    '--rz-pill-size':s.pillSize+'px', '--rz-pill-radius':s.pillRadius+'px', '--rz-pill-shadow':controlShadow(Number(s.pillShadow)),
    '--rz-arrow-size':s.arrowSize+'px', '--rz-arrow-radius':s.arrowRadius+'px', '--rz-arrow-shadow':controlShadow(Number(s.arrowShadow)),
    '--rz-shell-scale':String(Number(s.shellSize)/100), '--rz-shell-radius':s.shellRadius+'px', '--rz-shell-shadow':controlShadow(Number(s.shellShadow)),
    '--rz-backplate-strength':String(Number(s.backplateStrength)/100),'--rz-font':s.font==='geist'?'RicizenGeist':'RicizenInter','--rz-bg':field(s,i,'background'),'--rz-accent':String(s.accent),'--rz-speed':s.marquee+'s','--rz-autoplay':s.interval+'s','--rz-radius':s.radius+'px','--rz-unit':1/Number(s.speed)+'ms'};
}
export function render(input:unknown={}) {
  const s=resolveSettings(input),i=Number(s.initial)-1;
  const css=Object.entries(style(s,i)).map(([k,v])=>k+':'+v).join(';');
  return `<div class="rz-host" data-framing="${s.framing}"><div class="rz-root" style="${css}" role="region" aria-roledescription="carousel" aria-label="Campaign hero slideshow" tabindex="0" data-expanded="false">
    <div class="rz-backplate" aria-hidden="true">
      ${posters.map((src,j)=>`<img src="${esc(src)}" alt="" draggable="false" data-current="${i===j}">`).join('')}
    </div>
    <div class="rz-marquee" aria-hidden="true">${marquee(s,i)}</div>
    <button type="button" class="rz-image${i===0?' rz-has-video':''}" aria-pressed="false" aria-label="${hint(i)}: ${alts[i]}">${media(i)}</button>
    <div class="rz-copy" aria-live="polite">${slideCopy(s,i)}</div>
    <div class="rz-nav"><div class="rz-arrows"><button class="rz-arrow" data-step="-1" type="button" aria-label="Previous slide">${arrow(true)}</button><button class="rz-arrow" data-step="1" type="button" aria-label="Next slide">${arrow()}</button></div><div class="rz-thumbs" role="group" aria-label="Choose a slide">${rail(s,i)}</div></div>
    <div class="rz-bottom-note" aria-hidden="true">Scroll the story · <span>${number(i)}</span> / 04</div><div class="rz-grain" aria-hidden="true"></div>
  </div></div>`;
}

export function mount(host:HTMLElement,input:unknown={},_id?:string,options:{paused?:boolean}={}){
  let s=resolveSettings(input),index=Number(s.initial)-1,expanded=false,paused=!!options.paused;
  host.innerHTML=render(s);
  const root=host.querySelector<HTMLElement>('.rz-root')!,frame=root.parentElement!;
  const win=host.ownerDocument.defaultView!, events=new win.AbortController(),listen={signal:events.signal};
  const q=<T extends HTMLElement=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
  const face=q<HTMLButtonElement>('.rz-image'),copy=q('.rz-copy'),nav=q('.rz-nav');
  const plates=root.querySelectorAll<HTMLImageElement>('.rz-backplate img');
  const photos=face.querySelectorAll<HTMLImageElement>('.rz-photo');
  const thumbs=Array.from(root.querySelectorAll<HTMLButtonElement>('.rz-thumb'));
  const reduced=win.matchMedia('(prefers-reduced-motion:reduce)');
  let alarm=0,hover=root.matches(':hover'),suppressUntil=0;
  let gesture:{id:number;x:number;y:number}|null=null;
  function schedule(){
    win.clearTimeout(alarm);
    if(s.autoplay && !paused && !expanded && !hover && !reduced.matches && !host.ownerDocument.hidden)
      alarm=win.setTimeout(()=>go(index+1),Number(s.interval)*1000);
  }
  function expand(on:boolean){
    expanded=on;
    root.dataset.expanded=String(on);
    face.classList.toggle('rz-expanded',on);
    face.setAttribute('aria-pressed',String(on));
    face.setAttribute('aria-label',on?'Back to story':hint(index)+': '+alts[index]);
    copy.inert=on;nav.inert=on;
    const video=face.querySelector('video');
    if(video && index===0){
      if(on){
        video.currentTime=0;
        if(!paused)void video.play().catch(()=>{});
      }else{
        video.pause();video.currentTime=0;
        video.classList.remove('rz-slide-video-visible');
        
      }
    }
    schedule();
  }
  let marqueeText=field(s,index,'marquee');
  function updatePresentation(){
    frame.dataset.framing=String(s.framing);
    for(const [k,v] of Object.entries(style(s,index)))root.style.setProperty(k,v);
    const nextMarquee=field(s,index,'marquee');
    if(marqueeText!==nextMarquee){q('.rz-marquee').innerHTML=marquee(s,index);marqueeText=nextMarquee;}
    copy.innerHTML=slideCopy(s,index);
    for(const [i,thumb] of thumbs.entries()){
      thumb.classList.toggle('rz-thumb-active',i===index);
      thumb.setAttribute('aria-pressed',String(i===index));
      thumb.setAttribute('aria-label','Show slide '+(i+1)+': '+field(s,i,'heading'));
    }
  }
  function go(next:number){
    const i=(next+posters.length)%posters.length;
    if(i===index)return;
    if(expanded)expand(false);
    const previous=index;index=i;
    plates[previous].dataset.current='false';
    plates[i].dataset.current='true';
    const incoming=photos[i], outgoing=photos[previous];
    const opacity=Number(win.getComputedStyle(incoming).opacity);
    const direction=Math.sign(next-previous);
    // If the user reverses mid-fade, resume from the visible framing.
    const from=opacity>0.01?win.getComputedStyle(incoming).transform:
      `translateX(${direction*2.5}%) scale(1.065)`;
    incoming.getAnimations().filter(a=>a.id==='rz-reframe').forEach(a=>a.cancel());
    outgoing.dataset.current='false';
    outgoing.setAttribute('aria-hidden','true');
    incoming.dataset.current='true';
    incoming.setAttribute('aria-hidden','false');
    if(!paused && !reduced.matches){
      incoming.animate([{transform:from},{transform:'none'}],{
        id:'rz-reframe',duration:720/Number(s.speed),easing:'cubic-bezier(.18,.74,.22,1)'
      });
    }
    q('.rz-image-hint span').textContent=hint(i);
    face.classList.toggle('rz-has-video',i===0);
    face.setAttribute('aria-label',hint(i)+': '+alts[i]);
    updatePresentation();
    q('.rz-bottom-note span').textContent=number(i);
    schedule();
  }
  root.addEventListener('click',e=>{
    if(win.performance.now()<suppressUntil){e.preventDefault();return;}
    const el=e.target as Element,button=el.closest('button');
    if(el.closest('.rz-cta') && field(s,index,'href')==='#'){
      e.preventDefault();expand(true);face.focus({preventScroll:true});
    }else if(button===face)expand(!expanded);
    else if(button?.dataset.slide!==undefined)go(Number(button.dataset.slide));
    else if(button?.dataset.step)go(index+Number(button.dataset.step));
  },listen);
  root.addEventListener('playing',e=>{
    const video=face.querySelector('video');
    if(expanded && video && e.target===video){
      video.classList.add('rz-slide-video-visible');
    }
  },{...listen,capture:true});
  root.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
      e.preventDefault();go(index+(e.key==='ArrowLeft'?-1:1));
    }else if(e.key==='Escape' && expanded){e.preventDefault();e.stopPropagation();expand(false);face.focus({preventScroll:true});}
  },listen);
  root.addEventListener('pointerdown',e=>{
    if(!e.isPrimary || e.button!==0 || (e.target as Element).closest('.rz-nav,.rz-cta'))return;
    gesture={id:e.pointerId,x:e.clientX,y:e.clientY};
  },listen);
  win.addEventListener('pointerup',e=>{
    if(gesture?.id!==e.pointerId)return;
    const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture=null;
    if(Math.abs(dx)>=52 && Math.abs(dx)>=1.15*Math.abs(dy)){go(index+(dx<0?1:-1));suppressUntil=win.performance.now()+420;}
  },listen);
  win.addEventListener('pointercancel',()=>{gesture=null;},listen);
  root.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'){hover=true;schedule();}},listen);
  root.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch'){hover=false;schedule();}},listen);
  function settlePhotos(){
    for(const photo of photos)photo.getAnimations().filter(a=>a.id==='rz-reframe').forEach(a=>a.cancel());
  }
  reduced.addEventListener('change',()=>{if(reduced.matches)settlePhotos();schedule();},listen);
  host.ownerDocument.addEventListener('visibilitychange',schedule,listen);
  function setPaused(value:boolean){
    paused=value;root.dataset.paused=String(value);
    const video=face.querySelector('video');
    if(value){settlePhotos();video?.pause();}else if(expanded && index===0 && video)void video.play().catch(()=>{});
    schedule();
  }
  setPaused(paused);
  return {update(patch:Settings){
    const next=resolveSettings({...s,...patch}),reset=next.initial!==s.initial;
    const changed=Object.keys(next).filter(k=>next[k]!==s[k]);
    if(!changed.length)return;
    s=next;
    if(changed.every(k=>k==='backplateStrength' || k==='photoBorder' || k==='headlineWeight' || /^(pill|arrow|shell)(Size|Radius|Shadow)$/.test(k))){
      for(const [key,value] of Object.entries(style(s,index))) root.style.setProperty(key,value);
      return;
    }
    if(reset && Number(s.initial)-1!==index)go(Number(s.initial)-1);
    else {updatePresentation();schedule();}
  },pause:()=>setPaused(true),resume:()=>setPaused(false),destroy(){
    events.abort();win.clearTimeout(alarm);face.querySelector('video')?.pause();frame.remove();
  }};
}
