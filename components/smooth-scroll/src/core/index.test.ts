import {describe,it,expect} from 'vitest';
import {defaults,render,resolveSettings} from './index';
import manifest from '../../component.json';
import {createField} from './field';
import {colorKeys,palettes,fieldSettings} from './palettes';
import {validateSettings,type ComponentManifest} from '../../../../packages/spec';
describe('smooth-scroll',()=>{
 it('matches manifest defaults and presets',()=>{expect(defaults).toEqual(Object.fromEntries(manifest.settings.map(s=>[s.key,s.default])));for(const p of manifest.previews){expect(resolveSettings(p.settings)).toEqual(validateSettings(manifest as ComponentManifest,p.settings));expect(render(p.settings)).toContain('ss-viewport');}});
 it('rejects unexpected or invalid inputs',()=>{for(const value of [null,[],{duration:Infinity},{height:1},{direction:'unknown'},{accent:'red;display:none'},{enabled:'true'},{caption:'x'.repeat(201)},{unknown:1}])expect(()=>resolveSettings(value)).toThrow();});
 it('escapes content and provides native semantic fallback',()=>{const html=render({caption:'<script>"&',returnLabel:'" onclick="evil'});expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');expect(html).toContain('tabindex="0"');expect(html).toContain('type="button"');expect(html).not.toContain('onclick="evil');});
});

// Minimal DOM fixture tests resource ownership without a browser renderer.
import {afterEach,vi} from 'vitest';
import {mount} from './index';
class NodeFixture extends EventTarget {
 style:Record<string,string>={};dataset:Record<string,string>={};attributes:Record<string,string>={};hidden=false;title='';textContent='';scrollTop=0;scrollHeight=2000;clientHeight=400;removed=false;focused=false;
 firstElementChild:NodeFixture|null=null;parentElement:NodeFixture|null=null;nodes:Record<string,NodeFixture>={};
 querySelector(selector:string){return this.nodes[selector]??null;}
 setAttribute(key:string,value:string){this.attributes[key]=value;}
 remove(){this.removed=true;if(this.parentElement)for(const [key,node] of Object.entries(this.parentElement.nodes))if(node===this)delete this.parentElement.nodes[key];}
 focus(){this.focused=true;}
}
function fixture(){
 const host=new NodeFixture(),root=new NodeFixture(),viewport=new NodeFixture(),content=new NodeFixture(),progress=new NodeFixture(),bar=new NodeFixture(),button=new NodeFixture(),caption=new NodeFixture();
 root.parentElement=host;host.nodes['.ss-root']=root;root.nodes={'.ss-viewport':viewport,'.ss-content':content,'.ss-progress':progress,'.ss-return':button,'.ss-caption p':caption};progress.firstElementChild=bar;
 Object.defineProperty(host,'innerHTML',{set(){
  const nextRoot=new NodeFixture(),nextProgress=new NodeFixture();nextProgress.firstElementChild=new NodeFixture();nextRoot.parentElement=host;
  nextRoot.nodes={'.ss-viewport':new NodeFixture(),'.ss-content':new NodeFixture(),'.ss-progress':nextProgress,'.ss-return':new NodeFixture(),'.ss-caption p':new NodeFixture()};
  host.nodes['.ss-root']=nextRoot;
 }});
 const queue=new Map<number,FrameRequestCallback>();let id=0;
 const doc=Object.assign(new EventTarget(),{hidden:false});const media=Object.assign(new EventTarget(),{matches:false});
 vi.stubGlobal('document',doc);vi.stubGlobal('matchMedia',()=>media);vi.stubGlobal('Element',NodeFixture);vi.stubGlobal('HTMLElement',NodeFixture);vi.stubGlobal('getComputedStyle',()=>({overflowY:'visible'}));
 vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{queue.set(++id,fn);return id;});vi.stubGlobal('cancelAnimationFrame',(n:number)=>queue.delete(n));
 vi.stubGlobal('IntersectionObserver',undefined);vi.stubGlobal('ResizeObserver',undefined);
 const wheel=(delta:number,target=viewport)=>{const event=new Event('wheel',{cancelable:true});Object.assign(event,{deltaY:delta,deltaX:0,deltaMode:0,ctrlKey:false,shiftKey:false});target.dispatchEvent(event);return event;};
 return {host,root,viewport,content,bar,button,caption,queue,media,doc,wheel};
}
afterEach(()=>vi.unstubAllGlobals());
describe('smooth-scroll controller',()=>{
 it('owns frames, interrupts for native input, and preserves content on updates',()=>{
  const f=fixture(),controller=mount(f.host as unknown as HTMLElement,{});
  expect(f.wheel(200).defaultPrevented).toBe(true);expect(f.queue.size).toBe(1);
  const [id,frame]=[...f.queue][0];f.queue.delete(id);frame(16);expect(f.viewport.scrollTop).toBeGreaterThan(0);
  f.viewport.dispatchEvent(new Event('keydown'));expect(f.queue.size).toBe(0);
  controller.update({caption:'Changed',coral:'#ff5522'});expect(f.caption.textContent).toBe('Changed');expect(f.root.nodes['.ss-content']).toBe(f.content);
  controller.pause();expect(f.wheel(200).defaultPrevented).toBe(false);controller.resume();expect(f.wheel(200).defaultPrevented).toBe(true);
  controller.destroy();expect(f.queue.size).toBe(0);expect(f.root.removed).toBe(true);expect(f.wheel(200).defaultPrevented).toBe(false);controller.destroy();controller.resume();expect(f.queue.size).toBe(0);
 });
 it('responds to live reduced motion and document visibility',()=>{
  const f=fixture(),controller=mount(f.host as unknown as HTMLElement,{});
  f.wheel(300);f.media.matches=true;f.media.dispatchEvent(new Event('change'));expect(f.queue.size).toBe(0);expect(f.wheel(300).defaultPrevented).toBe(false);
  f.viewport.scrollTop=300;f.button.dispatchEvent(new Event('click'));expect(f.viewport.scrollTop).toBe(0);expect(f.viewport.focused).toBe(true);
  f.media.matches=false;f.wheel(300);f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));expect(f.queue.size).toBe(0);expect(f.wheel(300).defaultPrevented).toBe(false);controller.destroy();
 });
});

