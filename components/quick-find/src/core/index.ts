import manifest from '../../component.json';

export interface Settings {
  dismissOnOutside: boolean;
  iconStroke: number;
  closedWidth: number;
  fieldHeight: number;
  fieldInset: number;
  fieldGap: number;
  fieldTextSize: number;
  searchIconSize: number;
  closeSize: number;
  closeIconSize: number;
  shortcutRadius: number;
  sheetInset: number;
  headerHeight: number;
  headingSize: number;
  rowInset: number;
  artworkGap: number;
  dividerInset: number;
  resultTitleSize: number;
  resultTitleWeight: number;
  descriptionSize: number;
  textGap: number;
  highlightRadius: number;
  artworkHoverScale: number;
  trashSize: number;
  trashButtonSize: number;
  hoverDamping: number;
  stripHeight: number;
  chipHeight: number;
  chipRadius: number;
  chipTextSize: number;
  chipInset: number;
  chipControlSize: number;
  rowStagger: number;
  rowDistance: number;
  removalDuration: number;
  chipDuration: number;
  recentHeading: string;
  matchHeading: string;
  clearLabel: string;
  lightShell: string;
  darkShell: string;
  lightPaper: string;
  darkPaper: string;
  lightInk: string;
  darkInk: string;
  lightMuted: string;
  darkMuted: string;
  lightBorder: string;
  darkBorder: string;
  lightRemoval: string;
  darkRemoval: string;
  lightAction: string;
  darkAction: string;
  theme: 'light' | 'dark';
  corner: number;
  rows: number;
  shortcut: boolean;
  rowHeight: number;
  openWidth: number;
  openDuration: number;
  hoverDuration: number;
  accent: string;
  showArtwork: boolean;
  placeholder: string;
  thumbnailSize: number;
  showDescriptions: boolean;
  showDividers: boolean;
  chipGap: number;
  edgeFade: number;
  hoverTint: number;
  noResultsText: string;
  emptyRecentsText: string;
}
export interface Controller {
  update(input: unknown): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}
export interface MountOptions {
  onSelect?: (title: string) => void;
}

export const defaults = Object.freeze(
  Object.fromEntries(manifest.settings.map(setting => [setting.key, setting.default])),
) as unknown as Readonly<Settings>;

export function resolveSettings(input: unknown): Settings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Quick Find settings must be an object');
  }
  const settings = { ...defaults, ...input };
  if (Object.keys(settings).some(key => !Object.hasOwn(defaults, key))) throw new TypeError('Unknown Quick Find setting');
  if (settings.theme !== 'light' && settings.theme !== 'dark') throw new TypeError('Invalid theme');
  if (!Number.isInteger(settings.rows)) throw new TypeError('Recent rows must be an integer');
  for (const rule of manifest.settings) {
    const value = settings[rule.key as keyof Settings];
    switch (rule.kind) {
      case 'boolean':
        if (typeof value !== 'boolean') throw new TypeError('Invalid ' + rule.key);
        break;
      case 'color':
        if (typeof value !== 'string' || !/^(?:transparent|#[a-f0-9]{6}(?:[a-f0-9]{2})?)$/i.test(value)) {
          throw new TypeError('Invalid ' + rule.key);
        }
        break;
      case 'text':
        if (typeof value !== 'string' || value.length > rule.maxLength!) throw new TypeError('Invalid ' + rule.key);
        break;
      case 'number':
        if (typeof value !== 'number' || !Number.isFinite(value) || value < rule.min! || value > rule.max!) {
          throw new TypeError(rule.label + ' is outside its supported range');
        }
        break;
    }
  }
  return {
    ...settings,
    noResultsText: settings.noResultsText.trim() || defaults.noResultsText,
    emptyRecentsText: settings.emptyRecentsText.trim() || defaults.emptyRecentsText,
  };
}

