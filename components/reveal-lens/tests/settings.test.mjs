import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import Ajv from 'ajv';

const directory = await mkdtemp(join(tmpdir(), 'arclen-lens-'));
await build({entryPoints: [new URL('../src/core/index.ts', import.meta.url).pathname], bundle: true, platform: 'node', format: 'esm', outfile: join(directory, 'core.mjs'), loader: {'.webp': 'dataurl'}});
const core = await import(pathToFileURL(join(directory, 'core.mjs')));
const manifest = JSON.parse(await readFile(new URL('../component.json', import.meta.url), 'utf8'));
after(() => rm(directory, {recursive: true, force: true}));

test('manifest validates and keeps the approved defaults with one composition', async () => {
  const schema = JSON.parse(await readFile(new URL('../../../packages/spec/component.schema.json', import.meta.url), 'utf8'));
  const validate = new Ajv({strict: false}).compile(schema);
  assert.equal(validate(manifest), true, JSON.stringify(validate.errors));
  assert.deepEqual(core.resolveSettings(), Object.fromEntries(manifest.settings.map(setting => [setting.key, setting.default])));
  assert.deepEqual(manifest.previews, [{name: 'Living surface', settings: {}}]);
  assert.deepEqual(Object.fromEntries(['imageScale', 'imageOffsetY', 'radius', 'softness', 'response', 'restScale', 'restOpacity'].map(key => [key, core.defaults[key]])), {imageScale: 2.3, imageOffsetY: -14, radius: 600, softness: 65, response: .1, restScale: .3, restOpacity: .22});
  for (const input of [{variant: 'curtain'}, {variant: 'window'}, {zoom: 1.2}]) assert.throws(() => core.resolveSettings(input));
});

test('paired image inputs reject executable URLs, malformed HTTPS, and attribute injection', () => {
  for (const key of ['baseImage', 'revealImage']) {
    for (const value of ['javascript:alert(1)', 'http://example.com/image.jpg', 'https://', 'https://example.com/\\bad', 'https://user:password@example.com/img.png', 'assets/x.svg" onload="alert(1)', 'data:image/svg+xml;base64,aaa', 'data:text/html;base64,aaa', '//example.com/a.png']) assert.throws(() => core.resolveSettings({[key]: value}), value);
    for (const value of ['https://example.com/scene.webp', 'assets/scene.webp', './images/scene.png', '../images/scene.png', 'data:image/png;base64,YQ==', '']) assert.equal(core.resolveSettings({[key]: value})[key], value);
  }
  assert.equal(core.render({baseImage: '', revealImage: ''}), core.render());
});

test('all numeric bounds, selections, lengths, booleans, and colors are enforced', () => {
  for (const setting of manifest.settings) {
    if (setting.kind === 'number') {
      for (const value of [setting.min, setting.max]) assert.equal(core.resolveSettings({[setting.key]: value})[setting.key], value);
      for (const value of [setting.min - .001, setting.max + .001, Infinity, NaN, '1', null]) assert.throws(() => core.resolveSettings({[setting.key]: value}), setting.key);
    } else if (setting.kind === 'select') {
      for (const option of setting.options) { const value = typeof option === 'string' ? option : option.value; assert.equal(core.resolveSettings({[setting.key]: value})[setting.key], value); }
      assert.throws(() => core.resolveSettings({[setting.key]: 'invalid'}));
    } else if (setting.kind === 'boolean') {
      for (const value of [true, false]) assert.equal(core.resolveSettings({[setting.key]: value})[setting.key], value);
      assert.throws(() => core.resolveSettings({[setting.key]: 1}));
    } else if (setting.kind === 'text') {
      assert.equal(core.resolveSettings({[setting.key]: 'x'.repeat(setting.maxLength)})[setting.key].length, setting.maxLength);
      assert.throws(() => core.resolveSettings({[setting.key]: 'x'.repeat(setting.maxLength + 1)}));
    } else if (setting.kind === 'color') {
      for (const value of ['#102030', '#10203088', 'transparent']) assert.equal(core.resolveSettings({[setting.key]: value})[setting.key], value);
      for (const value of ['red', 'url(https://example.com)', '#123;display:none']) assert.throws(() => core.resolveSettings({[setting.key]: value}));
    }
  }
  for (const input of [null, [], 'text', {unknown: 1}]) assert.throws(() => core.resolveSettings(input));
});

