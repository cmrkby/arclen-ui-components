import {createLens} from './lens';
import {resolveSettings,type Settings} from './settings';
export {defaults,resolveSettings,type Settings} from './settings';

const escapeText = (s:string) => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function radius(s:Settings) {
  return s.shape==='card'?s.borderRadius:s.shape==='button'?s.buttonRadius:s.badgeRadius;
}
function shapeStyle(s:Settings) {
  return `--lg-radius:${radius(s)}px;--lg-width:${s[`${s.shape}Width`]};--lg-height:${s[`${s.shape}Height`]};--lg-button-frost:${s.buttonFrost}`;
}
function shapeContent(s:Settings) {
  if(s.shape==='card')return `<span class="lg-ring" aria-hidden="true" ${s.showRing?'':'hidden'}><i></i></span><p>${escapeText(s.caption)}</p>`;
  if(s.shape==='badge')return `<span class="lg-badge"><i aria-hidden="true"></i><span>${escapeText(s.badgeLabel)}</span></span>`;
  return `<button class="lg-button" type="button" aria-pressed="false"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4M8 10.5h5"/><path class="lg-plus" d="M10.5 8v5"/></svg><span>${escapeText(s.buttonLabel)}</span></button>`;
}
export function render(input:unknown={}) {
  const s=resolveSettings(input);
  return `<div class="lg-scene" data-shape="${s.shape}" style="${shapeStyle(s)}"><video class="lg-video" muted playsinline loop preload="auto" crossorigin="anonymous" hidden></video><div class="lg-shape"><div class="lg-marker" aria-hidden="true"><canvas hidden></canvas></div><div class="lg-foreground">${shapeContent(s)}</div></div></div>`;
}

export type MountOptions={paused?:boolean;videoSrc?:string;imageSrc?:string;onChange?:(patch:Partial<Settings>)=>void};
const instances=new WeakMap<HTMLElement,{destroy():void}>();
export function mount(host:HTMLElement,input:unknown={},_id?:string,options:MountOptions={}) {
  instances.get(host)?.destroy();
  let settings=resolveSettings(input),disposed=false,paused=!!options.paused,visible=false,raf=0,videoFrame=0,lastDecoded=-1;
  const doc=host.ownerDocument,win=doc.defaultView!;
  host.innerHTML=render(settings);
  const scene=host.firstElementChild as HTMLElement;
  const video=scene.querySelector('video')!,marker=scene.querySelector<HTMLElement>('.lg-marker')!;
  const canvas=marker.querySelector('canvas')!,foreground=scene.querySelector<HTMLElement>('.lg-foreground')!;
  let magnified=false;
  const listeners=new win.AbortController(),on={signal:listeners.signal};
  const motion=win.matchMedia('(prefers-reduced-motion: reduce)');
  const stills = {
    iris: new URL('../../assets/iris-drift.webp', import.meta.url).href,
    salt: new URL('../../assets/salt-meadow.webp', import.meta.url).href,
    velodrome: new URL('../../assets/velodrome.webp', import.meta.url).href
  };
  const film = new URL('../../assets/tidal-fold-loop.mp4', import.meta.url).href;
  let useVideo = false;
  let image: HTMLImageElement | null = null;
  function discardImage() {
    if (!image) return;
    image.onload = image.onerror = null;
    image.remove();
    image = null;
  }
  function selectScene() {
    const custom = options.videoSrc !== undefined || options.imageSrc !== undefined;
    const videoUrl = custom ? options.videoSrc : settings.scene === 'tidal' ? film : '';
    const imageUrl = custom ? options.imageSrc : settings.scene === 'tidal' ? '' : stills[settings.scene];
    discardImage();
    canvas.hidden = video.hidden = true;
    marker.dataset.renderer = 'fallback';
    lastDecoded = -1;
    blocked = false;
    useVideo = Boolean(videoUrl);
    if (videoUrl) video.src = videoUrl;
    else if (video.hasAttribute('src')) {video.pause(); video.removeAttribute('src'); video.load();}
    if (!videoUrl && imageUrl) {
      image = doc.createElement('img');
      image.className = 'lg-backplate';
      image.alt = '';
      image.hidden = true;
      image.crossOrigin = 'anonymous';
      image.onload = image.onerror = sync;
      scene.prepend(image);
      image.src = imageUrl;
    }
    sync();
  }
  let lens=createLens(canvas),blocked=false;
  function hasVideo(){return useVideo && video.readyState>=2 && video.videoWidth>0 && !video.error;}
  function draw(){
    const decoded=hasVideo();
    const still=image?.complete && image.naturalWidth>0 ? image : null;
    if(image) image.hidden=!still;
    video.hidden=!decoded;
    if(lens && (decoded || still)){
      try{
        if(still)lens.draw(still,still.naturalWidth,still.naturalHeight);
        else lens.draw(video,video.videoWidth,video.videoHeight);
      }catch{lens.destroy();lens=null;}
    }
    const refracted=Boolean(lens && (decoded || still));
    if(canvas.hidden===refracted)canvas.hidden=!refracted;
    const renderer=refracted?'webgl':'fallback';
    if(marker.dataset.renderer!==renderer)marker.dataset.renderer=renderer;
    lastDecoded=decoded?video.currentTime:-1;
  }
  function tick(){
    if(hasVideo() && lastDecoded!==video.currentTime)draw();
    raf=win.requestAnimationFrame(tick);
  }
  function presented(){
    draw();
    videoFrame=video.requestVideoFrameCallback(presented);
  }
  function sync(){
    win.cancelAnimationFrame(raf);raf=0;
    if(videoFrame){video.cancelVideoFrameCallback(videoFrame);videoFrame=0;}
    const run=!disposed && visible && !doc.hidden && !motion.matches && !paused;
    if(!run && useVideo)video.pause();
    if(disposed || !visible || doc.hidden)return;
    draw();
    if(run && useVideo && !video.error){
      if(!blocked && video.paused)void video.play().catch(err=>{if(err?.name!=='AbortError')blocked=true;});
      if(typeof video.requestVideoFrameCallback==='function'){
        videoFrame=video.requestVideoFrameCallback(presented);
      }else raf=win.requestAnimationFrame(tick);
    }
  }
  function resize(){
    lens?.resize(scene.getBoundingClientRect(),marker.getBoundingClientRect(),Math.min(2,win.devicePixelRatio||1));
    if(visible)draw();
  }
  function configureLens(){
    lens?.configure({...settings,frost:settings.shape==='button'?Math.min(40,settings.frost+settings.buttonFrost):settings.frost,borderRadius:radius(settings),magnify:settings.magnify*(magnified?1.8:1)});
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
    scene.style.setProperty('--lg-button-frost',String(settings.buttonFrost));
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
  video.muted = true;
  for (const event of ['loadeddata','seeked','error']) video.addEventListener(event, sync, on);
  selectScene();
  doc.addEventListener('visibilitychange',sync,on);motion.addEventListener('change',sync,on);
  const size=new win.ResizeObserver(resize);size.observe(scene);size.observe(marker);
  const observer=new win.IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});
  observer.observe(scene);update(settings);resize();
  const api={update,pause(){paused=true;sync();},resume(){paused=false;blocked=false;sync();},
    destroy(){if(disposed)return;disposed=true;sync();listeners.abort();discardImage();size.disconnect();observer.disconnect();lens?.destroy();
      if(useVideo){video.removeAttribute('src');video.load();}scene.remove();instances.delete(host);}
  };
  instances.set(host,api); return api;
}
