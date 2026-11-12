import manifest from '../../component.json';

export interface Settings {
  value:number; format:'decimal'|'currency'|'percent'; locale:string; currency:string;
  currencySign:'standard'|'accounting'; fractionDigits:number; grouping:boolean;
  signDisplay:'auto'|'always'|'exceptZero'|'never'; prefix:string; suffix:string;
  accessibleLabel:string; announce:boolean; appearance:'plain'|'ledger'|'cells'|'instrument';
  alignment:'start'|'center'|'end'; fontFamily:'system'|'mono'; fontSize:number;
  fontWeight:number; letterSpacing:number; theme:'auto'|'light'|'dark'|'custom';
  textColor:string; surfaceColor:string; borderColor:string; duration:number;
  easing:'reel'|'ease-out'|'ease-in-out'|'linear'; stagger:number; maskFade:number;
  direction:'value'|'up'|'down'; animate:boolean;
}
export const defaults: Readonly<Settings> = Object.freeze(Object.fromEntries(manifest.settings.map(s=>[s.key,s.default])) as unknown as Settings);
export function resolveSettings(input:unknown = {}): Settings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Number Reel settings must be an object');
  const values = input as Record<string,unknown>;
  for (const key of Object.keys(values)) if (!manifest.settings.some(s=>s.key===key)) throw new TypeError(`Unknown Number Reel setting: ${key}`);
  const resolved={...defaults,...values};
  for (const rule of manifest.settings) {
    const v=resolved[rule.key as keyof Settings];
    if (typeof v !== typeof rule.default) throw new TypeError(`Invalid ${rule.key}`);
    if (rule.kind==='number' && (typeof v!=='number'||!Number.isFinite(v)||v<(rule.min??-Infinity)||v>(rule.max??Infinity))) throw new RangeError(`Invalid ${rule.key}`);
    if (rule.kind==='select' && !(rule.options as string[]).includes(v as string)) throw new RangeError(`Invalid ${rule.key}`);
    if (rule.kind==='text' && (v as string).length>(rule.maxLength??Infinity)) throw new RangeError(`Invalid ${rule.key}`);
    if (rule.kind==='color' && !/^(transparent|#[a-f0-9]{6}([a-f0-9]{2})?)$/i.test(v as string)) throw new TypeError(`Invalid ${rule.key}`);
  }
  if (!Number.isInteger(resolved.fractionDigits)) throw new RangeError('Decimal places must be an integer');
  return resolved as Settings;
}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
type Part={key:string; text:string; digit:boolean; group?:'left'|'integer'|'fraction'|'right'};
export function format(s:Settings):{text:string; parts:Part[]; native:boolean} {
  let parts:{type:string;value:string}[]; let native=true;
  const value=Object.is(s.value,-0)?0:s.value;
  try {
    parts=new Intl.NumberFormat(s.locale,{style:s.format,currency:s.currency,currencySign:s.currencySign,minimumFractionDigits:s.fractionDigits,maximumFractionDigits:s.fractionDigits,useGrouping:s.grouping,signDisplay:s.signDisplay}).formatToParts(value);
  } catch {
    native=false;
    const magnitude=Math.abs(value*(s.format==='percent'?100:1)).toFixed(s.fractionDigits);
    const negative=value<0&&s.signDisplay!=='never';
    const positive=s.signDisplay==='always'||(s.signDisplay==='exceptZero'&&value!==0);
    const accounting=negative&&s.format==='currency'&&s.currencySign==='accounting';
    const text=(accounting?'(':negative?'-':positive?'+':'')+(s.format==='currency'?s.currency+' ':'')+magnitude+(s.format==='percent'?'%':'')+(accounting?')':'');
    parts=[{type:'literal',value:text}];
  }
  let integerCount=parts.filter(p=>p.type==='integer').reduce((n,p)=>n+p.value.length,0),fraction=0;
  const list:Part[]=[];
  if(s.prefix) list.push({key:'prefix',text:s.prefix,digit:false,group:'left'});
  parts.forEach((p,index)=>{
    if(p.type==='integer'||p.type==='fraction') for(const char of p.value) list.push({key:p.type==='integer'?`i${--integerCount}`:`f${fraction++}`,text:char,digit:true,group:p.type==='integer'?'integer':'fraction'});
    else list.push({key:p.type==='group'?`agroup${integerCount}`:p.type==='decimal'?'adecimal':`a${p.type}${index}`,text:p.value,digit:false,group:p.type==='group'?'integer':p.type==='decimal'?'fraction':parts.slice(0,index).some(q=>q.type==='integer')?'right':'left'});
  });
  if(s.suffix) list.push({key:'suffix',text:s.suffix,digit:false,group:'right'});
  return {text:list.map(p=>p.text).join(''),parts:list,native};
}
function attributes(s:Settings) {
  return `data-appearance="${s.appearance}" data-theme="${s.theme}" data-align="${s.alignment}"`;
}
const family=(s:Settings)=>s.fontFamily==='mono'?'ui-monospace,SFMono-Regular,Consolas,monospace':'system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';
function style(s:Settings) {
  const colors=s.theme==='custom'?`;--nr-ink:${s.textColor};--nr-surface:${s.surfaceColor};--nr-border:${s.borderColor}`:'';
  return `--nr-scale:${s.fontSize/72};--nr-size:${s.fontSize}px;--nr-weight:${s.fontWeight};--nr-tracking:${s.letterSpacing}em;--nr-family:${family(s)}${colors}`;
}
export function render(input:unknown={}):string {
  const s=resolveSettings(input), f=format(s);
  return `<span class="number-reel" data-nr-static ${attributes(s)} style="${style(s)}"><span class="nr-accessible">${escape((s.accessibleLabel?s.accessibleLabel+': ':'')+f.text)}</span><span class="nr-static" aria-hidden="true">${escape(f.text)}</span></span>`;
}
type Response={offset:number;start:number;duration:number;easing:Settings['easing']};
type Cell={responses:Response[];xResponses:Response[];widthResponses:Response[];opacityResponses:Response[];metricWidth:number;el:HTMLSpanElement; strip:HTMLSpanElement; part:Part; x:number; width:number; pos:number; target:number; start:number; opacity:number; targetOpacity:number; targetX:number; targetWidth:number; leaving:boolean};
const modulo=(n:number)=>((n%10)+10)%10;
function curve(t:number,easing:Settings['easing']) {
  t=Math.max(0,Math.min(1,t));
  if(easing==='linear') return t;
  if(easing==='reel') {const k=9.216454432254196;return (1-(1+k*t)*Math.exp(-k*t))/(1-(1+k)*Math.exp(-k));}
  // Invert the CSS cubic's x coordinate before evaluating its y coordinate.
  const x1=easing==='ease-out'?0:.42,x2=.58;
  const cubic=(u:number,a:number,b:number)=>3*(1-u)*(1-u)*u*a+3*(1-u)*u*u*b+u*u*u;
  let lo=0,hi=1;for(let i=0;i<20;i++){const mid=(lo+hi)/2;if(cubic(mid,x1,x2)<t)lo=mid;else hi=mid;}
  return cubic((lo+hi)/2,0,1);
}
export function mount(host:HTMLElement,input:unknown={}) {
  let settings=resolveSettings(input), formatted=format(settings), dead=false, explicit=false, offscreen=false;
  const doc=host.ownerDocument, win=doc.defaultView;
  const holder=doc.createElement('span'); holder.innerHTML=render(settings);
  const root=holder.firstElementChild as HTMLSpanElement;
  for(const child of Array.from(host.children))if(child.matches('.number-reel[data-nr-static]'))child.remove();
  root.removeAttribute('data-nr-static');host.append(root);
  const accessible=root.querySelector('.nr-accessible') as HTMLSpanElement;
  const stage=root.querySelector('.nr-static') as HTMLSpanElement;
  stage.className='nr-stage';stage.textContent='';
  const mask=doc.createElement('span');mask.className='nr-mask';stage.append(mask);
  const live=accessible;live.setAttribute('aria-live',settings.announce?'polite':'off');live.setAttribute('aria-atomic','true');
  const probe=doc.createElement('span');probe.className='nr-probe';probe.setAttribute('aria-hidden','true');root.append(probe);
  const reduced=win?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const dark=win?.matchMedia?.('(prefers-color-scheme: dark)');
  let digitClock=0,digitWall=0,stageResponses:Response[]=[];
  let cells:Cell[]=[],frame=0,active=false,size=settings.fontSize,row=0,maskLeft=0,overscan=0,totalWidth=0,targetWidth=0;
  const availableWidth=()=>host.clientWidth||host.parentElement?.clientWidth||host.getBoundingClientRect().width||Infinity;
  let observedWidth=availableWidth(),observedViewport=win?.innerWidth;
  const blocked=()=>explicit||offscreen||doc.hidden;
  const capable=()=>!!win?.requestAnimationFrame && !!win?.ResizeObserver && !!win?.IntersectionObserver && formatted.native;
  const motion=()=>capable()&&settings.animate&&settings.duration>0&&!reduced?.matches;
  const stop=()=>{if(frame)win?.cancelAnimationFrame(frame);frame=0;};
  const responseClock=()=>digitClock+(active&&!blocked()&&digitWall?Math.max(0,(win?.performance.now()??digitWall)-digitWall):0);
  function contribute(responses:Response[],offset:number,start:number,duration=settings.duration,easing=settings.easing){
    const live=responses.filter(r=>digitClock-r.start<r.duration);
    const pending=live.filter(r=>r.start>=digitClock);
    const retained=live.filter(r=>r.start<digitClock);
    const combined=offset+pending.reduce((sum,r)=>sum+r.offset,0);
    if(Math.abs(combined)>.0000001)retained.push({offset:combined,start,duration,easing});
    return retained;
  }
  const current=(target:number,responses:Response[])=>target+responses.reduce((sum,r)=>sum+r.offset*(1-curve((digitClock-r.start)/r.duration,r.easing)),0);
  const liveResponses=(responses:Response[])=>responses.filter(r=>digitClock-r.start<r.duration);
  function addResponse(c:Cell,offset:number,start:number){c.responses=contribute(c.responses,offset,start);}
  let baseStyle='',measurementKey='',measuredLine=0;
  const widths=new Map<string,number>();
  function measure(texts:string[]){
    const key=[size,settings.fontWeight,settings.letterSpacing,family(settings)].join('|');
    if(key!==measurementKey){measurementKey=key;widths.clear();measuredLine=0;}
    let missing=[...new Set(texts)].filter(text=>!widths.has(text));
    if(!missing.length&&measuredLine)return;
    if(widths.size+missing.length>128){widths.clear();missing=[...new Set(texts)];}
    const nodes=missing.map(text=>{const node=doc.createElement('span');node.style.display='inline-block';node.textContent=text;return node;});
    const lineNode=doc.createElement('span');lineNode.style.display='inline-block';lineNode.textContent='0';
    probe.replaceChildren(...nodes,lineNode);
    for(let i=0;i<nodes.length;i++)widths.set(missing[i]!,nodes[i]!.getBoundingClientRect().width||missing[i]!.length*size*.56);
    measuredLine=lineNode.getBoundingClientRect().height||size*.85;
    probe.replaceChildren();
  }
  function paintStyles(){
    const nextStyle=style(settings);if(nextStyle!==baseStyle){root.setAttribute('style',nextStyle);baseStyle=nextStyle;}root.dataset.appearance=settings.appearance;root.dataset.theme=settings.theme==='auto'?(dark?.matches?'dark':'light'):settings.theme;root.dataset.align=settings.alignment;
    const available=availableWidth();
    const viewport=win?.innerWidth??1440;
    size=Math.max(16,Math.min(settings.fontSize,settings.fontSize/72*(30.88+.0536*viewport)));
    root.style.setProperty('--nr-effective',size+'px');
    for(let attempt=0;attempt<4;attempt++){
      measure(formatted.parts.map(part=>part.text));
      const measured=formatted.parts.reduce((sum,part)=>sum+width(part.text)+(settings.appearance==='cells'&&part.digit?size*.18:0),0);
      if(measured<=available||size<=16)break;
      size=Math.max(16,size*Math.max(0,(available-.1)/measured));
      root.style.setProperty('--nr-effective',size+'px');
    }
    root.style.overflowX=size<=16?'auto':'hidden';
    const padding=size<=51.784?8+(size-30)*4/21.784:12+(size-51.784)*6/20.216;
    root.style.setProperty('--nr-pad',Math.max(0,padding)+'px');
    measure(formatted.parts.map(part=>part.text));
    const line=measuredLine;row=line+Math.max(0,padding);
    root.style.setProperty('--nr-line',line+'px');root.style.setProperty('--nr-row',row+'px');root.style.setProperty('--nr-fade',settings.maskFade*size/72+'px');overscan=settings.maskFade*size/36;
    live.setAttribute('aria-live',settings.announce?'polite':'off');
  }
  function width(text:string){if(!widths.has(text))measure([text]);return widths.get(text)??text.length*size*.56;}
  const visualPart=(c:Cell):Part=>c.leaving&&c.part.digit?{...c.part,text:'0'}:c.part;
  function make(part:Part,x:number):Cell {
    const el=doc.createElement('span'),strip=doc.createElement('span');el.className='nr-cell'+(part.digit?' nr-digit':' nr-affix');el.dataset.place=part.key;el.append(strip);(part.digit||/^a(group|decimal)/.test(part.key)?mask:stage).append(el);
    if(part.digit)for(let i=0;i<3;i++){const glyph=doc.createElement('span');glyph.className='nr-glyph';strip.append(glyph);}
    const pos=part.digit?Number(part.text):0;
    return {responses:[],xResponses:[],widthResponses:[],opacityResponses:[],metricWidth:0,el,strip,part,x,width:0,pos,target:pos,start:0,opacity:1,targetOpacity:1,targetX:x,targetWidth:0,leaving:false};
  }
  function paint(cell:Cell){
    cell.el.style.transform=`translateX(${cell.x-(cell.el.parentElement===mask?maskLeft:0)}px)`;cell.el.style.width=cell.metricWidth+'px';cell.el.style.opacity=String(cell.opacity);
    if(cell.part.digit){
      const center=Math.floor(cell.pos);
      for(let slot=0;slot<3;slot++){const i=center+slot-1,glyph=cell.strip.children[slot] as HTMLSpanElement,text=String(modulo(i));if(glyph.textContent!==text)glyph.textContent=text;glyph.dataset.glyph=text;glyph.style.transform=`translateY(${(i-cell.pos)*row}px)`;}
    }else cell.strip.textContent=cell.part.text;
  }
  function paintAll(){
    stage.style.overflow=active?'visible':'hidden';
    const numeric=cells.filter(c=>c.el.parentElement===mask);
    const left=cells.filter(c=>c.part.group==='left').reduce((sum,c)=>sum+c.width,0);
    const right=left+numeric.reduce((sum,c)=>sum+c.width,0);
    maskLeft=left-overscan;mask.style.transform=`translateX(${maskLeft}px)`;mask.style.width=(right-left+overscan*2)+'px';
    for(const c of cells)paint(c);
  }
  function ghostPositions(ordered:Cell[]){
    const groups=['left','integer','fraction','right'];let groupStart=0;
    for(const group of groups){
      const members=ordered.filter(c=>(c.part.group??'left')===group);
      const liveWidth=members.reduce((sum,c)=>sum+(c.leaving?0:c.metricWidth),0);
      const layoutWidth=Math.round(members.reduce((sum,c)=>sum+c.metricWidth,0));
      let offset=0;
      for(const c of members){
        if(c.leaving){
          const edge=Math.round(offset);
          const right=layoutWidth-edge-Math.round(c.metricWidth);
          c.targetX=group==='left'||group==='integer'?groupStart+liveWidth-right-c.metricWidth:groupStart+edge;
        }
        offset+=c.metricWidth;
      }
      groupStart+=liveWidth;
    }
  }
  function reflowGeometry(){
    const oldSize=size,oldTargetWidth=targetWidth;
    paintStyles();measure(cells.map(c=>visualPart(c).text));
    let endX=0;const oldXs=new Map(cells.map(c=>[c,c.targetX]));
    for(const c of cells){
      const w=width(visualPart(c).text)+(settings.appearance==='cells'&&c.part.digit?size*.18:0),ratio=c.metricWidth?w/c.metricWidth:1;
      const nextX=c.leaving?c.targetX*size/oldSize:endX,xRatio=c.targetX?nextX/c.targetX:size/oldSize;
      c.widthResponses.forEach(r=>r.offset*=ratio);c.xResponses.forEach(r=>r.offset*=xRatio);
      c.metricWidth=w;c.targetWidth=c.leaving?0:w;c.targetX=nextX;
      c.width=current(c.targetWidth,c.widthResponses);c.x=current(c.targetX,c.xResponses);
      endX+=c.targetWidth;
    }
    ghostPositions(cells);
    for(const c of cells)if(c.leaving){const oldX=oldXs.get(c)??0,ratio=oldX?c.targetX/oldX:size/oldSize;c.xResponses.forEach(r=>r.offset*=ratio/(size/oldSize));c.x=current(c.targetX,c.xResponses);}
    const ratio=oldTargetWidth?endX/oldTargetWidth:size/oldSize;
    stageResponses.forEach(r=>r.offset*=ratio);targetWidth=endX;totalWidth=current(targetWidth,stageResponses);
    stage.style.width=totalWidth+'px';paintAll();
  }
  function semantics(){const text=(settings.accessibleLabel?settings.accessibleLabel+': ':'')+formatted.text;if(accessible.textContent!==text)accessible.textContent=text;}
  function finish(){
    active=false;digitWall=0;stageResponses=[];stop();cells=cells.filter(c=>{if(c.leaving){c.el.remove();return false;}c.pos=c.target;c.responses=[];c.xResponses=[];c.widthResponses=[];c.opacityResponses=[];c.x=c.targetX;c.width=c.targetWidth;c.opacity=c.targetOpacity;return true;});
    totalWidth=targetWidth;stage.style.width=totalWidth+'px';paintAll();semantics();
  }
  function tick(time:number){
    frame=0;if(dead||blocked())return;
    if(digitWall)digitClock+=Math.max(0,time-digitWall);digitWall=time;
    let done=true;
    for(const c of cells){
      c.responses=liveResponses(c.responses);c.xResponses=liveResponses(c.xResponses);c.widthResponses=liveResponses(c.widthResponses);c.opacityResponses=liveResponses(c.opacityResponses);
      c.pos=current(c.target,c.responses);c.x=current(c.targetX,c.xResponses);c.width=current(c.targetWidth,c.widthResponses);c.opacity=current(c.targetOpacity,c.opacityResponses);
      if(c.responses.length||c.xResponses.length||c.widthResponses.length||c.opacityResponses.length)done=false;
    }
    stageResponses=liveResponses(stageResponses);if(stageResponses.length)done=false;
    paintAll();totalWidth=current(targetWidth,stageResponses);stage.style.width=totalWidth+'px';
    if(done)finish();else frame=win!.requestAnimationFrame(tick);
  }
  function begin(startAt=win?.performance.now()??0){if(!active||blocked())return;if(!motion()){finish();return;}if(!digitWall)digitWall=startAt;stop();frame=win!.requestAnimationFrame(tick);}
  function layout(animate:boolean,previousValue:number){
    const eventWall=win?.performance.now()??0,eventClock=responseClock();if(animate&&!blocked()&&!digitWall)digitWall=eventWall;paintStyles();let x=0,order=0;const existing=new Map(cells.map(c=>[c.part.key,c]));const next:Cell[]=[];
    const oldOrder=[...cells],oldMetrics=new Map(cells.map(c=>[c,c.metricWidth]));
    const sign=settings.direction==='up'?1:settings.direction==='down'?-1:settings.value>=previousValue?1:-1;
    for(const part of formatted.parts){
      let c=existing.get(part.key);const fresh=!c;
      if(!c){c=make(part,x);if(animate&&part.digit)c.pos=c.target=0;}existing.delete(part.key);
      const previousTarget=c.target,previousText=c.part.text,wasLeaving=c.leaving;
      const w=width(part.text)+(settings.appearance==='cells'&&part.digit?size*.18:0);
      if(fresh){c.width=c.targetWidth=w;c.opacity=c.targetOpacity=animate?0:1;}
      const previousX=c.targetX,previousWidth=c.targetWidth,previousOpacity=c.targetOpacity;
      c.metricWidth=w;c.leaving=false;c.targetX=x;c.targetWidth=w;c.targetOpacity=1;c.part=part;
      if(part.digit){const digit=Number(part.text);let target=Math.floor(c.pos/10)*10+digit;if(sign>0&&target<c.pos-.001)target+=10;if(sign<0&&target>c.pos+.001)target-=10;c.target=!fresh&&!wasLeaving&&previousText===part.text?previousTarget:target;}
      c.start=c.target!==previousTarget?order++*settings.stagger:0;
      if(animate&&part.digit&&c.target!==previousTarget)addResponse(c,previousTarget-c.target,eventClock+c.start);
      if(animate){if(previousX!==c.targetX||(!fresh&&part.digit&&oldMetrics.get(c)!==w))c.xResponses=contribute(c.xResponses,previousX-c.targetX+(!fresh&&part.digit?((oldMetrics.get(c)??w)-w)/2:0),eventClock+c.start);if(previousWidth!==c.targetWidth)c.widthResponses=contribute(c.widthResponses,previousWidth-c.targetWidth,eventClock+c.start);if(previousOpacity!==c.targetOpacity)c.opacityResponses=contribute(c.opacityResponses,previousOpacity-c.targetOpacity,eventClock+c.start,settings.duration/2,'ease-out');}
      next.push(c);x+=w;
    }
    for(const c of existing.values()){
      const previousTarget=c.target,previousX=c.targetX,previousWidth=c.targetWidth,previousOpacity=c.targetOpacity;
      c.leaving=true;c.target=c.part.digit?(settings.direction==='up'?Math.ceil(c.pos/10)*10:Math.floor(c.pos/10)*10):c.pos;c.targetWidth=0;c.targetOpacity=0;c.start=0;
      if(animate){if(c.part.digit&&c.target!==previousTarget)addResponse(c,previousTarget-c.target,eventClock);if(previousX!==c.targetX)c.xResponses=contribute(c.xResponses,previousX-c.targetX,eventClock);if(previousWidth!==c.targetWidth)c.widthResponses=contribute(c.widthResponses,previousWidth-c.targetWidth,eventClock);if(previousOpacity!==0)c.opacityResponses=contribute(c.opacityResponses,previousOpacity,eventClock,settings.duration/2,'ease-out');}
      c.metricWidth=width(visualPart(c).text)+(settings.appearance==='cells'&&c.part.digit?size*.18:0);
      next.push(c);
    }
    const ordered=next.filter(c=>!c.leaving);
    for(let i=oldOrder.length-1;i>=0;i--){const c=oldOrder[i]!;if(!c.leaving)continue;const successor=oldOrder.slice(i+1).find(n=>ordered.includes(n));const at=successor?ordered.indexOf(successor):ordered.length;ordered.splice(at,0,c);}
    const previousGhostX=new Map(ordered.filter(c=>c.leaving).map(c=>[c,c.targetX]));
    ghostPositions(ordered);
    for(const c of ordered)if(c.leaving&&animate){const oldX=previousGhostX.get(c)??c.targetX,center=c.part.digit?((oldMetrics.get(c)??c.metricWidth)-c.metricWidth)/2:0;c.xResponses=contribute(c.xResponses,oldX-c.targetX+center,eventClock);}
    if(animate&&targetWidth!==x)stageResponses=contribute(stageResponses,targetWidth-x,eventClock);
    cells=ordered;targetWidth=x;active=true;
    if(!animate)finish();else begin(eventWall);
  }
  layout(false,settings.value);
  function update(patch:unknown){
    if(dead)throw new Error('Number Reel has been destroyed');
    if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new TypeError('Number Reel settings must be an object');
    const next=resolveSettings({...settings,...patch}),old=settings,oldText=formatted.text;
    if(Object.keys(patch).length===0)return;
    settings=next;formatted=format(next);if(!settings.announce)semantics();
    if(oldText===formatted.text){
      if(old.accessibleLabel!==settings.accessibleLabel)semantics();
      const geometryChanged=(['appearance','fontFamily','fontSize','fontWeight','letterSpacing'] as const).some(key=>old[key]!==settings[key]);
      if(geometryChanged)reflowGeometry();else paintStyles();
      paintAll();if(!motion())finish();return;
    }
    stop();layout(motion(),old.value);
  }
  const media=()=>{if(dead)return;paintStyles();if(reduced?.matches)finish();};
  const visibility=()=>{if(dead)return;if(doc.hidden){digitWall=0;stop();}else if(!explicit){finish();}};
  const resize=()=>{if(dead)return;const nextWidth=availableWidth(),nextViewport=win?.innerWidth;if(nextWidth===observedWidth&&nextViewport===observedViewport)return;observedWidth=nextWidth;observedViewport=nextViewport;reflowGeometry();};
  const observer=win?.ResizeObserver?new win.ResizeObserver(resize):undefined;observer?.observe(host);if(host.parentElement)observer?.observe(host.parentElement);
  const intersection=win?.IntersectionObserver?new win.IntersectionObserver(entries=>{if(dead)return;const entry=entries[0];if(!entry)return;offscreen=!entry.isIntersecting;if(offscreen){digitWall=0;stop();}else if(!explicit&&active)finish();}):undefined;intersection?.observe(host);
  const fontsChanged=()=>{if(dead)return;measurementKey='';reflowGeometry();};
  doc.fonts?.addEventListener?.('loadingdone',fontsChanged);
  reduced?.addEventListener?.('change',media);dark?.addEventListener?.('change',media);doc.addEventListener('visibilitychange',visibility);win?.addEventListener('resize',resize);
  return {update,pause(){if(dead||explicit)return;explicit=true;digitWall=0;stop();},resume(){if(dead||!explicit)return;explicit=false;begin();},destroy(){if(dead)return;dead=true;stop();doc.fonts?.removeEventListener?.('loadingdone',fontsChanged);widths.clear();observer?.disconnect();intersection?.disconnect();reduced?.removeEventListener?.('change',media);dark?.removeEventListener?.('change',media);doc.removeEventListener('visibilitychange',visibility);win?.removeEventListener('resize',resize);root.remove();stageResponses=[];for(const c of cells){c.responses=[];c.xResponses=[];c.widthResponses=[];c.opacityResponses=[];}cells=[];}};
}
