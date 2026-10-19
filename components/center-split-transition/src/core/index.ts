import manifest from '../../component.json';
import {createPageTransition as createEngine, mount as mountEngine, render as renderEngine, resolveSettings as resolveEngine, presetSettings as enginePresets, type Settings as EngineSettings, type PageTransitionController} from './engine';
export type {NavigationOptions, PageTransitionController, TransitionResult, Phase} from './engine';
export type Settings = Pick<EngineSettings, 'autoplay' | 'heading' | 'caption' | 'background' | 'foreground' | 'overlayColor' | 'minHeight' | 'duration' | 'coverDuration' | 'hold' | 'leadIn' | 'travel' | 'easing' | 'lineDuration' | 'counterColor'>;
export const defaults = Object.fromEntries(manifest.settings.map(rule => [rule.key, rule.default])) as unknown as Settings;
export const presetSettings = Object.fromEntries(manifest.previews.map(preview => [preview.name, preview.settings])) as Record<string, Partial<Settings>>;
export const applicableSettings = (): string[] => manifest.settings.map(rule => rule.key);
const motion = 'center-split' as const;
/** Accept only this component's public settings. Invalid values restore its own defaults. */
export function resolveSettings(input: unknown = {}): Settings {
 const source = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
 const candidate: Record<string, unknown> = {...defaults};
 for (const rule of manifest.settings) {
  const value = source[rule.key];
  if (value === undefined) continue;
  if (rule.kind === 'number' && typeof value === 'number' && Number.isFinite(value)) candidate[rule.key] = Math.max(rule.min ?? -Infinity, Math.min(rule.max ?? Infinity, value));
  else if (rule.kind === 'boolean' && typeof value === 'boolean') candidate[rule.key] = value;
  else if (rule.kind === 'text' && typeof value === 'string') candidate[rule.key] = Array.from(value).slice(0, rule.maxLength ?? 180).join('');
  else if (rule.kind === 'color' && typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)) candidate[rule.key] = value;
  else if (rule.kind === 'select' && rule.options?.some(option => (typeof option === 'string' ? option : option.value) === value)) candidate[rule.key] = value;
 }
 for (const key of ['slatCount', 'gridColumns', 'gridRows']) if (key in candidate) candidate[key] = Math.round(candidate[key] as number);
 return candidate as unknown as Settings;
}
const forEngine = (settings: Settings): EngineSettings => resolveEngine({...enginePresets[motion], ...settings, preset: motion});
export function render(input: unknown = {}): string {
 return renderEngine(forEngine(resolveSettings(input))).replace('<section data-page-transitions', '<section data-pt-demo="center-split" data-page-transitions');
}
function attach(host: HTMLElement, input: unknown, demo: boolean): PageTransitionController {
 let settings = resolveSettings(input);
 const previousDemo = demo ? host.getAttribute('data-pt-demo') : null;
 if (demo) host.setAttribute('data-pt-demo', 'center-split');
 const controller = (demo ? mountEngine : createEngine)(host, forEngine(settings));
 if (demo) host.querySelector<HTMLElement>('[data-page-transitions]')?.setAttribute('data-pt-demo', 'center-split');
 return {
  ...controller,
  get phase() { return controller.phase; },
  destroy() {
   controller.destroy();
   if (demo) {
    if (previousDemo === null) host.removeAttribute('data-pt-demo');
    else host.setAttribute('data-pt-demo', previousDemo);
   }
  },
  update(next: unknown) {
   const patch = next && typeof next === 'object' && !Array.isArray(next) ? next : {};
   settings = resolveSettings({...settings, ...patch});
   controller.update(forEngine(settings));
  },
 };
}
/** Attach the fixed motion to consumer-owned content without replacing it. */
export function createCenterSplitTransition(host: HTMLElement, input: unknown = {}): PageTransitionController { return attach(host, input, false); }
export const createPageTransition = createCenterSplitTransition;
/** Mount the self-contained editorial demo, including replay and navigation controls. */
export function mount(host: HTMLElement, input: unknown = {}): PageTransitionController { return attach(host, input, true); }
