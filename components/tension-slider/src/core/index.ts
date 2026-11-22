import manifest from '../../component.json';

export interface Settings {
  theme: 'dark' | 'light';
  value: number;
  label: string;
  hint: boolean;
  waveStrength: number;
  waveWidth: number;
  waveDamping: number;
  waveSpeed: number;
  flightDuration: number;
  accent: string;
  markerSize: number;
  tickThickness: number;
  helpText: string;
  panelWidth: number;
  headroom: number;
  bottomSpace: number;
  showValue: boolean;
  valueGap: number;
  valueSize: number;
  valueWeight: number;
  valueSuffix: string;
  showLabel: boolean;
  labelSize: number;
  hintWidth: number;
  hintSize: number;
  hintGap: number;
  hintAlign: 'left' | 'center' | 'right';
  tickCount: number;
  filledHeight: number;
  emptyHeight: number;
  emptyThickness: number;
  tickRadius: number;
  lightInk: string;
  darkInk: string;
  lightLine: string;
  darkLine: string;
  lightMuted: string;
  darkMuted: string;
  markerGap: number;
  markerRing: number;
  markerRadius: number;
  gripWidth: number;
  focusOffset: number;
  readoutResponse: number;
  markerSpring: number;
  markerDamping: number;
  scrubLift: number;
  scrubSwing: number;
  pullTravel: number;
  launchPower: number;
  arcHeight: number;
  pullLean: number;
  bandWidth: number;
  bandOpacity: number;
  arcWidth: number;
  arcOpacity: number;
  dashLength: number;
  dashGap: number;
  showPrediction: boolean;
  targetScale: number;
  trailLength: number;
  trailWidth: number;
  trailOpacity: number;
  bounceHeight: number;
  bounceTime: number;
  impactStrength: number;
  keyboardStep: number;
  pageStep: number;
}
export interface Controller {
  update(input: unknown): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}
export interface MountOptions {
  onValueChange?: (value: number) => void;
}

export const defaults = Object.freeze(
  Object.fromEntries(manifest.settings.map(setting => [setting.key, setting.default])),
) as unknown as Readonly<Settings>;

export function resolveSettings(input: unknown): Settings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Tension Slider settings must be an object');
  }
  const settings = { ...defaults, ...input };
  if (Object.keys(settings).some(key => !Object.hasOwn(defaults, key))) {
    throw new TypeError('Unknown Tension Slider setting');
  }
  for (const rule of manifest.settings) {
    const value = settings[rule.key as keyof Settings];
    let valid = false;
    switch (rule.kind) {
      case 'number': valid = typeof value === 'number' && Number.isFinite(value) && value >= rule.min! && value <= rule.max!; break;
      case 'boolean': valid = typeof value === 'boolean'; break;
      case 'text': valid = typeof value === 'string' && value.length <= rule.maxLength!; break;
      case 'color': valid = typeof value === 'string' && /^(?:transparent|#[a-f0-9]{6}(?:[a-f0-9]{2})?)$/i.test(value); break;
      case 'select': valid = rule.options!.some(option => option.value === value); break;
    }
    if (!valid) throw new TypeError('Invalid ' + rule.label);
  }
  for (const key of ['tickCount', 'keyboardStep', 'pageStep'] as const)
    if (!Number.isInteger(settings[key])) throw new TypeError('Expected a whole number for ' + key);
  return { ...settings, label: settings.label.trim() || defaults.label };
}

const railWidth = 583;
const clip = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
const lastBar = (value: number, count: number) => Math.max(0, Math.round(value * count / 100) - 1);
const spacing = (count: number) => (railWidth - 3) / (count - 1);
const markerY = (s: Settings) => 48 - s.filledHeight / 2 - s.markerGap - s.markerSize / 2;
const anchor = (value: number, s: Settings) => ({ x: 1.5 + spacing(s.tickCount) * lastBar(value, s.tickCount), y: markerY(s) });
const text = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
let serial = 0;
const prefix = Math.random().toString(36).slice(2);
const nextId = () => `${prefix}-${++serial}`;

