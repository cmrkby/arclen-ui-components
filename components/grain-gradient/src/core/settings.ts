import manifest from '../../component.json';

export type Variant = 'original' | 'ribbons' | 'blanket';
export interface Settings {
  variant: Variant;
  coreColor: string; glowColor: string; edgeColor: string; rimColor: string;
  coreStrength: number; glowStrength: number; edgeStrength: number; rimStrength: number;
  size: number; softness: number; grain: number; grainScale: number;
  speed: number; seed: number; layout: 'fixed' | 'fill'; height: number;
}
export type RendererSettings = Pick<Settings, 'variant' | 'size' | 'softness' | 'grain' | 'grainScale' | 'speed' | 'seed'> & {colors: string[]; strengths: number[]};
export const defaults = Object.freeze(Object.fromEntries(manifest.settings.map(setting => [setting.key, setting.default]))) as unknown as Readonly<Settings>;

/** Validate the whole patch before any drawing or DOM mutation. Steps are UI increments. */
export function resolvePatch(input: unknown, base: Readonly<Settings>): Settings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Settings must be an object.');
  const next = {...base};
  for (const key of Reflect.ownKeys(input)) {
    const setting = manifest.settings.find(setting => setting.key === key);
    if (!setting || typeof key !== 'string') throw new TypeError(`Unknown setting: ${String(key)}`);
    const value: unknown = (input as Record<string, unknown>)[key];
    if (setting.kind === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < setting.min! || value > setting.max!) throw new TypeError(`Invalid number: ${key}`);
      if (key === 'seed' && !Number.isInteger(value)) throw new TypeError('Seed must be an integer.');
    } else if (setting.kind === 'color') {
      if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new TypeError(`Use an opaque six-digit hex color: ${key}`);
    } else if (!setting.options?.some(option => option.value === value)) throw new TypeError(`Invalid selection: ${key}`);
    Object.assign(next, {[key]: setting.kind === 'color' ? (value as string).toUpperCase() : value});
  }
  return next;
}
export function resolveSettings(input: unknown = {}): Settings { return resolvePatch(input, defaults); }
export function rendererSettings(settings: Settings): RendererSettings {
  const {variant, size, softness, grain, grainScale, speed, seed} = settings;
  return {variant, size, softness, grain, grainScale, speed, seed, strengths: [settings.coreStrength, settings.glowStrength, settings.edgeStrength, settings.rimStrength], colors: [settings.coreColor, settings.glowColor, settings.edgeColor, settings.rimColor]};
}
