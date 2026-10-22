import poster from '../../assets/poster.webp';
import {createRenderer} from './renderer';
import {defaults, resolveSettings, resolvePatch, type Settings} from './settings';
export {defaults, resolveSettings};
export type {Settings};
export interface Controller {update(patch: unknown): void; pause(): void; resume(): void; destroy(): void;}
export interface LifecycleOptions {paused?: boolean;}
const mounted=new WeakMap<HTMLElement,Controller>();
const escapeAttribute=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
// Next supplies StaticImageData; other bundlers supply a URL string.
function assetUrl(asset:string|{src:string}):string{const url=typeof asset==='string'?asset:asset?.src;if(typeof url!=='string'||!url)throw new TypeError('Bundled poster needs an asset URL.');return url;}
function validateId(id:unknown):asserts id is string|undefined{if(id!==undefined&&typeof id!=='string')throw new TypeError('Instance id must be a string.');}
function sceneHeight(s:Settings){return s.layout==='fill'?'100%':`${s.height}px`;}
/** The captured default poster is a decorative fallback, independent of configured live colors. */
export function render(input:unknown={},id?:string):string{
 const s=resolveSettings(input);validateId(id);
 return `<div class="lf-scene" data-folds-scene="${escapeAttribute(id??'')}" aria-hidden="true" style="position:relative;width:100%;height:${sceneHeight(s)};overflow:hidden;pointer-events:none;background:#010409"><img data-folds-fallback src="${escapeAttribute(assetUrl(poster))}" alt="" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none"><canvas data-folds-canvas aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;visibility:hidden"></canvas></div>`;
}
export function mount(host:HTMLElement,input:unknown={},id?:string,lifecycle:LifecycleOptions={}):Controller{
 const initial=resolveSettings(input);validateId(id);
 if(!lifecycle||typeof lifecycle!=='object'||Array.isArray(lifecycle)||Reflect.ownKeys(lifecycle).some(k=>k!=='paused')||(lifecycle.paused!==undefined&&typeof lifecycle.paused!=='boolean'))throw new TypeError('Lifecycle accepts only a boolean paused option.');
 const view=host?.ownerDocument?.defaultView;
 if(!view||!(host instanceof view.HTMLElement))throw new TypeError('A receiving element with an owner window is required.');
 if(mounted.has(host))throw new Error('This host already has mounted Luminous Folds.');
 const children=Array.from(host.children);
 if(children.some(c=>!c.matches('[data-folds-scene],noscript'))||children.filter(c=>c.matches('[data-folds-scene]')).length>1||Array.from(host.childNodes).some(n=>n.nodeType===3&&n.textContent?.trim()))throw new TypeError('Use an empty host or Luminous Folds server markup.');
 let scene=host.querySelector<HTMLElement>(':scope > [data-folds-scene]');
 if(!scene){const template=host.ownerDocument.createElement('template');template.innerHTML=render(initial,id);scene=template.content.firstElementChild as HTMLElement;host.append(scene);}
 const previous=scene.querySelector<HTMLCanvasElement>(':scope > [data-folds-canvas]');
 if(!previous||!(previous instanceof view.HTMLCanvasElement))throw new TypeError('Luminous Folds needs its canvas.');
 const canvas=previous.cloneNode(false) as HTMLCanvasElement;previous.replaceWith(canvas);
 const ownedScene=scene;ownedScene.setAttribute('data-folds-scene',id??'');ownedScene.style.height=sceneHeight(initial);
 let settings=initial,destroyed=false;const renderer=createRenderer(canvas,initial,lifecycle.paused??false);
 const controller:Controller={
  update(patch){if(destroyed)throw new Error('This instance is destroyed.');const next=resolvePatch(patch,settings);ownedScene.style.height=sceneHeight(next);renderer.update(next);settings=next;},
  pause(){if(!destroyed)renderer.pause();},resume(){if(!destroyed)renderer.resume();},
  destroy(){if(destroyed)return;destroyed=true;renderer.destroy();if(mounted.get(host)===controller)mounted.delete(host);}
 };mounted.set(host,controller);return controller;
}
