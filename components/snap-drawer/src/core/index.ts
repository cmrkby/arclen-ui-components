import manifest from '../../component.json';

export interface Settings {
  triggerLabel: string; title: string; metadata: string; description: string;
  showRating: boolean; rating: number; showAction: boolean; actionLabel: string; actionHref: string;
  groupOneTitle: string; groupOneTitles: string[]; groupOneDescriptions: string[];
  showQuote: boolean; quote: string; quoteAttribution: string;
  groupTwoTitle: string; groupTwoTitles: string[]; groupTwoDescriptions: string[];
  fontFamily: 'geist' | 'system'; theme: 'system' | 'light' | 'dark' | 'custom';
  contentWidth: number; maxHeight: number; contentPadding: number; sectionGap: number;
  radius: number; shadow: 'none' | 'soft' | 'strong'; bodySize: number; bodyLineHeight: number; headingSize: number;
  surfaceColor: string; textColor: string; mutedColor: string; borderColor: string;
  actionColor: string; actionTextColor: string; overlayColor: string; overlayOpacity: number;
  overlayMode: 'adaptive' | 'constant'; snapPoints: string[]; initialSnap: number;
  dragEnabled: boolean; dismissOnOverlay: boolean; showHandle: boolean;
  duration: number; easing: 'glide' | 'standard' | 'linear';
}

const initial = Object.fromEntries(manifest.settings.map(setting => [setting.key,
  Array.isArray(setting.default) ? Object.freeze([...setting.default]) : setting.default]));
export const defaults = Object.freeze(initial) as unknown as Readonly<Settings>;
const cloneDefaults = (): Settings => Object.fromEntries(Object.entries(defaults).map(([key, value]) =>
  [key, Array.isArray(value) ? [...value] : value])) as unknown as Settings;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const snapPattern = /^(\d+(?:\.\d+)?)(px|%)$/;

/** Resolve a fresh settings object without retaining callers' arrays. */
export function resolveSettings(input: unknown = {}): Settings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Snap Drawer settings must be an object.');
  const output = cloneDefaults();
  for (const [key, value] of Object.entries(input)) {
    const setting = manifest.settings.find(item => item.key === key);
    if (!setting) throw new Error('Unknown Snap Drawer setting: ' + key);
    if (setting.kind === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < setting.min! || value > setting.max!) throw new Error('Invalid number: ' + key);
    } else if (setting.kind === 'boolean') {
      if (typeof value !== 'boolean') throw new Error('Invalid boolean: ' + key);
    } else if (setting.kind === 'string-list') {
      if (!Array.isArray(value) || value.length < setting.minItems! || value.length > setting.maxItems! || value.some(item => typeof item !== 'string' || item.length > setting.maxItemLength!)) throw new Error('Invalid list: ' + key);
    } else {
      if (typeof value !== 'string' || value.length > (setting.maxLength ?? 100000)) throw new Error('Invalid text: ' + key);
      if (setting.kind === 'color' && !/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(value)) throw new Error('Invalid color: ' + key);
      if (setting.kind === 'select' && !setting.options?.some(option => (typeof option === 'string' ? option : option.value) === value)) throw new Error('Invalid selection: ' + key);
    }
    (output as unknown as Record<string, unknown>)[key] = Array.isArray(value) ? [...value] : value;
  }
  for (const key of ['title', 'triggerLabel'] as const) if (!output[key].trim()) throw new Error(key + ' must contain text.');
  if (output.showAction && !output.actionLabel.trim()) throw new Error('Action label must contain text.');
  for (const group of ['One', 'Two'] as const) {
    if (output[`group${group}Titles`].length !== output[`group${group}Descriptions`].length) throw new Error('Item titles and descriptions must have equal lengths.');
  }
  const anchors = output.snapPoints.map(point => {
    const match = snapPattern.exec(point);
    if (!match || !Number.isFinite(Number(match[1])) || Number(match[1]) <= 0 || (match[2] === '%' && Number(match[1]) > 100)) throw new Error('Use positive px or percentage snap points.');
    return Number(match[1]) + match[2];
  });
  if (new Set(anchors).size < 2 || new Set(anchors).size !== anchors.length) throw new Error('Snap points must be distinct.');
  if (!Number.isInteger(output.initialSnap) || output.initialSnap >= output.snapPoints.length) throw new Error('Initial snap must index the configured snap points.');
  if (!Number.isInteger(output.rating)) throw new Error('Rating must be an integer.');
  const href = output.actionHref;
  if (/[\u0000-\u0020\u007f\\]/.test(href) || href.startsWith('//') || (/^[a-z][a-z\d+.-]*:/i.test(href) && !/^https?:\/\/[^/\s]+/i.test(href))) throw new Error('Use a relative, hash, HTTP or HTTPS action link.');
  if (/^https?:/i.test(href)) {
    try { const url = new URL(href); if (!url.hostname || url.username || url.password) throw new Error(); }
    catch { throw new Error('Invalid action link.'); }
  }
  return output;
}