function renderBars(count: number, value: number) {
  const filled = lastBar(value, count);
  return Array.from({ length: count }, (_, i) =>
    `<span data-mark="${i}" data-filled="${i <= filled}" style="--index:${i}"></span>`).join('');
}

function surface(s: Settings) {
  const dark = s.theme === 'dark';
  // All dimensions in the animated rail share one coordinate system, including the landing guides.
  const readoutWidth = Math.max(67, s.valueSize * (67 / 44));
  return {
    '--ts-wide': s.panelWidth + 'px',
    '--ts-base': railWidth + (s.showValue ? s.valueGap + readoutWidth : 0),
    '--ts-ink': dark ? s.darkInk : s.lightInk,
    '--ts-line': dark ? s.darkLine : s.lightLine,
    '--ts-muted': dark ? s.darkMuted : s.lightMuted,
    '--ts-signal': s.accent,
    '--ts-headroom': s.headroom,
    '--ts-bottom': s.bottomSpace,
    '--ts-spacing': spacing(s.tickCount),
    '--ts-marker-size': s.markerSize,
    '--ts-marker-y': markerY(s),
    '--ts-marker-radius': s.markerRadius + '%',
    '--ts-marker-ring': s.markerRing,
    '--ts-focus-offset': s.focusOffset + 'px',
    '--ts-grip-width': s.gripWidth,
    '--ts-tick-width': s.tickThickness,
    '--ts-empty-width': s.tickThickness / 3 * s.emptyThickness / 100,
    '--ts-filled-height': s.filledHeight,
    '--ts-empty-height': s.emptyHeight,
    '--ts-tick-radius': s.tickRadius,
    '--ts-value-gap': s.valueGap,
    '--ts-value-width': readoutWidth,
    '--ts-value-size': s.valueSize,
    '--ts-value-weight': s.valueWeight,
    '--ts-label-size': s.labelSize + 'px',
    '--ts-hint-width': s.hintWidth + 'px',
    '--ts-hint-size': s.hintSize + 'px',
    '--ts-hint-align': s.hintAlign,
    '--ts-hint-gap': s.hintGap + 'px',
    '--ts-band-width': s.bandWidth,
    '--ts-band-opacity': s.bandOpacity / 100,
    '--ts-arc-width': s.arcWidth,
    '--ts-arc-opacity': s.arcOpacity / 100,
    '--ts-dash': s.dashLength + ' ' + s.dashGap,
    '--ts-target-size': s.markerSize * s.targetScale / 100,
    '--ts-trail-width': s.trailWidth,
    '--ts-trail-opacity': s.trailOpacity / 100,
  };
}

export function render(input: unknown = defaults, id = nextId()): string {
  const s = resolveSettings(input);
  const value = Math.round(s.value);
  const key = 'tension-' + Array.from(id, c => c.codePointAt(0)!.toString(16)).join('-');
  const bars = renderBars(s.tickCount, value);
  const style = Object.entries(surface(s)).map(([key, value]) => key + ':' + value).join(';');
  return `<div class="tension-slider" data-tension-slider data-theme="${s.theme}" data-phase="idle" style="${style}">
    <label class="${s.showLabel ? 'tension-slider__label' : 'tension-slider__sr'}" for="${key}">${text(s.label)}</label>
    <input id="${key}" type="range" min="0" max="100" step="1" value="${value}" ${s.valueSuffix ? `aria-valuetext="${value} ${text(s.valueSuffix)}"` : ''} class="tension-slider__sr" ${s.hint && s.helpText.trim() ? `aria-describedby="${key}-hint"` : ''} disabled>
    <div class="tension-slider__fit">
      <div class="tension-slider__rail" style="--ball-x:${anchor(value, s).x};--ball-y:${markerY(s)}" aria-hidden="true">
        <div class="tension-slider__bars" data-scrub>${bars}</div>
        <svg class="tension-slider__paths" viewBox="0 0 583 96" fill="none" aria-hidden="true">
          <path data-band></path><path data-arc></path><path data-trail></path>
        </svg>
        <div class="tension-slider__ghost" data-landing><span data-prediction ${s.showPrediction ? '' : 'hidden'}></span></div>
        <div class="tension-slider__grip" data-pull><span class="tension-slider__ball" data-ball></span></div>
      </div>
      <output aria-hidden="true" data-value data-unit="${text(s.valueSuffix)}" ${s.showValue ? '' : 'hidden'}>${value}</output>
    </div>
    <p class="tension-slider__hint" id="${key}-hint" ${s.hint && s.helpText.trim() ? '' : 'hidden'}>${text(s.helpText)}</p>
  </div>`;
}

