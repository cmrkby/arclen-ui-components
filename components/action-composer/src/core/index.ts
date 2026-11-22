import manifest from '../../component.json';
import { renderArtwork } from './artwork';

const actions = {
  image: { intent: 'create-image', hint: 'Describe the image you want to create…' },
  note: { intent: 'create-doc', hint: 'What should the document cover?' },
  event: { intent: 'create-slides', hint: 'What are you presenting, and to whom?' },
  voice: { intent: 'analyze-doc', hint: 'Paste the text and tell me what to look for…' },
  docs: { intent: 'create-chart', hint: 'Paste your data and describe the chart…' },
} as const;
export type Action = keyof typeof actions;
export type Model = 'helium' | 'silicon' | 'neon' | 'titanium' | 'carbon' | 'argon';
const modelAliases = {
  sparrow: 'helium', juniper: 'silicon', nightjar: 'neon',
  space: 'helium', mind: 'silicon', reality: 'neon', power: 'titanium', time: 'carbon', soul: 'argon',
} as const satisfies Record<string, Model>;
export type LegacyModel = keyof typeof modelAliases;
export function normalizeModel(value: string): string {
  return Object.hasOwn(modelAliases, value) ? modelAliases[value as LegacyModel] : value;
}
const controlNames = ['plus', 'model', 'voice', 'send', 'cancel', 'stop'] as const;
type ControlName = (typeof controlNames)[number];
type ControlSizes = Record<`${ControlName}${'Size' | 'IconSize' | 'Radius'}`, number>;
type ControlColors = Record<`${ControlName}${'Fill' | 'Ink'}`, string>;
type ControlOverrides = Record<`${ControlName}CustomColors`, boolean>;
type ArtLayout = Record<`${Action}Art${'Size' | 'X' | 'Y' | 'ShadowOpacity' | 'ShadowBlur' | 'ShadowX' | 'ShadowY'}`, number>;
type ArtPalette = Record<`${Action}ArtShadowColor`, string>;
export interface Settings extends ControlSizes, ControlColors, ControlOverrides, ArtLayout, ArtPalette {
  actionLabels: string[];
  voiceSample: string;
  accent: string;
  artStrength: number;
  inputRadius: number;
  shellShape: 'adjustable' | 'pill' | 'square';
  shellWidth: number;
  shellHeight: number;
  shellPadding: number;
  controlGap: number;
  promptSize: number;
  shellLight: string;
  shellDark: string;
  buttonFinish: 'raised' | 'flat' | 'outline';
  menuWidth: number;
  menuRadius: number;
  menuRowHeight: number;
  menuPadding: number;
  menuGap: number;
  chipHeight: number;
  chipRadius: number;
  chipTypeSize: number;
  modelTypeSize: number;
  showModelName: boolean;
  disabledSendOpacity: number;
  focusBeam: number;
  beamColorA: string;
  beamColorB: string;
  beamSpeed: number;
  beamBreathSpeed: number;
  beamPulseDepth: number;
  cardFinish: 'satin' | 'smooth';
  fanSize: number;
  fanTuck: number;
  fanTilt: number;
  paperPalette: 'arclen' | 'studio' | 'newsprint' | 'blueprint';
  submitOnEnter: boolean;
  fanTravel: number;
  fanSpread: number;
  fanStagger: number;
  motionSpeed: number;
  theme: 'light' | 'dark';
  placeholder: string;
  model: Model;
}
export interface SendDetail {
  text: string;
  action: Action | null;
  intent: (typeof actions)[Action]['intent'] | null;
  model: Model;
}
export interface MountOptions {
  onSend?: (detail: SendDetail) => void;
}
export interface Controller {
  update(input: unknown): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}