export interface SnapGeometry { height: number; positions: number[]; sourceToReachable: number[]; reachableToSource: number[] }
/** Positions are ordered from the lowest reachable view to the highest. */
export function resolveSnapGeometry(settings: Settings, viewportHeight: number): SnapGeometry {
  const viewport = Math.max(0, Number.isFinite(viewportHeight) ? viewportHeight : 0);
  const height = viewport * settings.maxHeight / 100;
  const limit = Math.max(0, height - Math.min(96, height));
  const entries = settings.snapPoints.map((point, source) => ({ source, y: clamp(viewport - parseFloat(point) * (point.endsWith('%') ? viewport / 100 : 1), 0, limit) })).sort((a, b) => b.y - a.y);
  const positions: number[] = [], sourceToReachable: number[] = [], reachableToSource: number[] = [];
  for (const { source, y } of entries) {
    let index = positions.findIndex(position => Math.abs(position - y) < .001);
    if (index < 0) { index = positions.length; positions.push(y); reachableToSource.push(source); }
    sourceToReachable[source] = index;
  }
  return { height, positions, sourceToReachable, reachableToSource };
}

export interface PointerSample { y: number; time: number }
/** A fast, sustained release goes to an endpoint; slow movement chooses a nearby view. */
export function releaseTarget(geometry: SnapGeometry, y: number, prior: number, samples: PointerSample[], travel: number): number | 'closed' {
  const last = samples.at(-1);
  const first = last && samples.find(sample => last.time - sample.time <= 80 && last.time - sample.time >= 8);
  const velocity = first && last ? (last.y - first.y) / (last.time - first.time) : 0;
  if (Math.abs(velocity) >= 1 && Math.abs(travel) >= 32) return velocity < 0 ? geometry.positions.length - 1 : 'closed';
  if (y > (geometry.positions[0] + geometry.height) / 2) return 'closed';
  let nearest = prior, distance = Math.abs(y - geometry.positions[prior]);
  geometry.positions.forEach((position, index) => { if (Math.abs(y - position) < distance - .001) { nearest = index; distance = Math.abs(y - position); } });
  return nearest;
}

