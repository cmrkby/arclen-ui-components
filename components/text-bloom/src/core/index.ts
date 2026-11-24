import sequences from './sequences.json';
import manifest from '../../component.json';
import {photos} from './photos';

type Settings = Record<string, string | number>;
export const defaults: Settings = Object.fromEntries(manifest.settings.map(rule => [rule.key, rule.default]));

export function resolveSettings(input: unknown = {}): Settings {
  const result = {...defaults};
  if (!input || typeof input !== 'object') return result;
  const values = input as Record<string, unknown>;
  for (const rule of manifest.settings) {
    const value = values[rule.key];
    if (rule.kind === 'number' && typeof value === 'number' && Number.isFinite(value)) {
      result[rule.key] = Math.min(rule.max!, Math.max(rule.min!, value));
    } else if (typeof value === 'string') {
      if (rule.kind === 'color' && /^#[\da-f]{6}$/i.test(value)) result[rule.key] = value;
      if (rule.key === 'copy') result.copy = value.slice(0, 2000);
      if (rule.key.startsWith('url') && /^(?:https?:\/\/|\/[^/\\]|#)/i.test(value.trim())) {
        result[rule.key] = value.trim();
      }
    }
  }
  return result;
}

const escape = (s: string) => s.replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]!));

function sequence(s: Settings, index: number) {
  const slides = photos[index].map((url, i) =>
    `<img src="${escape(url)}" alt="" decoding="async" loading="${i ? 'lazy' : 'eager'}" data-current="${i === 0}" draggable="false">`
  ).join('');
  return `<a class="tb-slot" data-index="${index}" href="${escape(String(s['url'+(index+1)]))}" target="_blank" rel="noopener noreferrer" aria-label="Follow the ${sequences[index].label} sequence link (opens in a new tab)"><span class="tb-window">${slides}</span></a>`;
}

function paragraph(s: Settings) {
  const tokens = String(s.copy).match(/\s+|\S+/g) || [];
  const words = tokens.filter(t => /\S/.test(t));
  const normalized = words.map(word => word.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, ''));
  const fallback = [.1, .4, .55, .88];
  const positions = sequences.map(({anchor}, index) => {
    const match = normalized.indexOf(anchor);
    return match >= 0 ? match : Math.min(words.length - 1, Math.floor(fallback[index] * words.length));
  });
  let word = 0;
  return tokens.map(token => {
    if (!/\S/.test(token)) return token;
    const after = positions.map((at, i) => at === word ? sequence(s, i) : '').join('');
    word++;
    if (!after) return escape(token);
    const suffix = token.match(/[.,!?;:]+$/)?.[0] ?? '';
    return escape(token.slice(0, token.length - suffix.length)) + after + escape(suffix);
  }).join('');
}

function appearance(s: Settings) {
  return {'--tb-bg':String(s.background), '--tb-ink':String(s.ink), '--tb-type':String(Number(s.typeScale)/100),
    '--tb-radius':s.radius+'px', '--tb-zoom':String(Number(s.zoom)/100), '--tb-time':s.duration+'ms', '--tb-fade':s.fade+'ms'};
}
export function render(input: unknown = {}) {
  const s = resolveSettings(input);
  const style = Object.entries(appearance(s)).map(([key,value]) => key+':'+value).join(';');
  return `<div class="tb-host" style="${style}"><div class="tb-stage"><div class="tb-wrap"><p class="tb-copy">${paragraph(s)}</p></div></div></div>`;
}

export function mount(host: HTMLElement, input: unknown = {}, _id?: string, options: {paused?:boolean} = {}) {
  let s = resolveSettings(input);
  host.innerHTML = render(s);
  const root = host.querySelector<HTMLElement>('.tb-host')!;
  const copy = root.querySelector<HTMLElement>('.tb-copy')!;
  const doc = host.ownerDocument, win = doc.defaultView!;
  const events = new AbortController(), listen = {signal:events.signal};
  const clocks = new Map<HTMLAnchorElement, number>();
  const links = () => Array.from(copy.querySelectorAll<HTMLAnchorElement>('.tb-slot'));
  let paused = !!options.paused, visible = true;
  let armed: HTMLAnchorElement | null = null;
  const fineHover = win.matchMedia('(hover:hover) and (pointer:fine)');
  function stop() {
    clocks.forEach(id => win.clearInterval(id));
    clocks.clear();
  }
  function clock(link: HTMLAnchorElement) {
    win.clearInterval(clocks.get(link));
    clocks.delete(link);
    if (paused || !visible || doc.hidden) return;
    const images = Array.from(link.querySelectorAll('img'));
    let active = images.findIndex(img => img.dataset.current === 'true');
    const delay = Number(s['interval'+(Number(link.dataset.index)+1)]);
    clocks.set(link, win.setInterval(() => {
      images[active].dataset.current = 'false';
      active = (active+1)%images.length;
      images[active].dataset.current = 'true';
    }, delay));
  }
  function sync() { stop(); links().forEach(clock); }
  const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
    if (visible !== entry.isIntersecting) { visible = entry.isIntersecting; sync(); }
  });
  observer?.observe(root);
  doc.addEventListener('visibilitychange',sync,listen);
  const slot = (target: EventTarget | null) => target instanceof Element ? target.closest<HTMLAnchorElement>('.tb-slot') : null;
  function mark(link: HTMLAnchorElement | null) {
    if (!link || !copy.contains(link)) return;
    for (const a of links()) a.toggleAttribute('data-last',a===link);
  }
  copy.addEventListener('pointerover', e => mark(slot(e.target)),listen);
  copy.addEventListener('focusin', e => mark(slot(e.target)),listen);
  function disarm() {
    if (armed) armed.removeAttribute('data-open');
    armed = null;
  }
  doc.addEventListener('pointerdown',e => {
    if (armed && !armed.contains(e.target as Node)) {
      if (doc.activeElement === armed) armed.blur();
      disarm();
    }
  },listen);
  copy.addEventListener('focusout',e => { if (e.target === armed) disarm(); },listen);
  copy.addEventListener('click',e => {
    const a = slot(e.target);
    if (!a || !e.detail || (e.pointerType !== 'touch' && fineHover.matches) || a===armed) return;
    e.preventDefault();
    disarm(); armed=a; a.setAttribute('data-open','');
  },listen);
  sync();
  return {
    update(patch: Settings) {
      const prev = s;
      s = resolveSettings({...s,...patch});
      for (const [key,value] of Object.entries(appearance(s))) root.style.setProperty(key,value);
      if (s.copy !== prev.copy) {
        disarm(); stop(); copy.innerHTML = paragraph(s); sync();
      } else {
        for (const a of links()) {
          const n = Number(a.dataset.index)+1;
          if (s['url'+n] !== prev['url'+n]) a.href = String(s['url'+n]);
          if (s['interval'+n] !== prev['interval'+n]) clock(a);
        }
      }
    },
    pause() { paused=true; stop(); },
    resume() { paused=false; sync(); },
    destroy() { events.abort(); observer?.disconnect(); stop(); root.remove(); }
  };
}
