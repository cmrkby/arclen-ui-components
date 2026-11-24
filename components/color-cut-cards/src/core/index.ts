import manifest from '../../component.json';
const flutes = new URL('../../assets/amber-flutes.webp', import.meta.url).href;
const discs = new URL('../../assets/rose-discs.webp', import.meta.url).href;
const prism = new URL('../../assets/split-spectrum.webp', import.meta.url).href;
const claude = new URL('../../assets/claude-mono.webp', import.meta.url).href;
const chatgpt = new URL('../../assets/chatgpt-mono.webp', import.meta.url).href;
const grok = new URL('../../assets/grok-mono.webp', import.meta.url).href;
const flare = new URL('../../assets/claude-signal.webp', import.meta.url).href;
const filament = new URL('../../assets/chatgpt-signal.webp', import.meta.url).href;
const eclipse = new URL('../../assets/grok-signal.webp', import.meta.url).href;
const brandNames = ['Claude','ChatGPT','Grok'];
const photos = {signal:[flare,filament,eclipse], obsidian:[claude,chatgpt,grok], optical:[flutes,discs,prism]} as const;
type Setting = string | number;
export type CardSettings = Record<string, Setting>;
export const defaults: Readonly<CardSettings> = Object.freeze(Object.fromEntries(manifest.settings.map(r => [r.key,r.default])));

export function hasBrandTitle(settings: CardSettings, index: number) {
  return settings.collection !== 'optical' && settings['title'+(index+1)] === brandNames[index];
}

