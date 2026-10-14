import { FRAGMENT_SHADER, VERTEX_SHADER } from "./shader";
import type { ResolvedSignalFieldOptions } from "./types";

export interface WebGLField {
  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number, resolutionScale: number): void;
  draw(options: ResolvedSignalFieldOptions, pointer: Readonly<{ x: number; y: number }>, reducedMotion: boolean, time: number): void;
  destroy(): void;
}

export type WebGLFieldResult =
  | { ok: true; field: WebGLField }
  | { ok: false; error: Error };

type Uniforms = {
  time: WebGLUniformLocation | null;
  resolution: WebGLUniformLocation | null;
  scale: WebGLUniformLocation | null;
  base: WebGLUniformLocation | null;
  surface: WebGLUniformLocation | null;
  accent: WebGLUniformLocation | null;
  secondaryAccent: WebGLUniformLocation | null;
  accentIntensity: WebGLUniformLocation | null;
  detail: WebGLUniformLocation | null;
  distortion: WebGLUniformLocation | null;
  contrast: WebGLUniformLocation | null;
  accentSpread: WebGLUniformLocation | null;
  flowAngle: WebGLUniformLocation | null;
  pointer: WebGLUniformLocation | null;
  pointerStrength: WebGLUniformLocation | null;
  pointerRadius: WebGLUniformLocation | null;
  grain: WebGLUniformLocation | null;
  asciiSize: WebGLUniformLocation | null;
  asciiStrength: WebGLUniformLocation | null;
  asciiSoftness: WebGLUniformLocation | null;
};

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create Signal Field shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Signal Field shader compilation failed";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function parseHex(hex: string): readonly [number, number, number] {
  const normalized = hex.replace("#", "");
  if (!/^[\da-f]{6}$/i.test(normalized)) return [0, 0, 0];
  return [
    Number.parseInt(normalized.slice(0, 2), 16) / 255,
    Number.parseInt(normalized.slice(2, 4), 16) / 255,
    Number.parseInt(normalized.slice(4, 6), 16) / 255,
  ];
}

function createUniforms(gl: WebGL2RenderingContext, program: WebGLProgram): Uniforms {
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  return {
    time: uniform("uTime"),
    resolution: uniform("uResolution"),
    scale: uniform("uScale"),
    base: uniform("uBase"),
    surface: uniform("uSurface"),
    accent: uniform("uAccent"),
    secondaryAccent: uniform("uSecondaryAccent"),
    accentIntensity: uniform("uAccentIntensity"),
    detail: uniform("uDetail"),
    distortion: uniform("uDistortion"),
    contrast: uniform("uContrast"),
    accentSpread: uniform("uAccentSpread"),
    flowAngle: uniform("uFlowAngle"),
    pointer: uniform("uPointer"),
    pointerStrength: uniform("uPointerStrength"),
    pointerRadius: uniform("uPointerRadius"),
    grain: uniform("uGrain"),
    asciiSize: uniform("uAsciiSize"),
    asciiStrength: uniform("uAsciiStrength"),
    asciiSoftness: uniform("uAsciiSoftness"),
  };
}

export function createWebGLField(canvas: HTMLCanvasElement): WebGLFieldResult {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
  });
  if (!gl) return { ok: false, error: new Error("WebGL2 is unavailable") };

  // Software WebGL rasterizes the original shader on the CPU. Bound its pixel
  // work; the independent glyph and headline layers stay at CSS resolution.
  // Hardware renderers retain the original resolution, shader and timing.
  const info=gl.getExtension('WEBGL_debug_renderer_info');
  const renderer=info?String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)):'';
  const software=/swiftshader|llvmpipe|lavapipe|software/i.test(renderer);
  let program: WebGLProgram | null = null;
  let vertex: WebGLShader | null = null;
  let fragment: WebGLShader | null = null;

  try {
    vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    program = gl.createProgram();
    if (!program) throw new Error("Unable to create Signal Field program");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "Signal Field program link failed");
    }
  } catch (cause) {
    if (program) gl.deleteProgram(program);
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return { ok: false, error: cause instanceof Error ? cause : new Error("Signal Field WebGL setup failed") };
  }

  gl.useProgram(program);
  const uniforms = createUniforms(gl, program);
  let width = canvas.width;
  let height = canvas.height;
  let destroyed = false;
  let renderRatio = 1;

  return {
    ok: true,
    field: {
      resize(cssWidth, cssHeight, devicePixelRatio, resolutionScale) {
        if (destroyed) return;
        const pixelRatio = Math.min(1.5, 4096 / Math.max(1, cssWidth, cssHeight), Math.max(1, Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1));
        const requestedScale = Math.min(1, Math.max(0.25, resolutionScale));
        const scale = software ? Math.min(requestedScale, Math.sqrt(50000 / Math.max(1, cssWidth * cssHeight * pixelRatio * pixelRatio))) : requestedScale;
        const nextWidth = Math.max(1, Math.round(Math.max(0, cssWidth) * pixelRatio * scale));
        const nextHeight = Math.max(1, Math.round(Math.max(0, cssHeight) * pixelRatio * scale));
        if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
          if (canvas.width !== nextWidth) canvas.width = nextWidth;
          if (canvas.height !== nextHeight) canvas.height = nextHeight;
          gl.viewport(0, 0, nextWidth, nextHeight);
        }
        width = nextWidth;
        height = nextHeight;
        renderRatio = nextWidth / Math.max(1, cssWidth);
      },

      draw(options, pointer, reducedMotion, time) {
        if (destroyed || gl.isContextLost()) return;
        const base = parseHex(options.baseColor);
        const surface = parseHex(options.surfaceColor);
        const accent = parseHex(options.accentColor);
        const secondaryAccent = parseHex(options.secondaryAccentColor);
        gl.useProgram(program);
        gl.uniform1f(uniforms.time, time);
        gl.uniform2f(uniforms.resolution, width, height);
        gl.uniform1f(uniforms.scale, options.scale);
        gl.uniform3f(uniforms.base, base[0], base[1], base[2]);
        gl.uniform3f(uniforms.surface, surface[0], surface[1], surface[2]);
        gl.uniform3f(uniforms.accent, accent[0], accent[1], accent[2]);
        gl.uniform3f(uniforms.secondaryAccent, secondaryAccent[0], secondaryAccent[1], secondaryAccent[2]);
        gl.uniform1f(uniforms.accentIntensity, options.accentIntensity);
        gl.uniform1i(uniforms.detail, options.detail);
        gl.uniform1f(uniforms.distortion, options.distortion);
        gl.uniform1f(uniforms.contrast, options.contrast);
        gl.uniform1f(uniforms.accentSpread, options.accentSpread);
        gl.uniform1f(uniforms.flowAngle, options.flowAngle);
        gl.uniform2f(uniforms.pointer, pointer.x, pointer.y);
        gl.uniform1f(uniforms.pointerStrength, reducedMotion ? 0 : options.pointerStrength);
        gl.uniform1f(uniforms.pointerRadius, options.pointerRadius);
        gl.uniform1f(uniforms.grain, options.grain);
        gl.uniform1f(uniforms.asciiSize, options.asciiSize * renderRatio);
        gl.uniform1f(uniforms.asciiStrength, !reducedMotion && options.interaction === "ascii-lens" ? options.asciiStrength : 0);
        gl.uniform1f(uniforms.asciiSoftness, options.asciiSoftness);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },

      destroy() {
        if (destroyed) return;
        destroyed = true;
        gl.deleteProgram(program);
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      },
    },
  };
}
