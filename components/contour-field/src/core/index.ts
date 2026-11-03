import {defaults, resolvePatch, resolveSettings, type Settings} from './settings';
import {createRenderer} from './renderer';
import {terrainSvg} from './terrain';

export {defaults, resolveSettings};
export type {Settings};
export interface Controller {update(patch: unknown): void; pause(): void; resume(): void; destroy(): void;}
export interface LifecycleOptions {paused?: boolean;}
const instances = new WeakMap<HTMLElement, Controller>();
const escapeAttribute = (text: string) => text.replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]!));
const heightFor = (settings: Settings) => settings.layout === 'fill' ? '100%' : `${settings.height}px`;
function validateId(id: unknown): asserts id is string | undefined {if (id !== undefined && typeof id !== 'string') throw new TypeError('Instance id must be a string.');}

/** Static decorative terrain is present before JavaScript and survives Canvas2D failure. */
export function render(input: unknown = {}, id?: string): string {
  const settings = resolveSettings(input); validateId(id);
  return `<div class="acf-scene" data-contour-scene="${escapeAttribute(id ?? '')}" aria-hidden="true" style="position:relative;width:100%;height:${heightFor(settings)};overflow:hidden;pointer-events:none;background:${settings.backgroundColor}">${terrainSvg(settings)}<canvas data-contour-canvas aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;display:block;visibility:hidden;pointer-events:none"></canvas></div>`;
}

export function mount(host: HTMLElement, input: unknown = {}, id?: string, lifecycle: LifecycleOptions = {}): Controller {
  const initial = resolveSettings(input); validateId(id);
  if (!lifecycle || typeof lifecycle !== 'object' || Array.isArray(lifecycle) || Reflect.ownKeys(lifecycle).some(key => key !== 'paused') || (lifecycle.paused !== undefined && typeof lifecycle.paused !== 'boolean')) throw new TypeError('Lifecycle accepts only a boolean paused option.');
  const view = host?.ownerDocument?.defaultView;
  if (!view || !(host instanceof view.HTMLElement)) throw new TypeError('A receiving element with an owner window is required.');
  if (instances.has(host)) throw new Error('This host already has mounted Contour Field.');
  if (Array.from(host.children).some(child => !child.matches('[data-contour-scene],noscript')) || host.querySelectorAll(':scope > [data-contour-scene]').length > 1 || Array.from(host.childNodes).some(node => node.nodeType === 3 && node.textContent?.trim())) throw new TypeError('Use an empty host or Contour Field server markup.');
  let scene = host.querySelector<HTMLElement>(':scope > [data-contour-scene]');
  if (!scene) {
    const template = host.ownerDocument.createElement('template'); template.innerHTML = render(initial, id);
    scene = template.content.firstElementChild as HTMLElement; host.append(scene);
  }
  const previous = scene.querySelector<HTMLCanvasElement>('[data-contour-canvas]');
  if (!previous || !(previous instanceof view.HTMLCanvasElement)) throw new TypeError('Contour Field needs its canvas.');
  const canvas = previous.cloneNode(false) as HTMLCanvasElement; previous.replaceWith(canvas);
  const ownedScene = scene;
  ownedScene.setAttribute('data-contour-scene', id ?? ''); ownedScene.style.height = heightFor(initial); ownedScene.style.background = initial.backgroundColor;
  let settings = initial, destroyed = false;
  const renderer = createRenderer(ownedScene, canvas, initial, lifecycle.paused ?? false);
  const controller: Controller = {
    update(patch) {
      if (destroyed) throw new Error('This Contour Field instance is destroyed.');
      const next = resolvePatch(patch, settings);
      ownedScene.style.height = heightFor(next); ownedScene.style.background = next.backgroundColor;
      renderer.update(next); settings = next;
    },
    pause() {if (!destroyed) renderer.pause();},
    resume() {if (!destroyed) renderer.resume();},
    destroy() {if (destroyed) return; destroyed = true; renderer.destroy(); instances.delete(host);}
  };
  instances.set(host, controller); return controller;
}
