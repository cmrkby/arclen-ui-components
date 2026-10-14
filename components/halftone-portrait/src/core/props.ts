import manifest from "../../component.json";
export interface HalftoneProps {
 src:string;alt:string;spacing:number;size:number;variation:number;threshold:number;contrast:number;exposure:number;alphaGamma:number;opacity:number;
 color:string;accent:string;accentAmount:number;colorMode:'duotone'|'original'|'photo';fit:'cover'|'contain';scale:number;focalX:number;focalY:number;
 radius:number;force:number;returnSpeed:number;cursorSmoothing:number;releaseSpeed:number;falloff:number;cursorMode:'repel'|'attract'|'swirl';showCursor:boolean;cursorColor:string;motion:boolean;
 background:string;borderRadius:number;fade:number;aspectRatio:number;
}
/** Shared Arclen component contract. No framework, browser, or network dependencies. */
export const COMPONENT_ID='halftone-portrait';
export const COMPONENT_VERSION=manifest.version;
export const DEFAULT_PROPS:Readonly<HalftoneProps>= Object.freeze(Object.fromEntries(manifest.settings.map(setting => [setting.key, setting.default]))) as unknown as Readonly<HalftoneProps>;
export const BOUNDS:Readonly<Partial<Record<keyof HalftoneProps,readonly [number,number]>>>=Object.freeze({spacing:[2,12],size:[.5,4],variation:[0,1],threshold:[0,.9],contrast:[.25,4],exposure:[.25,3],alphaGamma:[.2,2.5],opacity:[0,1],accentAmount:[0,1],scale:[.4,3],focalX:[0,1],focalY:[0,1],radius:[20,500],force:[0,140],returnSpeed:[.02,1],cursorSmoothing:[.02,1],releaseSpeed:[.02,1],falloff:[1,5],borderRadius:[0,100],fade:[0,.7],aspectRatio:[.3,3]});

export function parseHalftoneProps(input:unknown):{ok:true;value:HalftoneProps}|{ok:false;error:string}{
 if(!input||typeof input!=='object'||Array.isArray(input))return {ok:false,error:'invalid-props'};
 const v=input as Record<string,unknown>;
 if(Object.keys(v).length!==Object.keys(DEFAULT_PROPS).length)return {ok:false,error:'invalid-props'};
 for(const k of Object.keys(DEFAULT_PROPS) as (keyof HalftoneProps)[]){
  const value=v[k],bounds=BOUNDS[k];
  if(bounds){if(typeof value!=='number'||!Number.isFinite(value)||value<bounds[0]||value>bounds[1]||(k==='spacing'&&!Number.isInteger(value)))return {ok:false,error:'invalid-'+k};}
  else if(k==='src'){if(typeof value!=='string'||!isImageSource(value))return {ok:false,error:'invalid-src'};}
  else if(k==='alt'){if(typeof value!=='string'||value.length>500)return {ok:false,error:'invalid-alt'};}
  else if(k==='motion'||k==='showCursor'){if(typeof value!=='boolean')return {ok:false,error:'invalid-'+k};}
  else if(k==='fit'){if(value!=='cover'&&value!=='contain')return {ok:false,error:'invalid-fit'};}
  else if(k==='colorMode'){if(value!=='duotone'&&value!=='original'&&value!=='photo')return {ok:false,error:'invalid-colorMode'};}
  else if(k==='cursorMode'){if(value!=='repel'&&value!=='attract'&&value!=='swirl')return {ok:false,error:'invalid-cursorMode'};}
  else if(!(k==='background'&&value==='transparent')&&(typeof value!=='string'||!/^#[\da-f]{6}$/i.test(value)))return {ok:false,error:'invalid-'+k};
 }
 return {ok:true,value:Object.fromEntries(Object.keys(DEFAULT_PROPS).map(key=>[key,v[key]])) as unknown as HalftoneProps};
}
export function resolveHalftoneProps(patch:Partial<HalftoneProps>={}):HalftoneProps{
 const result=parseHalftoneProps({...DEFAULT_PROPS,...patch});if(result.ok === false)throw Error(result.error);return result.value;
}

export function isImageSource(value:string):boolean {return /^(ronin|eclipse|sentinel)$/.test(value)||/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value)||/^blob:https?:\/\//.test(value)||/^https?:\/\//.test(value)||(/^(?:\.?\.?\/|\/)?[A-Za-z0-9][A-Za-z0-9/_ .-]*\.(?:png|jpe?g|webp|gif)$/i.test(value)&&!value.includes(".."));}
