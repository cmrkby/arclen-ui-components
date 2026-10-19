import manifest from '../../component.json';
import type {Tuning} from './tuning';
import {attachTactical, renderTacticalButton, resolveTactical, type TacticalSettings, type TacticalController} from './tactical';
import {attachTactical as attachScan, renderTacticalButton as renderScan} from './scan';
import {attachTactical as attachShutter, renderTacticalButton as renderShutter} from './shutter';
export type Settings = TacticalSettings & Tuning & {variant: 'original' | 'scan' | 'shutter'; revealColor: string; scatterColor: string};
export type Controller = Omit<TacticalController, 'update'> & {update(settings: Partial<Settings>): void};
export {attachTactical, renderTacticalButton} from './tactical';
export type {TacticalSettings, TacticalController, TacticalOptions} from './tactical';
export const defaults = Object.freeze(Object.fromEntries(manifest.settings.map(setting => [setting.key, setting.default]))) as unknown as Readonly<Settings>;
function resolve(input: unknown, base: Readonly<Settings>): Settings {
  const settings = resolveTactical(input, base) as Settings;
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const variant = (input as Record<string, unknown>).variant;
    const revealColor = (input as Record<string, unknown>).revealColor;
    if (typeof revealColor === 'string' && /^(?:transparent|#[\da-f]{6}(?:[\da-f]{2})?)$/i.test(revealColor)) settings.revealColor = revealColor;
    if (variant === 'original' || variant === 'scan' || variant === 'shutter') settings.variant = variant;
  }
  return settings;
}
export function resolveSettings(input: unknown = {}): Settings { return resolve(input, defaults); }
export function render(input: unknown = {}, id?: string): string {
  const settings = resolveSettings(input);
  return (settings.variant === 'shutter' ? renderShutter : settings.variant === 'scan' ? renderScan : renderTacticalButton)(settings, id);
}
const mounted = new WeakMap<HTMLElement, Controller>();
export function mount(host: HTMLElement, input: unknown = {}, id?: string): Controller {
  mounted.get(host)?.destroy();
  let settings = resolveSettings(input), paused = false, destroyed = false;
  let button = host.querySelector<HTMLButtonElement>('[data-tb-trigger]');
  if (!button) { host.innerHTML = render(settings, id); button = host.querySelector<HTMLButtonElement>('[data-tb-trigger]')!; }
  const trigger = button;
  function attach() {
    // Keep the native button, focus, consumer listeners and outer transform intact.
    const template = host.ownerDocument.createElement('template');
    template.innerHTML = render(settings, id);
    trigger.replaceChildren(...template.content.firstElementChild!.childNodes);
    trigger.classList.toggle('tb-scan', settings.variant === 'scan');
    trigger.classList.toggle('tb-shutter', settings.variant === 'shutter');
    trigger.removeAttribute('data-tb-active');
    trigger.removeAttribute('data-tb-scrambling');
    const next = (settings.variant === 'shutter' ? attachShutter : settings.variant === 'scan' ? attachScan : attachTactical)(trigger, settings);
    if (paused) next.pause();
    return next;
  }
  let active = attach();
  const controller: Controller = {
    update(input) {
      if (destroyed) return;
      const next = resolve(input, settings), changed = next.variant !== settings.variant;
      settings = next;
      if (changed) { active.destroy(); active = attach(); }
      else active.update(settings);
    },
    pause() { if (!destroyed) { paused = true; active.pause(); } },
    resume() { if (!destroyed) { paused = false; active.resume(); } },
    destroy() {
      if (destroyed) return;
      destroyed = true; active.destroy();
      if (mounted.get(host) === controller) mounted.delete(host);
    }
  };
  mounted.set(host, controller);
  return controller;
}
