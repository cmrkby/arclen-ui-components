import manifest from '../../component.json';
export interface Settings {
  variant: 'perimeter' | 'sweep' | 'counterflow';
  blueColor: string; emberColor: string; backgroundColor: string;
  blueStrength: number; emberStrength: number;
  spread: number; softness: number; grain: number; speed: number;
  layout: 'fixed' | 'fill'; height: number;
}
export const defaults = Object.freeze(Object.fromEntries(manifest.settings.map(s => [s.key, s.default]))) as unknown as Readonly<Settings>;
/** Validate the entire patch before changing any live state. Steps are UI increments. */
export function resolvePatch(input: unknown, base: Readonly<Settings>): Settings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Settings must be an object.');
  const next = {...base};
  for (const key of Reflect.ownKeys(input)) {
    const rule = manifest.settings.find(s => s.key === key);
    if (!rule || typeof key !== 'string') throw new TypeError(`Unknown setting: ${String(key)}`);
    const value = (input as Record<string, unknown>)[key];
    if (rule.kind === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < rule.min! || value > rule.max!) throw new TypeError(`Invalid number: ${key}`);
    } else if (rule.kind === 'color') {
      if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new TypeError(`Use an opaque six-digit hex color: ${key}`);
    } else if (!rule.options?.some(option => option.value === value)) throw new TypeError(`Invalid selection: ${key}`);
    Object.assign(next, {[key]: rule.kind === 'color' ? (value as string).toUpperCase() : value});
  }
  return next;
}
export function resolveSettings(input: unknown = {}): Settings { return resolvePatch(input, defaults); }