const models: Record<Model, [string, string]> = {
  helium: ['Helium', 'For quick first drafts'],
  silicon: ['Silicon', 'For careful reasoning'],
  neon: ['Neon', 'For images and visual studies'],
  titanium: ['Titanium', 'For ambitious builds'],
  carbon: ['Carbon', 'For planning and sequencing'],
  argon: ['Argon', 'For voice and tone'],
};
export const defaults = Object.freeze(
  Object.fromEntries(manifest.settings.map((item) => [item.key, item.default])),
) as Readonly<Settings>;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError('Expected composer settings');
  return value as Record<string, unknown>;
}
export function resolveSettings(input: unknown = defaults): Settings {
  const given = object(input);
  if (Object.keys(given).some((key) => !Object.hasOwn(defaults, key)))
    throw new TypeError('Unknown composer setting');
  const values: Record<string, unknown> = { ...defaults, ...given };
  if (typeof values.model === 'string') values.model = normalizeModel(values.model);
  for (const setting of manifest.settings) {
    const value = values[setting.key];
    let valid = false;
    switch (setting.kind) {
      case 'number':
        valid =
          typeof value === 'number' &&
          Number.isFinite(value) &&
          value >= setting.min! &&
          value <= setting.max!;
        break;
      case 'select':
        valid = setting.options!.some((option) => option.value === value);
        break;
      case 'color':
        valid =
          typeof value === 'string' &&
          (value === 'transparent' || /^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(value));
        break;
      case 'boolean':
        valid = typeof value === 'boolean';
        break;
      case 'text':
        valid = typeof value === 'string' && value.length <= setting.maxLength!;
        break;
      case 'string-list':
        valid =
          Array.isArray(value) &&
          value.length >= setting.minItems! &&
          value.length <= setting.maxItems! &&
          value.every((item) => typeof item === 'string' && item.length <= setting.maxItemLength!);
        if (valid) values[setting.key] = [...(value as string[])];
        break;
    }
    if (!valid) throw new TypeError('Invalid ' + setting.key);
  }
  return values as unknown as Settings;
}
const entities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
const safe = (value: string) => value.replace(/[&<>"']/g, (c) => entities[c]);
const session = Math.random().toString(36).slice(2);
let serial = 0;
const instance = () => session + '-' + ++serial;
// Lucide outline icons. See assets/Lucide-LICENSE.txt.
const icons = {
  model: '<path d="M12 18V5"/><path d="M15 13a4.17 4.17 0 01-3-4 4.17 4.17 0 01-3 4"/><path d="M17.707 6.294A3 3 0 1012 5a3 3 0 10-5.707 1.294"/><path d="M17.996 5.125a4 4 0 012.526 5.77"/><path d="M18 18a4 4 0 002-7.465"/><path d="M19.967 17.482a4 4 0 11-7.967.517 4 4 0 11-7.967-.517"/><path d="M6 18a4 4 0 01-2-7.465"/><path d="M6.004 5.125a4 4 0 00-2.526 5.77"/>',
  caret: '<path d="m6 9 6 6 6-6"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  mic: '<path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/>',
  send: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  cross: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  stop: '<rect width="18" height="18" x="3" y="3" rx="2"/>',
};
const icon = (name: keyof typeof icons) =>
  `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
const keys = Object.keys(actions) as Action[];
function surface(s: Settings) {
  const controls: Record<string, string> = {};
  for (const name of controlNames) {
    const prefix = '--ac-' + name;
    controls[prefix + '-size'] = s[`${name}Size`] + 'px';
    controls[prefix + '-icon'] = s[`${name}IconSize`] + 'px';
    controls[prefix + '-radius'] = s[`${name}Radius`] + 'px';
    controls[prefix + '-fill'] = s[`${name}CustomColors`] ? s[`${name}Fill`] : 'initial';
    controls[prefix + '-ink'] = s[`${name}CustomColors`] ? s[`${name}Ink`] : 'initial';
  }
  return {
    ...controls,
    '--ac-control-accent': s.accent,
    '--ac-input-radius': (s.shellShape === 'pill' ? 999 : s.shellShape === 'square' ? 0 : s.inputRadius) + 'px',
    '--ac-beam-opacity': String(s.focusBeam / 100),
    '--ac-beam-first': s.beamColorA,
    '--ac-beam-second': s.beamColorB,
    '--ac-beam-lap': 9.6 / s.beamSpeed + 's',
    '--ac-beam-breath-period': 4.8 / s.beamBreathSpeed + 's',
    '--ac-beam-trough': String(1 - s.beamPulseDepth / 100),
    '--ac-shell-width': s.shellWidth + 'px',
    '--ac-shell-height': s.shellHeight + 'px',
    '--ac-shell-padding': s.shellPadding + 'px',
    '--ac-control-gap': s.controlGap + 'px',
    '--ac-prompt-size': s.promptSize + 'px',
    '--ac-shell-light': s.shellLight,
    '--ac-shell-dark': s.shellDark,
    '--ac-menu-width': s.menuWidth + 'px',
    '--ac-menu-radius': s.menuRadius + 'px',
    '--ac-menu-row-height': s.menuRowHeight + 'px',
    '--ac-menu-padding': s.menuPadding + 'px',
    '--ac-menu-gap': s.menuGap + 'px',
    '--ac-chip-height': s.chipHeight + 'px',
    '--ac-chip-radius': s.chipRadius + 'px',
    '--ac-chip-type-size': s.chipTypeSize + 'px',
    '--ac-model-type-size': s.modelTypeSize + 'px',
    '--ac-disabled-opacity': String(s.disabledSendOpacity / 100),
    '--ac-model-label': s.showModelName ? 'inline' : 'none',
    '--ac-button-shadow': s.buttonFinish === 'raised' ? 'var(--ac-picker-shadow)' : s.buttonFinish === 'flat' ? 'none' : 'inset 0 0 0 1px currentColor',
    '--ac-tilt': String(s.fanTilt / 100),
    '--ac-art-ink': String(s.artStrength / 100),
    '--ac-fan-scale': String(s.fanSize / 100),
    '--ac-card-tuck': `min(${s.fanTuck}px, ${s.fanTuck / 6.34}cqw)`,
    '--ac-spread': String(s.fanSpread / 100),
    '--ac-travel': String(s.fanTravel / 152),
  };
}
function artworkStyle(s: Settings, action: Action) {
  return {
    '--ac-art-scale': String(s[`${action}ArtSize`] / 100),
    '--ac-art-x': s[`${action}ArtX`] + '%',
    '--ac-art-y': s[`${action}ArtY`] + '%',
    '--ac-art-shadow-opacity': s[`${action}ArtShadowOpacity`] + '%',
    '--ac-art-shadow-blur': s[`${action}ArtShadowBlur`] + 'px',
    '--ac-art-shadow-x': s[`${action}ArtShadowX`] + 'px',
    '--ac-art-shadow-y': s[`${action}ArtShadowY`] + 'px',
    '--ac-art-shadow-color': s[`${action}ArtShadowColor`],
  };
}
function cards(s: Settings, instanceId: string) {
  return keys
    .map(
      (key, i) =>
        `<button type="button" class="ac-card" data-ac-action="${key}" aria-label="${safe(s.actionLabels[i])}"><span class="ac-card-face" style="${Object.entries(artworkStyle(s, key)).map(([k, v]) => k + ':' + v).join(';')}"><span class="ac-card-label">${safe(s.actionLabels[i])}</span>${renderArtwork(key, instanceId)}</span></button>`,
    )
    .join('');
}
const wave = Array.from(
  { length: 92 },
  (_, i) =>
    `<i style="--ac-wave:${(0.15 + Math.abs(Math.sin(i * 9.1) * Math.cos(i * 3.1)) * 0.85).toFixed(2)};--ac-beat:${(i % 9) * -0.087}s"></i>`,
).join('');
function words(sample: string) {
  const tokens = sample.match(/\S+\s*/g) ?? [];
  const groups: string[] = [];
  for (let i = 0; i < tokens.length; i += 2) groups.push(tokens.slice(i, i + 2).join(''));
  return groups;
}

export function render(input: unknown = defaults, id = instance()): string {
  const s = resolveSettings(input),
    key = 'ac-' + Array.from(id, (c) => c.codePointAt(0)!.toString(16)).join('-');
  const choices = (Object.keys(models) as Model[])
    .map(
      (name) =>
        `<button type="button" role="menuitemradio" data-ac-choice="${name}" aria-checked="${name === s.model}"><span>${models[name][0]}</span><small>${models[name][1]}</small>${icon('check')}</button>`,
    )
    .join('');
  return `<section class="ac-stage" data-ac-root data-theme="${s.theme}" data-paper="${s.paperPalette}" data-card-finish="${s.cardFinish}" data-ac-mode="open" data-fan="true" style="${Object.entries(
    surface(s),
  )
    .map(([k, v]) => k + ':' + v)
    .join(';')}"><div class="ac-row">
    <div class="ac-field"><div class="ac-deck-clip"><div class="ac-deck" data-ac-deck id="${key}-deck">${cards(s, key)}</div></div>
      <div class="ac-focus-frame"><span class="ac-beam-halo" aria-hidden="true"></span><div class="ac-bar"><div class="ac-input-row" data-ac-typer>
        <button type="button" class="ac-icon ac-toggle" data-ac-toggle aria-label="Toggle actions" aria-expanded="true" aria-controls="${key}-deck">${icon('plus')}</button>
        <button type="button" class="ac-chip" data-ac-chip aria-label="Remove selected action" hidden><span data-ac-chip-label></span>${icon('cross')}</button>
        <textarea wrap="off" data-ac-prompt aria-label="Prompt" enterkeyhint="${s.submitOnEnter ? 'send' : 'enter'}" placeholder="${safe(s.placeholder)}" rows="1"></textarea>
        <div class="ac-model-wrap"><button class="ac-model" data-ac-model type="button" aria-label="Choose model, ${models[s.model][0]}" aria-haspopup="menu" aria-expanded="false" aria-controls="${key}-menu">${icon('model')}<span data-ac-model-name>${models[s.model][0]}</span>${icon('caret')}</button><div class="ac-menu" id="${key}-menu" role="menu" aria-label="Model" hidden><span class="ac-menu-heading" aria-hidden="true">Model</span>${choices}</div></div>
        <button type="button" class="ac-icon ac-voice" data-ac-mic aria-label="Record a voice draft">${icon('mic')}</button>
        <button type="button" class="ac-send" data-ac-send aria-label="Send prompt" disabled>${icon('send')}</button>
      </div><div class="ac-record" data-ac-record hidden><i class="ac-live-dot" aria-hidden="true"></i><time data-ac-time>0:00</time><div class="ac-wave" aria-hidden="true">${wave}</div><button type="button" class="ac-icon" data-ac-cancel aria-label="Cancel recording">${icon('cross')}</button><button type="button" class="ac-stop" data-ac-stop aria-label="Stop recording">${icon('stop')}</button></div></div></div>
    </div><span class="ac-status" data-ac-status role="status"></span>
  </div></section>`;
}
export function mount(
  host: HTMLElement,
  input: unknown = defaults,
  id = instance(),
  options: MountOptions = {},
): Controller {
  let settings = resolveSettings(input);
  const doc = host.ownerDocument,
    win = doc.defaultView!;
  host.innerHTML = render(settings, id);
  const root = host.querySelector<HTMLElement>('[data-ac-root]')!;
  const get = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const prompt = get<HTMLTextAreaElement>('[data-ac-prompt]'),
    chip = get<HTMLButtonElement>('[data-ac-chip]'),
    toggle = get<HTMLButtonElement>('[data-ac-toggle]');
  const mic = get<HTMLButtonElement>('[data-ac-mic]'),
    send = get<HTMLButtonElement>('[data-ac-send]'),
    stop = get<HTMLButtonElement>('[data-ac-stop]'),
    cancel = get<HTMLButtonElement>('[data-ac-cancel]');
  const trigger = get<HTMLButtonElement>('[data-ac-model]'),
    menu = get<HTMLElement>('[role=menu]'),
    clock = get<HTMLElement>('[data-ac-time]'),
    status = get<HTMLElement>('[data-ac-status]');
  const cards = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-ac-action]')),
    choices = Array.from(menu.querySelectorAll<HTMLButtonElement>('[data-ac-choice]'));
  const media = win.matchMedia?.('(prefers-reduced-motion: reduce)'),
    abort = new win.AbortController(),
    opt = { signal: abort.signal };
  let fan = true,
    action: Action | null = null,
    model = settings.model,
    phase: 'typing' | 'recording' | 'transcribing' = 'typing';
  let paused = false,
    destroyed = false,
    visible = true,
    previousFan = true,
    priorDraft = '',
    elapsed = 0,
    started = 0,
    timer = 0,
    beat = 0;
  let beats = words(settings.voiceSample);
  const suspended = () => paused || destroyed || !visible || doc.hidden;
  const focus = (el: HTMLElement) => el.focus({ preventScroll: true });
  function focusChoice(choice: HTMLButtonElement) {
    focus(choice);
    const item = choice.getBoundingClientRect();
    const bounds = menu.getBoundingClientRect();
    if (item.bottom > bounds.bottom) menu.scrollTop += item.bottom - bounds.bottom;
    else if (item.top < bounds.top) menu.scrollTop -= bounds.top - item.top;
  }
  function menuState(open: boolean, restore = false) {
    menu.hidden = !open;
    menu.inert = !open;
    trigger.setAttribute('aria-expanded', String(open));
    if (open) focusChoice(choices.find((b) => b.dataset.acChoice === model)!);
    else if (restore) focus(trigger);
  }
  // A damped spring per card carries its velocity through a reversal. Delay only
  // the return sweep and the chosen card on dismissal.
  const fanBodies = cards.map(() => ({ position: 0, velocity: 0, starts: 0, target: 0 }));
  let fanFrame = 0,
    fanTarget = 0,
    fanTime = 0;
  function paintFan(index: number) {
    cards[index].style.setProperty('--ac-fold', fanBodies[index].position.toFixed(5));
  }
  function settleFan() {
    win.cancelAnimationFrame?.(fanFrame);
    fanFrame = 0;
    fanBodies.forEach((body, i) => {
      body.target = fanTarget;
      body.position = fanTarget;
      body.velocity = 0;
      paintFan(i);
    });
  }
  function advanceCard(body: (typeof fanBodies)[number], dt: number) {
    if (dt <= 0) return;
    const omega = (body.target ? 13 : 13.8) * settings.motionSpeed;
    const damping = 0.84 * omega;
    const frequency = Math.sqrt(omega * omega - damping * damping);
    const offset = body.position - body.target;
    const decay = Math.exp(-damping * dt);
    const cos = Math.cos(frequency * dt);
    const sin = Math.sin(frequency * dt);
    const sineAmplitude = (body.velocity + damping * offset) / frequency;
    body.position = body.target + decay * (offset * cos + sineAmplitude * sin);
    body.velocity = decay * (body.velocity * cos - (frequency * offset + damping * sineAmplitude) * sin);
  }
  function tickFan(now: number) {
    fanFrame = 0;
    let moving = false;
    fanBodies.forEach((body, i) => {
      // Brake the outgoing movement while each returning card waits its turn.
      const handoff = Math.min(now, Math.max(fanTime, body.starts));
      const waiting = (handoff - fanTime) / 1000;
      if (fanTarget === 0 && waiting > 0) {
        const drag = 95 * settings.motionSpeed;
        const remaining = Math.exp(-drag * waiting);
        body.position += body.velocity * (1 - remaining) / drag;
        body.velocity *= remaining;
      } else advanceCard(body, waiting);
      if (now >= body.starts) body.target = fanTarget;
      advanceCard(body, (now - handoff) / 1000);
      if (
        body.target === fanTarget &&
        Math.abs(body.position - fanTarget) < 0.0005 &&
        Math.abs(body.velocity) < 0.02
      ) {
        body.position = fanTarget;
        body.velocity = 0;
      } else moving = true;
      paintFan(i);
    });
    fanTime = now;
    if (moving) fanFrame = win.requestAnimationFrame(tickFan);
  }
  function positionFan(open: boolean) {
    const next = open ? 0 : 1;
    if (suspended() || media?.matches || !win.requestAnimationFrame) {
      fanTarget = next;
      settleFan();
      return;
    }
    if (next === fanTarget) return;
    const now = win.performance.now();
    fanTarget = next;
    fanBodies.forEach((body, i) => {
      const picked = action;
      const closeDelay = cards[i].dataset.acAction === picked ? 60 : 0;
      const delay = open ? 40 + settings.fanStagger * i : closeDelay;
      body.starts = now + delay / settings.motionSpeed;
    });
    if (!fanFrame) {
      fanTime = now;
      fanFrame = win.requestAnimationFrame(tickFan);
    }
  }
  function sync() {
    const locked = paused || destroyed,
      busy = phase !== 'typing',
      recording = phase === 'recording';
    root.dataset.acMode = busy ? phase : fan ? 'open' : 'compose';
    root.toggleAttribute('data-suspended', suspended());
    root.dataset.fan = String(fan && !busy);
    if (!fan || busy) highlightCard(-1);
    positionFan(fan && !busy);
    get<HTMLElement>('[data-ac-typer]').hidden = recording;
    get<HTMLElement>('[data-ac-record]').hidden = !recording;
    chip.hidden = !action;
    chip.disabled = locked || busy;
    get<HTMLElement>('[data-ac-chip-label]').textContent = action
      ? settings.actionLabels[keys.indexOf(action)]
      : '';
    prompt.placeholder = action ? actions[action].hint : settings.placeholder;
    prompt.disabled = locked;
    prompt.readOnly = busy;
    send.disabled = locked || busy || !prompt.value.trim();
    stop.disabled = cancel.disabled = locked || !recording;
    mic.disabled = toggle.disabled = trigger.disabled = locked || busy;
    for (const card of cards) card.disabled = locked || busy || !fan;
    toggle.setAttribute('aria-expanded', String(fan && !busy));
    get<HTMLElement>('[data-ac-model-name]').textContent = models[model][0];
    trigger.setAttribute('aria-label', 'Choose model, ' + models[model][0]);
    for (const choice of choices)
      choice.setAttribute('aria-checked', String(choice.dataset.acChoice === model));
  }
  function stopClock() {
    win.clearTimeout(timer);
    timer = 0;
    if (started) {
      elapsed += win.performance.now() - started;
      started = 0;
    }
  }
  function progress() {
    if (suspended()) return;
    if (phase === 'recording') {
      if (!started) started = win.performance.now();
      const secs = Math.floor((elapsed + win.performance.now() - started) / 1000);
      clock.textContent = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
      timer = win.setTimeout(progress, 230);
    } else if (phase === 'transcribing') {
      const instant = media?.matches || !media;
      beat = instant ? beats.length : Math.min(beats.length, beat + 1);
      prompt.value = (priorDraft ? priorDraft + '\n' : '') + beats.slice(0, beat).join('').trimEnd();
      if (beat === beats.length) {
        phase = 'typing';
        status.textContent = 'Voice draft ready';
        sync();
        focus(prompt);
      } else timer = win.setTimeout(progress, 95);
    }
  }
  function record() {
    if (phase !== 'typing') return;
    previousFan = fan;
    priorDraft = prompt.value;
    fan = false;
    phase = 'recording';
    elapsed = 0;
    clock.textContent = '0:00';
    menuState(false);
    status.textContent = 'Demo recording started';
    sync();
    focus(stop);
    progress();
  }
  function cancelRecording() {
    stopClock();
    phase = 'typing';
    fan = previousFan;
    prompt.value = priorDraft;
    status.textContent = 'Recording canceled';
    sync();
    focus(prompt);
  }
  function transcribe() {
    stopClock();
    phase = 'transcribing';
    beat = 0;
    beats = words(settings.voiceSample);
    status.textContent = 'Writing voice draft';
    sync();
    focus(prompt);
    progress();
  }
  function submit() {
    if (send.disabled) return;
    const detail: SendDetail = { text: prompt.value.trim(), action, intent: action ? actions[action].intent : null, model };
    prompt.value = '';
    action = null;
    fan = true;
    status.textContent = 'Prompt sent';
    sync();
    focus(prompt);
    host.dispatchEvent(new win.CustomEvent('action-composer-send', { bubbles: true, detail }));
    options.onSend?.(detail);
  }
  function toggleMenu() {
    menuState(Boolean(menu.hidden));
  }
  function refreshActivity() {
    stopClock();
    sync();
    progress();
  }
  function highlightCard(index: number) {
    cards.forEach((card, i) => {
      const offset = i - index;
      if (index < 0) delete card.dataset.pose;
      else card.dataset.pose = offset === 0 ? 'lift' : (offset < 0 ? 'left' : 'right') + (Math.abs(offset) === 1 ? '-near' : '');
    });
  }
  cards.forEach((card, index) => {
    card.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' && !card.disabled) highlightCard(index);
    }, opt);
    card.addEventListener('focus', () => highlightCard(index), opt);
    card.addEventListener('blur', () => highlightCard(-1), opt);
  });
  get<HTMLElement>('.ac-deck').addEventListener('pointerleave', () => {
    highlightCard(cards.findIndex(card => card === doc.activeElement));
  }, opt);
  for (const card of cards)
    card.addEventListener(
      'click',
      () => {
        const key = card.dataset.acAction as Action;
        menuState(false);
        action = key;
        fan = false;
        sync();
        focus(prompt);
      },
      opt,
    );
  for (const choice of choices)
    choice.addEventListener(
      'click',
      () => {
        model = choice.dataset.acChoice as Model;
        sync();
        menuState(false, true);
      },
      opt,
    );
  toggle.addEventListener(
    'click',
    () => {
      fan = !fan;
      sync();
    },
    opt,
  );
  chip.addEventListener(
    'click',
    () => {
      action = null;
      fan = true;
      sync();
      focus(prompt);
    },
    opt,
  );
  trigger.addEventListener('click', toggleMenu, opt);
  trigger.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        menuState(true);
      }
    },
    opt,
  );
  root.addEventListener(
    'keydown',
    (e) => {
      if (phase === 'recording' && e.key === 'Escape') {
        e.preventDefault();
        cancelRecording();
        return;
      }
      if (menu.hidden) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        menuState(false, true);
      } else if (e.key === 'Tab') menuState(false);
      else if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        const i = choices.indexOf(doc.activeElement as HTMLButtonElement);
        const next =
          e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? choices.length - 1
              : (i + (e.key === 'ArrowUp' ? -1 : 1) + choices.length) % choices.length;
        focusChoice(choices[next]);
      }
    },
    opt,
  );
  doc.addEventListener(
    'pointerdown',
    (e) => {
      if (!menu.hidden && !trigger.parentElement!.contains(e.target as Node)) menuState(false);
    },
    opt,
  );
  mic.addEventListener('click', record, opt);
  stop.addEventListener('click', transcribe, opt);
  cancel.addEventListener('click', cancelRecording, opt);
  send.addEventListener('click', submit, opt);
  prompt.addEventListener('input', sync, opt);
  prompt.addEventListener(
    'keydown',
    (e) => {
      if (
        settings.submitOnEnter &&
        e.key === 'Enter' &&
        !e.shiftKey &&
        !e.isComposing &&
        e.keyCode !== 229
      ) {
        e.preventDefault();
        submit();
      }
    },
    opt,
  );
  doc.addEventListener('visibilitychange', refreshActivity, opt);
  media?.addEventListener('change', refreshActivity, opt);
  const observer = win.IntersectionObserver
    ? new win.IntersectionObserver(([entry]) => {
        if (visible === entry.isIntersecting) return;
        visible = entry.isIntersecting;
        refreshActivity();
      })
    : undefined;
  observer?.observe(root);
  sync();
  return {
    update(value) {
      const given = object(value);
      const next = resolveSettings({ ...settings, ...given });
      if (destroyed) return;
      if (Object.hasOwn(given, 'model')) model = next.model;
      settings = next;
      root.dataset.theme = settings.theme;
      root.dataset.paper = settings.paperPalette;
      root.dataset.cardFinish = settings.cardFinish;
      prompt.setAttribute('enterkeyhint', settings.submitOnEnter ? 'send' : 'enter');
      Object.entries(surface(settings)).forEach(([k, v]) => root.style.setProperty(k, v));
      cards.forEach((card, i) => {
        const face = card.querySelector<HTMLElement>('.ac-card-face')!;
        for (const [property, value] of Object.entries(artworkStyle(settings, keys[i]))) face.style.setProperty(property, value);
        card.setAttribute('aria-label', settings.actionLabels[i]);
        card.querySelector('.ac-card-label')!.textContent = settings.actionLabels[i];
      });
      sync();
    },
    pause() {
      paused = true;
      menuState(false);
      refreshActivity();
    },
    resume() {
      if (destroyed || !paused) return;
      paused = false;
      refreshActivity();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopClock();
      phase = 'typing';
      menuState(false);
      abort.abort();
      observer?.disconnect();
      sync();
    },
  };
}
