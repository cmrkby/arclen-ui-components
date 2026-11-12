// @vitest-environment jsdom
import {describe,it,expect,vi} from 'vitest';
import {defaults,resolveSettings,render,mount,format} from './index';
import manifest from '../../component.json';
describe('Number Reel settings and formatting',()=>{
 it('exports every manifest default without sharing mutable objects',()=>{expect(Object.keys(defaults)).toHaveLength(28);expect(Object.isFrozen(defaults)).toBe(true);expect(defaults).toEqual(Object.fromEntries(manifest.settings.map(s=>[s.key,s.default])));const a=resolveSettings();a.value=1;expect(defaults.value).toBe(431.1);});
 it('rejects invalid patches',()=>{for(const input of [{value:NaN},{value:Infinity},{value:1e14},{fractionDigits:1.5},{format:'bad'},{animate:1},{textColor:'url(x)'},{prefix:'x'.repeat(25)},{unknown:1},null,[]])expect(()=>resolveSettings(input)).toThrow();});
 it('formats currency, percent, rounding and negative zero',()=>{expect(format(resolveSettings({value:-3243.6,format:'currency',currencySign:'accounting'})).text).toBe('($3,243.60)');expect(format(resolveSettings({value:.742,format:'percent',fractionDigits:1})).text).toBe('74.2%');expect(format(resolveSettings({value:-0})).text).toBe('0.00');expect(format(resolveSettings({value:10,format:'currency',currency:'JPY'})).text).toBe('¥10.00');});
 it('keeps fraction and integer identities across precision and carries',()=>{const a=format(resolveSettings({value:99.12})).parts,b=format(resolveSettings({value:100.123,fractionDigits:3})).parts;expect(a.find(p=>p.key==='f0')?.text).toBe(b.find(p=>p.key==='f0')?.text);expect(b.find(p=>p.key==='i0')?.text).toBe('0');expect(b.find(p=>p.key==='f2')?.text).toBe('3');});
 it('keeps semantic separator identities when prefixes and integer lengths change',()=>{const accounting=format(resolveSettings({value:-3243.6,format:'currency',currencySign:'accounting'})).parts,percent=format(resolveSettings({value:398.43,format:'percent',fractionDigits:0,signDisplay:'always'})).parts;expect(accounting.find(p=>p.text===',')?.key).toBe(percent.find(p=>p.text===',')?.key);expect(accounting.find(p=>p.text==='.')?.key).toBe(format(resolveSettings({value:1.2})).parts.find(p=>p.text==='.')?.key);const groups=format(resolveSettings({value:123456789})).parts.filter(p=>p.text===',');expect(new Set(groups.map(p=>p.key)).size).toBe(groups.length);});
 it('escapes static content and is deterministic',()=>{const html=render({prefix:'<img>',accessibleLabel:'"Total"'});expect(html).not.toContain('<img>');expect(html).toContain('&lt;img&gt;');expect(html).toBe(render({prefix:'<img>',accessibleLabel:'"Total"'}));});
 it('provides correct static fallback without Intl',()=>{const spy=vi.spyOn(Intl,'NumberFormat').mockImplementation(()=>{throw new Error('unavailable');});try{expect(format(resolveSettings({value:.742,format:'percent'})).text).toBe('74.20%');expect(format(resolveSettings({value:-25.5,format:'currency',currencySign:'accounting'})).text).toBe('(USD 25.50)');}finally{spy.mockRestore();}});
});
describe('Number Reel lifecycle',()=>{
 it('enhances static HTML without duplicating accessible numbers',()=>{const host=document.createElement('div');host.innerHTML=render({value:42});const h=mount(host,{value:42});expect(host.querySelectorAll('.number-reel')).toHaveLength(1);expect(host.querySelectorAll('.nr-accessible')).toHaveLength(1);h.destroy();});
 it('isolates instances and preserves consumer nodes',()=>{const host=document.createElement('div');host.className='consumer';host.innerHTML='<b>Retained</b>';const a=mount(host,{value:9,fractionDigits:0}),b=mount(host,{value:10,fractionDigits:0});a.update({value:11});expect(host.querySelectorAll('.nr-accessible')[0]?.textContent).toBe('11');expect(host.querySelectorAll('.nr-accessible')[1]?.textContent).toBe('10');a.destroy();expect(host.querySelector('b')?.textContent).toBe('Retained');expect(host.className).toBe('consumer');expect(host.querySelectorAll('.number-reel')).toHaveLength(1);b.destroy();});
 it('validates atomically, merges partial settings, and rejects use after destroy',()=>{const host=document.createElement('div'),h=mount(host,{value:20,fractionDigits:0});const before=host.innerHTML;expect(()=>h.update({value:30,duration:-1})).toThrow();expect(host.innerHTML).toBe(before);h.update({prefix:'Qty '});expect(host.querySelector('.nr-accessible')?.textContent).toBe('Qty 20');h.pause();h.resume();h.destroy();h.destroy();h.pause();h.resume();expect(()=>h.update({value:1})).toThrow(/destroyed/);expect(host.children).toHaveLength(0);});
 it('commits the latest value synchronously when animation APIs are absent',()=>{const host=document.createElement('div'),h=mount(host);h.update({value:-1});h.update({value:42,fractionDigits:0,duration:0,stagger:80});expect(host.querySelector('.nr-accessible')?.textContent).toBe('42');expect(host.querySelectorAll('.nr-digit')).toHaveLength(2);h.destroy();});
});
describe('Number Reel animated lifecycle',()=>{
 it('freezes explicit pauses, keeps latest rapid target and clears owned work',()=>{
  let id=0,now=100;const clock=vi.spyOn(performance,'now').mockImplementation(()=>now);const frames=new Map<number,FrameRequestCallback>();let resizeDisconnected=0,intersectionDisconnected=0,resizeCallback:()=>void=()=>{};
  vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{frames.set(++id,cb);return id;});vi.stubGlobal('cancelAnimationFrame',(key:number)=>frames.delete(key));
  vi.stubGlobal('ResizeObserver',class{constructor(cb:()=>void){resizeCallback=cb;}observe(){} disconnect(){resizeDisconnected++;}});vi.stubGlobal('IntersectionObserver',class{observe(){} disconnect(){intersectionDisconnected++;}});
  const step=(time:number)=>{now=time;const batch=[...frames.values()];frames.clear();batch.forEach(cb=>cb(time));};
  const host=document.createElement('div');document.body.append(host);const h=mount(host,{value:9,fractionDigits:0});
  try{
   h.update({value:10});expect(frames.size).toBe(1);step(100);step(300);const stage=host.querySelector('.nr-stage') as HTMLElement,midWidth=stage.style.width;h.update({value:10});expect(stage.style.width).toBe(midWidth);expect(frames.size).toBe(1);resizeCallback();expect(stage.style.width).toBe(midWidth);expect(frames.size).toBe(1);const frozen=host.querySelector('.nr-stage')?.innerHTML;h.pause();expect(frames.size).toBe(0);step(500);expect(host.querySelector('.nr-stage')?.innerHTML).toBe(frozen);Object.defineProperty(host,'clientWidth',{value:120,configurable:true});const phases=[...host.querySelectorAll<HTMLElement>('.nr-glyph')].map(el=>el.style.transform);resizeCallback();expect([...host.querySelectorAll<HTMLElement>('.nr-glyph')].map(el=>el.style.transform)).toEqual(phases);expect(frames.size).toBe(0);
   h.update({value:11});h.update({value:42});expect(frames.size).toBe(0);h.resume();expect(frames.size).toBe(1);step(600);step(1700);expect(frames.size).toBe(0);expect(host.querySelector('.nr-accessible')?.textContent).toBe('42');expect(host.querySelectorAll('.nr-digit')).toHaveLength(2);
   h.update({value:99});expect(frames.size).toBe(1);h.update({duration:0,stagger:80,value:10});expect(frames.size).toBe(0);expect(host.querySelector('.nr-accessible')?.textContent).toBe('10');h.update({duration:900,value:11});h.update({value:-3,animate:false});h.update({value:2,animate:true,direction:'value'});step(1750);const signedGlyph=host.querySelector<HTMLElement>('[data-place="i0"] [data-glyph="3"]')!;expect(parseFloat(signedGlyph.style.transform.slice(11))).toBeLessThan(0);h.update({value:-3,animate:false});h.update({value:2,animate:true,direction:'down'});step(1800);const fixedGlyph=host.querySelector<HTMLElement>('[data-place="i0"] [data-glyph="3"]')!;expect(parseFloat(fixedGlyph.style.transform.slice(11))).toBeGreaterThan(0);h.destroy();expect(frames.size).toBe(0);expect(resizeDisconnected).toBe(1);expect(intersectionDisconnected).toBe(1);
  }finally{h.destroy();host.remove();clock.mockRestore();vi.unstubAllGlobals();}
 });
});
describe('Number Reel response composition',()=>{
 it('continues the visible step briefly on reversal, coalesces pending work and settles once',()=>{
  let now=100,id=0;const frames=new Map<number,FrameRequestCallback>();const clock=vi.spyOn(performance,'now').mockImplementation(()=>now);
  vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{frames.set(++id,cb);return id;});vi.stubGlobal('cancelAnimationFrame',(key:number)=>frames.delete(key));
  vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});
  const step=(time:number)=>{now=time;const batch=[...frames.values()];frames.clear();batch.forEach(cb=>cb(time));};
  const host=document.createElement('div');document.body.append(host);const h=mount(host,{value:9,fractionDigits:0,fontSize:30});
  const y=()=>parseFloat(host.querySelector<HTMLElement>('[data-place="i0"] [data-glyph="9"]')!.style.transform.slice(11));
  try{
   h.update({value:10});step(200);expect(Math.abs(y())/33.5).toBeGreaterThan(.25);expect(Math.abs(y())/33.5).toBeLessThan(.30);step(325);const before=y();h.update({value:9});step(350);expect(y()).toBeLessThan(before);step(500);expect(y()).toBeGreaterThan(before);expect(Math.abs(y())).toBeLessThan(33.5*.5);
   h.pause();const pausedPhase=y();step(5500);expect(y()).toBe(pausedPhase);for(let n=100;n<1100;n++)h.update({value:n});expect(frames.size).toBe(0);expect(host.querySelectorAll('.nr-glyph').length).toBeLessThanOrEqual(12);h.resume();expect(frames.size).toBe(1);step(5600);step(7400);expect(frames.size).toBe(0);expect(host.querySelector('.nr-accessible')?.textContent).toBe('1,099');expect(host.querySelectorAll('.nr-digit')).toHaveLength(4);expect(host.querySelectorAll('.nr-glyph')).toHaveLength(12);
   h.update({value:1199,stagger:80});step(7500);step(7600);const stable=[...host.querySelectorAll<HTMLElement>('[data-place="i0"] .nr-glyph')].map(el=>el.style.transform);expect(stable).toContain('translateY(0px)');step(9500);expect(frames.size).toBe(0);
  }finally{h.destroy();host.remove();clock.mockRestore();vi.unstubAllGlobals();}
 });
});

