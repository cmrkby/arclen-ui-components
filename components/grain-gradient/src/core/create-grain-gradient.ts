import {fragmentFor} from './variant-shaders';
import {geometryFor} from './variant-geometry';
import {fallbackImage} from './fallback';
import { VERTEX } from './field-shaders';
import { colorDepthAt, sampleColor } from './field-geometry';
import { GRAIN_BOUNDARY_WIDE, GRAIN_BOUNDARY_PORTRAIT } from './field-data';
import type { RendererSettings } from './settings';

function backingSize(width: number, height: number, hardwareLimit = 4096) {
  const w = Math.max(1, width), h = Math.max(1, height);
  const scale = Math.min(2, 2, Math.sqrt(6000000 / (w * h)), hardwareLimit / w, hardwareLimit / h);
  return { width: Math.max(1, Math.floor(w * scale)), height: Math.max(1, Math.floor(h * scale)), scale };
}
  export function createGrainGradient(canvas: HTMLCanvasElement, initial: RendererSettings, initiallyPaused: boolean) {
    const doc = canvas.ownerDocument;
    const view = doc.defaultView!;
    if (!view || !(canvas instanceof view.HTMLCanvasElement)) throw new TypeError('A canvas with an owner window is required.');
    let settings = initial;
    let gl: WebGLRenderingContext;
    let softwareRenderer = false;
    let program: WebGLProgram | null = null, buffer: WebGLBuffer | null = null;
    let uniforms: Record<string, WebGLUniformLocation | null> = {};
    let disposed = false, lost = false, available = false, userPaused = initiallyPaused;
    let phase = 0, lastTime: number | null = null, raf: number | null = null;
    let cssWidth = 1, cssHeight = 1, hardwareLimit = 4096;
    let inView = false, dirty = true;
    // Null preserves geometric visibility until the first observer report.
    let observedIntersection: boolean | null = null;
    const media = typeof view.matchMedia === 'function' ? view.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const oldStyle = canvas.getAttribute('style');
    const oldReady = canvas.getAttribute('data-grain-ready');
    const oldStatus = canvas.getAttribute('data-grain-status');
    if (!canvas.parentElement) throw new TypeError('The canvas needs a positioned receiving host.');
    let existingFallback = canvas.parentElement.querySelector<HTMLElement>(':scope > [data-grain-fallback]');
    const ownsFallback = !existingFallback;
    if (!existingFallback) {
      existingFallback = doc.createElement('div'); existingFallback.setAttribute('data-grain-fallback', '');
      existingFallback.setAttribute('aria-hidden', 'true'); canvas.before(existingFallback);
    }
    const fallback = existingFallback;
    const oldFallbackStyle = fallback.getAttribute('style');
    Object.assign(fallback.style, { position: 'absolute', inset: '0', pointerEvents: 'none', backgroundColor: '#000' });
    canvas.style.visibility = 'hidden';
    let resizeObserver: ResizeObserver | null = null, intersectionObserver: IntersectionObserver | null = null;

    function intersectingNow() {
      const r = canvas.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < view.innerHeight && r.left < view.innerWidth;
    }
    function reason() {
      if (disposed) return 'destroyed';
      if (!available) return lost ? 'context-lost' : 'fallback';
      if (doc.hidden) return 'hidden';
      if (!inView) return 'offscreen';
      if (userPaused) return 'paused';
      if (media?.matches) return 'reduced-motion';
      if (settings.speed === 0) return 'speed-zero';
      if (softwareRenderer) return 'software-renderer';
      if (typeof view.requestAnimationFrame !== 'function') return 'static';
      return 'running';
    }
    function announce() { canvas.setAttribute('data-grain-status', reason()); }
    function stop() {
      if (raf !== null) view.cancelAnimationFrame?.(raf);
      raf = null;
      lastTime = null;
    }
    function fallbackColors() {
      const [coreColor, glowColor, edgeColor, rimColor] = settings.colors;
      const [coreStrength, glowStrength, edgeStrength, rimStrength] = settings.strengths;
      fallback.style.backgroundImage = fallbackImage({variant: settings.variant, size: settings.size, coreColor, glowColor, edgeColor, rimColor, coreStrength, glowStrength, edgeStrength, rimStrength}, Math.min(cssWidth, cssHeight));
    }
    function shader(type: number, source: string) {
      const obj = gl.createShader(type);
      if (!obj) throw new Error('Could not allocate shader.');
      gl.shaderSource(obj, source); gl.compileShader(obj);
      if (!gl.getShaderParameter(obj, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(obj); gl.deleteShader(obj); throw new Error(message || 'Shader compilation failed.');
      }
      return obj;
    }
    function initialize() {
      let vertex: WebGLShader | null = null, fragment: WebGLShader | null = null, candidate: WebGLProgram | null = null;
      let candidateBuffer: WebGLBuffer | null = null;
      try {
        const context = gl || canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
        if (!context) return false;
        gl = context;
        // Proposed support policy: known software WebGL holds the configured shader at its current phase.
        const rendererInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const rendererName = rendererInfo ? String(gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL)) : '';
        softwareRenderer = /SwiftShader|llvmpipe|softpipe|Software Rasterizer|Microsoft Basic Render Driver/i.test(rendererName);
        const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
        if (!precision || precision.precision < 16) throw new Error('High precision fragment floats unavailable.');
        vertex = shader(gl.VERTEX_SHADER, VERTEX); fragment = shader(gl.FRAGMENT_SHADER, fragmentFor(settings.variant));
        candidate = gl.createProgram();
        if (!candidate) throw new Error('Could not allocate program.');
        gl.attachShader(candidate, vertex); gl.attachShader(candidate, fragment); gl.linkProgram(candidate);
        if (!gl.getProgramParameter(candidate, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(candidate) || 'Program link failed.');
        candidateBuffer = gl.createBuffer();
        if (!candidateBuffer) throw new Error('Could not allocate vertex buffer.');
        gl.bindBuffer(gl.ARRAY_BUFFER, candidateBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        gl.useProgram(candidate);
        const location = gl.getAttribLocation(candidate, 'a_position');
        if (location < 0) throw new Error('Missing vertex attribute.');
        gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
        const candidateUniforms: Record<string, WebGLUniformLocation | null> = {};
        for (const name of ['resolution', 'cssSize', 'colors[0]', 'strengths', 'grain', 'grainScale', 'size', 'softness', 'phase', 'seed', 'lower', 'upper', 'powers', 'colorDepth', 'shoulderDepth', 'bridge', 'boundaryLower', 'boundaryUpper']) candidateUniforms[name] = gl.getUniformLocation(candidate, `u_${name}`);
        const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
        hardwareLimit = Math.min(4096, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), viewport[0], viewport[1]);
        // Commit only a fully linked replacement, then retire this instance's old resources.
        const previousProgram = program, previousBuffer = buffer;
        program = candidate; candidate = null;
        buffer = candidateBuffer; candidateBuffer = null; uniforms = candidateUniforms;
        if (previousBuffer) gl.deleteBuffer(previousBuffer);
        if (previousProgram) gl.deleteProgram(previousProgram);
        return true;
      } catch {
        if (buffer && gl) gl.deleteBuffer(buffer);
        if (program && gl) gl.deleteProgram(program);
        buffer = null; program = null; canvas.style.visibility = 'hidden';
        canvas.setAttribute('data-grain-ready', 'false');
        // Allocation/compile failure keeps the configured static scene visible.
        return false;
      } finally {
        if (vertex) gl.deleteShader(vertex);
        if (fragment) gl.deleteShader(fragment);
        if (candidate) gl.deleteProgram(candidate);
        if (candidateBuffer) gl.deleteBuffer(candidateBuffer);
      }
    }
    function resize() {
      if (disposed) return;
      const rect = canvas.getBoundingClientRect();
      cssWidth = Math.max(1, rect.width); cssHeight = Math.max(1, rect.height); fallbackColors();
      const size = backingSize(cssWidth, cssHeight, hardwareLimit);
      if (canvas.width !== size.width || canvas.height !== size.height) {
        canvas.width = size.width; canvas.height = size.height;
      }
      inView = observedIntersection !== false && intersectingNow(); dirty = true; reconcile();
    }
    // Uniform arrays are reused; slider updates do not allocate GL resources.
    const colorValues = new Float32Array(12);
    const strengthValues = new Float32Array(4);
    function draw() {
      if (!available || disposed || lost) return;
      settings.colors.forEach((color, i) => {
        for (let c = 0; c < 3; c++) colorValues[i * 3 + c] = parseInt(color.slice(1 + c * 2, 3 + c * 2), 16) / 255;
      });
      gl.useProgram(program); gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform2f(uniforms.cssSize, cssWidth, cssHeight);
      gl.uniform3fv(uniforms['colors[0]'], colorValues);
      strengthValues.set(settings.strengths); gl.uniform4fv(uniforms.strengths, strengthValues);
      gl.uniform1f(uniforms.grain, settings.grain); gl.uniform1f(uniforms.grainScale, settings.grainScale);
      gl.uniform1f(uniforms.size, settings.size); gl.uniform1f(uniforms.softness, settings.softness);
      gl.uniform1f(uniforms.phase, phase); gl.uniform1f(uniforms.seed, settings.seed);
      const shape = geometryFor(settings.variant,phase,settings.seed,cssWidth/cssHeight);
      gl.uniform4fv(uniforms.lower, shape.slice(0,4)); gl.uniform4fv(uniforms.upper, shape.slice(5,9));
      gl.uniform2f(uniforms.powers,shape[4],shape[9]);
      const depth=colorDepthAt(phase,settings.seed,cssWidth/cssHeight);gl.uniform2f(uniforms.colorDepth,depth[0],depth[1]);gl.uniform1f(uniforms.bridge,depth[2]);
      gl.uniform2f(uniforms.shoulderDepth,depth[3]/255,depth[4]/255);
      const hostMix=Math.max(0,Math.min(1,(1.6-cssWidth/cssHeight)/1.22));
      const wideBoundary=sampleColor(phase,settings.seed,GRAIN_BOUNDARY_WIDE),portraitBoundary=sampleColor(phase,settings.seed,GRAIN_BOUNDARY_PORTRAIT);
      const boundary=wideBoundary.map((v,i)=>v+(portraitBoundary[i]-v)*hostMix);
      gl.uniform3fv(uniforms.boundaryLower,boundary.slice(0,123));gl.uniform3fv(uniforms.boundaryUpper,boundary.slice(123));
      gl.drawArrays(gl.TRIANGLES, 0, 3); dirty = false;
      canvas.style.visibility = 'visible'; canvas.setAttribute('data-grain-ready', 'true');
    }
    function tick(now: number) {
      raf = null;
      if (reason() !== 'running') { lastTime = null; return; }
      if (lastTime !== null) phase += Math.min(0.1, Math.max(0, (now - lastTime) / 1000)) * settings.speed;
      lastTime = now; draw();
      if (reason() === 'running') raf = view.requestAnimationFrame(tick);
    }
    function reconcile() {
      if (disposed) return;
      const status = reason();
      if (status !== 'running') stop();
      if (available && !lost && !doc.hidden && inView && dirty) draw();
      if (status === 'running' && raf === null) raf = view.requestAnimationFrame(tick);
      announce();
    }
    function update(next: RendererSettings) {
      if (disposed) throw new Error('This instance is destroyed.');
      const changedStructure = next.variant !== settings.variant;
      if (changedStructure) stop();
      settings = next;
      // Keep phase and pause/visibility ownership. A failed replacement shows the
      // selected structure's CSS fallback instead of the old structure's shader.
      if (changedStructure && !lost) available = initialize();
      fallbackColors(); dirty = true; resize();
    }
    function visibilityChanged() { dirty = true; reconcile(); }
    function windowResized() { resize(); }
    function reducedChanged() { dirty = true; reconcile(); }
    function contextLost(event: Event) {
      event.preventDefault(); lost = true; available = false; program = null; buffer = null;
      canvas.setAttribute('data-grain-ready', 'false'); canvas.style.visibility = 'hidden'; stop(); announce();
    }
    function contextRestored() {
      if (disposed) return;
      lost = false; available = initialize(); dirty = true; resize();
    }
    function pause() { if (!disposed) { userPaused = true; reconcile(); } }
    function resume() { if (!disposed) { userPaused = false; reconcile(); } }
    function destroy() {
      if (disposed) return;
      stop(); disposed = true;
      resizeObserver?.disconnect(); intersectionObserver?.disconnect();
      doc.removeEventListener('visibilitychange', visibilityChanged);
      view.removeEventListener('resize', windowResized);
      media?.removeEventListener?.('change', reducedChanged);
      view.removeEventListener('scroll', windowResized, true);
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('webglcontextrestored', contextRestored);
      if (gl && !lost) {
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
      buffer = null; program = null; available = false;
      if (ownsFallback) fallback.remove();
      else if (oldFallbackStyle === null) fallback.removeAttribute('style');
      else fallback.setAttribute('style', oldFallbackStyle);
      if (oldStyle === null) canvas.removeAttribute('style'); else canvas.setAttribute('style', oldStyle);
      if (oldReady === null) canvas.removeAttribute('data-grain-ready'); else canvas.setAttribute('data-grain-ready', oldReady);
      if (oldStatus === null) canvas.removeAttribute('data-grain-status'); else canvas.setAttribute('data-grain-status', oldStatus);
    }
    fallbackColors(); available = initialize();
    doc.addEventListener('visibilitychange', visibilityChanged);
    view.addEventListener('resize', windowResized);
    media?.addEventListener?.('change', reducedChanged);
    canvas.addEventListener('webglcontextlost', contextLost);
    canvas.addEventListener('webglcontextrestored', contextRestored);
    if (typeof view.ResizeObserver === 'function') { resizeObserver = new view.ResizeObserver(resize); resizeObserver.observe(canvas); }
    if (typeof view.IntersectionObserver === 'function') {
      intersectionObserver = new view.IntersectionObserver(entries => {
        if (disposed || !entries[0]) return;
        observedIntersection = entries[0].isIntersecting && entries[0].intersectionRatio > 0;
        inView = observedIntersection && intersectingNow();
        dirty = true; reconcile();
      });
      intersectionObserver.observe(canvas);
    } else view.addEventListener('scroll', windowResized, {capture: true, passive: true});
    resize();
    return Object.freeze({ update, pause, resume, destroy });
  }
