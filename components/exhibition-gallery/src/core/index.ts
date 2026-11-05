import manifest from '../../component.json';
import { collectionPhotos } from './media';
export interface Settings {
    heading: string;
    captions: string[];
    categories: string[];
    memberships: string[];
    imageUrls: string[];
    initialCategory: string;
    columns: number;
    gap: number;
    radius: number;
    captionMode: 'hover' | 'always' | 'hidden';
    viewer: boolean;
    thumbnails: boolean;
    zoom: number;
    motion: boolean;
    background: string;
    foreground: string;
    accent: string;
}
export const defaults = Object.fromEntries(manifest.settings.map(s => [s.key, Array.isArray(s.default) ? [...s.default] : s.default])) as unknown as Settings;
const safeUrl = (value: string) => /^(?:https:\/\/[^\s"<>]+|data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+|(?:\.?\.?\/)?[A-Za-z0-9_-][A-Za-z0-9_./-]*)$/.test(value);
export function resolveSettings(input: unknown = {}): Settings {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new Error('Settings must be an object');
    const result = { ...defaults, captions: [...defaults.captions], categories: [...defaults.categories], memberships: [...defaults.memberships], imageUrls: [] } as Settings;
    for (const [key, value] of Object.entries(input)) {
        const s = manifest.settings.find(x => x.key === key);
        if (!s)
            throw new Error(`Unknown setting: ${key}`);
        if (s.kind === 'number') {
            if (typeof value !== 'number' || !Number.isFinite(value) || value < (s.min ?? -Infinity) || value > (s.max ?? Infinity))
                throw new Error(`Invalid number: ${key}`);
        }
        else if (s.kind === 'boolean') {
            if (typeof value !== 'boolean')
                throw new Error(`Invalid boolean: ${key}`);
        }
        else if (s.kind === 'string-list') {
            if (!Array.isArray(value) || value.length > (s.maxItems ?? 100) || value.some(x => typeof x !== 'string' || x.length > (s.maxItemLength ?? 10000)))
                throw new Error(`Invalid list: ${key}`);
        }
        else {
            if (typeof value !== 'string' || value.length > (s.maxLength ?? 10000))
                throw new Error(`Invalid text: ${key}`);
            if (s.kind === 'select' && !s.options?.some(o => o === value))
                throw new Error(`Invalid selection: ${key}`);
            if (s.kind === 'color' && !/^(?:transparent|#[\da-f]{6}(?:[\da-f]{2})?)$/i.test(value))
                throw new Error(`Invalid color: ${key}`);
        }
        (result as unknown as Record<string, unknown>)[key] = Array.isArray(value) ? [...value] : value;
    }
    if (result.imageUrls.some(url => !safeUrl(url)))
        throw new Error('Image URLs must use HTTPS, a relative file, or a raster data URL');
    const automatic = (key: 'heading' | 'captions' | 'categories' | 'memberships') => !Object.hasOwn(input, key) || JSON.stringify((input as Record<string, unknown>)[key]) === JSON.stringify(defaults[key]);
    if (!result.imageUrls.length) {
        const collection = collectionPhotos;
        if (automatic('heading'))
            result.heading = 'A sense of place';
        if (automatic('captions'))
            result.captions = collection.map(photo => photo.title);
        const autoCategories = automatic('categories');
        if (autoCategories)
            result.categories = collection.map(photo => photo.category);
        if (automatic('memberships'))
            result.memberships = autoCategories ? collection.map(photo => photo.categories.join(', ')) : [...result.categories];
    }
    else if (!Object.hasOwn(input, 'memberships') && (Object.hasOwn(input, 'categories') || result.imageUrls.length))
        result.memberships = [...result.categories];
    result.columns = Math.round(result.columns);
    return result;
}
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const ratios = [.8, 1.5, 1, 1.5, .8, 1, .8, 1.5];
const focalPositions = ['44% 50%', '65% 50%', '42% 50%', '50% 50%', '50% 50%', '55% 50%', '47% 50%', '52% 50%'];
interface ResponsiveSource {
    readonly src: string;
    readonly width: number;
    readonly height: number;
}
interface CampaignPhoto {
    readonly width: number;
    readonly height: number;
    readonly sources: readonly [
        ResponsiveSource,
        ResponsiveSource,
        ResponsiveSource,
        ResponsiveSource,
        ResponsiveSource
    ];
}
interface Item {
    responsive?: CampaignPhoto;
    width?: number;
    height?: number;
    src: string;
    caption: string;
    category: string;
    memberships: string[];
    alt: string;
    ratio: number;
    index: number;
}
function itemsFor(s: Settings): Item[] {
    const collection = !s.imageUrls.length ? (collectionPhotos) : undefined;
    return (s.imageUrls.length ? s.imageUrls : collection ? collection.map(photo => photo.sources[1].src) : []).map((src, i) => {
        const photo = collection?.[i];
        const category = s.categories[i]?.trim() || 'Uncategorized';
        const memberships = [...new Set((s.memberships[i] || category).split(',').map(x => x.trim()).filter(x => x && x !== 'All'))];
        return { src, responsive: photo, width: photo?.width ?? (s.imageUrls.length ? undefined : 1536), height: photo?.height ?? (s.imageUrls.length ? undefined : 1024), caption: s.captions[i] ?? `Image ${i + 1}`, category, memberships: memberships.length ? memberships : [category], alt: s.imageUrls.length ? (s.captions[i] || `Gallery image ${i + 1}`) : photo?.alt ?? `Gallery image ${i + 1}`, ratio: photo ? photo.width / photo.height : ratios[i % 8]!, index: i };
    });
}
const sourceSet = (photo: CampaignPhoto, start: number, end: number) => photo.sources.slice(start, end).map(source => `${source.src} ${source.width}w`).join(', ');
function gridAttributes(item: Item) { return `${item.width && item.height ? ` width="${item.width}" height="${item.height}"` : ''}${item.responsive ? ` srcset="${escape(sourceSet(item.responsive, 1, 4))}" sizes="(max-width: 650px) 44vw, 30vw"` : ''}`; }
function categoriesFor(items: Item[]) { const used = new Set(items.flatMap(x => x.memberships)); return ['All', ...new Set([...items.map(x => x.category).filter(x => used.has(x)), ...used].filter(x => x !== 'All'))]; }
const includes = (item: Item, category: string) => category === 'All' || item.memberships.includes(category);
function selected(s: Settings, items: Item[]) { return categoriesFor(items).includes(s.initialCategory) ? s.initialCategory : 'All'; }
function style(s: Settings) { return `--eg-bg:${s.background};--eg-fg:${s.foreground};--eg-accent:${s.accent};--eg-gap:${s.gap}px;--eg-radius:${s.radius}px;--eg-columns:${s.columns};--eg-zoom:${s.zoom}${''}`; }
const svg = (body: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const icons = { close: svg('<path d="m6 6 12 12M18 6 6 18"/>'), prev: svg('<path d="m14 5-7 7 7 7"/>'), next: svg('<path d="m10 5 7 7-7 7"/>'), zoom: svg('<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M7 10h6M10 7v6"/>') };
export function render(input: unknown = {}): string {
    const s = resolveSettings(input), items = itemsFor(s), category = selected(s, items);
    return `<section class="eg" data-layout="exhibition" data-captions="${s.captionMode}" data-motion="${s.motion}" style="${style(s)}" aria-label="${escape(s.heading || 'Image gallery')}">
 <header class="eg-heading"><div><span class="eg-eyebrow">THE COLLECTION</span><h2>${escape(s.heading)}</h2></div><span class="eg-total">${String(items.length).padStart(2, '0')} works</span></header>
 <nav class="eg-filters" aria-label="Filter images"><span class="eg-indicator" aria-hidden="true"></span>${categoriesFor(items).map(c => `<button type="button" data-category="${escape(c)}" aria-pressed="${category === c}">${escape(c)}<span>${c === 'All' ? items.length : items.filter(x => includes(x, c)).length}</span></button>`).join('')}</nav>
 <p class="eg-sr eg-status" role="status" aria-live="polite"></p><div class="eg-grid">${items.map(item => `<a class="eg-tile" href="${escape(item.responsive?.sources.at(-1)?.src ?? item.src)}" data-index="${item.index}" style="--eg-ratio:${item.ratio};--eg-position:${item.responsive ? '50% 50%' : focalPositions[item.index % 8]}"${!includes(item, category) ? ' hidden' : ''} aria-label="${escape((s.viewer ? 'View ' : '') + item.caption + (`, ${item.category}`))}"><div class="eg-image"><img src="${escape(item.src)}"${gridAttributes(item)} alt="${escape(item.alt)}" loading="lazy" decoding="async"/><span class="eg-unavailable">Image unavailable</span><span class="eg-open" aria-hidden="true">↗</span></div><div class="eg-caption"><span class="eg-number">${String(item.index + 1).padStart(2, '0')}</span><span class="eg-caption-label"><span class="eg-caption-title">${escape(item.caption)}</span><small>${escape(item.category)}</small></span><span class="eg-tag">${escape(item.category)}</span><span class="eg-caption-arrow" aria-hidden="true">↗</span></div></a>`).join('')}</div>
 <dialog class="eg-dialog" aria-label="Image viewer"><div class="eg-viewer"><header class="eg-viewer-header"><span class="eg-position" role="status" aria-live="polite"></span><div><button type="button" data-action="zoom" aria-label="Zoom image" aria-pressed="false">${icons.zoom}</button><button type="button" data-action="close" aria-label="Close viewer">${icons.close}</button></div></header><div class="eg-stage"><button type="button" class="eg-previous" data-action="previous" aria-label="Previous image">${icons.prev}</button><div class="eg-canvas"><span class="eg-viewer-error" hidden>Image unavailable</span></div><button type="button" class="eg-next" data-action="next" aria-label="Next image">${icons.next}</button></div><footer class="eg-viewer-caption"></footer><div class="eg-thumbnails" aria-label="Choose image"></div></div></dialog></section>`;
}
/** Stable source order, assigned to the currently shortest column. */
export function masonry(ratios: number[], width: number, columns: number, gap: number, caption = 0) {
    const colWidth = Math.max(0, (width - gap * (columns - 1)) / columns), heights = Array(columns).fill(0) as number[];
    const cells = ratios.map(ratio => { const col = heights.indexOf(Math.min(...heights)); const height = colWidth / ratio + caption; const cell = { x: col * (colWidth + gap), y: heights[col]!, width: colWidth, height }; heights[col]! += height + gap; return cell; });
    return { cells, height: Math.max(0, ...heights) - (ratios.length ? gap : 0) };
}
// A document-level protocol keeps independently installed galleries from
// restoring page scrolling while another gallery's viewer is still open.
const scrollLockKey = Symbol.for('arclen-ui.gallery.scroll-lock.v1');
type GalleryDocument = Document & { [scrollLockKey]?: { count: number; overflow: string } };
function lock(doc: Document) {
    const owner = doc as GalleryDocument;
    const entry = owner[scrollLockKey];
    if (entry) { entry.count++; return; }
    owner[scrollLockKey] = { count: 1, overflow: doc.documentElement.style.overflow };
    doc.documentElement.style.overflow = 'hidden';
}
function unlock(doc: Document) {
    const owner = doc as GalleryDocument;
    const entry = owner[scrollLockKey];
    if (!entry) return;
    if (--entry.count === 0) {
        doc.documentElement.style.overflow = entry.overflow;
        delete owner[scrollLockKey];
    }
}
export function mount(host: HTMLElement, input: unknown = {}) {
    let settings = resolveSettings(input), destroyed = false, paused = false, offscreen = false;
    let root: HTMLElement, grid: HTMLElement, dialog: HTMLDialogElement, viewerImage: HTMLImageElement, items: Item[], visible: Item[], category: string, viewerIndex = 0, zoomed = false, opener: HTMLElement | null = null, locked = false;
    let viewerToken = 0, outgoingLayer: HTMLImageElement | null = null, pendingCleanup: (() => void) | null = null;
    const doc = host.ownerDocument, win = doc.defaultView!;
    const initialFocus = doc.activeElement as HTMLElement | null;
    let resize: ResizeObserver | undefined, intersection: IntersectionObserver | undefined, lastWidth = -1;
    const listeners: Array<() => void> = [];
    const on = (target: EventTarget, type: string, handler: EventListener, options?: AddEventListenerOptions) => { target.addEventListener(type, handler, options); listeners.push(() => target.removeEventListener(type, handler, options)); };
    const q = <T extends Element = HTMLElement>(selector: string) => (selector === '.eg-full' ? viewerImage : root.querySelector(selector)) as T;
    const preference = win.matchMedia?.('(prefers-reduced-motion: reduce)');
    const animations = new Set<Animation>(), tileAnimations = new Map<HTMLElement, Animation>();
    const canAnimate = () => settings.motion && !paused && !offscreen && !preference?.matches && typeof root.animate === 'function';
    function stopAnimations() {
        for (const animation of animations)
            animation.cancel();
        animations.clear();
        tileAnimations.clear();
        root.querySelectorAll<HTMLElement>('.eg-tile').forEach(tile => { tile.hidden = tile.dataset.excluded === 'true'; });
        resetViewerPresentation(true);
    }
    function cancelViewerEffect(element: HTMLElement | null) { element?.getAnimations?.().forEach(animation => { animation.cancel(); animations.delete(animation); }); }
    function clearOutgoingLayer() { cancelViewerEffect(outgoingLayer); outgoingLayer?.remove(); outgoingLayer = null; }
    function resetViewerPresentation(settle = false) {
        viewerToken++;
        pendingCleanup?.();
        pendingCleanup = null;
        const image = q<HTMLImageElement>('.eg-full');
        cancelViewerEffect(image);
        cancelViewerEffect(dialog);
        clearOutgoingLayer();
        if (settle && q<HTMLElement>('.eg-viewer-error').hidden)
            image.hidden = false;
    }
    function effect(element: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions, done?: () => void) {
        const animation = element.animate(frames, options);
        animations.add(animation);
        animation.onfinish = () => { animations.delete(animation); done?.(); };
        animation.oncancel = () => { animations.delete(animation); };
        return animation;
    }
    function syncMotion() {
        root.dataset.paused = String(paused || offscreen);
        if (!canAnimate())
            stopAnimations();
    }
    function placeIndicator() { const active = q<HTMLElement>('[data-category][aria-pressed="true"]'), indicator = q('.eg-indicator'); indicator.style.width = `${active.offsetWidth}px`; indicator.style.height = `${active.offsetHeight}px`; indicator.style.transform = `translate(${active.offsetLeft}px,${active.offsetTop}px)`; }
    function layout(animate = false, arrival = false) {
        if (destroyed)
            return;
        const width = grid.clientWidth;
        if (!animate && width === lastWidth && grid.classList.contains('eg-ready')) {
            placeIndicator();
            return;
        }
        lastWidth = width;
        const tiles = [...root.querySelectorAll<HTMLElement>('.eg-tile')];
        const before = new Map(tiles.map(tile => [tile, { transform: (c => c !== 'none' ? c : (tile.style.transform || 'none'))(win.getComputedStyle(tile).transform), opacity: tile.hidden ? '0' : win.getComputedStyle(tile).opacity, hidden: tile.hidden }]));
        for (const animation of tileAnimations.values()) {
            animation.cancel();
            animations.delete(animation);
        }
        tileAnimations.clear();
        const max = settings.columns;
        const columns = width <= 640 ? 2 : width <= 1024 ? Math.min(3, max) : max;
        const gap = settings.gap;
        const fitted = visible.map(item => item.ratio * .9);
        const result = masonry(fitted, width, columns, gap, 0);
        if (width) {
            grid.classList.add('eg-ready');
            grid.style.height = `${result.height}px`;
        }
        visible.forEach((item, i) => {
            const tile = q<HTMLElement>(`[data-index="${item.index}"]`), cell = result.cells[i]!;
            if (width) {
                tile.style.width = `${cell.width}px`;
                tile.style.height = `${cell.height}px`;
                tile.style.transform = `translate(${cell.x}px,${cell.y}px)`;
                if (item.responsive) {
                    const image = tile.querySelector<HTMLImageElement>('.eg-image img')!, sizes = `${Math.ceil(cell.width)}px`;
                    if (image.sizes !== sizes) image.sizes = sizes;
                }
            }
        });
        tiles.forEach(tile => {
            const included = visible.some(x => x.index === Number(tile.dataset.index)), old = before.get(tile)!;
            tile.dataset.excluded = String(!included);
            tile.inert = !included;
            tile.tabIndex = included ? 0 : -1;
            tile.setAttribute('aria-hidden', String(!included));
            if (!(animate && width > 0 && canAnimate())) {
                tile.hidden = !included;
                return;
            }
            if (!included && old.hidden) {
                tile.hidden = true;
                return;
            }
            tile.hidden = false;
            const target = tile.style.transform;
            const entering = arrival || old.hidden;
            const start = arrival ? `${target} translateY(8px)` : entering ? (`${target} translateY(16px)`) : (old.transform === 'none' ? target : old.transform);
            const order = visible.findIndex(x => x.index === Number(tile.dataset.index));
            const delay = included && entering ? Math.min(Math.max(order, 0) * 40, 120) : 0;
            const duration = arrival ? 250 : included ? 400 : 250;
            const animation = effect(tile, [{ transform: start, opacity: entering ? 0 : Number(old.opacity || 1) }, { transform: included ? target : start, opacity: included ? 1 : 0 }], { duration, delay, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }, () => {
                if (tileAnimations.get(tile) !== animation)
                    return;
                tileAnimations.delete(tile);
                tile.hidden = tile.dataset.excluded === 'true';
            });
            tileAnimations.set(tile, animation);
        });
        const active = q<HTMLElement>('[data-category][aria-pressed="true"]'), indicator = q('.eg-indicator');
        indicator.style.width = `${active.offsetWidth}px`;
        indicator.style.height = `${active.offsetHeight}px`;
        indicator.style.transform = `translate(${active.offsetLeft}px,${active.offsetTop}px)`;
    }
    function filter(next: string, announce = true) {
        category = next;
        visible = items.filter(x => includes(x, category));
        root.querySelectorAll<HTMLElement>('[data-category]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
        if (announce)
            q('.eg-status').textContent = `${visible.length} ${visible.length === 1 ? 'image' : 'images'} · ${category}`;
        layout(announce || !grid.classList.contains('eg-ready'), !announce);
        const active = q<HTMLElement>('[data-category][aria-pressed="true"]'), rail = q('.eg-filters');
        if (active.offsetLeft < rail.scrollLeft)
            rail.scrollLeft = active.offsetLeft;
        else if (active.offsetLeft + active.offsetWidth > rail.scrollLeft + rail.clientWidth)
            rail.scrollLeft = active.offsetLeft + active.offsetWidth - rail.clientWidth;
    }
    function close(restore = true) {
        resetViewerPresentation();
        if (dialog.open)
            dialog.close();
        if (locked) {
            unlock(doc);
            locked = false;
        }
        zoomed = false;
        if (restore && opener?.isConnected && !opener.hidden)
            opener.focus({ preventScroll: true });
        else if (restore)
            root.querySelector<HTMLElement>('.eg-tile:not([hidden]),[data-category]')?.focus({ preventScroll: true });
    }
    function showImage(preserveZoom = false, travel = 0) {
        const item = visible[viewerIndex];
        if (!item)
            return;
        const thumbnailHadFocus = doc.activeElement?.hasAttribute('data-thumb');
        if (!preserveZoom)
            zoomed = false;
        q('.eg-canvas').classList.toggle('eg-zoomed', zoomed);
        q('[data-action="zoom"]').setAttribute('aria-pressed', String(zoomed));
        const image = q<HTMLImageElement>('.eg-full');
        if (!image.isConnected) q('.eg-canvas').prepend(image);
        q('.eg-position').textContent = `${String(viewerIndex + 1).padStart(2, '0')} / ${String(visible.length).padStart(2, '0')}`;
        q('.eg-viewer-caption').innerHTML = `<strong>${escape(item.caption)}</strong><span>${escape(item.category)}</span>`;
        q('.eg-thumbnails').innerHTML = settings.thumbnails ? visible.map((x, i) => `<button type="button" data-thumb="${i}" aria-label="Show ${escape(x.caption)}" aria-pressed="${i === viewerIndex}"><img src="${escape(x.responsive?.sources[0].src ?? x.src)}"${x.responsive ? ` width="${x.responsive.sources[0].width}" height="${x.responsive.sources[0].height}"` : x.width && x.height ? ` width="${x.width}" height="${x.height}"` : ''} alt=""/></button>`).join('') : '';
        q('.eg-thumbnails').hidden = !settings.thumbnails;
        q('.eg-canvas').scrollTo?.(0, 0);
        if (thumbnailHadFocus)
            q<HTMLElement>(`[data-thumb="${viewerIndex}"]`)?.focus();
        crossfadeImage(item, travel);
        return;
    }
    function crossfadeImage(item: Item, travel: number) {
        const image = q<HTMLImageElement>('.eg-full'), canvas = q('.eg-canvas');
        const token = ++viewerToken;
        pendingCleanup?.();
        pendingCleanup = null;
        const reduced = !canAnimate();
        const opacityOf = (element: HTMLElement) => { const opacity = Number.parseFloat(win.getComputedStyle(element).opacity); return Number.isFinite(opacity) ? opacity : 1; };
        const ready = !image.hidden && image.complete && image.naturalWidth > 0;
        const retain = dialog.open && !reduced && outgoingLayer && (!ready || opacityOf(image) < .5);
        let outgoing: HTMLImageElement | null = retain ? outgoingLayer : null;
        if (outgoing) {
            const opacity = opacityOf(outgoing);
            cancelViewerEffect(outgoing);
            outgoing.style.opacity = String(opacity);
        }
        else {
            clearOutgoingLayer();
            if (dialog.open && ready && !reduced) {
                if (!canvas.style.position)
                    canvas.style.position = 'relative';
                const box = image.getBoundingClientRect(), bounds = canvas.getBoundingClientRect();
                outgoing = image.cloneNode(false) as HTMLImageElement;
                outgoing.className = 'eg-outgoing-frame';
                outgoing.alt = '';
                outgoing.hidden = false;
                outgoing.removeAttribute('id');
                outgoing.removeAttribute('srcset');
                outgoing.removeAttribute('sizes');
                outgoing.removeAttribute('loading');
                outgoing.src = image.currentSrc || image.src;
                outgoing.setAttribute('aria-hidden', 'true');
                Object.assign(outgoing.style, { position: 'absolute', left: `${box.width ? box.left - bounds.left + canvas.scrollLeft : 0}px`, top: `${box.height ? box.top - bounds.top + canvas.scrollTop : 0}px`, width: box.width ? `${box.width}px` : '100%', height: box.height ? `${box.height}px` : '100%', objectFit: 'contain', pointerEvents: 'none', opacity: String(opacityOf(image)), transform: 'none' });
                image.insertAdjacentElement('afterend', outgoing);
                outgoingLayer = outgoing;
            }
        }
        cancelViewerEffect(image);
        q<HTMLElement>('.eg-viewer-error').hidden = true;
        image.alt = item.alt;
        if (item.width && item.height) {
            image.width = item.width;
            image.height = item.height;
        }
        else {
            image.removeAttribute('width');
            image.removeAttribute('height');
        }
        image.hidden = !reduced;
        let decodeAttempt = 0, retryTimer: number | undefined;
        const requestKey = () => `${image.currentSrc}\n${image.getAttribute('src')}\n${image.srcset}\n${image.sizes}`;
        function cleanup() {
            decodeAttempt++;
            if (retryTimer !== undefined) win.clearTimeout(retryTimer);
            retryTimer = undefined;
            image.removeEventListener('load', onLoad);
            image.removeEventListener('error', onFail);
            if (pendingCleanup === cleanup)
                pendingCleanup = null;
        }
        function finish() {
            if (token !== viewerToken)
                return;
            cleanup();
            image.hidden = false;
            if (reduced || !canAnimate()) {
                if (outgoingLayer === outgoing)
                    clearOutgoingLayer();
                return;
            }
            const dx = travel > 0 ? 8 : travel < 0 ? -8 : 0;
            effect(image, [{ opacity: 0, transform: `translateX(${dx}px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 250, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
            if (outgoing)
                effect(outgoing, [{ opacity: opacityOf(outgoing) }, { opacity: 0 }], { duration: 250, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }, () => {
                    if (outgoingLayer === outgoing)
                        clearOutgoingLayer();
                });
        }
        function retryDecode() {
            if (retryTimer !== undefined) win.clearTimeout(retryTimer);
            // Responsive selection may cancel decode() when the modal canvas
            // or viewport changes. Let the browser select its current candidate.
            retryTimer = win.setTimeout(() => {
                retryTimer = undefined;
                if (token === viewerToken && image.complete && image.naturalWidth)
                    decodeReady(true);
            }, 0);
        }
        function decodeReady(retried = false) {
            if (token !== viewerToken || !image.complete || !image.naturalWidth)
                return;
            const attempt = ++decodeAttempt, request = requestKey();
            const current = () => token === viewerToken && attempt === decodeAttempt;
            const decoded = () => {
                if (!current()) return;
                if (request !== requestKey()) { retryDecode(); return; }
                if (image.complete && image.naturalWidth) finish();
            };
            const rejected = () => {
                if (!current()) return;
                // Keep load/error listeners while a replacement candidate loads.
                if (!image.complete) return;
                if (!image.naturalWidth) { onFail(); return; }
                if (!retried || request !== requestKey()) retryDecode();
                else onFail();
            };
            if (image.decode) image.decode().then(decoded, rejected);
            else decoded();
        }
        function onLoad() {
            if (retryTimer !== undefined) win.clearTimeout(retryTimer);
            retryTimer = undefined;
            decodeReady();
        }
        function onFail() {
            if (token !== viewerToken)
                return;
            cleanup();
            image.hidden = true;
            q<HTMLElement>('.eg-viewer-error').hidden = false;
            if (outgoingLayer === outgoing)
                clearOutgoingLayer();
        }
        if (!reduced) {
            image.addEventListener('load', onLoad);
            image.addEventListener('error', onFail);
            pendingCleanup = cleanup;
        }
        if (item.responsive) {
            const sizes = viewerSize(item), srcset = sourceSet(item.responsive, 2, 5), src = item.responsive.sources[2].src;
            if (image.sizes !== sizes) image.sizes = sizes;
            if (image.srcset !== srcset) image.srcset = srcset;
            if (image.getAttribute('src') !== src) image.src = src;
        }
        else {
            image.removeAttribute('srcset');
            image.removeAttribute('sizes');
            if (image.getAttribute('src') !== item.src) image.src = item.src;
        }
        if (reduced) {
            image.hidden = false;
            return;
        }
        if (image.complete && image.naturalWidth)
            onLoad();
    }
    function navigate(delta: number) { viewerIndex = (viewerIndex + delta + visible.length) % visible.length; showImage(false, delta); }
    function open(index: number, tile: HTMLElement) {
        viewerIndex = visible.findIndex(x => x.index === index);
        if (viewerIndex < 0)
            return;
        opener = tile;
        showImage();
        dialog.showModal();
        updateViewerSize();
        if (canAnimate())
            effect(dialog, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
        if (!locked) {
            lock(doc);
            locked = true;
        }
        q<HTMLElement>('[data-action="close"]').focus();
    }
    function viewerSize(item: Item) {
        const canvas = q('.eg-canvas'), image = q<HTMLImageElement>('.eg-full');
        const box = canvas.getBoundingClientRect();
        const availableWidth = box.width > 0 ? box.width : win.innerWidth <= 650 ? win.innerWidth - 24 : Math.min(1280, win.innerWidth * .94) - 270;
        const availableHeight = box.height > 0 ? box.height : win.innerHeight * .94 - 220;
        const width = Math.min(availableWidth, availableHeight * ((item.width ?? (image.naturalWidth || 1)) / (item.height ?? (image.naturalHeight || 1))));
        return `${Math.ceil(Math.max(1, width) * (zoomed ? settings.zoom : 1))}px`;
    }
    function updateViewerSize() {
        if (!dialog.open)
            return;
        const item = visible[viewerIndex];
        if (item?.responsive) {
            const image = q<HTMLImageElement>('.eg-full'), sizes = viewerSize(item);
            // Assigning even an unchanged responsive size can enqueue another load.
            if (image.sizes !== sizes) image.sizes = sizes;
        }
    }
    function toggleZoom() { zoomed = !zoomed; q('.eg-canvas').classList.toggle('eg-zoomed', zoomed); q('[data-action="zoom"]').setAttribute('aria-pressed', String(zoomed)); updateViewerSize(); }
    function setup() {
        lastWidth = -1;
        host.innerHTML = render(settings);
        root = host.firstElementChild as HTMLElement;
        // The viewer has no image resource until it is opened. Keep its image
        // detached so SSR and closed galleries contain only actual photographs.
        viewerImage = doc.createElement('img');
        viewerImage.className = 'eg-full';
        viewerImage.alt = '';
        grid = q('.eg-grid');
        dialog = q<HTMLDialogElement>('dialog');
        items = itemsFor(settings);
        category = selected(settings, items);
        visible = [];
        syncMotion();
        filter(category, false);
        on(root, 'click', event => {
            const target = (event.target as Element).closest<HTMLElement>('button,a');
            if (!target)
                return;
            if (target.hasAttribute('data-category')) {
                const next = target.dataset.category!;
                filter(next === category && next !== 'All' ? 'All' : next);
                return;
            }
            if (target.hasAttribute('data-index') && settings.viewer) {
                event.preventDefault();
                open(Number(target.dataset.index), target);
                return;
            }
            if (target.hasAttribute('data-thumb')) {
                const nextIndex = Number(target.dataset.thumb);
                const travel = nextIndex > viewerIndex ? 1 : nextIndex < viewerIndex ? -1 : 0;
                const skip = nextIndex === viewerIndex;
                viewerIndex = nextIndex;
                if (!skip)
                    showImage(false, travel);
                else {
                    zoomed = false;
                    q('.eg-canvas').classList.remove('eg-zoomed');
                    q('[data-action="zoom"]').setAttribute('aria-pressed', 'false');
                    q('.eg-canvas').scrollTo?.(0, 0);
                    updateViewerSize();
                }
                q<HTMLElement>(`[data-thumb="${viewerIndex}"]`).focus();
                return;
            }
            switch (target.dataset.action) {
                case 'close':
                    close();
                    break;
                case 'previous':
                    navigate(-1);
                    break;
                case 'next':
                    navigate(1);
                    break;
                case 'zoom':
                    toggleZoom();
                    break;
            }
        });
        on(root, 'keydown', event => {
            const e = event as KeyboardEvent;
            const tile = (e.target as Element).closest<HTMLElement>('.eg-tile');
            if (e.key === ' ' && tile && settings.viewer && !tile.inert) {
                e.preventDefault();
                open(Number(tile.dataset.index), tile);
            }
        });
        on(q('.eg-full'), 'load', () => { updateViewerSize(); });
        on(win, 'resize', () => { updateViewerSize(); });
        on(q('.eg-full'), 'click', () => {
            if (!swiped)
                toggleZoom();
            swiped = false;
        });
        on(dialog, 'cancel', event => { event.preventDefault(); close(); });
        on(dialog, 'close', () => {
            // A close event is queued by the browser and may belong to an older session.
            if (dialog.open) return;
            resetViewerPresentation();
            if (locked) {
                unlock(doc);
                locked = false;
            }
        });
        on(dialog, 'click', event => {
            if (event.target === dialog || event.target === q('.eg-viewer'))
                close();
        });
        on(dialog, 'keydown', event => {
            const e = event as KeyboardEvent;
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                navigate(1);
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                navigate(-1);
            }
            if (e.key === 'Home' || e.key === 'End') {
                e.preventDefault();
                const oldIndex = viewerIndex;
                viewerIndex = e.key === 'Home' ? 0 : visible.length - 1;
                const travel = viewerIndex > oldIndex ? 1 : viewerIndex < oldIndex ? -1 : 0;
                if (viewerIndex !== oldIndex)
                    showImage(true, travel);
            }
            if (e.key === 'Tab') {
                const controls = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled])')].filter(x => !x.hidden && x.getClientRects().length > 0);
                const first = controls[0], last = controls.at(-1);
                if (e.shiftKey && doc.activeElement === first) {
                    e.preventDefault();
                    last?.focus();
                }
                else if (!e.shiftKey && doc.activeElement === last) {
                    e.preventDefault();
                    first?.focus();
                }
            }
        });
        let touch: {
            x: number;
            y: number;
        } | null = null, swiped = false;
        on(q('.eg-canvas'), 'touchstart', event => { const e = event as TouchEvent; const point = e.touches[0]; swiped = false; touch = e.touches.length === 1 && point ? { x: point.clientX, y: point.clientY } : null; }, { passive: true });
        on(q('.eg-canvas'), 'touchend', event => {
            const point = (event as TouchEvent).changedTouches[0];
            if (touch && point && !zoomed) {
                const dx = point.clientX - touch.x, dy = point.clientY - touch.y;
                if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
                    swiped = true;
                    navigate(dx < 0 ? 1 : -1);
                }
            }
            touch = null;
        }, { passive: true });
        on(q('.eg-canvas'), 'touchcancel', () => { touch = null; }, { passive: true });
        on(root, 'error', event => {
            const img = event.target as HTMLImageElement;
            if (img.matches('.eg-full') && img === q<HTMLImageElement>('.eg-full')) {
                resetViewerPresentation();
                img.hidden = true;
                q<HTMLElement>('.eg-viewer-error').hidden = false;
            }
            else if (img.closest('.eg-tile'))
                img.closest('.eg-image')?.classList.add('eg-failed');
        }, { capture: true });
        if (typeof win.ResizeObserver === 'function') {
            resize = new win.ResizeObserver(() => layout());
            resize.observe(root);
        }
        else
            on(win, 'resize', () => layout());
        if (typeof win.IntersectionObserver === 'function') {
            intersection = new win.IntersectionObserver(entries => { offscreen = !entries[0]?.isIntersecting; syncMotion(); });
            intersection.observe(root);
        }
        if (preference)
            on(preference, 'change', () => syncMotion());
        doc.fonts?.ready.then(() => {
            if (!destroyed)
                layout();
        });
    }
    function teardown() { stopAnimations(); close(false); resize?.disconnect(); intersection?.disconnect(); listeners.splice(0).forEach(fn => fn()); }
    setup();
    return {
        update(next: unknown) {
            if (destroyed)
                return;
            const resolved = resolveSettings(next);
            const hadFocus = root.contains(doc.activeElement);
            teardown();
            settings = resolved;
            setup();
            if (hadFocus)
                q<HTMLElement>('[data-category][aria-pressed="true"]').focus({ preventScroll: true });
        },
        pause() {
            if (destroyed)
                return;
            paused = true;
            syncMotion();
        }, resume() {
            if (destroyed)
                return;
            paused = false;
            syncMotion();
        },
        destroy() {
            if (destroyed)
                return;
            const returnTo = opener;
            const wasOpen = dialog.open;
            teardown();
            destroyed = true;
            host.replaceChildren();
            if (wasOpen) {
                if (returnTo?.isConnected)
                    returnTo.focus();
                else if (initialFocus?.isConnected)
                    initialFocus.focus();
            }
        }
    };
}
