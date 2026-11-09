import manifest from '../../component.json';
import { statusPaths } from './icons';

export type ToastType = 'default' | 'success' | 'info' | 'warning' | 'error' | 'loading' | 'custom';
export interface Settings {
  gradientMode: 'off' | 'neutral' | 'status' | 'custom'; gradientColor: string; gradientStrength: number; gradientX: number; gradientY: number; gradientSpread: number;
  presentation: 'toast' | 'compact' | 'banner'; actionHeight: number; actionRadius: number;
  variant: 'standard' | 'headless'; title: string; description: string; messages: string[]; type: ToastType;
  actionLabel: string; showAction: boolean; showClose: boolean; showIcon: boolean; regionLabel: string;
  loadingLabel: string; successLabel: string; errorLabel: string;
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  placement: 'viewport' | 'container'; width: number; inset: number; compactInset: number; compactAt: number;
  maxVisible: number; gap: number; depthOffset: number; depthScale: number; expanded: boolean; padding: number;
  theme: 'auto' | 'light' | 'dark'; palette: 'monochrome' | 'semantic' | 'custom' | 'library'; surfaceColor: string;
  textColor: string; descriptionColor: string; borderColor: string; actionColor: string; actionTextColor: string;
  successColor: string; infoColor: string; warningColor: string; errorColor: string;
  radius: number; borderWidth: number; shadow: 'none' | 'soft' | 'strong'; fontSize: number; titleWeight: number;
  lineHeight: number; descriptionLineHeight: number; textGap: number; iconSize: number; duration: number;
  transitionDuration: number; shadowDuration: number; exitRemovalDelay: number; easing: 'ease' | 'ease-out' | 'linear';
  loaderDuration: number; animate: boolean; pauseOnHover: boolean; expandOnHover: boolean;
  swipeToDismiss: boolean; swipeThreshold: number; swipeVelocity: number;
}
export type DismissReason = 'action' | 'close' | 'swipe' | 'escape' | 'timeout' | 'programmatic';
export interface ToastAction { label: string; onClick?: (id: string) => void | Promise<void>; closeOnAction?: boolean }
export interface ToastInput { id?: string; title: string; description?: string; type?: ToastType; duration?: number;
  dismissible?: boolean; action?: ToastAction; onDismiss?: (id: string, reason: DismissReason) => void | Promise<void> }
export type ToastPatch = Partial<Omit<ToastInput, 'id' | 'description' | 'action' | 'onDismiss'>> & {
  description?: string | null; action?: ToastAction | null; onDismiss?: ToastInput['onDismiss'] | null };
export interface Callbacks { onAction?: ToastAction['onClick']; onDismiss?: ToastInput['onDismiss'] }
export type PromiseOutcome<T> = { status: 'fulfilled'; value: T; displayError?: unknown } | { status: 'rejected'; reason: unknown; displayError?: unknown };
export interface PromiseMessages<T> { loading: string; success: string | ((value: T) => string | Promise<string>); error: string | ((reason: unknown) => string | Promise<string>) }
export interface Controller { update(settings: Partial<Settings>): void; pause(): void; resume(): void; destroy(): void;
  notify(input: ToastInput): string; updateToast(id: string, patch: ToastPatch): boolean; dismiss(id?: string): void;
  notifyPromise<T>(promise: PromiseLike<T>, messages?: PromiseMessages<T>): { id: string; settled: Promise<PromiseOutcome<T>> }; focus(): void }

