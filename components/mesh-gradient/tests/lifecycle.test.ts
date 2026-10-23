import { afterEach, describe, expect, it, vi } from 'vitest';
import manifest from '../component.json';
import type { Settings } from '../src/core/index';
import { MeshGradientRenderer } from '../src/core/renderer.js';

const settings = () => Object.fromEntries(manifest.settings.map(s => [s.key, Array.isArray(s.default) ? [...s.default] : s.default])) as unknown as Settings;

class TrackedTarget extends EventTarget {
  listeners = new Map<string, Set<any>>();
  override addEventListener(type: string, listener: any, options?: any) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener); super.addEventListener(type, listener, options);
  }
  override removeEventListener(type: string, listener: any, options?: any) {
    this.listeners.get(type)?.delete(listener); super.removeEventListener(type, listener, options);
  }
  count() { return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0); }
}

type Failure = 'none' | 'missing' | 'compile' | 'vertex-compile' | 'fragment-compile' |
  'link' | 'program-allocation' | 'second-shader-allocation';

function environment(failure: Failure = 'none') {
  let now = 0, sequence = 0;
  const raf = new Map<number, FrameRequestCallback>();
  const contexts: any[] = [];
  const canvases: any[] = [];
  const resize: any[] = [], intersection: any[] = [];
  class Observer {
    active = false;
    constructor(public callback: any) { resize.push(this); }
    observe() { this.active = true; }
    disconnect() { this.active = false; }
  }
  class ViewObserver extends Observer {
    constructor(callback: any) { super(callback); resize.pop(); intersection.push(this); }
  }
  const doc = Object.assign(new TrackedTarget(), {
    hidden: false,
    documentElement: { clientWidth: 768 },
    createElement() {
      const resources = { program: new Set(), buffer: new Set(), shader: new Set() };
      const uniform = new Map();
      let shaderAllocations = 0;
      const gl: any = {
        VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
        ARRAY_BUFFER: 5, STATIC_DRAW: 6, FLOAT: 7, COLOR_BUFFER_BIT: 8, TRIANGLES: 9,
        resources, draws: [] as any[], lost: 0, shaderStatusQueries: 0,
        createdPrograms: [] as any[], createdShaders: [] as any[], deletedPrograms: [] as any[], deletedShaders: [] as any[], usedPrograms: [] as any[],
        createProgram() {
          if (failure === 'program-allocation') return null;
          const p = { attached: [] as any[], linked: false };
          resources.program.add(p); gl.createdPrograms.push(p); return p;
        },
        createBuffer() { const p = {}; resources.buffer.add(p); return p; },
        createShader(type: number) {
          if (++shaderAllocations === 2 && failure === 'second-shader-allocation') return null;
          const p = { type, compiled: false };
          resources.shader.add(p); gl.createdShaders.push(p); return p;
        },
        deleteProgram(p: any) { resources.program.delete(p); gl.deletedPrograms.push(p); },
        deleteBuffer(p: any) { resources.buffer.delete(p); },
        deleteShader(p: any) { resources.shader.delete(p); gl.deletedShaders.push(p); },
        shaderSource() {},
        compileShader(shader: any) {
          shader.compiled = !((failure === 'compile' || failure === 'vertex-compile') && shader.type === gl.VERTEX_SHADER) &&
            !(failure === 'fragment-compile' && shader.type === gl.FRAGMENT_SHADER);
        },
        attachShader(program: any, shader: any) { program.attached.push(shader); },
        linkProgram(program: any) {
          program.linked = failure !== 'link' && program.attached.length === 2 &&
            program.attached.every((shader: any) => shader.compiled);
        },
        useProgram(program: any) { gl.usedPrograms.push(program); },
        getShaderParameter(shader: any) { gl.shaderStatusQueries++; return shader.compiled; },
        getProgramParameter(program: any) { return program.linked; },
        getUniformLocation(_program: any, name: string) { return name; },
        uniform1f(key: string, value: number) { uniform.set(key, value); },
        uniform2f(key: string, ...value: number[]) { uniform.set(key, value); },
        uniform4fv(key: string, value: Float32Array) { uniform.set(key, [...value]); },
        uniform1i(key: string, value: number) { uniform.set(key, value); },
        bindBuffer() {}, bufferData() {}, enableVertexAttribArray() {}, vertexAttribPointer() {}, viewport() {}, clear() {},
        drawArrays() {
          if (!gl.usedPrograms.at(-1)?.linked) throw new Error('No successfully linked program');
          gl.draws.push({ time: uniform.get('u_time'), resolution: uniform.get('u_resolution') });
        },
        getExtension() { return { loseContext() { gl.lost++; } }; },
      };
      const canvas = Object.assign(new TrackedTarget(), {
        width: 300, height: 150, style: { cssText: '', visibility: '' }, removed: false,
        setAttribute() {}, remove() { canvas.removed = true; },
        getContext() { return failure === 'missing' ? null : gl; },
      });
      contexts.push(gl); canvases.push(canvas); return canvas;
    },
  });
  const mq = Object.assign(new TrackedTarget(), { matches: false });
  const viewport = Object.assign(new TrackedTarget(), { scale: 1, width: 768 });
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', { matchMedia: () => mq, visualViewport: viewport, innerWidth: 768, outerWidth: 768, devicePixelRatio: 1 });
  vi.stubGlobal('ResizeObserver', Observer); vi.stubGlobal('IntersectionObserver', ViewObserver);
  vi.stubGlobal('performance', { now: () => now });
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { raf.set(++sequence, cb); return sequence; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => raf.delete(id));
  const host = () => ({ isConnected: true, style: { isolation: '', position: '' }, dataset: {} as Record<string, string>, prepend() {} });
  return {
    doc, mq, viewport, raf, contexts, canvases, resize, intersection, host,
    size(index = 0, width = 768, height = 1024, device = true) {
      resize[index].callback([{ borderBoxSize: [{ inlineSize: width, blockSize: height }],
        ...(device ? { devicePixelContentBoxSize: [{ inlineSize: width, blockSize: height }] } : {}) }]);
    },
    visible(index = 0, value = true) { intersection[index].callback([{ isIntersecting: value }]); },
    frame(time: number, deliveredAt = time) { now = deliveredAt; const callbacks = [...raf.values()]; raf.clear(); callbacks.forEach(cb => cb(time)); },
    clock(time: number) { now = time; },
    hidden(value: boolean) { doc.hidden = value; doc.dispatchEvent(new Event('visibilitychange')); },
    reduced(value: boolean) { mq.matches = value; mq.dispatchEvent(new Event('change')); },
  };
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('Mesh Gradient lifecycle (isolated behavioral doubles, not native browser proof)', () => {
  it('uses the linked program without synchronously polling each shader on successful setup', () => {
    const env = environment(); const root = env.host();
    const renderer = new MeshGradientRenderer(root, settings()); const gl = env.contexts[0];
    expect(gl.usedPrograms).toHaveLength(1);
    expect(gl.usedPrograms[0].linked).toBe(true);
    expect(gl.usedPrograms[0].attached.map((shader: any) => shader.type)).toEqual([gl.VERTEX_SHADER, gl.FRAGMENT_SHADER]);
    expect(gl.shaderStatusQueries).toBe(0);
    expect(gl.draws).toHaveLength(0);
    expect(env.canvases[0].style.visibility).toBe('hidden');
    env.size(); env.visible();
    expect(gl.draws[0]).toEqual({ time: 0, resolution: [1536, 2048] });
    expect(root.dataset.ready).toBe('true');
    expect(new Set(gl.deletedShaders)).toEqual(new Set(gl.createdShaders));
    renderer.destroy();
    expect(new Set(gl.deletedPrograms)).toEqual(new Set(gl.createdPrograms));
    expect(gl.resources.program.size + gl.resources.shader.size + gl.resources.buffer.size).toBe(0);
  });

  it.each(['vertex-compile', 'fragment-compile', 'link', 'program-allocation', 'second-shader-allocation'] as const)(
    'retains fallback and releases every partial allocation after %s failure', failure => {
      const env = environment(failure); const root = env.host();
      const renderer = new MeshGradientRenderer(root, settings()); const gl = env.contexts[0];
      expect(root.dataset.ready).toBe('false');
      expect(gl.draws).toHaveLength(0); expect(gl.usedPrograms).toHaveLength(0);
      expect(env.canvases[0].removed).toBe(true);
      expect(gl.lost).toBe(1);
      expect(gl.resources.program.size + gl.resources.shader.size + gl.resources.buffer.size).toBe(0);
      expect(gl.deletedPrograms).toHaveLength(gl.createdPrograms.length);
      expect(new Set(gl.deletedPrograms)).toEqual(new Set(gl.createdPrograms));
      expect(gl.deletedShaders).toHaveLength(gl.createdShaders.length);
      expect(new Set(gl.deletedShaders)).toEqual(new Set(gl.createdShaders));
      expect(env.raf.size).toBe(0);
      expect(env.doc.count() + env.mq.count() + env.viewport.count() + env.canvases[0].count()).toBe(0);
      expect(env.resize.some(observer => observer.active) || env.intersection.some(observer => observer.active)).toBe(false);
      renderer.update(settings()); renderer.resume(); renderer.destroy();
      expect(gl.draws).toHaveLength(0);
      expect(gl.deletedPrograms).toHaveLength(gl.createdPrograms.length);
      expect(gl.deletedShaders).toHaveLength(gl.createdShaders.length);
    },
  );

  it('sizes before first shader0, holds independently for all blockers and rebases resume', () => {
    const env = environment(); const root = env.host();
    const renderer = new MeshGradientRenderer(root, settings());
    expect(env.contexts[0].draws).toHaveLength(0);
    env.size(); env.visible();
    expect(env.contexts[0].draws[0]).toEqual({ time: 0, resolution: [1536, 2048] });
    env.frame(1000); expect(env.contexts[0].draws.at(-1).time).toBe(1);
    renderer.pause(); env.hidden(true); env.reduced(true); renderer.resume();
    expect(env.raf.size).toBe(0);
    env.clock(9000); env.hidden(false); expect(env.raf.size).toBe(0);
    env.reduced(false); env.visible(0, false); expect(env.raf.size).toBe(0);
    env.visible(); env.frame(8999, 9001); expect(env.contexts[0].draws.at(-1).time).toBe(1);
    // Resume baseline is 9000: stale 8999 must not add an extra millisecond.
    env.frame(9010); expect(env.contexts[0].draws.at(-1).time).toBeCloseTo(1.010, 12);
    root.isConnected = false; env.frame(9020); expect(env.raf.size).toBe(0);
    renderer.destroy();
  });
  it('does not rewind the resume clock when a queued RAF predates a media change', () => {
    const env = environment(); env.reduced(true);
    const renderer = new MeshGradientRenderer(env.host(), settings());
    env.size(); env.visible();
    expect(env.contexts[0].draws.at(-1).time).toBe(0);
    env.clock(1139); env.reduced(false);
    // Native trace: callback arrival and RAF's frame timestamp are different clocks.
    env.frame(1125.338, 1139.1);
    expect(env.contexts[0].draws.at(-1).time).toBe(0);
    env.frame(1192, 1195.2);
    expect(env.contexts[0].draws.at(-1).time).toBeCloseTo(0.053, 12);
    renderer.destroy();
  });
  it('holds duplicate and decreasing RAF timestamps without crediting them later', () => {
    const env = environment(); const renderer = new MeshGradientRenderer(env.host(), settings());
    env.size(); env.visible();
    env.frame(1000, 1010); expect(env.contexts[0].draws.at(-1).time).toBe(1);
    env.frame(1000, 1020); expect(env.contexts[0].draws.at(-1).time).toBe(1);
    env.frame(990, 1030); expect(env.contexts[0].draws.at(-1).time).toBe(1);
    env.frame(1010, 1040); expect(env.contexts[0].draws.at(-1).time).toBeCloseTo(1.010, 12);
    renderer.destroy();
  });
  it('preserves ordinary increasing RAF advancement independently of callback arrival', () => {
    const env = environment(); const renderer = new MeshGradientRenderer(env.host(), settings());
    env.size(); env.visible();
    for (const [timestamp, deliveredAt, phase] of [[100, 105, 0.1], [150, 180, 0.15], [300, 320, 0.3]]) {
      env.frame(timestamp, deliveredAt);
      expect(env.contexts[0].draws.at(-1).time).toBeCloseTo(phase, 12);
    }
    renderer.destroy();
  });
  it('preserves context, buffer, program and phase across uniform/content/speed updates', () => {
    const env = environment(); const renderer = new MeshGradientRenderer(env.host(), settings());
    env.size(); env.visible(); env.frame(2500); renderer.pause();
    const handles = [renderer.program, renderer.buffer, renderer.gl];
    const count = env.contexts[0].draws.length;
    renderer.update({ ...settings(), colors: ['#ffffff', '#000000'], headline: 'changed', speed: 2 });
    expect([renderer.program, renderer.buffer, renderer.gl]).toEqual(handles);
    expect(env.contexts).toHaveLength(1);
    expect(env.contexts[0].draws).toHaveLength(count + 1);
    expect(env.contexts[0].draws.at(-1).time).toBe(2.5);
    expect(env.raf.size).toBe(0);
    renderer.resume(); env.frame(3000); expect(env.contexts[0].draws.at(-1).time).toBe(3.5);
    renderer.update({ ...settings(), speed: 0 }); expect(env.raf.size).toBe(0);
    renderer.destroy();
  });
  it('redraws each new shader control at the held phase without replacing GPU resources', () => {
    const env = environment(); const renderer = new MeshGradientRenderer(env.host(), settings());
    env.size(); env.visible(); env.frame(1250); renderer.pause();
    const handles = [renderer.program, renderer.buffer, renderer.gl, env.canvases[0]];
    for (const [key, value] of [['scale', 1.6], ['stretch', .6], ['rotation', 90], ['colorBlend', .9], ['motionSpread', .4]]) {
      const before = env.contexts[0].draws.length;
      renderer.update({ ...settings(), [key]: value });
      expect(env.contexts[0].draws).toHaveLength(before + 1);
      expect(env.contexts[0].draws.at(-1).time).toBe(1.25);
      expect([renderer.program, renderer.buffer, renderer.gl, env.canvases[0]]).toEqual(handles);
      expect(env.raf.size).toBe(0);
    }
    expect(env.contexts).toHaveLength(1);
    renderer.destroy();
  });
  it('owns two instances and cleans all handles/listeners/observers through20cycles', () => {
    const env = environment();
    for (let n = 0; n < 20; n++) {
      const a = new MeshGradientRenderer(env.host(), settings());
      const b = new MeshGradientRenderer(env.host(), settings());
      env.size(n * 2); env.visible(n * 2); env.size(n * 2 + 1); env.visible(n * 2 + 1);
      env.frame(n * 1000 + 500);
      const other = env.contexts[n * 2 + 1].draws.map((x: any) => ({ ...x }));
      a.pause(); a.update({ ...settings(), swirl: 1 });
      expect(env.contexts[n * 2 + 1].draws).toEqual(other);
      a.resume(); a.destroy(); a.destroy(); b.destroy();
      const counts = env.contexts.map(gl => gl.draws.length);
      env.frame(n * 1000 + 999);
      env.resize[n * 2].callback([{ borderBoxSize: [{ inlineSize: 500, blockSize: 500 }] }]);
      expect(env.contexts.map(gl => gl.draws.length)).toEqual(counts);
      expect(env.raf.size).toBe(0);
      expect(env.doc.count() + env.mq.count() + env.viewport.count()).toBe(0);
      expect(env.resize.some(o => o.active) || env.intersection.some(o => o.active)).toBe(false);
    }
    for (const gl of env.contexts) {
      expect(gl.resources.program.size + gl.resources.buffer.size + gl.resources.shader.size).toBe(0);
      expect(gl.lost).toBe(1);
    }
    expect(env.canvases.every(canvas => canvas.removed && canvas.count() === 0)).toBe(true);
  });
  it('defers zero size, supports fallback measurement and reduced initial static state', () => {
    const env = environment(); env.reduced(true);
    const renderer = new MeshGradientRenderer(env.host(), settings());
    env.size(0, 0, 0); env.visible(); expect(env.contexts[0].draws).toHaveLength(0);
    env.size(0, 768, 1024, false); expect(env.contexts[0].draws.at(-1)).toEqual({ time: 0, resolution: [1536, 2048] });
    expect(env.raf.size).toBe(0); renderer.destroy();
  });
  it.each(['missing', 'compile', 'link'] as const)('keeps fallback and releases partial resources on %s failure', failure => {
    const env = environment(failure); const root = env.host();
    const renderer = new MeshGradientRenderer(root, settings());
    expect(root.dataset.ready).toBe('false'); expect(env.raf.size).toBe(0);
    renderer.update(settings()); renderer.resume(); renderer.destroy();
    for (const gl of env.contexts) expect(gl.resources.program.size + gl.resources.buffer.size + gl.resources.shader.size).toBe(0);
    expect(env.doc.count() + env.mq.count() + env.viewport.count()).toBe(0);
  });
  it('restores fallback on context loss and does not retry or draw', () => {
    const env = environment(); const root = env.host(); const renderer = new MeshGradientRenderer(root, settings());
    env.size(); env.visible(); env.frame(100); const count = env.contexts[0].draws.length;
    env.canvases[0].dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    env.frame(200); renderer.resume(); renderer.update(settings());
    expect(root.dataset.ready).toBe('false'); expect(env.raf.size).toBe(0);
    expect(env.contexts[0].draws).toHaveLength(count); renderer.destroy();
  });
  it('destroy during setup makes delayed observer deliveries inert', () => {
    const env = environment(); const renderer = new MeshGradientRenderer(env.host(), settings());
    renderer.destroy(); env.size(); env.visible(); env.frame(1000);
    expect(env.contexts[0].draws).toHaveLength(0); expect(env.raf.size).toBe(0);
  });
});
