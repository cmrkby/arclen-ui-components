import manifest from '../../component.json';

export interface Settings {
  variant: 'basin';
  density: number;
  scale: number;
  seed: number;
  lineWeight: number;
  intensity: number;
  backgroundColor: string;
  lineColor: string;
  accentColor: string;
  warmColor: string;
  speed: number;
  pointerInteraction: boolean;
  layout: 'fill' | 'fixed';
  height: number;
}

export const defaults = Object.freeze(Object.fromEntries(manifest.settings.map(rule => [rule.key, rule.default]))) as unknown as Readonly<Settings>;

/** Validate the whole patch before changing any instance. UI steps are increments, not validation bounds. */
export function resolvePatch(input: unknown, base: Readonly<Settings>): Settings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Contour Field settings must be an object.');
  const next = {...base};
  for (const key of Reflect.ownKeys(input)) {
    const rule = manifest.settings.find(item => item.key === key);
    if (!rule || typeof key !== 'string') throw new TypeError(`Unknown setting: ${String(key)}`);
    const value = (input as Record<string, unknown>)[key];
    if (rule.kind === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < rule.min! || value > rule.max!) throw new TypeError(`Invalid number: ${key}`);
    } else if (rule.kind === 'boolean') {
      if (typeof value !== 'boolean') throw new TypeError(`Invalid boolean: ${key}`);
    } else if (rule.kind === 'color') {
      if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new TypeError(`Use an opaque six-digit hex color: ${key}`);
    } else if (!rule.options?.some(option => option.value === value)) throw new TypeError(`Invalid selection: ${key}`);
    Object.assign(next, {[key]: value});
  }
  return next;
}

export function resolveSettings(input: unknown = {}): Settings { return resolvePatch(input, defaults); }
