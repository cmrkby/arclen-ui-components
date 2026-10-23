import manifest from '../../component.json';
import {admittedLogoData} from './logo-data';
import {createEngine, EASE, EASE_IN, EASE_OUT} from './engine';
export interface Settings {
  layout: 'embedded' | 'fixed'; height: number; closedWidth: number; openWidth: number; topOffset: number; radius: number; mainLinkSize: number;
  logoMode: 'arclen' | 'text' | 'custom'; logoText: string; logoImage: string; logoHref: string;
  primaryLabels: string[]; primaryUrls: string[]; secondaryLabels: string[]; secondaryUrls: string[]; tagline: string; showSecondary: boolean;
  surface: string; foreground: string; toggleColor: string; ruleColor: string; surfaceOpacity: number; ruleOpacity: number; glassBlur: number; scrimOpacity: number; motionScale: number; closeOnSelect: boolean; initialOpen: boolean;
}
export interface Controller {update(input: Partial<Settings>): void; pause(): void; resume(): void; destroy(): void; setOpen(open: boolean): void; readonly isOpen: boolean}
export const defaults = Object.freeze(Object.fromEntries(manifest.settings.map(row => [row.key, Array.isArray(row.default) ? Object.freeze([...row.default]) : row.default]))) as unknown as Readonly<Settings>;
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const controls = /[\u0000-\u0020\u007f\\]/;
function safeUrl(url: string, image = false) {
  if (image && /^data:/i.test(url)) {
    if (url.length > 262144) return false;
    if (url === admittedLogoData) return true;
    return /^data:image\/(?:png|jpeg|webp|gif|avif);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(url) && !url.endsWith(',');
  }
  if (image && url.length > 2048) return false;
  if (!url || controls.test(url) || url.startsWith('//')) return false;
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) return (image ? /^https:\/\//i : /^(?:https?:\/\/|mailto:|tel:)/i).test(url);
  return !image || /^(?:\.?\.?\/)?[\w-][\w./%-]*$/.test(url);
}
export function resolveSettings(input: unknown = {}): Settings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Settings must be an object');
  const result = Object.fromEntries(Object.entries(defaults).map(([key, val]) => [key, Array.isArray(val) ? [...val] : val]));
  for (const [key, val] of Object.entries(input)) {
    const rule = manifest.settings.find(row => row.key === key); if (!rule) throw new Error(`Unknown setting: ${key}`);
    if (rule.kind === 'number') {if (typeof val !== 'number' || !Number.isFinite(val) || val < rule.min! || val > rule.max!) throw new Error(`Invalid number: ${key}`);}
    else if (rule.kind === 'boolean') {if (typeof val !== 'boolean') throw new Error(`Invalid boolean: ${key}`);}
    else if (rule.kind === 'string-list') {if (!Array.isArray(val) || val.length > rule.maxItems! || val.some(v => typeof v !== 'string' || !v.trim() || v.length > rule.maxItemLength!)) throw new Error(`Invalid list: ${key}`);}
    else {
      if (typeof val !== 'string' || val.length > (rule.maxLength ?? 100000)) throw new Error(`Invalid text: ${key}`);
      if (rule.kind === 'select' && !rule.options?.includes(val)) throw new Error(`Invalid selection: ${key}`);
      if (rule.kind === 'color' && !/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(val)) throw new Error(`Invalid color: ${key}`);
    }
    result[key] = Array.isArray(val) ? [...val] : val;
  }
  const s = result as unknown as Settings;
  if (!s.logoText.trim()) throw new Error('Logo text must not be empty');
  for (const kind of ['primary','secondary'] as const) {
    if (s[`${kind}Labels`].length !== s[`${kind}Urls`].length) throw new Error(`Mismatched ${kind} links`);
    if (s[`${kind}Urls`].some(url => !safeUrl(url))) throw new Error(`Invalid ${kind} destination`);
  }
  if (!safeUrl(s.logoHref) || (s.logoImage && !safeUrl(s.logoImage, true))) throw new Error('Invalid logo URL');
  return s;
}
const arrow = '<span class="gn-arrow" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V4M6 10l6-6 6 6"/></svg></span>';
let sequence = 0;
export function render(input: Partial<Settings> = {}, id = `growing-navigation-${++sequence}`) {
  const s = resolveSettings(input), key = escape(id), rgba = (color: string, alpha: number) => `rgb(${parseInt(color.slice(1,3),16)} ${parseInt(color.slice(3,5),16)} ${parseInt(color.slice(5,7),16)} / ${alpha * (color.length === 9 ? parseInt(color.slice(7,9),16)/255 : 1)})`;
  const style = `--gn-height:${s.height}px;--gn-closed:${s.closedWidth}px;--gn-open:${s.openWidth}px;--gn-top:${s.topOffset}px;--gn-radius:${s.radius}px;--gn-main-size:${s.mainLinkSize}px;--gn-bg:${rgba(s.surface,s.surfaceOpacity)};--gn-ink:${s.foreground};--gn-bar:${s.toggleColor};--gn-rule:${rgba(s.ruleColor,s.ruleOpacity)};--gn-glass:blur(${s.glassBlur}px) saturate(100%) brightness(1.5);--gn-scrim:rgb(0 0 0 / ${s.scrimOpacity});--gn-room:${s.height - s.topOffset - 64}px`;
  const logo = s.logoMode === 'arclen' ? '<span class="gn-wordmark" aria-hidden="true"></span>' : s.logoMode === 'custom' && s.logoImage ? `<img src="${escape(s.logoImage)}" alt="">` : `<span class="gn-logo-text" aria-hidden="true">${escape(s.logoText)}</span>`;
  const links = (labels: string[], urls: string[], primary: boolean) => labels.map((label,i) => `${primary ? '<div class="gn-item">' : ''}<a class="${primary ? 'gn-link' : 'gn-secondary-link'}" href="${escape(urls[i])}"><span>${escape(label)}</span>${arrow}</a>${primary ? '</div>' : ''}`).join('');
  return `<div class="aui-growing-stage" data-layout="${s.layout}" style="${style}"><div class="gn-scrim" ${s.layout === 'fixed' ? 'data-fixed ' : ''}hidden></div><header class="aui-growing" data-layout="${s.layout}"><div class="gn-inner"><nav class="gn-panel" aria-label="${escape(s.logoText)} navigation"><div class="gn-head"><a class="gn-logo" href="${escape(s.logoHref)}" aria-label="${escape(s.logoText)}">${logo}</a><button class="gn-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="${key}-body"><span class="gn-bar"></span><span class="gn-bar"></span></button><div class="gn-divider"></div></div><div class="gn-body" id="${key}-body" inert aria-hidden="true"><div class="gn-content"><div class="gn-links">${links(s.primaryLabels,s.primaryUrls,true)}</div>${s.showSecondary ? `<div class="gn-side"><p class="gn-item gn-tagline">${escape(s.tagline)}</p><div class="gn-item gn-social">${links(s.secondaryLabels,s.secondaryUrls,false)}</div></div>` : ''}</div></div></nav></div></header></div><noscript><style>.aui-growing-stage{display:none}</style><nav aria-label="${escape(s.logoText)} navigation" style="padding:24px;background:${s.surface};color:${s.foreground};font:16px sans-serif"><a href="${escape(s.logoHref)}" style="color:inherit">${escape(s.logoText)}</a>${s.primaryLabels.map((label,i)=>`<p><a style="color:inherit" href="${escape(s.primaryUrls[i])}">${escape(label)}</a></p>`).join('')}${s.showSecondary?s.secondaryLabels.map((label,i)=>`<p><a style="color:inherit" href="${escape(s.secondaryUrls[i])}">${escape(label)}</a></p>`).join(''):''}</nav></noscript>`;
}
// A shared owner set prevents one fixed sheet restoring another sheet's scroll lock.
const modalOwners = new WeakMap<Document, Set<object>>();
function modal(doc: Document, owner: object, active: boolean) {
  let owners = modalOwners.get(doc); if (!owners) {owners = new Set();modalOwners.set(doc,owners);}
  if (active) owners.add(owner); else owners.delete(owner);
  return [...owners].at(-1) === owner;
}
const scrollOwners = new WeakMap<Document, {owners: Set<object>; previous: string}>();
function lock(doc: Document, owner: object, next: boolean) {
  let entry = scrollOwners.get(doc);
  if (next) {if (!entry) {entry = {owners:new Set(),previous:doc.body.style.overflow};scrollOwners.set(doc,entry);} entry.owners.add(owner);doc.body.style.overflow='hidden';}
  else if (entry?.owners.delete(owner) && !entry.owners.size) {doc.body.style.overflow=entry.previous;scrollOwners.delete(doc);}
}
export function mount(host: HTMLElement, input: Partial<Settings> = {}, id = `growing-navigation-${++sequence}`): Controller {
  const doc = host.ownerDocument, browser = doc.defaultView; if (!browser) throw new Error('Mount requires a browser document');
  const view: Window = browser;
  let settings = resolveSettings(input), open = settings.initialOpen, paused = false, visible = true, destroyed = false;
  const owner = {}, media = typeof view.matchMedia === 'function' ? view.matchMedia('(prefers-reduced-motion: reduce)') : undefined;
  let cleanup = () => {}, engine = createEngine(view), paint = () => {}, toggle: HTMLButtonElement, root: HTMLElement, panel: HTMLElement, body: HTMLElement, stage: HTMLElement;
  let narrow = false, previousFocus: Element | null = null;
  const suspended = () => !visible || doc.hidden;
  const blocked = () => paused || suspended();
  const speed = () => media?.matches || blocked() ? 0 : settings.motionScale;
  function syncAccessibility() {
    toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close menu':'Open menu');
    body.inert=!open;body.setAttribute('aria-hidden',String(!open));root.toggleAttribute('data-open',open);
    if (narrow && open) {panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');} else {panel.removeAttribute('role');panel.removeAttribute('aria-modal');}
    modal(doc,owner,open && narrow && !suspended());
    lock(doc,owner,open && narrow && settings.layout === 'fixed' && !suspended());
  }
  function setOpen(next: boolean, restore = false) {
    if (destroyed) return; if (next === open) return;
    if (next) previousFocus=doc.activeElement;
    open=next;syncAccessibility();paint();
    if (!next && (restore || body.contains(doc.activeElement))) {const target=previousFocus && host.contains(previousFocus) ? previousFocus as HTMLElement : toggle;target.focus({preventScroll:true});}
    host.dispatchEvent(new CustomEvent('growing-navigation-change',{detail:{open},bubbles:true}));
  }
  function build() {
    host.innerHTML=render(settings,id);stage=host.querySelector('.aui-growing-stage')!;root=host.querySelector('.aui-growing')!;panel=host.querySelector('.gn-panel')!;body=host.querySelector('.gn-body')!;toggle=host.querySelector('.gn-toggle')!;
    const content=host.querySelector<HTMLElement>('.gn-content')!,scrim=host.querySelector<HTMLElement>('.gn-scrim')!,divider=host.querySelector<HTMLElement>('.gn-divider')!;
    const value=engine.value, tween=engine.tween;let hover=false;
    const pp={paint:()=>{panel.style.width=`${P.w.v}px`;panel.style.transform=`translate(${P.x.v}px,${P.y.v}px)`;panel.style.borderRadius=`${P.r.v}px`;}};
    const P={w:value(0,pp),x:value(0,pp),y:value(0,pp),r:value(settings.radius,pp)};
    const bp={paint:()=>{body.style.height=`${B.v}px`;}};const B=value(0,bp);
    const sp={paint:()=>{scrim.style.opacity=String(S.v);if(!open && S.v===0)scrim.hidden=true;}};const S=value(0,sp);
    const dp={paint:()=>{divider.style.opacity=String(D.v);}};const D=value(0,dp);
    const bars=[...toggle.querySelectorAll<HTMLElement>('.gn-bar')].map((el,i)=>{const p={paint:()=>{el.style.width=`${b.w.v}px`;el.style.transform=`translate(${b.x.v}px,${b.y.v}px) rotate(${b.rot.v}deg)`;}};const b={w:value(i?17:27,p),x:value(i?5:0,p),y:value(i?5:-5,p),rot:value(0,p)};return b;});
    const blocks=[...host.querySelectorAll<HTMLElement>('.gn-item')].map(el=>{const drop=parseFloat(view.getComputedStyle(el).fontSize)*1.25;const p={paint:()=>{el.style.opacity=String(k.o.v);el.style.filter=`blur(${k.blur.v}px)`;el.style.transform=`translateY(${k.y.v}px)`;}};const k={o:value(0,p),blur:value(4,p),y:value(drop,p),drop};return k;});
    const groups=['.gn-link','.gn-social a'].map((selector,g)=>[...host.querySelectorAll<HTMLElement>(selector)].map(el=>{const arrow=el.querySelector<HTMLElement>('.gn-arrow')!,shift=g?4:6;const p={paint:()=>{el.style.opacity=String(k.o.v);arrow.style.opacity=String(k.ao.v);arrow.style.transform=`translate(${k.x.v}px,${k.y.v}px)`;}};const k={el,o:value(1,p),ao:value(0,p),x:value(-shift,p),y:value(shift,p),shift,duration:g?.2:.25};return k;}));
    function geometry() {
      const box=root.getBoundingClientRect(),bounds=settings.layout==='fixed'?{width:view.innerWidth,height:view.innerHeight,left:0,top:0}:stage.getBoundingClientRect();
      narrow=bounds.width<=767;root.toggleAttribute('data-narrow',narrow);syncAccessibility();
      const width=open?(narrow?bounds.width:Math.min(settings.openWidth,bounds.width-32)):box.width;
      const x=open?bounds.left+bounds.width/2-box.left-width/2:0,y=open&&narrow?bounds.top-box.top:0;
      const room=Math.max(0,bounds.height-(open&&narrow?0:settings.topOffset)-64);root.style.setProperty('--gn-room',`${room}px`);
      content.style.width=`${open?width:Math.min(settings.openWidth,bounds.width-32)}px`;content.style.minHeight=open&&narrow?`${room}px`:'';
      return {width,x,y,room,closedWidth:box.width};
    }
    const initial=geometry();P.w.v=initial.closedWidth;pp.paint();
    paint=()=>{
      engine.setSpeed(speed());const g=geometry(),move={duration:.72,ease:EASE,delay:open?0:.2};
      tween(P.w,g.width,move);tween(P.x,g.x,move);tween(P.y,g.y,move);tween(P.r,open&&narrow?0:settings.radius,move);
      tween(B,open?Math.min(g.room,content.scrollHeight):0,{duration:open?.72:.48,ease:EASE,delay:open?.22:0});
      if(open)scrim.hidden=false;tween(S,open?1:0,{duration:.48,ease:EASE});tween(D,open?1:0,{duration:.2,ease:EASE_OUT});
      const [top,bottom]=bars,bar={duration:.48,ease:EASE};
      tween(top.w,open?23:hover?17:27,bar);tween(top.x,!open&&hover?5:0,bar);tween(top.y,open?0:-5,bar);tween(top.rot,open?45:0,bar);
      tween(bottom.w,open?23:hover?27:17,bar);tween(bottom.x,open||hover?0:5,bar);tween(bottom.y,open?0:5,bar);tween(bottom.rot,open?-45:0,bar);
      blocks.forEach((k,i)=>{const step=open?{duration:.72,ease:EASE,delay:.46+.08*i}:{duration:.3,ease:EASE_IN,delay:.03*(blocks.length-1-i)};tween(k.o,open?1:0,step);tween(k.blur,open?0:4,step);tween(k.y,open?0:k.drop,step);});
    };
    const listeners:Array<()=>void>=[];
    const on=(target: EventTarget,type:string,fn:EventListener)=>{target.addEventListener(type,fn);listeners.push(()=>target.removeEventListener(type,fn));};
    on(toggle,'click',()=>setOpen(!open,true));on(toggle,'pointerenter',event=>{if((event as PointerEvent).pointerType!=='touch'&&!blocked()){hover=true;paint();}});on(toggle,'pointerleave',()=>{hover=false;paint();});
    on(scrim,'click',()=>setOpen(false,true));
    on(doc,'pointerdown',event=>{if(open&&!host.contains(event.target as Node))setOpen(false,true);});
    on(host,'click',event=>{const e=event as MouseEvent,link=(e.target as Element).closest?.('a');if(link&&settings.closeOnSelect&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey&&e.button===0)setOpen(false);});
    on(doc,'keydown',event=>{const e=event as KeyboardEvent;if(!open||suspended()||(narrow&&!modal(doc,owner,true)))return;if(e.key==='Escape' && (host.contains(doc.activeElement)||narrow)){e.preventDefault();setOpen(false,true);}if(e.key==='Tab'&&narrow){const nodes=[...panel.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')];const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&doc.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&doc.activeElement===last){e.preventDefault();first?.focus();}}});
    on(doc,'focusin',()=>{if(open&&narrow&&!suspended()&&modal(doc,owner,true)&&!panel.contains(doc.activeElement))toggle.focus({preventScroll:true});});
    groups.forEach(group=>group.forEach((k,index)=>{function highlight(active: number|null){if(blocked())return;engine.setSpeed(speed());group.forEach((v,i)=>{tween(v.o,active!==null&&active!==i?.3:1,{duration:.2,ease:EASE_OUT});const on=i===active;tween(v.ao,on?1:0,{duration:v.duration,ease:EASE_OUT});tween(v.x,on?0:-v.shift,{duration:v.duration,ease:EASE_OUT});tween(v.y,on?0:v.shift,{duration:v.duration,ease:EASE_OUT});});}on(k.el,'pointerenter',event=>{if((event as PointerEvent).pointerType!=='touch')highlight(index);});on(k.el,'pointerleave',()=>highlight(null));on(k.el,'focus',()=>highlight(index));on(k.el,'blur',()=>highlight(null));}));
    on(view,'resize',()=>paint());
    const resize=typeof ResizeObserver==='function'?new ResizeObserver(()=>paint()):undefined;resize?.observe(stage);
    cleanup=()=>{listeners.forEach(fn=>fn());resize?.disconnect();};
    engine.setSpeed(0);paint();engine.settle();engine.setSpeed(speed());
  }
  build();
  function visibility() {if(blocked()){engine.settle();syncAccessibility();}else{syncAccessibility();paint();}}
  const hidden=()=>visibility(),motion=()=>{if(media?.matches)engine.settle();paint();};doc.addEventListener('visibilitychange',hidden);media?.addEventListener?.('change',motion);
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;visibility();}):undefined;observer?.observe(host);
  return {
    get isOpen(){return open;},setOpen:next=>setOpen(next),
    update(input){if(destroyed)return;const next=resolveSettings({...settings,...input}),focus=host.contains(doc.activeElement),changed=next.initialOpen!==settings.initialOpen && open!==next.initialOpen;cleanup();engine.destroy();engine=createEngine(view);if(next.initialOpen!==settings.initialOpen)open=next.initialOpen;settings=next;build();if(focus)toggle.focus({preventScroll:true});if(changed)host.dispatchEvent(new CustomEvent('growing-navigation-change',{detail:{open},bubbles:true}));},
    pause(){if(destroyed||paused)return;paused=true;visibility();},resume(){if(destroyed||!paused)return;paused=false;visibility();},
    destroy(){if(destroyed)return;destroyed=true;cleanup();engine.destroy();observer?.disconnect();doc.removeEventListener('visibilitychange',hidden);media?.removeEventListener?.('change',motion);lock(doc,owner,false);modal(doc,owner,false);host.replaceChildren();}
  };
}