type Category = 'Pages' | 'Notes' | 'Tools';
interface Entry {
  id: string;
  title: string;
  category: Category;
  format: 'PDF' | 'DOC' | 'PNG';
  keywords: string;
}
const entries: Entry[] = [
  { id: 'studio', title: 'Studio index', category: 'Pages', format: 'PDF', keywords: 'home workspace overview' },
  { id: 'naming', title: 'Naming notes', category: 'Notes', format: 'DOC', keywords: 'brand copy labels editorial' },
  { id: 'export', title: 'Export artwork', category: 'Tools', format: 'PNG', keywords: 'download files images assets' },
  { id: 'field', title: 'Field research', category: 'Notes', format: 'DOC', keywords: 'interviews findings customer' },
  { id: 'calendar', title: 'Release calendar', category: 'Pages', format: 'PDF', keywords: 'schedule product shipping' },
  { id: 'library', title: 'Asset library', category: 'Pages', format: 'PNG', keywords: 'files brand photography images' },
  { id: 'type', title: 'Typography checklist', category: 'Notes', format: 'PDF', keywords: 'fonts type QA accessibility' },
  { id: 'scratch', title: 'Start a scratchpad', category: 'Tools', format: 'DOC', keywords: 'create new draft note' },
  { id: 'feedback', title: 'Collect feedback', category: 'Tools', format: 'DOC', keywords: 'review comments share' },
];
const categories: Category[] = ['Pages', 'Notes', 'Tools'];
const descriptions: Record<Entry['id'], string> = {
  studio: 'Projects and work in progress',
  naming: 'Words for the next release',
  export: 'Production files and formats',
  field: 'Observations from the field',
  calendar: 'Upcoming releases and dates',
  library: 'Reusable images and marks',
  type: 'Type, hierarchy and spacing',
  scratch: 'A blank page for a new idea',
  feedback: 'Notes from the review',
};

const escapeAttribute = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const chromeHeight = (s: Settings) => s.fieldHeight + s.headerHeight + 2 + s.stripHeight;
const reserve = (s: Settings) => Math.max(418, chromeHeight(s) + 12 + s.rows * s.rowHeight);
function rootStyle(s: Settings) {
  const vars = {
    '--qf-icon-stroke': String(s.iconStroke),
    '--qf-corner': s.corner + 'px',
    '--qf-reserve': reserve(s) + 'px',
    '--qf-row': s.rowHeight + 'px',
    '--qf-thumbnail': s.thumbnailSize + 'px',
    '--qf-width': s.openWidth + 'px',
    '--qf-chip-gap': s.chipGap + 'px',
    '--qf-edge-fade': s.edgeFade + 'px',
    '--qf-hover-tint': s.hoverTint + '%',
    '--qf-open': s.openDuration + 'ms',
    '--qf-hover': s.hoverDuration + 'ms',
    '--qf-accent': s.accent,
    '--qf-button': s.accent === defaults.accent ? 'var(--ember-300, #ff8a52)' : 'color-mix(in srgb, var(--qf-accent) 50%, white)',
    '--qf-closed-width': s.closedWidth + 'px',
    '--qf-field-height': s.fieldHeight + 'px',
    '--qf-field-inset': s.fieldInset + 'px',
    '--qf-field-gap': s.fieldGap + 'px',
    '--qf-field-text-size': s.fieldTextSize + 'px',
    '--qf-search-icon-size': s.searchIconSize + 'px',
    '--qf-close-size': s.closeSize + 'px',
    '--qf-close-icon-size': s.closeIconSize + 'px',
    '--qf-shortcut-radius': s.shortcutRadius + 'px',
    '--qf-sheet-inset': s.sheetInset + 'px',
    '--qf-header-height': s.headerHeight + 'px',
    '--qf-heading-size': s.headingSize + 'px',
    '--qf-row-inset': s.rowInset + 'px',
    '--qf-artwork-gap': s.artworkGap + 'px',
    '--qf-divider-inset': s.dividerInset + 'px',
    '--qf-result-title-size': s.resultTitleSize + 'px',
    '--qf-result-title-weight': String(s.resultTitleWeight),
    '--qf-description-size': s.descriptionSize + 'px',
    '--qf-text-gap': s.textGap + 'px',
    '--qf-highlight-radius': s.highlightRadius + 'px',
    '--qf-artwork-hover-scale': String(s.artworkHoverScale),
    '--qf-trash-size': s.trashSize + 'px',
    '--qf-trash-button-size': s.trashButtonSize + 'px',
    '--qf-strip-height': s.stripHeight + 'px',
    '--qf-chip-height': s.chipHeight + 'px',
    '--qf-chip-radius': s.chipRadius + 'px',
    '--qf-chip-text-size': s.chipTextSize + 'px',
    '--qf-chip-inset': s.chipInset + 'px',
    '--qf-chip-control-size': s.chipControlSize + 'px',
    '--qf-shell': s.theme === 'dark' ? s.darkShell : s.lightShell,
    '--qf-paper': s.theme === 'dark' ? s.darkPaper : s.lightPaper,
    '--qf-ink': s.theme === 'dark' ? s.darkInk : s.lightInk,
    '--qf-muted': s.theme === 'dark' ? s.darkMuted : s.lightMuted,
    '--qf-border': s.theme === 'dark' ? s.darkBorder : s.lightBorder,
    '--qf-removal': s.theme === 'dark' ? s.darkRemoval : s.lightRemoval,
    '--qf-control-ink': s.theme === 'dark' ? s.darkAction : s.lightAction,
  };
  return Object.entries(vars).map(([key, value]) => key + ':' + value).join(';');
}
// Lucide outline icons. See assets/Lucide-LICENSE.txt.
const glass = '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>';
const closeIcon = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
const trashIcon = '<svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
let serial = 0;
const prefix = Math.random().toString(36).slice(2);
const nextId = () => `${prefix}-${++serial}`;
const safeId = (s: string) => 'qf-' + Array.from(s, c => c.codePointAt(0)!.toString(16)).join('-');

