// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import manifest from './component.json';
import { defaults, mount, render, resolveSettings } from './src/core';

describe('Quick Find', () => {
  it('accepts manifest presets and protects its setting bounds and IDs', () => {
    expect(defaults.rows).toBe(3);
    for (const preview of manifest.previews) expect(resolveSettings(preview.settings)).toEqual(preview.settings);
    expect(() => resolveSettings({ corner: -1 })).toThrow();
    expect(() => resolveSettings({ rows: 2.5 })).toThrow();
    expect(() => resolveSettings({ shortcut: 'off' })).toThrow();
    expect(render()).not.toEqual(render());
  });

  it('keeps the focused input through searching, two-stage Escape and selection', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const selected = vi.fn();
    const core = mount(host, defaults, undefined, { onSelect: selected });
    const input = host.querySelector('input')!;
    const press = (key: string) => input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    try {
      input.focus();
      expect(input.getAttribute('aria-expanded')).toBe('true');
      input.value = 'type font';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(host.querySelectorAll('[role=option]')).toHaveLength(1);
      expect(host.querySelector('[role=option]')?.textContent).toContain('Typography checklist');
      press('Escape');
      expect(input.value).toBe('');
      expect(input.getAttribute('aria-expanded')).toBe('true');
      press('Escape');
      expect(input.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(input);
      press('ArrowDown');
      press('ArrowDown');
      press('Enter');
      expect(selected).toHaveBeenCalledExactlyOnceWith('Naming notes');
      expect(host.querySelector('input')).toBe(input);
      expect(input.getAttribute('aria-expanded')).toBe('false');
    } finally {
      core.destroy();
      host.remove();
    }
  });

  it('labels recents by file type and finds that format with or without the dot', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const core = mount(host);
    const input = host.querySelector('input')!;
    try {
      input.focus();
      const visibleFormats = () => Array.from(host.querySelectorAll<HTMLElement>('[role=option] [data-format]'), el => el.dataset.format);
      expect(visibleFormats()).toEqual(['PDF', 'DOC', 'PNG']);
      for (const query of ['.png', 'PNG']) {
        input.value = query;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(visibleFormats()).toEqual(['PNG', 'PNG']);
      }
      core.update({ theme: 'dark', showDividers: false });
      expect(host.firstElementChild?.getAttribute('data-dividers')).toBe('false');
      expect(input.value).toBe('PNG');
    } finally { core.destroy(); host.remove(); }
  });

  it('continues the hover sheet from its current position on reversal', () => {
    const host = document.createElement('div');
    document.body.append(host);
    let now = 0;
    let ticket = 0;
    const frames = new Map<number, FrameRequestCallback>();
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.set(++ticket, cb); return ticket; });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id); });
    const clock = vi.spyOn(window.performance, 'now').mockImplementation(() => now);
    const core = mount(host, { hoverDuration: 300, rowHeight: 72 });
    const input = host.querySelector('input')!;
    const sheet = host.querySelector<HTMLElement>('.quick-find__highlight')!;
    function advance(n: number) {
      for (let i = 0; i < n; i++) {
        now += 1000 / 60;
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach(cb => cb(now));
      }
    }
    function hover(index: number) {
      host.querySelectorAll('[data-option]')[index].dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
    }
    const y = () => Number(/translateY\(([-.0-9]+)px\)/.exec(sheet.style.transform)?.[1]);
    try {
      input.focus();
      hover(0);
      hover(2);
      advance(3);
      const crossing = y();
      expect(crossing).toBeGreaterThan(5);
      expect(crossing).toBeLessThan(140);
      hover(0);
      expect(y()).toBe(crossing);
      advance(60);
      expect(y()).toBe(0);
      expect(frames.size).toBe(0);
      hover(1);
      advance(60);
      expect(y()).toBe(72);
    } finally {
      core.destroy();
      host.remove();
      raf.mockRestore();
      cancel.mockRestore();
      clock.mockRestore();
    }
  });

  it('updates result density and both empty messages without resetting focus or keyboard selection', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const custom = { thumbnailSize: 28, showDescriptions: false, emptyRecentsText: 'Open a <file>', noResultsText: 'Try another term' };
    expect(render(custom)).toContain('Open a &lt;file&gt;');
    expect(() => resolveSettings({ thumbnailSize: 55 })).toThrow();
    expect(() => resolveSettings({ showDescriptions: 'true' })).toThrow();
    expect(() => resolveSettings({ noResultsText: 'a'.repeat(141) })).toThrow();
    const core = mount(host, custom);
    const root = host.firstElementChild as HTMLElement;
    const input = root.querySelector('input')!;
    const empty = root.querySelector<HTMLElement>('[data-empty]')!;
    try {
      input.focus();
      expect(root.style.getPropertyValue('--qf-thumbnail')).toBe('28px');
      expect(root.dataset.descriptions).toBe('false');
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      const active = input.getAttribute('aria-activedescendant');
      expect(active).toBeTruthy();
      core.update({ thumbnailSize: 48, showDescriptions: true });
      expect(input.getAttribute('aria-activedescendant')).toBe(active);
      expect(root.style.getPropertyValue('--qf-thumbnail')).toBe('48px');
      expect(root.dataset.descriptions).toBe('true');
      root.querySelector<HTMLButtonElement>('[data-forget]')!.click();
      expect(empty.hidden).toBe(false);
      expect(empty.textContent).toBe(custom.emptyRecentsText);
      input.value = 'xyz-no-match';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(empty.textContent).toBe(custom.noResultsText);
      core.update({ noResultsText: 'No <project> found' });
      expect(empty.childElementCount).toBe(0);
      expect(empty.textContent).toBe('No <project> found');
      expect(root.querySelector('[role=status]')?.textContent).toBe('No <project> found');
      expect(document.activeElement).toBe(input);
      expect(input.value).toBe('xyz-no-match');
    } finally { core.destroy(); host.remove(); }
  });

  it('applies configurable layout, motion, field text and accent while preserving the input', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const inputSettings = { openWidth: 530, rowHeight: 80, openDuration: 640, hoverDuration: 390,
      accent: '#7633aa', showArtwork: false, placeholder: 'Search <projects>' };
    const core = mount(host, inputSettings);
    const root = host.firstElementChild as HTMLElement;
    const input = host.querySelector('input')!;
    try {
      expect(resolveSettings(inputSettings)).toMatchObject(inputSettings);
      expect(() => resolveSettings({ hoverDuration: -1 })).toThrow();
      expect(() => resolveSettings({ rowHeight: 85 })).toThrow();
      expect(() => resolveSettings({ accent: 'url(https://example.com)' })).toThrow();
      expect(render(inputSettings)).toContain('Search &lt;projects&gt;');
      input.focus();
      expect(input.placeholder).toBe('Search <projects>');
      expect(root.dataset.artwork).toBe('false');
      expect(root.style.getPropertyValue('--qf-row')).toBe('80px');
      expect(root.style.getPropertyValue('--qf-width')).toBe('530px');
      expect(root.style.getPropertyValue('--qf-open')).toBe('640ms');
      expect(root.style.getPropertyValue('--qf-accent')).toBe('#7633aa');
      expect(root.style.getPropertyValue('--qf-height')).toBe('396px');
      core.update({ rowHeight: 60, showArtwork: true, rows: 2 });
      expect(root.style.getPropertyValue('--qf-height')).toBe('276px');
      expect(root.dataset.artwork).toBe('true');
      expect(host.querySelector('input')).toBe(input);
    } finally {
      core.destroy();
      host.remove();
    }
  });

  it('removes, clears, and restores recent rows and routes shortcuts to one enabled instance', () => {
    const first = document.createElement('div');
    const second = document.createElement('div');
    document.body.append(first, second);
    const one = mount(first);
    const two = mount(second);
    const input = first.querySelector('input')!;
    const other = second.querySelector('input')!;
    const shortcut = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    try {
      shortcut();
      expect(input.getAttribute('aria-expanded')).toBe('true');
      expect(other.getAttribute('aria-expanded')).toBe('false');
      first.querySelector<HTMLButtonElement>('[data-remove="0"]')!.click();
      expect(first.querySelector('[role=option]')?.textContent).toContain('Naming notes');
      first.querySelector<HTMLButtonElement>('[data-forget]')!.click();
      expect(first.querySelectorAll('[role=option]')).toHaveLength(0);
      first.querySelector<HTMLButtonElement>('[data-restore]')!.click();
      expect(first.querySelectorAll('[role=option]')).toHaveLength(3);
      first.querySelector<HTMLButtonElement>('[data-remove-category="Pages"]')!.click();
      expect(first.querySelector('[data-restore-categories]')?.textContent).toBe('2Categories');
      expect(first.querySelectorAll('[role=option]')).toHaveLength(3);
      first.querySelector<HTMLButtonElement>('[data-forget]')!.click();
      first.querySelector<HTMLButtonElement>('[data-restore]')!.click();
      expect(first.querySelector('[data-restore-categories]')?.textContent).toBe('2Categories');
      first.querySelector<HTMLButtonElement>('[data-restore-categories]')!.click();
      expect(first.querySelector('[data-restore-categories]')?.textContent).toBe('3Categories');
      one.update({ rows: 0, shortcut: false });
      expect(first.querySelectorAll('[role=option]')).toHaveLength(0);
      one.pause();
      expect(input.disabled).toBe(true);
      shortcut();
      expect(other.getAttribute('aria-expanded')).toBe('true');
      two.destroy();
      shortcut();
      expect(other.disabled).toBe(true);
      expect(other.getAttribute('aria-expanded')).toBe('false');
    } finally {
      one.destroy();
      two.destroy();
      first.remove();
      second.remove();
    }
  });
});