test('SSR escapes content and has a noninteractive static image fallback', () => {
  const html = core.render({hint: '<script>bad</script>', imageAlt: '" onclick="bad', showHint: true});
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&quot; onclick=&quot;bad'));
  assert.equal((html.match(/<img /g) || []).length, 2);
  assert.ok(html.includes('tabindex="-1"'));
  assert.ok(html.includes('disabled'));
  assert.ok(core.render({restPosition: 'hidden'}).includes('--rl-diameter:0px'));
  assert.ok(core.render({imageOffsetX: 12, hintFontSize: 18, hintInset: 48, imageFit: 'contain'}).includes('--rl-image-x:12%'));
});

// Small DOM fixture exercises the controller's owned resources and interaction state.
class Target {
  listeners = new Map();
  addEventListener(type, listener) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(listener); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  fire(type, properties = {}) { const event = {type, target: this, preventDefault() {}, ...properties}; for (const listener of this.listeners.get(type) || []) listener(event); }
  get listenerCount() { return [...this.listeners.values()].reduce((count, listeners) => count + listeners.size, 0); }
}
class Style {
  values = new Map();
  visibility = '';
  setProperty(key, value) { this.values.set(key, value); }
  getPropertyValue(key) { return this.values.get(key) || ''; }
}
class Element extends Target {
  style = new Style();
  attributes = new Map();
  childNodes = [];
  hidden = false;
  complete = true;
  naturalWidth = 2560;
  constructor(doc) { super(); this.ownerDocument = doc; }
  setAttribute(key, value) {
    this.attributes.set(key, value);
    if (key === 'style') { this.style.values.clear(); for (const declaration of value.split(';')) { const at = declaration.indexOf(':'); if (at !== -1) this.style.setProperty(declaration.slice(0, at), declaration.slice(at + 1)); } }
    if (key === 'src') { this.complete = false; this.naturalWidth = 0; }
  }
  getAttribute(key) { return this.attributes.get(key) ?? null; }
  replaceChildren(...children) { for (const child of this.childNodes) child.parentNode = null; this.childNodes = children; for (const child of children) child.parentNode = this; }
  focus() { this.ownerDocument.activeElement = this; }
  getBoundingClientRect() { return {width: 1000, height: 640, left: 0, top: 0}; }
  set innerHTML(markup) {
    const root = new Element(this.ownerDocument);
    root.dataset = {};
    root.setAttribute('style', markup.match(/style="([^"]*)"/)[1]);
    root.parts = new Map();
    for (const selector of ['.aui-reveal-lens__scene', '.aui-reveal-lens__base', '.aui-reveal-lens__reveal img', '.aui-reveal-lens__hint', '.aui-reveal-lens__hint-text', '.aui-reveal-lens__error']) root.parts.set(selector, new Element(this.ownerDocument));
    const sources = [...markup.matchAll(/src="([^"]*)"/g)].map(match => match[1]);
    root.parts.get('.aui-reveal-lens__base').attributes.set('src', sources[0]);
    root.parts.get('.aui-reveal-lens__reveal img').attributes.set('src', sources[1]);
    root.parts.get('.aui-reveal-lens__hint').attributes.set('aria-pressed', 'false');
    this.replaceChildren(root);
    this.firstElementChild = root;
  }
  querySelector(selector) { return this.parts.get(selector); }
}
function fixture({observers = true, mask = true, media = true} = {}) {
  const document = new Target();
  document.hidden = false;
  document.createElement = () => new Element(document);
  const view = new Target();
  const callbacks = new Map();
  const intersections = [];
  const resources = [];
  let sequence = 0, time = 0;
  view.requestAnimationFrame = callback => { const id = ++sequence; callbacks.set(id, callback); return id; };
  view.cancelAnimationFrame = id => callbacks.delete(id);
  view.CSS = {supports: () => mask};
  const motion = new Target(); motion.matches = false;
  if (media) view.matchMedia = () => motion;
  if (observers) {
    view.IntersectionObserver = class { constructor(callback) { intersections.push(callback); resources.push(this); } observe() {} disconnect() { this.disconnected = true; } };
    view.ResizeObserver = class { constructor() { resources.push(this); } observe() {} disconnect() { this.disconnected = true; } };
  }
  document.defaultView = view;
  const host = new Element(document), old = new Element(document);
  host.replaceChildren(old);
  const controller = core.mount(host);
  const root = host.childNodes[0];
  const scene = root.querySelector('.aui-reveal-lens__scene');
  const hint = root.querySelector('.aui-reveal-lens__hint');
  const flush = () => { for (let count = 0; callbacks.size && count < 2000; count++) { const pending = [...callbacks.values()]; callbacks.clear(); time += 16.667; for (const callback of pending) callback(time); } assert.equal(callbacks.size, 0); };
  return {document, view, motion, callbacks, intersections, resources, host, old, controller, root, scene, hint, flush};
}