const previewSettings = manifest.previews as {settings:CardSettings}[];
export function resolveSettings(input:unknown = {}): CardSettings {
  const raw = input && typeof input === 'object' ? input as Record<string,unknown> : {};
  const preset = previewSettings.find(p=>p.settings.collection===raw.collection)?.settings ?? {};
  return Object.fromEntries(manifest.settings.map(rule=>{
    const v=raw[rule.key];
    const fallback=preset[rule.key] ?? rule.default;
    if(v===undefined)return [rule.key,fallback];
    if(rule.kind==='number' && typeof v==='number' && Number.isFinite(v))return [rule.key,Math.min(rule.max!,Math.max(rule.min!,v))];
    if(typeof v==='string'){
      if(rule.kind==='text')return [rule.key,v.slice(0,rule.maxLength)];
      if(rule.kind==='color' && /^#[a-f\d]{6}$/i.test(v))return [rule.key,v];
      if(rule.options?.some(option=>option.value===v))return [rule.key,v];
    }
    return [rule.key,fallback];
  }));
}
const arrow = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg>';
const units:Record<string,string>={wideHeight:'px',midHeight:'px',phoneHeight:'px',bodySize:'px',rowGap:'px',columnGap:'px',bodyInset:'px',footGap:'px',footInset:'px',footSize:'px',badgePad:'px',badgeType:'px',arrowTravel:'px',copyLift:'px',width:'%',gap:'px',radius:'px',inset:'px',titleSize:'px',rest:'%',active:'%',mobile:'%',duration:'ms',photoDuration:'ms',badgeHeight:'px',circleSize:'px',glyphSize:'px',controlFill:'',controlHover:'',controlInk:'',stage:''};

function escape(value:Setting) {
  return String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

function destination(raw:string, photo:string) {
  if(!raw.trim())return photo;
  try {
    const url=new URL(raw,'https://example.invalid/');
    return ['https:','http:','mailto:','tel:'].includes(url.protocol)?raw.trim():'';
  } catch {return '';}
}

function description(copy:string) {
  const rows=copy.trim().split(/\r?\n|\s*\|\s*/);
  if(rows.length<2 || rows.some(row=>row.indexOf(':')<1))return '<span class="cc-body">'+escape(copy)+'</span>';
  const items=rows.map(row=>{
    const split=row.indexOf(':');
    return '<span><strong>'+escape(row.slice(0,split).trim())+'</strong> <span>'+escape(row.slice(split+1).trim())+'</span></span>';
  });
  return '<span class="cc-body cc-models">'+items.join('')+'</span>';
}

function stageStyle(s:CardSettings) {
  return Object.entries(units).map(([k,unit])=>'--cc-'+k+':'+s[k]+unit).concat('--cc-zoom:'+String(1+Number(s.zoom)/100)).join(';');
}

function cardParts(s:CardSettings,i:number) {
  const get=(key:string)=>s[key+(i+1)];
  const photo=photos[s.collection as keyof typeof photos][i];
  const href=destination(String(get('href')),photo);
  const title=escape(get('title'));
  const style=[
    '--cc-colour:'+get('colour'),'--cc-ink:'+get('ink'),'--cc-crop:'+get('crop')+'%','--cc-crop-x:'+get('cropX')+'%',
    '--cc-logo-scale:'+Number(get('logoScale'))/100,'--cc-wordmark-scale:'+Number(get('wordmarkScale'))/100,'--cc-brand-gap:'+get('brandGap')+'px'
  ].join(';');
  const brand=hasBrandTitle(s,i)?brandNames[i]:'';
  const html='<img alt="" draggable="false" src="'+escape(photo)+'"><span class="cc-shade"></span>'+
    '<span class="cc-top" aria-hidden="true"><span class="cc-num">0'+(i+1)+' / 03</span><span class="cc-disc">'+arrow+'</span></span>'+
    '<span class="cc-panel"><span class="cc-space"></span><span class="cc-mask"><span class="cc-track"><span>'+title+'</span><span aria-hidden="true">'+title+'</span></span></span>'+
    '<span class="cc-reveal"><span class="cc-clip">'+description(String(get('body')))+'</span></span>'+
    '<span class="cc-foot"><span>'+escape(get('cta'))+'</span>'+arrow+'</span></span>';
  return {style,brand,html,href};
}

export function render(input:unknown={}) {
  const s=resolveSettings(input);
  const cards=brandNames.map((_,i)=>{
    const {style,brand,html,href}=cardParts(s,i);
    return '<a class="cc-card" target="_blank" rel="noopener noreferrer"'+(href?' href="'+escape(href)+'"':'')+' style="'+style+'" '+(brand?'data-brand-title="'+brand+'"':'')+'>'+html+'</a>';
  });
  return '<section class="cc-stage" aria-label="Cutaway Cards" data-frame="'+s.frame+'" data-collection="'+s.collection+'" style="'+stageStyle(s)+'"><div class="cc-grid" data-cols="3">'+cards.join('')+'</div></section>';
}

export function mount(host:HTMLElement,input:unknown={}) {
  let s=resolveSettings(input);
  host.innerHTML=render(s);
  const stage=host.querySelector<HTMLElement>('.cc-stage')!;
  const grid=stage.querySelector<HTMLElement>('.cc-grid')!;
  const anchors=Array.from(grid.querySelectorAll('a'));
  let cards=anchors.map((_,i)=>cardParts(s,i));
  function resize(){
    const w=grid.getBoundingClientRect().width;
    grid.dataset.cols=w<=620?'1':w<=900?'2':'3';
  }
  resize();
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;
  observer?.observe(grid);
  if(!observer)window.addEventListener('resize',resize);
  return {
    update(patch:CardSettings){
      const changes=patch.collection!==undefined&&patch.collection!==s.collection;
      const previous={...s};
      if(changes){
        const baseline=resolveSettings({collection:s.collection});
        for(const key of Object.keys(previous))if(previous[key]===baseline[key])delete previous[key];
      }
      s=resolveSettings({...previous,...patch});
      stage.style.cssText=stageStyle(s);
      stage.dataset.frame=String(s.frame);
      stage.dataset.collection=String(s.collection);
      cards=anchors.map((a,i)=>{
        const next=cardParts(s,i);
        if(next.html!==cards[i].html)a.innerHTML=next.html;
        if(next.style!==cards[i].style)a.style.cssText=next.style;
        if(next.brand!==cards[i].brand){if(next.brand)a.dataset.brandTitle=next.brand;else delete a.dataset.brandTitle;}
        if(next.href!==cards[i].href){if(next.href)a.setAttribute('href',next.href);else a.removeAttribute('href');}
        return next;
      });
      return s;
    },
    pause(){stage.setAttribute('data-paused','');},
    resume(){stage.removeAttribute('data-paused');},
    destroy(){observer?.disconnect();if(!observer)window.removeEventListener('resize',resize);stage.remove();}
  };
}