it('keeps the live panel open for inspector edits and derives its height from the field, heading and strip', () => {
  const host = document.createElement('div');
  const outside = document.createElement('button');
  document.body.append(host, outside);
  const control = mount(host, { dismissOnOutside: false, recentHeading: '<Recent>', clearLabel: 'Forget', rows: 1 });
  const field = host.querySelector('input')!;
  const root = host.querySelector<HTMLElement>('[data-quick-find]')!;
  try {
    field.focus();
    outside.focus();
    outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(root.dataset.open).toBe('true');
    expect(host.querySelector('[data-heading]')?.textContent).toBe('<Recent>');
    expect(host.querySelector('[data-forget]')?.textContent).toBe('Forget');
    control.update({ fieldHeight: 64, headerHeight: 56, stripHeight: 72, theme: 'dark', darkRemoval: '#bb1122', searchIconSize: 30, recentHeading: 'Today' });
    expect(root.style.getPropertyValue('--qf-height')).toBe('262px');
    expect(root.style.getPropertyValue('--qf-removal')).toBe('#bb1122');
    expect(root.style.getPropertyValue('--qf-search-icon-size')).toBe('30px');
    expect(host.querySelector('[data-heading]')?.textContent).toBe('Today');
    expect(host.querySelector('input')).toBe(field);
    expect(() => control.update({ iconStroke: 0 })).toThrow();
    expect(() => control.update({ darkShell: 'url(x)' })).toThrow();
    control.update({ dismissOnOutside: true });
    outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(root.dataset.open).toBe('false');
  } finally {
    control.destroy();
    host.remove();
    outside.remove();
  }
});
