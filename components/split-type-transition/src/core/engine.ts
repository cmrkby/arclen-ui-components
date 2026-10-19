import {renderHeroImage} from './hero-image';
import {titleDefaults,resolveTitle,renderTitle,fitGraphicTitle,graphicSlices,titleWidth,titleSettle,type TitleSettings} from './title';
import wordmarkImage from '../../assets/arclen-wordmark.svg';
import manifest from './engine-manifest.json';
import {renderTacticalButton,attachTactical,type TacticalSettings} from './scan';
const replaySettings:TacticalSettings={label:'Replay reveal',disabled:false,animate:true,textColor:'#eeeae1',scatterColor:'#de4912',backgroundColor:'var(--pt-detail-fill)',cornerColor:'var(--pt-detail-line)'};
export type Preset='split-type'|'three-panels'|'center-split'|'slats'|'pixels';
export interface Settings extends TitleSettings {preset:Preset;autoplay:boolean;label:string;heading:string;caption:string;background:string;foreground:string;overlayColor:string;overlayText:string;minHeight:number;duration:number;coverDuration:number;stagger:number;hold:number;leadIn:number;sliceDuration:number;sliceStagger:number;glyphStagger:number;settleDuration:number;scale:number;travel:number;slatCount:number;gridColumns:number;easing:'expressive'|'smooth'|'linear'|'split'|'decay'|'shutter';origin:'top-left'|'top-right'|'bottom-left'|'bottom-right';slatDirection:'up'|'down';responsiveSlats:boolean;lineDuration:number;gridRows:number;textDuration:number;textTravel:number;buttonTravel:number;creditTravel:number;compactDuration:number;compactStagger:number;titleDelay:number;titleTravel:number;titleScale:number;panelColor:string;panelText:string;counterColor:string;panelRadius:number;labelTravel:number;pixelHeading:string;pixelCompactHeading:string;pixelMobileText:string;pixelBackdrop:string;imageRise:number;imageDuration:number;imageDelay:number}
export const defaults={...Object.fromEntries(manifest.settings.map(s=>[s.key,s.default])),...titleDefaults} as unknown as Settings;
export const presetSettings=Object.fromEntries(manifest.previews.map(p=>[p.settings.preset,p.settings])) as Record<Preset,Partial<Settings>>;
export function applicableSettings(preset:Preset):string[]{return ['preset','autoplay','heading','caption','background','foreground','minHeight','duration','coverDuration','hold','leadIn','easing',...(preset==='three-panels'?['panelColor','panelText','panelRadius','labelTravel','imageRise','imageDuration','imageDelay']:['overlayColor']),...(preset==='center-split'?['travel','lineDuration','counterColor']:[]),...(['split-type','three-panels'].includes(preset)?['label']:[]),...(preset==='split-type'?['overlayText']:[]),...(['three-panels','slats','pixels'].includes(preset)?['stagger']:[]),...(preset==='split-type'?['sliceDuration','sliceStagger','glyphStagger','settleDuration','scale','titleDelay','titleTravel','titleScale']:[]),...(preset==='slats'?['slatCount','slatDirection','responsiveSlats','compactDuration','compactStagger']:[]),...(preset==='pixels'?['gridColumns','gridRows','origin','textDuration','textTravel','buttonTravel','creditTravel','pixelHeading','pixelCompactHeading','pixelMobileText','pixelBackdrop']:[])];}
export function resolveSettings(input:unknown={}):Settings{
 const obj=input&&typeof input==='object'&&!Array.isArray(input)?input as Record<string,unknown>:{};
 const out={...defaults} as unknown as Record<string,unknown>;
 for(const rule of manifest.settings){const v=obj[rule.key];if(v===undefined)continue;
 if(rule.kind==='number'&&typeof v==='number'&&Number.isFinite(v)){out[rule.key]=Math.max(rule.min??-Infinity,Math.min(rule.max??Infinity,v));}
 else if(rule.kind==='boolean'&&typeof v==='boolean')out[rule.key]=v;
 else if(rule.kind==='text'&&typeof v==='string')out[rule.key]=Array.from(v).slice(0,rule.maxLength??180).join('');
 else if(rule.kind==='color'&&typeof v==='string'&&/^#[\da-f]{6}$/i.test(v))out[rule.key]=v;
 else if(rule.kind==='select'&&rule.options?.some(o=>(typeof o==='string'?o:o.value)===v))out[rule.key]=v;
 }
 for(const k of ['slatCount','gridColumns','gridRows'])out[k]=Math.round(out[k] as number);
 return {...out,...resolveTitle(obj)} as unknown as Settings;
}
const bundledWordmark=wordmarkImage as unknown as string|{src:string};
const wordmarkSource=typeof bundledWordmark==='string'?bundledWordmark:bundledWordmark.src;
const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function render(input:unknown={}):string{const s=resolveSettings(input);return `<section data-page-transitions data-pt-preset="${s.preset}" style="--pt-bg:${s.background};--pt-fg:${s.foreground};--pt-height:${s.minHeight}px;--pt-title-color:${s.overlayText};--pt-pixel-heading:${s.pixelHeading};--pt-pixel-compact-heading:${s.pixelCompactHeading};--pt-pixel-mobile-text:${s.pixelMobileText}"><div data-pt-content><div class="pt-editorial">${renderHeroImage()}<span class="pt-brand"><img src="${escape(wordmarkSource)}" alt="Arclen" width="94" height="24"/></span><div class="pt-story"><div class="pt-copy"><span class="pt-eyebrow"><span class="pt-eyebrow-a11y">A Study In Motion</span><span class="pt-eyebrow-visual" aria-hidden="true">A Study In Motion</span></span><h2>${escape(s.heading)}</h2><p>${escape(s.caption)}</p></div>${renderTacticalButton(replaySettings).replace('<button','<button data-pt-replay')}</div><span class="pt-credit">Independent by design.</span></div></div><div class="pt-title" data-pt-title aria-hidden="true">${renderTitle(s)}</div><button data-pt-navigate type="button">Next scene <span aria-hidden="true">→</span></button></section>`;}

export type Phase='idle'|'covering'|'covered'|'revealing'|'destroyed';
export type TransitionResult={status:'finished'|'cancelled'|'error'|'timeout'};
export interface NavigationOptions {ready?:Promise<unknown>|((signal:AbortSignal)=>Promise<unknown>);commit?:(signal:AbortSignal)=>void;signal?:AbortSignal;timeout?:number}
export interface PageTransitionController {readonly phase:Phase;replay():Promise<TransitionResult>;cover():Promise<TransitionResult>;uncover():Promise<TransitionResult>;navigate(options:NavigationOptions):Promise<TransitionResult>;cancel():void;update(input:unknown):void;pause():void;resume():void;destroy():void}
/** Owns only temporary overlay nodes. Consumer content is never replaced. */
export function createPageTransition(host:HTMLElement,input:unknown={}):PageTransitionController{
 let s=resolveSettings(input),phase:Phase='idle',paused=false,offscreen=false,serial=0,active:AbortController|null=null,overlay:HTMLElement|null=null,safety:ReturnType<typeof setTimeout>|undefined;
 let resizeLayout:(()=>void)|null=null;
 const animations=new Set<Animation>(),view=host.ownerDocument.defaultView,media=view?.matchMedia?.('(prefers-reduced-motion: reduce)');
 const originalPosition=host.style.position,needsPosition=view?.getComputedStyle(host).position==='static';if(needsPosition)host.style.position='relative';
 const content=()=>host.querySelector<HTMLElement>(':scope > [data-pt-content]');
 const setPhase=(p:Phase)=>{phase=p;host.dataset.ptPhase=p;};
 const settle=()=>{resizeLayout=null;clearTimeout(safety);for(const a of animations)a.cancel();animations.clear();overlay?.remove();overlay=null;if(phase!=='destroyed')setPhase('idle');};
 const cancel=()=>{serial++;active?.abort();active=null;settle();};
 const canMove=()=>!paused&&!offscreen&&!media?.matches&&typeof host.animate==='function';
 const wait=(ms:number,signal:AbortSignal)=>new Promise<void>(resolve=>{if(signal.aborted||!ms){resolve();return;}const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',done);resolve();};const timer=setTimeout(done,ms);signal.addEventListener('abort',done,{once:true});});
 const animate=async(el:Element,frames:Keyframe[],duration:number,delay=0,easing=curve())=>{if(!canMove()||active?.signal.aborted)return;const a=el.animate(frames,{duration,delay,easing,fill:'both'});animations.add(a);await a.finished.catch(()=>{});};
 function curve(){return s.easing==='split'?'cubic-bezier(.76,0,.24,1)':s.easing==='linear'?'linear':s.easing==='expressive'?'cubic-bezier(.19,1,.22,1)':'cubic-bezier(.22,1,.36,1)';}
 function fitTitle(){const title=host.querySelector<HTMLElement>('.pt-title[data-pt-title]');if(!title||s.preset!=='split-type')return;const hostRect=host.getBoundingClientRect(),width=hostRect.width;if(fitGraphicTitle(title,width,hostRect.height))return;title.style.fontSize='198px';const natural=title.getBoundingClientRect().width;if(natural>0)title.style.fontSize=`${198*titleWidth(width)/natural}px`;}
 function makeOverlay(){overlay?.remove();overlay=host.ownerDocument.createElement('div');overlay.dataset.ptOverlay='';overlay.setAttribute('aria-hidden','true');overlay.style.setProperty('--pt-label-color',s.overlayText);overlay.style.cssText=`position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:10;color:${s.overlayText};`;overlay.style.setProperty('--pt-label-color',s.overlayText);host.append(overlay);return overlay;}
 function cells(){const root=makeOverlay(),rect=host.getBoundingClientRect();let cols=s.preset==='three-panels'?3:s.slatCount,rows=1;
 if(s.preset==='slats'&&s.responsiveSlats&&rect.width<1200)cols=6;
 if(s.preset==='pixels'){cols=s.gridColumns;rows=Math.min(s.gridRows,Math.floor(900/cols));}
 const nodes:HTMLElement[]=[];for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const el=host.ownerDocument.createElement('i');el.dataset.ptCell='';el.style.cssText=`position:absolute;left:${x/cols*100}%;top:${y/rows*100}%;width:calc(${100/cols}% + 1px);height:calc(${100/rows}% + 1px);background:${s.overlayColor};`;if(s.preset==='three-panels'){el.style.top='-1%';el.style.height='102%';el.style.width=`${100/cols}%`;el.style.background=s.panelColor;el.style.borderRadius=`${s.panelRadius}px`;if(x<2){const seam=host.ownerDocument.createElement('i');seam.dataset.ptSeam='';seam.style.cssText=`position:absolute;right:0;top:0;bottom:0;width:1px;background:${s.panelColor};`;el.append(seam);}}root.append(el);nodes.push(el);}return {root,nodes,cols,rows};}
 async function reveal(signal:AbortSignal){fitTitle();setPhase('revealing');if(!canMove())return;
 if(s.preset==='center-split'){
 const root=makeOverlay(),top=host.ownerDocument.createElement('i'),bottom=host.ownerDocument.createElement('i'),line=host.ownerDocument.createElement('i'),fill=host.ownerDocument.createElement('i'),count=host.ownerDocument.createElement('span');
 top.dataset.ptHalf='top';bottom.dataset.ptHalf='bottom';line.dataset.ptTrack='';fill.dataset.ptFill='';count.dataset.ptCount='';count.textContent='0';
 top.style.cssText=`position:absolute;inset:0 0 50%;background:${s.overlayColor};`;bottom.style.cssText=`position:absolute;inset:50% 0 0;background:${s.overlayColor};`;
 line.style.cssText='position:absolute;left:0;top:calc(50% - 1px);height:2px;width:100%;background:rgba(255,255,255,.06);overflow:hidden;border-radius:1px;';
 fill.style.cssText=`position:absolute;left:calc(50% - min(100px, (100% - 48px) / 2));top:0;bottom:0;width:min(200px,calc(100% - 48px));background:${s.counterColor};transform-origin:left;`;line.append(fill);
 count.style.cssText=`position:absolute;left:50%;bottom:calc(50% + 13px);width:min(200px,calc(100% - 48px));transform:translateX(-50%);text-align:center;font:500 16px/1.3 Arial,sans-serif;font-variant-numeric:tabular-nums;letter-spacing:0;color:${s.counterColor};`;
 root.append(top,bottom,line,count);
 await wait(s.leadIn,signal);if(signal.aborted)return;
 const ratio=s.lineDuration/1031,short='inset(0 calc(50% - min(100px, (100% - 48px) / 2)) round 1px)',closed='inset(0 50% round 1px)',openAt=s.lineDuration+s.hold;
 // All offsets share one origin: stretch and opening intentionally overlap by 44ms.
 const counter=(async()=>{await wait(225*ratio,signal);const start=Date.now();while(!signal.aborted){const progress=Math.min(1,(Date.now()-start)/(500*ratio));count.textContent=String(Math.round(progress*100));if(progress===1)return;await wait(16,signal);}})();
 const target=content();
 await Promise.all([
 animate(line,[{clipPath:closed,offset:0,easing:'cubic-bezier(.22,1,.36,1)'},{clipPath:short,offset:300/1075,easing:'linear'},{clipPath:short,offset:725/1075,easing:'cubic-bezier(.76,0,.24,1)'},{clipPath:'inset(0 0 round 1px)',offset:1}],1075*ratio,0,'linear'),
 animate(fill,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],500*ratio,225*ratio,'cubic-bezier(.65,0,.35,1)'),
 animate(count,[{opacity:1},{opacity:0}],250*ratio,725*ratio,'ease-out'),
 animate(fill,[{opacity:1},{opacity:0}],250*ratio,725*ratio,'ease-out'),counter,
 animate(line,[{opacity:1},{opacity:0}],10*ratio,openAt,'linear'),
 animate(top,[{transform:'translateY(0)'},{transform:'translateY(-100%)'}],s.duration,openAt),
 animate(bottom,[{transform:'translateY(0)'},{transform:'translateY(100%)'}],s.duration,openAt),
 ...(target?[animate(target,[{opacity:0,transform:`translateY(${s.travel}px)`},{opacity:1,transform:'translateY(0)'}],600,openAt)]:[])
 ]);return;
 }
 if(s.preset==='split-type'){
 const root=makeOverlay();root.style.background=s.overlayColor;
 const destination=host.querySelector<HTMLElement>('[data-pt-title]'),rect=host.getBoundingClientRect(),compact=rect.width<1200;
 const word=host.ownerDocument.createElement('div');word.className='pt-split';word.style.setProperty('--pt-label-color',s.overlayText);root.append(word);
 if(destination){const box=destination.getBoundingClientRect(),style=view!.getComputedStyle(destination);word.style.cssText+=`;inset:auto;left:${box.left-rect.left}px;top:${box.top-rect.top}px;font:${style.font};letter-spacing:${style.letterSpacing};line-height:${style.lineHeight};transform-origin:left bottom;`;void animate(destination,[{visibility:'hidden'},{visibility:'hidden'}],1);}
 else {word.style.fontSize=`min(198px, ${85/(Math.max(1,Array.from(s.label||'FRAME').length)*.7)}cqw)`;}
 const jobs:Promise<void>[]=[],clips=[[-25.4,99.6],[-.4,74.6],[24.6,49.6],[49.6,24.6],[74.6,-.4],[99.6,-25.4]];
 let graphicSource=destination;
 if(!graphicSource&&s.titleKind!=='text'){
  const source=host.ownerDocument.createElement('div');source.innerHTML=renderTitle(s);source.style.cssText='position:absolute;visibility:hidden;';root.append(source);
  fitGraphicTitle(source,rect.width,rect.height);graphicSource=source;
  if(source.querySelector('.pt-title-art'))word.style.cssText+=';inset:auto;left:50%;top:50%;translate:-50% -50%;transform-origin:center;';
 }
 if(graphicSource?.querySelector('.pt-title-art')){for(const {slice,glyph:g,band:i} of graphicSlices(word,graphicSource))jobs.push(animate(slice,[{opacity:0,transform:`translateX(${(i+g)%2?45:-45}%)`},{opacity:1,transform:'translateX(0)'}],s.sliceDuration,s.leadIn+i*s.sliceStagger+g*s.glyphStagger));}
 else Array.from(s.label||'FRAME').forEach((letter,g)=>{const glyph=host.ownerDocument.createElement('span');glyph.className='pt-glyph';glyph.textContent=letter===' '?'\u00a0':letter;word.append(glyph);clips.forEach(([top,bottom],i)=>{const slice=host.ownerDocument.createElement('span');slice.textContent=glyph.firstChild!.textContent;slice.style.clipPath=`inset(${top}% -20% ${bottom}% -20%)`;glyph.append(slice);jobs.push(animate(slice,[{opacity:0,transform:`translateX(${(i+g)%2?45:-45}%)`},{opacity:1,transform:'translateX(0)'}],s.sliceDuration,s.leadIn+i*s.sliceStagger+g*s.glyphStagger));});});
 const settleAt=s.titleDelay+s.hold,target=content();
 // Match the receiving title while the cover clears, before the temporary slices leave.
 if(destination){const finalColor=view!.getComputedStyle(destination).color;for(const slice of word.querySelectorAll('.pt-glyph > span'))jobs.push(animate(slice,[{color:s.overlayText},{color:finalColor}],400,settleAt));}
 const wordBox=word.getBoundingClientRect(),motion=titleSettle(rect,{x:wordBox.left-rect.left,y:wordBox.top-rect.top,width:wordBox.width,height:wordBox.height},s.titleScale,s.titleTravel);
 if(compact)word.style.transformOrigin='center center';
 jobs.push(animate(word,[{transform:`translateY(${motion.travel}px) scale(${motion.scale})`},{transform:'translateY(0) scale(1)'}],s.settleDuration,settleAt));
 jobs.push(animate(root,[{backgroundColor:s.overlayColor},{backgroundColor:'transparent'}],400,settleAt));
 if(target){jobs.push(animate(target,[{transform:`scale(${s.scale})`},{transform:'scale(1)'}],s.duration,settleAt));jobs.push(animate(target,[{opacity:0},{opacity:1}],400,settleAt));}
 await Promise.all(jobs);return;
 }
 if(s.preset==='pixels'){
 const image=host.querySelector<HTMLImageElement>('[data-pt-image]');
 const {root,nodes,cols,rows}=cells();
 const imageMode=Boolean(image);
 if(image){
 root.style.zIndex='0';root.style.background=s.pixelBackdrop;
 const fragments:HTMLImageElement[]=[];
 for(const tile of nodes){tile.style.overflow='hidden';tile.style.background='transparent';tile.style.opacity='0';const fragment=image.cloneNode(false) as HTMLImageElement;fragment.removeAttribute('data-pt-image');fragment.style.cssText='position:absolute;max-width:none;object-fit:cover;object-position:50% 50%;';tile.append(fragment);fragments.push(fragment);}
 resizeLayout=()=>{const rect=host.getBoundingClientRect();fragments.forEach((fragment,i)=>{fragment.style.objectPosition=view!.getComputedStyle(image).objectPosition;fragment.style.left=`${-(i%cols)*rect.width/cols}px`;fragment.style.top=`${-Math.floor(i/cols)*rect.height/rows}px`;fragment.style.width=`${rect.width}px`;fragment.style.height=`${rect.height}px`;});};resizeLayout();
 // Keep the accessible demo's real image in place; only its paint is hidden while the mosaic runs.
 void animate(image,[{visibility:'hidden'},{visibility:'hidden'}],1);
 }
 const delay=s.leadIn+s.hold;
 const copy=host.querySelector('.pt-copy'),button=host.querySelector('[data-pt-replay]'),credit=host.querySelector('.pt-credit');
 await Promise.all([
 ...nodes.map((el,i)=>{let x=i%cols,y=Math.floor(i/cols);if(s.origin.endsWith('right'))x=cols-1-x;if(s.origin.startsWith('bottom'))y=rows-1-y;return animate(el,imageMode?[{opacity:0},{opacity:1}]:[{opacity:1},{opacity:0}],s.duration,delay+Math.hypot(x,y)*s.stagger);}),
 ...(copy?[animate(copy,[{transform:`translateX(${-s.textTravel}px)`},{transform:'translateX(0)'}],s.textDuration,delay,'cubic-bezier(.45,0,.55,1)')]:[]),
 ...(button?[animate(button,[{transform:`translateY(${-s.buttonTravel}px)`},{transform:'translateY(0)'}],s.textDuration,delay+s.textDuration,'cubic-bezier(.22,1,.36,1)')]:[]),
 ...(credit?[animate(credit,[{transform:`translateY(${s.creditTravel}px)`},{transform:'translateY(0)'}],s.textDuration,delay,'cubic-bezier(.45,0,.55,1)')]:[])
 ]);return;
 }
 const {root,nodes}=cells();
 if(s.preset==='three-panels'){
 const mask=host.ownerDocument.createElement('div');mask.className='pt-label-mask';const label=host.ownerDocument.createElement('span');label.textContent=s.label;label.style.color=s.panelText;mask.append(label);root.append(mask);
 // Continuous shutter easing avoids velocity steps.
 const frames=(distance:number,unit:string):Keyframe[]=>[{transform:'translateY(0)'},{transform:`translateY(${-distance}${unit})`}];
 const easing=s.easing==='shutter'?'cubic-bezier(.83,0,.15,1)':curve(),delay=s.leadIn+s.hold;
 const image=host.querySelector<HTMLElement>('[data-pt-image]');
 await Promise.all([
 ...nodes.map((el,i)=>animate(el,frames(100,'%'),s.duration,delay+i*s.stagger,easing)),
 animate(label,frames(s.labelTravel,'px'),s.duration,delay,easing),
 // Only the media rises; typography stays anchored. Tracked WAAPI effects clean up on every cancellation path.
 ...(image&&s.imageRise>0?[animate(image,[{transform:`translateY(${s.imageRise}px)`},{transform:'translateY(0)'}],s.imageDuration,delay+s.imageDelay,'cubic-bezier(.12,.96,.44,1)')]:[])
 ]);return;
 }
 const compact=s.responsiveSlats&&host.getBoundingClientRect().width<1200,down=compact||s.slatDirection==='down';
 await Promise.all(nodes.map((el,i)=>{const frames=s.easing==='decay'?Array.from({length:61},(_,n)=>({offset:n/60,transform:`translateY(${(down?101:-101)*(1-Math.exp(-7.2*n/60))/(1-Math.exp(-7.2))}%)`})):[{transform:'translateY(0)'},{transform:`translateY(${down?101:-101}%)`}];return animate(el,frames,compact?s.compactDuration:s.duration,s.leadIn+s.hold+i*(compact?s.compactStagger:s.stagger),s.easing==='decay'?'linear':curve());}));
 }
 async function runReveal():Promise<TransitionResult>{if(phase==='destroyed')return {status:'cancelled'};cancel();const ticket=serial;active=new AbortController();const signal=active.signal;if(!signal.aborted)await reveal(signal);if(ticket!==serial)return {status:'cancelled'};settle();return {status:'finished'};}
 async function cover():Promise<TransitionResult>{if(phase==='destroyed')return {status:'cancelled'};cancel();const ticket=serial;active=new AbortController();setPhase('covering');if(canMove()){const {nodes}=cells();await Promise.all(nodes.map((n,i)=>animate(n,s.preset==='pixels'?[{opacity:0},{opacity:1}]:[{transform:'translateY(101%)'},{transform:'translateY(0)'}],s.coverDuration,Math.min(i,20)*Math.min(s.stagger,30))));}if(ticket!==serial)return {status:'cancelled'};setPhase('covered');safety=setTimeout(cancel,8000);return {status:'finished'};}
 const preference=()=>{if(media?.matches)cancel();};media?.addEventListener?.('change',preference);
 const visibility=()=>{if(host.ownerDocument.hidden)cancel();};host.ownerDocument.addEventListener('visibilitychange',visibility);
 const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{offscreen=!entries[0]?.isIntersecting;if(offscreen)cancel();});observer?.observe(host);
 let lastWidth=host.getBoundingClientRect().width,lastHeight=host.getBoundingClientRect().height;
 const resize=()=>{if(phase==='destroyed')return;const rect=host.getBoundingClientRect();if(rect.width===lastWidth&&rect.height===lastHeight)return;lastWidth=rect.width;lastHeight=rect.height;if(s.preset==='split-type'&&phase==='revealing')cancel();fitTitle();resizeLayout?.();};
 const resizeObserver=typeof ResizeObserver==='undefined'?null:new ResizeObserver(resize);resizeObserver?.observe(host);if(!resizeObserver)view?.addEventListener('resize',resize);fitTitle();
 const api:PageTransitionController={get phase(){return phase;},replay:runReveal,cover,async uncover(){clearTimeout(safety);return runReveal();},async navigate(options){
 // Observe an already-running readiness promise before cover's first await.
 // Keep rejection as fulfilled outcome data, including when cover is cancelled.
 const readiness=typeof options.ready==='function'?null:Promise.resolve(options.ready).then(()=>({ok:true}),()=>({ok:false}));
 if(options.signal?.aborted)return {status:'cancelled'};
 // cover establishes ownership synchronously, including when motion is disabled.
 // Capture before yielding so a superseded continuation cannot borrow the new request.
 const covering=cover(),controller=active;let ticket=serial;
 const abort=()=>{if(ticket===serial)cancel();};
 options.signal?.addEventListener('abort',abort,{once:true});
 const result=await covering;
 if(result.status!=='finished'||ticket!==serial||!controller||controller.signal.aborted){options.signal?.removeEventListener('abort',abort);return {status:'cancelled'};}
 clearTimeout(safety);let timedOut=false;
 const timer=setTimeout(()=>{timedOut=true;cancel();},Math.max(100,Math.min(8000,options.timeout??8000)));
 try{const ready=readiness??Promise.resolve(typeof options.ready==='function'?options.ready(controller.signal):undefined).then(()=>({ok:true}),()=>({ok:false}));const outcome=await Promise.race([ready,new Promise<void>(resolve=>{if(controller.signal.aborted)resolve();else controller.signal.addEventListener('abort',()=>resolve(),{once:true});})]);if(ticket!==serial||controller.signal.aborted)return {status:timedOut?'timeout':'cancelled'};if(!outcome||!outcome.ok){cancel();return {status:'error'};}options.commit?.(controller.signal);if(ticket!==serial)return {status:'cancelled'};clearTimeout(timer);const uncovering=api.uncover();ticket=serial;return await uncovering;}catch{if(ticket===serial)cancel();return {status:'error'};}finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
 },cancel,update(next){cancel();s=resolveSettings({...s,...(next&&typeof next==='object'?next:{})});fitTitle();},pause(){paused=true;cancel();},resume(){paused=false;},destroy(){if(phase==='destroyed')return;cancel();setPhase('destroyed');observer?.disconnect();resizeObserver?.disconnect();view?.removeEventListener('resize',resize);media?.removeEventListener?.('change',preference);host.ownerDocument.removeEventListener('visibilitychange',visibility);if(needsPosition)host.style.position=originalPosition;delete host.dataset.ptPhase;}};
 return api;
}
export function mount(host:HTMLElement,input:unknown={}):PageTransitionController{
 let s=resolveSettings(input);host.innerHTML=render(s);const root=host.querySelector<HTMLElement>('[data-page-transitions]')!,api=createPageTransition(root,s),replayControl=attachTactical(root.querySelector<HTMLButtonElement>('[data-pt-replay]')!,replaySettings);let alternate=false;const navigate=()=>{void api.navigate({commit(){alternate=!alternate;root.querySelector('h2')!.textContent=alternate?'See things\ndifferently.':s.heading;root.querySelector('p')!.textContent=alternate?'A small shift. A whole new point of view.':s.caption;}});};root.querySelector('[data-pt-navigate]')!.addEventListener('click',navigate);const replay=()=>{void api.replay();};root.querySelector('[data-pt-replay]')!.addEventListener('click',replay);if(s.autoplay)void api.replay();
 return {...api,get phase(){return api.phase;},pause(){replayControl.pause();api.pause();},resume(){api.resume();replayControl.resume();},update(next){s=resolveSettings({...s,...(next&&typeof next==='object'?next:{})});root.dataset.ptPreset=s.preset;root.style.setProperty('--pt-bg',s.background);root.style.setProperty('--pt-fg',s.foreground);root.style.setProperty('--pt-height',`${s.minHeight}px`);root.style.setProperty('--pt-title-color',s.overlayText);root.querySelector('[data-pt-title]')!.innerHTML=renderTitle(s);root.querySelector('h2')!.textContent=s.heading;root.querySelector('p')!.textContent=s.caption;root.style.setProperty('--pt-pixel-heading',s.pixelHeading);root.style.setProperty('--pt-pixel-compact-heading',s.pixelCompactHeading);root.style.setProperty('--pt-pixel-mobile-text',s.pixelMobileText);api.update(s);replayControl.update(replaySettings);if(s.autoplay)void api.replay();},destroy(){replayControl.destroy();api.destroy();root.querySelector('[data-pt-replay]')?.removeEventListener('click',replay);root.querySelector('[data-pt-navigate]')?.removeEventListener('click',navigate);}};
}