describe('smooth-scroll measured response',()=>{
 it('keeps wheel ownership until the viewport reaches a boundary',()=>{
  const f=fixture(),controller=mount(f.host as unknown as HTMLElement,{});
  f.wheel(5000);expect(f.wheel(100).defaultPrevented).toBe(true);
  f.viewport.scrollTop=1600;expect(f.wheel(100).defaultPrevented).toBe(false);expect(f.queue.size).toBe(0);controller.destroy();
 });
 it('uses a 286ms exponential response and reveals return only beyond 400px',()=>{
  const f=fixture(),controller=mount(f.host as unknown as HTMLElement,{});f.wheel(600);
  for(let time=16;time<=656;time+=16){const [id,frame]=[...f.queue][0];f.queue.delete(id);frame(time);}
  expect(f.viewport.scrollTop).toBeCloseTo(600*(1-Math.exp(-656/286)),5);
  expect(f.button.dataset.visible).toBe('true');controller.pause();f.viewport.scrollTop=400;f.viewport.dispatchEvent(new Event('scroll'));expect(f.button.dataset.visible).toBe('false');f.viewport.scrollTop=401;f.viewport.dispatchEvent(new Event('scroll'));expect(f.button.dataset.visible).toBe('true');controller.destroy();
 });
});


describe('smooth-scroll remount ownership',()=>{
 it('disposes previous listeners and frames, and stale controllers cannot remove the current root',()=>{
  const f=fixture(),first=mount(f.host as unknown as HTMLElement,{});
  f.wheel(200);expect(f.queue.size).toBe(1);
  const second=mount(f.host as unknown as HTMLElement,{caption:'Second'});
  const currentRoot=f.host.nodes['.ss-root'],currentViewport=currentRoot.nodes['.ss-viewport'];
  expect(f.root.removed).toBe(true);expect(currentRoot).not.toBe(f.root);expect(f.queue.size).toBe(0);
  expect(f.wheel(200).defaultPrevented).toBe(false);
  expect(f.wheel(200,currentViewport).defaultPrevented).toBe(true);expect(f.queue.size).toBe(1);
  first.destroy();first.pause();first.resume();first.update({caption:'Stale'});
  expect(f.host.nodes['.ss-root']).toBe(currentRoot);expect(currentRoot.removed).toBe(false);
  expect(currentRoot.nodes['.ss-caption p'].textContent).toBe('Second');expect(f.queue.size).toBe(1);
  second.destroy();expect(f.queue.size).toBe(0);expect(f.host.nodes['.ss-root']).toBeUndefined();
  expect(f.wheel(200,currentViewport).defaultPrevented).toBe(false);
 });
 it('validates a replacement before disposing the current controller',()=>{
  const f=fixture(),controller=mount(f.host as unknown as HTMLElement,{});
  expect(()=>mount(f.host as unknown as HTMLElement,{duration:Infinity})).toThrow();
  expect(f.wheel(200).defaultPrevented).toBe(true);expect(f.root.removed).toBe(false);controller.destroy();
 });
});

