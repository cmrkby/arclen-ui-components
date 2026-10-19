import manifest from '../../component.json';

export interface Settings {
  accessibleName: string; checked: boolean; disabled: boolean; width: number;
  trackTop: string; trackBottom: string; trackEdge: string; inkColor: string; thumbColor: string;
  shadowStrength: number; interaction: 'click' | 'drag'; motionDuration: number;
  springDamping: number; stretchAmount: number; dragResistance: number;
}
export type ChangeSource = 'pointer' | 'keyboard' | 'drag';
export interface ChangeDetail { checked: boolean; source: ChangeSource }
export interface MountOptions { controlled?: boolean; onCheckedChange?: (checked: boolean, detail: ChangeDetail) => void }
export interface Controller { update(input: unknown): void; pause(): void; resume(): void; destroy(): void }
export const defaults = Object.freeze(Object.fromEntries(manifest.settings.map(s => [s.key, s.default]))) as unknown as Readonly<Settings>;
const own = (o: object, key: string) => Object.prototype.hasOwnProperty.call(o, key);
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const escape = (v: string) => v.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};

/** Invalid values fall back per field; finite numbers are bounded and quantized. */
export function resolveSettings(input: unknown): Settings {
  const source = object(input), out: Record<string, unknown> = { ...defaults };
  for (const entry of manifest.settings) {
    const s = entry as {key: string; kind: string; default: unknown; min?: number; max?: number; step?: number; options?: {value: string}[]};
    if (!own(source, s.key)) continue;
    const v = source[s.key];
    if (s.kind === 'number' && typeof v === 'number' && Number.isFinite(v)) {
      const n = clamp(v, s.min!, s.max!);
      out[s.key] = Number((s.min! + Math.round((n - s.min!) / s.step!) * s.step!).toFixed(6));
    } else if (s.kind === 'boolean' && typeof v === 'boolean') out[s.key] = v;
    else if (s.kind === 'color' && typeof v === 'string' && /^(?:transparent|#[0-9a-f]{6}(?:[0-9a-f]{2})?)$/i.test(v)) out[s.key] = v;
    else if (s.kind === 'select' && s.options?.some(o => o.value === v)) out[s.key] = v;
    else if (s.kind === 'text' && typeof v === 'string') out[s.key] = v.trim().slice(0, 120) || defaults.accessibleName;
  }
  return out as unknown as Settings;
}
let serial = 0;
const session = Math.random().toString(36).slice(2, 9);
const uid = () => `gooey-${session}-${++serial}`;
const cleanId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '_');
const particles = 28;
// Endpoint geometry expressed in the 360 × 180 view box.
const cx = (i: number) => 28 + i * 304 / (particles - 1);
const liquidEase = (t: number) => (1 - Math.exp(-clamp(t) * 620 / 90)) / (1 - Math.exp(-620 / 90));
function variables(s: Settings) {
  return `--gooey-width:${s.width}px;--gooey-top:${s.trackTop};--gooey-bottom:${s.trackBottom};--gooey-edge:${s.trackEdge};--gooey-ink:${s.inkColor};--gooey-thumb:${s.thumbColor};--gooey-shadow:${s.shadowStrength}`;
}
export function render(input: unknown = defaults, id = uid()): string {
  const s = resolveSettings(input), key = cleanId(id);
  return `<span data-gooey-switch data-gooey-motion="rest" class="gooey-switch" style="${variables(s)}"><button class="gooey-switch__button" type="button" role="switch" aria-label="${escape(s.accessibleName)}" aria-checked="${s.checked}" disabled data-gooey-interaction="${s.interaction}"><svg class="gooey-switch__art" viewBox="0 0 360 180" aria-hidden="true" focusable="false"><defs><linearGradient id="${key}-track" x1="0" y1="0" x2="0" y2="1"><stop class="gooey-switch__top" offset="0"/><stop class="gooey-switch__bottom" offset="1"/></linearGradient><clipPath id="${key}-clip"><rect x="10" y="6" width="340" height="168" rx="84"/></clipPath><filter id="${key}-merge" x="-30%" y="-100%" width="160%" height="300%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="5"/><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 -8"/></filter></defs><rect class="gooey-switch__track" x="10" y="6" width="340" height="168" rx="84" fill="url(#${key}-track)"/><g clip-path="url(#${key}-clip)"><rect data-gooey-solid x="10" y="6" width="340" height="168" rx="84" class="gooey-switch__ink" opacity="${s.checked ? 1 : 0}"/><g class="gooey-switch__ink" filter="url(#${key}-merge)">${Array.from({length:particles}, (_,i) => `<circle data-gooey-drop cx="${s.checked ? cx(i) : 94}" cy="90" r="${s.checked ? 110 : 42}"/>`).join('')}</g></g><circle data-gooey-thumb class="gooey-switch__thumb" cx="${s.checked ? 266 : 94}" cy="90" r="77"/></svg></button></span>`;
}

/** Original damped oscillator. Position and velocity are sampled before every retarget. */
function spring(x: number, v: number, target: number, seconds: number, damping: number): [number, number] {
  const w2 = 285 / .78, a = damping / (2 * .78), y = x - target, d = w2 - a * a;
  if (Math.abs(d) < .00001) {
    const b = v + a * y, decay = Math.exp(-a * seconds);
    return [target + (y + b * seconds) * decay, (v - a * b * seconds) * decay];
  }
  if (d > 0) {
    const w = Math.sqrt(d), c = Math.cos(w * seconds), sn = Math.sin(w * seconds), b = (v + a * y) / w, decay = Math.exp(-a * seconds);
    return [target + decay * (y * c + b * sn), decay * (v * c - (a * b + w * y) * sn)];
  }
  const w = Math.sqrt(-d), r1 = -a + w, r2 = -a - w, c1 = (v - r2 * y) / (r1 - r2), c2 = y - c1;
  return [target + c1 * Math.exp(r1 * seconds) + c2 * Math.exp(r2 * seconds), r1 * c1 * Math.exp(r1 * seconds) + r2 * c2 * Math.exp(r2 * seconds)];
}

export function mount(host: HTMLElement, input: unknown = defaults, options: MountOptions = {}): Controller {
  let settings = resolveSettings(input), checked = settings.checked, dead = false, paused = false, visible = true;
  const doc = host.ownerDocument, win = doc.defaultView;
  host.innerHTML = render(settings);
  const root = host.querySelector<HTMLElement>('[data-gooey-switch]')!;
  const button = root.querySelector<HTMLButtonElement>('button')!;
  const thumb = root.querySelector<SVGCircleElement>('[data-gooey-thumb]')!;
  const drops = [...root.querySelectorAll<SVGCircleElement>('[data-gooey-drop]')];
  const solid = root.querySelector<SVGRectElement>('[data-gooey-solid]')!;
  let x = +checked, velocity = 0, liquid = Array(particles).fill(+checked) as number[], stretch = 0;
  let raf: number | null = null;
  const now = () => win?.performance.now() ?? Date.now();
  let animation: {start:number; x:number; velocity:number; liquid:number[]; target:number; delay:number; duration:number; damping:number; stretch:number} | null = null;
  let gesture: {id:number; startX:number; startY:number; startProgress:number; startLiquid:number[]; startChecked:boolean; dragged:boolean; lastX:number; lastTime:number} | null = null;
  let ignoreClick = false, lastInput: ChangeSource = 'pointer';
  const media = typeof win?.matchMedia === 'function' ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let reduced = media?.matches ?? true;
  const hasObserver = typeof win?.IntersectionObserver === 'function';
  const canAnimate = () => !dead && !paused && visible && !doc.hidden && !reduced && hasObserver && typeof win?.requestAnimationFrame === 'function';
  const stopFrame = () => { if (raf !== null) win?.cancelAnimationFrame(raf); raf = null; };
  function paint() {
    const renderedX = gesture && !canAnimate() ? +checked : clamp(x, -.06, 1.06);
    thumb.setAttribute('cx', String(94 + renderedX * 172));
    const sx = 1 + clamp(stretch, -settings.stretchAmount * .3, settings.stretchAmount), tx = 94 + renderedX * 172;
    thumb.setAttribute('transform', sx === 1 ? '' : `translate(${tx} 90) scale(${sx} ${1 - .65 * (sx - 1)}) translate(${-tx} -90)`);
    drops.forEach((drop, i) => {
      const progress = clamp(liquid[i]);
      drop.setAttribute('cx', String(94 + (cx(i) - 94) * progress));
      drop.setAttribute('r', String(42 + 68 * progress));
    });
    solid.setAttribute('opacity', liquid.every(v => v > .999) ? '1' : '0');
    root.dataset.gooeyMotion = animation || gesture?.dragged ? 'active' : 'rest';
  }
  function snap() {
    stopFrame(); animation = null; x = +checked; velocity = 0; liquid.fill(+checked); stretch = 0; paint();
  }
  function sample(time: number) {
    if (!animation) return;
    const a = animation, ratio = a.duration / 880, elapsed = Math.max(0, (time - a.start) / ratio);
    const travelTime = Math.max(0, elapsed - a.delay) / 1000;
    [x, velocity] = spring(a.x, a.velocity, a.target, travelTime, a.damping);
    x = clamp(x, -.06, 1.06);
    for (let i = 0; i < particles; i++) {
      const order = a.target ? i : particles - 1 - i;
      const t = clamp((elapsed - 18 - order * 9) / 620), eased = liquidEase(t);
      liquid[i] = a.liquid[i] + (a.target - a.liquid[i]) * eased;
    }
    // Velocity shapes the early elastic stretch and recoil.
    stretch = a.stretch * clamp(Math.abs(velocity) / 8.4);
    if (elapsed >= 881 && Math.abs(x - a.target) < .0001 && Math.abs(velocity) < .002 || elapsed >= 2600) {
      animation = null; x = a.target; velocity = 0; liquid.fill(a.target); stretch = 0;
    }
  }
  function frame(time: number) {
    raf = null;
    if (dead) return;
    if (!canAnimate()) { snap(); return; }
    sample(time); paint();
    if (animation) raf = win!.requestAnimationFrame(frame);
  }
  function retarget(immediate = false) {
    sample(now());
    if (immediate || !canAnimate()) { snap(); return; }
    const atRest = !animation && Math.abs(x - +checked) < .0001 && liquid.every(v => Math.abs(v - +checked) < .0001);
    if (atRest) { paint(); return; }
    animation = {start:now(), x, velocity, liquid:[...liquid], target:+checked, delay:gesture?.dragged || animation ? 0 : 65 - 57 * clamp(settings.stretchAmount / .135), duration:settings.motionDuration, damping:settings.springDamping, stretch:settings.stretchAmount};
    paint(); if (raf === null) raf = win!.requestAnimationFrame(frame);
  }
  function syncSettings() {
    root.setAttribute('style', variables(settings));
    button.setAttribute('aria-label', settings.accessibleName); button.setAttribute('aria-checked', String(checked));
    button.disabled = settings.disabled; button.dataset.gooeyInteraction = settings.interaction;
  }
  function commit(next: boolean, source: ChangeSource) {
    if (dead || settings.disabled) return;
    if (next === checked) { retarget(); return; }
    if (!options.controlled) { checked = next; settings.checked = next; button.setAttribute('aria-checked', String(next)); retarget(); }
    else retarget();
    const detail: ChangeDetail = {checked:next, source};
    options.onCheckedChange?.(next, detail);
    if (!dead) button.dispatchEvent(new CustomEvent<ChangeDetail>('gooey-switch-change', {bubbles:true, cancelable:false, detail}));
  }
  function releaseCapture(id: number) { try { if (button.hasPointerCapture?.(id)) button.releasePointerCapture(id); } catch { /* Pointer may already have been released by the UA. */ } }
  function cancelGesture(suppress = true) {
    if (!gesture) return;
    const old = gesture; gesture = null; ignoreClick = suppress; releaseCapture(old.id);
    checked = old.startChecked; settings.checked = checked; button.setAttribute('aria-checked', String(checked)); retarget();
  }
  function down(event: PointerEvent) {
    if (dead || settings.disabled || !event.isPrimary || event.button !== 0) return;
    lastInput = 'pointer'; ignoreClick = false;
    if (settings.interaction !== 'drag') return;
    sample(now());
    gesture = {id:event.pointerId,startX:event.clientX,startY:event.clientY,startProgress:x,startLiquid:[...liquid],startChecked:checked,dragged:false,lastX:event.clientX,lastTime:now()};
    try { button.setPointerCapture(event.pointerId); } catch { /* Window listeners preserve cancellation without capture support. */ }
  }
  function move(event: PointerEvent) {
    const g = gesture;
    if (!g || g.id !== event.pointerId || dead) return;
    let dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;
    if (!g.dragged && Math.abs(dy) > 4 && Math.abs(dy) > Math.abs(dx)) { cancelGesture(); return; }
    if (!g.dragged && Math.abs(dx) < 4) return;
    if (!g.dragged) {
      // A press is still a click until drag intent is established. Rebase against the
      // live material pose here, after any motion that continued while held.
      sample(now()); g.startProgress = x; g.startLiquid = [...liquid];
      const deadZone = Math.sign(dx) * 4;
      g.startX += deadZone; dx -= deadZone;
      g.lastX = event.clientX; g.lastTime = now();
    }
    g.dragged = true; event.preventDefault(); stopFrame(); animation = null;
    const travel = button.getBoundingClientRect().width * 172 / 360;
    const raw = g.startProgress + dx / Math.max(1, travel);
    x = raw < 0 ? Math.max(-.06, raw * settings.dragResistance) : raw > 1 ? Math.min(1.06, 1 + (raw - 1) * settings.dragResistance) : raw;
    const dt = now() - g.lastTime;
    velocity = dt > 0 ? clamp((event.clientX - g.lastX) / Math.max(1, travel) / (dt / 1000), -5, 5) : 0;
    g.lastX = event.clientX; g.lastTime = now();
    liquid = liquid.map((_, i) => clamp(g.startLiquid[i] + clamp(clamp(x) * 1.35 - i / particles * .35) - clamp(clamp(g.startProgress) * 1.35 - i / particles * .35)));
    stretch = settings.stretchAmount * clamp(Math.abs(velocity) / 3);
    if (!canAnimate()) { x = clamp(x); stretch = 0; liquid.fill(+checked); }
    paint();
  }
  function up(event: PointerEvent) {
    const g = gesture;
    if (!g || g.id !== event.pointerId) return;
    const dragged = g.dragged, next = clamp(x) >= .5;
    gesture = null; releaseCapture(g.id);
    if (dragged) { ignoreClick = true; commit(next, 'drag'); }
  }
  function cancel(event: PointerEvent) { if (gesture?.id === event.pointerId) cancelGesture(); }
  function click(event: MouseEvent) {
    if (ignoreClick && event.detail > 0) { ignoreClick = false; event.preventDefault(); return; }
    ignoreClick = false;
    if (gesture) cancelGesture(false);
    commit(!checked, event.detail === 0 ? 'keyboard' : lastInput);
  }
  function key(event: KeyboardEvent) {
    lastInput = 'keyboard'; ignoreClick = false;
    if (['ArrowRight','ArrowUp','ArrowLeft','ArrowDown'].includes(event.key)) {
      event.preventDefault(); cancelGesture(false); commit(event.key === 'ArrowRight' || event.key === 'ArrowUp','keyboard');
    }
    // Native button Enter/Space activation supplies exactly one click.
  }
  function suspend() { cancelGesture(); snap(); }
  function visibility() { if (doc.hidden) suspend(); }
  function mediaChange() { reduced = media?.matches ?? true; if (reduced) suspend(); }
  button.addEventListener('pointerdown', down); win?.addEventListener('pointermove', move, {passive:false});
  win?.addEventListener('pointerup', up); button.addEventListener('pointercancel', cancel); button.addEventListener('lostpointercapture', cancel);
  button.addEventListener('click', click); button.addEventListener('keydown', key);
  doc.addEventListener('visibilitychange', visibility);
  if (media?.addEventListener) media.addEventListener('change', mediaChange); else media?.addListener?.(mediaChange);
  const observer = hasObserver ? new win!.IntersectionObserver(entries => {
    visible = entries.some(e => e.isIntersecting); if (!visible) suspend();
  }) : null;
  observer?.observe(root);
  syncSettings(); snap();
  return {
    update(value: unknown) {
      if (dead) return;
      const patch = object(value), next = resolveSettings({...settings,...patch});
      if (!own(patch,'checked')) next.checked = checked;
      const structural = (['interaction','disabled','checked','width','motionDuration','springDamping','stretchAmount','dragResistance'] as const).some(k => next[k] !== settings[k]);
      if (!structural) { settings = next; syncSettings(); paint(); return; }
      const time = now(); sample(time); // OLD parameters are sampled before changing any setting.
      cancelGesture();
      if (own(patch,'checked')) checked = next.checked;
      next.checked = checked; settings = next; syncSettings();
      // Freeze the sampled pose before retarget: never evaluate old elapsed time under new parameters.
      if (animation) { animation = {...animation,start:time,x,velocity,liquid:[...liquid],delay:0,duration:settings.motionDuration,damping:settings.springDamping,stretch:settings.stretchAmount}; }
      retarget();
    },
    pause() { if (!dead) { paused = true; suspend(); } },
    resume() { if (!dead) { paused = false; if (!canAnimate()) snap(); } },
    destroy() {
      if (dead) return; dead = true; stopFrame(); animation = null;
      const g = gesture; gesture = null; if (g) releaseCapture(g.id);
      observer?.disconnect(); doc.removeEventListener('visibilitychange',visibility);
      if (media?.removeEventListener) media.removeEventListener('change',mediaChange); else media?.removeListener?.(mediaChange);
      button.removeEventListener('pointerdown',down); win?.removeEventListener('pointermove',move); win?.removeEventListener('pointerup',up);
      button.removeEventListener('pointercancel',cancel); button.removeEventListener('lostpointercapture',cancel); button.removeEventListener('click',click); button.removeEventListener('keydown',key);
      host.replaceChildren();
    }
  };
}
