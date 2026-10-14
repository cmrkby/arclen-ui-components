import manifest from "../../component.json";
import type { ResolvedSignalFieldOptions, SignalFieldOptions } from "./types";

export const DEFAULT_SIGNAL_FIELD_OPTIONS: Readonly<ResolvedSignalFieldOptions> = Object.freeze(Object.fromEntries(manifest.settings.map(setting => [setting.key, setting.default]))) as unknown as Readonly<ResolvedSignalFieldOptions>;

const HEX_COLOR = /^#[\da-f]{6}$/i;
const finite = (value: number | undefined, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const clamp = (value: number | undefined, fallback: number, min: number, max: number) =>
  Math.min(max, Math.max(min, finite(value, fallback)));
const color = (value: string | undefined, fallback: string) =>
  typeof value === "string" && HEX_COLOR.test(value) ? value : fallback;

export function resolveSignalFieldOptions(partial: SignalFieldOptions): ResolvedSignalFieldOptions {
  return {
    interaction: partial.interaction === "ascii-lens" ? "ascii-lens" : "classic",
    asciiSize: clamp(partial.asciiSize, DEFAULT_SIGNAL_FIELD_OPTIONS.asciiSize, 6, 32),
    asciiStrength: clamp(partial.asciiStrength, DEFAULT_SIGNAL_FIELD_OPTIONS.asciiStrength, 0, 1),
    asciiSoftness: clamp(partial.asciiSoftness, DEFAULT_SIGNAL_FIELD_OPTIONS.asciiSoftness, 0, 1),
    baseColor: color(partial.baseColor, DEFAULT_SIGNAL_FIELD_OPTIONS.baseColor),
    surfaceColor: color(partial.surfaceColor, DEFAULT_SIGNAL_FIELD_OPTIONS.surfaceColor),
    accentColor: color(partial.accentColor, DEFAULT_SIGNAL_FIELD_OPTIONS.accentColor),
    secondaryAccentColor: color(partial.secondaryAccentColor, DEFAULT_SIGNAL_FIELD_OPTIONS.secondaryAccentColor),
    accentIntensity: clamp(partial.accentIntensity, DEFAULT_SIGNAL_FIELD_OPTIONS.accentIntensity, 0, 1),
    accentSpread: clamp(partial.accentSpread, DEFAULT_SIGNAL_FIELD_OPTIONS.accentSpread, 0, 1),
    detail: partial.detail === 1 || partial.detail === 2 || partial.detail === 3 || partial.detail === 4 ? partial.detail : DEFAULT_SIGNAL_FIELD_OPTIONS.detail,
    distortion: clamp(partial.distortion, DEFAULT_SIGNAL_FIELD_OPTIONS.distortion, 0, 2),
    contrast: clamp(partial.contrast, DEFAULT_SIGNAL_FIELD_OPTIONS.contrast, 0, 2),
    flowAngle: finite(partial.flowAngle, DEFAULT_SIGNAL_FIELD_OPTIONS.flowAngle),
    speed: clamp(partial.speed, DEFAULT_SIGNAL_FIELD_OPTIONS.speed, 0, 2),
    scale: clamp(partial.scale, DEFAULT_SIGNAL_FIELD_OPTIONS.scale, 0.25, 4),
    pointerStrength: clamp(partial.pointerStrength, DEFAULT_SIGNAL_FIELD_OPTIONS.pointerStrength, 0, 1),
    pointerRadius: clamp(partial.pointerRadius, DEFAULT_SIGNAL_FIELD_OPTIONS.pointerRadius, 0.05, 2),
    pointerSmoothing: clamp(partial.pointerSmoothing, DEFAULT_SIGNAL_FIELD_OPTIONS.pointerSmoothing, 0, 1),
    grain: clamp(partial.grain, DEFAULT_SIGNAL_FIELD_OPTIONS.grain, 0, 0.1),
    animate: typeof partial.animate === "boolean" ? partial.animate : DEFAULT_SIGNAL_FIELD_OPTIONS.animate,
    cursor: partial.cursor === "default" || partial.cursor === "crosshair" || partial.cursor === "hidden" ? partial.cursor : "default",
    frameRate: clamp(partial.frameRate, DEFAULT_SIGNAL_FIELD_OPTIONS.frameRate, 1, 60),
    resolutionScale: clamp(partial.resolutionScale, DEFAULT_SIGNAL_FIELD_OPTIONS.resolutionScale, 0.25, 1),
    showGlyphs: typeof partial.showGlyphs === "boolean" ? partial.showGlyphs : DEFAULT_SIGNAL_FIELD_OPTIONS.showGlyphs,
    showText: typeof partial.showText === "boolean" ? partial.showText : DEFAULT_SIGNAL_FIELD_OPTIONS.showText,
    text: typeof partial.text === "string" && partial.text.trim().length > 0 ? partial.text.trim().slice(0, 120) : DEFAULT_SIGNAL_FIELD_OPTIONS.text,
    glyphs: typeof partial.glyphs === "string" && partial.glyphs.length > 0 ? partial.glyphs.slice(0, 64) : DEFAULT_SIGNAL_FIELD_OPTIONS.glyphs,
    glyphOpacity: clamp(partial.glyphOpacity, DEFAULT_SIGNAL_FIELD_OPTIONS.glyphOpacity, 0, 1),
    glyphSize: clamp(partial.glyphSize, DEFAULT_SIGNAL_FIELD_OPTIONS.glyphSize, 1, 64),
    glyphColor: color(partial.glyphColor, DEFAULT_SIGNAL_FIELD_OPTIONS.glyphColor),
    glyphActiveColor: color(partial.glyphActiveColor, DEFAULT_SIGNAL_FIELD_OPTIONS.glyphActiveColor),
    glyphStrength: clamp(partial.glyphStrength, DEFAULT_SIGNAL_FIELD_OPTIONS.glyphStrength, 0, 1),
    glyphRadius: clamp(partial.glyphRadius, DEFAULT_SIGNAL_FIELD_OPTIONS.glyphRadius, 0, 1),
    glyphDensity: clamp(partial.glyphDensity, DEFAULT_SIGNAL_FIELD_OPTIONS.glyphDensity, 0.1, 1),
    glyphResponse: partial.glyphResponse === "attract" || partial.glyphResponse === "repel" || partial.glyphResponse === "shimmer" ? partial.glyphResponse : DEFAULT_SIGNAL_FIELD_OPTIONS.glyphResponse,
  };
}
