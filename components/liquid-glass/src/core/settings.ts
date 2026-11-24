import manifest from '../../component.json';

export const opticalKeys = [
  'refraction', 'edgeRefraction', 'frost', 'magnify', 'dispersion', 'bevelDepth',
  'bevelWidth', 'edgeHighlight', 'edgeDarkening', 'tintOpacity', 'glassOpacity',
  'borderRadius', 'specularStrength',
] as const;
export type OpticalKey = typeof opticalKeys[number];
export type Shape = 'button' | 'card' | 'badge';
type Dimension = `${Shape}Width` | `${Shape}Height` | 'buttonRadius' | 'badgeRadius';
export type Settings = Record<OpticalKey | Dimension | 'buttonFrost' | 'playbackSpeed', number> & {shape:Shape; buttonLabel:string; badgeLabel:string; scene: 'tidal' | 'iris' | 'salt' | 'velodrome'; caption: string; showRing: boolean};
export const defaults = Object.fromEntries(manifest.settings.map(rule => [rule.key, rule.default])) as Settings;

export function resolveSettings(input: unknown = {}): Settings {
  const settings = {...defaults};
  if (!input || typeof input !== 'object') return settings;
  const raw = input as Record<string, unknown>;
  for (const rule of manifest.settings) {
    const value = raw[rule.key];
    if (rule.kind === 'number' && typeof value === 'number' && Number.isFinite(value)) {
      settings[rule.key as OpticalKey | 'playbackSpeed'] = Math.max(rule.min!, Math.min(rule.max!, value));
    }
  }
  if (raw.shape === 'button' || raw.shape === 'card' || raw.shape === 'badge') settings.shape=raw.shape;
  for (const key of ['buttonLabel','badgeLabel'] as const) {
    if (typeof raw[key] === 'string' && raw[key].trim()) settings[key]=raw[key].trim().slice(0,100);
  }
  if (raw.scene === 'tidal' || raw.scene === 'iris' || raw.scene === 'salt' || raw.scene === 'velodrome') settings.scene = raw.scene;
  if (typeof raw.caption === 'string') settings.caption = raw.caption.slice(0, 500);
  if (typeof raw.showRing === 'boolean') settings.showRing = raw.showRing;
  return settings;
}
