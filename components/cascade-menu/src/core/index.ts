import manifest from '../../component.json';
import { installCascadeMenu } from './native.js';

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  lightWheel: string;
  lightCenter: string;
  lightIdle: string;
  lightActive: string;
  lightGlyph: string;
  lightBeam: string;
  lightBrand: string;
  lightCaptionBackground: string;
  lightCaptionText: string;
  lightFocus: string;
  lightRing: string;
  darkWheel: string;
  darkCenter: string;
  darkIdle: string;
  darkActive: string;
  darkGlyph: string;
  darkBeam: string;
  darkBrand: string;
  darkCaptionBackground: string;
  darkCaptionText: string;
  darkFocus: string;
  darkRing: string;
  reveal: 'everyday' | 'original' | 'quick' | 'instant';
  labelMode: 'hover' | 'always' | 'hidden';
  itemLabels: string[];
  itemUrls: string[];
  initialOpen: boolean;
  activeIndex: number;
  currentIndex: number;
  rotation: number;
  duration: number;
  bounce: number;
  lightStrength: number;
  closeOnSelect: boolean;
  outsideClose: boolean;
}

export const defaults = Object.freeze(Object.fromEntries(manifest.settings.map(setting => [setting.key, setting.default]))) as unknown as Readonly<Settings>;
const options = Object.fromEntries(manifest.settings.map(setting => [setting.key, setting]));
const paletteVariables = [
  ['lightWheel', '--wheel-light'], ['lightCenter', '--button-light'], ['lightIdle', '--idle-light'],
  ['lightActive', '--active-light'], ['lightGlyph', '--glyph-light'], ['lightBeam', '--beam-light'],
  ['lightBrand', '--brand-light'], ['lightCaptionBackground', '--caption-background-light'],
  ['lightCaptionText', '--caption-color-light'], ['lightFocus', '--focus-light'], ['lightRing', '--ring-light'],
  ['darkWheel', '--wheel-dark'], ['darkCenter', '--button-dark'], ['darkIdle', '--idle-dark'],
  ['darkActive', '--active-dark'], ['darkGlyph', '--glyph-dark'], ['darkBeam', '--beam-dark'],
  ['darkBrand', '--brand-dark'], ['darkCaptionBackground', '--caption-background-dark'],
  ['darkCaptionText', '--caption-color-dark'], ['darkFocus', '--focus-dark'], ['darkRing', '--ring-dark']
] as const;
const allowedUrl = /^(?:https?:|mailto:|tel:|#|\/(?!\/)|\.\/|\.\.\/)/i;
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export function resolveSettings(input: unknown = {}): Settings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Settings must be an object');
  const result = { ...defaults, itemLabels: [...defaults.itemLabels], itemUrls: [...defaults.itemUrls] };
  for (const [key, value] of Object.entries(input)) {
    const rule = options[key];
    if (!rule) throw new Error(`Unknown setting: ${key}`);
    if (rule.kind === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < rule.min! || value > rule.max!) throw new Error(`Invalid number: ${key}`);
    } else if (rule.kind === 'boolean') {
      if (typeof value !== 'boolean') throw new Error(`Invalid boolean: ${key}`);
    } else if (rule.kind === 'string-list') {
      if (!Array.isArray(value) || value.length !== 8 || value.some(item => typeof item !== 'string' || item.length > rule.maxItemLength! || /[\u0000-\u001f\u007f]/.test(item))) throw new Error(`Invalid list: ${key}`);
      if (key === 'itemLabels' && value.some(item => !item.trim())) throw new Error('Action labels must not be empty');
      if (key === 'itemUrls' && value.some(item => item && !allowedUrl.test(item.trim()))) throw new Error('Unsafe action URL');
    } else if (rule.kind === 'color') {
      if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`Invalid color: ${key}`);
    } else {
      if (typeof value !== 'string' || !rule.options?.some(option => (typeof option === 'string' ? option : option.value) === value)) throw new Error(`Invalid selection: ${key}`);
    }
    Object.assign(result, { [key]: value });
  }
  return result;
}