export function render(input: unknown = defaults, id = nextId()): string {
  const s = resolveSettings(input);
  const key = safeId(id);
  return `<div class="quick-find" data-quick-find data-theme="${s.theme}" data-open="false" data-artwork="${s.showArtwork}" data-descriptions="${s.showDescriptions}" data-dividers="${s.showDividers}" style="${rootStyle(s)}">
    <div class="quick-find__shell">
      <div class="quick-find__field">
        <span class="quick-find__glass">${glass}</span>
        <input type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-label="Search workspace" aria-controls="${key}-list" placeholder="${escapeAttribute(s.placeholder)}" spellcheck="false" autocomplete="off" disabled>
        <kbd data-shortcut aria-hidden="true" ${s.shortcut ? '' : 'hidden'}>⌘K</kbd>
        <button type="button" class="quick-find__close" data-close aria-label="Close search" hidden><span aria-hidden="true">${closeIcon}</span></button>
      </div>
      <div class="quick-find__body" data-panel inert aria-hidden="true">
        <section class="quick-find__sheet" aria-label="Workspace results">
          <header><span data-heading>${escapeAttribute(s.recentHeading)}</span><span class="quick-find__actions"></span></header>
          <div class="quick-find__viewport"><div class="quick-find__history" aria-hidden="true" inert></div>
            <div class="quick-find__live">
              <div class="quick-find__highlight"></div>
              <div role="listbox" aria-label="Search results" data-list id="${key}-list"></div>
              <div data-removals></div><div data-empty hidden>${escapeAttribute(s.emptyRecentsText)}</div>
            </div>
          </div>
        </section>
        <div class="quick-find__filters" role="group" aria-label="Categories"><div class="quick-find__chip-track"></div></div>
      </div>
    </div>
    <span class="quick-find__sr" role="status" data-status></span>
  </div>`;
}

type ShortcutOwner = { root: HTMLElement; enabled(): boolean };
const groups = new WeakMap<Document, { members: Set<ShortcutOwner>; last?: ShortcutOwner }>();

