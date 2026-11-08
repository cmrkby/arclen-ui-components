import portraitAsset from '../../assets/light-study-portrait.webp';
const assetURL = (value: string | { src: string }): string => typeof value === 'string' ? value : value.src;
const portrait = assetURL(portraitAsset);
import manifest from '../../component.json';
export interface Settings {
  heading: string; subtitle: string; leftLabel: string; rightLabel: string; footer: string; credit: string; invitation: string;
  image: string; imageAlt: string; imagePositionX: number; imagePositionY: number; heightMode: 'viewport' | 'fixed'; stageHeight: number;
  scrollLength: number; titleSize: number; canvasColor: string; captionColor: string; titleColor: string; shadeOpacity: number; settling: number; reduceMotion: boolean;
}
export const defaults = Object.freeze(Object.fromEntries(manifest.settings.map(setting => [setting.key, setting.default]))) as unknown as Settings;
const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, Number.isFinite(n) ? n : a));
const escape = (v: string) => v.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function imageURL(v: unknown): string {
  if (typeof v !== 'string' || v.length > 4000000 || /[\u0000-\u0020<>"'\\]/.test(v)) return '';
  if (/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v)) return v;
  if (/^(?:https:\/\/|blob:https?:\/\/)/i.test(v)) { try { const u = new URL(v); return u.username || u.password ? '' : u.href; } catch { return ''; } }
  return /^(?:\.\/)?[A-Za-z0-9_-][A-Za-z0-9_./-]*$/.test(v) && !v.includes('..') ? v : '';
}
export function resolveSettings(input: unknown = {}): Settings {
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const result: Record<string, unknown> = {};
  for (const setting of manifest.settings) {
    const value = raw[setting.key];
    if (setting.kind === 'text') result[setting.key] = typeof value === 'string' ? value.slice(0, setting.maxLength) : setting.default;
    else if (setting.kind === 'number') result[setting.key] = typeof value === 'number' && Number.isFinite(value) ? clamp(value, setting.min, setting.max) : setting.default;
    else if (setting.kind === 'boolean') result[setting.key] = typeof value === 'boolean' ? value : setting.default;
    else if (setting.kind === 'color') result[setting.key] = typeof value === 'string' && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value) ? value : setting.default;
    else if (setting.kind === 'select') result[setting.key] = setting.options?.includes(value as string) ? value : setting.default;
    else if (setting.kind === 'image') result[setting.key] = imageURL(value);
  }
  return result as unknown as Settings;
}
export function motionAt(progress: number, width: number, height: number, _direction = 'light-study') {
  const p = clamp(progress), mobile = width < 768, plateau = mobile ? .2 : .15, side = mobile ? .12 : .28;
  const expansion = clamp((p - .45) / .45), settle = clamp((p - .5) / .5), opening = 1 - clamp(p / .45);
  const openingTop = mobile ? .20 : .18, openingSide = mobile ? .24 : .38, openingBottom = mobile ? .30 : .27;
  return { progress: p, bottom: height * openingBottom * opening, top: p < .45 ? height * (plateau + (openingTop - plateau) * opening) : height * (plateau + (-.2 - plateau) * expansion), side: width * (side + (-.2 - side) * expansion + (openingSide - side) * opening), captionX: width * .15 * clamp(p / .5), captionOpacity: 1 - clamp((p - .25) / .25), titleOpacity: clamp((p - .5) / .4), titleScale: 1.2 - .2 * settle, titleY: 30 * (1 - settle) };
}
export function settleProgress(current: number, target: number, elapsed: number, timeConstant = 400) {
  if (timeConstant <= 0 || Math.abs(target - current) < .0001) return target;
  const next = current + (target - current) * (1 - Math.exp(-Math.max(0, elapsed) / timeConstant));
  return Math.abs(target - next) < .0001 ? target : next;
}
function styleSettings(s: Settings): string {
  return `--eh-height:${s.heightMode === 'fixed' ? s.stageHeight + 'px' : '100svh'};--eh-length:${s.scrollLength};--eh-type-scale:${s.titleSize};--eh-canvas:${s.canvasColor};--eh-ink:${s.captionColor};--eh-image-ink:${s.titleColor};--eh-shade-opacity:${s.shadeOpacity};--eh-image-position:${s.imagePositionX}% ${s.imagePositionY}%`;
}
export function render(input: unknown = {}): string {
  const s = resolveSettings(input);
  return `<section class="eh eh--light-study" data-expand-hero aria-label="${escape(s.heading)}" style="${styleSettings(s)}">
    <div class="eh-track"><div class="eh-stage">
      <div class="eh-captions" aria-hidden="true"><span class="eh-caption eh-caption--left">${escape(s.leftLabel)}</span><span class="eh-caption eh-caption--right">${escape(s.rightLabel)}</span></div>
      <div class="eh-mask">
        <img class="eh-image" src="${escape(s.image || portrait)}" alt="${escape(s.imageAlt)}" fetchpriority="high" decoding="async">
        <div class="eh-shade" aria-hidden="true"></div>
        <div class="eh-title"><h1>${escape(s.heading)}</h1><p>${escape(s.subtitle)}</p></div>
        <div class="eh-colophon"><span>${escape(s.footer)}</span><span>${escape(s.credit)}</span></div>
      </div>
      <div class="eh-invitation" aria-hidden="true"><span>${escape(s.invitation)}</span></div>
    </div></div>
  </section>`;
}

