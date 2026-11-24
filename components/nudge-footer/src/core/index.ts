import {units} from './units';
import manifest from '../../component.json';
const cup = new URL('../../assets/demitasse.webp', import.meta.url).href;
const bag = new URL('../../assets/roast-bag.webp', import.meta.url).href;
const filter = new URL('../../assets/portafilter.webp', import.meta.url).href;
const badge = new URL('../../assets/coffee-club.webp', import.meta.url).href;
const beans = new URL('../../assets/coffee-beans.webp', import.meta.url).href;
import {stickerMotion} from './motion';

export type Settings = Record<string,string|number|boolean>;
export type Subscribe = (email:string) => Promise<void>;
export const defaults:Settings=Object.fromEntries(manifest.settings.map(rule=>[rule.key,rule.default]));
export function resolveSettings(input:unknown={}):Settings{
  const s={...defaults}; if(!input || typeof input!=='object')return s;
  for(const rule of manifest.settings){
    const value=(input as Settings)[rule.key];
    if(rule.kind==='number' && typeof value==='number' && Number.isFinite(value))s[rule.key]=Math.max(rule.min!,Math.min(rule.max!,value));
    if(rule.kind==='boolean' && typeof value==='boolean')s[rule.key]=value;
    if(rule.kind==='color' && typeof value==='string' && /^#[0-9a-f]{6}$/i.test(value))s[rule.key]=value;
    if(rule.kind==='select' && rule.options?.some(item=>item.value===value))s[rule.key]=String(value);
    if(rule.kind==='text' && typeof value==='string'){
      const url=rule.key==='destination' || rule.key.includes('Url');
      if(url && value.trim() && !/^https?:\/\//i.test(value.trim()))continue;
      if(!url && !value.trim())continue;
      s[rule.key]=value.trim().slice(0,1000);
    }
  }
  return s;
}
const esc=(value:unknown)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const pieces={cup,bag,filter,badge,beans};
function pieceStyle(s:Settings, key:string){
  const v=(suffix:string)=>s[key+suffix];
  return [
    '--x:'+v('X')+'%', '--y:'+v('Y')+'%', '--small-x:'+v('SmallX')+'%', '--small-y:'+v('SmallY')+'%',
    '--size:'+v('Size')+'%', '--small-size:'+v('SmallSize')+'%',
    '--rotation:'+v('Angle')+'deg', '--small-angle:'+v('SmallAngle')+'deg',
    '--alpha:'+v('Opacity')+'%', '--shadow:'+v('Shadow')+'px',
    '--wide-display:'+(v('Visible')?'block':'none'), '--phone-display:'+(v('Phone')?'block':'none')
  ].join(';');
}
function style(s:Settings):Record<string,string>{
  const vars:Record<string,string>={
    '--nf-bg':String(s.background),'--nf-ink':String(s.ink),'--nf-outline':String(s.outline),
    '--nf-scale':String(Number(s.stickerScale)/100),'--nf-edge-display':s.edgeVisible?'block':'none',
    '--nf-action-bg':String(s.customButton?s.buttonFill:s.ink),'--nf-action-ink':String(s.customButton?s.buttonInk:s.background),
    '--nf-notes-display':s.showNotes?'block':'none'
  };
  for(const rule of manifest.settings){
    if(units[rule.key]!==undefined || rule.kind==='color')vars['--nf-'+rule.key]=String(s[rule.key])+(units[rule.key]??'');
  }
  return vars;
}
function menu(s:Settings){
  return [1,2,3].map(group=>{
    const prefix='menu'+group;
    const rows=[1,2,3].map(i=>{
      const text=esc(s[prefix+'Line'+i]);
      const url=group===3?'':s[prefix+'Url'+i] || s.destination;
      return url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+text+'</a>':'<span>'+text+'</span>';
    });
    return '<section class="nf-group"><h2>'+esc(s[prefix+'Line0'])+'</h2>'+rows.join('')+'</section>';
  }).join('');
}
export function render(input:unknown={}){
  const s=resolveSettings(input);
  const art=Object.entries(pieces).map(([key,src])=>
    '<div class="nf-piece" aria-hidden="true" data-piece="'+key+'" style="'+pieceStyle(s,key)+'"><img alt="" draggable="false" src="'+esc(src)+'"></div>'
  ).join('');
  return '<div class="nf-host" style="'+Object.entries(style(s)).map(([k,v])=>k+':'+v).join(';')+'"><footer class="nf-footer"><div class="nf-edge" aria-hidden="true"></div><div class="nf-top"><div class="nf-nav">'+menu(s)+'</div><div class="nf-news"><p>'+esc(s.caption)+'</p><form><input type="email" aria-label="Email address" placeholder="'+esc(s.placeholder)+'" autocomplete="email" required><button type="submit" aria-live="polite">'+esc(s.button)+'</button></form></div></div><div class="nf-art"><span aria-hidden="true" class="nf-probe">'+esc(s.word)+'</span><span class="nf-word">'+esc(s.word)+'</span>'+art+'</div><div class="nf-legal"><span class="nf-credit">'+esc(s.copyright)+'</span><div class="nf-policy"><button class="nf-notes" type="button">'+esc(s.notesLabel)+'</button></div></div></footer></div>';
}

export function mount(host:HTMLElement,input:unknown={},_id?:string,options:{paused?:boolean;onSubscribe?:Subscribe}={}){
  let s=resolveSettings(input),alive=true;
  host.innerHTML=render(s);
  const root=host.querySelector<HTMLElement>('.nf-host')!,art=root.querySelector<HTMLElement>('.nf-art')!;
  const probe=art.querySelector<HTMLElement>('.nf-probe')!,word=art.querySelector<HTMLElement>('.nf-word')!;
  const form=root.querySelector('form')!,field=form.querySelector('input')!,button=form.querySelector('button')!;
  const events=new AbortController(),opts={signal:events.signal};
  const motion=stickerMotion(art,()=>({motion:s.motion===true,radius:Number(s.radius),travel:Number(s.travel),tilt:Number(s.tilt),spring:Number(s.spring),damping:Number(s.damping),falloff:Number(s.falloff),response:(key:string)=>Number(s[key+'Response'])/100}),!!options.paused);
  function fit(){
    if(!alive || !probe.offsetWidth || !art.clientWidth)return;
    art.style.setProperty('--nf-fit',art.clientWidth*Number(s.fit)/probe.offsetWidth+'px');
    art.setAttribute('data-fitted','');
  }
  const ro=new ResizeObserver(()=>{fit();motion.reset();});ro.observe(art);ro.observe(probe);
  host.style.setProperty('--nudge-stage',String(s.background));
  fit();host.ownerDocument.fonts?.ready.then(fit);
  function state(next:string){
    button.dataset.state=next;
    const labels:Record<string,string>={pending:String(s.pendingLabel),error:String(s.errorLabel),success:String(s.successLabel),demo:String(s.demoLabel)};
    button.textContent=labels[next]??String(s.button);
    button.disabled=['pending','success','demo'].includes(next);field.readOnly=next==='pending';
  }
  root.querySelector('.nf-notes')!.addEventListener('click',()=>field.focus(),opts);
  field.addEventListener('input',()=>state('idle'),opts);
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(button.disabled || !form.reportValidity())return;
    if(!options.onSubscribe){state('demo');return;}
    state('pending');
    try{await options.onSubscribe(field.value.trim());if(alive)state('success');}
    catch{if(alive)state('error');}
  },opts);
  return {
    update(patch:Settings){
      const before=s;s=resolveSettings({...s,...patch});
      host.style.setProperty('--nudge-stage',String(s.background));
      for(const [key,value] of Object.entries(style(s)))root.style.setProperty(key,value);
      if(before.word!==s.word)probe.textContent=word.textContent=String(s.word);
      if(before.word!==s.word || before.fit!==s.fit || before.wordFace!==s.wordFace || before.wordTracking!==s.wordTracking)fit();
      root.querySelector('.nf-news p')!.textContent=String(s.caption);
      root.querySelector('.nf-credit')!.textContent=String(s.copyright);
      field.placeholder=String(s.placeholder);
      root.querySelector('.nf-notes')!.textContent=String(s.notesLabel);
      const changed=Object.keys(patch).filter(key=>s[key]!==before[key]);
      if(changed.some(key=>key==='destination' || key.startsWith('menu'))){
        root.querySelector('.nf-nav')!.innerHTML=menu(s);
      }
      state(button.dataset.state || 'idle');
      let moved=false;
      for(const el of art.querySelectorAll<HTMLElement>('[data-piece]')){
        const key=el.dataset.piece!;
        if(changed.some(name=>name.startsWith(key))){
          el.style.cssText=pieceStyle(s,key);moved=true;
        }
      }
      if(moved || changed.some(key=>['motion','stickerScale','radius','travel','tilt','spring','damping','falloff'].includes(key)))motion.reset();
    },
    pause:motion.pause,resume:motion.resume,
    destroy(){host.style.removeProperty('--nudge-stage');alive=false;events.abort();ro.disconnect();motion.destroy();root.remove();}
  };
}
