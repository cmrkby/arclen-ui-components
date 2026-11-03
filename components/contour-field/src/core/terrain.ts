import type {Settings} from './settings';
import {createBasinField} from './basin';
import type {PointerSample} from './pointer';

export interface ContourLayer {level: number; segments: number[]; color: string; opacity: number; weight: number;}
export interface TerrainFrame {width: number; height: number; layers: ContourLayer[]; columns: number; rows: number;}

// Independently authored gradient lattice. A local seeded permutation avoids random
// work during animation and makes browser/server terrain agree without global state.
export function createNoise(seed: number): (x: number, y: number) => number {
  const permutation = new Uint16Array(512);
  for (let i = 0; i < 256; i++) permutation[i] = i;
  let state = (Math.floor(seed) + 1) >>> 0;
  for (let i = 255; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1), previous = permutation[i];
    permutation[i] = permutation[j]; permutation[j] = previous;
  }
  for (let i = 0; i < 256; i++) permutation[i + 256] = permutation[i];
  const gradient = (hash: number, x: number, y: number) => {
    switch (hash & 7) {
      case 0: return x;
      case 1: return -x;
      case 2: return y;
      case 3: return -y;
      case 4: return (x + y) * 0.70710678;
      case 5: return (x - y) * 0.70710678;
      case 6: return (-x + y) * 0.70710678;
      default: return (-x - y) * 0.70710678;
    }
  };
  return (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    const a = permutation[ix & 255] + (iy & 255), b = permutation[(ix + 1) & 255] + (iy & 255);
    const p = gradient(permutation[a], fx, fy), q = gradient(permutation[b], fx - 1, fy);
    const r = gradient(permutation[a + 1], fx, fy - 1), s = gradient(permutation[b + 1], fx - 1, fy - 1);
    return (p + (q - p) * u + (r + (s - r) * u - p - (q - p) * u) * v) * 1.65;
  };
}

export type Field = (x: number, y: number) => number;

/** Time changes the domain locally. No frame receives an unrelated random terrain. */
export function createField(settings: Settings, seconds: number): Field {
  const noise = createNoise(settings.seed);
  return createBasinField(settings.seed, seconds, noise);
}

/** Resolve readable contour counts independently from backing-store resolution. */
export function contourCount(settings: Settings, width: number, height: number): number {
  return Math.max(8, Math.round(settings.density * Math.min(1, Math.pow(Math.min(width, height) / 440, 0.42))));
}

/** Marching squares, with the bilinear saddle determinant resolving ambiguous cells.
 * Each cell only visits elevations it crosses, not every level in the terrain.
 * Segments share exact interpolation, so no random line displacement is involved.
 */
