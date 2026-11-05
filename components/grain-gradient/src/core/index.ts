import {fallbackImage} from './fallback';
import {createGrainGradient} from './create-grain-gradient';
import {defaults, resolveSettings, resolvePatch, rendererSettings, type Settings} from './settings';
export {defaults, resolveSettings};
export type {Settings};
export interface Controller {update(patch: unknown): void; pause(): void; resume(): void; destroy(): void;}
export interface LifecycleOptions {paused?: boolean;}
const mounted = new WeakMap<HTMLElement, Controller>();
const escapeAttribute = (value: string) => value.replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]!));
function validateId(id: unknown): asserts id is string | undefined {
  if (id !== undefined && typeof id !== 'string') throw new TypeError('Instance id must be a string.');
}
function sceneHeight(settings: Settings) { return settings.layout === 'fill' ? '100%' : `${settings.height}px`; }
/** Decorative static markup, safe to render on a server without DOM globals. */
export function render(input: unknown = {}, id?: string): string {
  const settings = resolveSettings(input); validateId(id);
  return `<div class="gg-scene" data-grain-scene="${escapeAttribute(id ?? '')}" aria-hidden="true" style="position:relative;width:100%;height:${sceneHeight(settings)};overflow:hidden;pointer-events:none;container-type:size;background:#000"><div data-grain-fallback style="position:absolute;inset:0;pointer-events:none;background-color:#000;background-image:${fallbackImage(settings)}" aria-hidden="true"></div><canvas data-grain-canvas aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;visibility:hidden"></canvas></div>`;
}
/** The host is dedicated to this component. Destroy before moving between documents. */
export function mount(host: HTMLElement, input: unknown = {}, id?: string, lifecycle: LifecycleOptions = {}): Controller {
  const settingsAtMount = resolveSettings(input); validateId(id);
  if (!lifecycle || typeof lifecycle !== 'object' || Array.isArray(lifecycle) || Reflect.ownKeys(lifecycle).some(key => key !== 'paused') || (lifecycle.paused !== undefined && typeof lifecycle.paused !== 'boolean')) throw new TypeError('Lifecycle accepts only a boolean paused option.');
  const view = host?.ownerDocument?.defaultView;
  if (!view || !(host instanceof view.HTMLElement)) throw new TypeError('A receiving element with an owner window is required.');
  if (mounted.has(host)) throw new Error('This host already has a mounted Grain Gradient.');
  const children = Array.from(host.children);
  if (children.some(child => !child.matches('[data-grain-scene], noscript')) || children.filter(child => child.hasAttribute('data-grain-scene')).length > 1 || Array.from(host.childNodes).some(node => node.nodeType === 3 && node.textContent?.trim())) throw new TypeError('Use an empty host or Grain Gradient server markup.');
  let scene = host.querySelector<HTMLElement>(':scope > [data-grain-scene]');
  if (!scene) {
    const template = host.ownerDocument.createElement('template'); template.innerHTML = render(settingsAtMount, id);
    scene = template.content.firstElementChild as HTMLElement; host.prepend(scene);
  }
  const previousCanvas = scene.querySelector<HTMLCanvasElement>(':scope > [data-grain-canvas]');
  if (!previousCanvas || !(previousCanvas instanceof view.HTMLCanvasElement)) throw new TypeError('The Grain Gradient scene needs its canvas.');
  // A remount must not reuse a context deliberately released by destroy.
  const canvas = previousCanvas.cloneNode(false) as HTMLCanvasElement;
  previousCanvas.replaceWith(canvas);
  scene.setAttribute('data-grain-scene', id ?? '');
  scene.style.height = sceneHeight(settingsAtMount);
  const ownedScene = scene;
  let settings = settingsAtMount, destroyed = false;
  const renderer = createGrainGradient(canvas, rendererSettings(settings), lifecycle.paused ?? false);
  const controller: Controller = {
    update(patch) {
      if (destroyed) throw new Error('This instance is destroyed.');
      const next = resolvePatch(patch, settings);
      ownedScene.style.height = sceneHeight(next);
      renderer.update(rendererSettings(next)); settings = next;
    },
    pause() { if (!destroyed) renderer.pause(); },
    resume() { if (!destroyed) renderer.resume(); },
    destroy() {
      if (destroyed) return;
      destroyed = true; renderer.destroy();
      // Retain a static scene for a consumer that keeps the dedicated host mounted.
      const fallback = ownedScene.querySelector<HTMLElement>(':scope > [data-grain-fallback]');
      if (fallback) fallback.style.backgroundImage = fallbackImage(settings);
      if (mounted.get(host) === controller) mounted.delete(host);
    }
  };
  mounted.set(host, controller);
  return controller;
}
