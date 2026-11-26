import manifest from '../../component.json';
export interface Settings {
  headline: string[]; intro: string; brand: string; tagline: string[]; address: string[]; hours: string; copyright: string;
  captions: string[]; photo1: string; photo2: string; photo3: string; photo4: string; photo5: string;
  bookingLabel: string; bookingUrl: string; homeUrl: string; navLabels: string[]; walkLabels: string[]; walkUrls: string[]; walkerLabels: string[]; walkerUrls: string[]; contactLabels: string[]; contactUrls: string[]; navUrls: string[]; legalUrls: string[];
  contentWidth: number; gutter: number; topSpace: number; linkWidth: number; headlineSize: number; brandSize: number; markSize: number; buttonRadius: number; printScale: number; printTilt: number; lift: number; duration: number;
  ink: string; muted: string; paper: string; notePaper: string; noteInk: string; buttonInk: string; typeface: string; phonePhotos: string; stickerText: string;
  showMark: boolean; showSticker: boolean; showCaptions: boolean;
  background: string; accent: string; entrance: boolean;
}
const images = [
  new URL('../../assets/walk-1.webp', import.meta.url).href,
  new URL('../../assets/walk-2.webp', import.meta.url).href,
  new URL('../../assets/walk-3.webp', import.meta.url).href,
  new URL('../../assets/walk-4.webp', import.meta.url).href,
  new URL('../../assets/walk-5.webp', import.meta.url).href,
];
export const defaults = Object.fromEntries(manifest.settings.map(setting => [setting.key, setting.default])) as unknown as Settings;
const entities: Record<string,string> = {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'};
const esc = (value: string) => value.replace(/[&<>"']/g, char => entities[char]);

function safeLink(value: string) {
  if (!value || /[\s<>"'\\]/.test(value) || /[\x00-\x1f\x7f]/.test(value) || value.startsWith('//')) return false;
  if (/^mailto:[^@?]+@[a-z0-9.-]+$/i.test(value)) return true;
  if (/^[#/?]|^\.\.?\//.test(value)) return true;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
}
function safeImage(value: string) {
  return value === '' || /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i.test(value)
    || (/^blob:https?:\/\//.test(value) && safeLink(value.slice(5)))
    || (safeLink(value) && /^(?:https:\/\/|\/[^/]|\.\/)/.test(value));
}
export function resolveSettings(input: unknown = {}): Settings {
  const values = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string,unknown> : {};
  const resolved: Record<string,unknown> = {};
  for (const field of manifest.settings) {
    const value = values[field.key];
    let clean: unknown = field.default;
    if (field.kind === 'string-list' && Array.isArray(value) && value.length >= field.minItems! && value.length <= field.maxItems!
        && value.every(item => typeof item === 'string' && item.length <= field.maxItemLength!
          && (!field.key.endsWith('Urls') || safeLink(item)))) clean = value;
    if (field.kind === 'text' && typeof value === 'string' && value.length <= field.maxLength! && (!field.key.endsWith('Url') || safeLink(value))) clean = value;
    if (field.kind === 'image' && typeof value === 'string' && safeImage(value)) clean = value;
    if (field.kind === 'number' && typeof value === 'number' && Number.isFinite(value)) {
      const min=field.min!, step=field.step!;
      clean=Math.min(field.max!,Math.max(min,min+Math.round((value-min)/step)*step));
    }
    if (field.kind === 'select' && typeof value === 'string' && field.options?.includes(value)) clean=value;
    if (field.kind === 'boolean' && typeof value === 'boolean') clean = value;
    if (field.kind === 'color' && typeof value === 'string' && /^#[a-f\d]{6}$/i.test(value)) clean = value;
    resolved[field.key] = Array.isArray(clean) ? [...clean] : clean;
  }
  return resolved as unknown as Settings;
}
function piles(s: Settings) {
  const photos = [s.photo1,s.photo2,s.photo3,s.photo4,s.photo5];
  function print(i: number) {
    return `<div class="sf-slot sf-slot-${i+1}" data-sf-entrance><button class="sf-print" type="button" aria-label="${esc(s.captions[i])}" aria-pressed="false"><img alt="" src="${esc(photos[i] || images[i])}" width="192" height="256">${s.showCaptions?`<span class="sf-caption">${esc(s.captions[i])}</span>`:''}</button></div>`;
  }
  const note = `<div class="sf-slot sf-slot-note" data-sf-entrance><button class="sf-note" type="button" aria-label="Walking hours and contact card" aria-pressed="false"><span class="sf-perforations"></span><span class="sf-address">${s.address.map(esc).join('<br>')}</span><span class="sf-hours">${esc(s.hours)}</span>${s.showSticker?`<span class="sf-sticker">${esc(s.stickerText)}</span>`:''}</button></div>`;
  return [print(0),print(1),note,print(3),print(2),print(4)].join('');
}
export function render(input: unknown = defaults) {
  const s = resolveSettings(input);
  let index = 0;
  const heading = s.headline.map(line => line.trim().split(/\s+/).map(word => `<span style="--sf-word:${index++}">${esc(word)}</span>`).join(' ')).join('<br>');
  const mark = '<svg aria-hidden="true" width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 28c5 0 10-5 15-11 4-5 7-11 3-13-5-3-13 8-12 15 1 8 10 10 15 4l4-5"/><path d="m28 16 4 3"/></svg>';
  const nav = (['walk','walker','contact'] as const).map((group,i)=>{
    if(!s[`${group}Labels`].length)return '';
    const items = s[`${group}Labels`].map((label,n)=>
      `<li><a href="${esc(s[`${group}Urls`][n]||s.navUrls[i])}">${esc(label)}</a></li>`).join('');
    return `<section><h3><a href="${esc(s.navUrls[i])}">${esc(s.navLabels[i])}</a></h3><ul>${items}</ul></section>`;
  }).join('');
  const legal = ['Privacy','Terms','Cookies'].map((label,i)=>`<a href="${esc(s.legalUrls[i])}">${label}</a>`).join('');
  const tokens = [
    `--sf-bg:${s.background}`, `--sf-accent:${s.accent}`,
    `--sf-width:${s.contentWidth}px`, `--sf-gutter:${s.gutter}px`, `--sf-space:${s.topSpace}px`, `--sf-column:${s.linkWidth}px`,
    `--sf-heading:${s.headlineSize}px`, `--sf-brand:${s.brandSize}px`, `--sf-mark:${s.markSize}px`, `--sf-radius:${s.buttonRadius}px`,
    `--sf-scale:${s.printScale/100}`, `--sf-tilt:${s.printTilt/100}`, `--sf-lift:${s.lift/100}`, `--sf-duration:${s.duration}ms`,
    `--sf-ink:${s.ink}`, `--sf-muted:${s.muted}`, `--sf-paper-color:${s.paper}`, `--sf-note-paper:${s.notePaper}`,
    `--sf-note-ink:${s.noteInk}`, `--sf-button-ink:${s.buttonInk}`
  ].join(';');
  return `<footer class="sf-footer" data-typeface="${s.typeface}" data-phone-photos="${s.phonePhotos}" style="${tokens}"><div class="sf-top"><div class="sf-top-inner"><div class="sf-intro"><h2 data-sf-entrance>${heading}</h2><div class="sf-invitation"><p data-sf-entrance>${esc(s.intro)}</p><a class="sf-book" href="${esc(s.bookingUrl)}">${esc(s.bookingLabel)}</a></div></div><div class="sf-pile">${piles(s)}</div></div></div><div class="sf-bottom"><div class="sf-directory"><div class="sf-brand"><a class="sf-logo" href="${esc(s.homeUrl)}">${s.showMark?mark:''}${esc(s.brand)}</a><p>${s.tagline.map(line=>`<span>${esc(line)}</span>`).join('')}</p></div><nav class="sf-walk-links" aria-label="Footer">${nav}</nav></div><div class="sf-legal"><span>${esc(s.copyright)}</span><nav aria-label="Legal">${legal}</nav></div></div></footer>`;

}

export function mount(host: HTMLElement, input: unknown = defaults) {
  const view = host.ownerDocument.defaultView!;
  const motion = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  let settings = resolveSettings(input), disposed = false, paused = false, offscreen = false;
  let root: HTMLElement;
  let observers: IntersectionObserver[] = [];
  function quiet() { return paused || offscreen || host.ownerDocument.hidden || !!motion?.matches; }
  function setMotion() {
    root.dataset.quiet = String(quiet());
    root.dataset.static = String(paused || !!motion?.matches);
    if (paused || motion?.matches) root.querySelectorAll<HTMLElement>('[data-sf-entrance]').forEach(node => { node.dataset.revealed = 'true'; });
  }
  function initialize(animate: boolean) {
    observers.forEach(observer => observer.disconnect()); observers = [];
    host.innerHTML = render(settings);
    root = host.querySelector('.sf-footer')!;
    setMotion();
    if (!view.IntersectionObserver) return;
    const visible = new view.IntersectionObserver(entries => {
      offscreen = !entries[0].isIntersecting; setMotion();
    }); visible.observe(root); observers.push(visible);
    if (!animate || !settings.entrance || quiet()) return;
    root.dataset.entrance = 'true';
    for (const [selector,threshold] of [['h2',0.6],['.sf-intro p',0.5],['.sf-slot',0]] as const) {
      const observer = new view.IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          (entry.target as HTMLElement).dataset.revealed = 'true'; observer.unobserve(entry.target);
        }
      }, {threshold});
      root.querySelectorAll(selector).forEach(node => observer.observe(node)); observers.push(observer);
    }
  }
  function release() {
    root.querySelectorAll('[data-pressed]').forEach(node => node.removeAttribute('data-pressed'));
  }
  function press(event: PointerEvent) {
    const button = (event.target as Element).closest<HTMLElement>('.sf-slot button');
    if (!button || !root.contains(button)) return;
    release(); button.dataset.pressed = 'true';
  }
  function key(event: KeyboardEvent) {
    const button = (event.target as Element).closest<HTMLButtonElement>('.sf-slot button');
    if (!button || !root.contains(button)) return;
    if (event.key === 'Escape') { button.setAttribute('aria-pressed','false'); }
  }
  function click(event: MouseEvent) {
    const button = (event.target as Element).closest<HTMLButtonElement>('.sf-slot button');
    if (button && root.contains(button) && event.detail === 0) button.setAttribute('aria-pressed',String(button.getAttribute('aria-pressed') !== 'true'));
  }
  function blur(event: FocusEvent) { (event.target as HTMLElement).closest('.sf-slot button')?.setAttribute('aria-pressed','false'); }
  initialize(true);
  host.addEventListener('pointerdown',press); view.addEventListener('pointerup',release); view.addEventListener('pointercancel',release); view.addEventListener('blur',release);
  host.addEventListener('click',click); host.addEventListener('keydown',key); host.addEventListener('focusout',blur);
  motion?.addEventListener?.('change',setMotion); host.ownerDocument.addEventListener('visibilitychange',setMotion);
  return {
    update(next: unknown) { if (disposed) return; const normalized = resolveSettings(next); if (JSON.stringify(settings) !== JSON.stringify(normalized)) { settings = normalized; initialize(false); } },
    pause() { if (!disposed) { paused = true; setMotion(); } },
    resume() { if (!disposed) { paused = false; setMotion(); } },
    destroy() {
      if (disposed) return;
      disposed = true; observers.forEach(observer => observer.disconnect());
      host.removeEventListener('pointerdown',press); view.removeEventListener('pointerup',release); view.removeEventListener('pointercancel',release); view.removeEventListener('blur',release);
      host.removeEventListener('click',click); host.removeEventListener('keydown',key); host.removeEventListener('focusout',blur);
      motion?.removeEventListener?.('change',setMotion); host.ownerDocument.removeEventListener('visibilitychange',setMotion);
      release(); delete root.dataset.entrance; root.dataset.quiet = 'true';
    }
  };
}
