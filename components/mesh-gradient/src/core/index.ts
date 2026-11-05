import manifest from '../../component.json';
import poster from '../../assets/poster.webp';
import { assetUrl } from './asset-url';
import { MeshGradientRenderer } from './renderer.js';
import { createHeadlineFitter } from './headline-fit';

export interface Settings {
  colors: string[];
  scale: number;
  stretch: number;
  rotation: number;
  colorBlend: number;
  motionSpread: number;
  distortion: number;
  swirl: number;
  grainMixer: number;
  grainOverlay: number;
  speed: number;
  headline: string;
  height: number;
  layout: 'standalone' | 'fill';
  headlineMode: 'readable' | 'overlay';
}
export interface Instance {
  update(settings: unknown): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}

export const defaults: Settings = Object.fromEntries(manifest.settings.map(setting =>
  [setting.key, Array.isArray(setting.default) ? [...setting.default] : setting.default],
)) as unknown as Settings;
Object.freeze(defaults.colors);
Object.freeze(defaults);

export function resolveSettings(input: unknown): Settings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Settings must be an object');
  const result = { ...defaults, colors: [...defaults.colors] };
  for (const [key, value] of Object.entries(input)) {
    const setting = manifest.settings.find(item => item.key === key);
    if (!setting) throw new Error(`Unknown setting: ${key}`);
    if (setting.kind === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) ||
          (setting.min !== undefined && value < setting.min) ||
          (setting.max !== undefined && value > setting.max)) throw new Error(`Invalid number: ${key}`);
    } else if (setting.kind === 'string-list') {
      if (!Array.isArray(value) || value.length < (setting.minItems ?? 0) || value.length > (setting.maxItems ?? 100) ||
          value.some(color => typeof color !== 'string' || color.length > (setting.maxItemLength ?? 100000) ||
            !/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color))) throw new Error(`Invalid colors: ${key}`);
    } else {
      if (typeof value !== 'string' || value.length > (setting.maxLength ?? 100000)) throw new Error(`Invalid text: ${key}`);
      if (setting.kind === 'select' && !setting.options?.includes(value)) throw new Error(`Invalid selection: ${key}`);
    }
    Object.assign(result, { [key]: Array.isArray(value) ? [...value] : value });
  }
  return result;
}

const escape = (value: string) => value.replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
);
let nextId = 0;
const instanceId = () => `arclen-mesh-gradient-${++nextId}`;

export function render(input: unknown = {}, id = instanceId()): string {
  const settings = resolveSettings(input);
  const title = settings.headline ? `<div class="arclen-mesh-gradient__title"><p dir="auto">${escape(settings.headline)}</p></div>` : '';
  return `<div id="${escape(id)}" class="arclen-mesh-gradient" data-layout="${settings.layout}" data-headline-mode="${settings.headlineMode}" data-ready="false" style="--mesh-height:${settings.height}px"><img class="arclen-mesh-gradient__poster" src="${escape(assetUrl(poster))}" alt="" draggable="false">${title}</div>`;
}

export function mount(host: HTMLElement, input: unknown = {}, id = instanceId()): Instance {
  let current = resolveSettings(input);
  let disposed = false;
  host.innerHTML = render(current, id);
  const root = host.firstElementChild as HTMLElement;
  const renderer = new MeshGradientRenderer(root, current);
  const headlineFitter = createHeadlineFitter(root);
  const updateContent = () => {
    root.dataset.layout = current.layout;
    root.dataset.headlineMode = current.headlineMode;
    root.style.setProperty('--mesh-height', `${current.height}px`);
    let title = root.querySelector<HTMLElement>('.arclen-mesh-gradient__title');
    if (!current.headline) { title?.remove(); return; }
    if (!title) {
      title = root.ownerDocument.createElement('div');
      title.className = 'arclen-mesh-gradient__title';
      const paragraph = root.ownerDocument.createElement('p');
      paragraph.dir = 'auto';
      title.append(paragraph);
      root.append(title);
    }
    title.firstElementChild!.textContent = current.headline;
  };
  return {
    update(settings: unknown) {
      if (disposed) return;
      current = resolveSettings(settings);
      updateContent();
      renderer.update(current);
      headlineFitter.update();
    },
    pause() { if (!disposed) renderer.pause(); },
    resume() { if (!disposed) renderer.resume(); },
    destroy() {
      if (disposed) return;
      disposed = true;
      headlineFitter.destroy();
      renderer.destroy();
      root.remove();
    },
  };
}
