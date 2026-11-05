const MAX_COLORS = 10;
const MAX_BACKING_PIXELS = 1920 * 1080 * 4;

const VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec2 a_corner;
void main() {
  gl_Position = vec4(a_corner, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp int;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec4 u_colors[${MAX_COLORS}];
uniform int u_colorCount;
uniform float u_scale;
uniform float u_stretch;
uniform float u_rotation;
uniform float u_colorBlend;
uniform float u_motionSpread;
uniform float u_distortion;
uniform float u_swirl;
uniform float u_grainMixer;
uniform float u_grainOverlay;

out vec4 fragColor;

float ease(float x) {
  return smoothstep(0.0, 1.0, x);
}

// Counter-clockwise rotation by angle a.
vec2 turn(vec2 v, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}

float hash(vec2 v) {
  vec2 t = fract(v * vec2(0.3183099, 0.3678794)) + 0.1;
  t += dot(t, t + 19.19);
  return fract(t.x * t.y);
}

float valueNoise(vec2 v) {
  vec2 cell = floor(v);
  vec2 f = fract(v);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(cell);
  float b = hash(cell + vec2(1.0, 0.0));
  float c = hash(cell + vec2(0.0, 1.0));
  float d = hash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  // Unit square centred on the shorter side; the pattern runs on past it along the longer side.
  float shorter = min(u_resolution.x, u_resolution.y);
  vec2 q = (gl_FragCoord.xy / u_resolution - 0.5) * (u_resolution / shorter) + 0.5;
  // Neutral defaults retain the original coordinates and colour trajectories.
  if (u_scale != 1.0 || u_stretch != 1.0) q = (q - 0.5) / vec2(u_scale * u_stretch, u_scale) + 0.5;
  if (u_rotation != 0.0) q = turn(q - 0.5, radians(u_rotation)) + 0.5;
  float tau = 0.5 * (u_time + 41.5);

  float r = ease(length(q - 0.5));
  float k = 1.0 - r;

  vec2 p = q;
  for (int n = 1; n <= 2; n++) {
    float i = float(n);
    float amount = u_distortion * k / i;
    p.x += amount * sin(tau + 0.4 * i * ease(p.y)) * cos(0.2 * tau + 2.4 * i * ease(p.y));
    p.y += amount * cos(tau + 2.0 * i * ease(p.x));
  }

  float theta = 3.0 * u_swirl * r;
  p = turn(p - 0.5, -theta) + 0.5;

  vec2 g = 1000.0 * q;
  float jitter = 0.4 * u_grainMixer * (valueNoise(g) - 0.5);

  vec3 rgb = vec3(0.0);
  float alpha = 0.0;
  float total = 0.0;
  for (int n = 0; n < ${MAX_COLORS}; n++) {
    if (n >= u_colorCount) break;
    float i = float(n);
    float a = 0.37 * i;
    float b = 0.6 + 0.9 * fract(i / 3.0);
    float c = 0.8 + fract((i + 1.0) / 4.0);
    vec2 point = 0.5 + 0.5 * u_motionSpread * vec2(sin(tau * b + a), cos(tau * c + 1.5 * a)) + jitter;
    float w = 1.0 / (pow(length(p - point), mix(6.0, 1.0, u_colorBlend)) + 0.001);
    vec4 color = u_colors[n];
    rgb += color.rgb * color.a * w;
    alpha += color.a * w;
    total += w;
  }
  total = max(0.0001, total);
  rgb /= total;
  alpha /= total;

  float grain = pow((valueNoise(turn(g, 1.0) + 3.0) + valueNoise(turn(g, 2.0) - 1.0)) / 2.0, 1.3);
  float v = 2.0 * grain - 1.0;
  float sigma = pow(u_grainOverlay * abs(v), 0.8);
  rgb = mix(rgb, v >= 0.0 ? vec3(1.0) : vec3(0.0), 0.35 * sigma);
  alpha = clamp(alpha + 0.5 * sigma, 0.0, 1.0);

  fragColor = vec4(rgb, alpha);
}`;

const CANVAS_STYLE = [
  "display:block",
  "position:absolute",
  "inset:0",
  "z-index:-1",
  "width:100%",
  "height:100%",
  "contain:strict",
  "border-radius:inherit",
  "corner-shape:inherit",
].join(";");

const RGB_PATTERN = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?\)$/i;
const HSL_PATTERN = /^hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*(\d*\.?\d+)\s*)?\)$/i;

export function toVec4(color) {
  let rgba;
  if (Array.isArray(color)) rgba = color.length === 4 ? [...color] : color.length === 3 ? [...color, 1] : [0, 0, 0, 1];
  else if (typeof color !== "string") rgba = [0, 0, 0, 1];
  else if (color.startsWith("#")) rgba = hexToRgba(color.slice(1));
  else if (color.startsWith("rgb")) rgba = rgbToRgba(color);
  else if (color.startsWith("hsl")) rgba = hslToRgba(color);
  else {
    console.error(`mesh-gradient: unsupported colour ${JSON.stringify(color)}`);
    rgba = [0, 0, 0, 1];
  }
  return rgba.map((x) => Math.min(1, Math.max(0, x)));
}

function hexToRgba(hex) {
  if (hex.length === 3) hex = [...hex].map((d) => d + d).join("");
  if (hex.length === 6) hex += "ff";
  return [0, 2, 4, 6].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255);
}

function rgbToRgba(text) {
  const m = text.match(RGB_PATTERN);
  if (!m) return [0, 0, 0, 1];
  return [m[1] / 255, m[2] / 255, m[3] / 255, m[4] === undefined ? 1 : Number(m[4])];
}

function hslToRgba(text) {
  const m = text.match(HSL_PATTERN) ?? [text, "0", "0", "0"];
  const h = (m[1] % 360) / 360;
  const s = m[2] / 100;
  const l = m[3] / 100;
  const a = m[4] === undefined ? 1 : Number(m[4]);
  if (s === 0) return [l, l, l, a];
  const hi = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const lo = 2 * l - hi;
  return [hueToChannel(lo, hi, h + 1 / 3), hueToChannel(lo, hi, h), hueToChannel(lo, hi, h - 1 / 3), a];
}

function hueToChannel(lo, hi, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return lo + (hi - lo) * 6 * t;
  if (t < 1 / 2) return hi;
  if (t < 2 / 3) return lo + (hi - lo) * (2 / 3 - t) * 6;
  return lo;
}

// Browser zoom as Safari exposes it: the outer window width over the CSS width of the visual viewport,
// snapped to the zoom steps browsers offer.
function estimateZoom(vvScale) {
  const vvWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  const ratio = window.outerWidth / (vvScale * vvWidth + scrollbarWidth);
  const percent = Math.round(ratio * 100);
  if (percent % 5 === 0) return percent / 100;
  return { 33: 1 / 3, 67: 2 / 3, 133: 4 / 3 }[percent] ?? ratio;
}


function compileProgram(gl) {
  const program = gl.createProgram();
  if (!program) throw new Error('Unable to allocate WebGL program');
  const shaders = [];
  try {
    for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX_SHADER], [gl.FRAGMENT_SHADER, FRAGMENT_SHADER]]) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Unable to allocate WebGL shader');
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      for (const shader of shaders) {
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Unable to compile WebGL shader');
      }
      throw new Error('Unable to link WebGL program');
    }
    return program;
  } catch (error) {
    gl.deleteProgram(program);
    throw error;
  } finally {
    for (const shader of shaders) {
      gl.deleteShader(shader);
    }
  }
}

// Each renderer owns its clock, blockers, observers and GPU resources.
export class MeshGradientRenderer {
  constructor(host, props) {
    this.host = host;
    this.props = props;
    this.disposed = false;
    this.failed = false;
    this.softwareRenderer = false;
    this.frame = null;
    this.frameMs = 0;
    this.lastTime = 0;
    this.currentSpeed = 0;
    this.explicitlyPaused = false;
    this.inView = false;
    this.hasArea = false;
    this.ready = false;
    this.renderScale = 1;
    this.resolutionDirty = true;
    this.box = null;
    this.hostStyle = { isolation: host.style.isolation, position: host.style.position };
    host.style.isolation = 'isolate';
    host.style.position = 'relative';
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = CANVAS_STYLE;
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.style.visibility = 'hidden';
    host.prepend(this.canvas);
    this.tick = (timestamp) => {
      this.frame = null;
      if (!this.canRun()) { this.reconcile(); return; }
      this.draw(timestamp);
      this.schedule();
    };
    this.onVisibilityChange = () => this.reconcile();
    this.onMotionChange = () => this.reconcile();
    this.onViewportResize = () => this.measure();
    this.onContextLost = (event) => {
      event.preventDefault();
      this.failed = true;
      this.host.dataset.ready = 'false';
      this.canvas.style.visibility = 'hidden';
      this.reconcile();
    };
    try {
      this.gl = this.canvas.getContext('webgl2');
      if (!this.gl) throw new Error('WebGL2 unavailable');
      const gl = this.gl;
      let rendererName = '';
      try {
        const rendererInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (rendererInfo?.UNMASKED_RENDERER_WEBGL !== undefined) {
          rendererName = String(gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL));
        }
      } catch {
        // Renderer identification is optional; keep animation when it is unavailable.
      }
      this.softwareRenderer = /SwiftShader|llvmpipe|softpipe|Software Rasterizer|Microsoft Basic Render Driver/i.test(rendererName);
      this.program = compileProgram(gl);
      gl.useProgram(this.program);
      this.uniforms = {};
      for (const name of ['u_time', 'u_resolution', 'u_colors', 'u_colorCount', 'u_scale', 'u_stretch', 'u_rotation', 'u_colorBlend', 'u_motionSpread', 'u_distortion', 'u_swirl', 'u_grainMixer', 'u_grainOverlay']) {
        this.uniforms[name] = gl.getUniformLocation(this.program, name);
      }
      this.buffer = gl.createBuffer();
      if (!this.buffer) throw new Error('Unable to allocate WebGL buffer');
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      this.uploaded = {};
      this.setProps(props);
      this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.motionQuery.addEventListener('change', this.onMotionChange);
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      window.visualViewport?.addEventListener('resize', this.onViewportResize);
      this.canvas.addEventListener('webglcontextlost', this.onContextLost);
      this.viewObserver = new IntersectionObserver((entries) => {
        if (this.disposed) return;
        this.inView = entries[entries.length - 1].isIntersecting;
        this.reconcile();
      }, { threshold: 0 });
      this.viewObserver.observe(host);
      this.sizeObserver = new ResizeObserver((entries) => {
        if (this.disposed || this.failed) return;
        const entry = entries[entries.length - 1];
        const border = entry.borderBoxSize[0];
        const device = entry.devicePixelContentBoxSize?.[0];
        this.box = { cssWidth: border.inlineSize, cssHeight: border.blockSize, deviceWidth: device?.inlineSize, deviceHeight: device?.blockSize };
        this.measure();
      });
      this.sizeObserver.observe(host);
    } catch {
      this.destroy();
      host.dataset.ready = 'false';
    }
  }

  setProps(props) {
    const { gl, uniforms, uploaded } = this;
    for (const [key, name] of [["scale", "u_scale"], ["stretch", "u_stretch"], ["rotation", "u_rotation"], ["colorBlend", "u_colorBlend"], ["motionSpread", "u_motionSpread"], ["distortion", "u_distortion"], ["swirl", "u_swirl"], ["grainMixer", "u_grainMixer"], ["grainOverlay", "u_grainOverlay"]]) {
      if (uploaded[key] !== props[key]) {
        gl.uniform1f(uniforms[name], props[key]);
        uploaded[key] = props[key];
      }
    }
    const flat = props.colors.slice(0, MAX_COLORS).flatMap(toVec4);
    const signature = flat.join();
    if (uploaded.colors !== signature) {
      const data = new Float32Array(MAX_COLORS * 4);
      data.set(flat);
      gl.uniform4fv(uniforms.u_colors, data);
      gl.uniform1i(uniforms.u_colorCount, flat.length / 4);
      uploaded.colors = signature;
    }
  }


  measure() {
    if (this.disposed || !this.box) return;
    this.hasArea = this.box.cssWidth > 0 && this.box.cssHeight > 0;
    if (!this.hasArea) { this.reconcile(); return; }
    const { cssWidth, cssHeight, deviceWidth, deviceHeight } = this.box;
    const vvScale = window.visualViewport?.scale ?? 1;
    let width, height;
    if (deviceWidth !== undefined) {
      // Low-density screens are supersampled to at least 2x.
      const boost = Math.max(1, 2 / Math.max(1, window.devicePixelRatio)) * vvScale;
      width = deviceWidth * boost;
      height = deviceHeight * boost;
    } else {
      const k = Math.max(window.devicePixelRatio, 2) * vvScale * Math.max(1, estimateZoom(vvScale));
      width = Math.round(cssWidth) * k;
      height = Math.round(cssHeight) * k;
    }
    const fit = Math.min(1, Math.sqrt(MAX_BACKING_PIXELS / (width * height)));
    const backingWidth = Math.round(width * fit);
    const backingHeight = Math.round(height * fit);
    const renderScale = backingWidth / Math.round(cssWidth);
    if (backingWidth === this.canvas.width && backingHeight === this.canvas.height && renderScale === this.renderScale) { this.reconcile(); return; }
    this.canvas.width = backingWidth;
    this.canvas.height = backingHeight;
    this.renderScale = renderScale;
    this.gl.viewport(0, 0, backingWidth, backingHeight);
    this.resolutionDirty = true;
    this.drawNow();
    this.reconcile();
  }


  canRun() {
    return !this.disposed && !this.failed && !this.softwareRenderer && this.host.isConnected && this.hasArea &&
      !document.hidden && this.inView && !this.motionQuery?.matches &&
      !this.explicitlyPaused && this.props.speed > 0;
  }

  schedule() {
    if (this.canRun() && this.frame === null) this.frame = requestAnimationFrame(this.tick);
  }

  reconcile() {
    if (this.disposed) return;
    const speed = this.canRun() ? this.props.speed : 0;
    if (speed !== this.currentSpeed) {
      this.currentSpeed = speed;
      this.lastTime = performance.now();
    }
    if (!speed && this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    if (!this.ready) this.drawNow();
    this.schedule();
  }

  draw(now) {
    if (this.disposed || this.failed || !this.hasArea || !this.host.isConnected || document.hidden) return;
    const { gl, uniforms } = this;
    const dt = Math.max(0, now - this.lastTime);
    this.lastTime = Math.max(this.lastTime, now);
    if (this.currentSpeed !== 0) this.frameMs += dt * this.currentSpeed;
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (this.resolutionDirty) {
      gl.uniform2f(uniforms.u_resolution, this.canvas.width, this.canvas.height);
      this.resolutionDirty = false;
    }
    gl.uniform1f(uniforms.u_time, this.frameMs / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.ready = true;
    this.canvas.style.visibility = 'visible';
    this.host.dataset.ready = 'true';
  }

  drawNow() {
    // Resize/settings work paints the held phase; it never consumes elapsed time.
    this.lastTime = performance.now();
    this.draw(this.lastTime);
  }

  update(props) {
    if (this.disposed || this.failed) return;
    const visualChanged = ['colors', 'scale', 'stretch', 'rotation', 'colorBlend', 'motionSpread', 'distortion', 'swirl', 'grainMixer', 'grainOverlay']
      .some((key) => JSON.stringify(this.props[key]) !== JSON.stringify(props[key]));
    this.props = props;
    this.setProps(props);
    if (visualChanged) this.drawNow();
    this.reconcile();
  }

  pause() { this.explicitlyPaused = true; this.reconcile(); }
  resume() { this.explicitlyPaused = false; this.reconcile(); }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.sizeObserver?.disconnect();
    this.viewObserver?.disconnect();
    this.motionQuery?.removeEventListener('change', this.onMotionChange);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.visualViewport?.removeEventListener('resize', this.onViewportResize);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    if (this.gl) {
      if (this.buffer) this.gl.deleteBuffer(this.buffer);
      if (this.program) this.gl.deleteProgram(this.program);
      this.buffer = null;
      this.program = null;
      this.gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.canvas.remove();
    Object.assign(this.host.style, this.hostStyle);
  }
}
