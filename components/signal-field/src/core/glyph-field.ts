import type { ResolvedSignalFieldOptions } from "./types";

/** A small deterministic hash, shared by every renderer invocation. */
function cellHash(x: number, y: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function glyphForCell(x: number, y: number, glyphs: string): string {
  if (glyphs.length === 0) return "";
  return glyphs[Math.min(glyphs.length - 1, Math.floor(cellHash(x, y) * glyphs.length))] ?? "";
}

export interface GlyphField {
  resize(cssWidth: number, cssHeight: number, dpr: number): void;
  draw(options: ResolvedSignalFieldOptions, pointer: Readonly<{ x: number; y: number }>, reducedMotion: boolean, activity?: number, time?: number): void;
  destroy(): void;
}

export function createGlyphField(canvas: HTMLCanvasElement): GlyphField {
  let context: CanvasRenderingContext2D | null = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let devicePixelRatio = 1;

  return {
    resize(cssWidth, cssHeight, dpr) {
      width = Math.max(0, cssWidth);
      height = Math.max(0, cssHeight);
      devicePixelRatio = Math.min(1.5, 4096 / Math.max(1, width, height), Math.max(1, Number.isFinite(dpr) ? dpr : 1));
      const nextWidth = Math.round(width * devicePixelRatio);
      const nextHeight = Math.round(height * devicePixelRatio);
      if (canvas.width !== nextWidth) canvas.width = nextWidth;
      if (canvas.height !== nextHeight) canvas.height = nextHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context?.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    },

    draw(options, pointer, reducedMotion, activity = 1, time = 0) {
      if (!context) return;
      context.clearRect(0, 0, width, height);
      if (!options.showGlyphs || width <= 0 || height <= 0) return;

      // Keep a bounded cell budget even in a full-screen, minimum-size preview.
      const pitch = Math.max(4, Math.sqrt(width * height / 6000), options.glyphSize * (width <= 820 ? 0.85 : 1));
      const radius = Math.min(width, height) * options.glyphRadius;
      const pointerX = reducedMotion ? width * 0.5 : pointer.x * width;
      // Pointer coordinates use the WebGL convention: y=0 is the bottom edge.
      const pointerY = reducedMotion ? height * 0.5 : (1 - pointer.y) * height;
      const lens = !reducedMotion && options.interaction === "ascii-lens";
      const strength = reducedMotion || lens ? 0 : options.glyphStrength * activity;
      const lensRadius = Math.min(width, height) * options.pointerRadius;
      const phase = reducedMotion ? 0 : time * 2.6;
      const direction = options.glyphResponse === "repel" ? -1 : options.glyphResponse === "attract" ? 1 : 0;
      const lastGlyph = Math.max(0, options.glyphs.length - 1);

      context.font = `${Math.max(4, pitch * 0.59)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";

      // Adjacent density levels dissolve into each other; no random timed swaps.
      const paint = (level: number, x: number, y: number, alpha: number, color: string) => {
        const lower = Math.floor(level);
        const blend = level - lower;
        context!.fillStyle = color;
        context!.globalAlpha = alpha * (1 - blend);
        context!.fillText(options.glyphs[lower] ?? "", x, y);
        if (blend > .001 && lower < lastGlyph) {
          context!.globalAlpha = alpha * blend;
          context!.fillText(options.glyphs[lower + 1] ?? "", x, y);
        }
      };

      for (let row = 0, y = pitch * 0.5; y < height; row += 1, y += pitch) {
        for (let column = 0, x = pitch * (0.5 + (row % 2) * .22); x < width; column += 1, x += pitch) {
          if (cellHash(column + 83, row + 29) > options.glyphDensity) continue;
          const dx = pointerX - x;
          const dy = pointerY - y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const proximity = radius > 0 ? Math.max(0, 1 - distance / radius) : 0;
          const influence = proximity * proximity * (3 - 2 * proximity) * strength;
          const safeDistance = distance || 1;
          const displacement = influence * Math.min(36, pitch * 1.6) * direction;
          const drift = reducedMotion ? 0 : Math.min(1.5, pitch * .07);
          const drawX = x + Math.sin(phase * .8 + row * .29 + column * .11) * drift + (dx / safeDistance) * displacement;
          const drawY = y + Math.cos(phase * .9 - row * .16 + column * .19) * drift + (dy / safeDistance) * displacement;

          // Spatially coherent waves create quiet bands of punctuation and letters.
          // Hover adds density locally, independently of the editable colour field.
          const wavePhase = phase + (options.glyphResponse === "shimmer" ? influence * Math.sin(phase * 1.4) * 2 : 0);
          const density = .5 + .25 * Math.sin(x * .019 + y * .007 + wavePhase) + .25 * Math.cos(y * .016 - x * .005 - wavePhase * .81);
          const level = Math.min(lastGlyph, (density + influence * 3.4) * lastGlyph);
          const lensEdge = lensRadius * (1 - Math.max(.02, options.asciiSoftness));
          const edge = Math.max(0, Math.min(1, (distance - lensEdge) / Math.max(1, lensRadius - lensEdge)));
          const lensMask = lens ? (1 - edge * edge * (3 - 2 * edge)) * activity * options.asciiStrength : 0;
          paint(level, drawX, drawY, options.glyphOpacity * (.08 + density * .28) * (1 - lensMask), options.glyphColor);
          if (influence > 0.001) {
            paint(level, drawX, drawY, Math.min(.8, influence * 1.15), options.glyphActiveColor);
          }
        }
      }
    },

    destroy() {
      context?.clearRect(0, 0, width, height);
      context = null;
    },
  };
}
