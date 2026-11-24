import manifest from '../../component.json';

type Panel = 'mail' | 'calendar' | 'files' | 'notes' | 'chat';
export type Settings = Record<`${Panel}Color`, string> & Record<`${Panel}${'LightColor' | 'Title' | 'Description' | 'Action' | 'Url'}`, string> & Record<`${Panel}${'Scale' | 'X' | 'Y'}`, number> & {
  theme: 'light' | 'dark';
  finish: 'theme' | 'black' | 'silver';
  lightCoverColor: string;
  maxWidth: number;
  panelHeight: number;
  padding: number;
  rim: number;
  titleSize: number;
  bodySize: number;
  lineHeight: number;
  buttonSize: number;
  glyphSize: number;
  divider: number;
  artShadow: number;
  hoverMotion: number;
  hoverDelay: number;
  initialItem: number;
  autoPlay: boolean;
  interval: number;
  motionSpeed: number;
  artScale: number;
  backplateStrength: number;
  gap: number;
  radius: number;
  coverColor: string;
}

export function resolveSettings(input: unknown = {}): Settings {
  const values = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  return Object.fromEntries(manifest.settings.map(rule => {
    const value = values[rule.key];
    if (rule.kind === 'number' && typeof value === 'number' && Number.isFinite(value)) {
      const bounded = Math.max(rule.min!, Math.min(rule.max!, value));
      return [rule.key, rule.step === 1 ? Math.round(bounded) : bounded];
    }
    if (rule.kind === 'text' && typeof value === 'string') {
      if (rule.key.endsWith('Url')) {
        try {
          const url = new URL(value);
          if (['http:', 'https:'].includes(url.protocol)) return [rule.key, url.href];
        } catch { /* An incomplete destination uses the panel's original link. */ }
        return [rule.key, rule.default];
      }
      const limit = rule.key.endsWith('Description') ? 320 : 48;
      return [rule.key, value.trim() ? value.slice(0,limit) : rule.default];
    }
    if (rule.kind === 'boolean' && typeof value === 'boolean') return [rule.key, value];
    if (rule.kind === 'select' && rule.options?.some(option => option.value === value)) return [rule.key, value];
    if (rule.kind === 'color' && typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)) return [rule.key, value];
    return [rule.key, rule.default];
  })) as unknown as Settings;
}

export const defaults = resolveSettings();
