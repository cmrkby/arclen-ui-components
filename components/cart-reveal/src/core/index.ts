import shoe from '../../assets/relay-trail.webp';
import manifest from '../../component.json';

export interface Settings {
  cardWidth: number;
  framePadding: number;
  lightFrame: string;
  darkFrame: string;
  lightText: string;
  darkText: string;
  mediaHeight: number;
  mediaInsetRadius: number;
  mediaBackground: string;
  imageScale: number;
  imageFocusX: number;
  imageFocusY: number;
  favoriteSize: number;
  favoriteInset: number;
  favoriteIcon: number;
  favoriteFill: string;
  favoriteLightFill: string;
  sparkSize: number;
  sparkReach: number;
  detailsTop: number;
  titleSize: number;
  titleWeight: number;
  brandGap: number;
  brandSize: number;
  priceGap: number;
  priceSize: number;
  priceWeight: number;
  quantityGap: number;
  addSize: number;
  addIcon: number;
  removeSize: number;
  removeIcon: number;
  countSize: number;
  countFont: number;
  buttonFill: string;
  buttonInk: string;
  trackHeight: number;
  trackGap: number;
  trackRadius: number;
  thumbInset: number;
  arrowSize: number;
  trackTextSize: number;
  lightTrack: string;
  darkTrack: string;
  keyboardStep: number;
  receiptTop: number;
  receiptGap: number;
  receiptFont: number;
  receiptBadge: number;
  receiptIcon: number;
  receiptFill: string;
  receiptInk: string;
  subtotalDuration: number;
  textEntranceSpeed: number;
  textStagger: number;
  glowStrength: number;
  glowColor: string;
  confirmHold: number;
  confirmLabel: string;
  receiptText: string;
  showWishlist: boolean;
  theme: 'light' | 'dark';
  radius: number;
  accent: string;
  foldSpeed: number;
  confirmSpeed: number;
  confirmThreshold: number;
  receiptDuration: number;
  title: string;
  brand: string;
  price: number;
  image: string;
  sound: boolean;
}

export interface Confirmation {
  quantity: number;
  total: number;
}

export interface MountOptions {
  paused?: boolean;
  onConfirm?: (confirmation: Confirmation) => void;
}

export interface Controller {
  update(settings: Partial<Settings>): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}

export const defaults = Object.fromEntries(
  manifest.settings.map(({ key, default: value }) => [key, value]),
) as unknown as Settings;

const quantityLimit = 99;
const priceLimit = 100000;
const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const money = (cents: number) =>
  cents % 100
    ? (cents / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })
    : currency.format(cents / 100);
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  );

function label(value: unknown, fallback: string, length: number) {
  return typeof value === 'string'
    ? value.trim().slice(0, length) || fallback
    : fallback;
}

