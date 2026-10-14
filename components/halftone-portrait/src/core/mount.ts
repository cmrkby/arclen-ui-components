import {HalftonePortrait} from './engine';
import {type HalftoneProps} from './options';
const mountedByDocument=new WeakMap<Document,Map<HTMLElement,{owned:Element[];attributes:Record<string,string|null>}>>();
/** Mount into authored fallback DOM; asset resolver is owned by the calling app. */
export function mountHalftone(root:HTMLElement,props:HalftoneProps,imageUrl?:string){
 const original={role:root.getAttribute('role'),tabindex:root.getAttribute('tabindex'),label:root.getAttribute('aria-label')};
 const fallback=root.querySelector<HTMLImageElement>('img[data-arclen-halftone-image]');
 if(!fallback)throw Error('halftone-fallback-missing');
 const attributes=Object.fromEntries(['role','tabindex','aria-label','data-state','data-rendering','data-points','data-cursor','data-frames','data-moving'].map(name=>[name,root.getAttribute(name)]));
 const engine=new HalftonePortrait(root,{...props,src:imageUrl??fallback.src});
 const entries=mountedByDocument.get(root.ownerDocument)??new Map();entries.set(root,{owned:[engine.canvas,engine.status],attributes});mountedByDocument.set(root.ownerDocument,entries);
 let currentProps=props;
 const update=(next:HalftoneProps,url?:string)=>{currentProps=next;engine.setOptions({...next,src:url??fallback.src});if(engine.image?.src!==(url??fallback.src))void engine.setImage(url??fallback.src,next.alt);};
 return {engine,update,pause(){engine.setOptions({motion:false});},resume(){engine.setOptions({motion:currentProps.motion});},destroy(){entries.delete(root);engine.destroy();for(const [key,value]of Object.entries({role:original.role,tabindex:original.tabindex,'aria-label':original.label})){if(value===null)root.removeAttribute(key);else root.setAttribute(key,value);}for(const key of ['state','rendering','points','cursor','frames','moving'])delete root.dataset[key];for(const key of ['--halftone-cursor-x','--halftone-cursor-y'])root.style.removeProperty(key);}};
}

/** Restore only renderer-owned mutations in an editor clone, without interrupting the live canvas. */
export function restoreHalftoneSource(doc:Document,clone:HTMLElement):void{
 const entries=mountedByDocument.get(doc);if(!entries)return;
 const originals=[doc.documentElement,...doc.documentElement.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
 for(const [root,state] of entries){
  const copy=copies[originals.indexOf(root)];if(!copy)continue;
  for(const node of state.owned)copies[originals.indexOf(node)]?.remove();
  for(const [name,value] of Object.entries(state.attributes)){if(value===null)copy.removeAttribute(name);else copy.setAttribute(name,value);}
  if('style' in copy){for(const key of ['--halftone-cursor-x','--halftone-cursor-y'])(copy as HTMLElement).style.removeProperty(key);if(!copy.getAttribute('style'))copy.removeAttribute('style');}
 }
}
