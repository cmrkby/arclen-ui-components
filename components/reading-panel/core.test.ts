// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { defaults, mount, render, resolveSettings, type Controller } from './src/core';

let controller: Controller | undefined;
afterEach(() => {
  controller?.destroy();
  controller = undefined;
  document.body.replaceChildren();
});

test('validates the manifest settings and gives each rendered reader its own IDs', () => {
  expect(resolveSettings({})).toEqual(defaults);
  expect(() => resolveSettings({ theme: 'amber' })).toThrow();
  expect(() => resolveSettings({ fill: 1 })).toThrow();
  expect(() => resolveSettings({ other: false })).toThrow();
  expect(render()).not.toBe(render());
  expect(render({ theme: 'light', fill: true })).toContain('data-theme="light" data-fill="true"');
});

test('opens and reverses repeatedly, traps keyboard focus, and restores the opener', () => {
  const host = document.createElement('div');
  document.body.append(host);
  const onOpenChange = vi.fn();
  const onEvent = vi.fn();
  host.addEventListener('reading-panel-open-change', onEvent);
  controller = mount(host, {}, undefined, { onOpenChange });
  const find = <T extends HTMLElement>(selector: string) => host.querySelector<T>(selector)!;
  const opener = find<HTMLButtonElement>('[data-rp-open]');
  const larger = find<HTMLButtonElement>('[data-rp-larger]');
  const dialog = find<HTMLDialogElement>('[data-rp-dialog]');
  const story = find('[data-rp-expanded]');
  const closer = find<HTMLButtonElement>('[data-rp-close]');

  opener.click();
  expect(dialog.open).toBe(true);
  expect(document.activeElement).toBe(closer);
  expect(story.querySelector('[data-rp-match]')).not.toBeNull();
  closer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  expect(document.activeElement).toBe(story);
  story.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
  expect(document.activeElement).toBe(closer);
  larger.click();
  expect(story.style.getPropertyValue('--rp-size')).toBe('21px');

  story.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(dialog.open).toBe(false);
  expect(document.activeElement).toBe(opener);
  opener.click();
  closer.click();
  opener.click();
  dialog.click();
  expect(dialog.open).toBe(false);
  expect(document.activeElement).toBe(opener);
  expect(onOpenChange.mock.calls.flat()).toEqual([true, false, true, false, true, false]);
  expect(onEvent.mock.calls.map(([event]) => (event as CustomEvent).detail)).toEqual(
    onOpenChange.mock.calls.flat(),
  );
});

test('pausing closes the reader and destroying it releases the controls', () => {
  const host = document.createElement('div');
  document.body.append(host);
  controller = mount(host);
  const opener = host.querySelector<HTMLButtonElement>('[data-rp-open]')!;
  const dialog = host.querySelector<HTMLDialogElement>('[data-rp-dialog]')!;
  const root = host.querySelector<HTMLElement>('[data-rp-root]')!;
  opener.click();
  controller.pause();
  expect(dialog.open).toBe(false);
  expect(opener.disabled).toBe(true);
  controller.update({ theme: 'light', fill: true });
  expect(root.dataset.theme).toBe('light');
  expect(root.dataset.fill).toBe('true');
  controller.resume();
  opener.click();
  expect(dialog.open).toBe(true);
  controller.destroy();
  expect(dialog.open).toBe(false);
  expect(opener.disabled).toBe(true);
});

test('shares caller paragraphs between views and draws three independent refraction surfaces', () => {
  const host = document.createElement('div');
  controller = mount(host, { title: '<A title>', passages: ['A <lamp>.', 'The second paragraph.'] });
  expect(host.querySelector('h2')?.textContent).toBe('<A title>');
  expect(host.querySelector('lamp')).toBeNull();
  expect(host.querySelectorAll('filter')).toHaveLength(3);
  expect(host.querySelectorAll('feDisplacementMap')).toHaveLength(9);
  expect(host.querySelectorAll('[data-rp-paragraph="1"]')).toHaveLength(2);
  controller.update({ passages: ['An updated passage.'] });
  expect(host.querySelectorAll('[data-rp-paragraph]')).toHaveLength(2);
  expect(host.querySelector('[data-rp-excerpt]')?.textContent).toBe('An updated passage.');
});

