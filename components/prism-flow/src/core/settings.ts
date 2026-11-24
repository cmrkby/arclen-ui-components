import manifest from '../../component.json';

export const palettes = {
  ember: ['#ff2d55', '#ff9f0a', '#ffe08a', '#7a5cff'],
  orchid: ['#4b2bff', '#ff4fa3', '#ffb36b', '#46e8c4'],
  lagoon: ['#0057ff', '#00d4ff', '#c4ff7a', '#ff7a59'],
  silver: ['#5d6470', '#aab2bd', '#e9ecef', '#8f8a84'],
};
export interface Settings {
  palette: keyof typeof palettes;
  background: string;
  speed: number;
  width: number;
  spread: number;
  warp: number;
  intensity: number;
  grain: number;
  echo: boolean;
  followPointer: boolean;
  entrance: boolean;
  caption: string;
  radius: number;
}
export function resolveSettings(input: unknown = {}): Settings {
  const raw = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  return Object.fromEntries(manifest.settings.map(rule => {
    const v = raw[rule.key];
    let value = rule.default;
    switch (rule.kind) {
      case 'select': if (typeof v === 'string' && Object.hasOwn(palettes,v)) value = v; break;
      case 'number': if (typeof v === 'number' && Number.isFinite(v)) value = Math.max(rule.min!,Math.min(rule.max!,v)); break;
      case 'boolean': if (typeof v === 'boolean') value = v; break;
      case 'color': if (typeof v === 'string' && /^#[\da-f]{6}$/i.test(v)) value = v; break;
      case 'text': if (typeof v === 'string') value = v.slice(0,180); break;
    }
    return [rule.key,value];
  })) as unknown as Settings;
}
export const defaults = resolveSettings();
