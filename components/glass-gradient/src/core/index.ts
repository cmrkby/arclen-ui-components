import manifest from '../../component.json';
export interface Settings {
 variant:'wash'|'bands';
 axis:'diagonal'|'horizontal'|'vertical';
 colorA:string;colorB:string;colorC:string;colorD:string;tintColor:string;
 tint:number;diffusion:number;speed:number;reverse:boolean;animate:boolean;
 heightMode:'fill'|'fixed';fixedHeight:number;radius:number;
}
type Definition = {key:string;kind:string;default:string|number|boolean;min?:number;max?:number;step?:number;options?:Array<string|{value:string}>};
const definitions: readonly Definition[] = manifest.settings;
export const defaults = Object.freeze(Object.fromEntries(definitions.map(setting => [setting.key, setting.default]))) as Readonly<Settings>;

/** Reject invalid CSS values before they enter markup or inline styles. */
export function resolveSettings(input: unknown = {}): Settings {
 if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Settings must be an object');
 const values = input as Record<string, unknown>;
 const output = {...defaults} as Record<string, unknown>;
 for (const [key, value] of Object.entries(values)) {
  const definition = definitions.find(setting => setting.key === key);
  if (!definition) throw new TypeError('Unknown setting: ' + key);
  if (definition.kind === 'number') {
   if (typeof value !== 'number' || !Number.isFinite(value) || value < definition.min! || value > definition.max!) throw new RangeError('Invalid number: ' + key);
   if (key === 'barCount' && !Number.isInteger(value)) throw new RangeError('Bar count must be an integer');
  } else if (definition.kind === 'boolean') {
   if (typeof value !== 'boolean') throw new TypeError('Invalid boolean: ' + key);
  } else if (definition.kind === 'select') {
   if (!definition.options!.some(option => (typeof option === 'string' ? option : option.value) === value)) throw new TypeError('Invalid selection: ' + key);
  } else if (definition.kind === 'color') {
   if (typeof value !== 'string' || !/^(?:transparent|#[0-9a-f]{6}(?:[0-9a-f]{2})?)$/i.test(value)) throw new TypeError('Invalid color: ' + key);
  }
  output[key] = value;
 }
 return output as unknown as Settings;
}

function variables(s: Settings): string {
 const x = s.axis === 'vertical' ? 0 : 9;
 const y = s.axis === 'horizontal' ? 0 : 7;
 return `--gg-a:${s.colorA};--gg-b:${s.colorB};--gg-c:${s.colorC};--gg-d:${s.colorD};--gg-tint:${s.tintColor};--gg-opacity:${s.tint};--gg-blur:${s.diffusion}px;--gg-softness:${24 + s.diffusion * 0.45}%;--gg-field-size:${160 + s.diffusion * 2}%;--gg-position-x:${!s.reverse && s.axis !== 'vertical' ? 100 : 0}%;--gg-position-y:${!s.reverse && s.axis !== 'horizontal' ? 100 : 0}%;--gg-start-x:${s.reverse && s.axis !== 'vertical' ? 100 : 0}%;--gg-start-y:${s.reverse && s.axis !== 'horizontal' ? 100 : 0}%;--gg-duration:${20 / s.speed}s;--gg-x:${x}%;--gg-y:${y}%;--gg-direction:${s.reverse ? 'alternate-reverse' : 'alternate'};--gg-height:${s.heightMode === 'fixed' ? s.fixedHeight + 'px' : '100%'};--gg-radius:${s.radius}px`;
}
function layers(s: Settings): string {
 if (s.variant === 'bands') return '<div class="aui-glass-gradient__band aui-glass-gradient__band--one"></div><div class="aui-glass-gradient__band aui-glass-gradient__band--two"></div><div class="aui-glass-gradient__tint"></div>';
 return '<div class="aui-glass-gradient__field"></div>';
}
function layoutSignature(s: Settings): string { return s.variant; }
function applyAttributes(root: HTMLElement, s: Settings): void { root.setAttribute('data-variant', s.variant); }

/** Decorative SSR output remains complete and still before mounting. */
export function render(input: Partial<Settings> = {}): string {
 const s = resolveSettings(input);
 return `<div class="aui-glass-gradient" data-variant="${s.variant}" data-live="false" data-running="false" data-still="${!s.animate}" aria-hidden="true" style="${variables(s)}">${layers(s)}</div>`;
}
export interface Controller {
 update(settings: Partial<Settings>): void;
 pause(): void;
 resume(): void;
 destroy(): void;
}

/** Owns only one root node; host attributes and original children are preserved. */
export function mount(host: HTMLElement, input: Partial<Settings> = {}): Controller {
 let settings = resolveSettings(input);
 const document = host.ownerDocument;
 const view = document.defaultView;
 const originalChildren = Array.from(host.childNodes);
 const staging = document.createElement('div');
 staging.innerHTML = render(settings);
 const root = staging.firstElementChild as HTMLElement;
 host.replaceChildren(root);
 let destroyed = false;
 let manuallyPaused = false;
 let onscreen = true;
 const media = view?.matchMedia?.('(prefers-reduced-motion: reduce)');
 let signature = layoutSignature(settings);
 const syncMotion = () => {
  if (destroyed) return;
  const still = media?.matches === true || !settings.animate;
  root.setAttribute('data-still', String(still));
  root.setAttribute('data-running', String(!still && !manuallyPaused && !document.hidden && onscreen));
 };
 const mediaChanged = () => syncMotion();
 document.addEventListener('visibilitychange', syncMotion);
 if (media?.addEventListener) media.addEventListener('change', mediaChanged);
 else media?.addListener?.(mediaChanged);
 const Observer = view?.IntersectionObserver;
 const observer = Observer ? new Observer(entries => {
  if (destroyed) return;
  const entry = entries.find(item => item.target === host);
  if (entry) { onscreen = entry.isIntersecting; syncMotion(); }
 }) : null;
 observer?.observe(host);
 root.setAttribute('data-live', 'true');
 syncMotion();
 return {
  update(patch) {
   if (destroyed) return;
   const next = resolveSettings({...settings, ...patch});
   const nextSignature = layoutSignature(next);
   if (nextSignature !== signature) { root.innerHTML = layers(next); signature = nextSignature; }
   root.style.cssText = variables(next);
   applyAttributes(root, next);
   settings = next;
   syncMotion();
  },
  pause() { if (!destroyed) { manuallyPaused = true; syncMotion(); } },
  resume() { if (!destroyed) { manuallyPaused = false; syncMotion(); } },
  destroy() {
   if (destroyed) return;
   destroyed = true;
   document.removeEventListener('visibilitychange', syncMotion);
   if (media?.removeEventListener) media.removeEventListener('change', mediaChanged);
   else media?.removeListener?.(mediaChanged);
   observer?.disconnect();
   root.remove();
   // Preserve later consumer-owned children if the host was changed while mounted.
   for (const child of originalChildren) host.appendChild(child);
  }
 };
}