test('optical and typography controls update the live sheet without resetting the article', () => {
  const host = document.createElement('div');
  controller = mount(host, { fontSize: 25, glassStrength: 0 });
  expect(host.querySelector('[data-channel]')?.getAttribute('scale')).toBe('0.00');
  const root = host.querySelector<HTMLElement>('[data-rp-root]')!;
  controller.update({
    glassStrength: 100,
    paperOpacity: 58,
    glassMode: 'frosted',
    typeface: 'sans',
    motionSpeed: 1.5,
    fontSize: 23,
    readerWidth: 540,
    lineHeight: 1.5,
    accent: '#223355',
    byline: 'Notebook',
    openLabel: 'Continue',
  });
  expect(root.dataset.glass).toBe('frosted');
  expect(root.style.getPropertyValue('--rp-typeface')).toContain('Geist');
  expect(root.style.getPropertyValue('--rp-motion-rate')).toBe('1.5');
  expect(root.style.getPropertyValue('--rp-paper-alpha')).toBe('58%');
  expect(root.style.getPropertyValue('--rp-reader-width')).toBe('540px');
  expect(root.querySelector('[data-channel]')?.getAttribute('scale')).toBe('23.00');
  expect(root.querySelector('[data-rp-open-label]')?.textContent).toBe('Continue');
  expect(root.querySelector('[data-rp-byline]')?.textContent).toBe('Notebook');
  expect(() => controller!.update({ paperOpacity: 2 })).toThrow();
  expect(() => controller!.update({ accent: 'url(bad)' })).toThrow();
  root.querySelector<HTMLButtonElement>('[data-rp-open]')!.click();
  root.querySelector<HTMLButtonElement>('[data-rp-larger]')!.click();
  expect(
    root.querySelector<HTMLElement>('[data-rp-expanded]')!.style.getPropertyValue('--rp-size'),
  ).toBe('25px');
});

test('a reversal before entry settles reopens at the compact sentence, independent of scaled reader coordinates', () => {
  const host = document.createElement('div');
  document.body.append(host);
  controller = mount(host, { passages: Array.from({ length: 11 }, (_, i) => 'Passage ' + i) });
  const sheet = host.querySelector<HTMLElement>('[data-rp-sheet]')!;
  const card = host.querySelector<HTMLElement>('[data-rp-card]')!;
  const dialog = host.querySelector<HTMLDialogElement>('[data-rp-dialog]')!;
  const opener = host.querySelector<HTMLButtonElement>('[data-rp-open]')!;
  const box = (width: number, height: number) => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: height,
    right: width,
    width,
    height,
    toJSON() {},
  });
  sheet.getBoundingClientRect = () => box(680, 597);
  card.getBoundingClientRect = () => box(289, 290);
  const runs: { onfinish: null | (() => void); cancel: () => void }[] = [];
  Object.defineProperty(sheet, 'animate', {
    value: () => {
      const run = { onfinish: null, cancel: () => {} };
      runs.push(run);
      return run;
    },
  });
  const excerpt = host.querySelector<HTMLElement>('[data-rp-excerpt]')!;
  const selected = excerpt.querySelector<HTMLElement>('[data-rp-paragraph="2"]')!;
  selected.getBoundingClientRect = () => box(243, 80);
  opener.click();
  expect(host.querySelector('[data-rp-match]')?.textContent).toBe('Passage 2');
  dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  runs.at(-1)?.onfinish?.();
  opener.click();
  expect(host.querySelector('[data-rp-match]')?.textContent).toBe('Passage 2');
});

