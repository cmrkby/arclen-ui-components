import {units} from './units';
import { photoPreview } from './photo-preview';
import manifest from '../../component.json';
const portfolios = new URL('../../assets/sill-reader.webp', import.meta.url).href;
const studios = new URL('../../assets/cove-lounge.webp', import.meta.url).href;
const businesses = new URL('../../assets/moss-slipper.webp', import.meta.url).href;

const cards = [
  {key:'portfolios', photo:portfolios, alt:'Side profile of a saddle-leather reading chair in a curved walnut shell on bronze sleds', note:'A narrow band of exposed ply follows the curve of the back and sweeps under the seat.'},
  {key:'studios', photo:studios, alt:'Ivory bouclé lounge chair with a curved back and a pale ash frame', note:'The rounded front rail meets the tapered ash legs in exposed joints.'},
  {key:'businesses', photo:businesses, alt:'Low armless chair in moss-green mohair on a dark oak plinth', note:'A narrow gap separates the back cushion from the seat. The oak base follows the soft curve of the upholstered corners.'},
];
type Settings = Record<string,string|number>;
export const defaults: Settings = Object.fromEntries(manifest.settings.map(r=>[r.key,r.default]));
export function resolveSettings(input:unknown={}):Settings {
  const values = (input && typeof input==='object'?input:{}) as Record<string,unknown>;
  const result = {...defaults};
  for(const r of manifest.settings) {
    const v=values[r.key];
    if(r.kind==='number' && typeof v==='number' && Number.isFinite(v)) result[r.key]=Math.max(r.min!,Math.min(r.max!,v));
    if(typeof v!=='string') continue;
    if(r.kind==='color' && /^#[\da-f]{6}$/i.test(v)) result[r.key]=v;
    if(r.kind==='select' && r.options?.some(o=>o.value===v)) result[r.key]=v;
    if(r.kind==='text' && v.trim()){
      if(r.key.endsWith('Url')){
        try { const url=new URL(v); if(['http:','https:'].includes(url.protocol))result[r.key]=url.href; } catch { /* Keep default while a URL is incomplete. */ }
      }else result[r.key]=v.slice(0,r.key.endsWith('Body')?260:72);
    }
  }
  return result;
}
const escape=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function vars(s:Settings) {
  const tweaks: Record<string,string> = {};
  for (const rule of manifest.settings) {
    if (units[rule.key] !== undefined) tweaks['--aud-' + rule.key] = String(s[rule.key]) + units[rule.key];
  }
  return {...tweaks,'--aud-gap':s.gap+'px','--aud-radius':s.radius+'px','--aud-height':s.height+'px','--aud-stack':s.stackHeight+'px',
    '--aud-weight':String(s.share),'--aud-unit':(1/Number(s.speed))+'ms','--aud-zoom':String(s.zoom),'--aud-canvas':String(s.canvas),
    '--aud-accent':String(s.accent),'--aud-opacity':String(Number(s.tintStrength)/100)};
}
export function render(input:unknown={}) {
  const s=resolveSettings(input);
  const style=Object.entries(vars(s)).map(([k,v])=>k+':'+v).join(';');
  return `<section class="aud-scene" style="${style}" aria-label="Furniture collection"><div class="aud-container"><div class="aud-deck">${cards.map(({key,photo,alt},i)=>{
    const open=s.initialCard===key, t=(suffix:string)=>escape(s[key+suffix]);
    return `<article class="aud-card" data-open="${open}" style="--aud-tint:${t('Tint')};--aud-focus:${t('Focus')}%">
      <div class="aud-media"><img src="${escape(photo)}" alt="${open?alt:''}" draggable="false"></div>
      <div class="aud-copy"><div class="aud-header"><span class="aud-kicker"><span class="aud-full">${t('Label')}</span><span class="aud-short" aria-hidden="true">0${i+1}</span></span><span class="aud-plus" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5v14"/></svg></span></div>
      <div class="aud-bottom"><div class="aud-title"><h3>${t('Title')}</h3></div><div class="aud-reveal" aria-hidden="${!open}"><div><p>${t('Body')}</p><span class="aud-pill">${t('Action')}<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 15.5 15.5 4.5M6 4.5h9.5V14"/></svg></span></div></div></div></div>
      <button class="aud-hit aud-select" type="button" aria-label="Expand ${t('Title')}" ${open?'hidden':''}></button>
      <button class="aud-hit aud-project" type="button" aria-haspopup="dialog" aria-label="${t('Title')} ${t('Action')}" ${open&&!s[key+'Url']?'':'hidden'}></button>
      <a class="aud-hit" href="${t('Url')}" target="_blank" rel="noopener noreferrer" aria-label="${t('Title')} ${t('Action')}" ${open&&s[key+'Url']?'':'hidden'}></a></article>`;
  }).join('')}</div></div><dialog class="aud-study" aria-label="Product details"><div class="aud-study-panel"><form method="dialog"><button aria-label="Close product">Close</button></form><img width="1536" height="1024" alt=""><div class="aud-study-copy"><small></small><h2></h2><div class="aud-spec"><strong></strong><span></span></div><p></p><p></p></div></div></dialog></section>`;
}
export function mount(host:HTMLElement,input:unknown={},_id?:string,options:{paused?:boolean}={}) {
  let s=resolveSettings(input), active=cards.findIndex(c=>c.key===s.initialCard);
  host.innerHTML=render(s);
  const scene=host.querySelector<HTMLElement>('.aud-scene')!;
  const win=host.ownerDocument.defaultView!;
  const abort=new win.AbortController();
  const nodes=Array.from(scene.querySelectorAll<HTMLElement>('.aud-card'));
  const dialog=scene.querySelector<HTMLDialogElement>('.aud-study')!;
  const preview=photoPreview(dialog,abort.signal);
  function openProject(i:number) {
    const {key,photo,alt,note}=cards[i];
    const image=dialog.querySelector('img')!;
    image.src=photo;image.alt=alt;
    const title=String(s[key+'Title']);
    dialog.setAttribute('aria-label',title+' product details');
    dialog.querySelector('small')!.textContent=String(s[key+'Label'])+' · Studio collection';
    dialog.querySelector('h2')!.textContent=title;
    dialog.querySelector('.aud-spec strong')!.textContent=String(s[key+'Price']);
    dialog.querySelector('.aud-spec span')!.textContent=String(s[key+'Materials']);
    const [intro,detail]=dialog.querySelectorAll('p');
    intro.textContent=String(s[key+'Body']);detail.textContent=note;
    preview.open(nodes[i]);
  }
  function select(i:number,keyboard=false) {
    active=i;
    nodes.forEach((el,n)=>{
      const open=n===i;
      el.dataset.open=String(open);
      el.querySelector('img')!.alt=open?cards[n].alt:'';
      el.querySelector<HTMLButtonElement>('.aud-select')!.hidden=open;
      const external=Boolean(s[cards[n].key+'Url']);
      el.querySelector<HTMLButtonElement>('.aud-project')!.hidden=!open||external;
      el.querySelector('a')!.hidden=!open||!external;
      el.querySelector('.aud-reveal')!.setAttribute('aria-hidden',String(!open));
    });
    if(keyboard)nodes[i].querySelector<HTMLElement>('.aud-hit:not([hidden])')!.focus({preventScroll:true});
  }
  nodes.forEach((el,i)=>{
    el.querySelector<HTMLButtonElement>('.aud-select')!.addEventListener('click',e=>select(i,e.detail===0),{signal:abort.signal});
    el.querySelector('.aud-project')!.addEventListener('click',()=>openProject(i),{signal:abort.signal});
  });
  scene.dataset.paused=String(!!options.paused);
  // Reveal the initially selected content in a single paint once the first frame has committed.
  scene.dataset.enter='pending';
  let frame=win.requestAnimationFrame(()=>{frame=win.requestAnimationFrame(()=>{delete scene.dataset.enter;
    frame=win.requestAnimationFrame(()=>{scene.dataset.ready='true';});});});
  return {
    update(patch:unknown){
      const next=resolveSettings({...s,...(patch&&typeof patch==='object'?patch:{})});
      for(const [k,v] of Object.entries(vars(next)))scene.style.setProperty(k,v);
      for(const [i,el] of nodes.entries()){
        const key=cards[i].key, val=(suffix:string)=>String(next[key+suffix]);
        el.style.setProperty('--aud-focus',val('Focus')+'%');el.style.setProperty('--aud-tint',val('Tint'));
        el.querySelector('.aud-full')!.textContent=val('Label');el.querySelector('h3')!.textContent=val('Title');el.querySelector('.aud-reveal p')!.textContent=val('Body');
        el.querySelector('.aud-pill')!.firstChild!.textContent=val('Action');
        el.querySelector('.aud-select')!.setAttribute('aria-label','Expand '+val('Title'));
        el.querySelector('.aud-project')!.setAttribute('aria-label',val('Title')+' '+val('Action'));
        const link=el.querySelector('a')!;link.href=val('Url');link.setAttribute('aria-label',val('Title')+' '+val('Action'));
      }
      const selected=next.initialCard===s.initialCard?active:cards.findIndex(c=>c.key===next.initialCard);
      s=next;select(selected);
    },
    pause(){scene.dataset.paused='true';preview.settle();},resume(){scene.dataset.paused='false';},
    destroy(){win.cancelAnimationFrame(frame);abort.abort();scene.remove();}
  };
}
