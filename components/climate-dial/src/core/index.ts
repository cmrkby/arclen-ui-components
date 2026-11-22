import manifest from '../../component.json';

export type Season = 'Winter' | 'Spring' | 'Summer' | 'Autumn';

export interface Settings {
  faceRadius: number;
  rimWidth: number;
  lightTop: string;
  lightMid: string;
  lightBase: string;
  darkTop: string;
  darkMid: string;
  darkBase: string;
  lightInk: string;
  darkInk: string;
  tickWidth: number;
  inactiveAlpha: number;
  needleAlpha: number;
  idlePeriod: number;
  idleStrength: number;
  readingSize: number;
  readingTop: number;
  readingWeight: number;
  readingStretch: number;
  digitColor: string;
  degreeSize: number;
  degreeAlpha: number;
  digitTravel: number;
  digitDuration: number;
  seasonSize: number;
  seasonTop: number;
  seasonWeight: number;
  seasonTracking: number;
  letterIn: number;
  letterStagger: number;
  bloomHeight: number;
  bloomBottom: number;
  bloomBlur: number;
  haloBlur: number;
  entranceHold: number;
  entranceLift: number;
  entranceScale: number;
  entranceBlur: number;
  keyboardStep: number;
  shiftStep: number;
  wheelEnabled: boolean;
  hintText: string;
  hintSize: number;
  hintGap: number;
  size: number;
  glow: number;
  pulse: boolean;
  pulsePeriod: number;
  pulseDepth: number;
  bloomWidth: number;
  showSeason: boolean;
  coldAccent: string;
  warmAccent: string;
  spring: number;
  speed: number;
  entrance: boolean;
  theme: 'dark' | 'light';
  value: number;
  hint: boolean;
}

export interface MountOptions {
  paused?: boolean;
  onValueChange?: (value: number, season: Season) => void;
}

export interface Controller {
  update(settings: Partial<Settings>): void;
  pause(): void;
  resume(): void;
  replay(): void;
  destroy(): void;
}

export const defaults = Object.fromEntries(
  manifest.settings.map(({ key, default: value }) => [key, value]),
) as unknown as Settings;

const minimum = -9;
const maximum = 70;
const sweep = 230;
const firstAngle = -sweep / 2;
const tickCount = 96;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const progressOf = (value: number) => (value - minimum) / (maximum - minimum);
const degrees = (progress: number) => firstAngle + sweep * progress;

function seasonOf(value: number): Season {
  if (value < 5) return 'Winter';
  if (value < 16) return 'Autumn';
  if (value < 26) return 'Spring';
  return 'Summer';
}

function valueLabel(value: number) {
  return `${value} degrees Celsius, ${seasonOf(value)}`;
}

