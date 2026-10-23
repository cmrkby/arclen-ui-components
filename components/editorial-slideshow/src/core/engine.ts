// Canonical slideshow engine. Run node tooling/sync-slideshow-engine.mjs after edits.
export type SlideshowSettings = {
  variant: 'framed' | 'editorial' | 'stacked'; transition: 'blur' | 'fade' | 'slide' | 'slideUp' | 'cover' | 'wipe' | 'zoom' | 'none';
  heightMode: 'fixed' | 'fill'; imageFit: 'cover' | 'contain'; focalX: number; focalY: number; imageScale: number; blurAmount: number; zoomAmount: number;
  showCaptions: boolean; showNavigation: boolean; showIndicators: boolean; reelFooter: 'overlay' | 'solid';
  images: string[]; titles: string[]; descriptions: string[]; alts: string[]; label: string;
  height: number; radius: number; duration: number; interval: number; autoplay: boolean;
  accent: string; background: string; foreground: string; reelSurface: string; reelText: string;
};

export type Controller = {update(input: unknown): void; pause(): void; resume(): void; destroy(): void; goTo(index: number): void};
type SettingSpec = {key: string; default: unknown; kind: string; min?: number; max?: number; maxLength?: number; maxItems?: number; maxItemLength?: number; options?: readonly (string | {value: string})[]};
type Manifest = {settings: readonly SettingSpec[]};
export function createSlideshow<PublicSettings>(manifest: Manifest, artworks: Record<string, string>, presentation: Partial<SlideshowSettings>) {
  type Settings = SlideshowSettings;
  const publicDefaults = Object.fromEntries(manifest.settings.map(s => [s.key, s.default]));
  const defaults = {...presentation, ...publicDefaults} as Settings;
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]!));
function safeImage(value: string): boolean {
  return Object.hasOwn(artworks, value) || /^(?:https?:\/\/|\.\.?\/|\/(?!\/))[^\s<>"']+$/i.test(value);
}
function resolveSettings(input: unknown = {}): Settings {
  const result = {...defaults, images: [...defaults.images], titles: [...defaults.titles], descriptions: [...defaults.descriptions], alts: [...defaults.alts]};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return result;
  const values = input as Record<string, unknown>;
  for (const spec of manifest.settings) {
    const value = values[spec.key];
    if (value === undefined) continue;
    let resolved: unknown;
    if (spec.kind === 'number' && typeof value === 'number' && Number.isFinite(value)) resolved = Math.min(spec.max!, Math.max(spec.min!, value));
    else if (spec.kind === 'boolean' && typeof value === 'boolean') resolved = value;
    else if (spec.kind === 'select' && spec.options?.some(o => typeof o === 'string' ? o === value : o.value === value)) resolved = value;
    else if (spec.kind === 'color' && typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)) resolved = value;
    else if (spec.kind === 'text' && typeof value === 'string') resolved = value.slice(0, spec.maxLength);
    else if (spec.kind === 'string-list' && Array.isArray(value)) {
      const list = value.filter((item): item is string => typeof item === 'string').map(item => item.trim().slice(0, spec.maxItemLength)).slice(0, spec.maxItems);
      resolved = spec.key === 'images' ? list.filter(safeImage) : list;
      if (spec.key === 'images' && !(resolved as string[]).length) resolved = [...defaults.images];
    }
    if (resolved !== undefined) Object.assign(result, {[spec.key]: resolved});
  }
  return result;
}
const src = (value: string) => Object.hasOwn(artworks, value) ? artworks[value] : value;
const titleAt = (s: Settings, i: number) => s.titles[i] ?? `Slide ${i + 1}`;
function imageMarkup(s: Settings, i: number): string {
  return `<img src="${escape(src(s.images[i]))}" alt="${escape(s.alts[i] ?? '')}" draggable="false" decoding="async">`;
}
function caption(s: Settings, i: number) {
  return `<span class="aui-slideshow__eyebrow">${escape(s.label)}</span><h2>${escape(titleAt(s, i))}</h2><p>${escape(s.descriptions[i] ?? '')}</p>`;
}
function dotMarkup(s: Settings, i: number, current: number) {
  return `<button type="button" class="aui-slideshow__dot" data-slide="${i}" aria-label="Show slide ${i + 1}: ${escape(titleAt(s, i))}" aria-current="${i === current}"><span class="aui-slideshow__number">${String(i + 1).padStart(2, '0')}</span><span class="aui-slideshow__track"><span data-fill="${i}"></span></span></button>`;
}
// Iconsax arrow-circle chevrons, adapted for the existing circular buttons.
// https://iconsax.io — proprietary terms and attribution: assets/ICONSAX-LICENSE.md.
function navigationIcon(direction: 'previous' | 'next'): string {
  const path = direction === 'previous' ? 'M13.26 15.5297L9.73999 11.9997L13.26 8.46973' : 'M10.74 15.5297L14.26 11.9997L10.74 8.46973';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="6 6 12 12" width="22" height="22" fill="none" aria-hidden="true" focusable="false" data-icon-set="iconsax"><path d="${path}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}
function render(input: unknown = {}, _instanceId?: string): string {
  const s = resolveSettings(input);
  return markup(s, 0);
}
function compositionMarkup(s: Settings, i: number): string {
  const media = `<div class="aui-slideshow__media"><div class="aui-slideshow__stage"><div class="aui-slideshow__layer" data-layer="${i}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${s.images.length}">${imageMarkup(s, i)}</div></div></div>`;
  const masthead = `<div class="aui-slideshow__masthead"><span class="aui-slideshow__eyebrow">${escape(s.label)}</span></div>`;
  const title = `<div class="aui-slideshow__caption" data-caption>${compositionCaption(s, i)}</div>`;
  const rail = `<div class="aui-slideshow__rail" aria-label="Choose slide">${s.images.map((_, n) => compositionDot(s, n, i)).join('')}</div>`;
  const arrows = `<div class="aui-slideshow__arrows"><button type="button" data-prev aria-label="Previous slide" ${s.images.length < 2 ? 'disabled' : ''}>←</button><button type="button" data-next aria-label="Next slide" ${s.images.length < 2 ? 'disabled' : ''}>→</button></div>`;
  const story = s.variant === 'editorial' ? `${masthead}${title}<div class="aui-slideshow__controls">${rail}${arrows}</div>` : `<div class="aui-slideshow__reel-heading">${title}</div>${rail}`;
  return `<section class="aui-slideshow" data-variant="${s.variant}" role="region" aria-roledescription="carousel" aria-label="${escape(s.label)}" tabindex="0" ${rootAttributes(s)}><div class="aui-slideshow__composition">${media}<div class="aui-slideshow__story">${story}</div></div><span class="aui-slideshow__status" data-status aria-live="polite" aria-atomic="true">Slide ${i + 1} of ${s.images.length}</span></section>`;
}
function compositionCaption(s: Settings, i: number): string {
  return `<h2>${escape(titleAt(s, i))}</h2><p>${escape(s.descriptions[i] ?? '')}</p>`;
}
function compositionDot(s: Settings, i: number, current: number): string {
  if (s.variant === 'editorial') return `<button type="button" class="aui-slideshow__dot" data-slide="${i}" aria-label="Show slide ${i + 1}: ${escape(titleAt(s, i))}" aria-current="${i === current}"><span class="aui-slideshow__track"><span data-fill="${i}"></span></span></button>`;
  return `<button type="button" class="aui-slideshow__dot" data-slide="${i}" aria-label="Show slide ${i + 1}: ${escape(titleAt(s, i))}" aria-current="${i === current}"><img src="${escape(src(s.images[i]))}" alt="" draggable="false"><span class="aui-slideshow__tile-label"><span class="aui-slideshow__number">${String(i + 1).padStart(2, '0')}</span><span>${escape(titleAt(s, i))}</span></span><span class="aui-slideshow__track"><span data-fill="${i}"></span></span></button>`;
}
function rootAttributes(s: Settings): string {
  return `data-height-mode="${s.heightMode}" data-reel-footer="${s.reelFooter}" data-show-captions="${s.showCaptions}" data-show-navigation="${s.showNavigation}" data-show-indicators="${s.showIndicators}" style="--ss-height:${s.height}px;--ss-radius:${s.radius}px;--ss-accent:${s.accent};--ss-background:${s.background};--ss-foreground:${s.foreground};--ss-reel-surface:${s.reelSurface};--ss-reel-text:${s.reelText};--ss-fit:${s.imageFit};--ss-focal-x:${s.focalX}%;--ss-focal-y:${s.focalY}%;--ss-image-scale:${s.imageScale}"`;
}
function markup(s: Settings, i: number): string {
  if (s.variant !== 'framed') return compositionMarkup(s, i);
  return `<section class="aui-slideshow" data-variant="${s.variant}" role="region" aria-roledescription="carousel" aria-label="${escape(s.label)}" tabindex="0" ${rootAttributes(s)}><div class="aui-slideshow__media"><div class="aui-slideshow__stage"><div class="aui-slideshow__layer" data-layer="${i}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${s.images.length}">${imageMarkup(s, i)}</div>${s.showCaptions ? '<div class="aui-slideshow__shade"></div>' : ''}</div></div>${s.showCaptions ? `<div class="aui-slideshow__caption" data-caption>${caption(s, i)}</div>` : ''}<div class="aui-slideshow__controls"><div class="aui-slideshow__rail" aria-label="Choose slide">${s.images.map((_, n) => dotMarkup(s, n, i)).join('')}</div><div class="aui-slideshow__arrows"><button type="button" data-prev aria-label="Previous slide" ${s.images.length < 2 ? 'disabled' : ''}>${navigationIcon('previous')}</button><button type="button" data-next aria-label="Next slide" ${s.images.length < 2 ? 'disabled' : ''}>${navigationIcon('next')}</button></div></div><span class="aui-slideshow__status" data-status aria-live="polite" aria-atomic="true">Slide ${i + 1} of ${s.images.length}</span></section>`;
}

type Values = {opacity: number; x: number; y: number; scale: number; blur: number; rotate: number; clip: number};
type Tween = {from: number; to: number; start: number};
type Layer = {i: number; el: HTMLElement; values: Values; target: Values; tweens: Partial<Record<keyof Values, Tween>>};
const identity = (): Values => ({opacity: 1, x: 0, y: 0, scale: 1, blur: 0, rotate: 0, clip: 0});
// Original transition states authored from conventional mode semantics.
function transitionStates(s: Settings, direction: number): {enter: Values; exit: Values} {
  const enter = identity(), exit = identity();
  switch (s.transition) {
    case 'blur': enter.opacity = exit.opacity = 0; enter.blur = exit.blur = s.blurAmount; enter.scale = exit.scale = 1.045; break;
    case 'fade': enter.opacity = exit.opacity = 0; break;
    case 'slide': enter.x = direction * 100; exit.x = -enter.x; break;
    case 'slideUp': enter.y = direction * 100; exit.y = -enter.y; break;
    case 'cover': enter.x = direction * 100; break;
    case 'wipe': enter.clip = 100; break;
    case 'zoom': enter.scale = 1 + s.zoomAmount; enter.opacity = 0; exit.scale = 1 - s.zoomAmount; exit.opacity = 0; break;
  }
  return {enter, exit};
}
// Retained cubic-bezier bisection and independent per-property DOM/rAF tween model.
const easeInOut = (x: number) => {
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) {
    const t = (lo + hi) / 2;
    const bx = 3 * (1 - t) * (1 - t) * t * .42 + 3 * (1 - t) * t * t * .58 + t * t * t;
    if (bx < x) lo = t; else hi = t;
  }
  const t = (lo + hi) / 2;
  return 3 * (1 - t) * t * t + t * t * t;
};
function mount(host: HTMLElement, input: unknown = {}): Controller {
  let settings = resolveSettings(input), index = 0, requested = 0, paused = false, destroyed = false;
  let hovering = false, focused = false, inView = true, progress = 0, last = 0;
  let pendingImage: HTMLImageElement | null = null;
  let loadGeneration = 0;
  let captionAnimation: Animation | null = null;
  let tweenFrame = 0, loopFrame = 0, commitFrame = 0, press: {x: number; y: number; id: number} | null = null;
  const doc = host.ownerDocument, win = doc.defaultView!;
  const media = win.matchMedia('(prefers-reduced-motion: reduce)');
  const layers = new Map<number, Layer>();
  host.innerHTML = markup(settings, index);
  let root = host.firstElementChild as HTMLElement;
  const visible = () => !doc.hidden && inView;
  const animate = () => !paused && visible() && !media.matches;
  const play = () => animate() && settings.autoplay && !hovering && !focused && settings.images.length > 1;
  const listeners: Array<() => void> = [];
  function listen(target: EventTarget, event: string, fn: EventListener, options?: AddEventListenerOptions) {
    target.addEventListener(event, fn, options); listeners.push(() => target.removeEventListener(event, fn, options));
  }
  function cancelCaption() {
    if (!captionAnimation) return;
    captionAnimation.onfinish = null;
    captionAnimation.cancel();
    captionAnimation = null;
  }
  function animateCaption(element: HTMLElement) {
    cancelCaption();
    if (settings.variant !== 'editorial' || !animate() || settings.transition === 'none' || !settings.duration || typeof element.animate !== 'function') return;
    const animation = element.animate(
      [{opacity: 0, transform: 'translateY(8px)'}, {opacity: 1, transform: 'translateY(0)'}],
      {duration: Math.min(280, settings.duration), easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'none'},
    );
    captionAnimation = animation;
    animation.onfinish = () => {
      if (captionAnimation !== animation) return;
      animation.onfinish = null;
      animation.cancel();
      captionAnimation = null;
    };
  }
  function writeLayer(layer: Layer) {
    const v = layer.values;
    layer.el.style.opacity = String(v.opacity);
    layer.el.style.filter = v.blur ? `blur(${v.blur}px)` : '';
    layer.el.style.clipPath = v.clip ? `inset(0 ${v.clip}% 0 0)` : '';
    layer.el.style.transform = `translate(${v.x}%,${v.y}%) scale(${v.scale}) rotate(${v.rotate}deg)`;
  }
  function createLayer(i: number, initial = identity()): Layer {
    const el = doc.createElement('div');
    el.className = 'aui-slideshow__layer'; el.dataset.layer = String(i);
    el.setAttribute('role', 'group'); el.setAttribute('aria-roledescription', 'slide');
    el.setAttribute('aria-label', `${i + 1} of ${settings.images.length}`);
    el.innerHTML = imageMarkup(settings, i);
    const layer = {i, el, values: {...initial}, target: identity(), tweens: {}};
    writeLayer(layer); root.querySelector('.aui-slideshow__stage')!.prepend(el); layers.set(i, layer);
    return layer;
  }
  function setTarget(layer: Layer, target: Values) {
    layer.target = target;
    for (const key of Object.keys(target) as Array<keyof Values>) {
      if (Math.abs(layer.values[key] - target[key]) < .0001 || !animate() || !settings.duration || settings.transition === 'none') {layer.values[key] = target[key]; delete layer.tweens[key];}
      else layer.tweens[key] = {from: layer.values[key], to: target[key], start: win.performance.now()};
    }
    writeLayer(layer);
  }
  function finish() {
    cancelCaption();
    win.cancelAnimationFrame(tweenFrame); tweenFrame = 0;
    for (const [i, layer] of layers) {
      if (i !== index) {layer.el.remove(); layers.delete(i);}
      else {layer.values = identity(); layer.tweens = {}; writeLayer(layer);}
    }
  }
  function runTweens() {
    if (tweenFrame || destroyed) return;
    const tick = (time: number) => {
      tweenFrame = 0;
      if (!animate()) {finish(); return;}
      let active = false;
      for (const layer of layers.values()) {
        for (const key of Object.keys(layer.tweens) as Array<keyof Values>) {
          const tw = layer.tweens[key]!;
          const p = Math.max(0, Math.min(1, (time - tw.start) / settings.duration));
          layer.values[key] = tw.from + (tw.to - tw.from) * easeInOut(p);
          if (p >= 1) {layer.values[key] = tw.to; delete layer.tweens[key];} else active = true;
        }
        writeLayer(layer);
      }
      if (active) tweenFrame = win.requestAnimationFrame(tick); else finish();
    };
    tweenFrame = win.requestAnimationFrame(tick);
  }
  function resetClock() {
    win.cancelAnimationFrame(loopFrame); loopFrame = 0; last = 0;
    root.querySelector('[data-status]')!.setAttribute('aria-live', play() ? 'off' : 'polite');
    if (!play()) return;
    const tick = (time: number) => {
      loopFrame = 0;
      if (!play()) return;
      if (last) progress = Math.min(1, progress + Math.min(time - last, 100) / settings.interval);
      last = time;
      const fill = root.querySelector(`[data-fill="${index}"]`) as HTMLElement | null;
      if (fill) fill.style.transform = `scaleX(${progress})`;
      if (progress >= 1) {goTo(index + 1); return;}
      loopFrame = win.requestAnimationFrame(tick);
    };
    loopFrame = win.requestAnimationFrame(tick);
  }
  function commit() {
    commitFrame = 0;
    if (destroyed || requested === index) {resetClock(); return;}
    const direction = requested > index ? 1 : -1;
    const previous = index;
    index = requested; progress = 0;
    let entering = layers.get(index);
    const states = transitionStates(settings, direction);
    if (!entering) entering = createLayer(index, animate() && settings.transition !== 'none' ? states.enter : identity());
    entering.el.style.zIndex = '2'; entering.el.removeAttribute('aria-hidden'); setTarget(entering, identity());
    for (const layer of layers.values()) if (layer.i !== index) {
      layer.el.style.zIndex = layer.i === previous ? '1' : '0'; layer.el.setAttribute('aria-hidden', 'true');
      setTarget(layer, states.exit);
    }
    const captionElement = root.querySelector<HTMLElement>('[data-caption]');
    cancelCaption();
    if (captionElement) {
      captionElement.innerHTML = settings.variant === 'framed' ? caption(settings, index) : compositionCaption(settings, index);
      animateCaption(captionElement);
    }
    if (settings.variant !== 'framed') {
      const summary = root.querySelector('[data-summary]');
      if (summary) summary.textContent = settings.descriptions[index] ?? '';
      const peek = root.querySelector<HTMLImageElement>('[data-peek] img');
      if (peek) peek.src = src(settings.images[(index + 1) % settings.images.length]);
    }
    root.querySelector('[data-status]')!.textContent = `Slide ${index + 1} of ${settings.images.length}: ${titleAt(settings, index)}`;
    root.querySelectorAll<HTMLElement>('[data-slide]').forEach(el => el.setAttribute('aria-current', String(Number(el.dataset.slide) === index)));
    root.querySelectorAll<HTMLElement>('[data-fill]').forEach(el => {el.style.transform = `scaleX(${Number(el.dataset.fill) === index ? 1 : 0})`;});
    if (animate() && settings.duration && settings.transition !== 'none') runTweens(); else finish();
    resetClock();
  }
  function goTo(target: number) {
    if (destroyed || !Number.isFinite(target)) return;
    cancelCaption();
    requested = ((Math.trunc(target) % settings.images.length) + settings.images.length) % settings.images.length;
    win.cancelAnimationFrame(commitFrame); commitFrame = 0;
    if (pendingImage) {pendingImage.onload = null; pendingImage.onerror = null; pendingImage.removeAttribute('src'); pendingImage = null;}
    const generation = ++loadGeneration;
    const image = new win.Image(); pendingImage = image;
    const ready = () => {
      if (destroyed || generation !== loadGeneration) return;
      image.onload = null; image.onerror = null; pendingImage = null;
      if (!animate() || settings.transition === 'none') {win.cancelAnimationFrame(commitFrame); commitFrame = 0; commit();}
      else if (!commitFrame) commitFrame = win.requestAnimationFrame(commit);
    };
    image.onload = ready; image.onerror = ready;
    image.src = src(settings.images[requested]);
    if (image.complete) ready();
  }
  function synchronize() {if (!animate()) {if (commitFrame) {win.cancelAnimationFrame(commitFrame); commit();} finish();} resetClock();}
  function initialize() {
    root.querySelectorAll('[data-layer]').forEach(el => el.remove()); layers.clear(); createLayer(index);
    root.querySelectorAll<HTMLElement>('[data-fill]').forEach(el => {el.style.transform = `scaleX(${Number(el.dataset.fill) === index ? 1 : 0})`;});
    resetClock();
  }
  listen(host, 'click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button || !root.contains(button) || button.disabled) return;
    if (button.hasAttribute('data-prev')) goTo(requested - 1);
    else if (button.hasAttribute('data-next')) goTo(requested + 1);
    else if (button.dataset.slide !== undefined) goTo(Number(button.dataset.slide));
  });
  listen(host, 'keydown', event => {
    const e = event as KeyboardEvent;
    if ((e.target as HTMLElement).matches('input,textarea,select') || e.altKey || e.ctrlKey || e.metaKey) return;
    if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      goTo(e.key === 'Home' ? 0 : e.key === 'End' ? settings.images.length - 1 : requested + (e.key === 'ArrowRight' ? 1 : -1));
    }
  });
  listen(host, 'pointerdown', event => {
    const e = event as PointerEvent;
    if (e.button !== 0 || (e.target as Element).closest('button')) return;
    press = {x: e.clientX, y: e.clientY, id: e.pointerId};
  });
  listen(host, 'pointerup', event => {
    const e = event as PointerEvent, start = press; press = null;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(requested + (dx < 0 ? 1 : -1));
  });
  listen(host, 'pointercancel', () => {press = null;});
  listen(host, 'pointerleave', () => {press = null; hovering = false; resetClock();});
  listen(host, 'pointerenter', () => {hovering = true; resetClock();});
  listen(host, 'focusin', () => {focused = true; resetClock();});
  listen(host, 'focusout', event => {focused = !!(event as FocusEvent).relatedTarget && host.contains((event as FocusEvent).relatedTarget as Node); resetClock();});
  listen(host, 'error', event => {
    const image = event.target as HTMLImageElement;
    if (image.tagName !== 'IMG') return;
    const fallback = doc.createElement('span'); fallback.className = 'aui-slideshow__image-error';
    fallback.textContent = image.alt ? `Image unavailable: ${image.alt}` : 'Image unavailable'; image.replaceWith(fallback);
  }, {capture: true});
  listen(doc, 'visibilitychange', synchronize);
  listen(media, 'change', synchronize);
  const observer = typeof win.IntersectionObserver === 'function' ? new win.IntersectionObserver(entries => {inView = entries.some(e => e.isIntersecting); synchronize();}) : null;
  observer?.observe(root);
  initialize();
  return {
    goTo,
    update(next) {
      if (destroyed) return;
      const active = doc.activeElement as HTMLElement | null;
      const focusToken = active && host.contains(active) ? active.closest('button')?.outerHTML : undefined;
      loadGeneration++;
      if (pendingImage) {pendingImage.onload = null; pendingImage.onerror = null; pendingImage.removeAttribute('src'); pendingImage = null;}
      win.cancelAnimationFrame(commitFrame); commitFrame = 0; finish(); win.cancelAnimationFrame(loopFrame); loopFrame = 0;
      settings = resolveSettings({...settings, ...(next && typeof next === 'object' ? next : {})});
      index = Math.min(index, settings.images.length - 1); requested = index; progress = 0;
      observer?.unobserve(root); host.innerHTML = markup(settings, index); root = host.firstElementChild as HTMLElement;
      observer?.observe(root); initialize();
      if (focusToken) root.querySelectorAll<HTMLButtonElement>('button').forEach(b => {if (b.outerHTML === focusToken) b.focus({preventScroll: true});});
    },
    pause() {if (destroyed) return; paused = true; synchronize();},
    resume() {if (destroyed) return; paused = false; synchronize();},
    destroy() {
      if (destroyed) return; destroyed = true;
      cancelCaption();
      win.cancelAnimationFrame(commitFrame); win.cancelAnimationFrame(tweenFrame); win.cancelAnimationFrame(loopFrame);
      loadGeneration++;
      if (pendingImage) {pendingImage.onload = null; pendingImage.onerror = null; pendingImage.removeAttribute('src'); pendingImage = null;}
      observer?.disconnect(); listeners.forEach(remove => remove()); layers.clear(); press = null; host.innerHTML = '';
    },
  };
}

  return {
    defaults: publicDefaults as PublicSettings,
    resolveSettings(input: unknown = {}): PublicSettings {
      const settings = resolveSettings(input);
      return Object.fromEntries(manifest.settings.map(s => [s.key, settings[s.key as keyof Settings]])) as PublicSettings;
    },
    render, mount, safeImage,
    transitionStates(input: PublicSettings, direction: number) {return transitionStates(resolveSettings(input), direction);},
  };
}
