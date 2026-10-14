import manifest from '../../component.json';

export type Settings = {titles:string[];descriptions:string[];initialOpen:number;theme:'dark'|'light';maxWidth:number;motionScale:number}
export const defaults=Object.fromEntries(manifest.settings.map(setting=>[setting.key,setting.default])) as Settings;
const escape=(text:string)=>text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const number=(input:unknown,fallback:number)=>typeof input==='number'&&Number.isFinite(input)?input:fallback;
function textList(input:unknown,fallback:string[],limit:number){return Array.isArray(input)&&input.length>0&&input.length<=12&&input.every(text=>typeof text==='string'&&text.length<=limit)?[...input] as string[]:[...fallback]}
export function resolveSettings(input:unknown):Settings{
 const value=input&&typeof input==='object'&&!Array.isArray(input)?input as Record<string,unknown>:{};
 let titles=textList(value.titles,defaults.titles,80),descriptions=textList(value.descriptions,defaults.descriptions,500);
 if(titles.length!==descriptions.length){titles=[...defaults.titles];descriptions=[...defaults.descriptions]}
 const initial=number(value.initialOpen,defaults.initialOpen);
 return {titles,descriptions,initialOpen:Number.isInteger(initial)&&initial>=-1&&initial<titles.length?initial:-1,theme:value.theme==='light'?'light':'dark',maxWidth:number(value.maxWidth,0)>0?Math.max(240,Math.round(Math.min(1440,number(value.maxWidth,0))/8)*8):0,motionScale:Math.round(Math.max(0,Math.min(2,number(value.motionScale,1)))*10)/10};
}
function row(title:string,answer:string,index:number){return `<section class="efq-row" data-open="true"><h2 class="efq-heading"><button type="button" class="efq-question" disabled aria-expanded="true"><span class="efq-index" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><span class="efq-label">${escape(title)}</span><span class="efq-mark" aria-hidden="true"></span></button></h2><div class="efq-answer" role="region" aria-label="${escape(title)}"><div class="efq-body"><p>${escape(answer)}</p></div></div></section>`}
export function render(input:unknown=defaults):string{
 const settings=resolveSettings(input);
 return `<div class="efq" data-theme="${settings.theme}" style="--efq-width:${settings.maxWidth||1000}px;--efq-scale:${settings.motionScale}"><div class="efq-list">${settings.titles.map((title,index)=>row(title,settings.descriptions[index],index)).join('')}</div></div>`;
}
let nextInstance=0;
export function mount(host:HTMLElement,input:unknown=defaults){
 let settings=resolveSettings(input),selected=settings.initialOpen,dead=false,manualPause=false,offscreen=false;
 if(!host.querySelector('.efq'))host.innerHTML=render(settings);
 else {const existing=host.querySelector('.efq')!;const labels=Array.from(existing.querySelectorAll('.efq-label')).map(node=>node.textContent);const answers=Array.from(existing.querySelectorAll('p')).map(node=>node.textContent);if(JSON.stringify(labels)!==JSON.stringify(settings.titles)||JSON.stringify(answers)!==JSON.stringify(settings.descriptions))host.innerHTML=render(settings);}
 const root=host.querySelector<HTMLElement>('.efq')!,list=root.querySelector<HTMLElement>('.efq-list')!,doc=host.ownerDocument,view=doc.defaultView!;
 const prefix=`efq-${++nextInstance}-${Math.random().toString(36).slice(2,9)}`;
 const media=view.matchMedia?.('(prefers-reduced-motion: reduce)');
 const active=new Map<HTMLElement,{height:Animation;opacity:Animation}>();
 const rows=()=>Array.from(list.children) as HTMLElement[];
 const parts=(item:HTMLElement)=>({button:item.querySelector<HTMLButtonElement>('.efq-question')!,panel:item.querySelector<HTMLElement>('.efq-answer')!,body:item.querySelector<HTMLElement>('.efq-body')!});
 const quiet=()=>manualPause||offscreen||doc.hidden||!!media?.matches||settings.motionScale===0;
 function cancel(panel:HTMLElement){const animation=active.get(panel);active.delete(panel);animation?.height.cancel();animation?.opacity.cancel()}
 function settle(item:HTMLElement,index:number){const {button,panel,body}=parts(item),open=selected===index;cancel(panel);button.disabled=false;button.setAttribute('aria-expanded',String(open));item.dataset.open=String(open);panel.hidden=!open;panel.inert=!open;panel.style.height='';body.style.opacity=''}
 function settleAll(){root.dataset.quiet=String(quiet());rows().forEach(settle)}
 function decorate(){root.dataset.theme=settings.theme;root.style.setProperty('--efq-width',`${settings.maxWidth||1000}px`);root.style.setProperty('--efq-scale',String(settings.motionScale));rows().forEach((item,index)=>{const {button,panel}=parts(item);button.id=`${prefix}-question-${index}`;panel.id=`${prefix}-answer-${index}`;button.setAttribute('aria-controls',panel.id);panel.setAttribute('aria-labelledby',button.id);panel.removeAttribute('aria-label')})}
 function change(item:HTMLElement,index:number){
  const {button,panel,body}=parts(item),open=selected===index;
  // Read the currently painted state before cancelling an interrupted animation.
  const startHeight=panel.hidden?0:panel.getBoundingClientRect().height,startOpacity=panel.hidden?0:Number(view.getComputedStyle(body).opacity);
  cancel(panel);panel.hidden=false;panel.inert=!open;button.setAttribute('aria-expanded',String(open));item.dataset.open=String(open);
  if(quiet()||typeof panel.animate!=='function'){settle(item,index);return}
  const height=panel.animate([{height:`${startHeight}px`},{height:`${open?body.getBoundingClientRect().height:0}px`}],{duration:270*settings.motionScale,easing:'cubic-bezier(.24,.82,.24,1)',fill:'both'});
  const opacity=body.animate([{opacity:startOpacity},{opacity:open?1:0}],{duration:(open?240:150)*settings.motionScale,easing:'ease-out',fill:'both'});
  const token={height,opacity};active.set(panel,token);
  height.finished.then(()=>{if(!dead&&active.get(panel)===token)settle(item,index)}).catch(()=>{});
 }
 function activate(event:Event){const target=event.target as Element,button=target.closest<HTMLButtonElement>('.efq-question');if(dead||!button||!root.contains(button))return;const items=rows(),index=items.findIndex(item=>parts(item).button===button);if(index<0)return;const previous=selected;selected=selected===index?-1:index;items.forEach((item,i)=>{if(i===previous||i===selected||active.has(parts(item).panel))change(item,i)})}
 function key(event:KeyboardEvent){const button=(event.target as Element).closest<HTMLButtonElement>('.efq-question');if(!button||!root.contains(button))return;const buttons=rows().map(item=>parts(item).button),index=buttons.indexOf(button);let next:number|undefined;if(event.key==='ArrowDown')next=(index+1)%buttons.length;else if(event.key==='ArrowUp')next=(index+buttons.length-1)%buttons.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=buttons.length-1;if(next!==undefined){event.preventDefault();buttons[next].focus()}}
 root.addEventListener('click',activate);root.addEventListener('keydown',key);decorate();settleAll();root.dataset.enhanced='true';
 const visibility=()=>settleAll();doc.addEventListener('visibilitychange',visibility);media?.addEventListener?.('change',visibility);
 const intersection=typeof view.IntersectionObserver==='function'?new view.IntersectionObserver(entries=>{const next=!entries[0].isIntersecting;if(next!==offscreen){offscreen=next;settleAll()}}):null;intersection?.observe(root);
 let width=root.getBoundingClientRect().width;
 const resize=typeof view.ResizeObserver==='function'?new view.ResizeObserver(()=>{const current=root.getBoundingClientRect().width;if(Math.abs(current-width)>.1){width=current;settleAll()}}):null;resize?.observe(root);
 return {
  update(input:unknown){if(dead)return;const value=resolveSettings(input);if(value.initialOpen!==settings.initialOpen)selected=value.initialOpen;else if(selected>=value.titles.length)selected=-1;settings=value;rows().forEach(item=>cancel(parts(item).panel));
   while(list.children.length>value.titles.length)list.lastElementChild?.remove();
   value.titles.forEach((title,index)=>{let item=list.children[index] as HTMLElement|undefined;if(!item){const template=doc.createElement('template');template.innerHTML=row(title,value.descriptions[index],index);item=template.content.firstElementChild as HTMLElement;list.append(item)}item.querySelector('.efq-label')!.textContent=title;item.querySelector('p')!.textContent=value.descriptions[index]});decorate();settleAll();
  },
  pause(){if(dead)return;manualPause=true;settleAll()},
  resume(){if(dead)return;manualPause=false;settleAll()},
  destroy(){if(dead)return;dead=true;root.removeEventListener('click',activate);root.removeEventListener('keydown',key);doc.removeEventListener('visibilitychange',visibility);media?.removeEventListener?.('change',visibility);intersection?.disconnect();resize?.disconnect();root.dataset.quiet='true';delete root.dataset.enhanced;rows().forEach(item=>{const {button,panel,body}=parts(item);cancel(panel);panel.hidden=false;panel.inert=false;panel.style.height='';body.style.opacity='';button.disabled=true;button.setAttribute('aria-expanded','true');item.dataset.open='true'})}
 };
}
