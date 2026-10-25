import manifest from '../../component.json';
export interface Settings {
 variant:'hill'|'flat'|'ramp';shape:'auto'|'hill'|'flat'|'ramp';barCount:number;peakHeight:number;gap:number;spread:number;angle:number;
 anchor:'bottom'|'top';stops:'3'|'4'|'5';baseColor:string;colorA:string;colorB:string;colorC:string;colorD:string;tipColor:string;
 entry:'auto'|'center'|'forward'|'reverse'|'together';entryDuration:number;stagger:number;pulse:number;pulseDuration:number;speed:number;animate:boolean;
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

export function barGeometry(input: Partial<Settings> = {}): Array<{level:number;position:number;rank:number}> {
 const s = resolveSettings(input);
 const shape = s.shape === 'auto' ? s.variant : s.shape;
 const entry = s.entry === 'auto' ? (s.variant === 'hill' ? 'center' : s.variant === 'flat' ? 'forward' : 'reverse') : s.entry;
 return Array.from({length:s.barCount}, (_, index) => {
  const progress = index / (s.barCount - 1);
  const level = shape === 'flat' ? 1 : shape === 'ramp' ? 0.1 + progress * 0.9 : 0.3 + 0.7 * Math.sin(Math.PI * progress) ** 1.68;
  const rank = entry === 'together' ? 0 : entry === 'center' ? Math.abs(index - (s.barCount - 1) / 2) : entry === 'reverse' ? s.barCount - index - 1 : index;
  return {level, position:progress * 2 - 1, rank};
 });
}
export function gradientStops(input: Partial<Settings> = {}): string {
 const s = resolveSettings(input);
 if (s.stops === '3') return `${s.colorA} 0%, ${s.colorB} 50%, ${s.tipColor} 100%`;
 if (s.stops === '4') return `${s.colorA} 0%, ${s.colorB} 33.333333%, ${s.colorC} 66.666667%, ${s.tipColor} 100%`;
 return `${s.colorA} 0%, ${s.colorB} 25%, ${s.colorC} 50%, ${s.colorD} 75%, ${s.tipColor} 100%`;
}
function variables(s: Settings): string {
 return `--gb-stops:${gradientStops(s)};--gb-base:${s.baseColor};--gb-a:${s.colorA};--gb-b:${s.colorB};--gb-c:${s.colorC};--gb-d:${s.colorD};--gb-tip:${s.tipColor};--gb-overlap:${s.gap === 0 ? 1 : 0}px;--gb-count:${s.barCount};--gb-peak:${s.peakHeight}%;--gb-gap:${s.gap}px;--gb-spread:${s.spread}deg;--gb-angle:${s.angle}deg;--gb-entry:${s.entryDuration / s.speed}s;--gb-stagger:${s.stagger / s.speed}s;--gb-pulse:${1 - s.pulse};--gb-pulse-time:${s.pulseDuration / s.speed}s;--gb-height:${s.heightMode === 'fixed' ? s.fixedHeight + 'px' : '100%'};--gb-radius:${s.radius}px`;
}
function layers(s: Settings): string {
 return '<div class="aui-gradient-bars__field">' + barGeometry(s).map(bar => `<div class="aui-gradient-bars__bar" style="--gb-level:${bar.level.toFixed(6)};--gb-position:${bar.position.toFixed(6)};--gb-rank:${bar.rank}"><div class="aui-gradient-bars__ink"></div></div>`).join('') + '</div>';
}
function layoutSignature(s: Settings): string { return [s.variant,s.shape,s.barCount,s.entry].join(':'); }
function applyAttributes(root: HTMLElement, s: Settings): void { root.setAttribute('data-variant', s.variant); root.setAttribute('data-anchor', s.anchor); }

/** Decorative SSR output shows the settled silhouette without requiring JavaScript. */
export function render(input: Partial<Settings> = {}): string {
 const s = resolveSettings(input);
 return `<div class="aui-gradient-bars" data-variant="${s.variant}" data-anchor="${s.anchor}" data-live="false" data-running="false" data-still="${!s.animate}" aria-hidden="true" style="${variables(s)}">${layers(s)}</div>`;
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
