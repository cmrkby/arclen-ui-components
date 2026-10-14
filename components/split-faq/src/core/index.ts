import manifest from '../../component.json';

export interface Settings {
  titles: string[];
  descriptions: string[];
  initialOpen: number;
  theme: 'dark' | 'light';
  maxWidth: number;
  motionScale: number;
}
export const defaults = Object.fromEntries(manifest.settings.map(setting => [setting.key, setting.default])) as unknown as Settings;

export function resolveSettings(input: unknown = {}): Settings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Settings must be an object');
  const values = input as Record<string, unknown>;
  for (const key of Object.keys(values)) if (!(key in defaults)) throw new TypeError(`Unknown setting: ${key}`);
  const result = { ...defaults, ...values } as Settings;
  for (const [key, limit] of [['titles', 80], ['descriptions', 500]] as const) {
    const list = result[key];
    if (!Array.isArray(list) || list.length < 1 || list.length > 12 || list.some(text => typeof text !== 'string' || text.length > limit)) throw new TypeError(`Invalid ${key}`);
    result[key] = [...list];
  }
  if (result.titles.length !== result.descriptions.length) throw new TypeError('Questions and answers must have equal lengths');
  if (result.theme !== 'dark' && result.theme !== 'light') throw new TypeError('Invalid theme');
  for (const [key, min, max] of [['maxWidth', 0, 1440], ['motionScale', 0, 2]] as const) {
    if (typeof result[key] !== 'number' || !Number.isFinite(result[key]) || result[key] < min || result[key] > max) throw new TypeError(`Invalid ${key}`);
  }
  if (typeof result.initialOpen !== 'number' || !Number.isFinite(result.initialOpen) || !Number.isInteger(result.initialOpen)) throw new TypeError('Invalid initialOpen');
  if (result.initialOpen < 0 || result.initialOpen >= result.titles.length) result.initialOpen = -1;
  if (result.maxWidth > 0) result.maxWidth = Math.max(240, result.maxWidth);
  return result;
}
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '') || 'split-faq';
const item = (settings: Settings, index: number, id: string) => `<div class="asfaq-item"><h2 class="asfaq-question-heading"><button class="asfaq-question" type="button" id="${id}-q-${index}" aria-controls="${id}-a-${index}" aria-expanded="true"><span class="asfaq-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span class="asfaq-label">${escape(settings.titles[index])}</span><span class="asfaq-mark" aria-hidden="true"><svg viewBox="0 0 18 18" width="18" height="18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg></span></button></h2><div class="asfaq-answer" id="${id}-a-${index}" role="region" aria-labelledby="${id}-q-${index}"><div class="asfaq-body"><h3 class="asfaq-answer-heading" aria-hidden="true">${escape(settings.titles[index])}</h3><p>${escape(settings.descriptions[index])}</p></div></div></div>`;