function bounded(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? clamp(value, min, max)
    : fallback;
}
function color(value: unknown, fallback: string) {
  return typeof value === 'string' && /^#[a-f0-9]{6}$/i.test(value)
    ? value
    : fallback;
}
export function resolveSettings(input: unknown = {}): Settings {
  const raw =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Partial<Settings>)
      : {};
  return {
    faceRadius: bounded(raw.faceRadius, defaults.faceRadius, 0, 50),
    rimWidth: bounded(raw.rimWidth, defaults.rimWidth, 0, 4),
    lightTop: color(raw.lightTop, defaults.lightTop),
    lightMid: color(raw.lightMid, defaults.lightMid),
    lightBase: color(raw.lightBase, defaults.lightBase),
    darkTop: color(raw.darkTop, defaults.darkTop),
    darkMid: color(raw.darkMid, defaults.darkMid),
    darkBase: color(raw.darkBase, defaults.darkBase),
    lightInk: color(raw.lightInk, defaults.lightInk),
    darkInk: color(raw.darkInk, defaults.darkInk),
    tickWidth: bounded(raw.tickWidth, defaults.tickWidth, 0.5, 4),
    inactiveAlpha: bounded(raw.inactiveAlpha, defaults.inactiveAlpha, 0, 100),
    needleAlpha: bounded(raw.needleAlpha, defaults.needleAlpha, 0, 100),
    idlePeriod: bounded(raw.idlePeriod, defaults.idlePeriod, 0.5, 6),
    idleStrength: bounded(raw.idleStrength, defaults.idleStrength, 0, 3),
    readingSize: bounded(raw.readingSize, defaults.readingSize, 28, 55),
    readingTop: bounded(raw.readingTop, defaults.readingTop, 32, 58),
    readingWeight: bounded(raw.readingWeight, defaults.readingWeight, 200, 850),
    readingStretch: bounded(raw.readingStretch, defaults.readingStretch, 0.7, 1.2),
    digitColor: color(raw.digitColor, defaults.digitColor),
    degreeSize: bounded(raw.degreeSize, defaults.degreeSize, 1.5, 5),
    degreeAlpha: bounded(raw.degreeAlpha, defaults.degreeAlpha, 0, 100),
    digitTravel: bounded(raw.digitTravel, defaults.digitTravel, 0, 45),
    digitDuration: bounded(raw.digitDuration, defaults.digitDuration, 50, 700),
    seasonSize: bounded(raw.seasonSize, defaults.seasonSize, 5, 14),
    seasonTop: bounded(raw.seasonTop, defaults.seasonTop, 7, 26),
    seasonWeight: bounded(raw.seasonWeight, defaults.seasonWeight, 300, 900),
    seasonTracking: bounded(raw.seasonTracking, defaults.seasonTracking, -0.03, 0.3),
    letterIn: bounded(raw.letterIn, defaults.letterIn, 100, 900),
    letterStagger: bounded(raw.letterStagger, defaults.letterStagger, 0, 80),
    bloomHeight: bounded(raw.bloomHeight, defaults.bloomHeight, 5, 40),
    bloomBottom: bounded(raw.bloomBottom, defaults.bloomBottom, -22, 12),
    bloomBlur: bounded(raw.bloomBlur, defaults.bloomBlur, 1, 16),
    haloBlur: bounded(raw.haloBlur, defaults.haloBlur, 1, 18),
    entranceHold: bounded(raw.entranceHold, defaults.entranceHold, 0, 1000),
    entranceLift: bounded(raw.entranceLift, defaults.entranceLift, 0, 80),
    entranceScale: bounded(raw.entranceScale, defaults.entranceScale, 0.65, 1),
    entranceBlur: bounded(raw.entranceBlur, defaults.entranceBlur, 0, 32),
    keyboardStep: Math.round(bounded(raw.keyboardStep, defaults.keyboardStep, 1, 10)),
    shiftStep: Math.round(bounded(raw.shiftStep, defaults.shiftStep, 1, 25)),
    wheelEnabled: typeof raw.wheelEnabled === 'boolean' ? raw.wheelEnabled : defaults.wheelEnabled,
    hintText: typeof raw.hintText === 'string' ? raw.hintText.trim().slice(0, 100) : defaults.hintText,
    hintSize: bounded(raw.hintSize, defaults.hintSize, 9, 20),
    hintGap: bounded(raw.hintGap, defaults.hintGap, 0, 110),
    size: bounded(raw.size, defaults.size, 240, 460),
    glow: bounded(raw.glow, defaults.glow, 0, 2),
    pulse: typeof raw.pulse === 'boolean' ? raw.pulse : defaults.pulse,
    pulsePeriod: bounded(raw.pulsePeriod, defaults.pulsePeriod, 1.2, 8),
    pulseDepth: bounded(raw.pulseDepth, defaults.pulseDepth, 0, 85),
    bloomWidth: bounded(raw.bloomWidth, defaults.bloomWidth, 45, 120),
    showSeason: typeof raw.showSeason === 'boolean' ? raw.showSeason : defaults.showSeason,
    coldAccent: color(raw.coldAccent, defaults.coldAccent),
    warmAccent: color(raw.warmAccent, defaults.warmAccent),
    spring: bounded(raw.spring, defaults.spring, 0, 1),
    speed: bounded(raw.speed, defaults.speed, 0.4, 2),
    entrance:
      typeof raw.entrance === 'boolean' ? raw.entrance : defaults.entrance,
    theme:
      raw.theme === 'dark' || raw.theme === 'light'
        ? raw.theme
        : defaults.theme,
    value:
      typeof raw.value === 'number' && Number.isFinite(raw.value)
        ? Math.round(clamp(raw.value, minimum, maximum)) || 0
        : defaults.value,
    hint: typeof raw.hint === 'boolean' ? raw.hint : defaults.hint,
  };
}