export function mount(host: HTMLElement, input: unknown = {}) {
  const doc = host.ownerDocument, win = doc.defaultView;
  if (!win) throw new Error('Expand Hero needs a document window.');
  let settings = resolveSettings(input), root: HTMLElement, track: HTMLElement, stage: HTMLElement;
  let destroyed = false, paused = false, visible = true, raf = 0, paints = 0, progress = 0, targetProgress = 0, lastTime = 0;
  let io: IntersectionObserver | undefined, ro: ResizeObserver | undefined;
  let scrollRoot: HTMLElement | null = null;
  const media = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  // Without preference detection, keep the readable still composition.
  const reducedMotion = () => media?.matches ?? true;
  const cancel = () => { if (raf) win.cancelAnimationFrame(raf); raf = 0; };
  const active = () => !destroyed && !paused && visible && !doc.hidden;
  function paint(timestamp?: number, preserveProgress = false) {
    raf = 0;
    if (!preserveProgress && !active()) return;
    const reduced = reducedMotion() || settings.reduceMotion;
    root.toggleAttribute('data-reduced', reduced);
    const rect = track.getBoundingClientRect(), h = stage.getBoundingClientRect().height;
    const w = root.getBoundingClientRect().width;
    const origin = scrollRoot ? scrollRoot.getBoundingClientRect().top + scrollRoot.clientTop : 0;
    targetProgress = reduced ? 1 : clamp((origin - rect.top) / Math.max(1, rect.height - h));
    const now = timestamp ?? win!.performance.now();
    if (reduced) progress = 1;
    else if (!preserveProgress) progress = timestamp === undefined ? targetProgress : settleProgress(progress, targetProgress, now - lastTime, settings.settling);
    lastTime = now;
    const m = motionAt(progress, w, h, 'light-study');
    root.style.setProperty('--eh-unit', `${w / 100}px`);
    root.dataset.size = w < 768 ? 'small' : w < 1024 ? 'medium' : 'large';
    root.style.setProperty('--eh-top', `${m.top}px`);
    root.style.setProperty('--eh-side', `${m.side}px`);
    root.style.setProperty('--eh-bottom', `${m.bottom}px`);
    root.style.setProperty('--eh-caption-x', `${m.captionX}px`);
    root.style.setProperty('--eh-caption-opacity', `${m.captionOpacity}`);
    root.style.setProperty('--eh-title-opacity', `${m.titleOpacity}`);
    root.style.setProperty('--eh-title-scale', `${m.titleScale}`);
    root.style.setProperty('--eh-title-y', `${m.titleY}px`);
    root.style.setProperty('--eh-reveal', `${m.titleOpacity}`);
    root.dataset.progress = progress.toFixed(6);
    paints++;
    if (!preserveProgress && !reduced && progress !== targetProgress && active()) raf = win!.requestAnimationFrame(paint);
  }
  function schedule() { if (active() && !raf) { lastTime = win!.performance.now(); raf = win!.requestAnimationFrame(paint); } }
  function findScrollRoot() {
    scrollRoot = null;
    for (let el: HTMLElement | null = host; el && el !== doc.body; el = el.parentElement) {
      // Hidden overflow is also a sticky containing scrollport. Unlike clip,
      // it supports programmatic scrolling and must supply the same origin.
      if (/^(auto|scroll|hidden|overlay)$/.test(win!.getComputedStyle(el).overflowY)) { scrollRoot = el; break; }
    }
  }
  function setup(preserveProgress = false) {
    host.innerHTML = render(settings);
    root = host.querySelector<HTMLElement>('[data-expand-hero]')!;
    track = root.querySelector<HTMLElement>('.eh-track')!;
    stage = root.querySelector<HTMLElement>('.eh-stage')!;
    root.setAttribute('data-live', '');
    root.toggleAttribute('data-reduced', reducedMotion() || settings.reduceMotion);
    findScrollRoot(); visible = true;
    const img = root.querySelector('img')!;
    img.addEventListener('error', imageError);
    if (img.complete && !img.naturalWidth) imageError();
    // Viewport intersection includes clipping by nested scroll containers. An
    // explicit scrollRoot would still report true when that scroller is offscreen.
    if (win!.IntersectionObserver) { io = new win!.IntersectionObserver(entries => { visible = entries.some(e => e.isIntersecting); if (visible) schedule(); else cancel(); }); io.observe(track); }
    if (win!.ResizeObserver) { ro = new win!.ResizeObserver(() => { findScrollRoot(); schedule(); }); ro.observe(root); ro.observe(stage); }
    paint(undefined, preserveProgress);
    if (preserveProgress) schedule();
  }
  function imageError() { root.setAttribute('data-image-failed', ''); }
  function visibility() { if (doc.hidden) cancel(); else schedule(); }
  function changedMotion() { root.toggleAttribute('data-reduced', reducedMotion() || settings.reduceMotion); schedule(); }
  function unbindRoot() { root.querySelector('img')?.removeEventListener('error', imageError); io?.disconnect(); ro?.disconnect(); io = undefined; ro = undefined; }
  win.addEventListener('scroll', schedule, { capture: true, passive: true });
  win.addEventListener('resize', schedule, { passive: true });
  doc.addEventListener('visibilitychange', visibility);
  media?.addEventListener?.('change', changedMotion);
  setup();
  return {
    update(next: unknown) {
      if (destroyed) return;
      const resolved = resolveSettings(next);
      if (JSON.stringify(resolved) === JSON.stringify(settings)) return;
      cancel(); settings = resolved;
      root.setAttribute('style', styleSettings(settings));
      root.setAttribute('aria-label', settings.heading);
      const content: Array<[string, string]> = [['h1', settings.heading], ['.eh-title p', settings.subtitle], ['.eh-caption--left', settings.leftLabel], ['.eh-caption--right', settings.rightLabel], ['.eh-colophon span:first-child', settings.footer], ['.eh-colophon span:last-child', settings.credit], ['.eh-invitation span', settings.invitation]];
      for (const [selector, value] of content) root.querySelector(selector)!.textContent = value;
      const img = root.querySelector('img')!;
      const source = settings.image || portrait;
      if (img.getAttribute('src') !== source) { root.removeAttribute('data-image-failed'); img.setAttribute('src', source); }
      img.alt = settings.imageAlt;
      paint(undefined, true); schedule();
    },
    pause() { if (destroyed) return; paused = true; cancel(); },
    resume() { if (destroyed) return; paused = false; schedule(); },
    destroy() { if (destroyed) return; destroyed = true; cancel(); unbindRoot(); win.removeEventListener('scroll', schedule, true); win.removeEventListener('resize', schedule); doc.removeEventListener('visibilitychange', visibility); media?.removeEventListener?.('change', changedMotion); root.remove(); },
    inspect() { return { destroyed, paused, visible, hidden: doc.hidden, reducedMotion: reducedMotion() || settings.reduceMotion, pendingFrame: !!raf, paints, progress, targetProgress, observers: Number(!!io) + Number(!!ro), listeners: destroyed ? 0 : 5 }; },
  };
}
