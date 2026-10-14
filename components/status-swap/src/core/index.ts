import manifest from '../../component.json';

export interface Settings {
  appearance: 'circle' | 'roll'; idleLabel: string; activeLabel: string;
  initialSaved: boolean; disabled: boolean; motionScale: number;
  surface: string; textColor: string; savedSurface: string; savedIconColor: string;
  rollSavedSurface: string; rollSavedTextColor: string;
  fontSize: number; fontWeight: number; paddingX: number; paddingY: number;
  cornerStyle: 'pill' | 'rounded' | 'square'; widthMode: 'fit' | 'full';
  borderWidth: number; borderColor: string; borderOpacity: number;
  travel: number; blur: number; pressDepth: number;
}
export const defaults = Object.freeze(Object.fromEntries(manifest.settings.map(s => [s.key, s.default]))) as unknown as Readonly<Settings>;

export function resolveSettings(input: unknown = {}): Settings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Settings must be an object');
  const result = { ...defaults };
  for (const [key, value] of Object.entries(input)) {
    const rule = manifest.settings.find(s => s.key === key);
    if (!rule) throw new Error(`Unknown setting: ${key}`);
    if (rule.kind === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < rule.min! || value > rule.max!) throw new Error(`Invalid number: ${key}`);
    } else if (rule.kind === 'boolean') {
      if (typeof value !== 'boolean') throw new Error(`Invalid boolean: ${key}`);
    } else {
      if (typeof value !== 'string') throw new Error(`Invalid text: ${key}`);
      if (rule.kind === 'select' && !rule.options?.some(o => o.value === value)) throw new Error(`Invalid selection: ${key}`);
      if (rule.kind === 'color' && !/^(?:transparent|#[0-9a-f]{6}(?:[0-9a-f]{2})?)$/i.test(value)) throw new Error(`Invalid color: ${key}`);
      if (rule.kind === 'text' && (!value.trim() || value.length > rule.maxLength! || /[\u0000-\u001f\u007f]/.test(value))) throw new Error(`Invalid label: ${key}`);
    }
    Object.assign(result, { [key]: value });
  }
  return result;
}
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, p: number) => { const t = clamp((p - a) / (b - a)); return t * t * (3 - 2 * t); };
const bookmark = '<svg class="ss-bookmark" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 4.5h10v15l-5-3.4-5 3.4z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
const tick = '<svg class="ss-tick" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/></svg>';
let sequence = 0;
const lineHeight = (s: Settings) => Math.max(s.appearance === 'roll' ? 20 : 0, Math.ceil(s.fontSize * 4 / 3));
const height = (s: Settings) => Math.max(s.appearance === 'circle' ? 44 : 0, lineHeight(s) + 2 * s.paddingY + 2 * s.borderWidth);
const preferred = (s: Settings, h: number) => s.appearance === 'circle' ? Math.max(h, 152 * h / 52 + 2 * (s.paddingX - 16)) : 0;
const rgba = (color: string): number[] => color === 'transparent' ? [0, 0, 0, 0] : [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16), color.length === 9 ? parseInt(color.slice(7, 9), 16) / 255 : 1];
const blend = (a: string, b: string, p: number) => { const x = rgba(a), y = rgba(b); return `rgba(${x.map((v, i) => v + (y[i] - v) * clamp(p)).join(',')})`; };
function variables(s: Settings) {
  const h = height(s), border = rgba(s.borderColor); border[3] *= s.borderOpacity;
  return `--ss-font:${s.fontSize}px;--ss-weight:${s.fontWeight};--ss-line:${lineHeight(s)}px;--ss-x:${s.paddingX}px;--ss-y:${s.paddingY}px;--ss-border:${s.borderWidth}px;--ss-border-color:rgba(${border.join(',')});--ss-icon:${19 * s.fontSize / 15}px;--ss-gap:${9 * s.fontSize / 15}px;--ss-h:${h}px;--ss-w:${preferred(s, h)}px;--ss-text:${s.textColor};--ss-saved:${s.appearance === 'roll' ? s.rollSavedSurface : s.savedSurface};--ss-tick:${s.appearance === 'roll' ? s.rollSavedTextColor : s.savedIconColor};--ss-surface:${s.surface};--ss-radius:${s.cornerStyle === 'pill' ? h / 2 : s.cornerStyle === 'rounded' ? Math.min(12, h / 2) : 0}px`;
}
export function render(input: unknown = {}, id = `status-swap-${++sequence}`): string {
  const s = resolveSettings(input), saved = s.initialSaved;
  return `<span class="ss-slot" id="${escape(id)}" data-appearance="${s.appearance}" data-width="${s.widthMode}" data-saved="${saved}" style="${variables(s)}"><span class="ss-measure" aria-hidden="true"><span class="ss-measure-idle">${bookmark}<span>${escape(s.idleLabel)}</span></span><span class="ss-measure-active">${escape(s.activeLabel)}</span></span><button class="ss-button" type="button" disabled aria-pressed="${saved}" aria-label="${escape(saved ? s.activeLabel : s.idleLabel)}"><span class="ss-face" aria-hidden="true"><span class="ss-idle" aria-hidden="true">${bookmark}<span>${escape(s.idleLabel)}</span></span><span class="ss-active" aria-hidden="true">${escape(s.activeLabel)}</span>${tick}</span></button></span>`;
}
interface Spring { position: number; velocity: number }
// Closed-form underdamped response. Retargeting preserves both position and velocity.
function advance(s: Spring, target: number, dt: number, frequency: number, damping: number) {
  const decay = damping * frequency, oscillation = frequency * Math.sqrt(1 - damping * damping);
  const displacement = s.position - target, sineWeight = (s.velocity + decay * displacement) / oscillation;
  const sin = Math.sin(oscillation * dt), cos = Math.cos(oscillation * dt), attenuation = Math.exp(-decay * dt);
  s.position = target + attenuation * (displacement * cos + sineWeight * sin);
  s.velocity = attenuation * ((-decay * displacement + oscillation * sineWeight) * cos + (-decay * sineWeight - oscillation * displacement) * sin);
}
// Invert the x-coordinate of cubic-bezier(.22,1,.36,1).
function ease(t: number) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 18; i++) { const u = (lo + hi) / 2, x = 3 * (1 - u) ** 2 * u * .22 + 3 * (1 - u) * u * u * .36 + u ** 3; if (x < t) lo = u; else hi = u; }
  return 1 - (1 - (lo + hi) / 2) ** 3;
}
export interface Controller { update(input: unknown): void; pause(): void; resume(): void; destroy(): void }
export function mount(host: HTMLElement, input: unknown = {}, id?: string): Controller {
  let settings = resolveSettings(input), saved = settings.initialSaved, destroyed = false, paused = false, visible = true;
  const doc = host.ownerDocument, win = doc.defaultView;
  host.innerHTML = render(settings, id);
  const slot = host.querySelector<HTMLElement>('.ss-slot')!, button = slot.querySelector<HTMLButtonElement>('.ss-button')!;
  const face = slot.querySelector<HTMLElement>('.ss-face')!;
  const idle = slot.querySelector<HTMLElement>('.ss-idle')!, active = slot.querySelector<HTMLElement>('.ss-active')!, icon = slot.querySelector<SVGElement>('.ss-tick')!, path = icon.querySelector('path')!;
  const measure = slot.querySelector<HTMLElement>('.ss-measure')!, idleMeasure = slot.querySelector<HTMLElement>('.ss-measure-idle')!, activeMeasure = slot.querySelector<HTMLElement>('.ss-measure-active')!;
  const media = win?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const spring = { position: +saved, velocity: 0 }, stroke = { position: +saved, velocity: 0 };
  let frame = 0, last = 0, width = preferred(settings, height(settings)), h = height(settings), rollTime = 0;
  let rollIdle = saved ? 0 : 1, rollActive = saved ? 1 : 0, fromIdle = rollIdle, fromActive = rollActive;
  let idleY = saved ? 1 : 0, activeY = saved ? 0 : 1, fromIdleY = idleY, fromActiveY = activeY;
  const canAnimate = () => !paused && visible && !doc.hidden && !media?.matches && !!media && !!win?.requestAnimationFrame && typeof button.animate === 'function' && settings.motionScale > 0;
  function cancel() { if (frame) win?.cancelAnimationFrame(frame); frame = 0; last = 0; }
  function paint() {
    const s = settings, p = spring.position, q = clamp(p), circle = s.appearance === 'circle';
    slot.dataset.saved = String(saved); button.setAttribute('aria-pressed', String(saved)); button.setAttribute('aria-label', saved ? s.activeLabel : s.idleLabel); button.disabled = s.disabled;
    const diameter = Math.min(h, width), extra = circle ? 1.8 * h / 52 * (s.pressDepth / .028) * Math.sin(Math.PI * q) : 0;
    const progress = q + (p - q) * (s.pressDepth / .028), radius = s.cornerStyle === 'pill' ? h / 2 : s.cornerStyle === 'rounded' ? Math.min(12, h / 2) : 0;
    button.style.width = `${circle ? width + (diameter - width) * progress : width}px`;
    button.style.height = `${circle ? h + (diameter - h) * q + extra : h}px`;
    button.style.borderRadius = `${circle ? radius + (diameter / 2 - radius) * q + extra / 2 : radius}px`;
    const background = blend(s.surface, circle ? s.savedSurface : s.rollSavedSurface, q);
    button.style.background = circle ? background : 'transparent';
    face.style.background = circle ? '' : background;
    // Keep the native hit target stationary while its decorative surface recovers.
    face.style.transform = circle ? '' : `scale(${1 - s.pressDepth * Math.sin(Math.PI * q)})`;
    const labelOpacity = circle ? 1 - smooth(0, .58, p) : rollIdle, iconOpacity = smooth(.16, .85, p);
    idle.style.opacity = String(labelOpacity);
    idle.style.transform = circle ? `translateY(${-4 * s.travel / 18 * (1 - labelOpacity)}px) scale(${.96 + .04 * labelOpacity})` : `translateY(${s.travel * idleY}px)`;
    idle.style.filter = `blur(${(circle ? 2 * s.blur / 3 : s.blur) * (1 - labelOpacity)}px)`;
    active.style.opacity = String(rollActive); active.style.transform = `translateY(${s.travel * activeY}px)`; active.style.filter = `blur(${s.blur * (1 - rollActive)}px)`;
    icon.style.opacity = String(iconOpacity); icon.style.width = `${24 * h / 52}px`; icon.style.height = `${24 * h / 52}px`;
    icon.style.transform = `translateY(${3 * s.travel / 18 * (1 - iconOpacity)}px) rotate(${-14 * s.travel / 18 * (1 - p)}deg) scale(${.82 + .18 * p})`;
    path.style.strokeDasharray = '1'; path.style.strokeDashoffset = String(1 - clamp(stroke.position));
  }
  function layout() {
    slot.style.cssText = variables(settings); slot.dataset.appearance = settings.appearance; slot.dataset.width = settings.widthMode;
    idle.lastElementChild!.textContent = settings.idleLabel; active.textContent = settings.activeLabel;
    idleMeasure.lastElementChild!.textContent = settings.idleLabel; activeMeasure.textContent = settings.activeLabel;
    const available = host.clientWidth || host.getBoundingClientRect().width || preferred(settings, height(settings));
    measure.style.padding = '0'; measure.style.border = '0'; measure.style.width = 'max-content';
    const natural = measure.getBoundingClientRect().width + 2 * (settings.paddingX + settings.borderWidth);
    h = height(settings); width = settings.widthMode === 'full' ? available : Math.min(available, Math.max(preferred(settings, h), natural));
    measure.style.width = `${Math.max(0, width - 2 * (settings.paddingX + settings.borderWidth))}px`;
    h = Math.max(h, measure.getBoundingClientRect().height + 2 * (settings.paddingY + settings.borderWidth));
    slot.style.width = `${width}px`; slot.style.height = `${Math.max(44, h)}px`; slot.style.setProperty('--ss-h', `${h}px`);
    idle.style.width = `${Math.max(0, width - 2 * (settings.paddingX + settings.borderWidth))}px`;
    slot.dataset.hostLimited = String(available < 44); paint();
  }
  function settle() { cancel(); spring.position = stroke.position = +saved; spring.velocity = stroke.velocity = 0; rollIdle = saved ? 0 : 1; rollActive = +saved; idleY = saved ? 1 : 0; activeY = saved ? 0 : 1; paint(); }
  function sample(now: number) {
    const dt = last ? (now - last) / 1000 / settings.motionScale : 0; last = now;
    if (settings.appearance === 'circle') { advance(spring, +saved, dt, 19, .78); advance(stroke, +saved, dt, 17, .9); }
    else {
      rollTime += dt; const idleEase = ease(clamp(rollTime / (saved ? .15 : .3))), activeEase = ease(clamp(rollTime / (saved ? .3 : .15)));
      rollIdle = fromIdle + ((saved ? 0 : 1) - fromIdle) * idleEase; rollActive = fromActive + (+saved - fromActive) * activeEase;
      idleY = fromIdleY + ((saved ? -1 : 0) - fromIdleY) * idleEase; activeY = fromActiveY + ((saved ? 0 : -1) - fromActiveY) * activeEase;
      spring.position = saved ? rollActive : 1 - rollIdle; stroke.position = spring.position;
    }
  }
  function loop(now: number) {
    frame = 0; if (destroyed) return; if (!canAnimate()) { settle(); return; }
    sample(now); paint();
    const done = settings.appearance === 'circle' ? [spring, stroke].every(s => Math.abs(s.position - +saved) < .00015 && Math.abs(s.velocity) < .003) : rollTime >= .3;
    if (done) settle(); else frame = win!.requestAnimationFrame(loop);
  }
  function retarget() {
    if (!canAnimate()) { settle(); return; }
    if (!saved && rollIdle === 0) idleY = 1; if (saved && rollActive === 0) activeY = 1;
    fromIdleY = idleY; fromActiveY = activeY; fromIdle = rollIdle; fromActive = rollActive; rollTime = 0; last = win!.performance.now(); paint();
    if (!frame) frame = win!.requestAnimationFrame(loop);
  }
  function click() {
    if (destroyed || settings.disabled) return;
    if (frame && canAnimate()) sample(win!.performance.now());
    saved = !saved; retarget();
  }
  function visibility() { if (!destroyed && !canAnimate()) settle(); }
  button.addEventListener('click', click); doc.addEventListener('visibilitychange', visibility);
  media?.addEventListener?.('change', visibility);
  const intersection = win?.IntersectionObserver ? new win.IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; visibility(); }) : null;
  intersection?.observe(host);
  const resize = win?.ResizeObserver ? new win.ResizeObserver(() => { if (!destroyed) layout(); }) : null;
  resize?.observe(host); win?.addEventListener('resize', layout);
  layout(); settle();
  return {
    update(input) {
      const next = resolveSettings(input); if (destroyed) return;
      if (frame && canAnimate()) sample(win!.performance.now());
      const stateChanged = next.initialSaved !== settings.initialSaved, appearanceChanged = next.appearance !== settings.appearance;
      settings = next; if (stateChanged) saved = next.initialSaved;
      layout(); if (appearanceChanged || !canAnimate()) settle(); else if (stateChanged) retarget();
    },
    pause() { if (!destroyed) { paused = true; settle(); } },
    resume() { if (!destroyed) paused = false; },
    destroy() { if (destroyed) return; destroyed = true; cancel(); button.removeEventListener('click', click); doc.removeEventListener('visibilitychange', visibility); media?.removeEventListener?.('change', visibility); intersection?.disconnect(); resize?.disconnect(); win?.removeEventListener('resize', layout); button.disabled = true; }
  };
}
