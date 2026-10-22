// Original 5×5 ASCII raster, sparse to dense. Compiled into shader constants;
// no font atlas, canvas readback, DOM capture or network assets are needed.
const ASCII_RASTER = [
  ["00000","00000","00000","00100","00000"], // .
  ["00000","00100","00000","00100","00000"], // :
  ["00000","00000","11111","00000","00000"], // -
  ["00100","00100","11111","00100","00100"], // +
  ["00000","11111","00000","11111","00000"], // =
  ["10101","01110","11111","01110","10101"], // *
  ["01010","11111","01010","11111","01010"], // #
  ["11001","11010","00100","01011","10011"], // %
  ["01110","10011","10111","10000","01111"], // @
].map(rows => Number.parseInt(rows.join(""), 2));

export const VERTEX_SHADER = `#version 300 es
const vec2 positions[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2(3.0, -1.0),
  vec2(-1.0, 3.0)
);
void main() {
  gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}`;

export const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform float uScale;
uniform vec3 uBase;
uniform vec3 uSurface;
uniform vec3 uAccent;
uniform vec3 uSecondaryAccent;
uniform float uAccentIntensity;
uniform int uDetail;
uniform float uDistortion;
uniform float uContrast;
uniform float uAccentSpread;
uniform float uFlowAngle;
uniform vec2 uPointer;
uniform float uPointerStrength;
uniform float uPointerRadius;
uniform float uGrain;
uniform float uAsciiSize;
uniform float uAsciiStrength;
uniform float uAsciiSoftness;
out vec4 outputColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(41.713, 83.457))) * 35718.549);
}

float valueNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 local = fract(p);
  vec2 ease = local * local * (3.0 - 2.0 * local);
  float a = hash(cell);
  float b = hash(cell + vec2(1.0, 0.0));
  float c = hash(cell + vec2(0.0, 1.0));
  float d = hash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, ease.x), mix(c, d, ease.x), ease.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amplitude = 0.56;
  mat2 turn = mat2(0.891, -0.454, 0.454, 0.891);
  for (int i = 0; i < 4; i++) {
    if (i >= uDetail) break;
    sum += amplitude * valueNoise(p);
    p = turn * p * 1.92 + 47.3;
    amplitude *= 0.47;
  }
  return sum;
}

vec3 fieldColor(vec2 uv) {
  vec2 aspect = uResolution.xy / min(uResolution.x, uResolution.y);
  vec2 p = (uv - 0.5) * aspect * uScale;

  // Radius is a fraction of the short side, independent of field scale.
  vec2 pointerDelta = (uv - uPointer) * aspect;
  float pointerFalloff = (1.0 - smoothstep(0.0, uPointerRadius, length(pointerDelta))) * uPointerStrength;
  p += normalize(pointerDelta + 0.0001) * pointerFalloff * 0.075 * uScale;

  float flowCos = cos(uFlowAngle);
  float flowSin = sin(uFlowAngle);
  mat2 flowTurn = mat2(flowCos, -flowSin, flowSin, flowCos);
  vec2 flowP = flowTurn * p;

  // The field behaves like a slowly folding sheet of pigment rather
  // than a texture sliding across the screen. Two looping orbits push the
  // noise domain in different directions, so large pools continually open,
  // curl and close without exposing an obvious travel axis.
  float motion = uTime * 0.9;
  vec2 slowOrbit = vec2(cos(motion * 0.73), sin(motion * 0.61));
  vec2 crossOrbit = vec2(sin(motion * 0.47 + 1.8), cos(motion * 0.83 - 0.6));

  vec2 firstWarp = vec2(
    fbm(flowP * 1.45 + slowOrbit * 0.82 + crossOrbit * 0.24),
    fbm(flowP * 1.45 + vec2(4.7, 2.2) + crossOrbit * 0.76 - slowOrbit * 0.2)
  );
  vec2 secondWarp = vec2(
    fbm(flowP * 1.05 + firstWarp * (1.85 * uDistortion) + vec2(1.4, 7.1) - crossOrbit * 0.38),
    fbm(flowP * 1.05 + firstWarp * (1.65 * uDistortion) + vec2(6.3, 0.8) + slowOrbit * 0.34)
  );

  vec2 breathingDomain = flowP * (2.42 + sin(motion * 0.54) * 0.12);
  float field = fbm(breathingDomain + secondWarp * (2.0 * uDistortion) + vec2(8.3, 2.8) + slowOrbit * 0.46);
  float ribbons = smoothstep(0.22, 0.88, field + firstWarp.x * 0.28);
  // Broad pigment pools leave the light base exposed between soft organic edges.
  float accentEdge = mix(0.62, 0.22, uAccentSpread);
  float accentMask = smoothstep(accentEdge, accentEdge + 0.18, field + firstWarp.x * 0.12);
  float secondaryField = fbm(
    breathingDomain * 0.92
    + secondWarp.yx * (1.72 * uDistortion)
    + crossOrbit * 0.58
    + vec2(2.1, 5.7)
  );
  float secondaryMask = smoothstep(
    accentEdge + 0.02,
    accentEdge + 0.22,
    secondaryField + firstWarp.y * 0.1
  ) * (1.0 - accentMask * 0.34);

  vec3 color = mix(uBase, uSurface, ribbons);
  color = mix(color, uSecondaryAccent, secondaryMask * uAccentIntensity * 0.82);
  color = mix(color, uAccent, accentMask * uAccentIntensity);
  color = clamp((color - 0.5) * uContrast + 0.5, 0.0, 1.0);
  return color;
}

