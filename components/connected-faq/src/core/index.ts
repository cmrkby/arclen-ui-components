import manifest from '../../component.json';

export type Settings = {titles:string[];descriptions:string[];initialOpen:number;theme:'dark'|'light';maxWidth:number;motionScale:number;appearance:'connected'|'bridge'|'capsules'};
export const defaults = Object.fromEntries(manifest.settings.map(setting=>[setting.key,setting.default])) as Settings;
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const finite=(value:unknown,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
const list=(value:unknown,fallback:string[],limit:number)=>Array.isArray(value)&&value.length>=1&&value.length<=12&&value.every(x=>typeof x==='string'&&x.length<=limit)?[...value] as string[]:[...fallback];
export function resolveSettings(input:unknown):Settings{
 const value=input&&typeof input==='object'?input as Record<string,unknown>:{};
 let titles=list(value.titles,defaults.titles,80),descriptions=list(value.descriptions,defaults.descriptions,500);
 if(titles.length!==descriptions.length){titles=[...defaults.titles];descriptions=[...defaults.descriptions]}
 const requested=finite(value.initialOpen,defaults.initialOpen);
 return {titles,descriptions,initialOpen:Number.isInteger(requested)&&requested>=-1&&requested<titles.length?requested:-1,theme:value.theme==='light'?'light':'dark',appearance:value.appearance==='bridge'||value.appearance==='capsules'?value.appearance:'connected',maxWidth:finite(value.maxWidth,0)>0?Math.max(240,Math.round(Math.min(1440,finite(value.maxWidth,0))/8)*8):0,motionScale:Math.round(Math.min(2,Math.max(0,finite(value.motionScale,1)))*10)/10};
}
function row(title:string,answer:string){return `<section class="cfq-item" data-open="true"><span class="cfq-neck" aria-hidden="true"></span><h2 class="cfq-heading"><button type="button" class="cfq-question" aria-expanded="true" disabled><span class="cfq-source-mark" aria-hidden="true"></span><span class="cfq-label">${escape(title)}</span><span class="cfq-mark" aria-hidden="true"></span></button></h2><div class="cfq-answer" role="region"><div class="cfq-answer-body"><p>${escape(answer)}</p></div></div></section>`}
export function render(input:unknown=defaults):string{
 const settings=resolveSettings(input);
 return `<div class="cfq" data-appearance="${settings.appearance}" data-theme="${settings.theme}" style="--cfq-width:${settings.maxWidth|| (settings.appearance==='capsules'?1000:384)}px;--cfq-scale:${settings.motionScale}"><div class="cfq-list">${settings.titles.map((title,i)=>row(title,settings.descriptions[i])).join('')}</div></div>`;
}
let sequence=0;
export function mount(host:HTMLElement,input:unknown=defaults){
 let settings=resolveSettings(input),selected=settings.initialOpen,destroyed=false,manualPaused=false,offscreen=false;
 if(!host.querySelector('.cfq'))host.innerHTML=render(settings);
 else {const existing=host.querySelector('.cfq')!;const labels=Array.from(existing.querySelectorAll('.cfq-label')).map(node=>node.textContent);const answers=Array.from(existing.querySelectorAll('p')).map(node=>node.textContent);if(JSON.stringify(labels)!==JSON.stringify(settings.titles)||JSON.stringify(answers)!==JSON.stringify(settings.descriptions))host.innerHTML=render(settings);}
 const root=host.querySelector<HTMLElement>('.cfq')!,listRoot=root.querySelector<HTMLElement>('.cfq-list')!,document=host.ownerDocument,view=document.defaultView!;
 const prefix=`cfq-${++sequence}-${Math.random().toString(36).slice(2,8)}`;
 const media=view.matchMedia?.('(prefers-reduced-motion: reduce)');
 const active=new Map<HTMLElement,{height:Animation;opacity:Animation;generation:number}>();let generation=0;
 const rows=()=>Array.from(listRoot.children) as HTMLElement[];
 const parts=(item:HTMLElement)=>({button:item.querySelector<HTMLButtonElement>('.cfq-question')!,panel:item.querySelector<HTMLElement>('.cfq-answer')!,body:item.querySelector<HTMLElement>('.cfq-answer-body')!});
 const paused=()=>manualPaused||offscreen||document.visibilityState==='hidden';
 function stop(panel:HTMLElement){const motion=active.get(panel);active.delete(panel);motion?.height.cancel();motion?.opacity.cancel()}
 function settle(item:HTMLElement,index:number){const {button,panel,body}=parts(item),open=index===selected;stop(panel);button.disabled=false;button.setAttribute('aria-expanded',String(open));item.dataset.open=String(open);panel.hidden=!open;panel.inert=!open;panel.style.height='';body.style.opacity='';}
 function settleAll(){rows().forEach(settle);root.dataset.quiet=String(paused()||!!media?.matches||settings.motionScale===0)}
 function decorate(){root.dataset.appearance=settings.appearance;root.dataset.theme=settings.theme;root.style.setProperty('--cfq-width',`${settings.maxWidth||(settings.appearance==='capsules'?1000:384)}px`);root.style.setProperty('--cfq-scale',String(settings.motionScale));}
 function attachIds(){rows().forEach((item,i)=>{const {button,panel}=parts(item);button.id=`${prefix}-q-${i}`;panel.id=`${prefix}-a-${i}`;button.setAttribute('aria-controls',panel.id);panel.setAttribute('aria-labelledby',button.id)})}
 function change(item:HTMLElement,index:number){
  const {button,panel,body}=parts(item),open=index===selected;
  const startHeight=panel.hidden?0:panel.getBoundingClientRect().height,startOpacity=panel.hidden?0:Number(view.getComputedStyle(body).opacity);
  stop(panel);panel.hidden=false;panel.inert=!open;button.setAttribute('aria-expanded',String(open));item.dataset.open=String(open);
  if(paused()||media?.matches||settings.motionScale===0||typeof panel.animate!=='function'){settle(item,index);return}
  const endHeight=open?body.getBoundingClientRect().height:0,ms=({connected:360,bridge:380,capsules:410}[settings.appearance])*settings.motionScale;
  const height=panel.animate([{height:`${startHeight}px`},{height:`${endHeight}px`}],{duration:ms,easing:'cubic-bezier(.24,.82,.24,1)',fill:'both'});
  const opacity=body.animate([{opacity:startOpacity},{opacity:open?1:0}],{duration:(open?240:150)*settings.motionScale,easing:'ease-out',fill:'both'});
  const token={height,opacity,generation:++generation};active.set(panel,token);
  height.finished.then(()=>{if(destroyed||active.get(panel)!==token)return;settle(item,index)}).catch(()=>{});
 }
 function click(event:Event){const button=(event.target as Element).closest<HTMLButtonElement>('.cfq-question');if(!button||!root.contains(button)||destroyed)return;const items=rows(),index=items.findIndex(item=>parts(item).button===button);if(index<0)return;const previous=selected;selected=selected===index?-1:index;items.forEach((item,i)=>{if(i===previous||i===selected||active.has(parts(item).panel))change(item,i)})}
 function key(event:KeyboardEvent){const button=(event.target as Element).closest<HTMLButtonElement>('.cfq-question');if(!button||!root.contains(button))return;const buttons=rows().map(item=>parts(item).button),index=buttons.indexOf(button);let next:number|undefined;if(event.key==='ArrowDown')next=(index+1)%buttons.length;if(event.key==='ArrowUp')next=(index+buttons.length-1)%buttons.length;if(event.key==='Home')next=0;if(event.key==='End')next=buttons.length-1;if(next!==undefined){event.preventDefault();buttons[next].focus()}}
 root.addEventListener('click',click);root.addEventListener('keydown',key);decorate();attachIds();settleAll();root.dataset.enhanced='true';
 const visibility=()=>settleAll(),motionChange=()=>settleAll();document.addEventListener('visibilitychange',visibility);media?.addEventListener('change',motionChange);
 const intersection=typeof view.IntersectionObserver==='function'?new view.IntersectionObserver(entries=>{const nextOffscreen=!entries[0].isIntersecting;if(nextOffscreen!==offscreen){offscreen=nextOffscreen;settleAll()}}):null;intersection?.observe(root);
 let lastWidth=root.getBoundingClientRect().width;const resize=typeof view.ResizeObserver==='function'?new view.ResizeObserver(()=>{const width=root.getBoundingClientRect().width;if(Math.abs(width-lastWidth)>.1){lastWidth=width;settleAll()}}):null;resize?.observe(root);
 return {
  update(next:unknown){if(destroyed)return;const value=resolveSettings(next),initialChanged=value.initialOpen!==settings.initialOpen,items=rows();settings=value;if(initialChanged)selected=value.initialOpen;else if(selected>=value.titles.length)selected=-1;
   items.forEach(item=>stop(parts(item).panel));
   while(listRoot.children.length>value.titles.length)listRoot.lastElementChild?.remove();
   for(let i=0;i<value.titles.length;i++){let item=listRoot.children[i] as HTMLElement|undefined;if(!item){const template=document.createElement('template');template.innerHTML=row(value.titles[i],value.descriptions[i]);item=template.content.firstElementChild as HTMLElement;listRoot.append(item)}item.querySelector('.cfq-label')!.textContent=value.titles[i];item.querySelector('p')!.textContent=value.descriptions[i]}
   decorate();attachIds();settleAll();
  },
  pause(){if(destroyed)return;manualPaused=true;settleAll()},
  resume(){if(destroyed)return;manualPaused=false;settleAll()},
  destroy(){if(destroyed)return;destroyed=true;root.removeEventListener('click',click);root.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);media?.removeEventListener('change',motionChange);intersection?.disconnect();resize?.disconnect();rows().forEach(item=>{const {button,panel,body}=parts(item);stop(panel);panel.hidden=false;panel.inert=false;panel.style.height='';body.style.opacity='';button.disabled=true;button.setAttribute('aria-expanded','true');item.dataset.open='true'});root.dataset.quiet='true';delete root.dataset.enhanced;}
 };
}
