import manifest from '../../component.json';
import {createWarp} from './warp';

export type Settings = {
  variant: 'panel' | 'grid' | 'sheet'; label: string; options: string[]; selected: string;
  showCuisine: boolean; cuisines: string[]; selectedCuisine: string;
  textSize: number; iconSize: number; radius: number; itemSpacing: number; surfaceOpacity: number; blur: number; showIcons: boolean; placement: 'auto' | 'above' | 'below';
  width: number; background: string; foreground: string; accent: string; duration: number;
};
export type Controller = {update(input: Partial<Settings>): void; pause(): void; resume(): void; destroy(): void};
export const defaults = Object.freeze(Object.fromEntries(manifest.settings.map(row => [row.key, row.default]))) as unknown as Readonly<Settings>;
const escape = (value: string) => value.replace(/[&<>"']/g, token => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[token]!));
const text = (value: unknown, fallback: string, max = 80) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
const colour = (value: unknown, fallback: string) => typeof value === 'string' && /^#[a-f\d]{6}$/i.test(value) ? value : fallback;
const numeric = (value: unknown, fallback: number, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

export function resolveSettings(input: unknown = {}): Settings {
  const raw = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const options = Array.isArray(raw.options) ? [...new Set(raw.options.filter((value): value is string => typeof value === 'string' && !!value.trim()).map(value => value.trim().slice(0, 60)))].slice(0, 12) : [...defaults.options];
  const cuisines = Array.isArray(raw.cuisines) ? [...new Set(raw.cuisines.filter((v): v is string => typeof v === 'string' && !!v.trim()).map(v => v.trim().slice(0, 60)))].slice(0, 12) : [...defaults.cuisines];
  const selectedCuisine = typeof raw.selectedCuisine === 'string' && cuisines.includes(raw.selectedCuisine) ? raw.selectedCuisine : cuisines[0] ?? '';
  const selected = typeof raw.selected === 'string' && options.includes(raw.selected) ? raw.selected : options.includes(defaults.selected) ? defaults.selected : options[0] ?? '';
  return {
    variant: typeof raw.variant === 'string' && ['panel', 'grid', 'sheet'].includes(raw.variant) ? raw.variant as Settings['variant'] : defaults.variant,
    label: text(raw.label, defaults.label), options, selected, cuisines, selectedCuisine, showCuisine: typeof raw.showCuisine === 'boolean' ? raw.showCuisine : defaults.showCuisine,
    textSize: numeric(raw.textSize, defaults.textSize, 14, 22), iconSize: numeric(raw.iconSize, defaults.iconSize, 16, 28),
    radius: numeric(raw.radius, defaults.radius, 8, 40), itemSpacing: numeric(raw.itemSpacing, defaults.itemSpacing, 0, 10),
    surfaceOpacity: numeric(raw.surfaceOpacity, defaults.surfaceOpacity, 30, 100), blur: numeric(raw.blur, defaults.blur, 0, 30),
    showIcons: typeof raw.showIcons === 'boolean' ? raw.showIcons : defaults.showIcons,
    placement: typeof raw.placement === 'string' && ['auto', 'above', 'below'].includes(raw.placement) ? raw.placement as Settings['placement'] : defaults.placement,
    width: numeric(raw.width, defaults.width, 224, 420), duration: numeric(raw.duration, defaults.duration, 0, 400),
    background: colour(raw.background, defaults.background), foreground: colour(raw.foreground, defaults.foreground), accent: colour(raw.accent, defaults.accent)
  };
}

type Rect = {left: number; top: number; width: number; height: number};
export function popupGeometry(anchor: Rect, width: number, height: number, viewport: {width: number; height: number}, sheet = false, placement: Settings['placement'] = 'auto') {
  const inset = Math.min(16, viewport.width / 4), available = Math.max(1, viewport.width - inset * 2);
  const popupWidth = sheet ? available : Math.min(width, available);
  const aboveSpace = Math.max(1, anchor.top - 26), belowSpace = Math.max(1, viewport.height - anchor.top - anchor.height - 26);
  const minimumRoom = Math.min(height, 44);
  const useAbove = placement === 'above' ? aboveSpace >= minimumRoom || belowSpace < minimumRoom
    : placement === 'below' ? belowSpace < minimumRoom && aboveSpace >= minimumRoom
    : height <= aboveSpace || (height > belowSpace && aboveSpace >= belowSpace);
  const maxHeight = sheet ? Math.max(1, viewport.height - 32) : useAbove ? aboveSpace : belowSpace;
  const popupHeight = Math.min(height, maxHeight);
  const left = sheet ? inset : Math.max(inset, Math.min(anchor.left, viewport.width - popupWidth - inset));
  const top = sheet ? Math.max(16, viewport.height - popupHeight - 16) : Math.max(16, useAbove ? anchor.top - popupHeight - 10 : anchor.top + anchor.height + 10);
  return {left, top, width: popupWidth, height: popupHeight, maxHeight};
}

// Original, deliberately small line drawings. No icon font or third-party asset.
const drawings = [
  '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/>',
  '<path d="m3 10 7 2 7-8c3-3 5-1 2 2l-7 7 2 7-2 1-4-6-5-3Z"/>',
  '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3"/>',
  '<path d="m4 4 8 9 8-9H4Zm8 9v8m-4 0h8"/>',
  '<path d="M4 9h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Zm13 1h2a3 3 0 0 1 0 6h-2M6 3v3m5-3v3m5-3v3"/>',
  '<path d="m3 8 17-4 1 5L4 13 3 8Zm1 5h17v8H4v-8Zm2-5 3 3m3-5 3 3m2-4 3 3"/>',
  '<path d="M4 3v6c0 4 6 4 6 0V3M7 3v18M18 3c-3 3-4 7-4 10h5V3m0 10v8"/>',
  '<path d="m3 8 9-5 9 5H3Zm1 13h16M6 11v7m4-7v7m4-7v7m4-7v7"/>',
  '<path d="M3 21V9h7V3h8v18M2 21h20M6 12v2m0 3v2m7-12h2m-2 4h2m-2 4h2m-2 4h2m5-7h2v9"/>',
  '<rect x="4" y="6" width="16" height="15" rx="3"/><path d="M8 6V4h8v2M8 10a4 4 0 0 0 8 0"/>',
  '<path d="M3 21V8h18v13M3 16h18M6 8V4h12v4M3 11h18M12 11v5"/>',
  '<path d="M3 4h18v13H3V4Zm9 13v4m-5 0 5-4 5 4M2 4h20"/>'
];
function icon(option: string, index: number) {
  const names = ['all', 'airport', 'apartments', 'bar', 'cafe', 'cinema', 'dining', 'museum', 'office', 'shop', 'stay', 'venue'];
  const key = names.indexOf(option.toLowerCase());
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${drawings[key < 0 ? index % drawings.length : key]}</svg>`;
}
function triggerMarkup(key: string, label: string, value: string, enabled: boolean, cuisine = false) {
  return `<button type="button" class="aui-filter-trigger" ${cuisine ? 'data-fp-cuisine-trigger' : 'data-fp-trigger'} aria-haspopup="listbox" aria-expanded="false" aria-controls="${key}-list" aria-label="${escape(label)}: ${escape(value)}"${enabled ? '' : ' disabled'}><span data-fp-value>${escape(value || 'No options')}</span><svg class="aui-filter-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button>`;
}
function panelMarkup(key: string, label: string, values: string[], selected: string, cuisine = false) {
  return `<div class="aui-filter-panel${cuisine ? ' aui-filter-cuisine-panel' : ''}" ${cuisine ? 'data-fp-cuisine-panel' : 'data-fp-panel'} hidden><div class="aui-filter-options" role="listbox" aria-label="${escape(label)}" id="${key}-list">${values.map((value, i) => `<button type="button" role="option" data-fp-option="${i}" tabindex="-1" aria-selected="${value === selected}">${cuisine ? '' : `<span class="aui-filter-option-icon">${icon(value, i)}</span>`}<span class="aui-filter-option-label">${escape(value)}</span><span class="aui-filter-check" aria-hidden="true"></span></button>`).join('')}</div></div>`;
}
export function render(input: Partial<Settings> = {}, id = 'filter-popover'): string {
  const s = resolveSettings(input), key = escape(id);
  return `<div class="aui-filter" data-fp-root data-variant="${s.variant}" data-fp-icons="${s.showIcons}" style="--fp-width:${s.width}px;--fp-surface:${s.background};--fp-ink:${s.foreground};--fp-accent:${s.accent};--fp-text-scale:${s.textSize / 18};--fp-icon-scale:${s.iconSize / 20};--fp-radius-scale:${s.radius / 28};--fp-gap:${s.itemSpacing}px;--fp-gap-grid:${s.itemSpacing + 2}px;--fp-gap-sheet:${Math.max(0, s.itemSpacing - 1)}px;--fp-opacity:${s.surfaceOpacity}%;--fp-opacity-dense:${Math.min(100, s.surfaceOpacity * 78 / 58)}%;--fp-blur:${s.blur}px;--fp-blur-dense:${s.blur * 2.4}px">
    ${triggerMarkup(key, s.label, s.selected, !!s.options.length)}
    <span class="aui-filter-cuisine" data-fp-cuisine${s.showCuisine && s.selected.toLowerCase() === 'dining' ? '' : ' hidden'}>${triggerMarkup(`${key}-cuisine`, 'Cuisine', s.selectedCuisine, !!s.cuisines.length, true)}</span>
    ${panelMarkup(key, s.label, s.options, s.selected)}${panelMarkup(`${key}-cuisine`, 'Cuisine', s.cuisines, s.selectedCuisine, true)}
  </div>`;
}

type Menu = {trigger: HTMLButtonElement; panel: HTMLDivElement; options: HTMLButtonElement[]; cuisine: boolean; open: boolean; progress: number; raf: number; warp?: ReturnType<typeof createWarp>};
export function mount(host: HTMLElement, input: Partial<Settings> = {}, id = `filter-${Math.random().toString(36).slice(2)}`): Controller {
  let settings = resolveSettings(input), paused = false, destroyed = false, menus: Menu[] = [];
  let removeBindings = () => {};
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const values = (m: Menu) => m.cuisine ? settings.cuisines : settings.options;
  const selected = (m: Menu) => m.cuisine ? settings.selectedCuisine : settings.selected;
  function stop(m: Menu) {
    cancelAnimationFrame(m.raf); m.raf = 0; m.warp?.destroy(); m.warp = undefined;
  }
  function settle(m: Menu) { stop(m); m.progress = m.open ? 1 : 0; m.panel.hidden = !m.open; }
  function place(m: Menu) {
    const sheet = settings.variant === 'sheet' && !m.cuisine && window.innerWidth < 600;
    const width = m.cuisine ? Math.max(346, settings.width) : settings.width;
    m.panel.style.width = `${sheet ? window.innerWidth - 32 : Math.min(width, window.innerWidth - 32)}px`;
    m.panel.style.maxHeight = `${Math.min(settings.variant === 'sheet' && !m.cuisine ? 480 : Infinity, Math.max(1, window.innerHeight - 32))}px`;
    const g = popupGeometry(m.trigger.getBoundingClientRect(), width, m.panel.offsetHeight, {width: window.innerWidth, height: window.innerHeight}, sheet, settings.placement);
    m.panel.style.maxHeight = `${Math.min(g.maxHeight, settings.variant === 'sheet' && !m.cuisine ? 480 : Infinity)}px`;
    m.panel.style.width = `${g.width}px`; m.panel.style.left = `${g.left}px`; m.panel.style.top = `${g.top}px`;
  }
  function animate(m: Menu) {
    cancelAnimationFrame(m.raf); m.raf = 0;
    if (media.matches || !settings.duration) { settle(m); return; }
    const target = m.open ? 1 : 0;
    m.warp ??= createWarp(m.panel, m.trigger.getBoundingClientRect(), host.querySelector('[data-fp-root]')!);
    const start = m.progress, duration = Math.max(1, settings.duration * Math.abs(target - start) * (m.open ? 1 : .78));
    const began = performance.now(); m.warp.draw(start);
    const frame = (time: number) => {
      const elapsed = Math.min(1, (time - began) / duration);
      m.progress = start + (target - start) * elapsed;
      m.warp?.draw(m.progress);
      if (elapsed < 1) m.raf = requestAnimationFrame(frame); else settle(m);
    };
    m.raf = requestAnimationFrame(frame);
  }

  function close(m: Menu, restore = false, immediate = false) {
    if (!m.open && !immediate) return;
    m.open = false; m.panel.inert = true; m.trigger.setAttribute('aria-expanded', 'false');
    if (immediate) settle(m); else animate(m);
    if (restore && !destroyed) m.trigger.focus({preventScroll: true});
  }
  function show(m: Menu, index = values(m).indexOf(selected(m))) {
    if (paused || destroyed || !m.options.length || m.trigger.closest('[hidden]')) return;
    for (const other of menus) if (other !== m) close(other, false, true);
    const reversing = !!m.warp;
    m.open = true; m.panel.hidden = false; m.panel.inert = false; m.trigger.setAttribute('aria-expanded', 'true');
    if (!reversing) place(m);
    animate(m); m.options[Math.max(0, index)]?.focus({preventScroll: true});
  }
  function choose(m: Menu, index: number) {
    const value = values(m)[index]; if (!value || paused || destroyed || !m.open) return;
    settings = {...settings, [m.cuisine ? 'selectedCuisine' : 'selected']: value};
    m.trigger.querySelector('[data-fp-value]')!.textContent = value;
    m.trigger.setAttribute('aria-label', `${m.cuisine ? 'Cuisine' : settings.label}: ${value}`);
    m.options.forEach((o, i) => o.setAttribute('aria-selected', String(i === index)));
    // Refresh the visual mesh after a choice so the departing selected marker agrees.
    const progress = m.progress; stop(m); m.progress = progress;
    close(m, true);
    const cuisine = host.querySelector<HTMLElement>('[data-fp-cuisine]')!;
    cuisine.hidden = !settings.showCuisine || settings.selected.toLowerCase() !== 'dining';
    host.dispatchEvent(new CustomEvent(m.cuisine ? 'cuisinechange' : 'filterchange', {detail: {value}, bubbles: true}));
  }
  function bind() {
    host.innerHTML = render(settings, id);
    menus = [false, true].map(cuisine => {
      const panel = host.querySelector<HTMLDivElement>(cuisine ? '[data-fp-cuisine-panel]' : '[data-fp-panel]')!;
      return {cuisine, panel, trigger: host.querySelector<HTMLButtonElement>(cuisine ? '[data-fp-cuisine-trigger]' : '[data-fp-trigger]')!, options: [...panel.querySelectorAll<HTMLButtonElement>('[data-fp-option]')], open: false, progress: 0, raf: 0};
    });
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || paused) return;
      for (const m of menus) {
        if (m.trigger.contains(event.target)) { if (m.open) close(m, true); else show(m); return; }
        const option = event.target.closest<HTMLButtonElement>('[data-fp-option]');
        if (option && m.panel.contains(option)) {choose(m, Number(option.dataset.fpOption)); return;}
      }
    };
    const keys = (event: KeyboardEvent) => {
      if (paused) return;
      const m = menus.find(menu => menu.trigger === event.target || menu.panel.contains(event.target as Node));
      if (!m || !m.options.length) return;
      if (event.key === 'Escape' && m.open) {event.preventDefault(); close(m, true); return;}
      if (event.key === 'Tab' && m.open) {close(m, true); return;}
      if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (!m.open) {show(m, event.key === 'ArrowUp' || event.key === 'End' ? m.options.length - 1 : 0); return;}
      const columns = m.cuisine || settings.variant === 'panel' ? 2 : settings.variant === 'grid' ? 3 : 1;
      const step = event.key === 'ArrowUp' ? -columns : event.key === 'ArrowDown' ? columns : event.key === 'ArrowLeft' ? -1 : 1;
      const index = m.options.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? m.options.length - 1 : (index + step + m.options.length) % m.options.length;
      m.options[next]?.focus({preventScroll: true});
      if (!m.warp) m.options[next]?.scrollIntoView({block: 'nearest'});
    };
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !host.contains(event.target)) menus.forEach(m => close(m)); };
    const hidden = () => { if (document.hidden) menus.forEach(m => close(m, false, true)); };
    const motion = () => menus.forEach(settle);
    const reposition = (event: Event) => { if (menus.some(m => m.panel === event.target)) return; menus.forEach(m => {if (!m.panel.hidden) {settle(m); if (m.open) place(m);}}); };
    host.addEventListener('click', click); host.addEventListener('keydown', keys);
    document.addEventListener('pointerdown', outside); document.addEventListener('visibilitychange', hidden);
    window.addEventListener('resize', reposition); window.addEventListener('scroll', reposition, true); media.addEventListener('change', motion);
    removeBindings = () => {
      host.removeEventListener('click', click); host.removeEventListener('keydown', keys);
      document.removeEventListener('pointerdown', outside); document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('resize', reposition); window.removeEventListener('scroll', reposition, true); media.removeEventListener('change', motion);
    };
  }
  bind();
  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {if (!entries[0]?.isIntersecting) menus.forEach(m => close(m, false, true));}) : undefined;
  observer?.observe(host);
  return {
    update(input) {if (destroyed) return; const focused = host.contains(document.activeElement); menus.forEach(m => close(m, false, true)); removeBindings(); settings = resolveSettings({...settings, ...input}); bind(); if (focused) menus[0].trigger.focus();},
    pause() {paused = true; menus.forEach(m => close(m, m.panel.contains(document.activeElement), true));},
    resume() {if (!destroyed) paused = false;},
    destroy() {if (destroyed) return; menus.forEach(m => close(m, false, true)); destroyed = true; removeBindings(); observer?.disconnect(); host.replaceChildren();}
  };
}
