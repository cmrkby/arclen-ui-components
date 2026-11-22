import { auditText, renderAudit, updateAudit } from './site-audit';
import manifest from '../../component.json';

export type Season = 'Winter' | 'Spring' | 'Summer' | 'Autumn';

export type DialMode = 'climate' | 'dimmer' | 'heart-rate';

type NumericSettings = SharedSettings & { mode: DialMode };
export type Settings = NumericSettings | (SharedSettings & { mode: 'site-audit' });

interface SharedSettings {
  auditEmberColor: string;
  auditEmberStart: number;
  auditYellowColor: string;
  auditYellowStart: number;
  auditGreenColor: string;
  auditGreenStart: number;
  performanceLabel: string;
  performanceScore: number;
  performanceFinding: string;
  accessibilityLabel: string;
  accessibilityScore: number;
  accessibilityFinding: string;
  seoLabel: string;
  seoScore: number;
  seoFinding: string;
  brightness: number;
  bpm: number;
  beatDepth: number;
  heartGlowRise: number;
  heartIconSize: number;
  heartPulseAmount: number;
  dimmerGlowColor: string;
  lowRateColor: string;
  midRateColor: string;
  highRateColor: string;
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
  onDialChange?: (value: number, mode: DialMode) => void;
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

const modes = {
  climate: { min: -9, max: 70, key: 'value', name: 'Temperature', suffix: '', hint: 'Turn the dial to adjust temperature' },
  dimmer: { min: 0, max: 100, key: 'brightness', name: 'Brightness', suffix: '%', hint: 'Turn the dial to dim or brighten the light' },
  'heart-rate': { min: 40, max: 200, key: 'bpm', name: 'Heart rate', suffix: 'BPM', hint: 'Turn the dial to adjust heart rate' },
} as const;

// Lucide outlines. See assets/Lucide-LICENSE.txt.
const iconPaths = {
  'heart-rate': '<path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/>',
  dimmer: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
};

function labelIcon(mode: keyof typeof iconPaths) {
  const iconClass = mode === 'dimmer' ? 'cd-bulb' : 'cd-heart';
  return `<svg class="${iconClass}" data-icon="${mode}" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${iconPaths[mode]}</svg>`;
}

function caption(value: number, mode: DialMode) {
  return mode === 'climate' ? seasonOf(value) : '';
}

function hintFor(s: NumericSettings) {
  return s.hintText === defaults.hintText ? modes[s.mode].hint : s.hintText;
}
const sweep = 230;
const firstAngle = -sweep / 2;
const tickCount = 96;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
function progressOf(value: number, mode: Settings['mode'] = 'climate') {
  if (mode === 'site-audit') return value / 100;
  const { min, max } = modes[mode];
  return (value - min) / (max - min);
}
const degrees = (progress: number) => firstAngle + sweep * progress;

function seasonOf(value: number): Season {
  if (value < 5) return 'Winter';
  if (value < 16) return 'Autumn';
  if (value < 26) return 'Spring';
  return 'Summer';
}

function valueLabel(value: number, mode: DialMode) {
  if (mode === 'dimmer') return `${value}% brightness`;
  if (mode === 'heart-rate') return `${value} beats per minute`;
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
      ? (input as Partial<Omit<Settings, 'mode'>> & { mode?: unknown })
      : {};
  return {
    mode: raw.mode === 'site-audit' || raw.mode === 'dimmer' || raw.mode === 'climate'
      ? raw.mode
      : 'heart-rate',
    auditEmberColor: color(raw.auditEmberColor, defaults.auditEmberColor),
    auditEmberStart: Math.round(bounded(raw.auditEmberStart, defaults.auditEmberStart, 0, 100)),
    auditYellowColor: color(raw.auditYellowColor, defaults.auditYellowColor),
    auditYellowStart: Math.round(bounded(raw.auditYellowStart, defaults.auditYellowStart, 0, 100)),
    auditGreenColor: color(raw.auditGreenColor, defaults.auditGreenColor),
    auditGreenStart: Math.round(bounded(raw.auditGreenStart, defaults.auditGreenStart, 0, 100)),
    performanceLabel: auditText(raw.performanceLabel, defaults.performanceLabel, 48),
    performanceScore: Math.round(bounded(raw.performanceScore, defaults.performanceScore, 0, 100)),
    performanceFinding: auditText(raw.performanceFinding, defaults.performanceFinding, 320),
    accessibilityLabel: auditText(raw.accessibilityLabel, defaults.accessibilityLabel, 48),
    accessibilityScore: Math.round(bounded(raw.accessibilityScore, defaults.accessibilityScore, 0, 100)),
    accessibilityFinding: auditText(raw.accessibilityFinding, defaults.accessibilityFinding, 320),
    seoLabel: auditText(raw.seoLabel, defaults.seoLabel, 48),
    seoScore: Math.round(bounded(raw.seoScore, defaults.seoScore, 0, 100)),
    seoFinding: auditText(raw.seoFinding, defaults.seoFinding, 320),
    brightness: Math.round(bounded(raw.brightness, defaults.brightness, modes.dimmer.min, modes.dimmer.max)),
    bpm: Math.round(bounded(raw.bpm, defaults.bpm, modes['heart-rate'].min, modes['heart-rate'].max)),
    dimmerGlowColor: color(raw.dimmerGlowColor, defaults.dimmerGlowColor),
    lowRateColor: color(raw.lowRateColor, defaults.lowRateColor),
    midRateColor: color(raw.midRateColor, defaults.midRateColor),
    highRateColor: color(raw.highRateColor, defaults.highRateColor),
    heartIconSize: bounded(raw.heartIconSize, defaults.heartIconSize, 60, 200),
    heartPulseAmount: bounded(raw.heartPulseAmount, defaults.heartPulseAmount, 0, 25),
    heartGlowRise: bounded(raw.heartGlowRise, defaults.heartGlowRise, 0, 200),
    beatDepth: bounded(raw.beatDepth, defaults.beatDepth, 0, 85),
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
        ? Math.round(clamp(raw.value, modes.climate.min, modes.climate.max)) || 0
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

function singleTone(hex: string) {
  const tone = channels(hex);
  return {
    stops: [0],
    bands: [[tone.map(c => Math.round(c * .48))], [tone], [tone.map(c => Math.round(c + (255 - c) * .63))]],
  };
}

function auditPaint(s: Settings, score: number) {
  // The closest start at or below the score wins. Later bands win ties.
  let start = -1;
  let colour: string | undefined;
  for (const band of ['Ember', 'Yellow', 'Green'] as const) {
    const threshold = s[`audit${band}Start`];
    if (threshold <= score && threshold >= start) {
      start = threshold;
      colour = s[`audit${band}Color`];
    }
  }
  return colour
    ? paint(score, singleTone(colour), s)
    : paint(score, singleTone('#888888'), { ...s, glow: 0 });
}

function palette(s: NumericSettings) {
  if (s.mode === 'dimmer') return singleTone(s.dimmerGlowColor);
  if (s.mode === 'heart-rate') {
    const keys = ['lowRateColor', 'midRateColor', 'highRateColor'] as const;
    const tones = keys.map(key => channels(s[key]));
    // Carry the upper wash and highlight independently, as on the Climate face.
    // Offsets keep the whole band responsive to each user-selected colour.
    const offsets = keys.map((key, i) => channels(defaults[key]).map((c, j) => tones[i][j] - c));
    const tint = (stops: string[]) => stops.map((hex, i) =>
      channels(hex).map((c, j) => clamp(c + offsets[i][j], 0, 255)),
    );
    return {
      stops: [72, 120, 200],
      bands: [tint(['#169c52', '#c87b0b', heatBands[0][4]]), tones,
        tint(['#aff8c5', '#ffe895', heatBands[2][4]])],
    };
  }
  function offset(accent: string, base: string) {
    const original = channels(base);
    return channels(accent).map((v, i) => v - original[i]);
  }
  const cold = offset(s.coldAccent, defaults.coldAccent);
  const warm = offset(s.warmAccent, defaults.warmAccent);
  const bands = heatBands.map((band) =>
    band.map((hex, stop) => {
      const weight = progressOf(temperatureStops[stop]);
      return channels(hex).map((v, i) =>
        clamp(v + cold[i] * (1 - weight) + warm[i] * weight, 0, 255),
      );
    }),
  );
  return { stops: temperatureStops, bands };
}

function paint(value: number, pigments: ReturnType<typeof palette>, s: Settings) {
  const { glow: strength, mode } = s;
  const t = clamp(progressOf(value, mode), 0, 1);
  const travel = 0.43 * t;
  const riseOffset = mode === 'heart-rate' ? travel * (s.heartGlowRise / 100 - 1) : 0;
  const glow = mode === 'dimmer' ? strength * t : strength;
  const { stops, bands } = pigments;
  const bounded = clamp(value, stops[0], stops[stops.length - 1]);
  const hi = stops.findIndex(stop => stop >= bounded);
  const lo = Math.max(0, hi - 1);
  const fraction = hi === lo ? 0 : (bounded - stops[lo]) / (stops[hi] - stops[lo]);
  const [deep, mid, tip] = bands.map(band => band[lo].map((c, i) =>
    Math.round(Math.sqrt(c ** 2 * (1 - fraction) + band[hi][i] ** 2 * fraction)),
  ).join(' '));
  const rimTip = glow >= 1
    ? 'var(--cd-tip)'
    : `color-mix(in srgb, var(--cd-tip) ${glow * 100}%, transparent)`;
  return `--cd-rim-tip:${rimTip};--cd-progress:${t};--cd-deep:rgb(${deep});--cd-rgb:${mid};--cd-tip:rgb(${tip});--cd-glow:${glow};--cd-angle:${degrees(progressOf(value, mode))}deg;--cd-halo-alpha:${(0.2 + 0.4 * t) * glow};--cd-bloom-alpha:${(0.4 + 0.55 * t) * glow};--cd-rise:${0.62 + travel};--cd-rise-offset:${riseOffset};`;
}

// Keep the engraved indices fixed while the sweep advances across them.
function engravedScale(value: number, mode: Settings['mode']) {
  const activeIndex = Math.floor((progressOf(value, mode) + 0.001) * (tickCount - 1));
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
    `--cd-beat-period:${60 / s.bpm}s`,
    `--cd-heart-size:${s.heartIconSize / 100}em`,
    `--cd-heart-scale:${1 + s.heartPulseAmount / 100}`,
    `--cd-beat-depth:${s.pulse ? s.beatDepth / 100 : 0}`,
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
  if (s.mode === 'site-audit') return renderAudit(s, shellStyle(s), renderInstrument);
  return renderDial(s);
}

function renderDial(s: NumericSettings): string {
  const range = modes[s.mode];
  const value = s[range.key];
  const attributes = `tabindex="0" role="slider" aria-label="${range.name}" aria-valuemin="${range.min}" aria-valuemax="${range.max}" aria-valuenow="${value}" aria-valuetext="${valueLabel(value, s.mode)}"`;
  const title = s.mode === 'climate' ? seasonOf(value) : labelIcon(s.mode);
  return `<div class="cd-shell" data-climate-dial data-mode="${s.mode}" data-theme="${s.theme}" style="${shellStyle(s)}">
    ${renderInstrument(s, value, title, attributes, range.suffix)}
    <div class="cd-band--bottom"${s.hint ? '' : ' hidden'}>${hintFor(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</div>
  </div>`;
}

// Numeric controls and score disclosures share the entire visible instrument.
function renderInstrument(s: Settings, value: number, title: string, attributes = 'aria-hidden="true"', suffix = '') {
  const audit = s.mode === 'site-audit';
  const digits = String(Math.abs(value));
  const surface = s.mode === 'site-audit' ? auditPaint(s, value) : paint(value, palette(s), s);
  return `<span class="cd-instrument" style="${surface}">
    <span class="cd-halo" aria-hidden="true"></span><span class="cd-bloom" aria-hidden="true"></span>
    <span class="cd-face" ${attributes}>
      <span class="cd-heat" aria-hidden="true"><span class="cd-wash"></span><span class="cd-wall"></span></span><span class="cd-rim" aria-hidden="true"></span>
      <span class="cd-season${audit ? ' cd-audit-label' : ''}" aria-hidden="true"${audit || s.showSeason ? '' : ' hidden'}>${title}</span>
      <svg class="cd-scale" aria-hidden="true" viewBox="0 0 440 458"><g class="cd-ticks">${engravedScale(value, s.mode)}</g><path class="cd-needle" d="M218.6 141 Q220 136 221.4 141 L220.65 234 L220 240 L219.35 234Z"/></svg>
      <span class="cd-reading${audit && digits.length === 3 ? ' cd-audit-three-digits' : ''}" aria-hidden="true"><span class="cd-value${audit ? ' cd-audit-score' : ''}"><span class="cd-sign">${value < 0 ? '−' : ''}</span><span class="cd-lead" ${digits.length === 1 ? 'hidden' : ''}><span class="cd-drum">${digits.slice(0, -1)}</span></span><span class="cd-unit"><span class="cd-drum">${digits.at(-1)}</span></span></span><span class="cd-degree"></span><span class="cd-suffix">${suffix}</span></span>
    </span>
  </span>`;
}

const mounts = new WeakMap<HTMLElement, Controller>();

export function mount(
  host: HTMLElement,
  input: unknown = {},
  options: MountOptions = {},
): Controller {
  mounts.get(host)?.destroy();
  let s = resolveSettings(input);
  let paused = !!options.paused;
  let destroyed = false;
  let dial: ReturnType<typeof mountDial> | undefined;

  function syncAuditMotion() {
    const audit = host.querySelector('.cd-audit');
    audit?.toggleAttribute('data-live', !paused);
    audit?.toggleAttribute('data-pulsing', !paused && s.pulse && s.glow > 0 && s.pulseDepth > 0);
  }

  function show() {
    dial?.destroy();
    dial = undefined;
    if (s.mode === 'site-audit') {
      host.innerHTML = renderAudit(s, shellStyle(s), renderInstrument);
      syncAuditMotion();
      return;
    }
    dial = mountDial(host, s, { ...options, paused, onDialChange(value, mode) {
      s = { ...s, [modes[mode].key]: value };
      options.onDialChange?.(value, mode);
    } });
  }
  show();
  const api: Controller = {
    update(patch) {
      if (destroyed) return;
      s = resolveSettings({ ...s, ...patch });
      if (s.mode === 'site-audit' && !dial) {
        updateAudit(host, s, shellStyle(s), renderInstrument, auditPaint);
        syncAuditMotion();
      }
      else if (s.mode !== 'site-audit' && dial) dial.update(s);
      else show();
    },
    pause() { paused = true; dial?.pause(); syncAuditMotion(); },
    resume() { paused = false; dial?.resume(); syncAuditMotion(); },
    replay() {
      if (destroyed) return;
      if (dial) dial.replay();
      else host.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(tile => { tile.open = false; });
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (dial) dial.destroy();
      else host.querySelector('.cd-audit')?.remove();
      mounts.delete(host);
    },
  };
  mounts.set(host, api);
  return api;
}

function mountDial(host: HTMLElement, initial: NumericSettings, options: MountOptions) {
  let s = initial;
  host.innerHTML = renderDial(s);
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
  let range = modes[s.mode];
  let target = s[range.key];
  let display = target;
  let speed = 0;
  let frame = 0;
  let lastTime = 0;
  let lastMark = -2;
  let finger: number | null = null;
  let startValue = target;
  let gapEndpoint: number | null = null;
  let pendingPointer: number | null = null;
  const quiet = () => paused || !visible || doc.hidden || !!media?.matches;
  const listeners = new win.AbortController();
  const signal = listeners.signal;

  let desiredSeason = season.textContent || '';
  let seasonTimer = 0;
  function letters(label: string, enter: boolean) {
    if (s.mode !== 'climate') {
      if (season.firstElementChild?.getAttribute('data-icon') !== s.mode) season.innerHTML = labelIcon(s.mode);
      season.dataset.motion = '';
      return;
    }
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

  let previousInteger = target;
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
    instrument.style.cssText = paint(display, pigments, s);
    const integer = clamp(Math.round(display), range.min, range.max) || 0;
    const digits = String(Math.abs(integer));
    const direction = Math.sign(integer - previousInteger);
    setSlot(firstWheel, digits.slice(0, -1), direction);
    setSlot(lastWheel, digits.slice(-1), direction);
    setSlot(sign, integer < 0 ? '−' : '', direction);
    lead.hidden = digits.length < 2;
    previousInteger = integer;
    const label = caption(integer, s.mode);
    setSeason(label);
    const mark = Math.floor((clamp(progressOf(display, s.mode), 0, 1) + 0.001) * (tickCount - 1));
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
    display = target;
    draw();
  }

  function updateTarget(value: number, notify: boolean) {
    if (notify) {
      introduction = null;
      entrancePending = false;
    }
    const next = Math.round(clamp(value, range.min, range.max)) || 0;
    if (next === target) return;
    target = next;
    s = { ...s, [range.key]: next };
    if (s.mode === 'heart-rate') root.style.setProperty('--cd-beat-period', (60 / next) + 's');
    face.setAttribute('aria-valuenow', String(next));
    face.setAttribute('aria-valuetext', valueLabel(next, s.mode));
    if (notify) {
      host.dispatchEvent(new win.CustomEvent('dialchange', { bubbles: true, detail: { mode: s.mode, value: next } }));
      options.onDialChange?.(next, s.mode);
    }
    if (notify && s.mode === 'climate') {
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
    let destination = target;
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
      gapEndpoint ??= angle < 0 ? range.min : range.max;
      return gapEndpoint;
    }
    gapEndpoint = null;
    return (
      range.min + clamp((angle - firstAngle) / sweep, 0, 1) * (range.max - range.min)
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
      startValue = target;
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
        Home: range.min,
        End: range.max,
        ArrowUp: target + step,
        ArrowRight: target + step,
        ArrowDown: target - step,
        ArrowLeft: target - step,
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
      updateTarget(target - Math.sign(e.deltaY) * (e.shiftKey ? s.shiftStep : s.keyboardStep), true);
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
    const from = range.min;
    display = from;
    speed = 0;
    introduction = { start: win.performance.now(), from };
    void instrument.offsetWidth;
    root.setAttribute('data-mounted', '');
    draw();
    win.clearTimeout(seasonTimer);
    desiredSeason = caption(from, s.mode);
    letters(desiredSeason, true);
    schedule();
  }
  function syncPulse() {
    const depth = s.mode === 'heart-rate' ? s.beatDepth : s.pulseDepth;
    const glowPulses = s.pulse && depth > 0 && s.glow > 0;
    const active = !quiet();
    root.toggleAttribute('data-pulsing', s.mode !== 'dimmer' && glowPulses && active);
    root.toggleAttribute('data-heart-beat', s.mode === 'heart-rate' && active &&
      (glowPulses || (s.showSeason && s.heartPulseAmount > 0)));
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
  return {
    update(next: NumericSettings) {
      if (destroyed) return;
      const modeChanged = next.mode !== s.mode;
      if (modeChanged) {
        pendingPointer = null;
        release(false);
        root.removeAttribute('data-mounted');
        range = modes[next.mode];
        root.dataset.mode = next.mode;
        face.setAttribute('aria-label', range.name);
        face.setAttribute('aria-valuemin', String(range.min));
        face.setAttribute('aria-valuemax', String(range.max));
        face.querySelector('.cd-suffix')!.textContent = range.suffix;
      }
      if (modeChanged || next[range.key] !== target || !next.entrance) introduction = null;
      s = next;
      target = s[range.key];
      face.setAttribute('aria-valuenow', String(target));
      face.setAttribute('aria-valuetext', valueLabel(target, s.mode));
      pigments = palette(s);
      if (!s.entrance) entrancePending = false;
      root.style.cssText = shellStyle(s);
      season.hidden = !s.showSeason;
      syncPulse();
      if (!next.entrance) root.removeAttribute('data-mounted');
      root.dataset.theme = next.theme;
      hint.hidden = !next.hint;
      hint.textContent = hintFor(next);
      if (modeChanged) {
        win.clearTimeout(seasonTimer);
        desiredSeason = caption(target, s.mode);
        letters(desiredSeason, false);
        snap();
      } else schedule();
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
      root.remove();
    },
  };
}