/** Static markup deliberately exposes every answer until enhancement succeeds. */
export function render(input: unknown = defaults, id = 'split-faq'): string {
  const settings = resolveSettings(input);
  return `<div class="asfaq" data-theme="${settings.theme}" style="max-width:${settings.maxWidth || 1000}px"><div class="asfaq-list">${settings.titles.map((_, index) => item(settings, index, safeId(id))).join('')}</div></div>`;
}
let instance = 0;
export function mount(host: HTMLElement, input: unknown = defaults, id?: string) {
  let settings = resolveSettings(input);
  const prefix = safeId(id || `split-faq-${++instance}`);
  if (!host.querySelector('.asfaq')) host.innerHTML = render(settings, prefix);
  const root = host.querySelector<HTMLElement>('.asfaq')!;
  const list = root.querySelector<HTMLElement>('.asfaq-list')!;
  const view = host.ownerDocument.defaultView!;
  let selected = settings.initialOpen;
  let destroyed = false, paused = false, visible = true, wide = false;
  const media = typeof view.matchMedia === 'function' ? view.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const motions = new Map<HTMLElement, { animation: Animation; finish: () => void }>();
  const rows = () => Array.from(list.children) as HTMLElement[];
  const button = (row: HTMLElement) => row.querySelector<HTMLButtonElement>('.asfaq-question')!;
  const panel = (row: HTMLElement) => row.querySelector<HTMLElement>('.asfaq-answer')!;
  const body = (row: HTMLElement) => row.querySelector<HTMLElement>('.asfaq-body')!;
  const mark = (row: HTMLElement) => row.querySelector<HTMLElement>('.asfaq-mark')!;
  const suspended = () => paused || !visible || host.ownerDocument.hidden;
  const stop = (element: HTMLElement) => {
    const motion = motions.get(element);
    if (motion) { motion.animation.onfinish = null; motion.animation.cancel(); motions.delete(element); }
  };
  const cancelAll = () => { for (const element of [...motions.keys()]) stop(element); };
  const animate = (element: HTMLElement, from: Keyframe, to: Keyframe, duration: number, finish = () => {}) => {
    stop(element);
    Object.assign(element.style, to);
    if (media?.matches || settings.motionScale === 0 || typeof element.animate !== 'function' || suspended()) { finish(); return; }
    const animation = element.animate([from, to], { duration: duration * settings.motionScale, easing: 'cubic-bezier(.24,.82,.24,1)', fill: 'none' });
    motions.set(element, { animation, finish });
    animation.onfinish = () => {
      if (motions.get(element)?.animation !== animation) return;
      motions.delete(element); animation.onfinish = null; animation.cancel(); finish();
    };
  };
  const settle = () => {
    cancelAll();
    rows().forEach((row, index) => {
      const open = index === selected, answer = panel(row);
      button(row).setAttribute('aria-expanded', String(open));
      answer.inert = !open; answer.hidden = !open;
      answer.style.height = ''; answer.style.transform = ''; answer.style.opacity = '';
      body(row).style.opacity = ''; body(row).style.transform = ''; mark(row).style.transform = `rotate(${open ? 90 : 0}deg)`;
    });
  };
  const layout = () => {
    if (destroyed) return;
    const next = root.getBoundingClientRect().width >= 700;
    if (wide !== next) { wide = next; settle(); }
    root.dataset.layout = wide ? 'split' : 'stack';
  };
  const sync = () => {
    if (destroyed) return;
    for (const { animation } of motions.values()) { if (suspended()) animation.pause(); else animation.play(); }
  };
  const activate = (index: number) => {
    const previous = selected, target = index === selected ? -1 : index;
    const direction = previous < 0 || index >= previous ? 1 : -1;
    selected = target;
    rows().forEach((row, rowIndex) => {
      const answer = panel(row), content = body(row), arrow = mark(row), open = rowIndex === selected;
      const wasOpen = button(row).getAttribute('aria-expanded') === 'true';
      if (!open && !wasOpen && answer.hidden) return;
      const existed = !answer.hidden;
      const currentBody = view.getComputedStyle(content);
      const fromHeight = existed ? answer.getBoundingClientRect().height : 0;
      const fromOpacity = existed ? currentBody.opacity : '0';
      const fromTransform = existed ? currentBody.transform : `translateY(${direction * 10}px)`;
      const fromArrow = view.getComputedStyle(arrow).transform;
      button(row).setAttribute('aria-expanded', String(open));
      answer.inert = !open; answer.hidden = false;
      animate(arrow, { transform: fromArrow }, { transform: `rotate(${open ? 90 : 0}deg)` }, 330);
      if (wide) {
        animate(content, { opacity: fromOpacity, transform: fromTransform }, { opacity: open ? '1' : '0', transform: `translateY(${open ? 0 : -direction * 6}px)` }, 230, () => { if (!open) answer.hidden = true; });
      } else {
        // Keep opacity zero after the shorter exit, until the height has collapsed.
        animate(content, { opacity: fromOpacity }, { opacity: open ? '1' : '0' }, open ? 240 : 150);
        animate(answer, { height: `${fromHeight}px` }, { height: `${open ? content.getBoundingClientRect().height : 0}px` }, 360, () => { answer.hidden = !open; answer.style.height = ''; });
      }
    });
  };
  const click = (event: MouseEvent) => {
    const candidate = (event.target as Element).closest<HTMLButtonElement>('.asfaq-question');
    const index = rows().findIndex(row => button(row) === candidate);
    if (index >= 0) activate(index);
  };
  const keydown = (event: KeyboardEvent) => {
    const buttons = rows().map(button), index = buttons.indexOf(event.target as HTMLButtonElement);
    if (index < 0) return;
    const next = event.key === 'ArrowDown' ? (index + 1) % buttons.length : event.key === 'ArrowUp' ? (index - 1 + buttons.length) % buttons.length : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault(); buttons[next].focus();
  };
  const reconcile = () => {
    const existing = rows();
    const focused = existing.find(row => button(row) === host.ownerDocument.activeElement);
    const focusedTitle = focused?.querySelector('.asfaq-label')?.textContent;
    const available = [...existing];
    settings.titles.forEach((title, index) => {
      const match = available.findIndex(row => row.querySelector('.asfaq-label')?.textContent === title);
      let row = match >= 0 ? available.splice(match, 1)[0] : undefined;
      if (!row) { const template = host.ownerDocument.createElement('template'); template.innerHTML = item(settings, index, prefix); row = template.content.firstElementChild as HTMLElement; }
      const control = button(row), answer = panel(row);
      control.id = `${prefix}-q-${index}`; control.setAttribute('aria-controls', `${prefix}-a-${index}`);
      answer.id = `${prefix}-a-${index}`; answer.setAttribute('aria-labelledby', control.id);
      row.querySelector('.asfaq-number')!.textContent = String(index + 1).padStart(2, '0');
      row.querySelector('.asfaq-label')!.textContent = title;
      row.querySelector('.asfaq-answer-heading')!.textContent = title;
      row.querySelector('p')!.textContent = settings.descriptions[index];
      if (list.children[index] !== row) list.insertBefore(row, list.children[index] || null);
    });
    available.forEach(row => row.remove());
    root.dataset.theme = settings.theme; root.style.maxWidth = `${settings.maxWidth || 1000}px`;
    list.style.setProperty('--asfaq-count', String(settings.titles.length));
    if (focusedTitle) rows().find(row => row.querySelector('.asfaq-label')?.textContent === focusedTitle)?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  };
  root.dataset.enhanced = 'true'; reconcile(); layout(); settle();
  root.addEventListener('click', click); root.addEventListener('keydown', keydown);
  const motionChange = () => { if (media?.matches) settle(); };
  media?.addEventListener?.('change', motionChange);
  host.ownerDocument.addEventListener('visibilitychange', sync);
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(layout) : null;
  resize?.observe(root); if (!resize) view.addEventListener('resize', layout);
  const intersection = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; sync(); }) : null;
  intersection?.observe(host);
  return {
    update(next: unknown) {
      if (destroyed) return;
      const resolved = resolveSettings(next), title = settings.titles[selected];
      const explicitSelection = resolved.initialOpen !== settings.initialOpen;
      const contentChanged = JSON.stringify([resolved.titles, resolved.descriptions]) !== JSON.stringify([settings.titles, settings.descriptions]);
      const layoutChanged = resolved.maxWidth !== settings.maxWidth;
      const motionChanged = resolved.motionScale !== settings.motionScale;
      settings = resolved;
      if (explicitSelection) selected = settings.initialOpen;
      else if (contentChanged) selected = title === undefined ? -1 : settings.titles.indexOf(title);
      if (contentChanged || explicitSelection || layoutChanged || motionChanged) cancelAll();
      reconcile(); layout();
      if (contentChanged || explicitSelection || layoutChanged || motionChanged) settle();
    },
    pause() { if (!destroyed) { paused = true; sync(); } },
    resume() { if (!destroyed) { paused = false; sync(); } },
    destroy() {
      if (destroyed) return;
      destroyed = true; cancelAll(); resize?.disconnect(); intersection?.disconnect();
      root.removeEventListener('click', click); root.removeEventListener('keydown', keydown);
      view.removeEventListener('resize', layout); host.ownerDocument.removeEventListener('visibilitychange', sync); media?.removeEventListener?.('change', motionChange);
      delete root.dataset.enhanced; delete root.dataset.layout;
      rows().forEach(row => { const answer = panel(row); answer.hidden = false; answer.inert = false; answer.removeAttribute('style'); body(row).removeAttribute('style'); mark(row).removeAttribute('style'); button(row).setAttribute('aria-expanded', 'true'); });
    },
  };
}