export function createTerrainFrame(settings: Settings, width: number, height: number, seconds = 0, pointer?: PointerSample): TerrainFrame {
  width = Math.max(1, width); height = Math.max(1, height);
  const denseBasin = settings.density > 24;
  const columns = Math.min(denseBasin ? 160 : 192, Math.max(48, Math.ceil(width / 5)));
  const rows = Math.min(denseBasin ? 100 : 120, Math.max(36, Math.ceil(height / 5)));
  const stride = columns + 1, values = new Float32Array(stride * (rows + 1));
  const field = createField(settings, seconds), aspect = width / height;
  // Keep framing useful in both wide banners and portrait parents.
  const extentY = 3.4 * settings.scale / Math.max(1, Math.sqrt(aspect / 1.7));
  const extentX = extentY * aspect;
  const pointerRadius = Math.min(width, height) * .24;
  for (let y = 0; y <= rows; y++) {
    const py = (y / rows - 0.5) * extentY;
    for (let x = 0; x <= columns; x++) {
      const value = field((x / columns - 0.5) * extentX, py);
      const dx = pointer ? (x / columns - pointer.x) * width : 0, dy = pointer ? (y / rows - pointer.y) * height : 0;
      const influence = pointer && pointer.strength > 0 ? Math.exp(-2 * (dx * dx + dy * dy) / (pointerRadius * pointerRadius)) * pointer.strength : 0;
      values[y * stride + x] = value + (.9 - value) * influence;
    }
  }
  const count = contourCount(settings, width, height);
  // Unequal elevations leave more room across mid-slope regions while keeping
  // closer cuts near the extrema. The extended end levels limit large blank peaks.
  const elevations = Array.from({length: count}, (_, index) => {
    const position = index / (count - 1) * 2 - 1;
    // A narrower middle range restores slope detail. The cubic tail retains
    // the outermost cuts without shifting the middle elevations equally far.
    return Math.asinh(position * Math.sinh(0.84)) / 1.5 + 0.06 * position ** 3;
  });
  const nearest = (target: number) => elevations.reduce((best, level, index) => Math.abs(level - target) < Math.abs(elevations[best] - target) ? index : best, 0);
  // Use the configured colors directly so muted palettes retain their saturation.
  const blueMinor = settings.accentColor, warmMinor = settings.warmColor;
  const blueMajor = settings.accentColor;
  const blueIndex = nearest(-0.10), warmIndex = nearest(0.40);
  const bound = (value: number, afterEqual: boolean) => {
    let left = 0, right = count;
    while (left < right) {const middle = (left + right) >>> 1; if (elevations[middle] < value || (afterEqual && elevations[middle] === value)) left = middle + 1; else right = middle;}
    return left;
  };
  const layers: ContourLayer[] = Array.from({length: count}, (_, index) => {
    const level = elevations[index];
    const blue = index === blueIndex, warm = index === warmIndex;
    const blueFamily = level >= -0.57 && level <= 0.13;
    const warmFamily = Math.abs(index - warmIndex) === 1;
    const color = blue ? blueMajor : warm ? settings.warmColor : warmFamily ? warmMinor : blueFamily ? blueMinor : settings.lineColor;
    const opacity = blue ? 0.96 : warm ? 0.88 : warmFamily ? 0.50 : blueFamily ? 0.89 : 0.90;
    return {level, segments: [], color, opacity: Math.min(1, opacity * settings.intensity), weight: Math.max(0.5, settings.lineWeight * (warm ? 1.92 : blue ? 1.65 : warmFamily ? 1.06 : 1))};
  });
  const sx = width / columns, sy = height / rows;
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const index = y * stride + x;
    const a = values[index], b = values[index + 1], c = values[index + stride + 1], d = values[index + stride];
    const min = Math.min(a, b, c, d), max = Math.max(a, b, c, d);
    const first = bound(min, false);
    const last = bound(max, true) - 1;
    for (let l = first; l <= last; l++) {
      const layer = layers[l], elevation = layer.level;
      const mask = (a >= elevation ? 1 : 0) | (b >= elevation ? 2 : 0) | (c >= elevation ? 4 : 0) | (d >= elevation ? 8 : 0);
      if (mask === 0 || mask === 15) continue;
      // Top, right, bottom, left intersection positions, calculated lazily.
      let edgeX = 0, edgeY = 0;
      const point = (edge: number) => {
        if (edge === 0) {edgeX = (x + (elevation - a) / (b - a)) * sx; edgeY = y * sy;}
        else if (edge === 1) {edgeX = (x + 1) * sx; edgeY = (y + (elevation - b) / (c - b)) * sy;}
        else if (edge === 2) {edgeX = (x + (elevation - d) / (c - d)) * sx; edgeY = (y + 1) * sy;}
        else {edgeX = x * sx; edgeY = (y + (elevation - a) / (d - a)) * sy;}
      };
      // Reuse scalar edge coordinates instead of allocating two arrays for every
      // tiny segment. Dense frames otherwise produce tens of thousands of GC objects.
      const add = (edgeA: number, edgeB: number) => {
        point(edgeA); const px = edgeX, py = edgeY;
        point(edgeB); layer.segments.push(px, py, edgeX, edgeY);
      };
      switch (mask) {
        case 1: case 14: add(3, 0); break;
        case 2: case 13: add(0, 1); break;
        case 3: case 12: add(3, 1); break;
        case 4: case 11: add(1, 2); break;
        case 6: case 9: add(0, 2); break;
        case 7: case 8: add(3, 2); break;
        default: {
          const determinant = (a - elevation) * (c - elevation) - (b - elevation) * (d - elevation);
          if (determinant >= 0) {add(0, 1); add(2, 3);} else {add(0, 3); add(1, 2);}
        }
      }
    }
  }
  return {width, height, layers, columns, rows};
}

/** Shared drawing contract makes the no-JavaScript SVG an actual static terrain. */
export function terrainSvg(settings: Settings): string {
  const frame = createTerrainFrame(settings, 720, 450);
  const paths = frame.layers.map(layer => {
    const segments = layer.segments;
    let d = '';
    for (let i = 0; i < segments.length; i += 4) d += `M${segments[i].toFixed(1)} ${segments[i + 1].toFixed(1)}L${segments[i + 2].toFixed(1)} ${segments[i + 3].toFixed(1)}`;
    return `<path d="${d}" stroke="${layer.color}" stroke-opacity="${layer.opacity.toFixed(3)}" stroke-width="${layer.weight}"/>`;
  }).join('');
  return `<svg data-contour-fallback viewBox="0 0 720 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"><g fill="none" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
}