const definitions = manifest.settings;
export const defaults: Settings = Object.fromEntries(definitions.map(d => [d.key, Array.isArray(d.default) ? [...d.default] : d.default])) as unknown as Settings;
const own = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);
function object(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Expected an object');
  return input as Record<string, unknown>;
}
function bounded(value: unknown, max: number, nonempty = false): string {
  if (typeof value !== 'string' || value.length > max || (nonempty && !value.trim())) throw new TypeError('Invalid notification text');
  return value;
}
export function resolveSettings(input: unknown = {}): Settings {
  const result: Record<string, unknown> = Object.fromEntries(definitions.map(d => [d.key, Array.isArray(d.default) ? [...d.default] : d.default]));
  for (const [key, value] of Object.entries(object(input))) {
    const d = definitions.find(item => item.key === key);
    if (!d) throw new TypeError(`Unknown setting: ${key}`);
    if (value === undefined) continue;
    if (d.kind === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < d.min! || value > d.max! || (d.step! >= 1 && !Number.isInteger(value))) throw new RangeError(`Invalid number: ${key}`);
    } else if (d.kind === 'boolean') { if (typeof value !== 'boolean') throw new TypeError(`Invalid boolean: ${key}`); }
    else if (d.kind === 'string-list') {
      if (!Array.isArray(value) || value.length < d.minItems! || value.length > d.maxItems!) throw new TypeError(`Invalid list: ${key}`);
      value.forEach(v => bounded(v, d.maxItemLength!));
    } else {
      bounded(value, d.maxLength ?? 100000);
      if (d.kind === 'select' && !d.options!.includes(value as string)) throw new TypeError(`Invalid selection: ${key}`);
      if (d.kind === 'color' && value !== 'transparent' && !/^#[\da-f]{6}([\da-f]{2})?$/i.test(value as string)) throw new TypeError(`Invalid color: ${key}`);
    }
    result[key] = Array.isArray(value) ? [...value] : value;
  }
  return result as unknown as Settings;
}
const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
function icon(type: ToastType): string {
  if (type === 'loading') return `<div class="ats-loader" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<div style="--bar:${i}"></div>`).join('')}</div>`;
  if (!(type in statusPaths)) return '';
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${statusPaths[type as keyof typeof statusPaths].map(d => `<path d="${d}"/>`).join('')}</svg>`;
}
const closeIcon = '<svg aria-hidden="true" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3L9 9M9 3L3 9"/></svg>';
function content(input: ToastInput, settings: Settings, enhanced: boolean, actionable: boolean): string {
  const glyph = settings.showIcon ? icon(input.type ?? 'default') : '';
  return `<div class="ats-body">${glyph ? `<div class="ats-icon">${glyph}</div>` : ''}<div class="ats-content"><div class="ats-title">${escape(input.title || regionLabel(settings))}</div>${input.description ? `<div class="ats-description">${escape(input.description)}</div>` : ''}</div>${input.action ? `<button class="ats-action" type="button" ${enhanced && actionable ? '' : 'disabled'}>${escape(input.action.label)}</button>` : ''}${enhanced && input.dismissible !== false && settings.showClose ? `<button class="ats-close" type="button" aria-label="Close toast">${closeIcon}</button>` : ''}</div>`;
}
const regionLabel = (s: Settings) => s.regionLabel.trim() ? s.regionLabel : 'Notifications';
function initial(s: Settings): ToastInput[] {
  return [s.title, ...s.messages].map((title, i) => ({ title: title.trim() ? title : regionLabel(s), description: i === 0 ? s.description : '', type: s.type, duration: s.duration, ...(s.showAction ? { action: { label: s.actionLabel.trim() ? s.actionLabel : 'Undo' } } : {}) }));
}
function variables(s: Settings): string {
  const px = ['width', 'padding', 'radius', 'borderWidth', 'fontSize', 'textGap', 'iconSize', 'gap', 'actionHeight', 'actionRadius'] as const;
  return [`--gradientColor:${s.gradientColor}`, ...(['gradientStrength','gradientX','gradientY','gradientSpread'] as const).map(key => `--${key}:${s[key]}%`), ...px.map(key => `--${key}:${s[key]}px`), `--titleWeight:${s.titleWeight}`, `--lineHeight:${s.lineHeight}`, `--descriptionLineHeight:${s.descriptionLineHeight}`, `--shadow:${s.shadow === 'none' ? 'none' : s.shadow === 'strong' ? '0 8px 24px #0000002e' : '0 4px 12px #0000001a'}`, `--shadowDuration:${s.shadowDuration}ms`, `--loaderDuration:${s.loaderDuration}ms`, ...['surfaceColor','textColor','descriptionColor','borderColor','actionColor','actionTextColor','successColor','infoColor','warningColor','errorColor'].map(key => `--${key}:${s[key as keyof Settings]}`)].join(';');
}
export function render(input: Partial<Settings> = {}): string {
  const s = resolveSettings(input);
  return `<section class="ats" data-ats-fallback data-gradient="${s.gradientMode}" data-presentation="${s.presentation}" data-theme="${s.theme}" data-palette="${s.palette}" data-variant="${s.variant}" aria-label="${escape(regionLabel(s))}" style="${variables(s)}"><ol class="ats-list">${initial(s).map(t => `<li class="ats-card" data-type="${t.type}">${content(t, s, false, false)}</li>`).join('')}</ol></section>`;
}
function validatePatch(input: unknown, allowId = false): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(object(input))) {
    if (!['title','description','type','duration','dismissible','action','onDismiss', ...(allowId ? ['id'] : [])].includes(key)) throw new TypeError(`Unknown notification field: ${key}`);
    if (v === undefined) continue;
    if (key === 'title') bounded(v, 240, true);
    if (key === 'id') bounded(v, 100, true);
    if (key === 'description' && v !== null) bounded(v, 1000);
    if (key === 'type' && !['default','success','info','warning','error','loading','custom'].includes(v as string)) throw new TypeError('Invalid notification type');
    if (key === 'duration' && (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 30000)) throw new RangeError('Invalid duration');
    if (key === 'dismissible' && typeof v !== 'boolean') throw new TypeError('Invalid dismissible');
    if (key === 'onDismiss' && v !== null && typeof v !== 'function') throw new TypeError('Invalid dismissal handler');
    if (key === 'action' && v !== null) {
      const a = object(v); bounded(a.label, 60, true);
      if (Object.keys(a).some(k => !['label','onClick','closeOnAction'].includes(k)) || (a.onClick !== undefined && typeof a.onClick !== 'function') || (a.closeOnAction !== undefined && typeof a.closeOnAction !== 'boolean')) throw new TypeError('Invalid action');
      patch[key] = { ...a }; continue;
    }
    patch[key] = v;
  }
  return patch;
}
interface MotionTrack { node: HTMLElement; property: 'transform' | 'opacity'; target: string; reversingStart: string; shorteningFactor: number; native?: boolean; animation?: Animation }
interface IconLayer { node: HTMLElement; type: ToastType; key: string; outgoing: boolean }
interface RecordState { id: string; input: ToastInput; node: HTMLLIElement; remaining: number; exitRemaining: number;
  phase: 'entering' | 'visible' | 'exiting'; generation: number; shown: boolean; visible: boolean; owned: number | null;
  tracks: Map<string, MotionTrack>; iconLayers: IconLayer[]; iconSequence: number; busy: boolean; reason?: DismissReason; announced: string }
const propPauseHandlers = new WeakMap<Controller, (paused: boolean) => void>();
/** Internal adapter bridge; manual suspension remains independent. */
export function setPropPaused(controller: Controller, paused: boolean): void { propPauseHandlers.get(controller)?.(paused); }
const instances: Array<{ focus(): void; document: Document }> = [];
let lastInstance: (typeof instances)[number] | undefined;