function channels(hex: string) {
  return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
}
const temperatureStops = [-9, 8, 22, 38, 70];
const heatBands = [
  ['#1d4ed8', '#0e7490', '#c2410c', '#e01e0b', '#b3071f'],
  ['#3b82f6', '#22d3ee', '#f59e0b', '#ff6410', '#ff3d1a'],
  ['#bfdbfe', '#a5f3fc', '#fde68a', '#ffc24a', '#ffb347'],
];

function palette(s: Settings) {
  function offset(accent: string, base: string) {
    const original = channels(base);
    return channels(accent).map((v, i) => v - original[i]);
  }
  const cold = offset(s.coldAccent, defaults.coldAccent);
  const warm = offset(s.warmAccent, defaults.warmAccent);
  return heatBands.map((band) =>
    band.map((hex, stop) => {
      const weight = progressOf(temperatureStops[stop]);
      return channels(hex).map((v, i) =>
        clamp(v + cold[i] * (1 - weight) + warm[i] * weight, 0, 255),
      );
    }),
  );
}

function paint(value: number, bands: ReturnType<typeof palette>, glow: number) {
  const bounded = clamp(value, minimum, maximum);
  const t = progressOf(bounded);
  const hi = Math.max(1, temperatureStops.findIndex((v) => v >= bounded));
  const lo = hi - 1;
  const span = temperatureStops[hi] - temperatureStops[lo];
  const fraction = (bounded - temperatureStops[lo]) / span;
  // Motion blends the squared RGB channels before converting back to display RGB.
  const [deep, mid, tip] = bands.map((band) => {
    const rgb = band[lo].map((v, i) => {
      const energy = v ** 2 * (1 - fraction) + band[hi][i] ** 2 * fraction;
      return Math.round(Math.sqrt(energy));
    });
    return rgb.join(' ');
  });
  const rimTip = glow >= 1
    ? 'var(--cd-tip)'
    : `color-mix(in srgb, var(--cd-tip) ${glow * 100}%, transparent)`;
  return `--cd-rim-tip:${rimTip};--cd-progress:${t};--cd-deep:rgb(${deep});--cd-rgb:${mid};--cd-tip:rgb(${tip});--cd-glow:${glow};--cd-angle:${degrees(progressOf(value))}deg;--cd-halo-alpha:${(0.2 + 0.4 * t) * glow};--cd-bloom-alpha:${(0.4 + 0.55 * t) * glow};--cd-rise:${0.62 + 0.43 * t};`;
}

// Keep the engraved indices fixed while the sweep advances across them.
function engravedScale(value: number) {
  const activeIndex = Math.floor((progressOf(value) + 0.001) * (tickCount - 1));
  return Array.from({ length: tickCount }, (_, i) => {
    const angle = degrees(i / (tickCount - 1));
    const stagger = Math.abs(i - (tickCount - 1) / 2) * 6;
    return `<g transform="rotate(${angle.toFixed(4)} 220 322)" style="--cd-stagger:${stagger}ms;--cd-wave-offset:${(i * 0.5).toFixed(2)}rad"><line style="--cd-position:${i / (tickCount - 1)};--cd-edge:${1 - (angle / 120) ** 4}" class="${i <= activeIndex ? 'cd-passed' : ''}" x1="220" x2="220" y1="156" y2="147" /></g>`;
  }).join('');
}

