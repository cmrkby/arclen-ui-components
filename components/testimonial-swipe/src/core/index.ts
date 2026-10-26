import manifest from '../../component.json';
import portraitOne from '../../assets/portrait-01.webp';
import portraitTwo from '../../assets/portrait-02.webp';
import portraitThree from '../../assets/portrait-03.webp';
import portraitFour from '../../assets/portrait-04.webp';
import portraitFive from '../../assets/portrait-05.webp';

export interface Settings {
  sizing: 'fill' | 'fixed';
  height: number;
  initialStory: number;
  headings: string[];
  quotes: string[];
  names: string[];
  roles: string[];
  portrait1: string;
  portrait2: string;
  portrait3: string;
  portrait4: string;
  portrait5: string;
  stageColor: string;
  panelColor: string;
  textColor: string;
  mutedColor: string;
  cornerRadius: number;
  portraitScale: number;
  showProgress: boolean;
  progressColor: string;
  autoPlay: boolean;
  interval: number;
  duration: number;
  typeface: 'geist' | 'system' | 'serif';
  headingScale: number;
  quoteScale: number;
  contentSpacing: number;
  panelMaxWidth: number;
  panelPadding: number;
  phonePadding: number;
  frameWidth: number;
  portraitRadius: number;
  frameColor: string;
  portraitX: number;
  portraitY: number;
  showAvatar: boolean;
  showDragHint: boolean;
  dragHint: string;
  swipeEnabled: boolean;
}

export interface Controller {
  update(input: unknown): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}

const bundledPortraits = [portraitOne, portraitTwo, portraitThree, portraitFour, portraitFive]
  .map((value: string | { src: string }) => typeof value === 'string' ? value : value.src);
const manifestDefaults = Object.fromEntries(manifest.settings.map(setting => [setting.key, setting.default])) as unknown as Settings;
/** Defaults come from the same manifest used by the catalogue. */
export const defaults: Settings = Object.freeze({ ...manifestDefaults,
  headings: Object.freeze([...manifestDefaults.headings]) as unknown as string[],
  quotes: Object.freeze([...manifestDefaults.quotes]) as unknown as string[],
  names: Object.freeze([...manifestDefaults.names]) as unknown as string[],
  roles: Object.freeze([...manifestDefaults.roles]) as unknown as string[],
});