float asciiPixel(vec2 local, float density) {
  const uint raster[9] = uint[9](${ASCII_RASTER.map(bits=>`${bits}u`).join(", ")});
  // A one-pixel margin leaves clear spacing around each 5×5 character.
  ivec2 pixel = ivec2(floor(local * 7.0)) - 1;
  if (pixel.x < 0 || pixel.y < 0 || pixel.x > 4 || pixel.y > 4) return 0.0;
  float level = clamp(density, 0.0, 1.0) * 8.0;
  int index = int(floor(level));
  uint bit = uint(24 - ((4 - pixel.y) * 5 + pixel.x));
  float lowerInk = float((raster[index] >> bit) & 1u);
  float upperInk = float((raster[min(8, index + 1)] >> bit) & 1u);
  // Crossfade adjacent characters as the pigment changes, rather than popping
  // abruptly between bitmaps at each density threshold.
  float ink = mix(lowerInk, upperInk, smoothstep(0.15, 0.85, fract(level)));
  vec2 withinPixel = fract(local * 7.0);
  vec2 edge = min(withinPixel, 1.0 - withinPixel);
  return ink * smoothstep(0.0, max(fwidth(local.x * 7.0) * 0.65, 0.02), min(edge.x, edge.y));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec3 color = fieldColor(uv);
  color += (hash(gl_FragCoord.xy + floor(uTime * 24.0)) - 0.5) * uGrain;
  // Classic has exactly the original colour path and no extra field sample.
  if (uAsciiStrength > 0.001) {
    vec2 aspect = uResolution.xy / min(uResolution.x, uResolution.y);
    float distanceToPointer = length((uv - uPointer) * aspect);
    float innerRadius = uPointerRadius * (1.0 - max(0.02, uAsciiSoftness));
    float mask = (1.0 - smoothstep(innerRadius, uPointerRadius, distanceToPointer)) * uAsciiStrength;
    if (mask > 0.001) {
      float pitch = max(1.0, uAsciiSize);
      vec2 cell = floor(gl_FragCoord.xy / pitch);
      vec2 cellUv = (cell + 0.5) * pitch / uResolution.xy;
      vec3 sampleColor = fieldColor(cellUv);
      vec3 paper = mix(uBase, uSurface, 0.2);
      float paletteRange = max(length(uAccent - paper), length(uSecondaryAccent - paper));
      float density = clamp(length(sampleColor - paper) / max(0.12, paletteRange * max(0.15, uAccentIntensity)), 0.06, 1.0);
      // Keep the lens legible for pale user palettes without adding a new hue.
      vec3 ink = clamp(paper + (sampleColor - paper) * mix(4.5, 2.8, uAccentIntensity), 0.0, 1.0);
      float character = asciiPixel(fract(gl_FragCoord.xy / pitch), density);
      color = mix(color, mix(paper, ink, character), mask);
    }
  }
  outputColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;