function shellStyle(s: Settings) {
  return [
    `--cd-size:${s.size}px`,
    `--cd-speed:${s.speed}`,
    `--cd-pulse-period:${s.pulsePeriod}s`,
    `--cd-pulse-depth:${s.pulseDepth / 100}`,
    `--cd-bloom-width:${s.bloomWidth}%`,
    `--cd-face-radius:${s.faceRadius}cqw`,
    `--cd-rim-width:${s.rimWidth}px`,
    `--cd-light-top:${s.lightTop}`,
    `--cd-light-mid:${s.lightMid}`,
    `--cd-light-base:${s.lightBase}`,
    `--cd-dark-top:${s.darkTop}`,
    `--cd-dark-mid:${s.darkMid}`,
    `--cd-dark-base:${s.darkBase}`,
    `--cd-light-ink:${s.lightInk}`,
    `--cd-dark-ink:${s.darkInk}`,
    `--cd-tick-width:${s.tickWidth}`,
    `--cd-inactive-alpha:${s.inactiveAlpha}%`,
    `--cd-needle-alpha:${s.needleAlpha}%`,
    `--cd-idle-period:${s.idlePeriod}s`,
    `--cd-idle-strength:${s.idleStrength}`,
    `--cd-reading-size:${s.readingSize}cqw`,
    `--cd-reading-top:${s.readingTop}%`,
    `--cd-reading-weight:${s.readingWeight}`,
    `--cd-reading-stretch:${s.readingStretch}`,
    `--cd-digit-color:${s.digitColor}`,
    `--cd-degree-size:${s.degreeSize}cqw`,
    `--cd-degree-alpha:${s.degreeAlpha}%`,
    `--cd-season-size:${s.seasonSize}cqw`,
    `--cd-season-top:${s.seasonTop}%`,
    `--cd-season-weight:${s.seasonWeight}`,
    `--cd-season-tracking:${s.seasonTracking}em`,
    `--cd-letter-in:${s.letterIn}ms`,
    `--cd-letter-stagger:${s.letterStagger}ms`,
    `--cd-bloom-height:${s.bloomHeight}%`,
    `--cd-bloom-bottom:${s.bloomBottom}%`,
    `--cd-bloom-blur:${s.bloomBlur}cqw`,
    `--cd-halo-blur:${s.haloBlur}cqw`,
    `--cd-entrance-lift:${s.entranceLift}px`,
    `--cd-entrance-scale:${s.entranceScale}`,
    `--cd-entrance-blur:${s.entranceBlur}px`,
    `--cd-hint-size:${s.hintSize}px`,
    `--cd-hint-gap:${s.hintGap}px`,
  ].join(';');
}

export function render(input: unknown = {}): string {
  const s = resolveSettings(input);
  const digits = String(Math.abs(s.value));
  return `<div class="cd-shell" data-climate-dial data-theme="${s.theme}" style="${shellStyle(s)}">
    <div class="cd-instrument" style="${paint(s.value, palette(s), s.glow)}">
      <div class="cd-halo" aria-hidden="true"></div><div class="cd-bloom" aria-hidden="true"></div>
      <div class="cd-face" tabindex="0" role="slider" aria-label="Temperature" aria-valuemin="-9" aria-valuemax="70" aria-valuenow="${s.value}" aria-valuetext="${valueLabel(s.value)}">
        <div class="cd-heat" aria-hidden="true"><div class="cd-wash"></div><div class="cd-wall"></div></div><div class="cd-rim" aria-hidden="true"></div>
        <span class="cd-season" aria-hidden="true"${s.showSeason ? '' : ' hidden'}>${seasonOf(s.value)}</span>
        <svg class="cd-scale" aria-hidden="true" viewBox="0 0 440 458"><g class="cd-ticks">${engravedScale(s.value)}</g><path class="cd-needle" d="M218.6 141 Q220 136 221.4 141 L220.65 234 L220 240 L219.35 234Z"/></svg>
        <span class="cd-reading" aria-hidden="true"><span class="cd-value"><span class="cd-sign">${s.value < 0 ? '−' : ''}</span><span class="cd-lead" ${digits.length === 1 ? 'hidden' : ''}><span class="cd-drum">${digits.slice(0, -1)}</span></span><span class="cd-unit"><span class="cd-drum">${digits.at(-1)}</span></span></span><span class="cd-degree"></span></span>
      </div>
    </div><div class="cd-band--bottom"${s.hint ? '' : ' hidden'}>${s.hintText.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</div>
  </div>`;
}

const mounts = new WeakMap<HTMLElement, Controller>();