describe('Number Reel measurement lifecycle',()=>{
 it('reuses value-only glyph measurements and invalidates changed typography',()=>{
  const reads:string[]=[];
  const rect=vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
   const root=this.closest('.number-reel') as HTMLElement|null;
   const size=Number.parseFloat(root?.style.getPropertyValue('--nr-effective')||'72');
   if(this.parentElement?.classList.contains('nr-probe'))reads.push(this.textContent||'');
   return {x:0,y:0,top:0,left:0,bottom:size*.85,right:size*.5,width:size*.5,height:size*.85,toJSON(){return{};}};
  });
  const fonts=new EventTarget();Object.defineProperty(document,'fonts',{configurable:true,value:fonts});
  const host=document.createElement('div');Object.defineProperty(host,'clientWidth',{value:1000});document.body.append(host);
  const h=mount(host,{value:12,fractionDigits:0});
  try{
   const initial=reads.length;h.update({value:21});expect(reads.length).toBe(initial);
   h.update({value:31});expect(reads.length).toBeGreaterThan(initial);const afterNew=reads.length;
   h.update({value:13});expect(reads.length).toBe(afterNew);
   h.update({fontSize:36});expect(reads.length).toBeGreaterThan(afterNew);expect(Number.parseFloat((host.querySelector('.nr-stage') as HTMLElement).style.width)).toBe(36);
   const afterSize=reads.length;h.update({fontFamily:'mono'});expect(reads.length).toBeGreaterThan(afterSize);
   const afterFamily=reads.length;fonts.dispatchEvent(new Event('loadingdone'));expect(reads.length).toBeGreaterThan(afterFamily);
   h.update({value:-1234.5,format:'currency',currencySign:'accounting',fractionDigits:2});expect(host.querySelector('.nr-accessible')?.textContent).toBe('($1,234.50)');
  }finally{h.destroy();host.remove();rect.mockRestore();Reflect.deleteProperty(document,'fonts');}
 });
});

