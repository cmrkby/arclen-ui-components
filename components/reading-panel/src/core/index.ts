import manifest from '../../component.json';
import { lensImages } from './lens';

export interface Settings {
  background: 'gradient' | 'coastal';
  backgroundGlow: number;
  darkGlassTint: string;
  darkTintStrength: number;
  darkRimBrightness: number;
  darkBevelWidth: number;
  darkBevelTaper: number;
  darkToolbarTransmission: number;
  coverWidth: number;
  coverHeight: number;
  coverTitleSize: number;
  coverTitleWidth: number;
  coverTitleTop: number;
  excerptSize: number;
  excerptLeading: number;
  excerptInset: number;
  coverBlur: number;
  sheetBlur: number;
  frostBlur: number;
  frostSaturation: number;
  rimStrength: number;
  veilStrength: number;
  coverTopFade: number;
  coverBottomFade: number;
  sheetHeight: number;
  readerTopFade: number;
  readerBottomFade: number;
  headerTitleSize: number;
  bylineSize: number;
  bodyTopInset: number;
  bodySideInset: number;
  bodyBottomInset: number;
  dropCapSize: number;
  sectionLabelSize: number;
  openWidth: number;
  openHeight: number;
  openOffset: number;
  openTextSize: number;
  openIconSize: number;
  closeSize: number;
  closeIconSize: number;
  controlStroke: number;
  toolbarWidth: number;
  toolbarHeight: number;
  toolbarOffset: number;
  typeButtonSize: number;
  meterWidth: number;
  meterHeight: number;
  progressSize: number;
  barBase: string;
  barHighlight: string;
  barShine: number;
  barShineWidth: number;
  barAngle: number;
  openDuration: number;
  closeDuration: number;
  chromeDelay: number;
  storyDelay: number;
  markerDuration: number;
  sectionLabel: string;
  lightPaper: string;
  darkPaper: string;
  lightInk: string;
  darkInk: string;
  lightQuiet: string;
  darkQuiet: string;
  lightBase: string;
  darkBase: string;
  lightMistA: string;
  darkMistA: string;
  lightMistB: string;
  darkMistB: string;
  lightMistC: string;
  darkMistC: string;
  byline: string;
  openLabel: string;
  glassMode: 'refracted' | 'frosted';
  glassStrength: number;
  cornerRadius: number;
  paragraphSpacing: number;
  readingMeasure: number;
  paperOpacity: number;
  accent: string;
  typeface: 'geist-serif' | 'editorial' | 'book' | 'sans';
  fontSize: number;
  lineHeight: number;
  readerWidth: number;
  motionSpeed: number;
  theme: 'light' | 'dark';
  fill: boolean;
  title: string;
  passages: string[];
}
export interface MountOptions {
  onOpenChange?: (open: boolean) => void;
}
export interface Controller {
  update(input: unknown): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}

