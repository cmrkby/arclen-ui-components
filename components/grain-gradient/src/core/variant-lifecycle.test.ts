import {describe, expect, it} from 'vitest';
import {createGrainGradient} from './create-grain-gradient';
import {rendererSettings, resolveSettings, type Variant} from './settings';

/** Resource/clock model only. Actual WebGL compilation and pixels need browser proof. */
function fixture() {
  let serial = 0, phase = 0, contextRequests = 0;
  const programs = new Set<object>(), buffers = new Set<object>(), shaders = new Set<object>();
  const callbacks = new Map<number, FrameRequestCallback>();
  const draws: number[] = [];
  let failCompile = false;
  const gl = {
    VERTEX_SHADER:1, FRAGMENT_SHADER:2, COMPILE_STATUS:3, LINK_STATUS:4, HIGH_FLOAT:5,
    MAX_VIEWPORT_DIMS:6, MAX_RENDERBUFFER_SIZE:7, ARRAY_BUFFER:8, STATIC_DRAW:9, FLOAT:10, TRIANGLES:11,
    createShader(type:number) { const s={type}; shaders.add(s); return s; },
    deleteShader(s:object) { shaders.delete(s); }, shaderSource() {}, compileShader() {},
    getShaderParameter(s:{type:number}) { if (failCompile && s.type===2) {failCompile=false;return false;} return true; },
    getShaderInfoLog() { return 'Injected compilation failure in model'; },
    createProgram() { const p={id:++serial}; programs.add(p); return p; },
    deleteProgram(p:object) { programs.delete(p); }, attachShader() {}, linkProgram() {}, getProgramParameter() {return true;},
    getProgramInfoLog() { return ''; }, createBuffer() {const b={id:++serial};buffers.add(b);return b;},
    deleteBuffer(b:object) {buffers.delete(b);}, bindBuffer() {}, bufferData() {}, useProgram() {},
    getAttribLocation() { return 0; }, enableVertexAttribArray() {}, vertexAttribPointer() {},
    getUniformLocation(_:unknown,name:string) { return {name}; },
    getParameter(key:number) { return key===6?[4096,4096]:4096; },
    getShaderPrecisionFormat() { return {precision:23}; }, getExtension() {return null;}, viewport() {},
    uniform1f(location:{name:string}, value:number) {if(location.name==='u_phase')phase=value;},
    uniform2f() {}, uniform3fv() {}, uniform4fv() {}, drawArrays() {draws.push(phase);}
  };
  class Element extends EventTarget {
    style: Record<string,string> = {};
    attributes = new Map<string,string>();
    getAttribute(k:string) {return this.attributes.get(k)??null;}
    setAttribute(k:string,v:string) {this.attributes.set(k,v);}
    removeAttribute(k:string) {this.attributes.delete(k);}
    remove() {}
  }
  const fallback = new Element();
  class Canvas extends Element {
    width=0; height=0;
    ownerDocument = doc;
    parentElement = {querySelector:()=>fallback};
    getBoundingClientRect() { return {width:768,height:600,top:0,left:0,right:768,bottom:600}; }
    getContext() {contextRequests++; return gl;}
  }
  class View extends EventTarget {
    HTMLElement=Element; HTMLCanvasElement=Canvas;
    innerWidth=1440;innerHeight=900;
    requestAnimationFrame(callback:FrameRequestCallback) {const id=++serial;callbacks.set(id,callback);return id;}
    cancelAnimationFrame(id:number) {callbacks.delete(id);}
  }
  const view = new View();
  const doc = Object.assign(new EventTarget(), {hidden:false,defaultView:view});
  const canvas = new Canvas();
  const api = createGrainGradient(canvas as unknown as HTMLCanvasElement, rendererSettings(resolveSettings()), true);
  const update = (variant:Variant) => api.update(rendererSettings(resolveSettings({variant})));
  const tick = (now:number) => {const pending=[...callbacks.values()];callbacks.clear();pending.forEach(callback=>callback(now));};
  return {api,update,tick,doc,canvas,fallback,draws,programs,buffers,shaders,callbacks,
    contexts:()=>contextRequests,fail:()=>{failCompile=true;},
    loss:()=>{programs.clear();buffers.clear();shaders.clear();canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));},
    restore:()=>canvas.dispatchEvent(new Event('webglcontextrestored'))};
}

describe('Grain structure switching resource model', () => {
  it('keeps one context and one live program/buffer through repeated paused switches', () => {
    const f=fixture();
    for (const variant of ['ribbons','blanket','original','blanket','ribbons','original'] as const) {
      f.update(variant); expect(f.programs.size).toBe(1); expect(f.buffers.size).toBe(1);
      expect(f.shaders.size).toBe(0); expect(f.callbacks.size).toBe(0); expect(f.draws.at(-1)).toBe(0);
    }
    expect(f.contexts()).toBe(1);f.api.destroy();f.api.destroy();
    expect(f.programs.size+f.buffers.size+f.shaders.size+f.callbacks.size).toBe(0);
  });
  it('preserves elapsed phase and pause state, with no hidden switch draw or RAF', () => {
    const f=fixture();f.api.resume();f.tick(1000);f.tick(1050);f.api.pause();
    const held=f.draws.at(-1);expect(held).toBeGreaterThan(0);f.update('ribbons');expect(f.draws.at(-1)).toBe(held);
    f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));const count=f.draws.length;
    f.update('blanket');expect(f.draws).toHaveLength(count);expect(f.callbacks.size).toBe(0);
    f.doc.hidden=false;f.doc.dispatchEvent(new Event('visibilitychange'));expect(f.draws.at(-1)).toBe(held);
    expect(f.canvas.getAttribute('data-grain-status')).toBe('paused');f.api.destroy();
  });
  it('retires failed replacement resources and permits a later selected structure to recover', () => {
    const f=fixture();f.fail();f.update('ribbons');
    expect(f.canvas.style.visibility).toBe('hidden');expect(f.canvas.getAttribute('data-grain-status')).toBe('fallback');
    expect(f.fallback.style.backgroundImage).toContain('at 50% 29%');
    expect(f.programs.size+f.buffers.size+f.shaders.size).toBe(0);
    f.update('blanket');expect(f.canvas.style.visibility).toBe('visible');expect(f.programs.size).toBe(1);
    f.api.destroy();expect(f.programs.size+f.buffers.size+f.shaders.size).toBe(0);
  });
  it('defers lost-context switching until restoration and keeps the selected fallback', () => {
    const f=fixture();f.api.resume();f.tick(1000);f.tick(1050);f.api.pause();const held=f.draws.at(-1);
    f.loss();const count=f.draws.length;f.update('blanket');
    expect(f.draws).toHaveLength(count);expect(f.programs.size).toBe(0);expect(f.callbacks.size).toBe(0);
    expect(f.fallback.style.backgroundImage).toContain('at 111% 96%');
    f.restore();expect(f.programs.size).toBe(1);expect(f.draws.at(-1)).toBe(held);
    expect(f.canvas.getAttribute('data-grain-status')).toBe('paused');f.api.destroy();
  });
});