export function mount(
  host: HTMLElement,
  input: unknown = {},
  options: MountOptions = {},
): Controller {
  mounts.get(host)?.destroy();
  let s = resolveSettings(input);
  host.innerHTML = render(s);
  const root = host.querySelector<HTMLElement>('.cd-shell')!;
  const instrument = root.querySelector<HTMLElement>('.cd-instrument')!;
  const face = root.querySelector<HTMLElement>('.cd-face')!;
  const lead = face.querySelector<HTMLElement>('.cd-lead')!;
  const unit = face.querySelector<HTMLElement>('.cd-unit')!;
  const firstWheel = lead.querySelector<HTMLElement>('.cd-drum')!;
  const lastWheel = unit.querySelector<HTMLElement>('.cd-drum')!;
  const sign = face.querySelector<HTMLElement>('.cd-sign')!;
  root.setAttribute('data-live', '');
  let pigments = palette(s);
  const season = face.querySelector<HTMLElement>('.cd-season')!;
  const hint = root.querySelector<HTMLElement>('.cd-band--bottom')!;
  const marks = Array.from(face.querySelectorAll('line'));
  const doc = host.ownerDocument;
  const win = doc.defaultView!;
  const media = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  let destroyed = false;
  let paused = !!options.paused;
  const box = root.getBoundingClientRect();
  let visible =
    !win.IntersectionObserver ||
    (box.width > 0 &&
      box.height > 0 &&
      box.right > 0 &&
      box.left < win.innerWidth &&
      box.bottom > 0 &&
      box.top < win.innerHeight);
  let entrancePending = true;
  let introduction: { start: number; from: number } | null = null;
  let display = s.value;
  let speed = 0;
  let frame = 0;
  let lastTime = 0;
  let lastMark = -2;
  let finger: number | null = null;
  let startValue = s.value;
  let gapEndpoint: number | null = null;
  let pendingPointer: number | null = null;
  const quiet = () => paused || !visible || doc.hidden || !!media?.matches;
  const listeners = new win.AbortController();
  const signal = listeners.signal;

  let desiredSeason = season.textContent || '';
  let seasonTimer = 0;
  function letters(label: string, enter: boolean) {
    season.replaceChildren(...Array.from(label, (letter, index) => {
      const span = doc.createElement('span');
      span.textContent = letter;
      span.style.setProperty('--cd-letter', String(index));
      return span;
    }));
    season.dataset.motion = enter ? 'in' : '';
  }
  function setSeason(label: string) {
    if (quiet()) {
      win.clearTimeout(seasonTimer);
      seasonTimer = 0;
      desiredSeason = label;
      season.dataset.motion = '';
      if (season.textContent !== label) letters(label, false);
      return;
    }
    if (desiredSeason === label) return;
    desiredSeason = label;
    win.clearTimeout(seasonTimer);
    season.dataset.motion = 'out';
    seasonTimer = win.setTimeout(() => {
      seasonTimer = 0;
      letters(desiredSeason, true);
    }, 200 / s.speed);
  }
  letters(desiredSeason, false);

  let previousInteger = s.value;
  const slotAnimations = new Map<HTMLElement, Animation>();
  function setSlot(node: HTMLElement, glyph: string, direction: number) {
    if (quiet() || node.textContent !== glyph) {
      slotAnimations.get(node)?.cancel();
      slotAnimations.delete(node);
    }
    if (node.textContent === glyph) return;
    node.textContent = glyph;
    if (!glyph || quiet() || !node.animate) return;
    const offset = direction * s.digitTravel;
    const animation = node.animate([
      { transform: `translateY(${offset}px)`, opacity: 0.35, filter: 'blur(5px)', offset: 0 },
      { transform: `translateY(${-offset * .075}px)`, opacity: .96, filter: 'blur(.4px)', offset: .68 },
      { transform: 'translateY(0)', opacity: 1, filter: 'blur(0)' },
    ], { duration: s.digitDuration / s.speed, easing: 'cubic-bezier(.2,.7,.3,1)' });
    slotAnimations.set(node, animation);
  }
  function draw() {
    instrument.style.cssText = paint(display, pigments, s.glow);
    const integer = clamp(Math.round(display), minimum, maximum) || 0;
    const digits = String(Math.abs(integer));
    const direction = Math.sign(integer - previousInteger);
    setSlot(firstWheel, digits.slice(0, -1), direction);
    setSlot(lastWheel, digits.slice(-1), direction);
    setSlot(sign, integer < 0 ? '−' : '', direction);
    lead.hidden = digits.length < 2;
    previousInteger = integer;
    const label = seasonOf(integer);
    setSeason(label);
    const mark = Math.floor((clamp(progressOf(display), 0, 1) + 0.001) * (tickCount - 1));
    if (mark !== lastMark) {
      for (let i = 0; i < marks.length; i++)
        marks[i].classList.toggle('cd-passed', i <= mark);
      lastMark = mark;
    }
  }

  function snap() {
    if (frame) win.cancelAnimationFrame(frame);
    introduction = null;
    lastTime = frame = speed = 0;
    display = s.value;
    draw();
  }

  function updateTarget(value: number, notify: boolean) {
    if (notify) {
      introduction = null;
      entrancePending = false;
    }
    const next = Math.round(clamp(value, minimum, maximum)) || 0;
    if (next === s.value) return;
    s = { ...s, value: next };
    face.setAttribute('aria-valuenow', String(next));
    face.setAttribute('aria-valuetext', valueLabel(next));
    if (notify) {
      const detail = { value: next, season: seasonOf(next) };
      host.dispatchEvent(
        new win.CustomEvent('temperaturechange', { bubbles: true, detail }),
      );
      options.onValueChange?.(next, detail.season);
    }
  }

  function animate(time: number) {
    frame = 0;
    if (pendingPointer !== null) {
      const value = pendingPointer;
      pendingPointer = null;
      updateTarget(value, true);
    }
    if (destroyed) return;
    if (quiet()) return snap();
    const dt = Math.min(0.05, Math.max(0.001, (time - lastTime) / 1000));
    lastTime = time;
    // Exact solution of a damped oscillator, independent of refresh rate.
    let destination = s.value;
    if (introduction) {
      if ((time - introduction.start) * s.speed < s.entranceHold) {
        destination = introduction.from;
      } else {
        introduction = null;
      }
    }
    const decay = (21.5 - 24 * s.spring + 4 * s.spring ** 4) * s.speed;
    const frequency = (13 + 16 * s.spring) * s.speed;
    const offset = display - destination;
    const b = (speed + decay * offset) / frequency;
    const c = Math.cos(frequency * dt);
    const sin = Math.sin(frequency * dt);
    const envelope = Math.exp(-decay * dt);
    const displacement = envelope * (offset * c + b * sin);
    display = destination + displacement;
    speed =
      envelope * frequency * (-offset * sin + b * c) - decay * displacement;
    if (
      !introduction &&
      Math.abs(displacement) < 0.008 &&
      Math.abs(speed) < 0.2
    )
      return snap();
    draw();
    frame = win.requestAnimationFrame(animate);
  }

  function schedule() {
    if (destroyed) return;
    if (quiet()) {
      if (pendingPointer !== null) {
        updateTarget(pendingPointer, true);
        pendingPointer = null;
      }
      snap();
    } else if (!frame) {
      lastTime = win.performance.now();
      frame = win.requestAnimationFrame(animate);
    }
  }

  function targetAt(e: PointerEvent) {
    const r = face.getBoundingClientRect();
    const x = ((e.clientX - r.left) / (r.width || 1)) * 440 - 220;
    const y = ((e.clientY - r.top) / (r.height || 1)) * 458 - 322;
    const angle = (Math.atan2(x, -y) * 180) / Math.PI;
    if (Math.abs(angle) > sweep / 2) {
      // Stay on the same end stop when a drag crosses the gap below the scale.
      gapEndpoint ??= angle < 0 ? minimum : maximum;
      return gapEndpoint;
    }
    gapEndpoint = null;
    return (
      minimum + clamp((angle - firstAngle) / sweep, 0, 1) * (maximum - minimum)
    );
  }

  function release(cancel: boolean) {
    if (finger === null) return;
    const pointer = finger;
    finger = null;
    gapEndpoint = null;
    root.removeAttribute('data-tracking');
    if (face.hasPointerCapture?.(pointer)) face.releasePointerCapture(pointer);
    if (cancel) {
      pendingPointer = null;
      updateTarget(startValue, true);
    }
    schedule();
  }

  face.addEventListener(
    'pointerdown',
    (e) => {
      if (finger !== null || e.button !== 0 || e.isPrimary === false) return;
      face.focus({ preventScroll: true });
      face.setPointerCapture?.(e.pointerId);
      finger = e.pointerId;
      startValue = s.value;
      root.setAttribute('data-tracking', '');
      updateTarget(targetAt(e), true);
      schedule();
    },
    { signal },
  );
  face.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerId !== finger) return;
      pendingPointer = targetAt(e);
      schedule();
    },
    { signal },
  );
  face.addEventListener(
    'pointerup',
    (e) => {
      if (e.pointerId !== finger) return;
      pendingPointer = targetAt(e);
      release(false);
    },
    { signal },
  );
  for (const type of ['pointercancel', 'lostpointercapture'] as const) {
    face.addEventListener(
      type,
      (e) => {
        if (e.pointerId === finger) release(true);
      },
      { signal },
    );
  }
  face.addEventListener(
    'keydown',
    (e) => {
      const step = e.shiftKey ? s.shiftStep : s.keyboardStep;
      const keys: Record<string, number> = {
        Home: minimum,
        End: maximum,
        ArrowUp: s.value + step,
        ArrowRight: s.value + step,
        ArrowDown: s.value - step,
        ArrowLeft: s.value - step,
      };
      if (e.key === 'Escape' && finger !== null) {
        e.preventDefault();
        release(true);
        return;
      }
      if (!(e.key in keys)) return;
      e.preventDefault();
      updateTarget(keys[e.key], true);
      schedule();
    },
    { signal },
  );
  face.addEventListener(
    'wheel',
    (e) => {
      if (!s.wheelEnabled || doc.activeElement !== face || !e.deltaY) return;
      e.preventDefault();
      updateTarget(s.value - Math.sign(e.deltaY) * (e.shiftKey ? s.shiftStep : s.keyboardStep), true);
      schedule();
    },
    { signal, passive: false },
  );

  function replay() {
    if (destroyed) return;
    if (finger !== null) release(false);
    pendingPointer = null;
    root.removeAttribute('data-mounted');
    entrancePending = !media?.matches && s.entrance;
    if (quiet() || !entrancePending) {
      snap();
      return;
    }
    entrancePending = false;
    const from = minimum;
    display = from;
    speed = 0;
    introduction = { start: win.performance.now(), from };
    void instrument.offsetWidth;
    root.setAttribute('data-mounted', '');
    draw();
    win.clearTimeout(seasonTimer);
    desiredSeason = seasonOf(from);
    letters(desiredSeason, true);
    schedule();
  }
  function syncPulse() {
    root.toggleAttribute('data-pulsing', s.pulse && s.pulseDepth > 0 && s.glow > 0 && !quiet());
  }

  function motionPolicy() {
    syncPulse();
    root.toggleAttribute('data-static', quiet());
    if (media?.matches) entrancePending = false;
    if (quiet()) {
      if (introduction && !media?.matches) entrancePending = true;
      root.removeAttribute('data-mounted');
      snap();
    } else if (entrancePending) replay();
  }
  const observer = win.IntersectionObserver
    ? new win.IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        motionPolicy();
      })
    : null;
  observer?.observe(root);
  doc.addEventListener('visibilitychange', motionPolicy, { signal });
  media?.addEventListener('change', motionPolicy);
  host.addEventListener('climatedialreplay', replay, { signal });
  motionPolicy();
  draw();
  const api: Controller = {
    update(settings) {
      if (destroyed) return;
      const next = resolveSettings({ ...s, ...settings });
      if (next.value !== s.value || !next.entrance) introduction = null;
      updateTarget(next.value, false);
      s = next;
      pigments = palette(s);
      if (!s.entrance) entrancePending = false;
      root.style.cssText = shellStyle(s);
      season.hidden = !s.showSeason;
      syncPulse();
      if (settings.entrance === false) root.removeAttribute('data-mounted');
      root.dataset.theme = next.theme;
      hint.hidden = !next.hint;
      hint.textContent = next.hintText;
      schedule();
    },
    replay,
    pause() {
      paused = true;
      motionPolicy();
    },
    resume() {
      paused = false;
      motionPolicy();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      slotAnimations.forEach((animation) => animation.cancel());
      win.clearTimeout(seasonTimer);
      listeners.abort();
      observer?.disconnect();
      media?.removeEventListener('change', motionPolicy);
      if (finger !== null && face.hasPointerCapture?.(finger))
        face.releasePointerCapture(finger);
      if (frame) win.cancelAnimationFrame(frame);
      mounts.delete(host);
      root.remove();
    },
  };
  mounts.set(host, api);
  return api;
}