function imageSource(input: unknown): string {
  if (typeof input !== 'string') return '';
  const value = input.trim();
  if (
    !value ||
    value.length > 12_000_000 ||
    /[\\\u0000-\u001f\u007f]/u.test(value)
  )
    return '';
  const webpPrefix = 'data:image/webp;base64,';
  if (value.startsWith(webpPrefix)) {
    const base64 = value.slice(webpPrefix.length);
    if (
      base64.length < 24 ||
      base64.length % 4 === 1 ||
      !/^[A-Za-z0-9+/]+={0,2}$/u.test(base64)
    )
      return '';
    const header = atob(base64.slice(0, 24));
    return header.startsWith('RIFF') && /^WEBPVP8[ LX]/u.test(header.slice(8))
      ? value
      : '';
  }
  if (value.startsWith('//') || /[<>"]/u.test(value)) return '';
  try {
    const url = new URL(value, 'https://local.invalid/');
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      /\.svgz?$/iu.test(decodeURIComponent(url.pathname))
    )
      return '';
    if (/^[a-z][a-z\d+.-]*:/iu.test(value) && !/^https:\/\//iu.test(value))
      return '';
    return value;
  } catch {
    return '';
  }
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
    cardWidth: bounded(raw.cardWidth, defaults.cardWidth, 240, 440),
    framePadding: bounded(raw.framePadding, defaults.framePadding, 4, 28),
    lightFrame: color(raw.lightFrame, defaults.lightFrame),
    darkFrame: color(raw.darkFrame, defaults.darkFrame),
    lightText: color(raw.lightText, defaults.lightText),
    darkText: color(raw.darkText, defaults.darkText),
    mediaHeight: bounded(raw.mediaHeight, defaults.mediaHeight, 152, 360),
    mediaInsetRadius: bounded(raw.mediaInsetRadius, defaults.mediaInsetRadius, 0, 36),
    mediaBackground: color(raw.mediaBackground, defaults.mediaBackground),
    imageScale: bounded(raw.imageScale, defaults.imageScale, 0.65, 1.6),
    imageFocusX: bounded(raw.imageFocusX, defaults.imageFocusX, 0, 100),
    imageFocusY: bounded(raw.imageFocusY, defaults.imageFocusY, 0, 100),
    favoriteSize: bounded(raw.favoriteSize, defaults.favoriteSize, 26, 60),
    favoriteInset: bounded(raw.favoriteInset, defaults.favoriteInset, 0, 24),
    favoriteIcon: bounded(raw.favoriteIcon, defaults.favoriteIcon, 12, 28),
    favoriteFill: color(raw.favoriteFill, defaults.favoriteFill),
    favoriteLightFill: color(raw.favoriteLightFill, defaults.favoriteLightFill),
    sparkSize: bounded(raw.sparkSize, defaults.sparkSize, 2, 10),
    sparkReach: bounded(raw.sparkReach, defaults.sparkReach, 10, 45),
    detailsTop: bounded(raw.detailsTop, defaults.detailsTop, 8, 40),
    titleSize: bounded(raw.titleSize, defaults.titleSize, 14, 30),
    titleWeight: bounded(raw.titleWeight, defaults.titleWeight, 350, 850),
    brandGap: bounded(raw.brandGap, defaults.brandGap, 0, 16),
    brandSize: bounded(raw.brandSize, defaults.brandSize, 10, 20),
    priceGap: bounded(raw.priceGap, defaults.priceGap, 8, 48),
    priceSize: bounded(raw.priceSize, defaults.priceSize, 22, 48),
    priceWeight: bounded(raw.priceWeight, defaults.priceWeight, 350, 900),
    quantityGap: bounded(raw.quantityGap, defaults.quantityGap, 1, 18),
    addSize: bounded(raw.addSize, defaults.addSize, 44, 76),
    addIcon: bounded(raw.addIcon, defaults.addIcon, 16, 36),
    removeSize: bounded(raw.removeSize, defaults.removeSize, 28, 50),
    removeIcon: bounded(raw.removeIcon, defaults.removeIcon, 12, 25),
    countSize: bounded(raw.countSize, defaults.countSize, 18, 32),
    countFont: bounded(raw.countFont, defaults.countFont, 9, 14),
    buttonFill: color(raw.buttonFill, defaults.buttonFill),
    buttonInk: color(raw.buttonInk, defaults.buttonInk),
    trackHeight: bounded(raw.trackHeight, defaults.trackHeight, 44, 72),
    trackGap: bounded(raw.trackGap, defaults.trackGap, 6, 34),
    trackRadius: bounded(raw.trackRadius, defaults.trackRadius, 0, 36),
    thumbInset: bounded(raw.thumbInset, defaults.thumbInset, 2, 8),
    arrowSize: bounded(raw.arrowSize, defaults.arrowSize, 12, 28),
    trackTextSize: bounded(raw.trackTextSize, defaults.trackTextSize, 10, 18),
    lightTrack: color(raw.lightTrack, defaults.lightTrack),
    darkTrack: color(raw.darkTrack, defaults.darkTrack),
    keyboardStep: Math.round(bounded(raw.keyboardStep, defaults.keyboardStep, 5, 50)),
    receiptTop: bounded(raw.receiptTop, defaults.receiptTop, 4, 32),
    receiptGap: bounded(raw.receiptGap, defaults.receiptGap, 0, 20),
    receiptFont: bounded(raw.receiptFont, defaults.receiptFont, 10, 20),
    receiptBadge: bounded(raw.receiptBadge, defaults.receiptBadge, 14, 32),
    receiptIcon: bounded(raw.receiptIcon, defaults.receiptIcon, 8, 18),
    receiptFill: color(raw.receiptFill, defaults.receiptFill),
    receiptInk: color(raw.receiptInk, defaults.receiptInk),
    subtotalDuration: bounded(raw.subtotalDuration, defaults.subtotalDuration, 80, 900),
    textEntranceSpeed: bounded(raw.textEntranceSpeed, defaults.textEntranceSpeed, 0.25, 3),
    textStagger: bounded(raw.textStagger, defaults.textStagger, 0, 200),
    glowStrength: bounded(raw.glowStrength, defaults.glowStrength, 0, 100),
    glowColor: color(raw.glowColor, defaults.glowColor),
    confirmHold: bounded(raw.confirmHold, defaults.confirmHold, 100, 5000),
    confirmLabel: label(raw.confirmLabel, defaults.confirmLabel, 44),
    receiptText: label(raw.receiptText, defaults.receiptText, 64),
    showWishlist:
      typeof raw.showWishlist === 'boolean'
        ? raw.showWishlist
        : defaults.showWishlist,
    theme: raw.theme === 'light' ? 'light' : 'dark',
    radius: bounded(raw.radius, defaults.radius, 6, 56),
    accent: color(raw.accent, defaults.accent),
    foldSpeed: bounded(raw.foldSpeed, defaults.foldSpeed, 0.4, 2),
    confirmSpeed: bounded(raw.confirmSpeed, defaults.confirmSpeed, 0.4, 2),
    confirmThreshold: bounded(
      raw.confirmThreshold,
      defaults.confirmThreshold,
      60,
      100,
    ),
    receiptDuration: bounded(
      raw.receiptDuration,
      defaults.receiptDuration,
      500,
      6000,
    ),
    title: label(raw.title, defaults.title, 90),
    brand: label(raw.brand, defaults.brand, 60),
    price:
      typeof raw.price === 'number' && Number.isFinite(raw.price)
        ? Math.round(clamp(raw.price, 0, priceLimit) * 100) / 100
        : defaults.price,
    image: imageSource(raw.image),
    sound: typeof raw.sound === 'boolean' ? raw.sound : defaults.sound,
  };
}

const fallback = typeof shoe === 'string' ? shoe : shoe.src;
// Lucide outline icons. See assets/Lucide-LICENSE.txt.
const icons = {
  heart: '<path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/>',
  cart: '<path d="m2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18"/><path d="M4.563 5h16.435a1 1 0 0 1 .981 1.204l-1.026 6.226A2 2 0 0 1 18.962 14H6.25"/><circle cx="18" cy="20" r="2"/><circle cx="8" cy="20" r="2"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  minus: '<path d="M5 12h14"/>',
};
const icon = (name: keyof typeof icons) =>
  `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
const sparks = Array.from(
  { length: 8 },
  (_, i) => `<i style="--cr-ray:${i * 45}deg"></i>`,
).join('');

function appearance(s: Settings) {
  return [
    `--cr-radius:${s.radius}px`,
    `--cr-accent:${s.accent}`,
    `--cr-fold:${1 / s.foldSpeed}`,
    `--cr-confirm:${1 / s.confirmSpeed}`,
    `--cr-detail-duration:${480 / s.textEntranceSpeed}ms`,
    `--cr-detail-stagger:${s.textStagger}ms`,
    `--cr-confirm-hold:${s.confirmHold}ms`,
    `--cr-glow-opacity:${s.glowStrength / 100}`,
    `--cr-glow-color:${s.glowColor}`,
    `--cr-card-width:${s.cardWidth}px`,
    `--cr-frame-padding:${s.framePadding}px`,
    `--cr-light-frame:${s.lightFrame}`,
    `--cr-dark-frame:${s.darkFrame}`,
    `--cr-light-text:${s.lightText}`,
    `--cr-dark-text:${s.darkText}`,
    `--cr-media-height:${s.mediaHeight}`,
    `--cr-media-inset-radius:${s.mediaInsetRadius}px`,
    `--cr-media-background:${s.mediaBackground}`,
    `--cr-image-scale:${s.imageScale}`,
    `--cr-image-focus-x:${s.imageFocusX}%`,
    `--cr-image-focus-y:${s.imageFocusY}%`,
    `--cr-favorite-size:${s.favoriteSize}px`,
    `--cr-favorite-inset:${s.favoriteInset}px`,
    `--cr-favorite-icon:${s.favoriteIcon}px`,
    `--cr-favorite-fill:${s.favoriteFill}`,
    `--cr-favorite-light-fill:${s.favoriteLightFill}`,
    `--cr-spark-size:${s.sparkSize}px`,
    `--cr-spark-reach:${s.sparkReach}px`,
    `--cr-details-top:${s.detailsTop}px`,
    `--cr-title-size:${s.titleSize}px`,
    `--cr-title-weight:${s.titleWeight}`,
    `--cr-brand-gap:${s.brandGap}px`,
    `--cr-brand-size:${s.brandSize}px`,
    `--cr-price-gap:${s.priceGap}px`,
    `--cr-price-size:${s.priceSize}px`,
    `--cr-price-weight:${s.priceWeight}`,
    `--cr-quantity-gap:${s.quantityGap}px`,
    `--cr-add-size:${s.addSize}px`,
    `--cr-add-icon:${s.addIcon}px`,
    `--cr-remove-size:${s.removeSize}px`,
    `--cr-remove-icon:${s.removeIcon}px`,
    `--cr-count-size:${s.countSize}px`,
    `--cr-count-font:${s.countFont}px`,
    `--cr-button-fill:${s.buttonFill}`,
    `--cr-button-ink:${s.buttonInk}`,
    `--cr-track-height:${s.trackHeight}px`,
    `--cr-track-gap:${s.trackGap}px`,
    `--cr-track-radius:${s.trackRadius}px`,
    `--cr-thumb-inset:${s.thumbInset}px`,
    `--cr-arrow-size:${s.arrowSize}px`,
    `--cr-track-text-size:${s.trackTextSize}px`,
    `--cr-light-track:${s.lightTrack}`,
    `--cr-dark-track:${s.darkTrack}`,
    `--cr-receipt-top:${s.receiptTop}px`,
    `--cr-receipt-gap:${s.receiptGap}px`,
    `--cr-receipt-font:${s.receiptFont}px`,
    `--cr-receipt-badge:${s.receiptBadge}px`,
    `--cr-receipt-icon:${s.receiptIcon}px`,
    `--cr-receipt-fill:${s.receiptFill}`,
    `--cr-receipt-ink:${s.receiptInk}`,
  ].join(';');
}

function actionName(s: Settings) {
  return s.confirmLabel === defaults.confirmLabel
    ? 'Confirm cart'
    : s.confirmLabel;
}

export function render(input: unknown = {}): string {
  const s = resolveSettings(input);
  return `<div class="cr-layout"><article class="cr-shell" data-cart-reveal data-theme="${s.theme}" data-state="compact" style="${appearance(s)}">
    <span class="cr-success-light" aria-hidden="true"></span>
    <div class="cr-cover">
      <button class="cr-product" type="button" aria-expanded="false" aria-label="View ${escape(s.title)}">
        <img class="cr-photo" src="${escape(s.image || fallback)}" alt="" />
      </button>
      <button type="button" class="cr-favorite"${s.showWishlist ? '' : ' hidden disabled'} aria-pressed="false" aria-label="Save to wishlist">
        <span class="cr-favorite-paint">${icon('heart')}<span aria-hidden="true" class="cr-burst">${sparks}</span></span>
      </button>
    </div>
    <div class="cr-body" aria-hidden="true" inert>
      <div class="cr-details">
        <h3 class="cr-title">${escape(s.title)}</h3><p class="cr-brand">${escape(s.brand)}</p>
        <div class="cr-price-row"><span class="cr-total">${money(Math.round(s.price * 100))}</span>
          <div class="cr-quantity"><button class="cr-step--less" type="button" aria-label="Remove one item">${icon('minus')}</button>
          <button class="cr-step--more" type="button" aria-label="Add one item">${icon('cart')}<span class="cr-count" aria-hidden="true">0</span></button></div>
        </div>
        <div class="cr-track">
          <span class="cr-track-fill" aria-hidden="true"></span>
          <button class="cr-confirm-label" type="button" aria-label="${escape(actionName(s))}">${escape(s.confirmLabel)}</button>
          <button role="slider" class="cr-thumb" type="button" aria-label="${escape(actionName(s))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="Cart is empty" tabindex="-1"><span class="cr-arrow">${icon('arrow')}</span><span class="cr-check">${icon('check')}</span></button>
        </div>
      </div>
    </div>
    <div class="cr-receipt" aria-hidden="true"><div class="cr-slip"><i>${icon('check')}</i><span class="cr-receipt-text">${escape(s.receiptText)}</span></div></div>
    <span class="cr-announcement" role="status" aria-live="polite" aria-atomic="true"></span>
  </article></div>`;
}

type Phase = 'compact' | 'open' | 'confirming' | 'receipt';
const mounts = new WeakMap<HTMLElement, Controller>();
let serial = 0;

export function mount(
  host: HTMLElement,
  input: unknown = {},
  options: MountOptions = {},
): Controller {
  mounts.get(host)?.destroy();
  let s = resolveSettings(input);
  host.innerHTML = render(s);
  const layout = host.querySelector<HTMLElement>('.cr-layout')!;
  const root = layout.querySelector<HTMLElement>('.cr-shell')!;
  const element = <T extends HTMLElement = HTMLElement>(name: string) =>
    root.querySelector<T>(`.cr-${name}`)!;
  const product = element<HTMLButtonElement>('product');
  const photo = element<HTMLImageElement>('photo');
  const fav = element<HTMLButtonElement>('favorite');
  const body = element('body');
  body.id = `arclen-cart-details-${++serial}`;
  product.setAttribute('aria-controls', body.id);
  const total = element('total');
  const count = element('count');
  const add = element<HTMLButtonElement>('step--more');
  const less = element<HTMLButtonElement>('step--less');
  const labelButton = element<HTMLButtonElement>('confirm-label');
  const track = element('track');
  const thumb = element<HTMLButtonElement>('thumb');
  const status = element('announcement');
  const doc = host.ownerDocument;
  const win = doc.defaultView!;
  const media = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const listeners = new win.AbortController();
  const signal = listeners.signal;
  let phase: Phase = 'compact';
  let quantity = 0;
  let subtotal = Math.round(s.price * 100);
  let displayed = subtotal;
  let amountFrame = 0;
  let dragFrame = 0;
  let settleTimer = 0;
  let confirmedAt = 0;
  let resetTimer = 0;
  let pointer: number | null = null;
  let origin = 0;
  let downX = 0;
  let downY = 0;
  let dragScale = 1;
  let endCenter = Infinity;
  let fromThumb = false;
  let moved = false;
  let suppressLabelClick = false;
  let capture: HTMLElement | null = null;
  let distance = 0;
  let progress = 0;
  let travel = 218;
  let paused = !!options.paused;
  let visible = true;
  let destroyed = false;
  let audio: AudioContext | undefined;
  const still = () => paused || !visible || doc.hidden || !!media?.matches;
  const unit = () => Math.round(s.price * 100);

  function paintPhoto() {
    photo.classList.toggle(
      'cr-portrait',
      photo.naturalHeight > 1.18 * photo.naturalWidth && photo.naturalWidth > 0,
    );
  }
  photo.addEventListener('load', paintPhoto, { signal });
  photo.addEventListener(
    'error',
    () => {
      if (photo.getAttribute('src') !== fallback) photo.src = fallback;
    },
    { signal },
  );
  if (photo.complete) paintPhoto();

  function setProgress(percent: number) {
    progress = clamp(percent, 0, 100);
    track.style.setProperty('--cr-offset', `${(travel * progress) / 100}px`);
    track.style.setProperty(
      '--cr-text-opacity',
      String(Math.max(0, 1 - progress / 65)),
    );
    thumb.setAttribute('aria-valuenow', String(Math.round(progress)));
    thumb.setAttribute(
      'aria-valuetext',
      quantity ? `${Math.round(progress)} percent` : 'Cart is empty',
    );
  }
  function measureTravel() {
    travel = Math.max(
      1,
      (track.clientWidth || s.cardWidth - 2 * s.framePadding) -
        (thumb.offsetWidth || s.trackHeight - 2 * s.thumbInset) - 2 * s.thumbInset,
    );
  }

  function setAmount(immediate: boolean) {
    if (amountFrame) win.cancelAnimationFrame(amountFrame);
    amountFrame = 0;
    subtotal = Math.max(1, quantity) * unit();
    const start = displayed;
    const began = win.performance.now();
    function draw(time: number) {
      const t =
        immediate || still()
          ? 1
          : clamp((time - began) / (s.subtotalDuration / s.foldSpeed), 0, 1);
      displayed = Math.round(
        start + (subtotal - start) * (1 - Math.pow(1 - t, 3)),
      );
      if (!(start % 100 || subtotal % 100))
        displayed = Math.round(displayed / 100) * 100;
      total.textContent = money(displayed);
      amountFrame = t < 1 ? win.requestAnimationFrame(draw) : 0;
    }
    draw(began);
  }

  function quantityChanged(immediate = false) {
    count.textContent = String(quantity);
    count.hidden = !quantity;
    add.disabled = quantity >= quantityLimit;
    less.disabled = !quantity;
    thumb.disabled = labelButton.disabled = !quantity || phase !== 'open';
    thumb.tabIndex = thumb.disabled ? -1 : 0;
    setProgress(0);
    setAmount(immediate);
    status.textContent = `${quantity} ${quantity === 1 ? 'item' : 'items'}, ${money(quantity * unit())}`;
  }
  function state(next: Phase) {
    phase = next;
    root.dataset.state = next;
    labelButton.textContent = next === 'confirming' || next === 'receipt' ? 'Order placed' : s.confirmLabel;
    body.toggleAttribute('inert', next !== 'open');
    body.setAttribute('aria-hidden', String(next !== 'open'));
    product.setAttribute(
      'aria-expanded',
      String(next === 'open' || next === 'confirming'),
    );
    product.setAttribute(
      'aria-label',
      `${next === 'open' ? 'Close' : 'View'} ${s.title}`,
    );
    product.setAttribute('aria-disabled', String(next === 'confirming'));
  }
  function stopDrag() {
    if (dragFrame) win.cancelAnimationFrame(dragFrame);
    dragFrame = 0;
    root.removeAttribute('data-tracking');
    const id = pointer;
    pointer = null;
    if (id !== null && capture?.hasPointerCapture?.(id))
      capture.releasePointerCapture(id);
    capture = null;
  }
  function abortDrag() {
    stopDrag();
    setProgress(0);
  }
  function tone() {
    if (!s.sound || !win.AudioContext) return;
    try {
      audio ??= new win.AudioContext();
      void audio.resume().catch(() => {});
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const at = audio.currentTime;
      osc.frequency.setValueAtTime(540, at);
      osc.frequency.exponentialRampToValueAtTime(810, at + 0.09);
      gain.gain.setValueAtTime(0.04, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.21);
      osc.connect(gain).connect(audio.destination);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
      osc.start(at);
      osc.stop(at + 0.22);
    } catch {
      /* The visual receipt works with audio unavailable. */
    }
  }
  function reset() {
    win.clearTimeout(settleTimer);
    win.clearTimeout(resetTimer);
    stopDrag();
    state('compact');
    quantity = 0;
    quantityChanged(true);
    status.textContent = '';
  }
  function receipt() {
    win.clearTimeout(settleTimer);
    state('receipt');
    resetTimer = win.setTimeout(reset, s.receiptDuration);
  }
  function scheduleReceipt() {
    win.clearTimeout(settleTimer);
    const remaining = s.confirmHold - (win.performance.now() - confirmedAt);
    settleTimer = win.setTimeout(receipt, Math.max(0, remaining));
  }
  function confirmationMessage() {
    return `${s.receiptText}. ${quantity} ${quantity === 1 ? 'item' : 'items'}, ${money(quantity * unit())}.`;
  }
  function confirm() {
    if (phase !== 'open' || !quantity) return;
    stopDrag();
    const detail = { quantity, total: (quantity * unit()) / 100 };
    measureTravel();
    setProgress(100);
    confirmedAt = win.performance.now();
    state('confirming');
    thumb.disabled = labelButton.disabled = true;
    if (body.contains(doc.activeElement))
      product.focus({ preventScroll: true });
    status.textContent = confirmationMessage();
    tone();
    if (paused || !visible || doc.hidden) receipt();
    else scheduleReceipt();
    host.dispatchEvent(
      new win.CustomEvent('cartconfirm', { bubbles: true, detail }),
    );
    options.onConfirm?.(detail);
  }
  product.addEventListener(
    'click',
    () => {
      if (phase === 'confirming') return;
      if (phase === 'open') {
        reset();
        return;
      }
      win.clearTimeout(resetTimer);
      root.removeAttribute('data-mounted');
      state('open');
      quantity = 1;
      quantityChanged(true);
    },
    { signal },
  );
  fav.addEventListener(
    'click',
    () => {
      const saved = fav.getAttribute('aria-pressed') !== 'true';
      fav.setAttribute('aria-pressed', String(saved));
      fav.setAttribute(
        'aria-label',
        saved ? 'Remove from wishlist' : 'Save to wishlist',
      );
    },
    { signal },
  );
  function change(by: number) {
    if (phase !== 'open') return;
    quantity = clamp(quantity + by, 0, quantityLimit);
    quantityChanged();
  }
  add.addEventListener('click', () => change(1), { signal });
  less.addEventListener('click', () => change(-1), { signal });
  // A deliberate label click is also the accessible single-action alternative.
  labelButton.addEventListener('click', (event) => {
    if (!event.detail || !suppressLabelClick) confirm();
  }, { signal });
  function dragDistance(event: PointerEvent) {
    const x = event.clientX;
    if (Math.max(Math.abs(x - downX), Math.abs(event.clientY - downY)) >= 4) moved = true;
    // Grabbing the right edge of the thumb should still reach the visible end stop.
    if (moved && x >= endCenter && x > downX) return travel;
    return (x - origin) / dragScale;
  }
  track.addEventListener(
    'pointerdown',
    (e) => {
      if (
        phase !== 'open' ||
        !quantity ||
        pointer !== null ||
        e.button !== 0 ||
        !e.isPrimary
      )
        return;
      measureTravel();
      pointer = e.pointerId;
      // Grabbing a returning thumb must start at its painted translation.
      const transform = win.getComputedStyle(thumb).transform;
      const match = /^matrix\(([^)]+)\)$/.exec(transform);
      const painted = match
        ? Number(match[1].split(',')[4])
        : (travel * progress) / 100;
      const bounds = track.getBoundingClientRect();
      dragScale = bounds.width && track.clientWidth ? bounds.width / track.clientWidth : 1;
      const halfThumb = (thumb.offsetWidth || s.trackHeight - 2 * s.thumbInset) / 2;
      endCenter = bounds.width ? bounds.right - (s.thumbInset + halfThumb) * dragScale : Infinity;
      downX = e.clientX;
      downY = e.clientY;
      fromThumb = thumb.contains(e.target as Node);
      moved = suppressLabelClick = false;
      origin = fromThumb ? downX - painted * dragScale : bounds.left + (s.thumbInset + halfThumb) * dragScale;
      distance = painted;
      setProgress((painted / travel) * 100);
      root.removeAttribute('data-returning');
      root.setAttribute('data-tracking', '');
      capture = fromThumb ? thumb : labelButton.contains(e.target as Node) ? labelButton : track;
      capture.setPointerCapture?.(e.pointerId);
      if (fromThumb) thumb.focus({ preventScroll: true });
    },
    { signal },
  );
  doc.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerId !== pointer) return;
      distance = dragDistance(e);
      if (!fromThumb && !moved) return;
      if (still()) setProgress((distance / travel) * 100);
      else if (!dragFrame)
        dragFrame = win.requestAnimationFrame(() => {
          dragFrame = 0;
          setProgress((distance / travel) * 100);
        });
    },
    { signal },
  );
  doc.addEventListener(
    'pointerup',
    (e) => {
      if (e.pointerId !== pointer) return;
      const end = dragDistance(e) / travel;
      const labelBounds = labelButton.getBoundingClientRect();
      suppressLabelClick = moved || (capture === labelButton && labelBounds.width > 0 && (
        e.clientX < labelBounds.left || e.clientX > labelBounds.right ||
        e.clientY < labelBounds.top || e.clientY > labelBounds.bottom
      ));
      stopDrag();
      if (e.clientX - downX >= 4 && end >= s.confirmThreshold / 100) confirm();
      else {
        root.setAttribute('data-returning', '');
        setProgress(0);
      }
    },
    { signal },
  );
  for (const type of ['pointercancel', 'lostpointercapture'] as const) {
    track.addEventListener(
      type,
      (e) => {
        if (e.pointerId === pointer) {
          suppressLabelClick = true;
          abortDrag();
        }
      },
      { signal },
    );
  }
  thumb.addEventListener(
    'keydown',
    (e) => {
      if (phase !== 'open' || !quantity) return;
      measureTravel();
      switch (e.key) {
        case 'Enter':
        case ' ':
        case 'End':
          if (!e.repeat) confirm();
          break;
        case 'Home':
        case 'Escape':
          abortDrag();
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          setProgress(progress + s.keyboardStep);
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          setProgress(progress - s.keyboardStep);
          break;
        default:
          return;
      }
      e.preventDefault();
    },
    { signal },
  );

  function motionPolicy() {
    root.toggleAttribute('data-static', still());
    if (!still()) return;
    root.removeAttribute('data-mounted');
    if (amountFrame) setAmount(true);
    if (phase === 'confirming' && (paused || !visible || doc.hidden)) receipt();
  }
  const observer = win.IntersectionObserver
    ? new win.IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        motionPolicy();
      })
    : null;
  observer?.observe(root);

  // Measure the available slot, which stays the same width throughout the fold.
  function fitFold(width: number) {
    const side = width >= Math.max(600, 2 * s.cardWidth);
    if (side === root.hasAttribute('data-side')) return;
    if (pointer !== null) abortDrag();
    root.toggleAttribute('data-side', side);
    if (phase === 'confirming') { measureTravel(); setProgress(100); }
  }
  const resize = win.ResizeObserver
    ? new win.ResizeObserver(([entry]) => fitFold(entry.contentRect.width))
    : null;
  resize?.observe(layout);
  if (!resize) win.addEventListener('resize', () => fitFold(layout.clientWidth), { signal });
  fitFold(layout.clientWidth);
  doc.addEventListener('visibilitychange', motionPolicy, { signal });
  media?.addEventListener('change', motionPolicy);
  root.setAttribute('data-mounted', '');
  motionPolicy();
  quantityChanged(true);
  status.textContent = '';
  const api: Controller = {
    update(input) {
      if (destroyed) return;
      const prior = s;
      s = resolveSettings({ ...s, ...input });
      if (prior.image !== s.image) photo.src = s.image || fallback;
      element('title').textContent = s.title;
      element('brand').textContent = s.brand;
      if (phase === 'confirming' && prior.confirmHold !== s.confirmHold) scheduleReceipt();
      if (prior.confirmLabel !== s.confirmLabel) {
        labelButton.setAttribute('aria-label', actionName(s));
        thumb.setAttribute('aria-label', actionName(s));
      }
      if (prior.receiptText !== s.receiptText) {
        element('receipt-text').textContent = s.receiptText;
        if (phase === 'confirming' || phase === 'receipt')
          status.textContent = confirmationMessage();
      }
      if (prior.showWishlist !== s.showWishlist) {
        if (!s.showWishlist && doc.activeElement === fav)
          product.focus({ preventScroll: true });
        fav.hidden = fav.disabled = !s.showWishlist;
      }
      root.dataset.theme = s.theme;
      root.style.cssText = appearance(s);
      if (prior.cardWidth !== s.cardWidth) fitFold(layout.clientWidth);
      state(phase);
      if (progress > 0) {
        measureTravel();
        setProgress(progress);
      }
      if (prior.price !== s.price) setAmount(still());
    },
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
      listeners.abort();
      stopDrag();
      observer?.disconnect();
      resize?.disconnect();
      media?.removeEventListener('change', motionPolicy);
      if (amountFrame) win.cancelAnimationFrame(amountFrame);
      win.clearTimeout(settleTimer);
      win.clearTimeout(resetTimer);
      if (audio) void audio.close().catch(() => {});
      mounts.delete(host);
      layout.remove();
    },
  };
  mounts.set(host, api);
  return api;
}