type Point = { x: number; y: number };
type Gesture = { id: number; origin: Point; value: number; mode: 'scrub' | 'aim' };
type Shot = { from: Point; to: Point; rise: number; target: number };

function projectedShot(gesture: Gesture, point: Point, s: Settings): Shot {
  const dx = point.x - gesture.origin.x;
  const dy = point.y - gesture.origin.y;
  const start = anchor(gesture.value, s);
  // The elastic has finite travel. Both the held marker and the impulse saturate.
  const length = Math.hypot(dx, dy);
  const resistance = length ? -s.pullTravel * Math.expm1(-length / s.pullTravel) / length : 1;
  const pull = dx * resistance;
  const angle = clip(pull / 180, -.52, .52);
  const from = { x: start.x + pull + 38 * Math.sin(angle), y: start.y + dy * resistance + 38 * (1 - Math.cos(angle)) };
  const target = length < 10 || Math.abs(pull) < 2 ? gesture.value : clip(Math.round(gesture.value - pull * s.launchPower * 5 / 5.8), 0, 100);
  const to = anchor(target, s);
  const peak = Math.min(from.y, to.y) - s.arcHeight * Math.max(0, Math.min(Math.min(from.y, to.y) + 100, 46 + Math.abs(to.x - start.x) * .28 + Math.max(0, dy * resistance) * .9));
  const rise = (Math.sqrt(from.y - peak) + Math.sqrt(to.y - peak)) ** 2 / 4;
  return { from, to, target, rise };
}

function flightPoint(shot: Shot, t: number): Point {
  return {
    x: shot.from.x + (shot.to.x - shot.from.x) * t,
    y: shot.from.y + (shot.to.y - shot.from.y) * t - 4 * shot.rise * t * (1 - t),
  };
}

// Each graduation is a damped, coupled oscillator. The moving contact adds velocity
// locally; neighboring bars carry the disturbance even after the pointer has stopped.
function createBarWave(
  bars: HTMLElement[],
  view: Window,
  read: () => Settings,
  enabled: () => boolean,
) {
  const offsets = new Float64Array(bars.length);
  const speeds = new Float64Array(bars.length);
  const previous = new Float64Array(bars.length);
  let contact = 0;
  let target = 0;
  let frame = 0;
  let lastTime = 0;
  let resting = true;

  function kick(at: number, amount: number) {
    const { waveWidth, waveStrength } = read();
    const radius = Math.ceil(waveWidth * 2.5);
    const low = Math.max(0, Math.floor(at) - radius);
    const high = Math.min(bars.length - 1, Math.ceil(at) + radius);
    for (let i = low; i <= high; i++) {
      const distance = (i - at) / waveWidth;
      speeds[i] += waveStrength * amount * Math.exp(-distance * distance / 2);
    }
  }

  function stop() {
    if (frame) view.cancelAnimationFrame(frame);
    frame = 0;
    resting = true;
    offsets.fill(0);
    speeds.fill(0);
    previous.fill(0);
    for (const bar of bars) {
      bar.style.removeProperty('--wake');
    }
  }

  function step(dt: number) {
    const { waveSpeed, waveDamping } = read();
    const shift = (target - contact) * (1 - Math.exp(-dt / .035));
    contact += shift;
    if (Math.abs(shift) > .005) kick(contact, Math.min(1.1, Math.abs(shift)) * 42);
    const coupling = (waveSpeed * .46) ** 2;
    for (let i = 0; i < bars.length; i++) {
      const here = offsets[i];
      const left = offsets[Math.max(0, i - 1)];
      const right = offsets[Math.min(bars.length - 1, i + 1)];
      speeds[i] += (coupling * (left + right - 2 * here) - 255 * here - waveDamping * 1.65 * speeds[i]) * dt;
    }
    for (let i = 0; i < bars.length; i++) offsets[i] += speeds[i] * dt;
  }

  function paint(now: number) {
    frame = 0;
    if (!enabled() || !read().waveStrength) return stop();
    const elapsed = clip((now - lastTime) / 1000, 0, .05);
    lastTime = now;
    // Small substeps keep maximum coupling stable at 30 Hz and after a missed frame.
    const steps = Math.max(1, Math.ceil(elapsed * 180));
    for (let n = 0; n < steps; n++) step(elapsed / steps);
    let moving = Math.abs(target - contact) > .02;
    for (let i = 0; i < bars.length; i++) {
      const height = 32 * Math.tanh(offsets[i] / 32);
      if (Math.abs(height) > .05 || Math.abs(speeds[i]) > .7) moving = true;
      if (Math.abs(previous[i] - height) < .025) continue;
      previous[i] = height;
      bars[i].style.setProperty('--wake', (1 + height / 32).toFixed(3));
    }
    if (moving) frame = view.requestAnimationFrame(paint);
    else stop();
  }

  function drive(x: number, impact = 0) {
    if (!enabled() || !read().waveStrength) return;
    target = clip((x - 1.5) / spacing(bars.length), 0, bars.length - 1);
    if (resting) { contact = target; resting = false; }
    if (impact) kick(target, impact);
    if (!frame) {
      lastTime = view.performance.now();
      frame = view.requestAnimationFrame(paint);
    }
  }
  // A filled tick has a 24px half-height. Its painted scale uses a 32px wave unit.
  return { drive, stop, heightAt: (index: number) => previous[index] * (read().filledHeight / 64) };
}

