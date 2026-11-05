import manifest from '../../component.json';
import { response, blendColor, mutedColor } from './response';
export interface Settings {
  direction: 'signal' | 'horizon' | 'directory'; labels: string[]; destinations: string[];
  navigationLabel: string; newTab: boolean; initialIndex: number;
  fontFamily: 'mono' | 'sans' | 'serif'; labelCase: 'layout' | 'none' | 'uppercase' | 'lowercase';
  tracking: number; rowHeight: number; collapsedHeight: number; showLabels: boolean; motion: boolean;
  lineLength: number; activeLength: number; neighborLength: number; thickness: number;
  gap: number; radius: number; labelSize: number; labelGap: number;
  lineColor: string; activeColor: string; textColor: string; duration: number; bounce: number;
}
export interface Controller { update(input: unknown): void; pause(): void; resume(): void; destroy(): void }
export const defaults = Object.freeze(Object.fromEntries(manifest.settings.map(setting => [setting.key, Array.isArray(setting.default) ? Object.freeze([...setting.default]) : setting.default]))) as { readonly [K in keyof Settings]: Settings[K] extends string[] ? readonly string[] : Settings[K] };
export function resolveSettings(input: unknown = {}): Settings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Settings must be an object');
  const result = { ...defaults, labels: [...defaults.labels], destinations: [...defaults.destinations] };
  for (const [key, value] of Object.entries(input)) {
    const setting = manifest.settings.find(s => s.key === key);
    if (!setting) throw new Error(`Unknown setting: ${key}`);
    let valid = true;
    if (setting.kind === 'number') valid = typeof value === 'number' && Number.isFinite(value) && value >= setting.min! && value <= setting.max! && Math.abs((value - setting.min!) / (setting.step ?? 1) - Math.round((value - setting.min!) / (setting.step ?? 1))) < 1e-7;
    else if (setting.kind === 'boolean') valid = typeof value === 'boolean';
    else if (setting.kind === 'string-list') valid = Array.isArray(value) && value.length >= (setting.minItems ?? 0) && value.length <= setting.maxItems! && Array.from(value).every(v => typeof v === 'string' && v.length <= setting.maxItemLength!);
    else valid = typeof value === 'string' && value.length <= (setting.maxLength ?? 100000) && (setting.kind !== 'color' || /^(transparent|#[0-9a-f]{6}([0-9a-f]{2})?)$/i.test(value)) && (setting.kind !== 'select' || setting.options!.some(o => o.value === value));
    if (!valid) throw new Error(`Invalid setting: ${key}`);
    Object.assign(result, { [key]: Array.isArray(value) ? [...value] : value });
  }
  return result;
}
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function safeDestination(value: string | undefined): string | null {
  if (!value || /[\s\\\u0000-\u001f\u007f]/.test(value)) return null;
  if (/^(#|\/(?!\/)|\.\.?\/)/.test(value)) return value;
  if (/^https?:\/\//i.test(value)) { try { const url = new URL(value); return url.username || url.password ? null : url.href; } catch { return null; } }
  if (/^mailto:[^?@]+@[^?@]+$/i.test(value)) return value;
  return null;
}
export function render(input: unknown = {}, id?: string): string {
  void id;
  const s = resolveSettings(input);
  const variables = Object.entries({ rest:s.lineLength, length:s.activeLength, near:s.neighborLength, thickness:s.thickness, gap:s.gap, radius:s.radius, size:s.labelSize, space:s.labelGap, row:s.rowHeight, collapsed:s.collapsedHeight }).map(([k,v]) => `--lm-${k}:${v}px`).join(';');
  const family = { mono: 'ArclenLineMono,monospace', sans: 'system-ui,sans-serif', serif: 'Georgia,serif' }[s.fontFamily];
  const letterCase = s.labelCase === 'layout' ? (s.direction === 'directory' ? 'none' : 'uppercase') : s.labelCase;
  const style = `${variables};--lm-font:${family};--lm-case:${letterCase};--lm-tracking:${s.tracking}em;--lm-line:${s.lineColor};--lm-active:${s.activeColor};--lm-text:${s.textColor};--lm-duration:${s.duration}ms;--lm-ease:cubic-bezier(.18,.8,.24,${1+s.bounce})`;
  const links = s.labels.map((label,i) => {
    const href = safeDestination(s.destinations[i]); if (!label.trim() || !href) return '';
    return `<li><a class="lm-link" data-lm-index="${i}" href="${escape(href)}"${s.newTab?' target="_blank" rel="noopener noreferrer"':''}><span class="lm-mark" aria-hidden="true"></span><span class="lm-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span class="lm-label">${escape(label)}${s.newTab?'<span class="lm-sr"> (opens in new tab)</span>':''}</span></a></li>`;
  }).join('');
  return `<nav class="lm-menu" data-direction="${s.direction}" data-labels-visible="${s.showLabels}" data-paused="${!s.motion}" aria-label="${escape(s.navigationLabel || 'Navigation')}" style="${style}"><ul class="lm-list">${links}</ul></nav>`;
}
export function mount(host: HTMLElement, input: unknown = {}, id?: string): Controller {
  void id;
  let settings = resolveSettings(input), disposed = false, paused = false, offscreen = false;
  let pointer = -1, focus = -1, initial = settings.initialIndex;
  const doc = host.ownerDocument, view = doc.defaultView;
  let menu: HTMLElement, links: HTMLAnchorElement[] = [];
  let marks: HTMLElement[] = [], labels: HTMLElement[] = [], labelWidths: number[] = [];
  let frame = 0, started = 0, values: number[] = [], from: number[] = [], target: number[] = [];
  const reduced = view?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const coarse = view?.matchMedia?.('(hover: none), (pointer: coarse)');
  const stop = () => { if (frame && view) view.cancelAnimationFrame(frame); frame = 0; if (menu) menu.dataset.moving = 'false'; };
  const draw = () => {
    const rowHeight = values[0];
    menu.style.width = `${Math.max(0, values[1])}px`;
    for (let i = 0; i < links.length; i++) {
      links[i].style.minHeight = `${coarse?.matches ? Math.max(44, rowHeight) : rowHeight}px`;
      marks[i].style.width = `${Math.max(0, values[2 + i * 2])}px`;
      marks[i].style.backgroundColor = blendColor(settings.lineColor, settings.activeColor, values[3 + i * 2]);
      labels[i].style.color = (coarse?.matches || settings.showLabels) ? settings.textColor : blendColor(mutedColor(settings.textColor), settings.textColor, values[3 + i * 2]);
      labels[i].style.opacity = String((coarse?.matches || settings.showLabels) ? 1 : Math.max(0, Math.min(1, values[3 + i * 2])));
    }
  };
  const sample = (now: number) => {
    const progress = response(now - started, settings.duration, settings.bounce);
    values = target.map((value, i) => from[i] + (value - from[i]) * progress);
  };
  const tick = (now: number) => {
    frame = 0;
    if (disposed) return;
    sample(now); draw();
    if (now - started < settings.duration && view) frame = view.requestAnimationFrame(tick);
    else menu.dataset.moving = 'false';
  };
  const move = (next: number[], instant: boolean) => {
    const now = view?.performance.now() ?? 0;
    if (instant || !view || settings.duration === 0) {
      stop(); values = [...next]; target = [...next]; from = [...next]; draw(); return;
    }
    if (next.length === target.length && next.every((value, i) => value === target[i])) return;
    if (frame) sample(now);
    stop(); from = [...values]; target = next; started = now;
    menu.dataset.moving = 'true';
    frame = view.requestAnimationFrame(tick);
  };
  const write = (instant = false) => {
    if (disposed) return;
    const suspended = paused || offscreen || doc.hidden || Boolean(reduced?.matches) || !settings.motion;
    menu.dataset.paused = String(suspended);
    const requested = focus >= 0 ? focus : pointer >= 0 ? pointer : initial;
    const current = links.some(link => Number(link.dataset.lmIndex) === requested) ? requested : -1;
    menu.dataset.engaged = String(current >= 0 || settings.showLabels);
    const currentPosition = links.findIndex(link => Number(link.dataset.lmIndex) === current);
    for (const [position, link] of links.entries()) {
      const index = Number(link.dataset.lmIndex);
      link.dataset.state = index === current ? 'active' : current >= 0 && Math.abs(position-currentPosition) === 1 ? 'neighbor' : 'rest';
    }
    if (settings.direction !== 'signal') return;
    const next = [Math.max(settings.labelSize, current >= 0 || settings.showLabels ? settings.rowHeight : settings.collapsedHeight), 0];
    for (let i = 0; i < links.length; i++) {
      const state = links[i].dataset.state;
      const length = state === 'active' ? settings.activeLength : state === 'neighbor' ? settings.neighborLength : settings.lineLength;
      next.push(length, state === 'active' ? 1 : 0);
      next[1] = Math.max(next[1], length + settings.labelGap + labelWidths[i]);
    }
    move(next, instant || suspended || values.length !== next.length);
  };
  const measureLabels = () => {
    labelWidths = labels.map(label => {
      const previous = label.style.cssText;
      label.style.width = 'max-content'; label.style.flex = 'none';
      const width = label.getBoundingClientRect().width;
      label.style.cssText = previous;
      return width;
    });
  };
  const fit = () => {
    if (disposed || !menu) return;
    const needed = Math.max(0, ...labelWidths) + Math.max(settings.lineLength, settings.activeLength, settings.neighborLength) + settings.labelGap;
    menu.dataset.constrained = String(needed > host.clientWidth + 1);
  };
  const paint = () => {
    stop(); values = []; target = []; from = [];
    host.innerHTML = render(settings);
    menu = host.querySelector<HTMLElement>('.lm-menu')!;
    links = [...menu.querySelectorAll<HTMLAnchorElement>('.lm-link')];
    marks = links.map(link => link.querySelector<HTMLElement>('.lm-mark')!);
    labels = links.map(link => link.querySelector<HTMLElement>('.lm-label')!);
    menu.dataset.enhanced = 'true'; measureLabels(); fit(); write(true);
  };
  const findLink = (target: EventTarget | null) => target && (target as Element).nodeType === 1 ? (target as Element).closest<HTMLAnchorElement>('.lm-link') : null;
  const point = (event: Event) => {
    if ((event as PointerEvent).pointerType === 'touch') return;
    const link = findLink(event.target);
    if (link && menu.contains(link)) { pointer = Number(link.dataset.lmIndex); initial = -1; write(); }
  };
  const leave = () => { pointer = -1; initial = -1; write(); };
  const pointerOut = (event: Event) => {
    const next = (event as PointerEvent).relatedTarget as Node | null;
    if (!next || !menu.contains(next)) leave();
  };
  const focusIn = (event: Event) => { const link = findLink(event.target); if (link && menu.contains(link)) { focus = Number(link.dataset.lmIndex); initial = -1; write(); } };
  const focusOut = (event: Event) => { const next = findLink((event as FocusEvent).relatedTarget); focus = next && menu.contains(next) ? Number(next.dataset.lmIndex) : -1; write(); };
  const key = (event: Event) => { if ((event as KeyboardEvent).key === 'Escape') { pointer = -1; initial = -1; write(); } };
  const listeners: [string, EventListener][] = [['pointerover',point],['pointerout',pointerOut],['pointerleave',leave],['focusin',focusIn],['focusout',focusOut],['keydown',key]];
  paint();
  void doc.fonts?.ready.then(() => { if (!disposed) { measureLabels(); fit(); write(true); } });
  for (const [type,handler] of listeners) host.addEventListener(type,handler);
  const environment = () => write(true);
  doc.addEventListener('visibilitychange',environment);
  reduced?.addEventListener?.('change',environment);
  coarse?.addEventListener?.('change',environment);
  const observer = view && 'IntersectionObserver' in view ? new view.IntersectionObserver(entries => { offscreen = !entries[0].isIntersecting; write(); }) : null;
  observer?.observe(host);
  const resized = () => { if (!disposed) { fit(); write(true); } };
  const container = host.parentElement ?? host;
  let containerWidth = container.getBoundingClientRect().width;
  const resizeObserver = view && 'ResizeObserver' in view ? new view.ResizeObserver(() => {
    const width = container.getBoundingClientRect().width;
    if (Math.abs(width - containerWidth) < 0.5) return;
    containerWidth = width; resized();
  }) : null;
  resizeObserver?.observe(container);
  view?.addEventListener('resize', resized);
  return {
    update(next) {
      if (disposed) return;
      const resolved = resolveSettings(next);
      const focused = links.find(link => link === doc.activeElement)?.dataset.lmIndex;
      settings = resolved; pointer = -1; focus = -1; initial = settings.initialIndex; paint();
      if (focused !== undefined) links.find(link => link.dataset.lmIndex === focused)?.focus({preventScroll:true});
    },
    pause() { if (!disposed) { paused = true; write(); } },
    resume() { if (!disposed) { paused = false; write(); } },
    destroy() {
      if (disposed) return; disposed = true;
      stop(); observer?.disconnect(); resizeObserver?.disconnect(); view?.removeEventListener('resize', resized); doc.removeEventListener('visibilitychange',environment);
      reduced?.removeEventListener?.('change',environment);
      coarse?.removeEventListener?.('change',environment);
      for (const [type,handler] of listeners) host.removeEventListener(type,handler);
      host.replaceChildren(); links = [];
    }
  };
}