function fieldFixture(failure='') {
 const canvas=Object.assign(new EventTarget(),{width:0,height:0,dataset:{} as Record<string,string>,getContext:vi.fn()});
 const uniforms=new Map<string,number[]>(),sources:string[]=[];
 const gl={
  VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,MAX_RENDERBUFFER_SIZE:5,
  ARRAY_BUFFER:6,STATIC_DRAW:7,FLOAT:8,TRIANGLES:9,
  createShader:vi.fn(()=>failure==='shader'?null:{}),shaderSource:vi.fn((_shader:unknown,source:string)=>sources.push(source)),compileShader:vi.fn(),getShaderParameter:vi.fn(()=>failure!=='compile'),deleteShader:vi.fn(),
  createProgram:vi.fn(()=>failure==='program'?null:{}),attachShader:vi.fn(),linkProgram:vi.fn(),getProgramParameter:vi.fn(()=>failure!=='link'),deleteProgram:vi.fn(),
  createBuffer:vi.fn(()=>failure==='buffer'?null:{}),bindBuffer:vi.fn(),bufferData:vi.fn(),deleteBuffer:vi.fn(),getAttribLocation:vi.fn(()=>0),getUniformLocation:vi.fn((_program:unknown,key:string)=>key),getParameter:vi.fn(()=>8192),isContextLost:vi.fn(()=>false),
  viewport:vi.fn(),useProgram:vi.fn(),enableVertexAttribArray:vi.fn(),vertexAttribPointer:vi.fn(),uniform2f:vi.fn(),uniform4fv:vi.fn((key:string,value:number[])=>uniforms.set(key,value)),uniform1f:vi.fn(),drawArrays:vi.fn(),
 };
 canvas.getContext.mockImplementation(()=>{if(failure==='throw')throw new Error('No context');return failure==='context'?null:gl;});
 return {canvas:canvas as unknown as HTMLCanvasElement,gl,uniforms,sources};
}

describe('smooth-scroll static field',()=>{
 it('uploads premultiplied RGBA and suppresses light in fully transparent colours',()=>{
  const f=fieldFixture(),field=createField(f.canvas)!;
  const settings=resolveSettings({palette:'custom',background:'#80402080',navy:'transparent',midnight:'#ffcc0000'});
  field.draw(600,settings);
  expect(f.canvas.getContext).toHaveBeenCalledWith('webgl',expect.objectContaining({alpha:true,premultipliedAlpha:true}));
  expect(f.uniforms.get('background')).toEqual([128/255*128/255,64/255*128/255,32/255*128/255,128/255]);
  expect(f.uniforms.get('navy')).toEqual([0,0,0,0]);expect(f.uniforms.get('midnight')).toEqual([0,0,0,0]);
  expect(f.sources.some(source=>source.includes('clamp(color.rgb,vec3(0.),vec3(color.a)),color.a'))).toBe(true);
  expect(f.canvas.dataset.ready).toBe('true');field.destroy();expect(f.canvas.dataset.ready).toBe('false');
 });
 it('retains opaque colours and caches a static draw until dimensions or colours change',()=>{
  const f=fieldFixture(),field=createField(f.canvas)!,settings=fieldSettings(resolveSettings());
  field.draw(600,settings);field.draw(600,settings);expect(f.gl.drawArrays).toHaveBeenCalledTimes(1);
  for(const key of colorKeys)expect(f.uniforms.get(key)).toEqual([...([1,3,5].map(i=>parseInt(settings[key].slice(i,i+2),16)/255)),1]);
  field.draw(601,settings);expect(f.gl.drawArrays).toHaveBeenCalledTimes(2);
  field.draw(601,{...settings,accent:'#ffffff80'});expect(f.gl.drawArrays).toHaveBeenCalledTimes(3);
  f.canvas.dispatchEvent(new Event('webglcontextlost'));expect(f.canvas.dataset.ready).toBe('false');
  field.destroy();field.destroy();expect(f.gl.deleteBuffer).toHaveBeenCalledTimes(1);expect(f.gl.deleteProgram).toHaveBeenCalledTimes(1);
  field.draw(800,settings);expect(f.gl.drawArrays).toHaveBeenCalledTimes(3);
 });
 it.each(['throw','context','shader','compile','program','link','buffer'])('keeps the CSS fallback on %s failure and frees allocated resources',failure=>{
  const f=fieldFixture(failure);expect(createField(f.canvas)).toBeNull();expect(f.canvas.dataset.ready).toBeUndefined();expect(f.gl.drawArrays).not.toHaveBeenCalled();
  if(['program','link','buffer'].includes(failure))expect(f.gl.deleteShader).toHaveBeenCalledTimes(2);
  if(['link','buffer'].includes(failure))expect(f.gl.deleteProgram).toHaveBeenCalledTimes(1);
 });
});

describe('smooth-scroll palettes',()=>{
 it('validates each preset and applies its twelve colours to the CSS and GPU settings',()=>{
  for(const [palette,colors] of Object.entries(palettes)) {
   const settings=resolveSettings({palette}),field=fieldSettings(settings),html=render({palette});
   colorKeys.forEach((key,index)=>{expect(field[key]).toBe(colors[index]);expect(html).toContain(`--ss-${key}:${colors[index]}`);});
  }
  expect(()=>resolveSettings({palette:'missing'})).toThrow('Invalid selection');
 });
 it('preserves custom colours through preset selection and leaves independent interface colours alone',()=>{
  const custom=resolveSettings({palette:'custom',background:'transparent',accent:'#12345680',foreground:'#abcdef',buttonColor:'#654321'});
  expect(fieldSettings(custom)).toBe(custom);
  const preset=fieldSettings({...custom,palette:'arclen'});expect(preset.accent).toBe(palettes.arclen[6]);
  expect(custom.accent).toBe('#12345680');expect(preset.foreground).toBe('#abcdef');expect(preset.buttonColor).toBe('#654321');
  expect(fieldSettings({...custom,palette:'custom'}).background).toBe('transparent');
 });
});