export const defaults = Object.freeze(
  Object.fromEntries(manifest.settings.map((item) => [item.key, item.default])),
) as Readonly<Settings>;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError('Expected reader settings');
  return value as Record<string, unknown>;
}
export function discardLegacyDialFinish(settings: Record<string, unknown>) {
  for (const key of ['dialBase', 'dialHighlight', 'dialShine', 'dialShineWidth', 'dialAngle', 'dialColor']) delete settings[key];
}
export function resolveSettings(input: unknown = defaults): Settings {
  const given = { ...object(input) };
  discardLegacyDialFinish(given);
  if (Object.keys(given).some((key) => !Object.hasOwn(defaults, key)))
    throw new TypeError('Unknown reader setting');
  const values: Record<string, unknown> = { ...defaults, ...given };
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
const safe = (text: string) => text.replace(/[&<>"']/g, (char) => entities[char]);
const session = Math.random().toString(36).slice(2);
let serial = 0;
const instance = () => session + '-' + ++serial;
function metalGradient(base: string, highlight: string, shine: number, width: number, angle: number) {
  if (shine === 0) return base;
  const peak = 42;
  const start = peak * (1 - width / 100);
  const end = peak + (100 - peak) * width / 100;
  const reflection = `color-mix(in srgb, ${highlight} ${shine}%, ${base})`;
  return `linear-gradient(${angle}deg, ${base} ${start}%, ${reflection} ${peak}%, ${base} ${end}%)`;
}
function surface(settings: Settings) {
  return {
    '--rp-night-tint': settings.darkGlassTint,
    '--rp-night-tint-strength': settings.darkTintStrength + '%',
    '--rp-bevel-width': settings.darkBevelWidth + 'px',
    '--rp-bevel-taper': settings.darkBevelTaper + '%',
    '--rp-night-rim': String(settings.darkRimBrightness / 100),
    '--rp-toolbar-transmission': String(settings.darkToolbarTransmission / 100),
    '--rp-background-glow': String(settings.backgroundGlow / 100),
    '--rp-cover-width': settings.coverWidth + 'px',
    '--rp-cover-height': settings.coverHeight + 'px',
    '--rp-cover-title-size': settings.coverTitleSize + 'px',
    '--rp-cover-title-width': settings.coverTitleWidth + 'px',
    '--rp-cover-title-top': settings.coverTitleTop + 'px',
    '--rp-excerpt-size': settings.excerptSize + 'px',
    '--rp-excerpt-leading': settings.excerptLeading + 'px',
    '--rp-excerpt-inset': settings.excerptInset + 'px',
    '--rp-cover-blur': settings.coverBlur + 'px',
    '--rp-sheet-blur': settings.sheetBlur + 'px',
    '--rp-frost-blur': settings.frostBlur + 'px',
    '--rp-frost-saturation': String(settings.frostSaturation),
    '--rp-rim-strength': String(settings.rimStrength),
    '--rp-veil-strength': String(settings.veilStrength),
    '--rp-cover-top-fade': settings.coverTopFade + 'px',
    '--rp-cover-bottom-fade': settings.coverBottomFade + 'px',
    '--rp-sheet-height': settings.sheetHeight + 'px',
    '--rp-reader-top-fade': settings.readerTopFade + 'px',
    '--rp-reader-bottom-fade': settings.readerBottomFade + 'px',
    '--rp-header-title-size': settings.headerTitleSize + 'px',
    '--rp-byline-size': settings.bylineSize + 'px',
    '--rp-body-top-inset': settings.bodyTopInset + 'px',
    '--rp-body-side-inset': settings.bodySideInset + '%',
    '--rp-body-bottom-inset': settings.bodyBottomInset + 'px',
    '--rp-drop-cap-size': settings.dropCapSize + 'em',
    '--rp-section-label-size': settings.sectionLabelSize + 'px',
    '--rp-open-width': settings.openWidth + 'px',
    '--rp-open-height': settings.openHeight + 'px',
    '--rp-open-offset': settings.openOffset + 'px',
    '--rp-open-text-size': settings.openTextSize + 'px',
    '--rp-open-icon-size': settings.openIconSize + 'px',
    '--rp-close-size': settings.closeSize + 'px',
    '--rp-close-icon-size': settings.closeIconSize + 'px',
    '--rp-control-stroke': String(settings.controlStroke),
    '--rp-toolbar-width': settings.toolbarWidth + 'px',
    '--rp-toolbar-height': settings.toolbarHeight + 'px',
    '--rp-toolbar-offset': settings.toolbarOffset + 'px',
    '--rp-type-button-size': settings.typeButtonSize + 'px',
    '--rp-bar-finish': metalGradient(settings.barBase, settings.barHighlight, settings.barShine, settings.barShineWidth, settings.barAngle),
    '--rp-meter-width': settings.meterWidth + 'px',
    '--rp-meter-height': settings.meterHeight + 'px',
    '--rp-progress-size': settings.progressSize + 'px',
    '--rp-chrome-delay': settings.chromeDelay + 'ms',
    '--rp-story-delay': settings.storyDelay + 'ms',
    '--rp-marker-duration': settings.markerDuration + 'ms',
    '--rp-paper': settings.theme === 'dark' ? settings.darkPaper : settings.lightPaper,
    '--rp-ink': settings.theme === 'dark' ? settings.darkInk : settings.lightInk,
    '--rp-quiet': settings.theme === 'dark' ? settings.darkQuiet : settings.lightQuiet,
    '--rp-base': settings.theme === 'dark' ? settings.darkBase : settings.lightBase,
    '--rp-mist-a': settings.theme === 'dark' ? settings.darkMistA : settings.lightMistA,
    '--rp-mist-b': settings.theme === 'dark' ? settings.darkMistB : settings.lightMistB,
    '--rp-mist-c': settings.theme === 'dark' ? settings.darkMistC : settings.lightMistC,
    '--rp-strength': String(settings.glassStrength / 100),
    '--rp-radius': settings.cornerRadius + 'px',
    '--rp-paragraph-gap': settings.paragraphSpacing + 'em',
    '--rp-measure': settings.readingMeasure + 'px',
    '--rp-paper-alpha': settings.paperOpacity + '%',
    '--rp-glass-accent': settings.accent,
    '--rp-leading': String(settings.lineHeight),
    '--rp-initial-size': settings.fontSize + 'px',
    '--rp-reader-width': settings.readerWidth + 'px',
    '--rp-motion-rate': String(settings.motionSpeed),
    '--rp-typeface': {
      'geist-serif': '"Geist Serif", Georgia, serif',
      editorial: 'Georgia, serif',
      book: '"Times New Roman", Times, serif',
      sans: 'Geist, system-ui, sans-serif',
    }[settings.typeface],
  };
}
// Lucide outline icons. See assets/Lucide-LICENSE.txt.
const openIcon = '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>';
const closeIcon = '<svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
function displacement(strength: number, channel: number) {
  return ((strength / 100) * (23 - channel * 2.5)).toFixed(2);
}
function lensDimensions(settings: Settings): [number, number][] {
  return [[settings.openWidth, settings.openHeight], [settings.closeSize, settings.closeSize], [settings.toolbarWidth, settings.toolbarHeight]];
}
function lensCenterBlur(settings: Settings, index: number) {
  if (settings.theme === 'light') return '1.6';
  return index === 2 ? (2.2 * (1 - settings.darkToolbarTransmission / 100)).toFixed(2) : '0.7';
}
function lenses(key: string, settings: Settings) {
  const dimensions = lensDimensions(settings);
  const strength = settings.glassStrength;
  return (
    '<svg class="rp-filters" aria-hidden="true" width="0" height="0"><defs>' +
    lensImages
      .map((image, i) => {
        const [width, height] = dimensions[i]!;
        const split = ['1 0 0', '0 1 0', '0 0 1']
          .map((_, channel) => {
            const matrix = Array.from({ length: 4 }, (_, row) =>
              Array.from({ length: 5 }, (_, col) =>
                row === col && (row === channel || row === 3) ? '1' : '0',
              ).join(' '),
            ).join(' ');
            return `<feDisplacementMap in="base" in2="rim" data-channel="${channel}" scale="${displacement(strength, channel)}" xChannelSelector="R" yChannelSelector="G" result="b${channel}"/><feColorMatrix in="b${channel}" values="${matrix}" result="c${channel}"/>`;
          })
          .join('');
        return `<filter id="${key}-lens${i}" filterUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation=".28" result="base"/><feImage href="${image}" width="${width}" height="${height}" preserveAspectRatio="none" result="rim"/>${split}<feBlend in="c0" in2="c1" mode="screen" result="two"/><feBlend in="two" in2="c2" mode="screen" result="refracted"/><feColorMatrix in="rim" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 3 0 -1.8" result="coverage"/><feComposite in="refracted" in2="coverage" operator="in" result="bevel"/><feGaussianBlur in="SourceGraphic" stdDeviation="${lensCenterBlur(settings, i)}" result="polished"/><feComposite in="bevel" in2="polished" operator="over"/></filter>`;
      })
      .join('') +
    '</defs></svg>'
  );
}
function story(settings: Settings, compact: boolean) {
  const middle = Math.floor(settings.passages.length / 2);
  const start = compact ? Math.max(0, middle - 3) : 0;
  const passages = compact ? settings.passages.slice(start, middle + 1) : settings.passages;
  return passages
    .map((paragraph, index) => {
      // End a long excerpt on a complete sentence within its middle passage.
      const boundary = compact && settings.passages.length > 4 && index === passages.length - 1;
      const text = boundary
        ? (paragraph.match(/^[\s\S]*?[.!?](?=\s|$)[\s\S]*?[.!?](?=\s|$)/)?.[0] ?? paragraph)
        : paragraph;
      return `<p data-rp-paragraph="${index + start}"><span>${safe(text)}</span></p>`;
    })
    .join('');
}
function veils() {
  return ['top', 'bottom']
    .map((edge) => `<div class="rp-veil rp-${edge}" aria-hidden="true"><i></i><i></i><i></i></div>`)
    .join('');
}
export function render(input: unknown = defaults, id = instance()): string {
  const settings = resolveSettings(input);
  const key = 'rp-' + Array.from(id, (c) => c.codePointAt(0)!.toString(16)).join('-');
  return `<section class="rp-stage" data-rp-root data-background="${settings.background}" data-theme="${settings.theme}" data-fill="${settings.fill}" data-phase="compact" data-glass="${settings.glassMode}" style="${safe(
    Object.entries(surface(settings))
      .map(([k, v]) => k + ':' + v)
      .join(';'),
  )};--rp-lens0:url(#${key}-lens0);--rp-lens1:url(#${key}-lens1);--rp-lens2:url(#${key}-lens2)">
    ${lenses(key, settings)}<div class="rp-weather" aria-hidden="true"></div>
    <article class="rp-leaf" data-rp-card><div class="rp-scroll rp-excerpt" data-rp-excerpt tabindex="0" aria-label="Scrollable excerpt">${story(settings, true)}</div>
      ${veils()}<h2 class="rp-cover-title">${safe(settings.title)}</h2>
      <button class="rp-lens rp-open" type="button" data-rp-open aria-label="Open reader" aria-haspopup="dialog" aria-controls="${key}-reader"><b data-rp-open-label>${safe(settings.openLabel)}</b> <span aria-hidden="true">${openIcon}</span></button>
    </article>
    <dialog class="rp-overlay" data-rp-dialog tabindex="-1" id="${key}-reader" aria-modal="true" aria-labelledby="${key}-title">
      <article class="rp-sheet" data-rp-sheet>
        <div class="rp-scroll rp-story" data-rp-expanded tabindex="0" aria-label="Full article"><div class="rp-column"><div class="rp-section-label">${safe(settings.sectionLabel)}</div>${story(settings, false)}<div class="rp-end" aria-hidden="true">◇</div></div></div>
        ${veils()}<header class="rp-mast"><h2 id="${key}-title">${safe(settings.title)}</h2><small data-rp-byline>${safe(settings.byline)}</small></header>
        <button class="rp-lens rp-close" type="button" data-rp-close aria-label="Close reader">${closeIcon}</button>
        <div class="rp-lens rp-tools" role="group" aria-label="Reading controls"><button type="button" data-rp-smaller aria-label="Smaller text">A</button><button type="button" data-rp-larger aria-label="Larger text">A</button><div class="rp-meter"><progress data-rp-progress aria-label="Reading progress" max="100" value="0"></progress><output data-rp-percent aria-label="Percent read">0%</output></div></div>
      </article>
    </dialog></section>`;
}

interface Anchor {
  passage: number;
  character: number;
  offset: number;
}
function characterTop(node: Text, offset: number) {
  const range = node.ownerDocument.createRange();
  range.setStart(node, offset);
  range.setEnd(node, Math.min(offset + 1, node.length));
  return range.getBoundingClientRect?.().top;
}
function readingLine(view: HTMLElement) {
  return view.getBoundingClientRect().top + Math.min(view.clientHeight * 0.41, 170);
}
function capture(view: HTMLElement): Anchor {
  const paragraphs = Array.from(view.querySelectorAll<HTMLElement>('[data-rp-paragraph]'));
  const y = readingLine(view);
  const p =
    paragraphs.find((item) => item.getBoundingClientRect().bottom > y) ??
    paragraphs[paragraphs.length - 1];
  const node = p.firstElementChild?.firstChild as Text | null;
  let start = 0,
    end = node?.length ?? 0;
  while (node && end - start > 1) {
    const mid = Math.floor((start + end) / 2);
    if ((characterTop(node, mid) ?? y) < y) start = mid;
    else end = mid;
  }
  return {
    passage: Number(p.dataset.rpParagraph),
    character: start,
    offset: node ? (characterTop(node, start) ?? y) - y : 0,
  };
}
function place(view: HTMLElement, anchor: Anchor) {
  const paragraphs = Array.from(view.querySelectorAll<HTMLElement>('[data-rp-paragraph]'));
  const exact = paragraphs.find((item) => Number(item.dataset.rpParagraph) === anchor.passage);
  if (!exact) {
    view.scrollTop = anchor.passage < Number(paragraphs[0].dataset.rpParagraph) ? 0 : view.scrollHeight;
    return;
  }
  const node = exact.firstElementChild?.firstChild as Text | null;
  if (node)
    view.scrollTop +=
      (characterTop(node, Math.min(node.length, anchor.character)) ?? readingLine(view)) -
      readingLine(view) -
      anchor.offset;
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
  const root = host.querySelector<HTMLElement>('[data-rp-root]')!;
  const get = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const card = get<HTMLElement>('[data-rp-card]'),
    excerpt = get<HTMLElement>('[data-rp-excerpt]'),
    expanded = get<HTMLElement>('[data-rp-expanded]');
  const dialog = get<HTMLDialogElement>('[data-rp-dialog]'),
    sheet = get<HTMLElement>('[data-rp-sheet]');
  const opener = get<HTMLButtonElement>('[data-rp-open]'),
    closer = get<HTMLButtonElement>('[data-rp-close]');
  const larger = get<HTMLButtonElement>('[data-rp-larger]'),
    smaller = get<HTMLButtonElement>('[data-rp-smaller]');
  const percent = get<HTMLOutputElement>('[data-rp-percent]'),
    meter = get<HTMLProgressElement>('[data-rp-progress]');
  const media = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const abort = new win.AbortController(),
    opt = { signal: abort.signal };
  let active = false,
    paused = false,
    destroyed = false,
    visible = true,
    size = settings.fontSize;
  let entryAnchor: Anchor | undefined;
  let stableAnchor: Anchor | undefined;
  let pinned: { anchor: Anchor; top: number } | undefined;
  let sizePending = false;
  let closedAt: { anchor: Anchor; scroll: number } | undefined;
  let motion: Animation | undefined,
    marker: HTMLElement | null = null,
    markerTimer = 0,
    frame = 0,
    typeFrame = 0;
  const focus = (target: HTMLElement) => target.focus({ preventScroll: true });
  function updateProgress() {
    frame = 0;
    const max = expanded.scrollHeight - expanded.clientHeight;
    const anchor =
      pinned && Math.abs(expanded.scrollTop - pinned.top) < 1 ? pinned.anchor : capture(expanded);
    const progressBefore = settings.passages
      .slice(0, anchor.passage)
      .reduce((sum, p) => sum + p.length, 0);
    const total = settings.passages.reduce((sum, p) => sum + p.length, 0);
    const location = (100 * (progressBefore + anchor.character)) / Math.max(1, total);
    const value =
      max <= 0 || expanded.scrollTop >= max - 0.5
        ? 100
        : expanded.scrollTop < 0.5
          ? 0
          : Math.round(location);
    expanded.dataset.rpLocation = anchor.passage + ':' + anchor.character;
    meter.value = value;
    percent.value = value + '%';
    if (root.dataset.phase === 'open' && !sizePending) stableAnchor = anchor;
  }
  function pin(anchor: Anchor) {
    place(expanded, anchor);
    pinned = { anchor, top: expanded.scrollTop };
    stableAnchor = anchor;
  }
  function clearMarker() {
    win.clearTimeout(markerTimer);
    marker?.removeAttribute('data-rp-match');
    marker = null;
  }
  function animate(entering: boolean, settled: () => void, instant = false) {
    // Retarget the in-flight surface from its displayed matrix on immediate reversal.
    const current = motion ? win.getComputedStyle(sheet).transform : '';
    const currentRadius = motion ? win.getComputedStyle(sheet).borderRadius : '';
    motion?.cancel();
    motion = undefined;
    if (instant || !visible || media?.matches || !sheet.animate) {
      settled();
      return;
    }
    const full = sheet.getBoundingClientRect(),
      cover = card.getBoundingClientRect();
    if (!full.width || !full.height) {
      settled();
      return;
    }
    const sx = cover.width / full.width,
      sy = cover.height / full.height;
    const compact = `translate(${cover.left - full.left}px,${cover.top - full.top}px) scale(${sx},${sy})`;
    const identity = 'translate(0px,0px) scale(1,1)';
    const radius = settings.cornerRadius;
    const compactRadius = `${radius / sx}px / ${radius / sy}px`;
    const transition = sheet.animate(
      [
        {
          transform: current || (entering ? compact : identity),
          borderRadius: currentRadius || (entering ? compactRadius : radius + 'px'),
        },
        {
          transform: entering ? identity : compact,
          borderRadius: entering ? radius + 'px' : compactRadius,
        },
      ],
      {
        duration: (entering ? settings.openDuration : settings.closeDuration) / settings.motionSpeed,
        easing: entering ? 'cubic-bezier(.23,.74,.21,1)' : 'cubic-bezier(.37,0,.23,1)',
        fill: 'both',
      },
    );
    motion = transition;
    transition.onfinish = () => {
      if (motion !== transition) return;
      transition.cancel();
      motion = undefined;
      settled();
    };
  }
  function announce() {
    host.dispatchEvent(
      new win.CustomEvent('reading-panel-open-change', { bubbles: true, detail: active }),
    );
    options.onOpenChange?.(active);
  }
  function show() {
    if (active || paused || destroyed) return;
    const anchor =
      closedAt && Math.abs(closedAt.scroll - excerpt.scrollTop) < 1 ? closedAt.anchor : capture(excerpt);
    entryAnchor = anchor;
    stableAnchor = anchor;
    active = true;
    dialog.setAttribute('open', '');
    card.inert = true;
    root.dataset.phase = 'opening';
    pin(anchor);
    clearMarker();
    marker = expanded.querySelector(`[data-rp-paragraph="${anchor.passage}"] span`);
    marker?.setAttribute('data-rp-match', '');
    markerTimer = win.setTimeout(clearMarker, settings.markerDuration);
    updateProgress();
    focus(dialog);
    animate(true, () => {
      root.dataset.phase = 'open';
      pin(anchor);
      updateProgress();
      focus(closer);
    });
    announce();
  }
  function hide(instant = false) {
    if (!dialog.open) return;
    const changed = active;
    if (active) {
      const anchor =
        root.dataset.phase === 'opening' && entryAnchor
          ? entryAnchor
          : pinned && Math.abs(expanded.scrollTop - pinned.top) < 1
            ? pinned.anchor
            : capture(expanded);
      place(excerpt, anchor);
      closedAt = { anchor, scroll: excerpt.scrollTop };
    }
    card.inert = false;
    active = false;
    root.dataset.phase = 'closing';
    clearMarker();
    animate(
      false,
      () => {
        dialog.removeAttribute('open');
        root.dataset.phase = 'compact';
        card.inert = false;
        if (!paused && !destroyed) focus(opener);
      },
      instant,
    );
    if (changed) announce();
  }
  function changeSize(delta: number) {
    if (!active) return;
    const anchor =
      pinned && Math.abs(expanded.scrollTop - pinned.top) < 1 ? pinned.anchor : capture(expanded);
    const scrollRange = expanded.scrollHeight - expanded.clientHeight;
    const atEnd = scrollRange > 0 && expanded.scrollTop >= scrollRange - 0.5;
    const atStart = expanded.scrollTop < 0.5;
    size = Math.max(15, Math.min(29, size + delta));
    expanded.style.setProperty('--rp-size', size + 'px');
    larger.disabled = size >= 29;
    smaller.disabled = size <= 15;
    win.cancelAnimationFrame(typeFrame);
    sizePending = true;
    const started = win.performance.now();
    function track() {
      if (!active || destroyed) {
        sizePending = false;
        return;
      }
      if (atStart || atEnd) {
        expanded.scrollTop = atEnd ? expanded.scrollHeight : 0;
        pinned = undefined;
      } else {
        pin(anchor);
      }
      updateProgress();
      const stillChanging = Math.abs(parseFloat(win.getComputedStyle(expanded).fontSize) - size) > 0.02;
      if (
        !media?.matches &&
        (stillChanging || win.performance.now() - started < 205) &&
        win.performance.now() - started < 850
      )
        typeFrame = win.requestAnimationFrame(track);
      else {
        sizePending = false;
        stableAnchor = atStart || atEnd ? capture(expanded) : anchor;
      }
    }
    track();
  }
  larger.disabled = size >= 29;
  smaller.disabled = size <= 15;
  // Put a complete passage in the cover window, even when the typeface reflows.
  const lead = excerpt.querySelectorAll<HTMLElement>('p');
  const openingPassage = lead[Math.floor(lead.length / 2)];
  if (openingPassage) excerpt.scrollTop = Math.max(0, openingPassage.offsetTop - settings.coverTopFade + settings.excerptLeading);
  opener.addEventListener('click', show, opt);
  closer.addEventListener('click', () => hide(), opt);
  larger.addEventListener('click', () => changeSize(2), opt);
  smaller.addEventListener('click', () => changeSize(-2), opt);
  dialog.addEventListener(
    'click',
    (e) => {
      if (e.target === dialog) hide();
    },
    opt,
  );
  expanded.addEventListener(
    'scroll',
    () => {
      if (!frame && active)
        frame = win.requestAnimationFrame(() => {
          updateProgress();
        });
    },
    opt,
  );
  dialog.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (active) hide();
        return;
      }
      if (e.key !== 'Tab') return;
      const stops = [closer, expanded, smaller, larger].filter(
        (el) => !(el instanceof win.HTMLButtonElement && el.disabled),
      );
      const i = stops.indexOf(doc.activeElement as HTMLElement);
      e.preventDefault();
      focus(stops[(i + (e.shiftKey ? -1 : 1) + stops.length) % stops.length]);
    },
    opt,
  );
  const observer = win.IntersectionObserver
    ? new win.IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        root.toggleAttribute('data-suspended', !visible || paused);
        if (!visible) motion?.finish();
      })
    : undefined;
  observer?.observe(root);
  let previousWidth = 0,
    previousHeight = 0;
  const resize = win.ResizeObserver
    ? new win.ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        if (
          previousWidth &&
          active &&
          root.dataset.phase === 'open' &&
          !sizePending &&
          stableAnchor &&
          (width !== previousWidth || height !== previousHeight)
        ) {
          pin(stableAnchor);
          updateProgress();
        }
        previousWidth = width;
        previousHeight = height;
      })
    : undefined;
  resize?.observe(sheet);
  const filters = Array.from(root.querySelectorAll('filter'));
  const lensElements = [opener, closer, get<HTMLElement>('.rp-tools')];
  function resizeLens(index: number, width: number, height: number) {
    const filter = filters[index]!;
    for (const element of [filter, filter.querySelector('feImage')!]) {
      element.setAttribute('width', String(width));
      element.setAttribute('height', String(height));
    }
  }
  const lensResize = win.ResizeObserver && new win.ResizeObserver(entries => {
    for (const entry of entries) {
      const element = entry.target as HTMLElement;
      if (element.offsetWidth && element.offsetHeight) resizeLens(lensElements.indexOf(element), element.offsetWidth, element.offsetHeight);
    }
  });
  lensElements.forEach(element => lensResize?.observe(element));
  const onPreference = () => {
    if (media?.matches) motion?.finish();
  };
  media?.addEventListener('change', onPreference, opt);
  return {
    update(value) {
      const next = resolveSettings({ ...settings, ...object(value) });
      if (destroyed) return;
      const rewrap =
        next.bodySideInset !== settings.bodySideInset ||
        next.bodyTopInset !== settings.bodyTopInset ||
        next.bodyBottomInset !== settings.bodyBottomInset ||
        next.sectionLabel !== settings.sectionLabel ||
        next.sectionLabelSize !== settings.sectionLabelSize ||
        next.dropCapSize !== settings.dropCapSize ||
        next.readerWidth !== settings.readerWidth ||
        next.sheetHeight !== settings.sheetHeight ||
        next.readingMeasure !== settings.readingMeasure ||
        next.paragraphSpacing !== settings.paragraphSpacing ||
        next.lineHeight !== settings.lineHeight ||
        next.typeface !== settings.typeface;
      const beforeRewrap =
        active && rewrap
          ? pinned && Math.abs(expanded.scrollTop - pinned.top) < 1
            ? pinned.anchor
            : capture(expanded)
          : undefined;
      if (next.theme !== settings.theme || next.darkToolbarTransmission !== settings.darkToolbarTransmission) {
        filters.forEach((filter, i) => {
          filter.querySelector('[result="polished"]')?.setAttribute('stdDeviation', lensCenterBlur(next, i));
        });
      }
      root.dataset.background = next.background;
      root.dataset.theme = next.theme;
      root.dataset.fill = String(next.fill);
      root.dataset.glass = next.glassMode;
      Object.entries(surface(next)).forEach(([key, value]) => root.style.setProperty(key, value));
      const previousDimensions = lensDimensions(settings);
      lensDimensions(next).forEach(([width, height], index) => {
        const [oldWidth, oldHeight] = previousDimensions[index]!;
        if (width !== oldWidth || height !== oldHeight) {
          const element = lensElements[index]!;
          resizeLens(index, element.offsetWidth || width, element.offsetHeight || height);
        }
      });
      get<HTMLElement>('.rp-section-label').textContent = next.sectionLabel;
      if (beforeRewrap) {
        pin(beforeRewrap);
        updateProgress();
      }
      if (next.glassStrength !== settings.glassStrength) {
        root
          .querySelectorAll('[data-channel]')
          .forEach((el) =>
            el.setAttribute(
              'scale',
              displacement(next.glassStrength, Number(el.getAttribute('data-channel'))),
            ),
          );
      }
      get<HTMLElement>('[data-rp-byline]').textContent = next.byline;
      get<HTMLElement>('[data-rp-open-label]').textContent = next.openLabel;
      if (next.fontSize !== settings.fontSize) {
        if (active) changeSize(next.fontSize - size);
        else {
          size = next.fontSize;
          expanded.style.setProperty('--rp-size', size + 'px');
          larger.disabled = size >= 29;
          smaller.disabled = size <= 15;
        }
      }
      if (next.title !== settings.title)
        root.querySelectorAll('h2').forEach((h) => {
          h.textContent = next.title;
        });
      if (
        next.passages.length !== settings.passages.length ||
        next.passages.some((p, i) => p !== settings.passages[i])
      ) {
        clearMarker();
        closedAt = undefined;
        pinned = undefined;
        stableAnchor = undefined;
        excerpt.innerHTML = story(next, true);
        expanded.querySelectorAll('p').forEach((p) => p.remove());
        expanded.querySelector('.rp-end')!.insertAdjacentHTML('beforebegin', story(next, false));
        excerpt.scrollTop = 0;
        expanded.scrollTop = 0;
        updateProgress();
      }
      settings = next;
    },
    pause() {
      paused = true;
      hide(true);
      opener.disabled = true;
      excerpt.tabIndex = -1;
      root.setAttribute('data-suspended', '');
    },
    resume() {
      if (destroyed) return;
      paused = false;
      opener.disabled = false;
      excerpt.tabIndex = 0;
      root.toggleAttribute('data-suspended', !visible);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      hide(true);
      opener.disabled = true;
      card.inert = true;
      root.setAttribute('data-suspended', '');
      abort.abort();
      observer?.disconnect();
      resize?.disconnect();
      lensResize?.disconnect();
      clearMarker();
      win.cancelAnimationFrame(frame);
      win.cancelAnimationFrame(typeFrame);
    },
  };
}
