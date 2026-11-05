import manifest from '../../component.json';
import branchBase from '../../assets/ember-base.webp';
import branchGrowth from '../../assets/ember-growth.webp';

export interface Settings {
  baseImage: string;
  revealImage: string;
  imageAlt: string;
  imageFit: 'cover' | 'contain';
  imageScale: number;
  imageOffsetX: number;
  imageOffsetY: number;
  radius: number;
  softness: number;
  response: number;
  restPosition: 'center' | 'hidden';
  restScale: number;
  restOpacity: number;
  showHint: boolean;
  hint: string;
  hintColor: string;
  hintBackground: string;
  hintOpacity: number;
  hintFontSize: number;
  hintInset: number;
  background: string;
  cornerRadius: number;
  focusColor: string;
  sizing: 'fill' | 'fixed';
  height: number;
}

export const defaults = Object.freeze(Object.fromEntries(manifest.settings.map(setting => [setting.key, setting.default]))) as unknown as Readonly<Settings>;
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]!));

function safeImage(value: string): boolean {
  if (value === '') return true;
  if (/^blob:https?:\/\//i.test(value)) {
    try {
      const url = new URL(value.slice(5));
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      const currentOrigin = typeof location !== 'undefined' && /^https?:\/\//.test(location.origin) ? location.origin : null;
      return !url.username && !url.password && !url.search && !url.hash && /^\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(url.pathname)
        && (currentOrigin ? url.origin === currentOrigin : url.protocol === 'https:' || local);
    } catch { return false; }
  }
  if (/^data:image\/(?:png|jpeg|webp|gif);base64,[\da-z+/=]+$/i.test(value)) return true;
  if (/^(?:\.\.?\/)?[\w-][\w./-]*$/.test(value)) return true;
  if (!/^https:\/\/[^\s"<>\\]+$/i.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}

export function resolveSettings(input: unknown = {}): Settings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Settings must be an object');
  const output = {...defaults} as Record<string, unknown>;
  for (const [key, value] of Object.entries(input)) {
    const definition = manifest.settings.find(setting => setting.key === key);
    if (!definition) throw new TypeError('Unknown setting: ' + key);
    if (definition.kind === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < (definition.min ?? -Infinity) || value > (definition.max ?? Infinity)) throw new RangeError('Invalid number: ' + key);
    } else if (definition.kind === 'boolean') {
      if (typeof value !== 'boolean') throw new TypeError('Invalid boolean: ' + key);
    } else {
      if (typeof value !== 'string' || value.length > (definition.maxLength ?? 10000)) throw new TypeError('Invalid text: ' + key);
      const options: readonly (string | {value: string})[] | undefined = definition.options;
      if (definition.kind === 'select' && !options?.some(option => (typeof option === 'string' ? option : option.value) === value)) throw new TypeError('Invalid selection: ' + key);
      if (definition.kind === 'color' && !/^(?:transparent|#[\da-f]{6}(?:[\da-f]{2})?)$/i.test(value)) throw new TypeError('Invalid color: ' + key);
      if (definition.kind === 'image' && !safeImage(value)) throw new TypeError('Use HTTPS, a raster data URL, or a relative image path');
    }
    output[key] = value;
  }
  return output as unknown as Settings;
}

const assetUrl = (value: string | {src: string}): string => typeof value === 'string' ? value : value.src;
function imageUrl(value: string, fallback: string): string {
  const url = value || fallback;
  return url === defaults.baseImage ? assetUrl(branchBase) : url === defaults.revealImage ? assetUrl(branchGrowth) : url;
}

function mask(settings: Settings): string {
  const warp = settings.softness * .8;
  const blur = settings.softness * .05;
  const feather = Math.min(.95, settings.softness / 100);
  const core = 1 - feather;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs><radialGradient id="g"><stop stop-color="white"/><stop offset="${core}" stop-color="white" stop-opacity=".98"/><stop offset="${core + feather * .23}" stop-color="white" stop-opacity=".8"/><stop offset="${core + feather * .51}" stop-color="white" stop-opacity=".35"/><stop offset="${core + feather * .754}" stop-color="white" stop-opacity=".08"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient><filter id="b" x="-25%" y="-25%" width="150%" height="150%"><feTurbulence type="fractalNoise" baseFrequency=".016" numOctaves="2" seed="9" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${warp}" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="${blur}"/></filter></defs><circle cx="256" cy="256" r="232" fill="url(#g)" filter="url(#b)"/></svg>`;
  return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
}

// Keep the procedural edge, but reuse its raster instead of filtering SVG every frame.
const rasterMasks = new Map<number, string>();

function variables(settings: Settings): string {
  const diameter = settings.restPosition === 'hidden' ? 0 : settings.radius * settings.restScale * 2;
  return `--rl-bg:${settings.background};--rl-radius:${settings.cornerRadius}px;--rl-height:${settings.sizing === 'fixed' ? settings.height + 'px' : '100%'};--rl-image-fit:${settings.imageFit};--rl-image-scale:${settings.imageScale};--rl-image-x:${settings.imageOffsetX}%;--rl-image-y:${settings.imageOffsetY}%;--rl-strength:${settings.restOpacity};--rl-diameter:${diameter}px;--rl-left:calc(50% - ${diameter / 2}px);--rl-top:calc(50% - ${diameter / 2}px);--rl-hint-color:${settings.hintColor};--rl-hint-bg:${settings.hintBackground};--rl-hint-opacity:${settings.hintOpacity * 100}%;--rl-hint-size:${settings.hintFontSize}px;--rl-hint-inset:${settings.hintInset}px;--rl-focus:${settings.focusColor};--rl-mask:${mask(settings)}`;
}

export function render(input: Partial<Settings> = {}): string {
  const settings = resolveSettings(input);
  return `<div class="aui-reveal-lens" data-live="false" style="${escape(variables(settings))}"><div class="aui-reveal-lens__scene" role="group" tabindex="-1" aria-label="Image reveal"><img class="aui-reveal-lens__base" src="${escape(imageUrl(settings.baseImage, defaults.baseImage))}" alt="${escape(settings.imageAlt)}" draggable="false"><div class="aui-reveal-lens__reveal" aria-hidden="true"><img src="${escape(imageUrl(settings.revealImage, defaults.revealImage))}" alt="" draggable="false"></div><div class="aui-reveal-lens__error" role="status" hidden>Image unavailable. Choose another image to continue.</div></div><button class="aui-reveal-lens__hint" type="button" aria-label="Reveal or hide image" aria-pressed="false" disabled ${settings.showHint ? '' : 'hidden'}><span aria-hidden="true">✦</span> <span class="aui-reveal-lens__hint-text">${escape(settings.hint)}</span></button></div>`;
}

export interface Controller {
  update(input: Partial<Settings>): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}

export function mount(host: HTMLElement, input: Partial<Settings> = {}): Controller {
  let settings = resolveSettings(input);
  let destroyed = false, paused = false, onscreen = true, active = false, latched = false, frame = 0;
  const doc = host.ownerDocument;
  const view = doc.defaultView!;
  const previous = [...host.childNodes];
  const staging = doc.createElement('div');
  staging.innerHTML = render(settings);
  const root = staging.firstElementChild as HTMLElement;
  host.replaceChildren(root);
  const scene = root.querySelector<HTMLElement>('.aui-reveal-lens__scene')!;
  const base = root.querySelector<HTMLImageElement>('.aui-reveal-lens__base')!;
  const reveal = root.querySelector<HTMLImageElement>('.aui-reveal-lens__reveal img')!;
  const hint = root.querySelector<HTMLButtonElement>('.aui-reveal-lens__hint')!;
  const hintText = root.querySelector<HTMLElement>('.aui-reveal-lens__hint-text')!;
  const notice = root.querySelector<HTMLElement>('.aui-reveal-lens__error')!;
  const media = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const supportsMask = !view.CSS?.supports || view.CSS.supports('mask-image', 'radial-gradient(black, transparent)') || view.CSS.supports('-webkit-mask-image', 'radial-gradient(black, transparent)');
  let width = 1, height = 1, x = .5, y = .5, targetX = .5, targetY = .5;
  let radius = 0, targetRadius = 0, strength = settings.restOpacity, targetStrength = settings.restOpacity, last = 0;
  let cancelMask = () => {}, maskSoftness = NaN, rasterMask = '';
  function syncMask() {
    if (!supportsMask) return;
    if (maskSoftness === settings.softness) {
      if (rasterMask) root.style.setProperty('--rl-mask', rasterMask);
      return;
    }
    cancelMask();
    cancelMask = () => {};
    maskSoftness = settings.softness;
    rasterMask = rasterMasks.get(maskSoftness) ?? '';
    if (rasterMask) { root.style.setProperty('--rl-mask', rasterMask); return; }
    const image = doc.createElement('img'), canvas = doc.createElement('canvas');
    canvas.width = canvas.height = 512;
    let context: CanvasRenderingContext2D | null;
    try { context = canvas.getContext('2d'); } catch { return; }
    if (!context) return;
    const softness = maskSoftness;
    let cancelled = false;
    const clear = () => {
      image.removeEventListener('load', loaded);
      image.removeEventListener('error', clear);
      image.removeAttribute('src');
    };
    function loaded() {
      if (cancelled || destroyed) return;
      try {
        context!.drawImage(image, 0, 0, 512, 512);
        rasterMask = 'url("' + canvas.toDataURL('image/png') + '")';
        rasterMasks.set(softness, rasterMask);
        if (rasterMasks.size > 8) rasterMasks.delete(rasterMasks.keys().next().value!);
        root.style.setProperty('--rl-mask', rasterMask);
      } catch { /* The SVG mask remains available when rasterization is unavailable. */ }
      clear();
      cancelMask = () => {};
    }
    cancelMask = () => { cancelled = true; clear(); };
    image.addEventListener('load', loaded);
    image.addEventListener('error', clear);
    image.src = mask(settings).slice(5, -2);
  }
  const canRun = () => !destroyed && !paused && onscreen && !doc.hidden && supportsMask;
  const limit = () => Math.min(600, Math.min(width, height) * .72) * settings.radius / 600;
  const rest = () => settings.restPosition === 'hidden' ? 0 : limit() * settings.restScale;

  function paint() {
    root.style.setProperty('--rl-strength', String(strength));
    root.style.setProperty('--rl-diameter', `${radius * 2}px`);
    root.style.setProperty('--rl-left', `${x * width - radius}px`);
    root.style.setProperty('--rl-top', `${y * height - radius}px`);
  }
  function stop() {
    if (frame) view.cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  }
  function tick(now: number) {
    frame = 0;
    if (!canRun()) return;
    const dt = last ? Math.min(40, now - last) : 16;
    last = now;
    const mix = 1 - Math.pow(1 - settings.response, dt / 16.667);
    x += (targetX - x) * mix;
    y += (targetY - y) * mix;
    radius += (targetRadius - radius) * mix;
    strength += (targetStrength - strength) * mix;
    paint();
    if (Math.abs(x - targetX) + Math.abs(y - targetY) > .0004 || Math.abs(radius - targetRadius) > .15 || Math.abs(strength - targetStrength) > .001) frame = view.requestAnimationFrame(tick);
    else { last = 0; x = targetX; y = targetY; radius = targetRadius; strength = targetStrength; paint(); }
  }
  function request() {
    if (!canRun()) return;
    if (media?.matches) { stop(); x = targetX; y = targetY; radius = targetRadius; strength = targetStrength; paint(); }
    else if (!frame) frame = view.requestAnimationFrame(tick);
  }
  function resize() {
    const bounds = scene.getBoundingClientRect();
    width = bounds.width || 1;
    height = bounds.height || 1;
    targetRadius = (active || latched) ? limit() : rest();
    if (!frame) { radius = targetRadius; strength = targetStrength; paint(); }
    else request();
  }
  function point(event: PointerEvent) {
    if (event.pointerType === 'touch' && !active) return;
    const bounds = scene.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    targetX = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    targetY = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    targetRadius = limit();
    targetStrength = 1;
    request();
  }
  function enter(event: PointerEvent) { if (event.pointerType === 'mouse') { active = true; point(event); } }
  function down(event: PointerEvent) { active = true; point(event); }
  function leave() {
    active = false;
    if (!latched) { targetRadius = rest(); targetStrength = settings.restOpacity; request(); }
  }
  function up(event: PointerEvent) { if (event.pointerType !== 'mouse') leave(); }
  function toggle() {
    latched = !latched;
    hint.setAttribute('aria-pressed', String(latched));
    targetRadius = latched ? limit() : rest();
    targetStrength = latched ? 1 : settings.restOpacity;
    request();
  }
  function key(event: KeyboardEvent) {
    const moves: Record<string, [number, number]> = {ArrowLeft: [-.06, 0], ArrowRight: [.06, 0], ArrowUp: [0, -.06], ArrowDown: [0, .06]};
    if (moves[event.key]) {
      event.preventDefault();
      active = true;
      targetX = Math.max(0, Math.min(1, targetX + moves[event.key][0]));
      targetY = Math.max(0, Math.min(1, targetY + moves[event.key][1]));
      targetRadius = limit();
      targetStrength = 1;
      request();
    } else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); }
    else if (event.key === 'Escape') { latched = false; hint.setAttribute('aria-pressed', 'false'); leave(); }
  }
  function sync() { if (!canRun()) stop(); else request(); }
  function imageError(event: Event) {
    if (event.target !== base && event.target !== reveal) return;
    (event.target as HTMLImageElement).style.visibility = 'hidden';
    notice.hidden = false;
  }
  function imageLoaded(event: Event) {
    if (event.target !== base && event.target !== reveal) return;
    (event.target as HTMLImageElement).style.visibility = '';
    notice.hidden = ![base, reveal].some(image => image.style.visibility === 'hidden');
  }
  function imageEvents() {
    // Cached failures may complete before delegated listeners attach.
    for (const image of [base, reveal]) if (image.complete && !image.naturalWidth) imageError({target: image} as unknown as Event);
  }

  if (supportsMask) {
    root.dataset.live = 'true';
    scene.tabIndex = 0;
    scene.setAttribute('aria-description', 'Use arrow keys to explore. Enter or Space reveals or hides; Escape returns to rest.');
    hint.disabled = false;
    scene.addEventListener('pointerenter', enter);
    scene.addEventListener('pointermove', point);
    scene.addEventListener('pointerdown', down);
    scene.addEventListener('pointerleave', leave);
    scene.addEventListener('pointerup', up);
    scene.addEventListener('pointercancel', leave);
    scene.addEventListener('keydown', key);
    scene.addEventListener('focusout', leave);
    hint.addEventListener('click', toggle);
  }
  root.addEventListener('error', imageError, true);
  root.addEventListener('load', imageLoaded, true);
  doc.addEventListener('visibilitychange', sync);
  media?.addEventListener?.('change', sync);
  const observer = typeof view.IntersectionObserver === 'function' ? new view.IntersectionObserver(entries => { onscreen = entries[0]?.isIntersecting ?? false; sync(); }) : null;
  observer?.observe(root);
  const sizing = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(resize) : null;
  sizing?.observe(root);
  if (!sizing) view.addEventListener('resize', resize);
  syncMask();
  resize();
  imageEvents();

  return {
    update(value) {
      if (destroyed) return;
      const next = resolveSettings(value);
      settings = next;
      root.setAttribute('style', variables(settings));
      syncMask();
      base.alt = settings.imageAlt;
      for (const [image, url] of [[base, imageUrl(settings.baseImage, defaults.baseImage)], [reveal, imageUrl(settings.revealImage, defaults.revealImage)]] as const) {
        if (image.getAttribute('src') !== url) { image.style.visibility = ''; image.setAttribute('src', url); }
      }
      notice.hidden = ![base, reveal].some(image => image.style.visibility === 'hidden');
      hintText.textContent = settings.hint;
      // Keep focus on the image when the focused hint is hidden by an update.
      if (!settings.showHint && doc.activeElement === hint) scene.focus();
      hint.hidden = !settings.showHint;
      targetStrength = active || latched ? 1 : settings.restOpacity;
      resize();
      paint();
      request();
      imageEvents();
    },
    pause() { paused = true; stop(); },
    resume() { paused = false; sync(); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelMask();
      stop();
      observer?.disconnect();
      sizing?.disconnect();
      if (!sizing) view.removeEventListener('resize', resize);
      doc.removeEventListener('visibilitychange', sync);
      media?.removeEventListener?.('change', sync);
      scene.removeEventListener('pointerenter', enter);
      scene.removeEventListener('pointermove', point);
      scene.removeEventListener('pointerdown', down);
      scene.removeEventListener('pointerleave', leave);
      scene.removeEventListener('pointerup', up);
      scene.removeEventListener('pointercancel', leave);
      scene.removeEventListener('keydown', key);
      scene.removeEventListener('focusout', leave);
      hint.removeEventListener('click', toggle);
      root.removeEventListener('error', imageError, true);
      root.removeEventListener('load', imageLoaded, true);
      if (root.parentNode === host) host.replaceChildren(...previous);
    }
  };
}
