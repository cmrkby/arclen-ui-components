// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import manifest from './component.json';
import { defaults, mount, render, resolveSettings } from './src/core';

describe('Tension Slider', () => {
  it('accepts manifest presets, escapes labels and generates independent range IDs', () => {
    expect(defaults.value).toBe(36);
    for (const preview of manifest.previews) expect(resolveSettings(preview.settings)).toEqual({ ...defaults, ...preview.settings });
    expect(() => resolveSettings({ value: 101 })).toThrow();
    expect(() => resolveSettings({ value: Infinity })).toThrow();
    expect(() => resolveSettings({ theme: '<img>' })).toThrow();
    expect(render({ label: '<script>&' })).toContain('&lt;script&gt;&amp;');
    expect(render()).not.toEqual(render());
  });

  it('sizes the marker and ticks and keeps the visible instructions linked to the native range', () => {
    const host = document.createElement('div');
    const custom = { markerSize: 18, tickThickness: 4.5, helpText: 'Slide <left>.\nPull & release.' };
    expect(render(custom)).toContain('Slide &lt;left&gt;.\nPull &amp; release.');
    expect(() => resolveSettings({ markerSize: 23 })).toThrow();
    expect(() => resolveSettings({ tickThickness: .5 })).toThrow();
    expect(() => resolveSettings({ helpText: 'a'.repeat(181) })).toThrow();
    const core = mount(host, custom);
    const root = host.firstElementChild as HTMLElement;
    const hint = root.querySelector<HTMLElement>('.tension-slider__hint')!;
    const input = root.querySelector('input')!;
    try {
      expect(root.style.getPropertyValue('--ts-marker-size')).toBe('18');
      expect(root.style.getPropertyValue('--ts-tick-width')).toBe('4.5');
      expect(input.getAttribute('aria-describedby')).toBe(hint.id);
      expect(hint.textContent).toBe(custom.helpText);
      core.update({ markerSize: 6, tickThickness: 1, helpText: '' });
      expect(hint.hidden).toBe(true);
      expect(input.hasAttribute('aria-describedby')).toBe(false);
      expect(input.value).toBe('36');
      core.update({ helpText: 'Adjust gain', hint: false });
      expect(hint.hidden).toBe(true);
      core.update({ hint: true });
      expect(hint.textContent).toBe('Adjust gain');
      expect(hint.hidden).toBe(false);
      expect(input.getAttribute('aria-describedby')).toBe(hint.id);
      expect(root.style.getPropertyValue('--ts-marker-size')).toBe('6');
      expect(root.style.getPropertyValue('--ts-tick-width')).toBe('1');
    } finally { core.destroy(); }
  });

  it('updates scale density, typography and keyboard increments without replacing the input', () => {
    const host = document.createElement('div');
    expect(() => resolveSettings({ tickCount: 34.5 })).toThrow();
    expect(() => resolveSettings({ darkInk: 'url(unsafe)' })).toThrow();
    expect(render({ valueSuffix: '<unit>' })).toContain('&lt;unit&gt;');
    const core = mount(host);
    const input = host.querySelector('input')!;
    core.update({ tickCount: 25, value: 50, valueSuffix: 'dB', keyboardStep: 3,
      pageStep: 15, showLabel: true, showPrediction: true, showValue: false });
    expect(host.querySelectorAll('[data-mark]')).toHaveLength(25);
    expect(host.querySelector('[data-prediction]')!.hasAttribute('hidden')).toBe(false);
    expect(host.querySelector('output')!.hidden).toBe(true);
    expect(host.querySelector('label')!.className).toBe('tension-slider__label');
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
    expect(input.getAttribute('aria-valuetext')).toBe('53 dB');
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'PageDown', bubbles: true}));
    expect(input.value).toBe('38');
    core.update({ theme: 'dark', darkInk: '#ccbbaa', tickCount: 67, valueSuffix: '' });
    expect(host.querySelector('input')).toBe(input);
    expect(input.hasAttribute('aria-valuetext')).toBe(false);
    expect((host.firstElementChild as HTMLElement).style.getPropertyValue('--ts-ink')).toBe('#ccbbaa');
    expect(input.value).toBe('38');
    core.destroy();
  });
  
  it('commits keyboard and direct pointer values before callbacks and stops on destruction', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const change = vi.fn();
    const core = mount(host, defaults, undefined, { onValueChange: change });
    const input = host.querySelector('input')!;
    const rail = host.querySelector<HTMLElement>('.tension-slider__rail')!;
    const scrub = host.querySelector<HTMLElement>('[data-scrub]')!;
    vi.spyOn(rail, 'getBoundingClientRect').mockReturnValue(new DOMRect(38, 10, 180, 132));
    const press = (key: string) => input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    try {
      press('End');
      expect(input.value).toBe('100');
      expect(change).toHaveBeenLastCalledWith(100);
      scrub.dispatchEvent(new PointerEvent('pointerdown', { button: 0, isPrimary: true, pointerId: 1, clientX: 83, bubbles: true }));
      expect(input.value).toBe('25');
      expect(change).toHaveBeenLastCalledWith(25);
      rail.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 173, bubbles: true }));
      expect(input.value).toBe('75');
      rail.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 173, bubbles: true }));
      core.update({ label: 'Gain' });
      expect(input.value).toBe('75');
      expect(input.labels?.[0].textContent).toBe('Gain');
      core.pause();
      press('Home');
      expect(input.value).toBe('75');
      expect(input.disabled).toBe(true);
      core.resume();
      expect(input.disabled).toBe(false);
      core.destroy();
      press('Home');
      expect(input.value).toBe('75');
      expect(input.disabled).toBe(true);
    } finally {
      core.destroy();
      host.remove();
    }
  });

  it('carries an impulse through individual bars during scrub and flight, then sleeps', () => {
    let now = 1000;
    let ticket = 0;
    const frames = new Map<number, FrameRequestCallback>();
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.set(++ticket, cb); return ticket; });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id); });
    const clock = vi.spyOn(window.performance, 'now').mockImplementation(() => now);
    const host = document.createElement('div');
    document.body.append(host);
    const custom = { waveWidth: 2, waveStrength: 1.3, waveDamping: 8, waveSpeed: 44, flightDuration: 375, accent: '#685adb' };
    const controller = mount(host, custom);
    const rail = host.querySelector<HTMLElement>('.tension-slider__rail')!;
    const marks = Array.from(rail.querySelectorAll<HTMLElement>('[data-mark]'));
    vi.spyOn(rail, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 583, 96));
    function tick(count = 1) {
      for (let i = 0; i < count; i++) {
        now += 1000 / 60;
        const ready = [...frames.values()];
        frames.clear();
        ready.forEach(callback => callback(now));
      }
    }
    function sample() {
      const lifts = marks.map(mark => 32 * ((parseFloat(mark.style.getPropertyValue('--wake')) || 1) - 1));
      return { crest: lifts.indexOf(Math.max(...lifts)), active: lifts.filter(lift => Math.abs(lift) > 1).length, lifts };
    }
    function pointer(el: HTMLElement, event: string, x: number, y = 48) {
      el.dispatchEvent(new PointerEvent(event, { pointerId: 11, button: 0, isPrimary: true, clientX: x, clientY: y, bubbles: true }));
    }
    try {
      expect(resolveSettings(custom)).toMatchObject(custom);
      expect(() => resolveSettings({ waveSpeed: 1000 })).toThrow();
      expect(() => resolveSettings({ accent: 'red;display:none' })).toThrow();
      const scrub = rail.querySelector<HTMLElement>('[data-scrub]')!;
      pointer(scrub, 'pointerdown', 100);
      tick(3);
      const pressed = sample();
      expect(pressed.active).toBeGreaterThan(3);
      for (let i = 1; i <= 10; i++) { pointer(rail, 'pointermove', 100 + i * 18); tick(); }
      const moving = sample();
      expect(moving.crest).toBeGreaterThan(pressed.crest + 6);
      expect(moving.active).toBeGreaterThan(6);
      const dotY = () => Number(rail.style.getPropertyValue('--ball-y'));
      const heights: number[] = [];
      for (const x of [340, 405, 470, 530, 450, 370, 290, 210, 130]) {
        pointer(rail, 'pointermove', x);
        tick();
        heights.push(dotY());
      }
      expect(Math.min(...heights)).toBeLessThan(7);
      pointer(rail, 'pointerup', 130);
      tick(3);
      expect(sample().lifts).not.toEqual(moving.lifts);
      tick(210);
      expect(frames.size).toBe(0);
      expect(sample().active).toBe(0);
      expect(dotY()).toBe(10);
      controller.update({ value: 36 });
      const grip = rail.querySelector<HTMLElement>('[data-pull]')!;
      pointer(grip, 'pointerdown', 201.5, 10);
      pointer(rail, 'pointermove', 109.5, 36);
      pointer(rail, 'pointerup', 109.5, 36);
      tick(4);
      const takeoff = sample();
      tick(14);
      const inFlight = sample();
      expect(inFlight.crest).toBeGreaterThan(takeoff.crest + 8);
      expect(inFlight.active).toBeGreaterThan(6);
      tick(7);
      expect(sample().active).toBeGreaterThan(2);
      controller.pause();
      expect(frames.size).toBe(0);
      expect(sample().active).toBe(0);
      controller.resume();
      controller.update({ waveStrength: 0 });
      pointer(scrub, 'pointerdown', 240);
      tick(4);
      expect(sample().active).toBe(0);
    } finally {
      controller.destroy();
      host.remove();
      raf.mockRestore();
      cancel.mockRestore();
      clock.mockRestore();
    }
  });

  it.each([1, 309.55 / 670])('keeps both launch directions and the held destination at scale %f', scale => {
    const host = document.createElement('div');
    document.body.append(host);
    const core = mount(host);
    const input = host.querySelector('input')!;
    const rail = host.querySelector<HTMLElement>('.tension-slider__rail')!;
    const pull = host.querySelector<HTMLElement>('[data-pull]')!;
    vi.spyOn(rail, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 10, 583 * scale, 96 * scale));
    function pointer(target: HTMLElement, type: string, x: number, y: number) {
      target.dispatchEvent(new PointerEvent(type, { button: 0, isPrimary: true, pointerId: 1, clientX: x * scale, clientY: y * scale, bubbles: true }));
    }
    try {
      expect(host.querySelectorAll('[data-mark]')).toHaveLength(59);
      for (const [dx, dy, expected] of [[-92, 26, 86], [-2, 2, 86], [66, 15, 45]]) {
        const previous = input.value;
        pointer(pull, 'pointerdown', 140, 80);
        pointer(rail, 'pointermove', 140 + dx, 80 + dy);
        expect(host.querySelector('[data-prediction]')?.textContent).toBe(String(expected));
        pointer(rail, 'pointerup', 140 + dx, 80 + dy);
        expect(input.value).toBe(String(expected));
        expect(host.querySelector('output')?.value).toBe(previous);
      }
      pointer(pull, 'pointerdown', 140, 80);
      pointer(rail, 'pointermove', 110, 85);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      pointer(rail, 'pointerup', 110, 85);
      expect(input.value).toBe('45');
      pointer(pull, 'pointerdown', 140, 80);
      pointer(rail, 'pointermove', 180, 85);
      pointer(rail, 'pointercancel', 180, 85);
      expect(input.value).toBe('45');
    } finally {
      core.destroy();
      host.remove();
    }
  });
});
