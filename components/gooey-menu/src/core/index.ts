import manifest from '../../component.json';
export type Direction = 'fan' | 'orbit' | 'dock' | 'rail';
export interface Settings { direction: Direction; initialOpen: boolean; itemLabels: string[]; closeOnSelect: boolean; theme: 'auto' | 'light' | 'dark' | 'custom'; surfaceColor: string; iconColor: string; labelColor: string; iconSize: number; openDuration: number; closeDuration: number; stagger: number; showOrbit: boolean; openLabel: string; closeLabel: string }
export interface Selection { index: number; label: string }
export interface Controller { update(input: unknown): void; pause(): void; resume(): void; destroy(): void }
export const defaults = Object.freeze(Object.fromEntries(manifest.settings.map(setting => [setting.key, Array.isArray(setting.default) ? Object.freeze([...setting.default]) : setting.default]))) as unknown as Settings;
export function resolveSettings(input: unknown = {}): Settings {
  const raw = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const number = (key: keyof Settings, min: number, max: number) => typeof raw[key] === 'number' && Number.isFinite(raw[key]) ? Math.max(min, Math.min(max, raw[key] as number)) : defaults[key] as number;
  const color = (key: keyof Settings) => typeof raw[key] === 'string' && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(raw[key] as string) ? raw[key] as string : defaults[key] as string;
  const label = (key: 'openLabel' | 'closeLabel') => typeof raw[key] === 'string' && raw[key].trim() ? raw[key].trim().slice(0, 60) : defaults[key];
  return {
    theme: ['auto','light','dark','custom'].includes(String(raw.theme)) ? raw.theme as Settings['theme'] : defaults.theme,
    surfaceColor: color('surfaceColor'), iconColor: color('iconColor'), labelColor: color('labelColor'),
    iconSize: number('iconSize', 18, 28), openDuration: number('openDuration', 150, 700), closeDuration: number('closeDuration', 100, 500), stagger: number('stagger', 0, 80),
    showOrbit: typeof raw.showOrbit === 'boolean' ? raw.showOrbit : defaults.showOrbit, openLabel: label('openLabel'), closeLabel: label('closeLabel'),
    direction: ['fan', 'orbit', 'dock', 'rail'].includes(String(raw.direction)) ? raw.direction as Direction : defaults.direction,
    initialOpen: typeof raw.initialOpen === 'boolean' ? raw.initialOpen : defaults.initialOpen,
    closeOnSelect: typeof raw.closeOnSelect === 'boolean' ? raw.closeOnSelect : defaults.closeOnSelect,
    itemLabels: defaults.itemLabels.map((label, index) => Array.isArray(raw.itemLabels) && typeof raw.itemLabels[index] === 'string' && raw.itemLabels[index].trim() ? raw.itemLabels[index].trim().slice(0, 40) : label),
  };
}
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!));
// Iconsax Linear by Vuesax. Integrated glyphs retain the terms in assets/ICONSAX-LICENSE.md.
const paths = ["\n<path d=\"M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n<path d=\"M20.5899 22C20.5899 18.13 16.7399 15 11.9999 15C7.25991 15 3.40991 18.13 3.40991 22\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n", "\n<path d=\"M21 7V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V7C3 4 4.5 2 8 2H16C19.5 2 21 4 21 7Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-miterlimit=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n<path d=\"M14.5 4.5V6.5C14.5 7.6 15.4 8.5 16.5 8.5H18.5\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-miterlimit=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n<path d=\"M8 13H12\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-miterlimit=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n<path d=\"M8 17H16\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-miterlimit=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n", "\n<path d=\"M7.99995 22H15.9999C20.0199 22 20.7399 20.39 20.9499 18.43L21.6999 10.43C21.9699 7.99 21.2699 6 16.9999 6H6.99995C2.72995 6 2.02995 7.99 2.29995 10.43L3.04995 18.43C3.25995 20.39 3.97995 22 7.99995 22Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-miterlimit=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n<path d=\"M8 6V5.2C8 3.43 8 2 11.2 2H12.8C16 2 16 3.43 16 5.2V6\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-miterlimit=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n<path d=\"M14 13V14C14 14.01 14 14.01 14 14.02C14 15.11 13.99 16 12 16C10.02 16 10 15.12 10 14.03V13C10 12 10 12 11 12H13C14 12 14 12 14 13Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-miterlimit=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n<path d=\"M21.65 11C19.34 12.68 16.7 13.68 14 14.02\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-miterlimit=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n<path d=\"M2.62 11.27C4.87 12.81 7.41 13.74 10 14.03\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-miterlimit=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n", "\n<path d=\"M17 20.5H7C4 20.5 2 19 2 15.5V8.5C2 5 4 3.5 7 3.5H17C20 3.5 22 5 22 8.5V15.5C22 19 20 20.5 17 20.5Z\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-miterlimit=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n<path d=\"M17 9L13.87 11.5C12.84 12.32 11.15 12.32 10.12 11.5L7 9\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-miterlimit=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n"];
let instance = 0;
function point(direction: Direction, index: number): [number,number] {
  if (direction === 'orbit') return [[0,-112],[112,0],[0,112],[-112,0]][index] as [number,number];
  if (direction === 'dock') return [[-102,-88],[-34,-88],[34,-88],[102,-88]][index] as [number,number];
  if (direction === 'rail') return [100, -108 + index * 72];
  const angle = (27 + 42 * index) * Math.PI / 180;
  return [Math.cos(angle) * 110, Math.sin(angle) * 110];
}
export function render(input: unknown = {}): string {
  const settings = resolveSettings(input);
  const id = `aui-goo-${++instance}`;
  const shapes = settings.itemLabels.map((_, index) => {
    const [x,y] = point(settings.direction, index);
    const geometry = settings.direction === 'rail' ? 'x="-8" y="32" width="128" height="48" rx="24"' : `x="28" y="28" width="56" height="56" rx="${settings.direction === 'dock' ? 12 : 28}"`;
    return `<rect class="aui-goo__shape" ${geometry} style="--x:${x}px;--y:${y}px;--delay:${index * settings.stagger}ms"/>`;
  }).join('');
  const items = settings.itemLabels.map((label, index) => {
    const [x,y] = point(settings.direction, index);
    const icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" focusable="false">${paths[index]}</svg>`;
    return `<button class="aui-goo__item" type="button" data-index="${index}" aria-label="${escape(label)}" title="${escape(label)}" tabindex="${settings.initialOpen ? 0 : -1}" aria-hidden="${!settings.initialOpen}" style="--x:${x}px;--y:${y}px;--delay:${index * settings.stagger}ms"><span class="aui-goo__glyph" aria-hidden="true">${icon}</span><span class="aui-goo__label" aria-hidden="true">${escape(label)}</span></button>`;
  }).join('');
  const mainGeometry = settings.direction === 'rail' ? 'x="24" y="24" width="64" height="64" rx="32"' : 'x="28" y="28" width="56" height="56" rx="28"';
  return `<div class="aui-goo" data-direction="${settings.direction}" data-open="${settings.initialOpen}" data-theme-choice="${settings.theme}" data-orbit="${settings.showOrbit}" style="--aui-goo-custom-surface:${settings.surfaceColor};--aui-goo-custom-icon:${settings.iconColor};--aui-goo-custom-label:${settings.labelColor};--aui-goo-icon-size:${settings.iconSize}px;--aui-goo-open:${settings.openDuration}ms;--aui-goo-close:${settings.closeDuration}ms">
    <div class="aui-goo__orbit" aria-hidden="true"></div>
    <div class="aui-goo__motion">
      <svg class="aui-goo__surfaces" viewBox="0 0 112 112" aria-hidden="true" focusable="false">
        <defs><filter id="${id}" filterUnits="userSpaceOnUse" x="-190" y="-190" width="550" height="550" color-interpolation-filters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 -7" result="goo"/>
          <feComposite in="SourceGraphic" in2="goo" operator="atop" result="shape"/>
          <feColorMatrix in="shape" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 60 -29.5" result="ring-solid"/>
          <feMorphology in="ring-solid" operator="dilate" radius="1" result="ring-a"/>
          <feFlood flood-color="#000" flood-opacity=".06" result="ring-c"/>
          <feComposite in="ring-c" in2="ring-a" operator="in" result="ring"/>
          <feGaussianBlur in="shape" stdDeviation="3" result="s2-b"/><feOffset in="s2-b" dy="2" result="s2-o"/>
          <feFlood flood-color="#000" flood-opacity=".05" result="s2-c"/><feComposite in="s2-c" in2="s2-o" operator="in" result="s2"/>
          <feGaussianBlur in="shape" stdDeviation="21" result="s3-b"/><feOffset in="s3-b" dy="4" result="s3-o"/>
          <feFlood flood-color="#000" flood-opacity=".06" result="s3-c"/><feComposite in="s3-c" in2="s3-o" operator="in" result="s3"/>
          <feMerge><feMergeNode in="s3"/><feMergeNode in="s2"/><feMergeNode in="ring"/><feMergeNode in="shape"/></feMerge>
        </filter></defs>
        <g filter="url(#${id})">${shapes}<rect class="aui-goo__main-shape" ${mainGeometry}/></g>
      </svg>
      <button class="aui-goo__trigger" type="button" aria-label="${escape(settings.initialOpen ? settings.closeLabel : settings.openLabel)}" aria-expanded="${settings.initialOpen}" aria-controls="${id}-items"><span></span><span></span><span></span></button>
      <div class="aui-goo__items" id="${id}-items">${items}</div>
    </div>
    ${settings.direction === 'dock' ? '<span class="aui-goo__caption" aria-hidden="true">Quick actions</span>' : ''}
  </div>`;
}
export function mount(host: HTMLElement, input: unknown = {}): Controller {
  let settings = resolveSettings(input);
  let open = settings.initialOpen;
  let paused = false;
  let offscreen = false;
  let destroyed = false;
  host.innerHTML = render(settings);
  let root = host.querySelector<HTMLElement>('.aui-goo')!;
  const buttons = () => Array.from(root.querySelectorAll<HTMLButtonElement>('.aui-goo__item'));
  const trigger = () => root.querySelector<HTMLButtonElement>('.aui-goo__trigger')!;
  let anticipationTimer: ReturnType<typeof setTimeout> | undefined;
  const clearAnticipation = () => {
    clearTimeout(anticipationTimer);
    anticipationTimer = undefined;
    root.classList.remove('is-anticipating');
  };
  const syncMotion = () => {
    root.dataset.paused = String(paused || offscreen || host.ownerDocument.hidden);
    if (paused || offscreen || host.ownerDocument.hidden) clearAnticipation();
  };
  const setOpen = (next: boolean, restoreFocus = false) => {
    if (open === next || destroyed) return;
    clearAnticipation();
    if (!next && !paused && !offscreen && !host.ownerDocument.hidden && !host.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      root.classList.add('is-anticipating');
      anticipationTimer = setTimeout(clearAnticipation, 750);
    }
    open = next;
    root.dataset.open = String(open);
    trigger().setAttribute('aria-expanded', String(open));
    trigger().setAttribute('aria-label', open ? settings.closeLabel : settings.openLabel);
    buttons().forEach(button => { button.tabIndex = open ? 0 : -1; button.setAttribute('aria-hidden', String(!open)); });
    if (restoreFocus) trigger().focus();
    host.dispatchEvent(new host.ownerDocument.defaultView!.CustomEvent('gooey-toggle', { bubbles: true, detail: { open } }));
  };
  const click = (event: Event) => {
    const target = event.target as Element;
    if (target.closest('.aui-goo__trigger')) { setOpen(!open); return; }
    const button = target.closest<HTMLButtonElement>('.aui-goo__item');
    if (!button || !open) return;
    const index = Number(button.dataset.index);
    host.dispatchEvent(new host.ownerDocument.defaultView!.CustomEvent<Selection>('gooey-select', { bubbles: true, detail: { index, label: settings.itemLabels[index] } }));
    if (settings.closeOnSelect) setOpen(false, true);
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false, true); }
    if (['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'].includes(event.key)) {
      event.preventDefault();
      if (!open) setOpen(true);
      const list = buttons();
      const current = list.indexOf(host.ownerDocument.activeElement as HTMLButtonElement);
      const backwards = ['ArrowUp','ArrowLeft'].includes(event.key);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? 3 : current === -1 ? (backwards ? 3 : 0) : (current + (backwards ? -1 : 1) + 4) % 4;
      list[next].focus();
    }
  };
  host.ownerDocument.addEventListener('visibilitychange', syncMotion);
  host.addEventListener('click', click);
  host.addEventListener('keydown', keydown);
  const observer = !host.ownerDocument.defaultView?.IntersectionObserver ? null : new host.ownerDocument.defaultView.IntersectionObserver(entries => { offscreen = !entries.some(entry => entry.isIntersecting); syncMotion(); });
  observer?.observe(host);
  syncMotion();
  return {
    update(value) {
      if (destroyed) return;
      const next = resolveSettings(value);
      if (JSON.stringify(next) === JSON.stringify(settings)) return;
      const initialChanged = next.initialOpen !== settings.initialOpen;
      const active = host.ownerDocument.activeElement as HTMLElement | null;
      const focusedIndex = active?.closest('.aui-goo__item')?.getAttribute('data-index');
      const hadFocus = !!active && host.contains(active);
      clearAnticipation();
      settings = next;
      if (initialChanged) open = settings.initialOpen;
      host.innerHTML = render({ ...settings, initialOpen: open });
      root = host.querySelector('.aui-goo')!;
      syncMotion();
      if (hadFocus) (open && focusedIndex != null ? buttons()[Number(focusedIndex)] : trigger()).focus();
    },
    pause() { if (destroyed) return; paused = true; syncMotion(); },
    resume() { if (destroyed) return; paused = false; syncMotion(); },
    destroy() { if (destroyed) return; destroyed = true; host.ownerDocument.removeEventListener('visibilitychange', syncMotion); clearAnticipation(); observer?.disconnect(); host.removeEventListener('click', click); host.removeEventListener('keydown', keydown); host.replaceChildren(); },
  };
}
