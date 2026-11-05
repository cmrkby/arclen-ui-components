import {tuning, tuningVariables, applyTuning, type Tuning} from './tuning';
/** Independently authored, portable Tactical Button. No package or application imports. */
export interface TacticalSettings extends Partial<Tuning> {
  label: string;
  disabled: boolean;
  animate: boolean;
  textColor: string;
  scatterColor?: string;
  backgroundColor: string;
  cornerColor: string;
}
export interface TacticalController {
  update(settings: Partial<TacticalSettings>): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}
export interface TacticalOptions { onAction?: (event: MouseEvent) => void }

const escape = (value: string) => value.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]!);
const color = /^(?:transparent|#[\da-f]{6}(?:[\da-f]{2})?)$/i;
export function resolveTactical(input: unknown, base: Readonly<TacticalSettings>): TacticalSettings {
  const next = {...base};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return next;
  const values = input as Record<string, unknown>;
  if (typeof values.label === 'string') {
    let label = values.label.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 40);
    if (/[\uD800-\uDBFF]$/.test(label)) label = label.slice(0, -1);
    next.label = label.trim() ? label : 'Button';
  }
  for (const key of ['disabled','animate'] as const) if (typeof values[key] === 'boolean') next[key] = values[key];
  for (const key of ['textColor','scatterColor','backgroundColor','cornerColor'] as const) if (typeof values[key] === 'string' && color.test(values[key])) next[key] = values[key];
  for (const key of Object.keys(tuning(next)) as (keyof Tuning)[]) {
    const candidate = {...next, [key]: values[key]};
    if (values[key] !== undefined && tuning(candidate)[key] === values[key]) Object.assign(next, {[key]: values[key]});
  }
  return next;
}
function variables(settings: TacticalSettings) {
  return `${tuningVariables(settings)};--tb-text:${settings.textColor};--tb-scramble:${settings.scatterColor ?? settings.textColor};--tb-background:${settings.backgroundColor};--tb-corner:${settings.cornerColor}`;
}
function inside(settings: TacticalSettings) {
  const corners = ['tl','bl','tr','br'].map(position => `<span class="tb-corner tb-${position}" aria-hidden="true"><span class="tb-mark"></span></span>`).join('');
  return `${corners}<span class="tb-label-wrap" data-tb-full="${escape(settings.label)}" aria-hidden="true"><span class="tb-label" data-tb-label>${escape(settings.label)}</span></span><span class="tb-surface" aria-hidden="true"></span>`;
}
export function renderTacticalButton(settings: TacticalSettings, id?: string): string {
  return `<button type="button" class="tb-button" data-tb-trigger${id ? ` id="${escape(id)}"` : ''} aria-label="${escape(settings.label)}"${settings.disabled ? ' disabled' : ''} style="${variables(settings)}">${inside(settings)}</button>`;
}

