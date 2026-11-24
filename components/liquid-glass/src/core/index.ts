import {createLens} from './lens';
import {recordPlayer} from './record';
import {resolveSettings,type Settings} from './settings';
export {defaults,resolveSettings,type Settings} from './settings';

const escapeText = (s:string) => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function radius(s:Settings) {
  return s.shape==='card'?s.borderRadius:s.shape==='button'?s.buttonRadius:s.badgeRadius;
}
function shapeStyle(s:Settings) {
  return `--lg-radius:${radius(s)}px;--lg-width:${s[`${s.shape}Width`]};--lg-height:${s[`${s.shape}Height`]}`;
}
function shapeContent(s:Settings) {
  if(s.shape==='card')return `<span class="lg-ring" aria-hidden="true" ${s.showRing?'':'hidden'}><i></i></span><p>${escapeText(s.caption)}</p>`;
  if(s.shape==='badge')return `<span class="lg-badge"><i aria-hidden="true"></i><span>${escapeText(s.badgeLabel)}</span></span>`;
  return `<button class="lg-button" type="button" aria-pressed="false"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4M8 10.5h5"/><path class="lg-plus" d="M10.5 8v5"/></svg><span>${escapeText(s.buttonLabel)}</span></button>`;
}
export function render(input:unknown={}) {
  const s=resolveSettings(input);
  return `<div class="lg-scene" data-shape="${s.shape}" style="${shapeStyle(s)}"><canvas class="lg-record" aria-hidden="true"></canvas><video class="lg-video" muted playsinline loop preload="auto" crossorigin="anonymous" hidden></video><div class="lg-shape"><div class="lg-marker" aria-hidden="true"><canvas></canvas></div><div class="lg-foreground">${shapeContent(s)}</div></div></div>`;
}

export type MountOptions={paused?:boolean;videoSrc?:string;imageSrc?:string;onChange?:(patch:Partial<Settings>)=>void};
const instances=new WeakMap<HTMLElement,{destroy():void}>();
export function mount(host:HTMLElement,input:unknown={},_id?:string,options:MountOptions={}) {
  instances.get(host)?.destroy();
  let settings=resolveSettings(input),disposed=false,paused=!!options.paused,visible=false,raf=0,videoFrame=0,previous=0,time=0,lastDecoded=-1;
  const doc=host.ownerDocument,win=doc.defaultView!;
  host.innerHTML=render(settings);
  const scene=host.firstElementChild as HTMLElement;
  const record=scene.querySelector<HTMLCanvasElement>('.lg-record')!;
  const video=scene.querySelector('video')!,marker=scene.querySelector<HTMLElement>('.lg-marker')!;
  const canvas=marker.querySelector('canvas')!,foreground=scene.querySelector<HTMLElement>('.lg-foreground')!;
  let magnified=false;
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
  function presented(){
    draw();
    videoFrame=video.requestVideoFrameCallback(presented);
  }
  function sync(){
    win.cancelAnimationFrame(raf);raf=0;previous=0;
    if(videoFrame){video.cancelVideoFrameCallback(videoFrame);videoFrame=0;}
    const run=!disposed && visible && !doc.hidden && !motion.matches && !paused;
    if(!run && useVideo)video.pause();
    if(disposed || !visible || doc.hidden)return;
    draw();
    if(run && !useImage){
      if(useVideo && !video.error && !blocked && video.paused)void video.play().catch(err=>{if(err?.name!=='AbortError')blocked=true;});
      if(useVideo && !video.error && typeof video.requestVideoFrameCallback==='function'){
        videoFrame=video.requestVideoFrameCallback(presented);
      }else raf=win.requestAnimationFrame(tick);
    }
  }
  function resize(){
    lens?.resize(scene.getBoundingClientRect(),marker.getBoundingClientRect(),Math.min(2,win.devicePixelRatio||1));
    if(visible)draw();
  }
  function configureLens(){
    lens?.configure({...settings,borderRadius:radius(settings),magnify:settings.magnify*(magnified?1.8:1)});
  }
  foreground.addEventListener('click',event=>{
    const button=foreground.querySelector('button');
    if(!button || !button.contains(event.target as Node))return;
    magnified=!magnified;
    button.setAttribute('aria-pressed',String(magnified));
    scene.dataset.magnified=String(magnified);
    configureLens();
    if(visible)draw();
  },on);
  function update(patch:unknown){
    if(disposed)return;
    const previousScene = settings.scene, previousShape=settings.shape;
    settings=resolveSettings({...settings,...(patch && typeof patch==='object'?patch:{})});
    if (previousScene !== settings.scene) selectScene();
    if(previousShape!==settings.shape){
      magnified=false;delete scene.dataset.magnified;
      scene.dataset.shape=settings.shape;
      foreground.innerHTML=shapeContent(settings);
    }
    scene.style.setProperty('--lg-radius',radius(settings)+'px');
    scene.style.setProperty('--lg-width',String(settings[`${settings.shape}Width`]));
    scene.style.setProperty('--lg-height',String(settings[`${settings.shape}Height`]));
    if(useVideo && video.playbackRate!==settings.playbackSpeed)video.playbackRate=settings.playbackSpeed;
    if(useVideo && video.defaultPlaybackRate!==settings.playbackSpeed)video.defaultPlaybackRate=settings.playbackSpeed;
    if(settings.shape==='card'){
      foreground.querySelector<HTMLElement>('.lg-ring')!.hidden=!settings.showRing;
      foreground.querySelector('p')!.textContent=settings.caption;
    }else{
      foreground.querySelector('.lg-button span,.lg-badge span')!.textContent=settings.shape==='button'?settings.buttonLabel:settings.badgeLabel;
    }
    configureLens();if(visible)draw();
  }
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lens=null;marker.dataset.renderer='fallback';},on);
  canvas.addEventListener('webglcontextrestored',()=>{lens=createLens(canvas);configureLens();resize();},on);
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