function markup(settings: Settings): string {
  const paletteStyle = paletteVariables.map(([key,property]) => `${property}:${settings[key]}`).join(';');
  const attributes = [
    `theme="${settings.theme}"`, `reveal="${settings.reveal}"`, `labels="${settings.labelMode}"`,
    `rotation="${settings.rotation}"`, `duration="${settings.duration}"`, `bounce="${settings.bounce}"`,
    `active-index="${settings.activeIndex}"`, `style="--strength:${settings.lightStrength};${paletteStyle}"`,
    !settings.initialOpen && 'closed', settings.currentIndex >= 0 && `current-index="${settings.currentIndex}"`,
    settings.closeOnSelect && 'close-on-select', settings.outsideClose && 'outside-close'
  ].filter(Boolean).join(' ');
  const fallback = settings.itemLabels.map((label, index) => {
    const url = settings.itemUrls[index];
    return url ? `<a href="${escape(url)}">${escape(label)}</a>` : `<span>${escape(label)}</span>`;
  }).join('');
  return `<div class="cascade-frame" data-theme="${settings.theme}"><arclen-radial-menu ${attributes}><nav class="cascade-fallback" aria-label="Radial navigation">${fallback}</nav></arclen-radial-menu></div>`;
}

export function render(input: unknown = {}): string { return markup(resolveSettings(input)); }

type Destination = { label: string; href: string; icon: string };
type NativeMenu = HTMLElement & {
  destinations: Destination[];
  setOpen(open: boolean, options?: { instant?: boolean }): void;
  select(index: number, options?: { instant?: boolean }): void;
};
export interface Controller { update(input: unknown): void; pause(): void; resume(): void; destroy(): void }
const icons = ['home', 'back', 'profile', 'notes', 'chat', 'mail', 'forward', 'phone'];

export function mount(host: HTMLElement, input: unknown = {}): Controller {
  let settings = resolveSettings(input);
  installCascadeMenu();
  host.innerHTML = markup(settings);
  const menu = host.querySelector<NativeMenu>('arclen-radial-menu')!;
  let destroyed = false;
  let paused = false;
  menu.destinations = settings.itemLabels.map((label, index) => ({ label, href: settings.itemUrls[index], icon: icons[index] }));

  return {
    update(input) {
      const next = resolveSettings(input);
      if (destroyed) return;
      if (next.theme !== settings.theme) menu.setAttribute('theme', next.theme);
      if (next.reveal !== settings.reveal) menu.setAttribute('reveal', next.reveal);
      if (next.labelMode !== settings.labelMode) menu.setAttribute('labels', next.labelMode);
      if (next.rotation !== settings.rotation) menu.setAttribute('rotation', String(next.rotation));
      if (next.duration !== settings.duration) menu.setAttribute('duration', String(next.duration));
      if (next.bounce !== settings.bounce) menu.setAttribute('bounce', String(next.bounce));
      if (next.activeIndex !== settings.activeIndex) menu.setAttribute('active-index', String(next.activeIndex));
      if (next.lightStrength !== settings.lightStrength) menu.style.setProperty('--strength', String(next.lightStrength));
      for (const [key,property] of paletteVariables) if (next[key] !== settings[key]) menu.style.setProperty(property, next[key]);
      if (next.closeOnSelect !== settings.closeOnSelect) menu.toggleAttribute('close-on-select', next.closeOnSelect);
      if (next.outsideClose !== settings.outsideClose) menu.toggleAttribute('outside-close', next.outsideClose);
      if (next.currentIndex !== settings.currentIndex) {
        if (next.currentIndex >= 0) menu.setAttribute('current-index', String(next.currentIndex));
        else menu.removeAttribute('current-index');
      }
      if (next.itemLabels.some((label, index) => label !== settings.itemLabels[index]) || next.itemUrls.some((url, index) => url !== settings.itemUrls[index])) {
        menu.destinations = next.itemLabels.map((label, index) => ({ label, href: next.itemUrls[index], icon: icons[index] }));
      }
      if (next.initialOpen !== settings.initialOpen) menu.setOpen(next.initialOpen);
      menu.parentElement?.setAttribute('data-theme', next.theme);
      settings = next;
    },
    pause() { if (!destroyed && !paused) { paused = true; menu.setAttribute('reduce-motion', ''); } },
    resume() { if (!destroyed && paused) { paused = false; menu.removeAttribute('reduce-motion'); } },
    destroy() { if (destroyed) return; destroyed = true; menu.remove(); host.replaceChildren(); }
  };
}