test('keyboard, reset, updates, and radius bounds preserve the active DOM', () => {
  const f = fixture();
  assert.ok(Math.abs(Number.parseFloat(f.root.style.getPropertyValue('--rl-diameter')) - 640 * .72 * .3 * 2) < 1e-9);
  f.scene.focus();
  f.scene.fire('keydown', {key: 'ArrowRight'}); f.flush();
  const fullSize = Number.parseFloat(f.root.style.getPropertyValue('--rl-diameter'));
  assert.ok(Math.abs(fullSize - 640 * .72 * 2) < 1e-9);
  f.controller.update({...core.defaults, radius: 1000}); f.flush();
  assert.ok(Number.parseFloat(f.root.style.getPropertyValue('--rl-diameter')) > fullSize);
  assert.equal(f.document.activeElement, f.scene);
  assert.equal(f.root.querySelector('.aui-reveal-lens__scene'), f.scene);
  f.scene.fire('keydown', {key: 'Enter'}); f.flush();
  assert.equal(f.hint.getAttribute('aria-pressed'), 'true');
  f.scene.fire('keydown', {key: 'Escape'}); f.flush();
  assert.equal(f.hint.getAttribute('aria-pressed'), 'false');
  f.controller.update({restPosition: 'hidden'}); f.flush();
  assert.equal(f.root.style.getPropertyValue('--rl-diameter'), '0px');
  f.controller.update({}); f.flush();
  assert.ok(Math.abs(Number.parseFloat(f.root.style.getPropertyValue('--rl-diameter')) - 640 * .72 * .3 * 2) < 1e-9);
  f.controller.destroy();
});

test('hidden, offscreen, paused, and destroyed instances stop owned work independently', () => {
  const a = fixture(), b = fixture();
  a.scene.fire('pointerenter', {pointerType: 'mouse', clientX: 100, clientY: 100});
  b.scene.fire('pointerenter', {pointerType: 'mouse', clientX: 900, clientY: 500});
  assert.equal(a.callbacks.size, 1); assert.equal(b.callbacks.size, 1);
  a.controller.pause(); assert.equal(a.callbacks.size, 0); assert.equal(b.callbacks.size, 1);
  a.controller.resume(); assert.equal(a.callbacks.size, 1);
  a.document.hidden = true; a.document.fire('visibilitychange'); assert.equal(a.callbacks.size, 0);
  a.document.hidden = false; a.document.fire('visibilitychange'); assert.equal(a.callbacks.size, 1);
  a.intersections[0]([{isIntersecting: false}]); assert.equal(a.callbacks.size, 0);
  a.intersections[0]([{isIntersecting: true}]); assert.equal(a.callbacks.size, 1);
  a.controller.destroy(); a.controller.destroy();
  assert.deepEqual(a.host.childNodes, [a.old]);
  assert.equal(a.callbacks.size, 0);
  assert.ok(a.resources.every(resource => resource.disconnected));
  for (const target of [a.document, a.motion, a.root, a.scene, a.hint]) assert.equal(target.listenerCount, 0);
  b.flush(); b.controller.destroy();
});