export function mount(host: HTMLElement, input: unknown = defaults, id = nextId(), options: MountOptions = {}): Controller {
  let settings = resolveSettings(input);
  settings.value = Math.round(settings.value);
  host.innerHTML = render(settings, id);
  const root = host.querySelector<HTMLElement>('[data-tension-slider]')!;
  const get = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const range = get<HTMLInputElement>('input');
  const rail = get('.tension-slider__rail');
  const display = get<HTMLOutputElement>('output');
  const scanMarks = () => Array.from(root.querySelectorAll<HTMLElement>('[data-mark]'));
  let marks = scanMarks();
  const ghost = get('[data-landing]');
  const prediction = get('[data-prediction]');
  const band = get<SVGPathElement>('[data-band]');
  const arc = get<SVGPathElement>('[data-arc]');
  const trail = get<SVGPathElement>('[data-trail]');
  const view = host.ownerDocument.defaultView!;
  const events = new view.AbortController();
  const listener = { signal: events.signal };
  const motion = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  let gesture: Gesture | null = null;
  let frame = 0;
  let paused = false;
  let offscreen = false;
  let destroyed = false;
  const makeWave = () => createBarWave(marks, view, () => settings, () => !paused && !destroyed && !offscreen && !motion?.matches);
  let wave = makeWave();

  function put(point: Point) {
    rail.style.setProperty('--ball-x', String(point.x));
    rail.style.setProperty('--ball-y', String(point.y));
  }

  function paintReading(value: number) {
    display.value = String(value);
    const boundary = lastBar(value, settings.tickCount);
    marks.forEach((mark, i) => { mark.dataset.filled = String(i <= boundary); });
  }

  function setValue(value: number, notify = false) {
    value = clip(Math.round(value), 0, 100);
    const changed = settings.value !== value;
    settings.value = value;
    range.value = String(value);
    if (settings.valueSuffix) range.setAttribute('aria-valuetext', value + ' ' + settings.valueSuffix);
    else range.removeAttribute('aria-valuetext');
    paintReading(value);
    if (notify && changed) {
      root.dispatchEvent(new view.CustomEvent('tension-slider-change', { bubbles: true, detail: { value } }));
      options.onValueChange?.(value);
    }
  }

  function rest(quiet = true) {
    if (frame) view.cancelAnimationFrame(frame);
    frame = 0;
    root.dataset.phase = 'idle';
    root.removeAttribute('data-stretched');
    marks.forEach(mark => mark.style.removeProperty('--lean'));
    [arc, band, trail].forEach(path => path.removeAttribute('d'));
    if (quiet) wave.stop();
    put(anchor(settings.value, settings));
    paintReading(settings.value);
    ghost.style.setProperty('--target-x', String(anchor(settings.value, settings).x));
  }

  function releaseCapture() {
    const held = gesture;
    gesture = null;
    if (held && rail.hasPointerCapture?.(held.id)) rail.releasePointerCapture(held.id);
    return held;
  }

  function cancelGesture() {
    const held = releaseCapture();
    if (held) setValue(held.value, true);
    rest();
  }

  function local(event: PointerEvent): Point {
    const box = rail.getBoundingClientRect();
    const scale = box.width / railWidth || 1;
    return { x: (event.clientX - box.left) / scale, y: (event.clientY - box.top) / scale };
  }

  let shown = settings.value;
  let readingSpeed = 0;
  let marker = anchor(shown, settings);
  let speed = { x: 0, y: 0 };
  let scrubTime = 0;
  function easeScrub(now: number) {
    const elapsed = clip((now - scrubTime) / 1000, 0, .064);
    scrubTime = now;
    const steps = Math.max(1, Math.ceil(elapsed * 240));
    const dt = elapsed / steps;
    for (let i = 0; i < steps; i++) {
      readingSpeed += ((settings.value - shown) * 980 * settings.readoutResponse ** 2 - readingSpeed * 60 * settings.readoutResponse) * dt;
      shown += readingSpeed * dt;

      // The dot rides the moving crest. Its momentum carries through a reversal.
      const seat = anchor(shown, settings);
      const tilt = clip(readingSpeed * .0011, -.27, .27) * settings.scrubSwing / 100;
      // When the head brakes or doubles back, the moving dot briefly unloads.
      const braking = Math.max(0, Math.sign(speed.x) * (speed.x - readingSpeed * railWidth / 100));
      const lift = wave.heightAt(lastBar(shown, settings.tickCount)) + Math.min(6.1, Math.abs(speed.x) * .0027 + braking * .0015) * settings.scrubLift / 100;
      seat.x += 38 * Math.sin(tilt);
      seat.y += 38 * (1 - Math.cos(tilt)) - lift;
      speed.x += ((seat.x - marker.x) * 660 * settings.markerSpring - speed.x * 26 * settings.markerDamping) * dt;
      speed.y += ((seat.y - marker.y) * 540 * settings.markerSpring - speed.y * 13 * settings.markerDamping) * dt;
      marker.x += speed.x * dt;
      marker.y += speed.y * dt;
    }
    paintReading(Math.round(shown));
    put(marker);
    const end = anchor(settings.value, settings);
    if (Math.abs(settings.value - shown) < .012 && Math.abs(readingSpeed) < .1 &&
        Math.hypot(marker.x - end.x, marker.y - end.y) < .08 &&
        Math.hypot(speed.x, speed.y) < .8 && Math.abs(wave.heightAt(lastBar(shown, settings.tickCount))) < .08) {
      frame = 0;
      paintReading(settings.value);
      put(end);
    } else frame = view.requestAnimationFrame(easeScrub);
  }

  function scrub(point: Point, impact = 0) {
    wave.drive(point.x, impact);
    if (impact) {
      shown = settings.value;
      marker = anchor(shown, settings);
      readingSpeed = 0;
      speed = { x: 0, y: 0 };
    }
    setValue(100 * point.x / railWidth, true);
    if (motion?.matches) {
      shown = settings.value;
      marker = anchor(shown, settings);
      readingSpeed = speed.x = speed.y = 0;
      put(marker);
      return;
    }
    paintReading(Math.round(shown));
    if (!frame) {
      scrubTime = view.performance.now();
      frame = view.requestAnimationFrame(easeScrub);
    }
  }

  function aim(held: Gesture, point: Point) {
    const shot = projectedShot(held, point, settings);
    const start = anchor(held.value, settings);
    put(shot.from);
    ghost.style.setProperty('--target-x', String(shot.to.x));
    prediction.textContent = display.value = String(shot.target);
    root.toggleAttribute('data-stretched', shot.target !== held.value);
    const lean = clip((shot.from.x - start.x) * .27 * settings.pullLean, -30 * settings.pullLean, 30 * settings.pullLean);
    marks[lastBar(held.value, settings.tickCount)].style.setProperty('--lean', String(lean));
    band.setAttribute('d', `M${start.x + settings.filledHeight / 2 * Math.sin(lean * Math.PI / 180)} ${48 - settings.filledHeight / 2 * Math.cos(lean * Math.PI / 180)} L${shot.from.x} ${shot.from.y}`);
    const cx = (shot.from.x + shot.to.x) / 2;
    const cy = (shot.from.y + shot.to.y) / 2 - 2 * shot.rise;
    arc.setAttribute('d', `M${shot.from.x} ${shot.from.y} Q${cx} ${cy} ${shot.to.x} ${shot.to.y}`);
    return shot;
  }

  function launch(shot: Shot, fromValue: number) {
    setValue(shot.target, true);
    if (motion?.matches || offscreen || paused || destroyed) return rest();
    const duration = settings.flightDuration * Math.sqrt(shot.rise / 117);
    marks[lastBar(fromValue, settings.tickCount)].style.removeProperty('--lean');
    wave.drive(anchor(fromValue, settings).x, 65);
    paintReading(fromValue);
    const start = view.performance.now();
    root.dataset.phase = 'flight';
    function tick(now: number) {
      const elapsed = Math.max(0, now - start);
      const t = Math.min(1, elapsed / duration);
      const point = flightPoint(shot, t);
      paintReading(Math.round(fromValue + (shot.target - fromValue) * t));
      if (t < 1) {
        wave.drive(anchor(fromValue + (shot.target - fromValue) * t, settings).x);
        const tail = flightPoint(shot, Math.max(0, t - settings.trailLength / 100));
        const mid = flightPoint(shot, (t + Math.max(0, t - settings.trailLength / 100)) / 2);
        trail.setAttribute('d', `M${tail.x} ${tail.y} Q${2 * mid.x - (point.x + tail.x) / 2} ${2 * mid.y - (point.y + tail.y) / 2} ${point.x} ${point.y}`);
      } else {
        if (root.dataset.phase !== 'settle') wave.drive(shot.to.x, -210 * settings.impactStrength / 100);
        root.dataset.phase = 'settle';
        const age = elapsed - duration;
        const hop = Math.sqrt(shot.rise / 117) * settings.bounceTime;
        if (!settings.bounceHeight || age >= hop * 1.38) return rest(false);
        const second = age >= hop;
        const progress = second ? (age - hop) / (hop * .38) : age / hop;
        point.y -= settings.bounceHeight / 100 * shot.rise * (second ? .017 : .125) * 4 * progress * (1 - progress);

      }
      put(point);
      frame = view.requestAnimationFrame(tick);
    }
    frame = view.requestAnimationFrame(tick);
  }

  rail.addEventListener('pointerdown', event => {
    if (paused || gesture || event.button !== 0 || event.isPrimary === false) return;
    const mode = (event.target as Element).closest('[data-pull]') ? 'aim' : 'scrub';
    if (mode === 'scrub' && !(event.target as Element).closest('[data-scrub]')) return;
    event.preventDefault();
    rest();
    root.setAttribute('data-pointer-focus', '');
    range.focus({ preventScroll: true });
    gesture = { id: event.pointerId, value: settings.value, origin: local(event), mode };
    rail.setPointerCapture?.(event.pointerId);
    root.dataset.phase = mode;
    if (mode === 'aim') aim(gesture, gesture.origin);
    else scrub(gesture.origin, 290);
  }, listener);
  rail.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    if (gesture.mode === 'aim') aim(gesture, local(event));
    else scrub(local(event));
  }, listener);
  rail.addEventListener('pointerup', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const held = releaseCapture()!;
    if (held.mode === 'scrub') {
      scrub(local(event));
      root.dataset.phase = 'idle';
    } else {
      const shot = aim(held, local(event));
      if (shot.target === held.value) rest();
      else launch(shot, held.value);
    }
  }, listener);
  for (const type of ['pointercancel', 'lostpointercapture'] as const) {
    rail.addEventListener(type, event => { if (gesture?.id === event.pointerId) cancelGesture(); }, listener);
  }
  range.addEventListener('blur', () => root.removeAttribute('data-pointer-focus'), listener);
  range.addEventListener('keydown', event => {
    root.removeAttribute('data-pointer-focus');
    if (paused) return;
    if (event.key === 'Escape') { cancelGesture(); return; }
    const values: Record<string, number> = {
      ArrowLeft: settings.value - settings.keyboardStep, ArrowDown: settings.value - settings.keyboardStep,
      ArrowRight: settings.value + settings.keyboardStep, ArrowUp: settings.value + settings.keyboardStep,
      PageDown: settings.value - settings.pageStep, PageUp: settings.value + settings.pageStep, Home: 0, End: 100,
    };
    if (!Object.hasOwn(values, event.key)) return;
    event.preventDefault();
    releaseCapture();
    setValue(values[event.key], true);
    rest();
  }, listener);
  range.addEventListener('input', () => {
    if (paused) return;
    setValue(Number(range.value), true);
    rest();
  }, listener);
  range.disabled = false;
  const observer = view.IntersectionObserver && new view.IntersectionObserver(([entry]) => {
    offscreen = !entry.isIntersecting;
    if (offscreen) cancelGesture();
  });
  observer?.observe(root);
  let width = rail.getBoundingClientRect().width;
  const resize = view.ResizeObserver && new view.ResizeObserver(() => {
    const next = rail.getBoundingClientRect().width;
    if (width !== next) cancelGesture();
    width = next;
  });
  resize?.observe(rail);
  motion?.addEventListener('change', () => { if (motion.matches) rest(); }, listener);

  return {
    update(input) {
      if (destroyed) return;
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Expected settings object');
      const next = resolveSettings({ ...settings, ...input });
      const densityChanged = next.tickCount !== settings.tickCount;
      const geometryChanged = densityChanged || next.filledHeight !== settings.filledHeight ||
        markerY(next) !== markerY(settings) || next.panelWidth !== settings.panelWidth ||
        next.headroom !== settings.headroom || next.showValue !== settings.showValue ||
        next.valueSize !== settings.valueSize || next.valueGap !== settings.valueGap;
      const valueChanged = Math.round(next.value) !== settings.value;
      if (geometryChanged || valueChanged) {
        releaseCapture();
        rest();
      }
      settings = { ...next, value: Math.round(next.value) };
      if (densityChanged) {
        get('[data-scrub]').innerHTML = renderBars(settings.tickCount, settings.value);
        marks = scanMarks();
        wave = makeWave();
      }
      root.dataset.theme = next.theme;
      Object.entries(surface(next)).forEach(([key, value]) => root.style.setProperty(key, String(value)));
      if (!next.waveStrength) wave.stop();
      const label = get('label');
      label.textContent = next.label;
      label.className = next.showLabel ? 'tension-slider__label' : 'tension-slider__sr';
      display.hidden = !next.showValue;
      display.dataset.unit = next.valueSuffix;
      prediction.hidden = !next.showPrediction;
      if (next.valueSuffix) range.setAttribute('aria-valuetext', settings.value + ' ' + next.valueSuffix);
      else range.removeAttribute('aria-valuetext');
      const help = get('.tension-slider__hint');
      help.textContent = next.helpText;
      help.hidden = !next.hint || !next.helpText.trim();
      if (help.hidden) range.removeAttribute('aria-describedby');
      else range.setAttribute('aria-describedby', help.id);
      if (geometryChanged || valueChanged) {
        setValue(settings.value);
        rest();
      }
    },
    pause() { if (!destroyed) { paused = range.disabled = true; cancelGesture(); } },
    resume() { if (!destroyed) paused = range.disabled = false; },
    destroy() {
      if (destroyed) return;
      destroyed = range.disabled = true;
      releaseCapture();
      rest();
      events.abort();
      observer?.disconnect();
      resize?.disconnect();
    },
  };
}
