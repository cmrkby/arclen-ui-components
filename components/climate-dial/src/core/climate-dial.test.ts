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
    expect(render()).toContain('72 beats per minute');
    expect(defaults.mode).toBe('heart-rate');
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
    expect(render({ mode: 'climate', value: 70 })).toContain('aria-valuenow="70"');
    expect(render({ mode: 'climate', value: 70 })).toContain('70 degrees Celsius, Summer');
  });

  test('uses the Climate face and engraved sweep for each score', () => {
    const { host, other } = setup();
    other.innerHTML = render();
    const climateNeedle = other.querySelector('.cd-needle')!.getAttribute('d');
    host.innerHTML = render({ mode: 'site-audit', performanceScore: 0, accessibilityScore: 50, seoScore: 100 });
    const summaries = [...host.querySelectorAll('summary')];
    expect(summaries).toHaveLength(3);
    for (const [index, summary] of summaries.entries()) {
      expect(summary.querySelector('.cd-face .cd-heat .cd-wash')).not.toBeNull();
      expect(summary.querySelector('.cd-face .cd-rim')).not.toBeNull();
      expect(summary.querySelector('.cd-needle')?.getAttribute('d')).toBe(climateNeedle);
      expect(summary.querySelectorAll('.cd-ticks line')).toHaveLength(96);
      expect(summary.querySelectorAll('.cd-passed')).toHaveLength([1, 48, 96][index]);
      expect(summary.getAttribute('aria-label')).toContain(`${index * 50} out of 100`);
      expect(summary.querySelector('[role=slider]')).toBeNull();
    }
  });

  test('applies inclusive glow thresholds on first render and repaints an open tile in place', () => {
    const { host } = setup();
    const settings = { mode: 'site-audit', performanceScore: 49, accessibilityScore: 50, seoScore: 90 };
    const colours = () => [...host.querySelectorAll<HTMLElement>('.cd-instrument')].map(
      face => face.style.getPropertyValue('--cd-rgb').trim(),
    );
    host.innerHTML = render(settings);
    expect(colours()).toEqual(['255 61 26', '255 206 66', '54 220 128']);
    const api = mount(host, settings);
    const tile = host.querySelector('details')!;
    tile.open = true;
    const face = tile.querySelector<HTMLElement>('.cd-instrument')!;
    api.update({ auditYellowStart: 49, auditYellowColor: '#123456' });
    expect(colours()).toEqual(['18 52 86', '18 52 86', '54 220 128']);
    expect(tile.querySelector('.cd-instrument')).toBe(face);
    expect(tile.open).toBe(true);
    api.update({ auditEmberStart: 51, auditYellowStart: 60, auditGreenStart: 60 });
    expect(face.style.getPropertyValue('--cd-glow')).toBe('0');
    expect(colours()[2]).toBe('54 220 128');
    api.update({ performanceScore: 51, auditEmberColor: '#ac2010' });
    expect(colours()[0]).toBe('172 32 16');
    api.destroy();
  });

  test('keeps audit disclosures independent and preserves them when editing scores and findings', () => {
    const { host } = setup();
    host.innerHTML = render({ mode: 'site-audit', seoLabel: '<strong>Search</strong>' });
    expect(host.querySelectorAll('details')).toHaveLength(3);
    expect(host.querySelector('strong')).toBeNull();
    const api = mount(host, { mode: 'site-audit' }, { paused: true });
    const tiles = host.querySelectorAll('details');
    tiles[0].querySelector('summary')!.click();
    tiles[2].querySelector('summary')!.click();
    expect(Array.from(tiles, tile => tile.open)).toEqual([true, false, true]);
    tiles[2].querySelector('summary')!.focus();
    api.update({ seoLabel: 'Search', seoScore: 104, seoFinding: '<img> is missing alt text.', theme: 'dark' });
    expect(tiles[2].querySelector('.cd-audit-label')?.textContent).toBe('Search');
    expect(tiles[2].querySelector('.cd-audit-score')?.textContent).toBe('100');
    expect(tiles[2].querySelector('p')?.textContent).toBe('<img> is missing alt text.');
    expect(tiles[2].querySelector('img')).toBeNull();
    expect(tiles[2].open).toBe(true);
    expect(document.activeElement).toBe(tiles[2].querySelector('summary'));
    api.update({ mode: 'dimmer' });
    host.querySelector('[role=slider]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    api.update({ mode: 'site-audit' });
    expect(host.querySelectorAll('.cd-audit-score')[2].textContent).toBe('100');
    api.update({ mode: 'dimmer' });
    expect(host.querySelector('[role=slider]')?.getAttribute('aria-valuenow')).toBe('100');
    api.destroy();
    expect(host.children).toHaveLength(0);
  });

  test('switches units in place and remembers the reading for each mode', () => {
    const { host } = setup();
    const onDialChange = vi.fn();
    const onValueChange = vi.fn();
    const api = mount(host, { mode: 'climate', entrance: false }, { paused: true, onDialChange, onValueChange });
    const face = host.querySelector<HTMLElement>('[role=slider]')!;
    const shell = host.querySelector<HTMLElement>('.cd-shell')!;
    const instrument = host.querySelector<HTMLElement>('.cd-instrument')!;
    face.focus();
    api.update({ mode: 'dimmer' });
    expect(face.getAttribute('aria-valuetext')).toBe('65% brightness');
    face.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    expect(instrument.style.getPropertyValue('--cd-glow')).toBe('0');
    face.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    expect(instrument.style.getPropertyValue('--cd-glow')).toBe('1');
    expect(onDialChange).toHaveBeenLastCalledWith(100, 'dimmer');
    api.update({ mode: 'heart-rate' });
    expect(face.getAttribute('aria-valuetext')).toBe('72 beats per minute');
    expect(shell.style.getPropertyValue('--cd-beat-period')).toBe((60 / 72) + 's');
    face.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    expect(shell.style.getPropertyValue('--cd-beat-period')).toBe('0.3s');
    expect(onDialChange).toHaveBeenLastCalledWith(200, 'heart-rate');
    expect(onValueChange).not.toHaveBeenCalled();
    api.update({ mode: 'climate' });
    expect(face.getAttribute('aria-valuetext')).toBe('38 degrees Celsius, Summer');
    api.update({ mode: 'dimmer' });
    expect(face.getAttribute('aria-valuenow')).toBe('100');
    expect(document.activeElement).toBe(face);
    api.destroy();
  });

  test('renders the dimmer bulb and switches labels in place', () => {
    const { host } = setup();
    host.innerHTML = render({ mode: 'dimmer' });
    expect(host.querySelector('.cd-season .cd-bulb')).not.toBeNull();
    const api = mount(host, { mode: 'heart-rate' }, { paused: true });
    api.update({ mode: 'dimmer', brightness: 0 });
    const bulb = host.querySelector('.cd-bulb');
    expect(bulb).not.toBeNull();
    expect(host.querySelector('.cd-heart')).toBeNull();
    expect(host.querySelector('[role=slider]')?.getAttribute('aria-label')).toBe('Brightness');
    api.update({ brightness: 100 });
    expect(host.querySelector('.cd-bulb')).toBe(bulb);
    api.update({ mode: 'climate' });
    expect(host.querySelector('.cd-season')?.textContent).toBe('Summer');
    api.destroy();
  });

  test('shows the heart icon in static and interactive labels and retains the slider name', () => {
    const { host } = setup();
    host.innerHTML = render({ mode: 'heart-rate' });
    expect(host.querySelector('.cd-season svg')).not.toBeNull();
    const api = mount(host, { mode: 'dimmer' }, { paused: true });
    api.update({ mode: 'heart-rate' });
    const label = host.querySelector<HTMLElement>('.cd-season')!;
    const icon = label.querySelector('svg');
    expect(icon).not.toBeNull();
    expect(label.textContent).toBe('');
    expect(host.querySelector('[role=slider]')?.getAttribute('aria-label')).toBe('Heart rate');
    api.replay();
    api.update({ bpm: 140, showSeason: false });
    expect(label.hidden).toBe(true);
    expect(label.querySelector('svg')).toBe(icon);
    api.update({ mode: 'climate', showSeason: true });
    expect(label.querySelector('svg')).toBeNull();
    expect(label.textContent).toBe('Summer');
    api.destroy();
  });

  test('blends the heart-rate palette with the reading and preserves dimmer colour', () => {
    const { host } = setup();
    const api = mount(host, { mode: 'dimmer', dimmerGlowColor: '#18bc80' }, { paused: true });
    const rgb = () => host.querySelector<HTMLElement>('.cd-instrument')!.style.getPropertyValue('--cd-rgb');
    expect(rgb()).toBe('24 188 128');
    api.update({ mode: 'heart-rate', bpm: 40 });
    expect(rgb()).toBe('54 215 121');
    api.update({ bpm: 96 });
    expect(rgb()).toBe('184 211 94');
    api.update({ bpm: 120 });
    expect(rgb()).toBe('255 207 56');
    api.update({ bpm: 160 });
    expect(rgb()).toBe('255 153 44');
    api.update({ bpm: 200 });
    expect(rgb()).toBe('255 61 26');
    api.update({ highRateColor: '#a08060' });
    expect(rgb()).toBe('160 128 96');
    api.update({ mode: 'dimmer' });
    expect(rgb()).toBe('24 188 128');
    expect(render({ mode: 'heart-rate', bpm: 72 })).toContain('--cd-rgb:54 215 121;');
    expect(resolveSettings({ mode: 'tempo', bpm: 110, lowRateColor: 'bad' })).toMatchObject({
      mode: 'heart-rate', bpm: 110, lowRateColor: defaults.lowRateColor,
    });
    api.destroy();
  });

  test('matches Climate glow strength at corresponding dial positions', () => {
    const { host } = setup();
    const light = (settings: object) => {
      host.innerHTML = render(settings);
      const style = host.querySelector<HTMLElement>('.cd-instrument')!.style;
      return ['--cd-glow', '--cd-halo-alpha', '--cd-bloom-alpha', '--cd-rise'].map(k => style.getPropertyValue(k));
    };
    expect(defaults.beatDepth).toBe(defaults.pulseDepth);
    expect(defaults.heartPulseAmount).toBe(2);
    expect(light({ mode: 'heart-rate', bpm: 40 })).toEqual(light({ mode: 'climate', value: -9 }));
    expect(light({ mode: 'heart-rate', bpm: 200 })).toEqual(light({ mode: 'climate', value: 70 }));
    const emberBands = (settings: object) => {
      host.innerHTML = render(settings);
      const style = host.querySelector<HTMLElement>('.cd-instrument')!.style;
      return ['--cd-deep', '--cd-rgb', '--cd-tip'].map(key => style.getPropertyValue(key));
    };
    expect(emberBands({ mode: 'heart-rate', bpm: 200 })).toEqual(emberBands({ mode: 'climate', value: 70 }));
  });

  test('adjusts only the BPM-driven glow travel, including during live tuning', () => {
    const { host } = setup();
    const api = mount(host, { mode: 'heart-rate', bpm: 120 }, { paused: true });
    const shell = host.querySelector<HTMLElement>('.cd-shell')!;
    const wash = host.querySelector<HTMLElement>('.cd-instrument')!.style;
    const rise = () => Number(wash.getPropertyValue('--cd-rise')) + Number(wash.getPropertyValue('--cd-rise-offset'));
    expect(rise()).toBeCloseTo(0.835);
    api.update({ heartGlowRise: 0 });
    expect(rise()).toBeCloseTo(0.62);
    api.update({ heartGlowRise: 200 });
    expect(rise()).toBeCloseTo(1.05);
    expect(shell.style.getPropertyValue('--cd-beat-period')).toBe('0.5s');
    expect(shell.style.getPropertyValue('--cd-beat-depth')).toBe('0.015');
    api.update({ bpm: 40 });
    expect(rise()).toBeCloseTo(0.62);
    api.update({ bpm: 200 });
    expect(rise()).toBeCloseTo(1.48);
    api.update({ mode: 'climate', value: 70 });
    expect(rise()).toBeCloseTo(1.05);
    api.destroy();
  });

  test('tunes heart size and pulse independently of the glow', () => {
    const { host } = setup();
    const api = mount(host, { mode: 'heart-rate', bpm: 120, entrance: false });
    const shell = host.querySelector<HTMLElement>('.cd-shell')!;
    api.update({ heartIconSize: 180, heartPulseAmount: 0 });
    expect(shell.style.getPropertyValue('--cd-heart-size')).toBe('1.8em');
    expect(shell.style.getPropertyValue('--cd-heart-scale')).toBe('1');
    expect(shell.style.getPropertyValue('--cd-beat-depth')).toBe('0.015');
    expect(shell.hasAttribute('data-pulsing')).toBe(true);
    api.update({ heartPulseAmount: 12, pulse: false });
    expect(shell.style.getPropertyValue('--cd-heart-scale')).toBe('1.12');
    expect(shell.style.getPropertyValue('--cd-beat-depth')).toBe('0');
    expect(shell.hasAttribute('data-heart-beat')).toBe(true);
    expect(shell.hasAttribute('data-pulsing')).toBe(false);
    expect(shell.style.getPropertyValue('--cd-beat-period')).toBe('0.5s');
    api.pause();
    expect(shell.hasAttribute('data-heart-beat')).toBe(false);
    api.destroy();
  });

  test('sets the pulse from BPM independently of climate breathing and spring speed', () => {
    const { host } = setup();
    const api = mount(host, { mode: 'heart-rate', bpm: 60, pulseDepth: 0, entrance: false });
    const shell = host.querySelector<HTMLElement>('.cd-shell')!;
    expect(shell.style.getPropertyValue('--cd-beat-period')).toBe('1s');
    expect(shell.hasAttribute('data-pulsing')).toBe(true);
    api.update({ speed: 2, pulsePeriod: 8 });
    expect(shell.style.getPropertyValue('--cd-beat-period')).toBe('1s');
    api.pause();
    expect(shell.hasAttribute('data-pulsing')).toBe(false);
    api.resume();
    expect(shell.hasAttribute('data-pulsing')).toBe(true);
    api.update({ beatDepth: 0 });
    expect(shell.hasAttribute('data-pulsing')).toBe(false);
    api.update({ mode: 'dimmer', beatDepth: 80, pulseDepth: 80 });
    expect(shell.hasAttribute('data-pulsing')).toBe(false);
    expect(resolveSettings({ mode: 'invalid', bpm: -5, brightness: 500 })).toMatchObject({ mode: 'heart-rate', bpm: 40, brightness: 100 });
    api.destroy();
  });

  test('retunes the engraving, type and input without replacing the active dial', () => {
    const { host } = setup();
    const hintText = '<strong>Turn & adjust</strong>';
    host.innerHTML = render({ hintText, readingSize: 49 });
    expect(host.querySelector('.cd-band--bottom')!.textContent).toBe(hintText);
    expect(host.querySelector('strong')).toBeNull();
    const api = mount(host, { mode: 'climate', value: 38, entrance: false }, { paused: true });
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
    host.innerHTML = render({ mode: 'climate', value });
    const style = host.querySelector<HTMLElement>('.cd-instrument')!.style;
    expect(style.getPropertyValue('--cd-deep')).toBe(deep);
    expect(style.getPropertyValue('--cd-rgb')).toBe(middle);
    expect(style.getPropertyValue('--cd-tip')).toBe(tip);
  });

  test('keeps the glow settings live and suspends the pulse with the instance', () => {
    const { host } = setup();
    expect(defaults).toMatchObject({ pulsePeriod: 3.81, pulseDepth: 1.5 });
    const api = mount(host, { mode: 'climate', entrance: false, pulsePeriod: 4.2, pulseDepth: 65 });
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
    const api = mount(host, { mode: 'climate', value: 38 });
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
    const api = mount(host, { mode: 'climate', entrance: false }, { paused: true });
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
    const api = mount(host, { mode: 'climate', value: 4 }, { paused: true, onValueChange });
    const otherApi = mount(other, { mode: 'climate', value: 70 }, { paused: true });
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
    const api = mount(host, { mode: 'climate' }, { paused: true });
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
    const api = mount(host, { mode: 'climate', value: 38 });
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