interface Channel { value: number; from: number; to: number; start: number; delay: number; duration: number }
// Staggered channels control the four brackets, label and fill.
const channels = (): Channel[] => [100,200,400,300,0,0].map(delay => ({value:0,from:0,to:0,start:0,delay,duration:600}));
function ease(progress: number): number {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  // Solve an independently chosen cubic curve's x coordinate before sampling y.
  let low = 0, high = 1, t = progress;
  for (let i = 0; i < 15; i++) {
    const x = 3 * (1-t) * (1-t) * t * .16 + 3 * (1-t) * t * t * .3 + t * t * t;
    if (x < progress) low = t; else high = t;
    t = (low + high) / 2;
  }
  return 1 - (1-t) ** 3;
}
const attached = new WeakMap<HTMLButtonElement, TacticalController>();
export function attachTactical(button: HTMLButtonElement, initial: TacticalSettings, options: TacticalOptions = {}): TacticalController {
  attached.get(button)?.destroy();
  let settings = {...initial};
  let tune = tuning(settings);
  const doc = button.ownerDocument, win = doc.defaultView;
  button.classList.add('tb-button'); button.setAttribute('data-tb-trigger', ''); button.type = 'button';
  if (!button.querySelector('.tb-label-wrap')) button.innerHTML = inside(settings);
  const corners = [...button.querySelectorAll<HTMLElement>('.tb-corner')];
  const labelWrap = button.querySelector<HTMLElement>('.tb-label-wrap')!;
  const label = button.querySelector<HTMLElement>('[data-tb-label]')!;
  const surface = button.querySelector<HTMLElement>('.tb-surface')!;
  const reduced = win?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const pointer = win?.matchMedia?.('(hover: hover) and (pointer: fine)');
  const capable = Boolean(win && typeof win.requestAnimationFrame === 'function' && typeof win.cancelAnimationFrame === 'function' && typeof win.matchMedia === 'function' && typeof win.IntersectionObserver === 'function' && typeof win.ResizeObserver === 'function' && typeof button.animate === 'function');
  let motion = channels(), frame = 0, paused = false, visible = true, destroyed = false, hovered = false;
  let surfaceSize = {width: 0, height: 0};
  let scrambleStart: number | null = null;
  let deferredStart = false, blur: Animation | null = null, blurFrom = 0;
  function cancelBlur() {
    if (!blur) return;
    blur.onfinish = null; blur.cancel(); blur = null;
  }
  function captureBlur() {
    const filter = win!.getComputedStyle(surface).filter;
    const current = /^blur\(([.\d]+)px\)$/.exec(filter);
    blurFrom = current ? Number(current[1]) : 0;
    surface.style.filter = blurFrom ? `blur(${blurFrom}px)` : 'none';
    cancelBlur();
  }
  function startDeferred(now: number) {
    deferredStart = false;
    motion[4].start = now;
    const target = motion[5].to * tune.classicBlur;
    surface.style.filter = target ? `blur(${target}px)` : 'none';
    if (blurFrom === target) return;
    const animation = surface.animate(
      [{filter: `blur(${blurFrom}px)`}, {filter: `blur(${target}px)`}],
      {duration: tune.cornerDuration, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'both'}
    );
    // Native blur uses the document timeline at the callback boundary.
    animation.startTime = now;
    blur = animation;
    animation.onfinish = () => {
      if (blur !== animation) return;
      animation.onfinish = null; animation.cancel(); blur = null;
    };
  }
  const symbols = '#%*+-/01=@_';
  const canAnimate = () => capable && settings.animate && !settings.disabled && !paused && visible && !doc.hidden && !reduced?.matches;
  function cancel() { if (frame) win?.cancelAnimationFrame(frame); frame = 0; }
  function paint() {
    corners.forEach((corner, index) => {
      const x = index < 2 ? -1 : 1, y = index === 0 || index === 2 ? -1 : 1;
      corner.style.transform = `translate(${tune.cornerTravel * x * motion[index].value}px, ${tune.cornerTravel * y * motion[index].value}px)`;
    });
    labelWrap.style.transform = `scale(${1 - (1-tune.labelScale) * motion[4].value})`;
    const inset = tune.classicInset * motion[5].value, targetInset = tune.classicInset * motion[5].to;
    // Snap each inset axis when the remaining displacement is below its subpixel tolerance.
    const settleInset = (size: number) => Math.abs(inset - targetInset) <= Math.max(0, size - 2 * targetInset) * .0001 / 2 ? targetInset : inset;
    surface.style.inset = `${settleInset(surfaceSize.height)}px ${settleInset(surfaceSize.width)}px`;
  }
  function settle() {
    cancel(); cancelBlur(); deferredStart = false; blurFrom = 0; surface.style.filter = 'none';
    hovered = false; scrambleStart = null; motion = channels();
    label.textContent = settings.label; button.removeAttribute('data-tb-scrambling'); paint();
  }
  function configure() {
    button.style.setProperty('--tb-scramble', settings.scatterColor ?? settings.textColor);
    tune = tuning(settings); applyTuning(button, settings);
    button.disabled = settings.disabled;
    button.setAttribute('aria-label', settings.label);
    button.style.setProperty('--tb-text', settings.textColor);
    button.style.setProperty('--tb-background', settings.backgroundColor);
    button.style.setProperty('--tb-corner', settings.cornerColor);
    labelWrap.setAttribute('data-tb-full', settings.label);
  }
  function sample(now: number, callbackTime = now): boolean {
    let busy = false;
    for (const [index, channel] of motion.entries()) {
      if (channel.from === channel.to) { channel.value = channel.to; continue; }
      // Geometry and label use separate clocks; corners retain their current interpolation.
      const clock = index === 4 || (index === 5 && now >= channel.start) ? callbackTime : now;
      const progress = (clock - channel.start - channel.delay) / channel.duration;
      channel.value = channel.from + (channel.to - channel.from) * ease(progress);
      // Corner samples become exact at a roughly .01px remaining displacement.
      if (index < 4 && progress >= 0 && Math.abs(channel.to - channel.value) * 4 <= .01) channel.value = channel.to;
      if (progress < 1 && channel.value !== channel.to) busy = true;
    }
    if (scrambleStart !== null) {
      // The first character locks after ~60ms, subsequent characters at ~100ms steps.
      // Bound the prefix update to the current character interval.
      const resolved = Math.max(0, Math.floor((now - scrambleStart + tune.scrambleInterval * .4) / tune.scrambleInterval));
      let index = 0;
      label.textContent = Array.from(settings.label).map(character => /\s/.test(character) ? character : (++index <= resolved ? character : symbols[Math.floor(Math.random() * symbols.length)])).join('');
      if (resolved >= index) { label.textContent = settings.label; scrambleStart = null; button.removeAttribute('data-tb-scrambling'); }
      else busy = true;
    }
    return busy;
  }
  function tick(now: number) {
    frame = 0;
    if (destroyed) return;
    if (!canAnimate()) { settle(); return; }
    const callbackTime = win!.performance.now();
    // A frame stamped before the input cannot initialize the new label/blur phase.
    if (deferredStart && now >= motion[5].start) startDeferred(callbackTime);
    const busy = sample(now, callbackTime); paint();
    if (busy) frame = win!.requestAnimationFrame(tick);
  }
  function retarget(active: boolean) {
    if (!canAnimate()) { settle(); return; }
    const now = win!.performance.now();
    const computed = win!.getComputedStyle(button);
    surfaceSize = {width: parseFloat(computed.width) || 0, height: parseFloat(computed.height) || 0};
    sample(now); captureBlur();
    hovered = active;
    for (const [index, channel] of motion.entries()) { channel.delay = index < 4 ? [1,2,4,3][index] * tune.cornerStagger : 0; channel.duration = tune.cornerDuration; channel.from = channel.value; channel.to = +active; channel.start = now; }
    motion[4].start = Infinity;
    deferredStart = true;
    scrambleStart = active && tune.scramble ? now : null;
    button.toggleAttribute('data-tb-scrambling', active && tune.scramble);
    if (!active) label.textContent = settings.label;
    else sample(now);
    paint();
    if (!frame) frame = win!.requestAnimationFrame(tick);
  }
  function enter(event: PointerEvent) { if (event.pointerType !== 'touch' && pointer?.matches && !hovered) retarget(true); }
  function leave() { if (hovered) retarget(false); }
  function eligibility() { if (!canAnimate()) settle(); }
  function action(event: MouseEvent) { if (!destroyed && !settings.disabled) options.onAction?.(event); }
  button.addEventListener('pointerenter', enter);
  button.addEventListener('pointerleave', leave);
  if (options.onAction) button.addEventListener('click', action);
  doc.addEventListener('visibilitychange', eligibility);
  reduced?.addEventListener?.('change', eligibility);
  const intersection = capable ? new win!.IntersectionObserver(entries => {
    if (destroyed) return;
    visible = entries.find(entry => entry.target === button)?.isIntersecting ?? visible;
    eligibility();
  }) : null;
  intersection?.observe(button);
  configure(); settle();
  const controller: TacticalController = {
    update(input) { if (destroyed) return; settings = resolveTactical(input, settings); configure(); settle(); },
    pause() { if (!destroyed) { paused = true; settle(); } },
    resume() { if (!destroyed) paused = false; },
    destroy() {
      if (destroyed) return;
      settle(); destroyed = true;
      button.removeEventListener('pointerenter', enter); button.removeEventListener('pointerleave', leave);
      if (options.onAction) button.removeEventListener('click', action);
      doc.removeEventListener('visibilitychange', eligibility);
      reduced?.removeEventListener?.('change', eligibility);
      intersection?.disconnect();
      if (attached.get(button) === controller) attached.delete(button);
    }
  };
  attached.set(button, controller);
  return controller;
}