export const palettes = {
  light: { surfaceColor: '#ffffff', textColor: '#18181b', mutedColor: '#52525b', borderColor: '#e4e4e7', actionColor: '#000000', actionTextColor: '#fafafa', overlayColor: '#000000' },
  dark: { surfaceColor: '#18181b', textColor: '#fafafa', mutedColor: '#a1a1aa', borderColor: '#3f3f46', actionColor: '#fafafa', actionTextColor: '#18181b', overlayColor: '#000000' },
} as const;
const ease = { glide: 'cubic-bezier(.32,.72,0,1)', standard: 'cubic-bezier(.2,0,0,1)', linear: 'linear' };
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const icon = (name: 'up' | 'down' | 'close') => `<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="${name === 'up' ? 'M5 12.5 10 7.5 15 12.5' : name === 'down' ? 'M5 7.5 10 12.5 15 7.5' : 'M5.5 5.5 14.5 14.5M14.5 5.5 5.5 14.5'}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
function rating(settings: Settings) {
  return `<div class="sd-rating" role="img" aria-label="${settings.rating} out of 5 stars">${Array.from({ length: 5 }, (_, index) => `<svg viewBox="0 0 20 20" aria-hidden="true" style="opacity:${index < settings.rating ? 1 : .2}"><path fill="currentColor" d="M10 1.6 12.4 7 18.3 7.6 13.9 11.6 15.1 17.4 10 14.4 4.9 17.4 6.1 11.6 1.7 7.6 7.6 7Z"/></svg>`).join('')}</div>`;
}
function group(title: string, titles: string[], descriptions: string[]) {
  if (!titles.length) return '';
  return `<section class="sd-group">${title ? `<h3>${escape(title)}</h3>` : ''}<ul>${titles.map((item, index) => `<li><h4>${escape(item)}</h4><p>${escape(descriptions[index])}</p></li>`).join('')}</ul></section>`;
}
function content(settings: Settings, id: string) {
  const action = settings.actionHref ? `<a class="sd-action" href="${escape(settings.actionHref)}">${escape(settings.actionLabel)}</a>` : `<button class="sd-action" type="button">${escape(settings.actionLabel)}</button>`;
  return `<div class="sd-content">${settings.showRating ? rating(settings) : ''}<h2 id="${id}-title">${escape(settings.title)}</h2>${settings.metadata ? `<p class="sd-metadata">${escape(settings.metadata)}</p>` : ''}<p class="sd-intro" id="${id}-description">${escape(settings.description)}</p>${settings.showAction ? action : ''}${group(settings.groupOneTitle, settings.groupOneTitles, settings.groupOneDescriptions)}${settings.showQuote && settings.quote ? `<figure class="sd-quote"><blockquote>${escape(settings.quote)}</blockquote>${settings.quoteAttribution ? `<figcaption>${escape(settings.quoteAttribution)}</figcaption>` : ''}</figure>` : ''}${group(settings.groupTwoTitle, settings.groupTwoTitles, settings.groupTwoDescriptions)}</div>`;
}
function style(settings: Settings) {
  return `--sd-width:${settings.contentWidth}px;--sd-padding:${settings.contentPadding}px;--sd-gap:${settings.sectionGap}px;--sd-radius:${settings.radius}px;--sd-body:${settings.bodySize}px;--sd-leading:${settings.bodyLineHeight};--sd-heading:${settings.headingSize}px;--sd-surface-custom:${settings.surfaceColor};--sd-text-custom:${settings.textColor};--sd-muted-custom:${settings.mutedColor};--sd-border-custom:${settings.borderColor};--sd-action-custom:${settings.actionColor};--sd-action-text-custom:${settings.actionTextColor};--sd-overlay-custom:${settings.overlayColor};--sd-dim:${settings.overlayOpacity};--sd-font:${settings.fontFamily === 'geist' ? 'SnapDrawerGeist,ui-sans-serif' : 'ui-sans-serif'},system-ui,-apple-system,Segoe UI,sans-serif`;
}
let instanceCounter = 0;
const safeId = (id?: string) => id ? 'sd-' + id.replace(/[^a-zA-Z0-9_-]/g, '-') : 'sd-' + (++instanceCounter);
export function render(input: Settings = cloneDefaults(), id?: string): string {
  const settings = resolveSettings(input), identity = safeId(id);
  return `<div class="sd" data-theme="${settings.theme}" data-shadow="${settings.shadow}" data-rating="${settings.showRating}" style="${style(settings)}"><button class="sd-trigger" type="button" disabled aria-haspopup="dialog">${escape(settings.triggerLabel)}</button><article class="sd-static" aria-labelledby="${identity}-title">${content(settings, identity)}</article></div>`;
}

export interface Controller {
  update(settings: unknown): void; pause(): void; resume(): void; destroy(): void;
  open(): void; close(): void; snapTo(index: number): void;
}
interface Lock { owners: Set<HTMLDialogElement>; properties: Array<{ name: string; value: string; priority: string }> }
const locks = new WeakMap<Document, Lock>();
function lockPage(document: Document, dialog: HTMLDialogElement) {
  let lock = locks.get(document);
  if (!lock) {
    const body = document.body, view = document.defaultView!;
    lock = { owners: new Set(), properties: ['overflow', 'padding-right', 'overscroll-behavior'].map(name => ({ name, value: body.style.getPropertyValue(name), priority: body.style.getPropertyPriority(name) })) };
    locks.set(document, lock);
    const gutter = Math.max(0, view.innerWidth - document.documentElement.clientWidth);
    if (gutter) body.style.setProperty('padding-right', ((parseFloat(view.getComputedStyle(body).paddingRight) || 0) + gutter) + 'px', 'important');
    body.style.setProperty('overflow', 'hidden', 'important'); body.style.setProperty('overscroll-behavior', 'none', 'important');
  }
  lock.owners.add(dialog);
}
function unlockPage(document: Document, dialog: HTMLDialogElement) {
  const lock = locks.get(document); if (!lock) return;
  lock.owners.delete(dialog);
  if (!lock.owners.size) {
    for (const { name, value, priority } of lock.properties) {
      if (value) document.body.style.setProperty(name, value, priority); else document.body.style.removeProperty(name);
    }
    locks.delete(document);
  }
}

export function mount(host: HTMLElement, input: unknown = {}, id?: string): Controller {
  let settings = resolveSettings(input);
  const document = host.ownerDocument, view = document.defaultView!, identity = safeId(id);
  host.innerHTML = render(settings, identity + '-static');
  const root = host.querySelector<HTMLElement>('.sd')!, trigger = root.querySelector<HTMLButtonElement>('.sd-trigger')!;
  const fallback = root.querySelector<HTMLElement>('.sd-static')!;
  fallback.setAttribute('aria-labelledby', identity + '-static-title'); fallback.innerHTML = content(settings, identity + '-static');
  const modal = document.createElement('dialog'); modal.className = 'sd sd-modal'; modal.dataset.sdInstance = identity;
  modal.tabIndex = -1; modal.autofocus = true;
  modal.id = identity + '-dialog'; modal.setAttribute('aria-labelledby', identity + '-title'); modal.setAttribute('aria-describedby', identity + '-description');
  modal.innerHTML = `<div class="sd-overlay" aria-hidden="true"></div><div class="sd-sheet"><div class="sd-handle" aria-hidden="true"></div><div class="sd-controls"><button type="button" data-sd-control="expand" aria-label="Expand details">${icon('up')}</button><button type="button" data-sd-control="collapse" aria-label="Collapse details">${icon('down')}</button><button type="button" data-sd-control="close" aria-label="Close details">${icon('close')}</button></div><div class="sd-scroll" role="region" aria-label="Details content" tabindex="-1">${content(settings, identity)}</div><span class="sd-status" role="status" aria-live="polite"></span></div>`;
  const sheet = modal.querySelector<HTMLElement>('.sd-sheet')!, overlay = modal.querySelector<HTMLElement>('.sd-overlay')!, scroll = modal.querySelector<HTMLElement>('.sd-scroll')!;
  const expand = modal.querySelector<HTMLButtonElement>('[data-sd-control="expand"]')!, collapse = modal.querySelector<HTMLButtonElement>('[data-sd-control="collapse"]')!, closeButton = modal.querySelector<HTMLButtonElement>('[data-sd-control="close"]')!;
  const status = modal.querySelector<HTMLElement>('.sd-status')!;
  const media = typeof view.matchMedia === 'function' ? view.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const colorMedia = typeof view.matchMedia === 'function' ? view.matchMedia('(prefers-color-scheme: dark)') : null;
  let destroyed = false, paused = false, opened = false, closing = false, mounted = false, index = 0;
  let geometry = resolveSnapGeometry(settings, view.visualViewport?.height ?? view.innerHeight);
  let y = geometry.height, opacity = 0, timer: ReturnType<typeof setTimeout> | undefined, generation = 0;
  let initiator: HTMLElement | null = null, suppressClick = false;
  const cleanups: Array<() => void> = [];
  type Gesture = { type: 'pointer' | 'touch'; id: number; start: number; origin: number; base: number; opacity: number; prior: number; active: boolean; fromFull: boolean; samples: PointerSample[]; target: HTMLElement };
  let gesture: Gesture | null = null;
  const on = (target: EventTarget, name: string, listener: EventListener, options?: AddEventListenerOptions) => { target.addEventListener(name, listener, options); cleanups.push(() => target.removeEventListener(name, listener, options)); };
  function emit(name: string, detail: unknown, cancelable = false) { return host.dispatchEvent(new CustomEvent('snap-drawer:' + name, { detail, bubbles: true, cancelable })); }
  function theme() {
    for (const node of [root, modal]) {
      node.dataset.theme = settings.theme; node.dataset.shadow = settings.shadow; node.dataset.rating = String(settings.showRating);
      node.style.cssText = style(settings);
      if (settings.theme === 'system' && colorMedia) node.dataset.resolvedTheme = colorMedia.matches ? 'dark' : 'light'; else delete node.dataset.resolvedTheme;
    }
    modal.querySelector<HTMLElement>('.sd-handle')!.hidden = !settings.showHandle;
  }
  function state(value: string) { modal.dataset.state = value; root.dataset.state = value; }
  function measure() {
    geometry = resolveSnapGeometry(settings, view.visualViewport?.height ?? view.innerHeight);
    sheet.style.height = geometry.height + 'px';
    modal.style.setProperty('--sd-viewport-top', (view.visualViewport?.offsetTop ?? 0) + 'px');
    modal.style.setProperty('--sd-viewport-height', (view.visualViewport?.height ?? view.innerHeight) + 'px');
  }
  function paint(nextY: number, nextOpacity: number) {
    y = nextY; opacity = nextOpacity;
    sheet.style.transform = `translate3d(0,${y}px,0)`; overlay.style.opacity = String(opacity);
  }
  function current() {
    const transform = view.getComputedStyle(sheet).transform;
    const parts = transform.match(/^matrix(3d)?\(([^)]+)\)$/);
    if (parts) { const values = parts[2].split(',').map(Number); y = values[parts[1] ? 13 : 5] || 0; }
    opacity = Number(view.getComputedStyle(overlay).opacity) || 0;
  }
  function cancelTransition(read = true) {
    if (read && opened) current();
    generation++; if (timer !== undefined) { clearTimeout(timer); timer = undefined; }
    sheet.style.transition = 'none'; overlay.style.transition = 'none'; paint(y, opacity);
  }
  function controls(announce = false) {
    const disableExpand = index >= geometry.positions.length - 1, disableCollapse = index <= 0;
    if (document.activeElement === expand && disableExpand) { if (!disableCollapse) collapse.disabled = false; (disableCollapse ? closeButton : collapse).focus({ preventScroll: true }); }
    else if (document.activeElement === collapse && disableCollapse) { if (!disableExpand) expand.disabled = false; (disableExpand ? closeButton : expand).focus({ preventScroll: true }); }
    expand.disabled = disableExpand; collapse.disabled = disableCollapse;
    modal.dataset.snap = String(geometry.reachableToSource[index]); modal.dataset.reachableSnap = String(index);
    const highest = index === geometry.positions.length - 1;
    if (!highest && (document.activeElement === scroll || scroll.contains(document.activeElement))) closeButton.focus({ preventScroll: true });
    scroll.dataset.scrollable = String(highest);
    scroll.tabIndex = highest ? 0 : -1;
    // The shell keeps its full geometry; a custom highest snap exposes a smaller reading viewport.
    scroll.style.height = highest ? `calc(100% - ${geometry.positions[index]}px)` : '100%';
    scroll.querySelectorAll<HTMLElement>('a,button').forEach(node => { node.tabIndex = highest ? 0 : -1; });
    if (announce) status.textContent = `View ${index + 1} of ${geometry.positions.length}`;
  }
  function finishClose() {
    if (!opened) return;
    opened = false; closing = false; state('closed');
    if (modal.open) modal.close(); unlockPage(document, modal);
    trigger.setAttribute('aria-expanded', 'false');
    const other = [...(locks.get(document)?.owners ?? [])].at(-1);
    if (other) other.querySelector<HTMLButtonElement>('[data-sd-control="close"]')?.focus({ preventScroll: true });
    else if (initiator?.isConnected) initiator.focus({ preventScroll: true });
    else if (trigger.isConnected) trigger.focus({ preventScroll: true });
    else if (host.isConnected) { const previous = host.getAttribute('tabindex'); host.tabIndex = -1; host.focus({ preventScroll: true }); if (previous === null) host.removeAttribute('tabindex'); else host.setAttribute('tabindex', previous); }
    emit('open-change', { open: false });
  }
  function animate(nextY: number, nextOpacity: number, done: () => void) {
    cancelTransition();
    const duration = paused || media?.matches || document.hidden ? 0 : settings.duration;
    if (!duration || (Math.abs(y - nextY) < .01 && Math.abs(opacity - nextOpacity) < .001)) { paint(nextY, nextOpacity); done(); return; }
    const token = generation;
    // Commit the current pose before retargeting an interrupted transition.
    void sheet.offsetHeight;
    sheet.style.transition = `transform ${duration}ms ${ease[settings.easing]}`;
    overlay.style.transition = `opacity ${duration}ms ${ease[settings.easing]}`;
    paint(nextY, nextOpacity);
    timer = setTimeout(() => { if (destroyed || token !== generation) return; timer = undefined; sheet.style.transition = 'none'; overlay.style.transition = 'none'; done(); }, duration + 24);
  }
  function snap(reachable: number, animateMotion = true) {
    if (!opened || destroyed) return;
    closing = false; index = clamp(reachable, 0, geometry.positions.length - 1); controls(true);
    const targetOpacity = settings.overlayMode === 'constant' || index === geometry.positions.length - 1 ? 1 : 0;
    state('settling');
    const done = () => { state(paused ? 'paused' : 'resting'); emit('snap-change', { index: geometry.reachableToSource[index], reachableIndex: index }); };
    if (animateMotion) animate(geometry.positions[index], targetOpacity, done);
    else { cancelTransition(false); paint(geometry.positions[index], targetOpacity); done(); }
  }
  function cancelGesture() {
    const previous = gesture; gesture = null;
    if (previous?.type === 'pointer' && sheet.hasPointerCapture?.(previous.id)) sheet.releasePointerCapture(previous.id);
    sheet.removeAttribute('data-dragging');
  }
  function open() {
    if (destroyed || !mounted) return;
    if (opened) { if (closing) snap(index); return; }
    measure(); index = geometry.sourceToReachable[settings.initialSnap];
    initiator = document.activeElement instanceof view.HTMLElement ? document.activeElement as HTMLElement : trigger;
    paint(geometry.height, 0); cancelTransition(false);
    try { modal.showModal(); modal.scrollTop = 0; modal.scrollLeft = 0; } catch { fallback.hidden = false; trigger.disabled = true; return; }
    opened = true; closing = false; lockPage(document, modal); trigger.setAttribute('aria-expanded', 'true');
    controls(); closeButton.focus({ preventScroll: true }); modal.scrollTop = 0; state('opening');
    emit('open-change', { open: true });
    const targetOpacity = settings.overlayMode === 'constant' || index === geometry.positions.length - 1 ? 1 : 0;
    animate(geometry.positions[index], targetOpacity, () => { state(paused ? 'paused' : 'resting'); });
  }
  function close() {
    if (!opened || destroyed || closing) return;
    cancelGesture(); closing = true; state('closing'); animate(geometry.height, 0, finishClose);
  }
  function begin(type: Gesture['type'], pointerId: number, clientY: number, time: number, target: HTMLElement) {
    if (!opened || closing || !settings.dragEnabled || target.closest('button,a,input,textarea,select') || gesture) return;
    current();
    gesture = { type, id: pointerId, start: clientY, origin: clientY, base: y, opacity, prior: index, active: false, fromFull: Math.abs(y - geometry.positions.at(-1)!) < 1, samples: [{ y: clientY, time }], target };
  }
  function move(clientY: number, time: number, event: Event) {
    const drag = gesture; if (!drag) return;
    let delta = clientY - drag.start;
    drag.samples.push({ y: clientY, time }); drag.samples = drag.samples.filter(sample => time - sample.time <= 120);
    if (!drag.active) {
      if (Math.abs(delta) < 4) return;
      if (drag.target.closest('.sd-scroll') && drag.fromFull && (scroll.scrollTop > 0 || delta < 0)) {
        drag.start = clientY; drag.base = y; return;
      }
      cancelTransition(); drag.base = y; drag.opacity = opacity; drag.active = true; closing = false;
      sheet.dataset.dragging = ''; state('dragging');
      if (drag.type === 'pointer') try { sheet.setPointerCapture(drag.id); } catch { /* A detached pointer has no capture. */ }
      delta = clientY - drag.start;
    }
    if (event.cancelable) event.preventDefault();
    const nextY = clamp(drag.base + delta, 0, geometry.height);
    let nextOpacity = drag.opacity;
    if (settings.overlayMode === 'constant') nextOpacity = 1;
    else if (drag.fromFull) {
      const full = geometry.positions.at(-1)!;
      const lower = geometry.positions.at(-2) ?? geometry.height;
      nextOpacity = clamp(1 - Math.max(0, nextY - full) / Math.max(1, lower - full), 0, 1);
    }
    paint(nextY, nextOpacity);
    if (nextY === 0 && delta < -drag.base) scroll.scrollTop = Math.max(0, -drag.base - delta);
  }
  function end(clientY: number, time: number, canceled = false) {
    const drag = gesture; if (!drag) return;
    if (drag.active) {
      drag.samples.push({ y: clientY, time });
      const target = canceled ? drag.prior : releaseTarget(geometry, y, drag.prior, drag.samples, clientY - drag.origin);
      suppressClick = true; cancelGesture();
      if (target === 'closed') close(); else snap(target);
    } else cancelGesture();
  }
  function visibleFocusable() {
    const top = view.visualViewport?.offsetTop ?? 0, bottom = top + (view.visualViewport?.height ?? view.innerHeight);
    return [...modal.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],.sd-scroll[tabindex="0"]')].filter(node => { const box = node.getBoundingClientRect(); return node.tabIndex >= 0 && box.height > 0 && box.top >= top && box.bottom <= bottom + 1; });
  }
  function settle() {
    if (!opened) return;
    cancelGesture(); cancelTransition(false);
    if (closing) { paint(geometry.height, 0); finishClose(); }
    else snap(index, false);
  }
  function resize() {
    if (destroyed) return;
    const source = geometry.reachableToSource[index] ?? settings.initialSnap;
    cancelGesture(); measure(); index = geometry.sourceToReachable[Math.min(source, settings.snapPoints.length - 1)];
    if (opened) { if (closing) settle(); else snap(index, false); }
  }
  theme(); state('static');
  if (typeof modal.showModal === 'function') {
    document.body.appendChild(modal); mounted = true; fallback.hidden = true; trigger.disabled = false;
    root.dataset.enhanced = ''; trigger.setAttribute('aria-controls', modal.id); trigger.setAttribute('aria-expanded', 'false'); state('closed');
    on(trigger, 'click', open);
    on(closeButton, 'click', close);
    on(expand, 'click', () => snap(index + 1)); on(collapse, 'click', () => snap(index - 1));
    on(overlay, 'click', () => { if (settings.dismissOnOverlay) close(); });
    on(modal, 'cancel', event => { event.preventDefault(); close(); });
    on(modal, 'close', () => { if (opened && !closing) { cancelTransition(false); finishClose(); } });
    on(modal, 'keydown', event => {
      const key = event as KeyboardEvent;
      if (key.key === 'Escape') { key.preventDefault(); key.stopPropagation(); close(); }
      if (key.key === 'Tab') {
        const nodes = visibleFocusable(), at = nodes.indexOf(document.activeElement as HTMLElement);
        key.preventDefault(); (nodes[(at + (key.shiftKey ? -1 : 1) + nodes.length) % nodes.length] ?? closeButton).focus({ preventScroll: true });
      }
    });
    on(modal, 'focusin', event => {
      const target = event.target as HTMLElement;
      // Pointer focus on the reading region must not change the gesture's snap or origin.
      // Reveal offscreen child controls when keyboard or programmatic focus reaches them.
      if (target !== scroll && scroll.contains(target) && !visibleFocusable().includes(target)) {
        snap(geometry.positions.length - 1, false); target.scrollIntoView({ block: 'nearest' });
      }
    });
    on(sheet, 'click', event => {
      if (suppressClick) { suppressClick = false; event.preventDefault(); event.stopImmediatePropagation(); return; }
      const action = (event.target as HTMLElement).closest('.sd-action');
      if (action?.tagName === 'BUTTON' && emit('action', { settings: resolveSettings(settings) }, true)) close();
    }, { capture: true });
    on(sheet, 'pointerdown', event => { const pointer = event as PointerEvent; suppressClick = false; if (pointer.pointerType !== 'touch' && pointer.button === 0) begin('pointer', pointer.pointerId, pointer.clientY, pointer.timeStamp, pointer.target as HTMLElement); });
    on(view, 'pointermove', event => { const pointer = event as PointerEvent; if (gesture?.type === 'pointer' && gesture.id === pointer.pointerId) move(pointer.clientY, pointer.timeStamp, event); });
    on(view, 'pointerup', event => { const pointer = event as PointerEvent; if (gesture?.type === 'pointer' && gesture.id === pointer.pointerId) end(pointer.clientY, pointer.timeStamp); });
    on(view, 'pointercancel', event => { const pointer = event as PointerEvent; if (gesture?.type === 'pointer' && gesture.id === pointer.pointerId) end(pointer.clientY, pointer.timeStamp, true); });
    on(sheet, 'touchstart', event => { const touch = event as TouchEvent; suppressClick = false; if (touch.touches.length === 1) { const point = touch.changedTouches[0]; begin('touch', point.identifier, point.clientY, touch.timeStamp, touch.target as HTMLElement); } }, { passive: true });
    on(sheet, 'touchmove', event => { const touch = event as TouchEvent; const point = [...touch.changedTouches].find(item => gesture?.type === 'touch' && item.identifier === gesture.id); if (point) move(point.clientY, touch.timeStamp, event); }, { passive: false });
    for (const name of ['touchend', 'touchcancel']) on(sheet, name, event => { const touch = event as TouchEvent; const point = [...touch.changedTouches].find(item => gesture?.type === 'touch' && item.identifier === gesture.id); if (point) end(point.clientY, touch.timeStamp, name === 'touchcancel'); }, { passive: true });
    on(view, 'resize', resize); if (view.visualViewport) { on(view.visualViewport, 'resize', resize); on(view.visualViewport, 'scroll', resize); }
    on(document, 'visibilitychange', () => { if (document.hidden) settle(); });
    if (media) on(media, 'change', () => { if (media.matches) settle(); });
    if (colorMedia) on(colorMedia, 'change', () => { if (settings.theme === 'system') { theme(); if (opened) { measure(); paint(y, opacity); } } });
  }
  return {
    open, close,
    snapTo(source) { if (!Number.isInteger(source) || source < 0 || source >= settings.snapPoints.length) throw new Error('Invalid snap index.'); if (opened) snap(geometry.sourceToReachable[source]); },
    update(next) {
      if (destroyed) return;
      const resolved = resolveSettings(next);
      if (JSON.stringify(resolved) === JSON.stringify(settings)) return;
      const oldSource = geometry.reachableToSource[index] ?? settings.initialSnap;
      const active = document.activeElement as HTMLElement | null, actionFocused = active?.classList.contains('sd-action'), oldScroll = scroll.scrollTop;
      const oldBody = content(settings, identity);
      cancelGesture(); cancelTransition(); settings = resolved; theme();
      trigger.textContent = settings.triggerLabel;
      const body = content(settings, identity);
      if (oldBody !== body) scroll.innerHTML = body;
      fallback.innerHTML = content(settings, identity + '-static');
      measure(); index = geometry.sourceToReachable[Math.min(oldSource, settings.snapPoints.length - 1)];
      if (opened) { if (closing) settle(); else snap(index, false); scroll.scrollTop = oldScroll; if (actionFocused) (scroll.querySelector<HTMLElement>('.sd-action') ?? closeButton).focus({ preventScroll: true }); }
    },
    pause() { if (destroyed) return; paused = true; settle(); },
    resume() { if (destroyed) return; paused = false; if (opened) state('resting'); },
    destroy() {
      if (destroyed) return;
      cancelGesture(); cancelTransition(false); if (opened) finishClose(); destroyed = true;
      cleanups.splice(0).forEach(cleanup => cleanup()); unlockPage(document, modal); modal.remove();
      trigger.disabled = true; trigger.removeAttribute('aria-controls'); trigger.removeAttribute('aria-expanded');
      delete root.dataset.enhanced; fallback.hidden = false; state('destroyed');
    },
  };
}
