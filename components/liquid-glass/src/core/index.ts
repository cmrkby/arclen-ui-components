import manifest from '../../component.json';
import {createLens} from './lens';
import {recordPlayer} from './record';
import {resolveSettings,type Settings,type OpticalKey} from './settings';
export {defaults,resolveSettings,type Settings} from './settings';

const escapeText = (s:string) => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function render(input:unknown={}) {
  const s=resolveSettings(input);
  const sliders=manifest.settings.filter(r=>r.kind==='number' && r.group!=='Motion').map(r=>
    `<label><span>${r.label}</span><output>${s[r.key as OpticalKey]}</output><input aria-label="${r.label}" data-key="${r.key}" type="range" min="${r.min}" max="${r.max}" step="${r.step}" value="${s[r.key as OpticalKey]}"></label>`).join('');
  return `<div class="lg-scene" style="--lg-radius:${s.borderRadius}px"><canvas class="lg-record" aria-hidden="true"></canvas><video class="lg-video" muted playsinline loop preload="auto" crossorigin="anonymous" hidden></video><div class="lg-marker" aria-hidden="true"><canvas></canvas></div><div class="lg-foreground"><span class="lg-ring" aria-hidden="true" ${s.showRing?'':'hidden'}><i></i></span><p>${escapeText(s.caption)}</p></div><button type="button" class="lg-toggle" aria-label="Open controls" aria-expanded="false"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 7h5m4 0h7M4 17h9m4 0h3"/><circle cx="11" cy="7" r="2"/><circle cx="15" cy="17" r="2"/></svg></button><section class="lg-controls" aria-label="Lens controls" inert><strong>Lens controls</strong>${sliders}</section></div>`;
}