describe('Number Reel interrupted layout channels',()=>{
 it('continues opacity and horizontal motion, preserves paused reflow and restores a reentered digit',()=>{
  let now=100,id=0,resize=()=>{};const frames=new Map<number,FrameRequestCallback>();const clock=vi.spyOn(performance,'now').mockImplementation(()=>now);
  vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{frames.set(++id,cb);return id;});vi.stubGlobal('cancelAnimationFrame',(key:number)=>frames.delete(key));
  vi.stubGlobal('ResizeObserver',class{constructor(cb:()=>void){resize=cb;}observe(){}disconnect(){}});vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});
  const step=(time:number)=>{now=time;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(cb=>cb(time));};
  const host=document.createElement('div');document.body.append(host);Object.defineProperty(host,'clientWidth',{value:300,configurable:true});const h=mount(host,{value:9,fractionDigits:0,fontSize:30});
  const stage=()=>host.querySelector<HTMLElement>('.nr-stage')!,tens=()=>host.querySelector<HTMLElement>('[data-place="i1"]')!,units=()=>host.querySelector<HTMLElement>('[data-place="i0"]')!;
  try{
   const initialWidth=parseFloat(stage().style.width);h.update({value:10});step(325);const opacity=parseFloat(tens().style.opacity),x=units().style.transform;h.update({value:9});expect(units().style.transform).toBe(x);expect(parseFloat(tens().style.opacity)).toBe(opacity);step(532);
   expect(parseFloat(tens().style.opacity)).toBeGreaterThan(.34);expect(parseFloat(tens().style.opacity)).toBeLessThan(.40);
   const travel=(parseFloat(units().style.transform.slice(11))+parseFloat(host.querySelector<HTMLElement>('.nr-mask')!.style.transform.slice(11)))/initialWidth;expect(travel).toBeGreaterThan(.29);expect(travel).toBeLessThan(.34);expect((parseFloat(stage().style.width)-initialWidth)/initialWidth).toBeCloseTo(travel,5);
   h.pause();const frozenOpacity=tens().style.opacity;h.update({fontSize:24});Object.defineProperty(host,'clientWidth',{value:8,configurable:true});resize();const fitted=parseFloat((host.querySelector('.number-reel') as HTMLElement).style.getPropertyValue('--nr-effective')),normalized=(parseFloat(stage().style.width)-fitted*.56)/(fitted*.56);expect(normalized).toBeCloseTo(travel,5);expect(tens().style.opacity).toBe(frozenOpacity);expect(frames.size).toBe(0);step(10000);expect(tens().style.opacity).toBe(frozenOpacity);
   h.resume();h.update({value:10});step(11000);expect(frames.size).toBe(0);expect(tens().querySelector<HTMLElement>('[data-glyph="1"]')?.style.transform).toBe('translateY(0px)');expect(units().querySelector<HTMLElement>('[data-glyph="0"]')?.style.transform).toBe('translateY(0px)');
   h.update({value:9});h.update({value:10,duration:0});expect(frames.size).toBe(0);expect(tens().style.opacity).toBe('1');h.destroy();expect(frames.size).toBe(0);
  }finally{h.destroy();host.remove();clock.mockRestore();vi.unstubAllGlobals();}
 });
});

