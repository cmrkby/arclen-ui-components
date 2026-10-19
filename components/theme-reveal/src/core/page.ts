import {defaults,resolveSettings} from './index';
import {easings,motionKeys,originPoint,revealFrames,type Theme,type MotionSettings,type Origin} from './motion';
export interface RevealResult {status:'completed'|'superseded'|'destroyed';theme:Theme}
export interface PageRevealOptions {document:Document;commitTheme:(theme:Theme,context:{signal:AbortSignal})=>void|Promise<void>;motion?:Partial<MotionSettings>}
export interface PageRevealController {reveal(theme:Theme,origin?:Origin):Promise<RevealResult>;update(motion:Partial<MotionSettings>):void;pause():void;resume():void;destroy():void}
interface Request {theme:Theme;origin?:Origin;resolve:(result:RevealResult)=>void;reject:(error:unknown)=>void}
const queues=new WeakMap<Document,Promise<void>>();
function motion(input:Partial<MotionSettings>={}):MotionSettings{
 for(const key of Object.keys(input))if(!(motionKeys as readonly string[]).includes(key))throw new TypeError(`Unknown motion setting: ${key}`);
 const all=resolveSettings({...Object.fromEntries(motionKeys.map(k=>[k,defaults[k]])),...input});return Object.fromEntries(motionKeys.map(k=>[k,all[k]])) as unknown as MotionSettings;
}
/** Explicitly owns one document-wide transition. Theme persistence belongs to the callback. */
export function createThemeReveal(options:PageRevealOptions):PageRevealController{
 const doc=options.document,view=doc.defaultView;if(!view||typeof options.commitTheme!=='function')throw new TypeError('Provide a live Document and commitTheme callback');const win=view;
 let settings=motion(options.motion),dead=false,paused=false,scheduled=false,pending:Request|null=null,active:Request|null=null;
 let transition:ViewTransition|null=null,animation:Animation|null=null,style:HTMLStyleElement|null=null,abort:AbortController|null=null;
 const media=win.matchMedia?.('(prefers-reduced-motion: reduce)');
 const stopVisual=()=>{animation?.cancel();animation=null;transition?.skipTransition();style?.remove();style=null;};
 const reduce=()=>{if(doc.hidden||media?.matches)stopVisual();};
 media?.addEventListener?.('change',reduce);doc.addEventListener('visibilitychange',reduce);
 function cleanup(){animation?.cancel();animation=null;style?.remove();style=null;transition=null;abort=null;}
 async function execute(request:Request){
  active=request;abort=new AbortController();const signal=abort.signal;const s={...settings};
  const commit=async()=>{if(!dead&&!signal.aborted)await options.commitTheme(request.theme,{signal});};
  try{
   if(dead){request.resolve({status:'destroyed',theme:request.theme});return;}
   const root=doc.documentElement;
   const enhanced=!paused&&!doc.hidden&&!media?.matches&&typeof doc.startViewTransition==='function'&&typeof root.animate==='function';
   if(!enhanced){await commit();}
   else{
    
    style=doc.createElement('style');style.dataset.themeRevealOwned='';
    const opening=s.revealStyle!=='curtain'&&request.theme==='dark';
    const snapshot=opening?'new':'old';
    style.textContent=':root{view-transition-name:root!important}:root *{view-transition-name:none!important}::view-transition-old(root),::view-transition-new(root){animation:none!important;mix-blend-mode:normal}::view-transition-group(root){animation:none!important}'+(opening?'::view-transition-new(root){opacity:0;z-index:1}::view-transition-old(root){z-index:0}':'::view-transition-old(root){z-index:1}::view-transition-new(root){opacity:1;z-index:0}');
    doc.head.append(style);
    const t=doc.startViewTransition(commit);transition=t;
    // Attach rejection handlers immediately; update failure must never become an unhandled rejection.
    const updated=t.updateCallbackDone.then(()=>({ok:true as const}),error=>({ok:false as const,error}));
    const finished=t.finished.catch(()=>undefined);
    try{await t.ready;if(!dead&&!signal.aborted&&!paused&&!doc.hidden&&!media?.matches){
      animation=root.animate(revealFrames(s,root.clientWidth,win.innerHeight,originPoint(s,root.clientWidth,win.innerHeight,request.origin)).map(frame=>({...frame,opacity:frame.opacity??1})),{duration:s.duration,easing:easings[s.easing],direction:s.revealStyle==='curtain'||opening?'normal':'reverse',fill:'both',pseudoElement:`::view-transition-${snapshot}(root)`});
    }else t.skipTransition();}catch{t.skipTransition();}
    await finished;const result=await updated;if(result.ok===false)throw result.error;
   }
   request.resolve({status:dead?'destroyed':'completed',theme:request.theme});
  }catch(error){if(dead)request.resolve({status:'destroyed',theme:request.theme});else request.reject(error);}
  finally{cleanup();active=null;}
 }
 function schedule(){
  if(scheduled||dead)return;scheduled=true;
  const before=queues.get(doc)??Promise.resolve();
  const task=before.catch(()=>undefined).then(async()=>{while(pending&&!dead){const request=pending;pending=null;await execute(request);}}).finally(()=>{scheduled=false;if(pending&&!dead)schedule();});
  queues.set(doc,task);void task.finally(()=>{if(queues.get(doc)===task)queues.delete(doc);});
 }
 return{
  reveal(theme,origin){if(theme!=='light'&&theme!=='dark')return Promise.reject(new TypeError('Theme must be light or dark'));if(dead)return Promise.resolve({status:'destroyed',theme});return new Promise((resolve,reject)=>{pending?.resolve({status:'superseded',theme:pending.theme});pending={theme,origin,resolve,reject};schedule();});},
  update(value){if(!dead)settings=motion({...settings,...value});},
  pause(){if(dead)return;paused=true;stopVisual();},resume(){if(!dead)paused=false;},
  destroy(){if(dead)return;dead=true;abort?.abort();stopVisual();pending?.resolve({status:'destroyed',theme:pending.theme});pending=null;active?.resolve({status:'destroyed',theme:active.theme});media?.removeEventListener?.('change',reduce);doc.removeEventListener('visibilitychange',reduce);}
 };
}