export type MountOptions={paused?:boolean;videoSrc?:string;imageSrc?:string;onChange?:(patch:Partial<Settings>)=>void};
const instances=new WeakMap<HTMLElement,{destroy():void}>();
export function mount(host:HTMLElement,input:unknown={},_id?:string,options:MountOptions={}) {
  instances.get(host)?.destroy();
  let settings=resolveSettings(input),disposed=false,paused=!!options.paused,visible=false,raf=0,previous=0,time=0,lastDecoded=-1;
  const doc=host.ownerDocument,win=doc.defaultView!;
  host.innerHTML=render(settings);
  const scene=host.firstElementChild as HTMLElement;
  const record=scene.querySelector<HTMLCanvasElement>('.lg-record')!;
  const video=scene.querySelector('video')!,marker=scene.querySelector<HTMLElement>('.lg-marker')!;
  const canvas=marker.querySelector('canvas')!,caption=scene.querySelector('p')!,ring=scene.querySelector<HTMLElement>('.lg-ring')!;
  const toggle=scene.querySelector('button')!,panel=scene.querySelector<HTMLElement>('.lg-controls')!;
  const ranges=Array.from(panel.querySelectorAll('input'));
  const listeners=new win.AbortController(),on={signal:listeners.signal};
  const motion=win.matchMedia('(prefers-reduced-motion: reduce)');
  // An explicit empty source selects the procedural record.
  const stills = {
    iris: new URL('../../assets/iris-drift.webp', import.meta.url).href,
    salt: new URL('../../assets/salt-meadow.webp', import.meta.url).href,
    velodrome: new URL('../../assets/velodrome.webp', import.meta.url).href
  };
  const film = new URL('../../assets/tidal-fold-loop.mp4', import.meta.url).href;
  let useVideo = false, useImage = false;
  const image = doc.createElement('img');
  image.className = 'lg-backplate'; image.alt = ''; image.hidden = true;
  image.crossOrigin = 'anonymous';
  function selectScene() {
    const custom = options.videoSrc !== undefined || options.imageSrc !== undefined;
    const videoUrl = custom ? options.videoSrc : settings.scene === 'tidal' ? film : '';
    const imageUrl = custom ? options.imageSrc : settings.scene === 'tidal' ? '' : stills[settings.scene];
    useVideo = Boolean(videoUrl); useImage = !useVideo && Boolean(imageUrl); blocked = false;
    if (useVideo) video.src = videoUrl!;
    else if (video.hasAttribute('src')) {video.pause(); video.removeAttribute('src'); video.load();}
    if (useImage) {record.after(image); image.src = imageUrl!;}
    else {image.remove(); image.removeAttribute('src');}
    sync();
  }
  const ctx=record.getContext('2d');
  const paintRecord=ctx?recordPlayer(ctx):null;
  paintRecord?.(0);
  let lens=createLens(canvas),blocked=false;
  function hasVideo(){return useVideo && video.readyState>=2 && video.videoWidth>0 && !video.error;}
  function draw(){
    const decoded=hasVideo();
    const still=useImage && image.complete && image.naturalWidth>0 ? image : null;
    image.hidden=!still;
    video.hidden=!decoded; record.hidden=decoded || !!still;
    if(!decoded && !still) paintRecord?.(time);
    if(lens){
      try{
        if(decoded)lens.draw(video,video.videoWidth,video.videoHeight);
        else if(still)lens.draw(still,still.naturalWidth,still.naturalHeight);
        else if(paintRecord)lens.draw(record,record.width,record.height);
        marker.dataset.renderer=decoded||still||paintRecord?'webgl':'fallback';
      }catch{lens.destroy();lens=null;marker.dataset.renderer='fallback';}
    }else marker.dataset.renderer='fallback';
    lastDecoded=decoded?video.currentTime:-1;
  }
  function tick(now:number){
    if(disposed)return;
    if(!hasVideo()){
      time+=previous?Math.min((now-previous)/1000,.1):0;draw();
    }else if(lastDecoded!==video.currentTime)draw();
    previous=now;raf=win.requestAnimationFrame(tick);
  }
  function sync(){
    win.cancelAnimationFrame(raf);raf=0;previous=0;
    const run=!disposed && visible && !doc.hidden && !motion.matches && !paused;
    if(!run && useVideo)video.pause();
    if(disposed || !visible || doc.hidden)return;
    draw();
    if(run && !useImage){
      if(useVideo && !video.error && !blocked && video.paused)void video.play().catch(err=>{if(err?.name!=='AbortError')blocked=true;});
      raf=win.requestAnimationFrame(tick);
    }
  }
  function resize(){
    lens?.resize(scene.getBoundingClientRect(),marker.getBoundingClientRect(),Math.min(2,2*(win.devicePixelRatio||1)));
    if(visible)draw();
  }
  function update(patch:unknown){
    if(disposed)return;
    const previousScene = settings.scene;
    settings=resolveSettings({...settings,...(patch && typeof patch==='object'?patch:{})});
    if (previousScene !== settings.scene) selectScene();
    scene.style.setProperty('--lg-radius',settings.borderRadius+'px');
    if(useVideo && video.playbackRate!==settings.playbackSpeed)video.playbackRate=settings.playbackSpeed;
    if(useVideo && video.defaultPlaybackRate!==settings.playbackSpeed)video.defaultPlaybackRate=settings.playbackSpeed;
    ring.hidden=!settings.showRing;caption.textContent=settings.caption;
    for(const range of ranges){
      range.value=String(settings[range.dataset.key as OpticalKey]);
      range.previousElementSibling!.textContent=range.value;
    }
    lens?.configure(settings);if(visible)draw();
  }
  function disclosure(open:boolean){
    toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close controls':'Open controls');
    panel.inert=!open;panel.dataset.open=String(open);
  }
  toggle.addEventListener('click',()=>disclosure(panel.inert),on);
  scene.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.inert){disclosure(false);toggle.focus();}},on);
  for(const range of ranges)range.addEventListener('input',()=>{
    const patch={[range.dataset.key!]:range.valueAsNumber};update(patch);options.onChange?.(patch);
    host.dispatchEvent(new win.CustomEvent('liquid-glass-change',{detail:patch,bubbles:true}));
  },on);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lens=null;marker.dataset.renderer='fallback';},on);
  canvas.addEventListener('webglcontextrestored',()=>{lens=createLens(canvas);lens?.configure(settings);resize();},on);
  image.addEventListener('load', sync, on); image.addEventListener('error', sync, on);
  video.muted = true;
  for (const event of ['loadeddata','seeked','error']) video.addEventListener(event, sync, on);
  selectScene();
  doc.addEventListener('visibilitychange',sync,on);motion.addEventListener('change',sync,on);
  const size=new win.ResizeObserver(resize);size.observe(scene);size.observe(marker);
  const observer=new win.IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});
  observer.observe(scene);update(settings);resize();
  const api={update,pause(){paused=true;sync();},resume(){paused=false;blocked=false;sync();},
    destroy(){if(disposed)return;disposed=true;sync();listeners.abort();size.disconnect();observer.disconnect();lens?.destroy();
      if(useVideo){video.removeAttribute('src');video.load();}scene.remove();instances.delete(host);}
  };
  instances.set(host,api); return api;
}
