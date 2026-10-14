export type SettingValue = string | number | boolean | string[];
export interface Setting { key: string; kind: 'select'|'text'|'string-list'|'number'|'boolean'|'color'|'image'; label:string; default:SettingValue; group?:string; description?:string; maxLength?:number; minItems?:number; maxItems?:number; maxItemLength?:number; min?:number; max?:number; step?:number; options?:Array<string|{label:string;value:string}> }
export interface Asset { path:string; gallery?:boolean; rights:{kind:'original'|'licensed';license?:string;attribution:string};contentType?:string }
export interface ComponentManifest { id:string;version:string;tier:'free'|'pro';name:string;category:string;description:string;keywords:string[];settings:Setting[];targets:Array<'react'|'html'|'vanilla'>;dependencies:Record<string,string>;remoteScripts?:string[];assets:Asset[];poster:string;motion:{reducedMotion:string;pauseOffscreen:boolean};previews:Array<{name:string;settings:Record<string,SettingValue>}> }
export interface HtmlBundleManifest {schema:'arclen-ui-html/1';id:string;version:string;tier:'free'|'pro';settings:Setting[];assets:Asset[];files:Array<{path:string;sha256:string;bytes:number}>}
export function defaultSettings(manifest:ComponentManifest):Record<string,SettingValue>{return Object.fromEntries(manifest.settings.map(s=>[s.key,s.default]));}
export function validateSettings(manifest:ComponentManifest,input:unknown):Record<string,SettingValue>{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Settings must be an object');
 const given=input as Record<string,unknown>,result=defaultSettings(manifest);
 for(const key of Object.keys(given)){const s=manifest.settings.find(s=>s.key===key);if(!s)throw new Error('Unknown setting: '+key);const v=given[key];
 const type=typeof v;
 if(s.kind==='number'){if(type!=='number'||!Number.isFinite(v)||(s.min!==undefined&&(v as number)<s.min)||(s.max!==undefined&&(v as number)>s.max))throw new Error('Invalid number: '+key);}
 else if(s.kind==='boolean'){if(type!=='boolean')throw new Error('Invalid boolean: '+key);}
 else if(s.kind==='string-list'){if(!Array.isArray(v)||v.some(x=>typeof x!=='string')||v.length>(s.maxItems??100)||v.length<(s.minItems??0)||v.some(x=>typeof x==='string'&&x.length>(s.maxItemLength??100000)))throw new Error('Invalid string list: '+key);}
 else {if(type!=='string'||(v as string).length>(s.maxLength??100000))throw new Error('Invalid text: '+key);
 if(s.kind==='select'&&!s.options?.some(o=>(typeof o==='string'?o:o.value)===v))throw new Error('Invalid selection: '+key);
 if(s.kind==='color'&&v!=='transparent'&&!/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v as string))throw new Error('Invalid color: '+key);
 if(s.kind==='image'&&v!==''&&!/^(?:data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+|blob:https?:\/\/[^\s]+|https:\/\/[^\s]+|(?:\.?\.?\/)?[A-Za-z0-9_-][A-Za-z0-9_./-]*)$/.test(v as string))throw new Error('Invalid image: '+key);}
 result[key]=v as SettingValue;
 }
 return result;
}