test('resizing type pins the same character even when its physical scroll range changes', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  controller = mount(host);
  const story = host.querySelector<HTMLElement>('[data-rp-expanded]')!;
  Object.defineProperties(story, {
    clientHeight: { get: () => 600 },
    scrollHeight: { get: () => (story.style.getPropertyValue('--rp-size') === '21px' ? 2400 : 2000) },
  });
  host.querySelector<HTMLButtonElement>('[data-rp-open]')!.click();
  story.scrollTop = 672;
  // Model the measured line geometry as the same sentence moves 192px down the page on reflow.
  const createRange = document.createRange.bind(document);
  const rangeFixture = vi.spyOn(document, 'createRange').mockImplementation(() => {
    const range = createRange();
    Object.defineProperty(range, 'getBoundingClientRect', {
      value: () => ({
        top: 170 + (story.style.getPropertyValue('--rp-size') === '21px' ? 864 : 672) - story.scrollTop,
      }),
    });
    return range;
  });
  story.dispatchEvent(new Event('scroll'));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const initialLogical = story.dataset.rpLocation;
  const initialPercent = host.querySelector('[data-rp-percent]')!.textContent;
  try {
    host.querySelector<HTMLButtonElement>('[data-rp-larger]')!.click();
  } finally {
    rangeFixture.mockRestore();
  }
  expect(story.scrollTop / (story.scrollHeight - story.clientHeight)).toBeCloseTo(0.48, 2);
  expect(story.dataset.rpLocation).toBe(initialLogical);
  expect(host.querySelector('[data-rp-percent]')!.textContent).toBe(initialPercent);
});

test('paper curvature and column settings survive SSR, updates, and the open reader', () => {
  const host = document.createElement('div');
  const first = { cornerRadius: 18, readingMeasure: 420, paragraphSpacing: 0.75 };
  host.innerHTML = render(first);
  const paper = () => host.querySelector<HTMLElement>('[data-rp-root]')!;
  expect(paper().style.getPropertyValue('--rp-radius')).toBe('18px');
  expect(paper().style.getPropertyValue('--rp-measure')).toBe('420px');
  expect(paper().style.getPropertyValue('--rp-paragraph-gap')).toBe('0.75em');
  controller = mount(host, first);
  host.querySelector<HTMLButtonElement>('[data-rp-open]')!.click();
  const story = host.querySelector<HTMLElement>('[data-rp-expanded]')!;
  const before = story.dataset.rpLocation;
  controller.update({ cornerRadius: 48, readingMeasure: 360, paragraphSpacing: 1.5 });
  expect(story.dataset.rpLocation).toBe(before);
  expect(paper().style.getPropertyValue('--rp-radius')).toBe('48px');
  expect(paper().style.getPropertyValue('--rp-measure')).toBe('360px');
  expect(paper().style.getPropertyValue('--rp-paragraph-gap')).toBe('1.5em');
  expect(() => controller!.update({ cornerRadius: 99 })).toThrow();
  expect(() => controller!.update({ readingMeasure: 24 })).toThrow();
  expect(() => controller!.update({ paragraphSpacing: -1 })).toThrow();
});

test('keeps the open reader and resizes all three optical maps when tuning the controls', () => {
  const host = document.createElement('div');
  document.body.append(host);
  controller = mount(host, { openWidth: 138, sectionLabel: '<Article>', lightMistA: '#abc123' });
  const root = host.querySelector<HTMLElement>('[data-rp-root]')!;
  const filters = root.querySelectorAll('filter');
  expect(root.style.getPropertyValue('--rp-mist-a')).toBe('#abc123');
  expect(filters[0]!.getAttribute('width')).toBe('138');
  expect(root.querySelector('.rp-section-label')!.textContent).toBe('<Article>');
  root.querySelector<HTMLButtonElement>('[data-rp-open]')!.click();
  const story = root.querySelector<HTMLElement>('[data-rp-expanded]')!;
  const location = story.dataset.rpLocation;
  controller.update({ openHeight: 52, closeSize: 48, toolbarWidth: 280, bodySideInset: 10, sectionLabel: 'Essay', theme: 'dark', darkPaper: '#102013' });
  expect(root.style.getPropertyValue('--rp-paper')).toBe('#102013');
  expect(root.style.getPropertyValue('--rp-body-side-inset')).toBe('10%');
  expect(root.querySelector('.rp-section-label')!.textContent).toBe('Essay');
  expect(filters[0]!.querySelector('feImage')?.getAttribute('height')).toBe('52');
  expect(filters[1]!.querySelector('feImage')?.getAttribute('width')).toBe('48');
  expect(filters[2]!.querySelector('feImage')?.getAttribute('width')).toBe('280');
  expect(story.dataset.rpLocation).toBe(location);
  expect(root.querySelector('dialog')!.open).toBe(true);
  expect(() => controller!.update({ closeSize: 2 })).toThrow();
});