describe('Number Reel visual slots',()=>{
 it('keeps exiting slots broad and beside retained places through pause, resize and reentry',()=>{
  const rect=vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){const root=this.closest('.number-reel') as HTMLElement|null,size=parseFloat(root?.style.getPropertyValue('--nr-effective')||'72'),ratio=this.textContent==='0'?.65:this.textContent==='3'?.6:.5;return {x:0,y:0,left:0,top:0,right:size*ratio,bottom:size*.85,width:size*ratio,height:size*.85,toJSON(){return{};}};});
  let now=100,id=0,resize=()=>{};const frames=new Map<number,FrameRequestCallback>();const clock=vi.spyOn(performance,'now').mockImplementation(()=>now);
  vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{frames.set(++id,cb);return id;});vi.stubGlobal('cancelAnimationFrame',(key:number)=>frames.delete(key));
  vi.stubGlobal('ResizeObserver',class{constructor(cb:()=>void){resize=cb;}observe(){}disconnect(){}});vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});
  const step=(time:number)=>{now=time;const batch=[...frames.values()];frames.clear();batch.forEach(cb=>cb(time));};
  const host=document.createElement('div');document.body.append(host);Object.defineProperty(host,'clientWidth',{value:1000,configurable:true});const h=mount(host,{value:-3243.6,format:'currency',currencySign:'accounting',theme:'light'});
  const cell=(key:string)=>host.querySelector<HTMLElement>('[data-place="'+key+'"]')!;
  const x=(key:string)=>parseFloat(cell(key).style.transform.slice(11));
  try{
   const comma=host.querySelector<HTMLElement>('[data-place=agroup3]')!;h.update({value:42,format:'decimal',fractionDigits:0});h.update({value:398.43,format:'percent',fractionDigits:0,signDisplay:'always'});step(200);expect(host.querySelectorAll('[data-place=agroup3]')).toHaveLength(1);expect(host.querySelector('[data-place=agroup3]')).toBe(comma);expect(Number(comma.style.opacity)).toBeGreaterThan(.99);h.update({value:-3243.6,format:'currency',currencySign:'accounting',fractionDigits:2,signDisplay:'auto',animate:false});h.update({animate:true});
   const initial=parseFloat(cell('i3').style.width);h.update({value:42,format:'decimal',fractionDigits:0,direction:'down'});step(365);
   expect(parseFloat(cell('i3').style.width)).toBeCloseTo(72*.65,5);expect(parseFloat(cell('i0').style.width)).toBeCloseTo(72*.5,5);expect(x('i3')).toBeLessThan(x('i1')-initial*2);expect(x('f0')).toBeGreaterThan(x('i0'));
   const opacity=cell('i3').style.opacity;expect(Number(opacity)).toBeGreaterThan(0);expect(Number(opacity)).toBeLessThan(1);
   h.pause();const before=x('i3')/parseFloat(cell('i3').style.width);h.update({fontSize:36});resize();expect(Math.abs(x('i3')/parseFloat(cell('i3').style.width)-before)).toBeLessThan(2/parseFloat(cell('i3').style.width));expect(cell('i3').style.opacity).toBe(opacity);expect(frames.size).toBe(0);
   h.update({value:-3243.6,format:'currency',currencySign:'accounting',fractionDigits:2});h.update({value:42,format:'decimal',fractionDigits:0});h.update({value:-3243.6,format:'currency',currencySign:'accounting',fractionDigits:2});h.resume();step(1500);step(2500);expect(frames.size).toBe(0);expect(host.querySelector('.nr-accessible')?.textContent).toBe('($3,243.60)');expect(host.querySelectorAll('[data-place="i3"]')).toHaveLength(1);
  }finally{h.destroy();host.remove();rect.mockRestore();clock.mockRestore();vi.unstubAllGlobals();}
 });
});