export function mount(host: HTMLElement, input: Partial<Settings> = {}, callbacks: Callbacks = {}): Controller {
  let settings = resolveSettings(input);
  const doc = host.ownerDocument, win = doc.defaultView!;
  const region = doc.createElement('section'); region.className = 'ats'; region.dataset.enhanced = 'true';
  const list = doc.createElement('ol'); list.className = 'ats-list'; list.tabIndex = -1;
  const live = doc.createElement('div'); live.className = 'ats-live'; live.setAttribute('aria-live','polite'); live.setAttribute('aria-relevant','additions text'); live.setAttribute('aria-atomic','false');
  region.append(list, live);
  for (const child of Array.from(host.children)) if (child.hasAttribute('data-ats-fallback')) child.remove();
  host.append(region);
  const previousPosition = host.style.position;
  let changedPosition = false, destroyed = false, count = 0, timer: ReturnType<typeof setTimeout> | undefined;
  let records: RecordState[] = [], lastTime = win.performance.now(), hovering = false, focusing = false, invoker: HTMLElement | null = null;
  const masks = new Set<string>();
  const reducedQuery = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const darkQuery = win.matchMedia?.('(prefers-color-scheme: dark)');
  const fineQuery = win.matchMedia?.('(hover: hover) and (pointer: fine)');
  const reduced = () => !settings.animate || !reducedQuery || reducedQuery.matches;
  const safeErrorLabel = () => settings.errorLabel.trim() ? settings.errorLabel : 'Could not save changes';
  const hardPaused = () => masks.size > 0;
  const lifePaused = () => hardPaused() || focusing || (hovering && settings.pauseOnHover);
  const expanded = () => settings.expanded || focusing || (hovering && settings.expandOnHover);
  const listeners: Array<() => void> = [];
  function listen(target: EventTarget, type: string, callback: EventListener, options?: AddEventListenerOptions) {
    target.addEventListener(type, callback, options); listeners.push(() => target.removeEventListener(type, callback, options));
  }
  function account() {
    const now = win.performance.now(), elapsed = now - lastTime; lastTime = now;
    for (const r of records) {
      if (r.phase === 'exiting') { if (!hardPaused()) r.exitRemaining -= elapsed; }
      else if (r.visible && r.shown && r.input.type !== 'loading' && !lifePaused() && Number.isFinite(r.remaining)) r.remaining -= elapsed;
    }
  }
  function schedule() {
    if (timer !== undefined) clearTimeout(timer); timer = undefined;
    if (destroyed || hardPaused()) return;
    let delay = Infinity;
    for (const r of records) {
      if (r.phase === 'exiting') delay = Math.min(delay, r.exitRemaining);
      else if (!lifePaused() && r.visible && r.input.type !== 'loading') delay = Math.min(delay, r.remaining);
    }
    if (Number.isFinite(delay)) timer = setTimeout(tick, Math.max(0, delay));
  }
  function tick() {
    account();
    for (const r of [...records]) {
      if (r.phase === 'exiting' && r.exitRemaining <= 0) remove(r);
      else if (r.phase !== 'exiting' && r.visible && r.input.type !== 'loading' && r.remaining <= 0) dismissRecord(r, 'timeout');
    }
    schedule();
  }
  function announce(r: RecordState) {
    if (!r.visible) return;
    const signature = JSON.stringify([r.input.title, r.input.description, r.input.type]);
    if (r.announced === signature) return;
    r.announced = signature;
    const message = doc.createElement('span'); message.textContent = [r.input.title, r.input.description].filter(Boolean).join('. ');
    live.replaceChildren(message);
  }
  const suspendedAnimations = new Set<Animation>();
  function freezeAnimation(animation: Animation) {
    if (animation.playState === 'finished' || animation.playState === 'idle') return;
    const time = animation.currentTime ?? 0;
    animation.pause();
    animation.currentTime = time;
    suspendedAnimations.add(animation);
  }
  function ownedAnimations(): Animation[] {
    const tracks = records.flatMap(r => [...r.tracks.values()].flatMap(track => track.animation ? [track.animation] : []));
    return [...new Set([...tracks, ...(typeof region.getAnimations === 'function' ? region.getAnimations({ subtree: true }) : [])])];
  }
  function cancelTrack(track: MotionTrack) {
    if (track.native) { track.node.style.transition = 'none'; for (const animation of track.node.getAnimations()) if ('transitionProperty' in animation && (animation as CSSTransition).transitionProperty === track.property) { suspendedAnimations.delete(animation); animation.cancel(); } track.native = false; }
    if (track.animation) { suspendedAnimations.delete(track.animation); track.animation.cancel(); track.animation = undefined; }
  }
  let interactionLayout = false, interactionFrame: number | undefined, nativeFrame: number | undefined;
  const pendingMoves = new Map<string, () => void>();
  const pendingNative = new Map<string, () => void>();
  function layoutInteraction() {
    interactionLayout = true;
    try { layout(); } finally { interactionLayout = false; }
  }
  function move(r: RecordState, key: string, node: HTMLElement, property: 'transform' | 'opacity', target: string, options: { from?: string; duration?: number; complete?: () => void; immediate?: boolean; easing?: Settings['easing']; reversible?: boolean; frameSampled?: boolean } = {}) {
    const pendingKey = `${r.id}:${key}`;
    pendingMoves.delete(pendingKey); pendingNative.delete(pendingKey);
    const previous = r.tracks.get(key);
    if (previous?.node === node && previous.target === target) return;
    if (interactionLayout && !options.frameSampled && !reduced() && (key === 'card-transform' || key === 'body-opacity') && typeof win.requestAnimationFrame === 'function') {
      pendingMoves.set(pendingKey, () => { if (records.includes(r) && r.phase !== 'exiting') move(r, key, node, property, target, { ...options, frameSampled: true }); });
      if (interactionFrame === undefined) interactionFrame = win.requestAnimationFrame(() => {
        interactionFrame = win.requestAnimationFrame(() => {
          interactionFrame = undefined;
          const changes = [...pendingMoves.values()]; pendingMoves.clear();
          for (const apply of changes) apply();
        });
      });
      return;
    }
    const from = options.from ?? win.getComputedStyle(node)[property];
    const nativeMotion = (interactionLayout || options.frameSampled || previous?.native) && r.phase !== 'exiting' && !reduced() && typeof node.getAnimations === 'function' && typeof win.requestAnimationFrame === 'function' && (key === 'card-transform' || key === 'body-opacity');
    if (nativeMotion) {
      if (!previous?.native) {
        const active = Boolean(previous?.animation);
        if (previous) cancelTrack(previous);
        node.style.transition = 'none'; node.style[property] = previous && !active ? previous.target : from;
        void win.getComputedStyle(node)[property];
      }
      const track: MotionTrack = { node, property, target, reversingStart: from, shorteningFactor: 1, native: true };
      r.tracks.set(key, track);
      node.style.transition = `${property} ${settings.transitionDuration}ms ${settings.easing}`;
      node.style[property] = target;
      const collect = () => {
        if (r.tracks.get(key) !== track) return;
        track.animation = node.getAnimations().find(animation => 'transitionProperty' in animation && (animation as CSSTransition).transitionProperty === property);
        if (track.animation && hardPaused()) freezeAnimation(track.animation);
      };
      if (hardPaused()) collect();
      else {
        pendingNative.set(pendingKey, collect);
        if (nativeFrame === undefined) nativeFrame = win.requestAnimationFrame(() => {
          nativeFrame = undefined;
          const changes = [...pendingNative.values()]; pendingNative.clear();
          for (const apply of changes) apply();
        });
      }
      return;
    }
    if (previous?.native) node.style.transition = 'none';
    const interrupted = previous?.animation;
    let shorteningFactor = 1, reversingStart = from;
    const equivalent = (a: string, b: string) => {
      if (a === b) return true;
      if (property === 'opacity') return Number(a) === Number(b);
      try {
        const left = new win.DOMMatrix(a), right = new win.DOMMatrix(b);
        return Array.from(left.toFloat64Array()).every((value, index) => Math.abs(value - right.toFloat64Array()[index]) < 0.000001);
      } catch { return false; }
    };
    if (interrupted && previous && options.reversible !== false && equivalent(previous.reversingStart, target)) {
      const progress = interrupted.effect?.getComputedTiming().progress;
      if (typeof progress === 'number') {
        shorteningFactor = Math.min(1, Math.abs(progress * previous.shorteningFactor + 1 - previous.shorteningFactor));
        reversingStart = previous.target;
      }
    }
    if (previous) cancelTrack(previous);
    const track: MotionTrack = { node, property, target, reversingStart, shorteningFactor };
    r.tracks.set(key, track); node.style[property] = target;
    if (reduced() || options.immediate || typeof node.animate !== 'function' || from === target) { options.complete?.(); return; }
    const animation = node.animate([{ [property]: from }, { [property]: target }], {
      duration: (options.duration ?? settings.transitionDuration) * shorteningFactor, easing: options.easing ?? settings.easing, delay: 0, fill: 'forwards'
    });
    track.animation = animation;
    if (interrupted && !options.frameSampled && !hardPaused() && doc.timeline?.currentTime != null) animation.startTime = doc.timeline.currentTime;
    animation.onfinish = () => {
      if (r.tracks.get(key) !== track || track.animation !== animation) return;
      cancelTrack(track); options.complete?.();
    };
    if (hardPaused()) freezeAnimation(animation);
  }
  function removeIconLayer(r: RecordState, layer: IconLayer) {
    for (const key of [layer.key + '-opacity', layer.key + '-transform']) {
      const track = r.tracks.get(key); if (track) cancelTrack(track); r.tracks.delete(key);
    }
    layer.node.remove(); r.iconLayers = r.iconLayers.filter(item => item !== layer);
    if (!r.iconLayers.length) r.node.querySelector('.ats-icon')?.remove();
  }
  function finishMotion(r: RecordState) {
    for (const track of r.tracks.values()) cancelTrack(track);
    for (const layer of [...r.iconLayers]) if (layer.outgoing) removeIconLayer(r, layer);
    if (r.phase === 'entering') r.phase = 'visible';
    if (r.phase === 'exiting') r.exitRemaining = 0;
  }
  function drawIcon(r: RecordState, body: HTMLElement) {
    const type = r.input.type ?? 'default';
    const glyph = settings.showIcon ? icon(type) : '';
    let slot = body.querySelector<HTMLElement>('.ats-icon');
    if (glyph && !slot) { slot = doc.createElement('div'); slot.className = 'ats-icon'; body.prepend(slot); }
    let current = glyph ? r.iconLayers.find(layer => layer.type === type) : undefined;
    if (glyph && !current) {
      const node = doc.createElement('div'); node.className = 'ats-icon-layer'; node.setAttribute('aria-hidden','true'); node.innerHTML = glyph;
      current = { node, type, key: `icon-${++r.iconSequence}`, outgoing: false };
      const animate = r.shown || r.iconLayers.length > 0;
      r.iconLayers.push(current); slot!.append(node);
      move(r, current.key + '-transform', node, 'transform', 'scale(1)', { from: 'scale(.8)', duration: 300, immediate: !animate });
      move(r, current.key + '-opacity', node, 'opacity', '1', { from: '0', duration: 300, immediate: !animate });
    }
    for (const layer of [...r.iconLayers]) {
      layer.outgoing = layer !== current;
      if (layer === current) {
        move(r, layer.key + '-transform', layer.node, 'transform', 'scale(1)', { duration: 300 });
        move(r, layer.key + '-opacity', layer.node, 'opacity', '1', { duration: 300 });
      } else {
        move(r, layer.key + '-transform', layer.node, 'transform', 'scale(.8)', { duration: 200 });
        move(r, layer.key + '-opacity', layer.node, 'opacity', '0', { duration: 200, complete: () => { if (layer.outgoing) removeIconLayer(r,layer); } });
      }
    }
  }
  function drawContent(r: RecordState) {
    const active = r.node.contains(doc.activeElement) ? doc.activeElement as HTMLElement : null;
    const focusTarget = active === r.node ? 'card' : active?.closest('.ats-close') ? 'close' : active?.closest('.ats-action') ? 'action' : null;
    let body = r.node.querySelector<HTMLElement>('.ats-body');
    if (!body) { body = doc.createElement('div'); body.className = 'ats-body'; r.node.append(body); }
    let contentNode = body.querySelector<HTMLElement>('.ats-content');
    if (!contentNode) { contentNode = doc.createElement('div'); contentNode.className = 'ats-content'; body.append(contentNode); }
    let title = contentNode.querySelector<HTMLElement>('.ats-title');
    if (!title) { title = doc.createElement('div'); title.className = 'ats-title'; contentNode.append(title); }
    title.textContent = r.input.title || regionLabel(settings);
    let description = contentNode.querySelector<HTMLElement>('.ats-description');
    if (r.input.description) {
      if (!description) { description = doc.createElement('div'); description.className = 'ats-description'; contentNode.append(description); }
      description.textContent = r.input.description;
    } else description?.remove();
    let action = body.querySelector<HTMLButtonElement>('.ats-action');
    if (r.input.action) {
      if (!action) { action = doc.createElement('button'); action.type = 'button'; action.className = 'ats-action'; body.append(action); }
      action.textContent = r.input.action.label;
      action.disabled = r.busy || !(r.input.action.onClick || callbacks.onAction);
    } else action?.remove();
    let close = body.querySelector<HTMLButtonElement>('.ats-close');
    if (r.input.dismissible !== false && settings.showClose) {
      if (!close) { close = doc.createElement('button'); close.type = 'button'; close.className = 'ats-close'; close.setAttribute('aria-label','Close toast'); close.innerHTML = closeIcon; body.append(close); }
    } else close?.remove();
    drawIcon(r, body); r.node.dataset.type = r.input.type ?? 'default';
    if (focusTarget && focusTarget !== 'card' && active !== doc.activeElement) (body.querySelector<HTMLElement>(focusTarget === 'close' ? '.ats-close' : '.ats-action') ?? r.node).focus({ preventScroll: true });
    if (hardPaused()) for (const animation of ownedAnimations()) freezeAnimation(animation);
  }
  function animateTo(r: RecordState, transform: string, opacity: string, fresh = false, motion: { duration?: number; easing?: Settings['easing']; reversible?: boolean } = {}) {
    move(r, 'card-transform', r.node, 'transform', transform, { ...motion, ...(fresh ? { from: `translate3d(0,${settings.position.startsWith('top') ? '-' : ''}100%,0)` } : {}) });
    move(r, 'card-opacity', r.node, 'opacity', opacity, { ...motion, ...(fresh ? { from: '0' } : {}), complete: () => { if (r.phase === 'entering') r.phase = 'visible'; } });
  }
  function layout(fresh?: RecordState) {
    if (destroyed) return;
    region.setAttribute('aria-label', regionLabel(settings)); region.dataset.theme = settings.theme === 'auto' ? (darkQuery?.matches ? 'dark' : 'light') : settings.theme;
    region.dataset.gradient = settings.gradientMode; region.dataset.presentation = settings.presentation; region.dataset.palette = settings.palette; region.dataset.variant = settings.variant; region.dataset.reduced = String(reduced()); region.dataset.paused = String(hardPaused());
    region.style.cssText = variables(settings);
    const container = settings.placement === 'container';
    if (container && win.getComputedStyle(host).position === 'static') { host.style.position = 'relative'; changedPosition = true; }
    if (!container && changedPosition) { host.style.position = previousPosition; changedPosition = false; }
    const hostStyle = win.getComputedStyle(host);
    const paddingLeft = container ? parseFloat(hostStyle.paddingLeft) || 0 : 0;
    const paddingRight = container ? parseFloat(hostStyle.paddingRight) || 0 : 0;
    const paddingTop = container ? parseFloat(hostStyle.paddingTop) || 0 : 0;
    const paddingBottom = container ? parseFloat(hostStyle.paddingBottom) || 0 : 0;
    const available = container ? Math.max(0, host.clientWidth - paddingLeft - paddingRight) : win.innerWidth;
    const compact = available <= settings.compactAt;
    const inset = Math.min(compact ? settings.compactInset : settings.inset, Math.max(0, available / 2));
    const width = Math.max(0, compact && settings.presentation !== 'toast' ? available - 2 * inset : Math.min(settings.width, available - 2 * inset));
    const top = settings.position.startsWith('top'); const side = settings.position.split('-')[1];
    Object.assign(list.style, { position: container ? 'absolute' : 'fixed', width: `${width}px`, top: top ? `${inset + paddingTop}px` : 'auto', bottom: top ? 'auto' : `${inset + paddingBottom}px`, left: side === 'left' ? `${inset + paddingLeft}px` : side === 'center' ? (container ? `${paddingLeft + available / 2}px` : '50%') : 'auto', right: side === 'right' ? `${inset + paddingRight}px` : 'auto', transform: side === 'center' ? 'translateX(-50%)' : 'none' });
    list.dataset.edge = top ? 'top' : 'bottom'; list.dataset.expanded = String(expanded());
    let offset = 0, index = 0;
    for (const r of records) {
      if (r.phase === 'exiting') continue;
      r.visible = index < settings.maxVisible;
      r.node.hidden = !r.visible; r.node.style.zIndex = String(100 - index);
      const accessible = r.visible && (index === 0 || expanded());
      r.node.inert = !accessible; r.node.tabIndex = accessible ? 0 : -1;
      r.node.setAttribute('aria-hidden', String(!accessible)); r.node.dataset.front = String(index === 0); r.node.dataset.expanded = String(expanded());
      if (r.visible) {
        const y = (top ? 1 : -1) * (expanded() ? offset : index * settings.depthOffset);
        const scale = expanded() ? 1 : Math.max(0, 1 - index * settings.depthScale);
        animateTo(r, `translate3d(0,${y}px,0) scale(${scale})`, '1', r === fresh || !r.shown);
        move(r, 'body-opacity', r.node.querySelector<HTMLElement>('.ats-body')!, 'opacity', accessible ? '1' : '0');
        offset += parseFloat(win.getComputedStyle(r.node).height) + settings.gap;
        if (!r.shown) r.shown = true;
        announce(r);
      }
      index++;
    }
    schedule();
  }
  function remove(r: RecordState) {
    const restore = r.node.contains(doc.activeElement);
    for (const track of r.tracks.values()) cancelTrack(track); resizeObserver?.unobserve(r.node); r.node.remove(); records = records.filter(item => item !== r);
    if (restore && invoker?.isConnected) invoker.focus({ preventScroll: true });
    layout();
  }
  async function reportDismiss(r: RecordState, reason: DismissReason) {
    try { await r.input.onDismiss?.(r.id, reason); } catch { /* Dismissal continues independently of application handlers. */ }
    try { await callbacks.onDismiss?.(r.id, reason); } catch { /* Application errors cannot retain a dismissed card. */ }
  }
  function dismissRecord(r: RecordState, reason: DismissReason, exitTransform?: string) {
    if (r.phase === 'exiting' || (reason !== 'timeout' && r.input.dismissible === false)) return;
    account(); r.phase = 'exiting'; r.generation++; r.reason = reason; r.exitRemaining = reduced() ? 0 : settings.exitRemovalDelay;
    r.node.dataset.removed = 'true'; r.node.style.pointerEvents = 'none';
    animateTo(r, exitTransform ?? `translate3d(0,${settings.position.startsWith('top') ? '-' : ''}100%,0)`, '0', false, reason === 'swipe' ? { duration: 200, easing: 'ease-out', reversible: false } : {});
    void reportDismiss(r, reason);
    if (r.exitRemaining === 0 && !hardPaused()) remove(r); else layout();
  }
  const durationOf = (value: number) => value === 0 ? Infinity : value;
  function notify(input: ToastInput, owned: number | null = null): string {
    const patch = validatePatch(input, true); bounded(patch.title, 240, true);
    if (destroyed) throw new Error('Toast Stack has been destroyed');
    let id = patch.id as string | undefined;
    if (!id) { do { id = `toast-${++count}`; } while (records.some(r => r.id === id)); }
    const existing = records.find(r => r.id === id);
    if (existing) { if (existing.phase === 'exiting') throw new RangeError('Notification is exiting'); const { id: _id, ...rest } = patch; updateToast(id, rest as ToastPatch); return id; }
    if (records.length >= 100) throw new RangeError('Toast Stack capacity reached');
    account();
    const node = doc.createElement('li'); node.className = 'ats-card'; node.dataset.toastId = id;
    const data = { type: 'default' as ToastType, dismissible: true, ...patch } as ToastInput;
    const r: RecordState = { id, input: data, node, remaining: durationOf(data.duration ?? settings.duration), exitRemaining: 0, phase: 'entering', generation: 0, shown: false, visible: false, owned, tracks: new Map(), iconLayers: [], iconSequence: 0, busy: false, announced: '' };
    records.unshift(r); list.prepend(node); drawContent(r); resizeObserver?.observe(node); layout(r); checkVisibility(); return id;
  }
  function updateToast(id: string, patch: ToastPatch): boolean {
    const clean = validatePatch(patch);
    const r = records.find(item => item.id === id);
    if (destroyed || !r || r.phase === 'exiting') return false;
    account(); const wasLoading = r.input.type === 'loading'; r.generation++; r.busy = false;
    const next = { ...r.input, ...clean } as ToastInput;
    for (const key of ['description','action','onDismiss'] as const) if (clean[key] === null) delete next[key];
    r.input = next;
    if (own(clean, 'duration')) r.remaining = durationOf(next.duration!);
    else if (wasLoading && next.type !== 'loading') r.remaining = durationOf(settings.duration);
    drawContent(r); layout(); if (r.shown) announce(r); return true;
  }
  function pauseMask(reason: string, enabled: boolean) {
    account(); const wasPaused = hardPaused();
    const animations = ownedAnimations();
    if (enabled) masks.add(reason); else masks.delete(reason);
    if (!wasPaused && hardPaused()) for (const animation of animations) freezeAnimation(animation);
    region.dataset.paused = String(hardPaused());
    if (wasPaused && !hardPaused()) {
      for (const animation of suspendedAnimations) if (animation.playState !== 'idle' && animation.playState !== 'finished') animation.play();
      suspendedAnimations.clear();
    }
    schedule();
  }
  function checkVisibility() {
    if (settings.placement !== 'container' || !records.length) { pauseMask('offscreen', false); return; }
    const rect = host.getBoundingClientRect(); pauseMask('offscreen', rect.width > 0 && rect.height > 0 && (rect.bottom <= 0 || rect.top >= win.innerHeight || rect.right <= 0 || rect.left >= win.innerWidth));
  }
  const resizeObserver = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(() => { account(); layout(); checkVisibility(); }) : undefined;
  resizeObserver?.observe(host);
  const intersectionObserver = typeof win.IntersectionObserver === 'function' ? new win.IntersectionObserver(checkVisibility) : undefined;
  intersectionObserver?.observe(host);
  function focus() {
    if (destroyed) return;
    if (!region.contains(doc.activeElement)) invoker = doc.activeElement instanceof win.HTMLElement ? doc.activeElement : null;
    account(); lastInstance = instance; focusing = true; layout(); list.focus({ preventScroll: true });
  }
  const instance = { focus, document: doc }; instances.push(instance);
  listen(doc, 'keydown', ((e: KeyboardEvent) => {
    if (e.altKey && e.code === 'KeyT' && (lastInstance?.document === doc ? lastInstance : instances.find(i => i.document === doc)) === instance) { e.preventDefault(); focus(); }
  }) as EventListener);
  listen(region, 'pointerenter', ((e: PointerEvent) => { if (e.pointerType === 'mouse' && fineQuery?.matches) { account(); hovering = true; lastInstance = instance; layoutInteraction(); } }) as EventListener);
  listen(region, 'pointerleave', (() => { account(); hovering = false; layoutInteraction(); }) as EventListener);
  listen(region, 'focusin', (() => { account(); focusing = true; lastInstance = instance; layout(); }) as EventListener);
  listen(region, 'focusout', ((e: FocusEvent) => { if (!region.contains(e.relatedTarget as Node)) { account(); focusing = false; layout(); } }) as EventListener);
  listen(region, 'keydown', ((e: KeyboardEvent) => { if (e.key === 'Escape') { const r = records.find(r => r.node.contains(e.target as Node)); if (r && r.input.dismissible !== false) { e.preventDefault(); dismissRecord(r,'escape'); } } }) as EventListener);
  listen(region, 'click', (async (e: Event) => {
    const target = e.target as HTMLElement; const r = records.find(r => r.node.contains(target)); if (!r || r.phase === 'exiting') return;
    lastInstance = instance;
    if (target.closest('.ats-close')) { dismissRecord(r, 'close'); return; }
    if (!target.closest('.ats-action') || r.busy) return;
    const action = r.input.action; if (!action || (!action.onClick && !callbacks.onAction)) return;
    const generation = r.generation; r.busy = true; const button = r.node.querySelector<HTMLButtonElement>('.ats-action'); if (button) button.disabled = true;
    try {
      await action.onClick?.(r.id); if (destroyed || r.generation !== generation) return;
      await callbacks.onAction?.(r.id); if (destroyed || r.generation !== generation) return;
      if (action.closeOnAction !== false) dismissRecord(r,'action');
    } catch { if (!destroyed && r.generation === generation) updateToast(r.id, { title: safeErrorLabel(), type: 'error' }); }
    finally { if (r.generation === generation) { r.busy = false; if (!destroyed && !r.reason) drawContent(r); } }
  }) as EventListener);
  let drag: { r: RecordState; id: number; x: number; y: number; lastX: number; lastTime: number; dx: number; velocity: number; horizontal: boolean; baseTransform: string; baseOpacity: number } | undefined;
  function releaseDrag() { if (drag) { try { drag.r.node.releasePointerCapture(drag.id); } catch { /* Capture may already be released. */ } drag = undefined; } }
  if (typeof win.PointerEvent === 'function') {
    listen(region, 'pointerdown', ((e: PointerEvent) => {
      if (hardPaused() || !settings.swipeToDismiss || e.button !== 0 || (e.target as HTMLElement).closest('button') || drag) return;
      const r = records.find(r => r.node.contains(e.target as Node)); if (!r || r.phase === 'exiting' || r.input.dismissible === false) return;
      drag = { r, id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, lastTime: e.timeStamp, dx: 0, velocity: 0, horizontal: false, baseTransform: win.getComputedStyle(r.node).transform, baseOpacity: Number(win.getComputedStyle(r.node).opacity) };
    }) as EventListener);
    listen(region, 'pointermove', ((e: PointerEvent) => {
      if (hardPaused() || !drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.horizontal && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) { releaseDrag(); return; }
      if (!drag.horizontal && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) { drag.horizontal = true; drag.r.node.setPointerCapture(e.pointerId); }
      if (!drag.horizontal) return;
      drag.velocity = (e.clientX - drag.lastX) / Math.max(1, e.timeStamp - drag.lastTime); drag.lastX = e.clientX; drag.lastTime = e.timeStamp; drag.dx = dx;
      for (const key of ['card-transform','card-opacity']) { const track = drag.r.tracks.get(key); if (track) cancelTrack(track); drag.r.tracks.delete(key); } drag.r.node.style.transform = `translate3d(${dx}px,0,0) ${drag.baseTransform === 'none' ? '' : drag.baseTransform}`; drag.r.node.style.opacity = String(drag.baseOpacity);
    }) as EventListener);
    const end = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      const { r, dx, velocity, horizontal, baseTransform } = drag;
      const commit = e.type !== 'pointercancel' && horizontal && (Math.abs(dx) >= settings.swipeThreshold || (Math.abs(velocity) >= settings.swipeVelocity && Math.sign(dx) === Math.sign(velocity)));
      releaseDrag();
      if (commit) dismissRecord(r, 'swipe', `translate3d(${dx + Math.sign(dx) * (parseFloat(win.getComputedStyle(r.node).width) || r.node.offsetWidth)}px,0,0) ${baseTransform === 'none' ? '' : baseTransform}`); else layout();
    };
    listen(doc,'pointerup',end as EventListener); listen(doc,'pointercancel',end as EventListener);
  }
  listen(doc,'visibilitychange', () => pauseMask('hidden', doc.hidden));
  listen(win,'resize', () => { account(); layout(); checkVisibility(); }, { passive: true });
  listen(win,'scroll',checkVisibility,{ passive: true });
  if (reducedQuery) listen(reducedQuery,'change', () => { if (reduced()) for (const r of records) finishMotion(r); layout(); });
  if (darkQuery) listen(darkQuery,'change', () => layout());
  if (doc.hidden) masks.add('hidden');
  initial(settings).reverse().forEach((t, reverseIndex, all) => notify(t, all.length - reverseIndex - 1));
  checkVisibility();
  const controller: Controller = {
    notify, updateToast, focus,
    dismiss(id) { if (!destroyed) for (const r of [...records]) if (id === undefined || r.id === id) dismissRecord(r,'programmatic'); },
    update(patch) {
      const given = object(patch); resolveSettings(given); const next = resolveSettings({ ...settings, ...Object.fromEntries(Object.entries(given).filter(([,v]) => v !== undefined)) });
      if (destroyed) return; account(); const previousMessageCount = settings.messages.length; settings = next;
      if (reduced()) for (const r of records) finishMotion(r);
      const contentKeys = ['title','description','messages','type','showAction','actionLabel'];
      if (Object.keys(given).some(key => contentKeys.includes(key) && given[key] !== undefined)) {
        const desired = initial(settings);
        for (const r of [...records]) if (r.owned !== null && r.phase !== 'exiting') {
          const t = desired[r.owned]; if (!t) dismissRecord(r,'programmatic');
          else updateToast(r.id, { title: t.title, description: t.description, type: t.type, action: t.action ?? null });
        }
        desired.forEach((t,i) => { if (i > previousMessageCount && !records.some(r => r.owned === i && r.phase !== 'exiting')) notify(t,i); });
      }
      for (const r of records) drawContent(r); layout(); checkVisibility();
    },
    pause() { if (!destroyed) pauseMask('manual',true); }, resume() { if (!destroyed) pauseMask('manual',false); },
    notifyPromise<T>(promise: PromiseLike<T>, messages?: PromiseMessages<T>) {
      const observed = Promise.resolve(promise).then(value => ({ status: 'fulfilled' as const, value }), reason => ({ status: 'rejected' as const, reason }));
      const labels: PromiseMessages<T> = messages ?? {
        loading: settings.loadingLabel.trim() ? settings.loadingLabel : 'Saving changes…',
        success: settings.successLabel.trim() ? settings.successLabel : 'Changes saved',
        error: safeErrorLabel()
      };
      const displayFailureLabel = safeErrorLabel();
      bounded(labels.loading,240,true);
      const id = notify({ title: labels.loading, type: 'loading' }); const r = records.find(r => r.id === id)!; const generation = r.generation;
      const settled = observed.then(async (outcome): Promise<PromiseOutcome<T>> => {
        if (destroyed || r.generation !== generation || !records.includes(r)) return outcome;
        let title: string, displayError: unknown, failed = false;
        try {
          const resolver = outcome.status === 'fulfilled' ? labels.success : labels.error;
          title = bounded(await (typeof resolver === 'function' ? (resolver as (v: unknown) => string | Promise<string>)(outcome.status === 'fulfilled' ? outcome.value : outcome.reason) : resolver),240,true);
        } catch (error) { failed = true; displayError = error; title = displayFailureLabel; }
        if (!destroyed && r.generation === generation && records.includes(r)) updateToast(id,{ title, type: failed || outcome.status === 'rejected' ? 'error' : 'success', duration: settings.duration });
        return failed ? { ...outcome, displayError } : outcome;
      });
      return { id, settled };
    },
    destroy() {
      if (destroyed) return; destroyed = true; if (interactionFrame !== undefined) win.cancelAnimationFrame(interactionFrame); if (nativeFrame !== undefined) win.cancelAnimationFrame(nativeFrame); pendingMoves.clear(); pendingNative.clear(); propPauseHandlers.delete(controller); if (timer !== undefined) clearTimeout(timer); releaseDrag();
      for (const r of records) { r.generation++; for (const track of r.tracks.values()) cancelTrack(track); } suspendedAnimations.clear(); records = [];
      listeners.forEach(remove => remove()); resizeObserver?.disconnect(); intersectionObserver?.disconnect(); region.remove();
      if (changedPosition) host.style.position = previousPosition;
      const index = instances.indexOf(instance); if (index >= 0) instances.splice(index,1); if (lastInstance === instance) lastInstance = undefined;
    }
  };
  propPauseHandlers.set(controller, paused => { if (!destroyed) pauseMask('prop', paused); });
  return controller;
}