function validImage(value: string): boolean {
  if (value === '') return true;
  if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value)) return true;
  if (/^https:\/\//.test(value)) {
    try { const url = new URL(value); return !url.username && !url.password && !/[\s<>"'\\]/.test(value); } catch { return false; }
  }
  if (/^blob:https?:\/\/[^\s<>"'\\]+$/.test(value)) return true;
  return /^(?:\.\/|\.\.\/)?[A-Za-z0-9_-][A-Za-z0-9_./-]*$/.test(value) && !value.startsWith('//') && !value.split('/').includes('..');
}

/** Reject invalid controls rather than silently accepting unsafe or misleading output. */
export function resolveSettings(input: unknown = {}): Settings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Testimonial Swipe settings must be an object.');
  const given = input as Record<string, unknown>;
  const output = { ...defaults, headings: [...defaults.headings], quotes: [...defaults.quotes], names: [...defaults.names], roles: [...defaults.roles] } as unknown as Record<string, unknown>;
  for (const key of Object.keys(given)) {
    const setting = manifest.settings.find(item => item.key === key);
    if (!setting) throw new Error('Unknown Testimonial Swipe setting: ' + key);
    const value = given[key];
    if (setting.kind === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || (setting.min !== undefined && value < setting.min) || (setting.max !== undefined && value > setting.max) || (key === 'initialStory' && !Number.isInteger(value))) throw new Error('Invalid number: ' + key);
    } else if (setting.kind === 'boolean') {
      if (typeof value !== 'boolean') throw new Error('Invalid boolean: ' + key);
    } else if (setting.kind === 'string-list') {
      if (!Array.isArray(value) || value.length < (setting.minItems ?? 1) || value.length > (setting.maxItems ?? 5) || value.some(item => typeof item !== 'string' || !item.trim() || item.length > (setting.maxItemLength ?? 360))) throw new Error('Invalid story list: ' + key);
    } else {
      if (typeof value !== 'string' || value.length > (setting.maxLength ?? 1000)) throw new Error('Invalid text: ' + key);
      if (setting.kind === 'color' && value !== 'transparent' && !/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) throw new Error('Invalid colour: ' + key);
      if (setting.kind === 'image' && !validImage(value)) throw new Error('Invalid portrait URL: ' + key);
      if (setting.kind === 'select' && !setting.options?.some(option => typeof option === 'string' ? option === value : option.value === value)) throw new Error('Invalid selection: ' + key);
    }
    output[key] = Array.isArray(value) ? [...value] : value;
  }
  return output as unknown as Settings;
}

const escape = (value: string | number) => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
const portrait = (settings: Settings, index: number) => settings[('portrait' + (index + 1)) as 'portrait1'] || bundledPortraits[index];
const entry = (settings: Settings, key: 'headings' | 'quotes' | 'names' | 'roles', index: number) => settings[key][index] ?? defaults[key][index];
const countText = (index: number, total: number) => `<span data-current>${String(index + 1).padStart(2, '0')}</span> <span>/ ${String(total).padStart(2, '0')}</span>`;
const arrow = (next: boolean) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${next ? 'm9 6 6 6-6 6' : 'm15 6-6 6 6 6'}"/></svg>`;

function storyMarkup(settings: Settings, index: number): string {
  return `<div class="aui-ts-copy"><h2 class="aui-ts-heading">${escape(entry(settings, 'headings', index))}</h2><blockquote class="aui-ts-quote">“${escape(entry(settings, 'quotes', index))}”</blockquote><div class="aui-ts-person"><img class="aui-ts-avatar" src="${escape(portrait(settings, index))}" width="44" height="44" alt=""/><div><p class="aui-ts-name">${escape(entry(settings, 'names', index))}</p><p class="aui-ts-role">${escape(entry(settings, 'roles', index))}</p></div></div></div>`;
}

function cardPose(settings: Settings, index: number, active: number): { transform: string; opacity: string; zIndex: string } {
  const total = settings.quotes.length;
  const depth = (index - active + total) % total;
  const side = [0, 1, -1, 2, -2][depth];
  const row = [0, 1, 1, 2, 2][depth];
  const rotation = [0, 5, -5, 10, -10][depth];
  const scale = [1, .955, .91, .865, .82][depth];
  return { transform: `translate(calc(-50% + var(--aui-ts-fan-spread) * ${side}), calc(var(--aui-ts-fan-drop) * ${row})) rotate(${rotation}deg) scale(calc(var(--aui-ts-portrait-scale) * ${scale}))`, opacity: depth === 4 ? '0' : '1', zIndex: String(10 - depth) };
}

/** Useful first-story content is present before enhancement and during server rendering. */
export function render(input: unknown = {}): string {
  const settings = resolveSettings(input);
  const active = Math.min(settings.initialStory, settings.quotes.length) - 1;
  const css = `--aui-ts-font:${({geist:"ArclenTestimonialGeist,Arial,sans-serif",system:"system-ui,sans-serif",serif:"Georgia,serif"} as const)[settings.typeface]};--aui-ts-heading-scale:${settings.headingScale};--aui-ts-quote-scale:${settings.quoteScale};--aui-ts-spacing:${settings.contentSpacing};--aui-ts-panel-max:${settings.panelMaxWidth}px;--aui-ts-panel-padding:${settings.panelPadding}px;--aui-ts-phone-padding:${settings.phonePadding}px;--aui-ts-frame-width:${settings.frameWidth}px;--aui-ts-portrait-radius:${settings.portraitRadius}px;--aui-ts-frame:${settings.frameColor};--aui-ts-portrait-x:${settings.portraitX}%;--aui-ts-portrait-y:${settings.portraitY}%;--aui-ts-progress:${settings.progressColor};--aui-ts-height:${settings.height}px;--aui-ts-stage:${settings.stageColor};--aui-ts-panel:${settings.panelColor};--aui-ts-text:${settings.textColor};--aui-ts-muted:${settings.mutedColor};--aui-ts-radius:${settings.cornerRadius}px;--aui-ts-portrait-scale:${settings.portraitScale};`;
  const autoplay = `<button type="button" class="aui-ts-autoplay" data-autoplay disabled aria-label="Pause autoplay"><span data-play-icon aria-hidden="true">Ⅱ</span><span data-play-label>Pause</span></button>`;
  const cards = settings.quotes.map((_, index) => {
    const pose = cardPose(settings, index, active);
    return `<figure class="aui-ts-card" data-card="${index}" aria-hidden="true" style="transform:${pose.transform};opacity:${pose.opacity};z-index:${pose.zIndex}"><div class="aui-ts-card-surface"><img src="${escape(portrait(settings, index))}" width="600" height="800" alt="" draggable="false" decoding="async"/><figcaption>${escape(entry(settings, 'names', index))}</figcaption></div></figure>`;
  }).join('');
  return `<div class="aui-ts" data-sizing="${settings.sizing}" style="${css}"><section class="aui-ts-stage" data-direction="split" data-avatar-visible="${settings.showAvatar}" data-hint-visible="${settings.showDragHint && settings.swipeEnabled}" data-swipe-enabled="${settings.swipeEnabled}" data-progress-visible="${settings.showProgress}" aria-roledescription="carousel" aria-label="Stories" data-active="${active + 1}"><div class="aui-ts-panel"><div class="aui-ts-story"><div class="aui-ts-counter"><span data-counter>${countText(active, settings.quotes.length)}</span><i aria-hidden="true"></i></div><div class="aui-ts-copy-slot">${storyMarkup(settings, active)}</div><div class="aui-ts-footer"><div class="aui-ts-navigation"><button type="button" class="aui-ts-previous" data-previous aria-label="Previous story" disabled>${arrow(false)}</button><span class="aui-ts-next-control"><button type="button" class="aui-ts-next" data-next aria-label="Next story" disabled>${arrow(true)}</button><svg class="aui-ts-progress" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle class="aui-ts-progress-track" cx="50" cy="50" r="47"/><circle class="aui-ts-progress-arc" data-progress cx="50" cy="50" r="47" pathLength="1"/></svg></span></div><span class="aui-ts-hint"><span class="aui-ts-hint-icon" aria-hidden="true">↔</span> <span data-hint-text>${escape(settings.dragHint)}</span></span></div></div><div class="aui-ts-deck" data-deck role="group" aria-label="Portrait cards. Use the arrow buttons to change stories.">${cards}</div>${autoplay}<p class="aui-ts-sr" data-status role="status" aria-live="polite" aria-atomic="true"></p></div></section></div>`;
}

/** Owns only this host's markup, listeners, observer, timeout and finite animations. */
export function mount(host: HTMLElement, input: unknown = {}): Controller {
  let settings = resolveSettings(input);
  let active = Math.min(settings.initialStory, settings.quotes.length) - 1;
  let destroyed = false;
  let externallyPaused = false;
  let userPaused = false;
  let visible = true;
  let focusWithin = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let animations: Animation[] = [];
  let progressAnimation: Animation | undefined;
  let transitioning = false;
  let drag: { id: number; startX: number; startY: number; dx: number; horizontal: boolean; card: HTMLElement } | null = null;
  const document = host.ownerDocument;
  const view = document.defaultView;
  const reducedQuery = view?.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reduced = reducedQuery?.matches ?? false;
  const abort = new AbortController();
  host.innerHTML = render(settings);
  const stage = host.querySelector<HTMLElement>('.aui-ts-stage')!;
  const deck = host.querySelector<HTMLElement>('[data-deck]')!;
  const root = host.querySelector<HTMLElement>('.aui-ts')!;
  const copySlot = host.querySelector<HTMLElement>('.aui-ts-copy-slot')!;
  const counter = host.querySelector<HTMLElement>('[data-counter]')!;
  const status = host.querySelector<HTMLElement>('[data-status]')!;
  const previousButton = host.querySelector<HTMLButtonElement>('[data-previous]')!;
  const nextButton = host.querySelector<HTMLButtonElement>('[data-next]')!;
  const playButton = host.querySelector<HTMLButtonElement>('[data-autoplay]')!;
  const progressArc = host.querySelector<SVGCircleElement>('[data-progress]')!;
  let cards = [...deck.querySelectorAll<HTMLElement>('[data-card]')];

  function clearTimer() {
    if (timer !== undefined) { clearTimeout(timer); timer = undefined; }
    progressAnimation?.cancel(); progressAnimation = undefined;
  }
  function cancelMotion() {
    for (const animation of animations) { animation.onfinish = null; animation.cancel(); }
    animations = [];
    deck.querySelectorAll<HTMLElement>('.aui-ts-card-surface').forEach(surface => { surface.style.transform = ''; surface.style.opacity = ''; });
    transitioning = false; stage.removeAttribute('aria-busy');
  }
  function mayAnimate() { return !externallyPaused && visible && !document.hidden && !reduced && typeof deck.animate === 'function'; }
  function mayAutoplay() { return !destroyed && settings.autoPlay && !externallyPaused && !userPaused && visible && !document.hidden && !reduced && !focusWithin && !drag && !transitioning && cards.length > 1; }
  function syncPlayButton() {
    const unavailable = !settings.autoPlay || reduced || cards.length < 2;
    playButton.disabled = unavailable;
    const label = reduced ? 'Reduced motion' : !settings.autoPlay ? 'Autoplay off' : userPaused ? 'Resume' : 'Pause';
    playButton.querySelector('[data-play-label]')!.textContent = label;
    playButton.querySelector('[data-play-icon]')!.textContent = userPaused ? '▷' : 'Ⅱ';
    playButton.setAttribute('aria-label', unavailable ? label : userPaused ? 'Resume autoplay' : 'Pause autoplay');
    playButton.title = playButton.getAttribute('aria-label')!;
    playButton.setAttribute('aria-pressed', String(userPaused));
    stage.dataset.playing = String(mayAutoplay());
  }
  function schedule() {
    clearTimer(); syncPlayButton();
    if (mayAutoplay()) {
      if (settings.showProgress && typeof progressArc.animate === 'function') {
        progressAnimation = progressArc.animate([{ strokeDashoffset: '1' }, { strokeDashoffset: '0' }], { duration: settings.interval, easing: 'linear', fill: 'both' });
      }
      timer = setTimeout(() => { timer = undefined; change(1, false); }, settings.interval);
    }
  }
  function animate(element: HTMLElement, frames: Keyframe[], duration = settings.duration, delay = 0, easing = 'cubic-bezier(.22,.8,.25,1)'): Animation | undefined {
    if (!mayAnimate()) return;
    const animation = element.animate(frames, { duration, delay, easing, fill: delay > 0 ? 'backwards' : 'none' });
    animations.push(animation);
    animation.onfinish = () => {
      animation.onfinish = null;
      animations = animations.filter(item => item !== animation);
      animation.cancel();
    };
    return animation;
  }
  function syncCards() {
    cards.forEach((card, index) => {
      const pose = cardPose(settings, index, active);
      Object.assign(card.style, pose);
      card.dataset.active = String(index === active);
    });
  }
  function updateStory(announce: boolean) {
    counter.innerHTML = countText(active, settings.quotes.length);
    copySlot.innerHTML = storyMarkup(settings, active);
    stage.dataset.active = String(active + 1);
    deck.setAttribute('aria-label', `Portrait of ${entry(settings, 'names', active)}. ${settings.swipeEnabled ? 'Drag left or right, or use' : 'Use'} the arrow buttons to change stories.`);
    if (announce) status.textContent = `Story ${active + 1} of ${settings.quotes.length}: ${entry(settings, 'names', active)}.`;
  }
  function change(delta: number, announce = true, gesture?: { transform: string; dx: number }) {
    if (destroyed || cards.length < 2 || transitioning) return;
    clearTimer();
    const oldIndex = active;
    const snapshots = cards.map(card => { const css = view!.getComputedStyle(card); return { transform: css.transform, opacity: css.opacity }; });
    cancelMotion();
    active = (active + delta % cards.length + cards.length) % cards.length;
    syncCards(); updateStory(announce);
    const forward = delta > 0 ? 1 : -1;
    if (mayAnimate()) {
      transitioning = true; stage.setAttribute('aria-busy', 'true');
      const delay = 0;
      const easing = 'cubic-bezier(.2,.8,.2,1)';
      let lead: Animation | undefined;
      cards.forEach((card, index) => {
        const final = cardPose(settings, index, active);
        const departing = forward > 0 && index === oldIndex;
        const wait = delay + (departing ? settings.duration * .92 : 0);
        const movement = animate(card, [{ transform: snapshots[index].transform }, { transform: final.transform }], settings.duration * .9, wait, easing);
        if (index === active) lead = movement;
        if (snapshots[index].opacity !== final.opacity) animate(card, [{ opacity: snapshots[index].opacity }, { opacity: final.opacity }], settings.duration * .75, wait, 'cubic-bezier(.2,0,.2,1)');
        if (departing) {
          const surface = card.querySelector<HTMLElement>('.aui-ts-card-surface')!;
          const departure = `translate(${-card.offsetWidth * 1.3}px, ${-card.offsetHeight * .06}px) rotate(-14deg)`;
          const from = gesture?.transform ?? 'translate(0,0) rotate(0deg)';
          animate(surface, [{ transform: from, offset: 0, easing: 'cubic-bezier(.32,.82,.2,1)' }, { transform: departure, offset: .9 }, { transform: departure, offset: .919 }, { transform: 'translate(0,0) rotate(0deg)', offset: .92 }, { transform: 'translate(0,0) rotate(0deg)', offset: 1 }], settings.duration, delay, 'linear');
          animate(surface, [{ opacity: 1, offset: 0, easing: 'cubic-bezier(.2,0,.2,1)' }, { opacity: 0, offset: .75 }, { opacity: 0, offset: .919 }, { opacity: 1, offset: .92 }, { opacity: 1, offset: 1 }], settings.duration, delay, 'linear');
          animate(card, [{ zIndex: '20', offset: 0 }, { zIndex: '20', offset: .919 }, { zIndex: final.zIndex, offset: .92 }, { zIndex: final.zIndex, offset: 1 }], settings.duration, delay, 'linear');
        }
      });
      if (gesture && forward < 0) {
        const surface = cards[oldIndex].querySelector<HTMLElement>('.aui-ts-card-surface')!;
        animate(surface, [{ transform: gesture.transform }, { transform: 'translate(0,0) rotate(0deg)' }], settings.duration, delay, easing);
      }
      if (lead) {
        const finish = lead.onfinish;
        lead.onfinish = event => { finish?.call(lead!, event); transitioning = false; stage.removeAttribute('aria-busy'); schedule(); };
      } else { transitioning = false; stage.removeAttribute('aria-busy'); }
      const current = counter.querySelector<HTMLElement>('[data-current]')!;
      const heading = copySlot.querySelector<HTMLElement>('.aui-ts-heading')!;
      const quote = copySlot.querySelector<HTMLElement>('.aui-ts-quote')!;
      const person = copySlot.querySelector<HTMLElement>('.aui-ts-person')!;
      [current, heading, quote, person].forEach((element, index) => animate(element, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'translateY(0)' }], settings.duration, delay + Math.max(0, index - 1) * settings.duration * (80 / 620), easing));
    }
    schedule();
  }
  function stopGesture(reset = true) {
    if (!drag) return;
    const id = drag.id;
    if (reset) drag.card.style.transform = '';
    drag = null;
    deck.classList.remove('aui-ts-dragging');
    if (deck.hasPointerCapture?.(id)) deck.releasePointerCapture(id);
    if (reset) syncCards();
  }
  function suspend() { clearTimer(); stopGesture(); cancelMotion(); syncCards(); syncPlayButton(); }
  function onPointerDown(event: PointerEvent) {
    if (destroyed || !settings.swipeEnabled || cards.length < 2 || transitioning || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    cancelMotion(); syncCards(); clearTimer();
    drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, dx: 0, horizontal: false, card: cards[active].querySelector<HTMLElement>('.aui-ts-card-surface')! };
    deck.setPointerCapture?.(event.pointerId);
  }
  function onPointerMove(event: PointerEvent) {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.horizontal && Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) { stopGesture(); schedule(); return; }
    if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) drag.horizontal = true;
    if (!drag.horizontal) return;
    drag.dx = Math.max(-deck.clientWidth, Math.min(deck.clientWidth, dx));
    deck.classList.add('aui-ts-dragging');
    if (reduced || externallyPaused) return;
    drag.card.style.transform = `translate(${drag.dx}px, ${Math.abs(drag.dx) * .012}px) rotate(${drag.dx * .045}deg)`;
  }
  function onPointerUp(event: PointerEvent) {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = drag.dx;
    const horizontal = drag.horizontal;
    const current = drag.card;
    const from = view!.getComputedStyle(current).transform;
    stopGesture(false);
    if (horizontal && Math.abs(dx) >= Math.min(80, deck.clientWidth * .18)) change(dx < 0 ? 1 : -1, true, { transform: from, dx });
    else { syncCards(); current.style.transform = ''; animate(current, [{ transform: from }, { transform: 'translate(0,0) rotate(0deg)' }], settings.duration * .65); schedule(); }
  }
  const listen = (target: EventTarget, type: string, listener: EventListener) => target.addEventListener(type, listener, { signal: abort.signal });
  listen(previousButton, 'click', () => change(-1));
  listen(nextButton, 'click', () => change(1));
  listen(playButton, 'click', () => { userPaused = !userPaused; schedule(); });
  listen(stage, 'keydown', ((event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || (event.target as HTMLElement).matches('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); change(event.key === 'ArrowRight' ? 1 : -1); }
  }) as EventListener);
  listen(deck, 'pointerdown', onPointerDown as EventListener);
  listen(deck, 'pointermove', onPointerMove as EventListener);
  listen(deck, 'pointerup', onPointerUp as EventListener);
  listen(deck, 'pointercancel', () => { stopGesture(); schedule(); });
  listen(deck, 'lostpointercapture', () => { if (drag) { stopGesture(); schedule(); } });
  listen(stage, 'focusin', () => { focusWithin = true; schedule(); });
  listen(stage, 'focusout', ((event: FocusEvent) => { focusWithin = !!event.relatedTarget && stage.contains(event.relatedTarget as Node); schedule(); }) as EventListener);
  listen(document, 'visibilitychange', () => { if (document.hidden) suspend(); else schedule(); });
  const onReduced = () => { reduced = reducedQuery?.matches ?? false; if (reduced) suspend(); else schedule(); };
  reducedQuery?.addEventListener('change', onReduced);
  const Observer = view?.IntersectionObserver;
  const observer = Observer ? new Observer(entries => {
    if (destroyed) return;
    visible = entries[0]?.isIntersecting ?? false;
    if (!visible) suspend(); else schedule();
  }, { threshold: 0 }) : undefined;
  observer?.observe(stage);
  if (!observer && view) {
    const updateVisibility = () => { const bounds = stage.getBoundingClientRect(); visible = bounds.bottom > 0 && bounds.top < view.innerHeight && bounds.right > 0 && bounds.left < view.innerWidth; if (!visible) suspend(); else schedule(); };
    listen(view, 'scroll', updateVisibility);
    listen(view, 'resize', updateVisibility);
    updateVisibility();
  }
  previousButton.disabled = nextButton.disabled = cards.length < 2;
  deck.tabIndex = settings.swipeEnabled ? 0 : -1;
  syncCards(); updateStory(false); schedule();

  return {
    update(next: unknown) {
      if (destroyed) return;
      const resolved = resolveSettings(next);
      const startChanged = resolved.initialStory !== settings.initialStory;
      suspend();
      settings = resolved;
      active = startChanged ? Math.min(settings.initialStory, settings.quotes.length) - 1 : Math.min(active, settings.quotes.length - 1);
      const template = document.createElement('template'); template.innerHTML = render(settings);
      const freshRoot = template.content.querySelector<HTMLElement>('.aui-ts')!;
      root.setAttribute('style', freshRoot.getAttribute('style')!);
      root.dataset.sizing = settings.sizing;
      stage.dataset.progressVisible = String(settings.showProgress);
      stage.dataset.avatarVisible = String(settings.showAvatar);
      stage.dataset.hintVisible = String(settings.showDragHint && settings.swipeEnabled);
      stage.dataset.swipeEnabled = String(settings.swipeEnabled);
      stage.querySelector('[data-hint-text]')!.textContent = settings.dragHint;
      deck.innerHTML = template.content.querySelector('[data-deck]')!.innerHTML;
      cards = [...deck.querySelectorAll<HTMLElement>('[data-card]')];
      previousButton.disabled = nextButton.disabled = cards.length < 2;
      deck.tabIndex = settings.swipeEnabled ? 0 : -1;
      syncCards(); updateStory(false); schedule();
    },
    pause() { if (destroyed) return; externallyPaused = true; suspend(); },
    resume() { if (destroyed) return; externallyPaused = false; schedule(); },
    destroy() {
      if (destroyed) return;
      destroyed = true; clearTimer(); stopGesture(); cancelMotion(); abort.abort();
      observer?.disconnect(); reducedQuery?.removeEventListener('change', onReduced);
      host.replaceChildren();
    },
  };
}
