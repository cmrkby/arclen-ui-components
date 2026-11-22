// @vitest-environment jsdom
import { describe, expect, test, vi } from 'vitest';
import { defaults, mount, render, resolveSettings } from './index';

function setup() {
  document.body.innerHTML = '<main></main><aside></aside>';
  const host = document.querySelector<HTMLElement>('main')!;
  const other = document.querySelector<HTMLElement>('aside')!;
  return { host, other };
}

describe('Climate Dial', () => {
  test('resolves the declared settings and renders the degree range', () => {
    expect(resolveSettings(null)).toEqual(defaults);
    expect(
      resolveSettings({ theme: 'invalid', value: NaN, hint: 'false' }),
    ).toEqual(defaults);
    expect(
      resolveSettings({ theme: 'light', value: -24.2, hint: false }),
    ).toEqual({
      ...defaults,
      theme: 'light',
      value: -9,
      hint: false,
    });
    expect(render({ value: 70 })).toContain('aria-valuenow="70"');
    expect(render({ value: 70 })).toContain('70 degrees Celsius, Summer');
  });

  test('retunes the engraving, type and input without replacing the active dial', () => {
    const { host } = setup();
    const hintText = '<strong>Turn & adjust</strong>';
    host.innerHTML = render({ hintText, readingSize: 49 });
    expect(host.querySelector('.cd-band--bottom')!.textContent).toBe(hintText);
    expect(host.querySelector('strong')).toBeNull();
    const api = mount(host, { value: 38, entrance: false }, { paused: true });
    const face = host.querySelector<HTMLElement>('[role=slider]')!;
    const shell = host.querySelector<HTMLElement>('.cd-shell')!;
    face.focus();
    api.update({ hintText, theme: 'dark', needleAlpha: 0, readingSize: 51,
      idleStrength: 0, keyboardStep: 3, shiftStep: 9, wheelEnabled: false });
    expect(document.activeElement).toBe(face);
    expect(shell.style.getPropertyValue('--cd-reading-size')).toBe('51cqw');
    expect(shell.style.getPropertyValue('--cd-needle-alpha')).toBe('0%');
    expect(shell.style.getPropertyValue('--cd-idle-strength')).toBe('0');
    expect(shell.querySelector('.cd-band--bottom')!.textContent).toBe(hintText);
    face.dispatchEvent(new WheelEvent('wheel', { deltaY: 2, bubbles: true }));
    expect(face.getAttribute('aria-valuenow')).toBe('38');
    face.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(face.getAttribute('aria-valuenow')).toBe('41');
    face.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true }));
    expect(face.getAttribute('aria-valuenow')).toBe('32');
    api.update({ wheelEnabled: true });
    face.dispatchEvent(new WheelEvent('wheel', { deltaY: -2, bubbles: true }));
    expect(face.getAttribute('aria-valuenow')).toBe('35');
    expect(resolveSettings({ darkTop: 'url(bad)', readingSize: 300, digitTravel: -10 }))
      .toMatchObject({ darkTop: defaults.darkTop, readingSize: 55, digitTravel: 0 });
    api.destroy();
  });

  test.each([
    [-9, 'rgb(29 78 216)', '59 130 246', 'rgb(191 219 254)'],
    [15, 'rgb(138 94 102)', '175 186 168', 'rgb(214 237 203)'],
    [38, 'rgb(224 30 11)', '255 100 16', 'rgb(255 194 74)'],
    [70, 'rgb(179 7 31)', '255 61 26', 'rgb(255 179 71)'],
  ])('renders three heat bands at %i degrees', (value, deep, middle, tip) => {
    const { host } = setup();
    host.innerHTML = render({ value });
    const style = host.querySelector<HTMLElement>('.cd-instrument')!.style;
    expect(style.getPropertyValue('--cd-deep')).toBe(deep);
    expect(style.getPropertyValue('--cd-rgb')).toBe(middle);
    expect(style.getPropertyValue('--cd-tip')).toBe(tip);
  });

  test('keeps the glow settings live and suspends the pulse with the instance', () => {
    const { host } = setup();
    expect(defaults).toMatchObject({ pulsePeriod: 3.81, pulseDepth: 1.5 });
    const api = mount(host, { entrance: false, pulsePeriod: 4.2, pulseDepth: 65 });
    const shell = host.querySelector<HTMLElement>('[data-climate-dial]')!;
    const season = shell.querySelector<HTMLElement>('.cd-season')!;
    expect(shell.hasAttribute('data-pulsing')).toBe(true);
    expect(shell.style.getPropertyValue('--cd-pulse-period')).toBe('4.2s');
    expect(shell.style.getPropertyValue('--cd-pulse-depth')).toBe('0.65');
    api.pause();
    expect(shell.hasAttribute('data-pulsing')).toBe(false);
    api.resume();
    expect(shell.hasAttribute('data-pulsing')).toBe(true);
    api.update({ pulse: false, bloomWidth: 120, showSeason: false });
    expect(shell.hasAttribute('data-pulsing')).toBe(false);
    expect(shell.style.getPropertyValue('--cd-bloom-width')).toBe('120%');
    expect(season.hidden).toBe(true);
    api.update({ pulse: true, glow: 0 });
    expect(shell.hasAttribute('data-pulsing')).toBe(false);
    expect(resolveSettings({ pulsePeriod: 0, pulseDepth: 150 }).pulseDepth).toBe(85);
    expect(resolveSettings({ pulsePeriod: 0 }).pulsePeriod).toBe(1.2);
    api.destroy();
  });

  test('defers replay offscreen and settles on pause and reduced motion', () => {
    const { host } = setup();
    const query = Object.assign(new EventTarget(), { matches: false });
    let visibility: (entries: { isIntersecting: boolean }[]) => void = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal('matchMedia', () => query);
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: typeof visibility) { visibility = callback; }
      observe() {}
      disconnect = disconnect;
    });
    const api = mount(host, { value: 38 });
    const shell = host.querySelector<HTMLElement>('.cd-shell')!;
    const reading = () => shell.querySelector('.cd-value')!.textContent;
    try {
      expect(shell.hasAttribute('data-static')).toBe(true);
      expect(reading()).toBe('38');
      api.replay();
      visibility([{ isIntersecting: true }]);
      expect(reading()).toBe('−9');
      api.pause();
      expect(reading()).toBe('38');
      expect(shell.querySelector('.cd-season')!.textContent).toBe('Summer');
      api.resume();
      expect(reading()).toBe('−9');
      query.matches = true;
      query.dispatchEvent(new Event('change'));
      api.replay();
      expect(reading()).toBe('38');
      expect(shell.hasAttribute('data-mounted')).toBe(false);
      expect(shell.hasAttribute('data-pulsing')).toBe(false);
      api.update({ value: 14 });
      expect(shell.querySelector('.cd-season')!.textContent).toBe('Autumn');
    } finally {
      api.destroy();
      vi.unstubAllGlobals();
    }
    expect(disconnect).toHaveBeenCalledOnce();
  });

  test('validates appearance and spring controls and updates a paused instrument', () => {
    const { host } = setup();
    const api = mount(host, { entrance: false }, { paused: true });
    expect(
      resolveSettings({ glow: 99, speed: -10, coldAccent: 'url(invalid)' }),
    ).toMatchObject({ glow: 2, speed: 0.4, coldAccent: defaults.coldAccent });
    api.update({ size: 420, warmAccent: '#ba3311', value: 70, glow: 0 });
    expect(
      host
        .querySelector<HTMLElement>('.cd-shell')!
        .style.getPropertyValue('--cd-size'),
    ).toBe('420px');
    const style = host.querySelector<HTMLElement>('.cd-instrument')!.style;
    expect(style.getPropertyValue('--cd-rgb')).toBe('186 51 17');
    expect(style.getPropertyValue('--cd-halo-alpha')).toBe('0');
    api.destroy();
  });
  test('emits the season for user changes and applies updates quietly across instances', () => {
    const { host, other } = setup();
    const onValueChange = vi.fn();
    const api = mount(host, { value: 4 }, { paused: true, onValueChange });
    const otherApi = mount(other, { value: 70 }, { paused: true });
    const face = host.querySelector<HTMLElement>('[role="slider"]')!;
    const eventHandler = vi.fn();
    host.addEventListener('temperaturechange', eventHandler);
    const press = (key: string, shiftKey = false) => {
      face.dispatchEvent(
        new window.KeyboardEvent('keydown', {
          key,
          shiftKey,
          cancelable: true,
        }),
      );
    };

    press('ArrowRight');
    expect(onValueChange).toHaveBeenLastCalledWith(5, 'Autumn');
    press('ArrowUp', true);
    expect(onValueChange).toHaveBeenLastCalledWith(10, 'Autumn');
    api.update({ value: 15, theme: 'light', hint: false });
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(
      host.querySelector('[data-climate-dial]')?.getAttribute('data-theme'),
    ).toBe('light');
    expect(host.querySelector('.cd-band--bottom')).toHaveProperty(
      'hidden',
      true,
    );
    press('ArrowUp');
    expect(onValueChange).toHaveBeenLastCalledWith(16, 'Spring');
    api.update({ value: 25 });
    press('ArrowUp');
    expect(onValueChange).toHaveBeenLastCalledWith(26, 'Summer');
    expect(eventHandler.mock.lastCall?.[0].detail).toEqual({
      value: 26,
      season: 'Summer',
    });
    press('Home');
    expect(face.getAttribute('aria-valuetext')).toBe(
      '-9 degrees Celsius, Winter',
    );
    expect(other.querySelector('.cd-value')?.textContent).toBe('70');

    api.destroy();
    api.destroy();
    otherApi.destroy();
    expect(host.childElementCount + other.childElementCount).toBe(0);
  });

  test('uses pointer angle and requires focus before consuming the wheel', () => {
    const { host } = setup();
    const api = mount(host, {}, { paused: true });
    const face = host.querySelector<HTMLElement>('[role="slider"]')!;
    face.getBoundingClientRect = () => new window.DOMRect(0, 0, 200, 200);
    const wheel = () =>
      new window.WheelEvent('wheel', { deltaY: -1, cancelable: true });
    expect(face.dispatchEvent(wheel())).toBe(true);
    face.dispatchEvent(
      new window.PointerEvent('pointerdown', {
        pointerId: 1,
        isPrimary: true,
        clientX: 100,
        clientY: 20,
      }),
    );
    expect(face.getAttribute('aria-valuenow')).toBe('31');
    expect(face.dispatchEvent(wheel())).toBe(false);
    expect(face.getAttribute('aria-valuenow')).toBe('32');
    face.dispatchEvent(
      new window.PointerEvent('pointercancel', { pointerId: 1 }),
    );
    expect(host.querySelector('[data-tracking]')).toBeNull();
    api.destroy();
  });
  test('renders 96 engraved marks and bounds the semantic target during a spring reversal', () => {
    const { host } = setup();
    const frames = new Map<number, FrameRequestCallback>();
    let time = 0;
    let id = 0;
    const clock = vi
      .spyOn(window.performance, 'now')
      .mockImplementation(() => time);
    const raf = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((fn) => {
        frames.set(++id, fn);
        return id;
      });
    const cancel = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation((key) => {
        frames.delete(key);
      });
    const api = mount(host, { value: 38 });
    const press = (key: string) =>
      host
        .querySelector('.cd-face')!
        .dispatchEvent(new window.KeyboardEvent('keydown', { key }));
    const step = (n: number) => {
      const values: number[] = [];
      for (let i = 0; i < n; i++) {
        time += 1000 / 60;
        const callbacks = [...frames.values()];
        frames.clear();
        callbacks.forEach((fn) => fn(time));
        values.push(
          Number(
            host.querySelector('.cd-value')!.textContent!.replace('−', '-'),
          ),
        );
      }
      return values;
    };
    try {
      expect(host.querySelectorAll('.cd-scale line')).toHaveLength(96);
      expect(host.querySelector('.cd-value')!.textContent).toBe('−9');
      const arrival = step(75);
      expect(new Set(arrival).size).toBeGreaterThan(12);
      expect(Math.max(...arrival)).toBeGreaterThanOrEqual(51);
      expect(Math.max(...arrival)).toBeLessThanOrEqual(53);
      expect(arrival.at(-1)).toBe(38);
      api.replay();
      expect(host.querySelector('.cd-value')!.textContent).toBe('−9');
      step(26);
      const drum = host.querySelector<HTMLElement>('.cd-unit .cd-drum')!;
      expect(drum.textContent).toMatch(/^\d$/);
      expect(drum.childNodes.length).toBe(1);
      step(65);
      press('Home');
      expect(
        host.querySelector('.cd-face')?.getAttribute('aria-valuenow'),
      ).toBe('-9');
      const cold = step(75);
      expect(Math.min(...cold)).toBe(-9);
      expect(cold.at(-1)).toBe(-9);
      press('End');
      const warm = step(75);
      expect(Math.max(...warm)).toBe(70);
      expect(warm.at(-1)).toBe(70);
      step(60);
      expect(frames.size).toBe(0);
    } finally {
      api.destroy();
      clock.mockRestore();
      raf.mockRestore();
      cancel.mockRestore();
    }
  });
});
