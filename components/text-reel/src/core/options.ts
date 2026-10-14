import manifest from "../../component.json";
import type { ResolvedTextReelOptions, TextReelOptions } from "./types";

export const DEFAULT_TEXT_REEL_OPTIONS: Readonly<ResolvedTextReelOptions> = Object.freeze(Object.fromEntries(manifest.settings.map(setting => [setting.key, setting.default]))) as unknown as Readonly<ResolvedTextReelOptions>;

const validCopy = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= 80;
const validWords = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.length >= 1 && value.length <= 24 && value.every(validCopy);

export function resolveTextReelOptions(value: TextReelOptions): ResolvedTextReelOptions {
  const mode = value.mode === "readable" || value.mode === "on-demand" || value.mode === "original"
    ? value.mode
    : DEFAULT_TEXT_REEL_OPTIONS.mode;
  const leading = validCopy(value.leading) ? value.leading : DEFAULT_TEXT_REEL_OPTIONS.leading;
  const words = validWords(value.words) ? [...value.words] : [...DEFAULT_TEXT_REEL_OPTIONS.words];
  return { mode, leading, words };
}
