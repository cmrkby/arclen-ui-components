import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHeadlineFitter } from '../src/core/headline-fit';

// Geometry doubles exercise fitting and ownership; actual font layout needs browser proof.
function fixture(text = 'W'.repeat(160)) {
  let width = 360, height = 600, metric = 0.65, inlineSize = '', present = true;
  let fragmentOffset = 0, reads = 0;
  const observers: { callback: () => void; active: boolean; observe(): void; disconnect(): void }[] = [];
  const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
  const loads: { font: string; text: string; resolve(): void; reject(): void }[] = [];
  class Fonts extends EventTarget {
    load(font: string, text: string) {
      return new Promise<void>((resolve, reject) => loads.push({ font, text, resolve, reject: () => reject(new Error('Font unavailable')) }));
    }
    override addEventListener(type: string, callback: EventListenerOrEventListenerObject) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(callback);
      super.addEventListener(type, callback);
    }
    override removeEventListener(type: string, callback: EventListenerOrEventListenerObject) {
      listeners.get(type)?.delete(callback);
      super.removeEventListener(type, callback);
    }
  }
  const fonts = new Fonts();
  class Observer {
    active = false;
    constructor(public callback: () => void) { observers.push(this); }
    observe() { this.active = true; }
    disconnect() { this.active = false; }
  }
  vi.stubGlobal('ResizeObserver', Observer);
  const usual = () => Math.min(96, Math.max(32, width * .12));
  const size = () => inlineSize ? Number.parseFloat(inlineSize) : usual();
  const rect = (left: number, top: number, w: number, h: number) =>
    ({ left, top, right: left + w, bottom: top + h, width: w, height: h });
  const title = {
    dataset: {} as Record<string, string>,
    getBoundingClientRect() {
      reads++;
      const w = Math.min(width - 32, paragraph.textContent.length * size() * metric + 48);
      const lines = Math.max(1, Math.ceil(paragraph.textContent.length * size() * metric / (w - 48)));
      const h = lines * size() * 1.2 + 24;
      return rect(50 + (width - w) / 2, 25 + (height - h) / 2, w, h);
    },
  };
  const paragraph = {
    textContent: text, parentElement: title,
    style: {
      get fontSize() { return inlineSize; },
      set fontSize(value: string) { inlineSize = value; },
      removeProperty(name: string) { if (name === 'font-size') inlineSize = ''; },
    },
  };
  const root = {
    dataset: { headlineMode: 'readable' }, isConnected: true,
    querySelector() { return present ? paragraph : null; },
    getBoundingClientRect() { return rect(50, 25, width, height); },
    ownerDocument: {
      fonts,
      defaultView: { getComputedStyle() { return { fontSize: `${size()}px`, fontWeight: '400', fontFamily: '"Arclen Mesh Serif", serif' }; } },
      createRange() {
        return {
          selectNodeContents() {},
          getClientRects() {
            const r = title.getBoundingClientRect();
            return [rect(r.left + 24 + fragmentOffset, r.top + 12, r.width - 48, r.height - 24)];
          },
        };
      },
    },
  };
  return {
    root: root as unknown as HTMLElement, paragraph, title, fonts, observers, loads, size, usual,
    resize(w: number, h: number) { width = w; height = h; observers.filter(o => o.active).forEach(o => o.callback()); },
    fontMetric(value: number) { metric = value; },
    offsetFragment(value: number) { fragmentOffset = value; },
    removeTitle() { present = false; },
    restoreTitle() { present = true; },
    listeners() { return [...listeners.values()].reduce((sum, set) => sum + set.size, 0); },
    reads() { return reads; },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('readable headline fitting, isolated geometry and lifecycle', () => {
  it('keeps the usual CSS size when the complete padded text fits', () => {
    const f = fixture('Short title');
    const fit = createHeadlineFitter(f.root);
    expect(f.paragraph.style.fontSize).toBe('');
    expect(f.size()).toBe(43.199999999999996);
    expect(f.title.dataset.fit).toBe('natural');
    fit.destroy();
  });

  it('shrinks full text only enough to find a bounded fitting size without growing the host', () => {
    const f = fixture();
    const before = f.root.getBoundingClientRect();
    const fit = createHeadlineFitter(f.root);
    expect(f.title.dataset.fit).toBe('fitted');
    expect(f.size()).toBeGreaterThanOrEqual(32);
    expect(f.size()).toBeLessThan(f.usual());
    expect(f.paragraph.textContent).toBe('W'.repeat(160));
    expect(f.root.getBoundingClientRect()).toEqual(before);
    const box = f.title.getBoundingClientRect();
    expect(box.top).toBeGreaterThanOrEqual(before.top);
    expect(box.bottom).toBeLessThanOrEqual(before.bottom);
    const fitting = f.size();
    f.paragraph.style.fontSize = `${fitting + .063}px`;
    expect(f.title.getBoundingClientRect().height).toBeGreaterThan(before.height);
    fit.destroy();
  });

  it('leaves detectable overflow at32 instead of truncation or further shrinking', () => {
    const f = fixture();
    f.resize(360, 120);
    const fit = createHeadlineFitter(f.root);
    expect(f.size()).toBe(32);
    expect(f.title.dataset.fit).toBe('overflow');
    expect(f.title.getBoundingClientRect().height).toBeGreaterThan(120);
    expect(f.paragraph.textContent).toHaveLength(160);
    fit.destroy();
  });

  it('checks text fragments even when the title padding box fits', () => {
    const f = fixture('Short');
    f.offsetFragment(500);
    const fit = createHeadlineFitter(f.root);
    expect(f.title.getBoundingClientRect().height).toBeLessThan(600);
    expect(f.title.dataset.fit).toBe('overflow');
    expect(f.size()).toBe(32);
    fit.destroy();
  });

  it('remeasures font loads/errors, host resize and updated content from the natural size', () => {
    const f = fixture();
    f.fontMetric(.1);
    const fit = createHeadlineFitter(f.root);
    expect(f.title.dataset.fit).toBe('natural');
    f.fontMetric(.65);
    f.fonts.dispatchEvent(new Event('loadingdone'));
    expect(f.title.dataset.fit).toBe('fitted');
    f.resize(1000, 1600);
    expect(f.paragraph.style.fontSize).toBe('');
    expect(f.size()).toBe(96);
    expect(f.title.dataset.fit).toBe('natural');
    expect(f.paragraph.textContent).toHaveLength(160);
    f.resize(360, 600);
    expect(f.title.dataset.fit).toBe('fitted');
    f.paragraph.textContent = 'Short';
    fit.update();
    expect(f.paragraph.style.fontSize).toBe('');
    f.resize(1000, 600);
    expect(f.size()).toBe(96);
    expect(f.title.dataset.fit).toBe('natural');
    f.offsetFragment(2000);
    f.fonts.dispatchEvent(new Event('loadingerror'));
    expect(f.title.dataset.fit).toBe('overflow');
    fit.destroy();
  });

  it('keeps overlay untouched and owns no callbacks for empty titles', () => {
    const f = fixture();
    f.root.dataset.headlineMode = 'overlay';
    const fit = createHeadlineFitter(f.root);
    expect(f.observers).toHaveLength(0);
    expect(f.listeners()).toBe(0);
    expect(f.paragraph.style.fontSize).toBe('');
    f.root.dataset.headlineMode = 'readable'; fit.update();
    expect(f.listeners()).toBe(2);
    f.root.dataset.headlineMode = 'overlay'; fit.update();
    expect(f.paragraph.style.fontSize).toBe('');
    expect(f.title.dataset.fit).toBeUndefined();
    expect(f.observers.some(o => o.active)).toBe(false);
    expect(f.listeners()).toBe(0);
    f.root.dataset.headlineMode = 'readable'; f.removeTitle(); fit.update();
    expect(f.observers.some(o => o.active)).toBe(false);
    f.restoreTitle(); fit.update();
    expect(f.listeners()).toBe(2);
    fit.destroy();
  });

  it('refits on actual text-targeted font completion even when no native font event arrives', async () => {
    const f = fixture();
    f.fontMetric(.1);
    const fit = createHeadlineFitter(f.root);
    expect(f.title.dataset.fit).toBe('natural');
    expect(f.loads).toHaveLength(1);
    expect(f.loads[0].text).toBe('W'.repeat(160));
    expect(f.loads[0].font).toContain('"Arclen Mesh Serif", serif');
    f.fontMetric(.65);
    f.loads[0].resolve();
    await Promise.resolve();
    expect(f.title.dataset.fit).toBe('fitted');
    expect(f.size()).toBeGreaterThanOrEqual(32);
    expect(f.size()).toBeLessThan(f.usual());
    fit.destroy();
  });

  it('ignores stale generations, removed titles, overlay changes and destroyed font completions', async () => {
    const f = fixture();
    const fit = createHeadlineFitter(f.root);
    fit.update();
    let reads = f.reads();
    f.loads[0].resolve(); await Promise.resolve();
    expect(f.reads()).toBe(reads);
    f.removeTitle(); f.loads[1].resolve(); await Promise.resolve();
    expect(f.reads()).toBe(reads);
    f.restoreTitle(); fit.update();
    f.root.dataset.headlineMode = 'overlay';
    reads = f.reads(); f.loads[2].resolve(); await Promise.resolve();
    expect(f.reads()).toBe(reads);
    f.root.dataset.headlineMode = 'readable'; fit.update(); fit.destroy();
    reads = f.reads(); f.loads[3].resolve(); await Promise.resolve();
    expect(f.reads()).toBe(reads);
  });

  it('handles rejected font loads without an unhandled rejection or extra layout', async () => {
    const f = fixture();
    const fit = createHeadlineFitter(f.root);
    const reads = f.reads();
    f.loads[0].reject(); await Promise.resolve(); await Promise.resolve();
    expect(f.reads()).toBe(reads);
    expect(f.title.dataset.fit).toBe('fitted');
    fit.destroy();
  });

  it('defers zero-area fitting and makes queued resize/font callbacks inert after destroy', () => {
    const f = fixture();
    f.resize(360, 0);
    const fit = createHeadlineFitter(f.root);
    expect(f.title.dataset.fit).toBe('pending');
    f.resize(360, 600);
    expect(f.title.dataset.fit).toBe('fitted');
    const observer = f.observers[0];
    fit.destroy(); fit.destroy();
    const reads = f.reads();
    observer.callback(); f.fonts.dispatchEvent(new Event('loadingdone')); fit.update();
    expect(f.reads()).toBe(reads);
    expect(f.listeners()).toBe(0);
    expect(f.observers.some(o => o.active)).toBe(false);
  });
});