test('reduced motion follows directly and missing observer/media APIs keep the component usable', () => {
  const f = fixture({observers: false, media: false});
  f.scene.fire('keydown', {key: 'ArrowLeft'}); f.flush();
  assert.equal(f.root.style.getPropertyValue('--rl-strength'), '1');
  f.controller.destroy(); assert.equal(f.view.listenerCount, 0);
  const reduced = fixture();
  reduced.motion.matches = true; reduced.motion.fire('change');
  reduced.scene.fire('keydown', {key: 'ArrowLeft'});
  assert.equal(reduced.callbacks.size, 0);
  assert.equal(reduced.root.style.getPropertyValue('--rl-strength'), '1');
  reduced.controller.destroy();
  const staticOnly = fixture({mask: false});
  staticOnly.scene.fire('keydown', {key: 'ArrowLeft'});
  assert.equal(staticOnly.root.dataset.live, undefined);
  assert.equal(staticOnly.callbacks.size, 0);
  staticOnly.controller.destroy();
});

test('invalid updates leave the current configuration and focused hint intact', () => {
  const f = fixture();
  f.controller.update({showHint: true, imageOffsetX: 12, hint: 'Discover'});
  f.hint.focus();
  const style = f.root.getAttribute('style');
  assert.throws(() => f.controller.update({radius: -1}));
  assert.equal(f.root.getAttribute('style'), style);
  assert.equal(f.document.activeElement, f.hint);
  for (let value = -40; value <= 40; value += 4) f.controller.update({showHint: true, imageOffsetX: value});
  assert.equal(f.document.activeElement, f.hint);
  assert.equal(f.root.style.getPropertyValue('--rl-image-x'), '40%');
  f.controller.update({showHint: false});
  assert.equal(f.document.activeElement, f.scene);
  f.controller.destroy();
});

test('image errors recover after replacement without replacing the scene', () => {
  const f = fixture();
  const base = f.root.querySelector('.aui-reveal-lens__base'), notice = f.root.querySelector('.aui-reveal-lens__error');
  f.root.fire('error', {target: base}); assert.equal(notice.hidden, false);
  f.controller.update({baseImage: 'https://example.com/new.png'});
  assert.equal(notice.hidden, true);
  assert.equal(f.root.querySelector('.aui-reveal-lens__scene'), f.scene);
  f.root.fire('load', {target: base}); assert.equal(base.style.visibility, '');
  f.controller.destroy();
});

test('local upload blob URLs allow previews and reject executable or foreign browser origins', () => {
  const uuid = 'fbe62508-d2ba-4ac8-9d34-df402a96d0c0';
  for (const value of [`blob:http://localhost:3100/${uuid}`, `blob:http://127.0.0.1:3100/${uuid}`, `blob:https://arclenui.dev/${uuid}`]) assert.equal(core.resolveSettings({baseImage: value}).baseImage, value);
  for (const value of ['blob:javascript:alert(1)', 'blob:null/abc', `blob:http://example.com/${uuid}`, 'blob:https://arclenui.dev/not-an-object-url', `blob:https://arclenui.dev/${uuid}?x=1`, `blob:https://u:p@arclenui.dev/${uuid}`]) assert.throws(() => core.resolveSettings({baseImage: value}));
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', {configurable: true, value: {origin: 'https://arclenui.dev'}});
  try {
    assert.equal(core.resolveSettings({revealImage: `blob:https://arclenui.dev/${uuid}`}).revealImage, `blob:https://arclenui.dev/${uuid}`);
    assert.throws(() => core.resolveSettings({revealImage: `blob:https://foreign.example/${uuid}`}));
    assert.throws(() => core.resolveSettings({revealImage: `blob:http://localhost:3100/${uuid}`}));
  } finally { if (previous) Object.defineProperty(globalThis, 'location', previous); else delete globalThis.location; }
});
