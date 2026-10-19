import manifest from '../../component.json';
export interface TitleSettings {titleKind:'wordmark'|'text'|'logo';logo:string;logoAspect:number}
const selected=(key:string)=>manifest.settings.find(rule=>rule.key===key)!.default;
export const titleDefaults:TitleSettings={titleKind:selected('titleKind') as TitleSettings['titleKind'],logo:String(selected('logo')),logoAspect:Number(selected('logoAspect'))};
export function validLogo(value:unknown):value is string {return typeof value==='string'&&value.length<=2000000&&/^(?:data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+|(?:blob:https?|https):\/\/[^\s"'<>\\]+|(?:\.?\.?\/)?[A-Za-z0-9_-][A-Za-z0-9_./-]*)$/.test(value);}
export function resolveTitle(input:unknown):TitleSettings {
 const value=input&&typeof input==='object'?input as Record<string,unknown>:{};
 return {titleKind:['wordmark','text','logo'].includes(String(value.titleKind))?value.titleKind as TitleSettings['titleKind']:titleDefaults.titleKind,
 logo:validLogo(value.logo)?value.logo:titleDefaults.logo,
 logoAspect:typeof value.logoAspect==='number'&&Number.isFinite(value.logoAspect)?Math.max(.5,Math.min(10,value.logoAspect)):titleDefaults.logoAspect};
}
/** Leave room for the same visible settle inside narrow frames and cards. */
export const compactTitleScale=1.22;
export function titleWidth(width:number):number {
 const margin=width<480?16:width<1200?24:40;
 return width<1200?(width-margin*2)/compactTitleScale:Math.min(680,width*.4722);
}
export function titleSettle(viewport:{width:number;height:number},box:{x:number;y:number;width:number;height:number},scale:number,travel:number):{scale:number;travel:number} {
 if(viewport.width>=1200)return {scale,travel};
 if(box.width<=0||box.height<=0)return {scale:1,travel:0};
 const x=box.x+box.width/2,y=box.y+box.height/2,padding=8;
 const available=Math.min(2*(x-padding)/box.width,2*(viewport.width-padding-x)/box.width,2*(y-padding)/box.height,2*(viewport.height-padding-y)/box.height);
 const fitted=Math.max(1,Math.min(scale,compactTitleScale,available));
 return {scale:fitted,travel:Math.min(travel,Math.max(0,viewport.height-padding-y-box.height*fitted/2))};
}
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function renderTitle(s:TitleSettings&{label:string}):string {
 if(s.titleKind==='wordmark')return `<span class="pt-title-art" data-title-aspect="${640.67/163.5}" style="display:block;aspect-ratio:640.67/163.5"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640.67 163.5" width="100%" height="100%" style="display:block" aria-hidden="true"><path fill="currentColor" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" d="M105.79,45.2h14.45v114.5h-14.45v-19.62c-12.51,15.09-28.25,22.42-46.14,22.42-33.42,0-58.65-27.81-58.65-60.37s25.87-59.94,59.08-59.94c18.54,0,34.28,7.98,45.71,23.93v-20.92ZM16.09,102.56c0,24.8,19.41,46.57,45.07,46.57,23.5,0,45.71-17.68,45.71-46.14,0-26.52-19.84-46.57-45.5-46.57s-45.28,21.56-45.28,46.14Z"/><path fill="currentColor" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" d="M163.15,61.81c8.62-12.51,17.9-19.62,29.54-19.62,6.68,0,10.13,2.16,13.15,3.88l-7.76,12.51c-1.73-.86-4.53-2.16-7.76-2.16-10.78,0-20.48,9.27-24.8,25.01-1.94,7.33-2.37,19.19-2.37,34.71v43.56h-15.52V45.2h15.52v16.6Z"/><path fill="currentColor" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" d="M328.1,136.63c-11.21,17.03-30.62,25.87-53.69,25.87-37.73,0-62.96-27.17-62.96-59.08,0-33.64,26.31-61.24,64.04-61.24,21.99,0,42.05,9.06,52.61,26.74l-11.86,7.33c-10.13-13.37-24.15-19.84-41.4-19.84-29.11,0-48.3,21.35-48.3,45.93s18.97,46.79,48.51,46.79c16.6,0,30.4-6.68,41.18-20.05l11.86,7.55Z"/><path fill="currentColor" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" d="M354.19,1h14.66v158.7h-14.66V1Z"/><path fill="currentColor" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" d="M409.17,103.64c.65,26.31,18.54,45.5,43.12,45.5s35.36-13.58,43.77-27.38l12.29,6.47c-11.64,22.86-29.54,34.28-54.55,34.28-37.95,0-59.73-29.11-59.73-59.73s23.07-60.59,58.86-60.59c32.56,0,58.87,23.5,59.3,61.45h-103.07ZM496.07,90.7c-6.04-23.72-23.07-34.28-42.91-34.28s-35.79,11-42.48,34.28h85.39Z"/><path fill="currentColor" stroke="currentColor" stroke-width="2" stroke-miterlimit="10" d="M554.29,65.69c11.86-15.52,26.09-23.5,42.91-23.5,25.01,0,42.48,17.25,42.48,53.26v64.25h-14.66v-62.31c0-26.95-8.41-41.83-30.62-41.83-12.29,0-22.42,5.39-30.19,15.52-8.62,11.21-9.92,22.42-9.92,40.54v48.08h-14.66V45.2h14.66v20.48Z"/></svg></span>`;
 if(s.titleKind==='logo'&&validLogo(s.logo)){
  const mask=`url(${JSON.stringify(s.logo)})`;
  const style=`display:block;aspect-ratio:${s.logoAspect};background:currentColor;mask-image:${mask};mask-size:100% 100%;mask-repeat:no-repeat;mask-mode:alpha;-webkit-mask-image:${mask};-webkit-mask-size:100% 100%;-webkit-mask-repeat:no-repeat`;
  return `<span class="pt-title-art" data-title-aspect="${s.logoAspect}" style="${escape(style)}"></span>`;
 }
 return escape(s.label);
}
export function fitGraphicTitle(title:HTMLElement,width:number,height:number):boolean {
 const art=title.querySelector<HTMLElement>('.pt-title-art');
 title.style.width='';title.style.fontSize='';
 if(!art)return false;
 const aspect=Number(art.dataset.titleAspect)||1;
 title.style.width=`${Math.min(titleWidth(width),height*.34*aspect)}px`;
 return true;
}
/** Each vertical segment has the same six horizontal slices and stagger as a letter. */
export function graphicSlices(word:HTMLElement,destination:HTMLElement):{slice:HTMLElement;glyph:number;band:number}[]{
 const art=destination.querySelector<HTMLElement>('.pt-title-art');if(!art)return [];
 const rect=destination.getBoundingClientRect(),cuts=art.querySelector('svg')?[0,134,210,341,383,525,640.67].map(x=>x/640.67):[0,1/6,2/6,3/6,4/6,5/6,1];
 word.style.width=`${rect.width}px`;word.style.height=`${rect.height}px`;
 const result:{slice:HTMLElement;glyph:number;band:number}[]=[],clips=[[-25.4,99.6],[-.4,74.6],[24.6,49.6],[49.6,24.6],[74.6,-.4],[99.6,-25.4]];
 for(let g=0;g<6;g++){
  const glyph=word.ownerDocument.createElement('span');glyph.className='pt-glyph';glyph.style.cssText=`display:block;flex:none;height:100%;width:${(cuts[g+1]-cuts[g])*100}%;overflow:hidden`;
  word.append(glyph);
  clips.forEach(([top,bottom],i)=>{
   const slice=word.ownerDocument.createElement('span'),copy=art.cloneNode(true) as HTMLElement;
   slice.style.clipPath=`inset(${top}% -20% ${bottom}% -20%)`;
   copy.removeAttribute('data-title-aspect');copy.style.cssText+=`;position:absolute;left:${-cuts[g]*rect.width}px;top:0;width:${rect.width}px;height:${rect.height}px;aspect-ratio:auto;`;
   slice.append(copy);glyph.append(slice);result.push({slice,glyph:g,band:i});
  });
 }
 return result;
}