export function mount(host: HTMLElement, input: unknown = defaults, id = nextId(), options: MountOptions = {}): Controller {
  let settings = resolveSettings(input);
  const key = safeId(id);
  const doc = host.ownerDocument;
  const view = doc.defaultView!;
  host.innerHTML = render(settings, id);
  const root = host.querySelector<HTMLElement>('[data-quick-find]')!;
  const get = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const field = get<HTMLInputElement>('input');
  const panel = get('[data-panel]');
  const list = get('[data-list]');
  const removals = get('[data-removals]');
  const empty = get('[data-empty]');
  const viewport = get('.quick-find__viewport');
  const history = get('.quick-find__history');
  const highlight = get('.quick-find__highlight');
  const actions = get('.quick-find__actions');
  const strip = get('.quick-find__filters');
  const chips = get('.quick-find__chip-track');
  const status = get('[data-status]');
  const shortcut = get('kbd');
  const close = get<HTMLButtonElement>('[data-close]');
  const events = new view.AbortController();
  const listener = { signal: events.signal };
  const media = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const initialRecents = () => entries.slice(0, settings.rows);
  let recents = initialRecents();
  let available = [...categories];
  let filter: Category | null = null;
  let matches: Entry[] = [];
  let keyboardIndex = -1;
  let hoverIndex = -1;
  let opened = false;
  let offscreen = false;
  let paused = false;
  let destroyed = false;
  let restoringFocus = false;
  let composing = false;
  let historyTimer = 0;
  let closeTimer = 0;
  let lastShape = '';
  let hoverFrame = 0;
  let hoverTop = 0;
  let hoverSpeed = 0;
  let destination = 0;
  let previousTime = 0;
  const animations = new Set<Animation>();
  const canAnimate = () => opened && !paused && !offscreen && !destroyed && !media?.matches;

  function animate(element: Element, keyframes: Keyframe[], duration: number, delay = 0) {
    if (!canAnimate() || !element.animate) return;
    const animation = element.animate(keyframes, {
      duration, delay, easing: 'cubic-bezier(.2,.72,.24,1)', fill: 'backwards',
    });
    animations.add(animation);
    animation.onfinish = animation.oncancel = () => { animations.delete(animation); };
  }

  function stopAnimations() {
    if (hoverFrame) view.cancelAnimationFrame(hoverFrame);
    hoverFrame = hoverSpeed = 0;
    hoverTop = destination;
    highlight.style.transform = `translateY(${hoverTop}px)`;
    for (const animation of animations) animation.cancel();
    animations.clear();
  }

  function moveHighlight(index: number) {
    if (index < 0) {
      highlight.dataset.shown = 'false';
      return;
    }
    destination = index * settings.rowHeight;
    if (!canAnimate() || highlight.dataset.shown !== 'true') {
      if (hoverFrame) view.cancelAnimationFrame(hoverFrame);
      hoverFrame = hoverSpeed = 0;
      hoverTop = destination;
      highlight.style.transform = `translateY(${hoverTop}px)`;
    } else if (!hoverFrame && hoverTop !== destination) {
      previousTime = view.performance.now();
      hoverFrame = view.requestAnimationFrame(advanceHighlight);
    }
    highlight.dataset.shown = 'true';
  }

  function advanceHighlight(now: number) {
    hoverFrame = 0;
    const elapsed = Math.min(.05, Math.max(0, (now - previousTime) / 1000));
    previousTime = now;
    const steps = Math.max(1, Math.ceil(elapsed * 180));
    const dt = elapsed / steps;
    const frequency = 7650 / settings.hoverDuration;
    for (let i = 0; i < steps; i++) {
      hoverSpeed += ((destination - hoverTop) * frequency * frequency - 2 * settings.hoverDamping * frequency * hoverSpeed) * dt;
      hoverTop += hoverSpeed * dt;
    }
    if (Math.abs(destination - hoverTop) < .06 && Math.abs(hoverSpeed) < 2) {
      hoverTop = destination;
      hoverSpeed = 0;
    } else if (canAnimate()) hoverFrame = view.requestAnimationFrame(advanceHighlight);
    highlight.style.transform = `translateY(${hoverTop.toFixed(2)}px)`;
  }
  let opener: HTMLElement | null = null;
  const owner = { root, enabled: () => settings.shortcut && !paused && !offscreen && !destroyed };
  const group = groups.get(doc) ?? { members: new Set<ShortcutOwner>(), last: undefined };
  groups.set(doc, group);
  group.members.add(owner);

  function focusField() {
    restoringFocus = true;
    field.focus({ preventScroll: true });
    restoringFocus = false;
  }

  function selectRow() {
    const index = hoverIndex >= 0 ? hoverIndex : keyboardIndex;
    moveHighlight(index);
    Array.from(list.children).forEach((child, i) => {
      (child as HTMLElement).dataset.active = String(i === index);
      child.setAttribute('aria-selected', String(i === keyboardIndex));
    });
    Array.from(removals.children).forEach((child, i) => { (child as HTMLElement).dataset.active = String(i === index); });
    if (keyboardIndex >= 0) field.setAttribute('aria-activedescendant', list.children[keyboardIndex].id);
    else field.removeAttribute('aria-activedescendant');
  }

  function syncStripEdges() {
    const remaining = strip.scrollWidth - strip.clientWidth - strip.scrollLeft;
    strip.toggleAttribute('data-fade-left', strip.scrollLeft > 1);
    strip.toggleAttribute('data-fade-right', remaining > 1);
  }

  function renderChips() {
    const scroll = strip.scrollLeft;
    const old = new Map(Array.from(chips.querySelectorAll<HTMLElement>('[data-chip]'), el => [el.dataset.chip, el.getBoundingClientRect().left]));
    const oldCount = chips.querySelector('[data-restore-categories] span')?.textContent;
    chips.innerHTML = `<button type="button" class="quick-find__count" data-restore-categories aria-label="Restore all categories"><span>${available.length}</span>Categories</button>` +
      available.map(c => `<span class="quick-find__chip" data-chip="${c}">
        <button type="button" data-remove-category="${c}" aria-label="Remove ${c} category">${closeIcon}</button>
        <button type="button" data-filter="${c}" aria-pressed="${filter === c}">${c}</button></span>`).join('');
    strip.scrollLeft = scroll;
    syncStripEdges();
    if (!canAnimate()) return;
    if (oldCount !== String(available.length)) {
      animate(chips.querySelector('.quick-find__count span')!, [{ transform: 'scale(.78)' }, { transform: 'scale(1)' }], 220);
    }
    Array.from(chips.querySelectorAll<HTMLElement>('[data-chip]')).forEach((el, i) => {
      const before = old.get(el.dataset.chip);
      const dx = before === undefined ? 9 : before - el.getBoundingClientRect().left;
      if (Math.abs(dx) < .1) return;
      animate(el, [{ transform: `translateX(${dx}px)`, opacity: before === undefined ? 0 : 1 }, { transform: 'none', opacity: 1 }], settings.chipDuration, before === undefined ? i * 18 : 0);
    });
  }

  function removeHistory() {
    view.clearTimeout(historyTimer);
    history.replaceChildren();
  }

  function retainDepartures(current: Set<string>) {
    removeHistory();
    if (!canAnimate()) return;
    for (const row of list.querySelectorAll<HTMLElement>('[data-entry]')) {
      if (current.has(row.dataset.entry!)) continue;
      const old = row.cloneNode(true) as HTMLElement;
      for (const attribute of ['id', 'role', 'aria-selected', 'data-option', 'data-entry']) old.removeAttribute(attribute);
      old.style.top = row.offsetTop + 'px';
      history.append(old);
    }
    if (history.childElementCount) {
      animate(history, [{ opacity: .9, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-6px)' }], settings.removalDuration);
      historyTimer = view.setTimeout(removeHistory, settings.removalDuration);
    }
  }

  function refresh() {
    const terms = field.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const searching = terms.length > 0 || filter !== null;
    const source = searching ? entries : recents.slice(0, settings.rows);
    matches = source.filter(entry => (!filter || entry.category === filter) &&
      terms.every(term => (entry.title + ' ' + entry.category + ' ' + entry.format + ' .' + entry.format + ' ' + entry.keywords).toLowerCase().includes(term)));
    const shape = (searching ? 'query:' : 'recent:') + matches.map(item => item.id).join('|');
    const changed = shape !== lastShape;
    const firstOpen = !lastShape;
    const positions = new Map<string, number>();
    if (changed && canAnimate()) {
      for (const row of list.querySelectorAll<HTMLElement>('[data-entry]')) positions.set(row.dataset.entry!, row.getBoundingClientRect().top);
      retainDepartures(new Set(matches.map(item => item.id)));
    }
    lastShape = shape;
    if (changed) keyboardIndex = hoverIndex = -1;
    get('[data-heading]').textContent = searching ? settings.matchHeading : settings.recentHeading;
    if (!actions.childElementCount) {
      actions.innerHTML = '<button type="button" data-reset>Reset search</button><button type="button" data-forget>Clear all</button><button type="button" data-restore>Restore</button>';
    }
    actions.querySelector('[data-forget]')!.textContent = settings.clearLabel;
    const action = searching ? 'reset' : settings.rows === 0 ? '' : recents.length ? 'forget' : 'restore';
    for (const button of actions.querySelectorAll('button')) {
      const current = Object.hasOwn(button.dataset, action);
      button.disabled = !current;
      button.setAttribute('aria-hidden', String(!current));
    }
    if (changed) list.innerHTML = matches.map((item, i) => `<div class="quick-find__row" id="${key}-option-${i}" role="option" aria-selected="false" data-option="${i}" data-entry="${item.id}">
      <span class="quick-find__art" data-art="${item.category}" data-format="${item.format}" role="img" aria-label="${item.format} file"></span><span class="quick-find__copy"><span>${item.title}</span><small>${descriptions[item.id]}</small></span></div>`).join('');
    removals.innerHTML = searching ? '' : matches.map((item, i) => `<button type="button" data-remove="${i}" aria-label="Remove ${item.title} from recents" style="--qf-index:${i}">${trashIcon}</button>`).join('');
    empty.hidden = matches.length !== 0;
    empty.textContent = searching ? settings.noResultsText : settings.emptyRecentsText;
    if (changed && !firstOpen && canAnimate()) {
      Array.from(list.querySelectorAll<HTMLElement>('[data-entry]')).forEach((row, i) => {
        const previous = positions.get(row.dataset.entry!);
        const dy = previous === undefined ? settings.rowDistance : previous - row.getBoundingClientRect().top;
        if (Math.abs(dy) < .25) return;
        const delay = previous === undefined ? Math.min(i, 3) * settings.rowStagger + 65 : 0;
        animate(row, [{ opacity: previous === undefined ? 0 : 1, transform: `translateY(${dy}px)` }, { opacity: 1, transform: 'none' }], settings.openDuration * 9 / 14, delay);
      });
      if (!matches.length) animate(empty, [{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], 170, 55);
    }
    const panelChrome = chromeHeight(settings);
    const height = matches.length ? Math.min(matches.length * settings.rowHeight, 4 * settings.rowHeight, reserve(settings) - panelChrome) : 92;
    viewport.style.height = height + 'px';
    root.style.setProperty('--qf-height', (panelChrome + height) + 'px');
    selectRow();
    if (!opened) status.textContent = '';
    else if (!matches.length) status.textContent = empty.textContent;
    else status.textContent = `${matches.length} ${matches.length === 1 ? 'item' : 'items'}`;
  }

  function openPanel() {
    if (opened || paused || destroyed) return;
    view.clearTimeout(closeTimer);
    group.last = owner;
    opened = true;
    root.dataset.open = 'true';
    field.setAttribute('aria-expanded', 'true');
    close.hidden = false;
    shortcut.hidden = true;
    panel.inert = false;
    panel.removeAttribute('aria-hidden');
    renderChips();
    refresh();
  }

  function unloadBody() {
    if (opened) return;
    root.style.removeProperty('--qf-body-rest');
    list.replaceChildren();
    removals.replaceChildren();
    chips.replaceChildren();
    actions.replaceChildren();
    removeHistory();
    lastShape = '';
  }

  function closePanel(restore = false) {
    if (!opened) return;
    opened = false;
    root.style.setProperty('--qf-body-rest', '-4px');
    root.dataset.open = 'false';
    field.setAttribute('aria-expanded', 'false');
    field.removeAttribute('aria-activedescendant');
    close.hidden = true;
    shortcut.hidden = !settings.shortcut;
    panel.inert = true;
    panel.setAttribute('aria-hidden', 'true');
    status.textContent = '';
    keyboardIndex = hoverIndex = -1;
    selectRow();
    if (restore) {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      else focusField();
    }
    opener = null;
    view.clearTimeout(closeTimer);
    if (paused || destroyed || offscreen || media?.matches) unloadBody();
    else closeTimer = view.setTimeout(unloadBody, settings.openDuration + 30);
  }

  function pick(item: Entry) {
    if (settings.rows) recents = [item, ...recents.filter(entry => entry.id !== item.id)].slice(0, settings.rows);
    field.value = '';
    filter = null;
    renderChips();
    closePanel(true);
    root.dispatchEvent(new view.CustomEvent('quick-find-select', { bubbles: true, detail: { title: item.title } }));
    options.onSelect?.(item.title);
  }

  function syncSettings() {
    root.dataset.theme = settings.theme;
    root.dataset.artwork = String(settings.showArtwork);
    root.dataset.descriptions = String(settings.showDescriptions);
    root.dataset.dividers = String(settings.showDividers);
    root.style.cssText = rootStyle(settings);
    field.placeholder = settings.placeholder;
    const mac = /Mac|iPad|iPhone/i.test(view.navigator.platform);
    shortcut.textContent = mac ? '⌘K' : 'Ctrl K';
    shortcut.hidden = opened || !settings.shortcut;
    if (settings.shortcut) field.setAttribute('aria-keyshortcuts', 'Meta+K Control+K');
    else field.removeAttribute('aria-keyshortcuts');
    if (opened) { renderChips(); refresh(); }
  }

  field.addEventListener('focus', () => { if (!restoringFocus) openPanel(); }, listener);
  field.addEventListener('click', openPanel, listener);
  field.addEventListener('compositionstart', () => { composing = true; }, listener);
  field.addEventListener('compositionend', () => { composing = false; refresh(); }, listener);
  field.addEventListener('input', () => { if (!paused) { openPanel(); refresh(); } }, listener);
  field.addEventListener('keydown', event => {
    if (paused || composing || event.isComposing) return;
    if (event.key === 'Escape' && opened) {
      event.preventDefault();
      if (field.value) { field.value = ''; refresh(); }
      else closePanel(true);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openPanel();
      if (!matches.length) return;
      hoverIndex = -1;
      keyboardIndex = keyboardIndex < 0 ? (event.key === 'ArrowDown' ? 0 : matches.length - 1)
        : (keyboardIndex + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
      selectRow();
      (list.children[keyboardIndex] as HTMLElement).scrollIntoView?.({ block: 'nearest' });
    } else if (event.key === 'Enter' && opened && matches[keyboardIndex]) {
      event.preventDefault();
      pick(matches[keyboardIndex]);
    }
  }, listener);

  function rowUnder(target: Element) {
    const el = target.closest<HTMLElement>('[data-option],[data-remove]');
    return el ? Number(el.dataset.option ?? el.dataset.remove) : -1;
  }
  viewport.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch') return;
    hoverIndex = rowUnder(event.target as Element);
    selectRow();
  }, listener);
  viewport.addEventListener('pointerleave', () => { hoverIndex = -1; selectRow(); }, listener);
  viewport.addEventListener('focusin', event => {
    hoverIndex = rowUnder(event.target as Element);
    selectRow();
  }, listener);
  root.addEventListener('focusout', event => {
    if (settings.dismissOnOutside && !root.contains(event.relatedTarget as Node | null) && event.relatedTarget) closePanel();
  }, listener);
  root.addEventListener('click', event => {
    if (paused) return;
    const el = (event.target as Element).closest<HTMLElement>('button,[data-option]');
    if (!el) {
      if ((event.target as Element).closest('.quick-find__field')) { focusField(); openPanel(); }
      return;
    }
    const data = el.dataset;
    if ('close' in data) { closePanel(true); return; }
    if (!opened) return;
    if ('option' in data) { pick(matches[Number(data.option)]); return; }
    if ('remove' in data) recents = recents.filter(item => item.id !== matches[Number(data.remove)]?.id);
    else if ('forget' in data) recents = [];
    else if ('restore' in data) recents = initialRecents();
    else if ('reset' in data) { field.value = ''; filter = null; }
    else if (data.filter) filter = filter === data.filter ? null : data.filter as Category;
    else if (data.removeCategory) {
      available = available.filter(c => c !== data.removeCategory);
      if (filter === data.removeCategory) filter = null;
    } else if ('restoreCategories' in data) available = [...categories];
    else return;
    focusField();
    renderChips();
    refresh();
  }, listener);
  doc.addEventListener('pointerdown', event => {
    if (settings.dismissOnOutside && !root.contains(event.target as Node)) closePanel();
  }, listener);
  doc.addEventListener('keydown', event => {
    if (!owner.enabled() || event.defaultPrevented || event.isComposing || composing || event.repeat || event.altKey || event.shiftKey ||
      !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
    const active = doc.activeElement;
    if (!active?.matches(':disabled') && active?.closest('textarea,input,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]') && !root.contains(active)) return;
    const members = Array.from(group.members).filter(member => member.enabled());
    const chosen = members.find(member => member.root.contains(active)) ?? (group.last?.enabled() ? group.last : members[0]);
    if (chosen !== owner) return;
    event.preventDefault();
    if (opened) closePanel(true);
    else {
      opener = active instanceof view.HTMLElement && active !== doc.body && !root.contains(active) ? active : null;
      openPanel();
      focusField();
    }
  }, listener);
  root.addEventListener('keydown', event => {
    if (event.target !== field && event.key === 'Escape' && opened) {
      event.preventDefault();
      if (field.value) { field.value = ''; refresh(); focusField(); }
      else closePanel(true);
    }
  }, listener);
  const visibility = view.IntersectionObserver && new view.IntersectionObserver(([entry]) => {
    offscreen = !entry.isIntersecting;
    root.dataset.still = String(offscreen || paused);
    if (offscreen) { removeHistory(); stopAnimations(); }
  });
  visibility?.observe(root);
  strip.addEventListener('scroll', syncStripEdges, { ...listener, passive: true });
  const stripResize = view.ResizeObserver && new view.ResizeObserver(syncStripEdges);
  stripResize?.observe(strip);
  stripResize?.observe(chips);
  media?.addEventListener('change', () => { if (media.matches) { removeHistory(); stopAnimations(); } }, listener);
  field.disabled = false;
  syncSettings();

  return {
    update(input) {
      if (destroyed) return;
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Expected settings object');
      const previous = settings.rows;
      settings = resolveSettings({ ...settings, ...input });
      if (previous !== settings.rows) recents = initialRecents();
      syncSettings();
    },
    pause() {
      if (destroyed) return;
      paused = field.disabled = true;
      root.dataset.still = 'true';
      closePanel();
      removeHistory();
      stopAnimations();
    },
    resume() {
      if (destroyed) return;
      paused = field.disabled = false;
      root.dataset.still = String(offscreen);
    },
    destroy() {
      if (destroyed) return;
      destroyed = field.disabled = true;
      root.dataset.still = 'true';
      closePanel();
      view.clearTimeout(closeTimer);
      unloadBody();
      stopAnimations();
      events.abort();
      visibility?.disconnect();
      stripResize?.disconnect();
      group.members.delete(owner);
      if (group.last === owner) group.last = undefined;
      if (!group.members.size) groups.delete(doc);
    },
  };
}
