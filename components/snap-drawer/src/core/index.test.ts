// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaults, mount, releaseTarget, render, resolveSettings, resolveSnapGeometry } from './index';

describe('Snap Drawer settings and geometry', () => {
  it('copies defaults and validates paired content, required labels and safe links', () => {
    const first = resolveSettings({}); first.snapPoints[0] = '200px';
    expect(resolveSettings({}).snapPoints).toEqual(['148px', '355px', '100%']);
    expect(Object.isFrozen(defaults.snapPoints)).toBe(true);
    for (const input of [{ title: '  ' }, { groupOneTitles: [] }, { actionHref: 'javascript:alert(1)' }, { actionHref: '//evil.test' }, { actionHref: 'https://bad.test\n' }, { initialSnap: 1.5 }, { initialSnap: 3 }, { snapPoints: ['148px', '148.0px'] }, { snapPoints: ['0px', '100%'] }, { snapPoints: ['10vh', '100%'] }, { snapPoints: ['148px', '101%'] }]) expect(() => resolveSettings(input)).toThrow();
    for (const actionHref of ['', '#details', './guide', '../guide', '/guide', 'https://example.com/guide']) expect(resolveSettings({ actionHref }).actionHref).toBe(actionHref);
    expect(resolveSettings({ groupOneTitles: [], groupOneDescriptions: [] }).groupOneTitles).toEqual([]);
  });
  it('escapes content and produces readable content before enhancement', () => {
    const markup = render(resolveSettings({ title: '<img src=x onerror=alert(1)>', actionHref: '/go?a=1&b=2' }), 'example');
    expect(markup).toContain('&lt;img'); expect(markup).not.toContain('<img src=x');
    expect(markup).toContain('disabled aria-haspopup="dialog"'); expect(markup).toContain('<article'); expect(markup).not.toContain('aria-modal');
    expect(markup).toContain('href="/go?a=1&amp;b=2"');
  });
  it('preserves viewport anchor semantics at desktop, phone and tablet viewport heights', () => {
    for (const height of [1000, 844, 1024, 1112]) {
      const geometry = resolveSnapGeometry(resolveSettings({}), height);
      expect(geometry.height).toBeCloseTo(height * .97);
      expect(geometry.positions).toEqual([height - 148, height - 355, 0]);
      expect(geometry.sourceToReachable).toEqual([0, 1, 2]);
    }
  });
  it('maps configured indices through clamping, sorting and coincident positions', () => {
    const settings = resolveSettings({ maxHeight: 50, initialSnap: 1 });
    const geometry = resolveSnapGeometry(settings, 1000);
    expect(geometry.positions).toEqual([404, 0]); expect(geometry.sourceToReachable).toEqual([0, 0, 1]);
    const short = resolveSnapGeometry(settings, 80);
    expect(short.positions).toEqual([0]); expect(short.sourceToReachable).toEqual([0, 0, 0]);
    const reversed = resolveSnapGeometry(resolveSettings({ snapPoints: ['100%', '148px', '355px'] }), 1000);
    expect(reversed.sourceToReachable).toEqual([2, 0, 1]);
  });
  it('uses actual recent velocity and travel for slow, fast, reversed and paused releases', () => {
    const geometry = resolveSnapGeometry(resolveSettings({}), 1000);
    expect(releaseTarget(geometry, 620, 2, [{ y: 0, time: 0 }, { y: 620, time: 1500 }, { y: 624, time: 1560 }], 624)).toBe(1);
    expect(releaseTarget(geometry, 100, 2, [{ y: 0, time: 0 }, { y: 120, time: 60 }], 120)).toBe('closed');
    expect(releaseTarget(geometry, 600, 0, [{ y: 800, time: 0 }, { y: 680, time: 60 }], -120)).toBe(2);
    expect(releaseTarget(geometry, 600, 2, [{ y: 0, time: 0 }, { y: 600, time: 100 }, { y: 580, time: 170 }], 580)).toBe(1);
    expect(releaseTarget(geometry, 600, 2, [{ y: 0, time: 0 }, { y: 600, time: 100 }, { y: 600, time: 400 }], 600)).toBe(1);
    expect(releaseTarget(geometry, 740, 0, [], 0)).toBe(1);
    expect(releaseTarget(geometry, 748.5, 0, [], 0)).toBe(0);
  });
});

describe('Snap Drawer lifecycle', () => {
  const controllers: ReturnType<typeof mount>[] = [];
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function(this: HTMLDialogElement) { this.open = true; } });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function(this: HTMLDialogElement) { this.open = false; } });
    document.body.innerHTML = '<button id="before">Before</button><div id="one"></div><div id="two"></div>';
    document.body.style.overflow = 'auto';
  });
  afterEach(() => { controllers.splice(0).forEach(controller => controller.destroy()); vi.restoreAllMocks(); vi.useRealTimers(); document.body.innerHTML = ''; document.body.removeAttribute('style'); });
  const create = (id = 'one', duration = 0) => { const controller = mount(document.getElementById(id)!, { duration }, id); controllers.push(controller); return controller; };
  it('keeps locks across two instances and restores focus and styles after teardown', () => {
    const one = create(), two = create('two'); document.getElementById('before')!.focus();
    one.open(); two.open(); expect(document.body.style.overflow).toBe('hidden');
    one.destroy(); expect(document.body.style.overflow).toBe('hidden'); expect(document.querySelectorAll('dialog')).toHaveLength(1);
    two.close(); expect(document.body.style.overflow).toBe('auto');
    expect(document.querySelectorAll('dialog[open]')).toHaveLength(0);
  });
  it('preserves scroll and node identity on layout updates, and emits cancelable actions', () => {
    const controller = create(); controller.open(); controller.snapTo(2);
    const action = document.querySelector<HTMLButtonElement>('.sd-modal .sd-action')!;
    const scroll = document.querySelector<HTMLElement>('.sd-modal .sd-scroll')!; scroll.scrollTop = 40;
    controller.update({ duration: 0, contentWidth: 560 });
    expect(document.querySelector('.sd-modal .sd-action')).toBe(action); expect(scroll.scrollTop).toBe(40);
    document.getElementById('one')!.addEventListener('snap-drawer:action', event => event.preventDefault(), { once: true });
    action.click(); expect(document.querySelector('dialog')!.open).toBe(true);
    action.click(); expect(document.querySelector('dialog')!.open).toBe(false);
  });
  it('moves focus to the opposite snap control before disabling an endpoint', () => {
    const controller = create(); controller.open(); controller.snapTo(1);
    const expand = document.querySelector<HTMLButtonElement>('[data-sd-control="expand"]')!;
    const collapse = document.querySelector<HTMLButtonElement>('[data-sd-control="collapse"]')!;
    expand.focus(); expand.click(); expect(expand.disabled).toBe(true); expect(document.activeElement).toBe(collapse);
    collapse.click(); collapse.click(); expect(collapse.disabled).toBe(true); expect(document.activeElement).toBe(expand);
  });
  it('provides a keyboard reading stop at the highest snap even without an action', () => {
    const controller = create(); controller.update({ duration: 0, showAction: false }); controller.open();
    const scroll = document.querySelector<HTMLElement>('.sd-scroll')!, modal = document.querySelector('dialog')!;
    expect(scroll.tabIndex).toBe(-1);
    controller.snapTo(2); expect(scroll.tabIndex).toBe(0); expect(scroll.getAttribute('aria-label')).toBe('Details content');
    const box = { top: 30, bottom: 60, left: 0, right: 100, width: 100, height: 30, x: 0, y: 30, toJSON() { return {}; } };
    for (const node of modal.querySelectorAll<HTMLElement>('button,.sd-scroll')) vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(box);
    const close = modal.querySelector<HTMLButtonElement>('[data-sd-control="close"]')!; close.focus();
    modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(scroll);
    controller.snapTo(1); expect(scroll.tabIndex).toBe(-1); expect(document.activeElement).toBe(close);
  });
  it('keeps pointer focus from changing partial drag origins or downward overlay progress', () => {
    const controller = create(); controller.open();
    const scroll = document.querySelector<HTMLElement>('.sd-scroll')!, sheet = document.querySelector<HTMLElement>('.sd-sheet')!, modal = document.querySelector('dialog')!, overlay = document.querySelector<HTMLElement>('.sd-overlay')!;
    const pointer = (target: EventTarget, type: string, clientY: number, time: number) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientY });
      Object.defineProperties(event, { pointerType: { value: 'mouse' }, pointerId: { value: 1 }, timeStamp: { value: time } });
      target.dispatchEvent(event);
    };
    pointer(scroll, 'pointerdown', 940, 0); scroll.focus();
    expect(modal.dataset.snap).toBe('0'); expect(sheet.style.transform).toBe('translate3d(0,852px,0)');
    pointer(window, 'pointermove', 920, 100);
    expect(sheet.style.transform).toBe('translate3d(0,832px,0)'); expect(overlay.style.opacity).toBe('0');
    pointer(window, 'pointercancel', 920, 110); expect(modal.dataset.snap).toBe('0');
    controller.snapTo(2); pointer(scroll, 'pointerdown', 90, 200); scroll.focus();
    pointer(window, 'pointermove', 390, 600);
    expect(sheet.style.transform).toBe('translate3d(0,300px,0)'); expect(Number(overlay.style.opacity)).toBeCloseTo(1 - 300 / 645);
    pointer(window, 'pointercancel', 390, 610); expect(modal.dataset.snap).toBe('2'); expect(sheet.style.transform).toBe('translate3d(0,0px,0)');
    pointer(scroll, 'pointerdown', 90, 700); scroll.focus(); pointer(window, 'pointermove', 810, 750); pointer(window, 'pointerup', 810, 755);
    expect(modal.open).toBe(false);
  });
  it('still reveals an offscreen focused child control from a partial snap', () => {
    const controller = create(); controller.open();
    const action = document.querySelector<HTMLButtonElement>('.sd-modal .sd-action')!;
    const reveal = vi.fn(); Object.defineProperty(action, 'scrollIntoView', { configurable: true, value: reveal });
    action.focus();
    expect(document.querySelector<HTMLElement>('.sd-modal')!.dataset.snap).toBe('2'); expect(document.activeElement).toBe(action); expect(reveal).toHaveBeenCalledWith({ block: 'nearest' });
  });
  it('fits the reading viewport to custom highest snaps and clamped coincident positions', () => {
    const controller = create(); controller.update({ duration: 0, snapPoints: ['148px', '355px'] }); controller.open(); controller.snapTo(1);
    const scroll = document.querySelector<HTMLElement>('.sd-scroll')!, sheet = document.querySelector<HTMLElement>('.sd-sheet')!;
    expect(scroll.dataset.scrollable).toBe('true'); expect(scroll.tabIndex).toBe(0);
    expect(scroll.style.height).toBe('calc(100% - 645px)'); expect(sheet.style.height).toBe('970px'); expect(sheet.style.transform).toBe('translate3d(0,645px,0)');
    controller.update({ duration: 0, maxHeight: 50, snapPoints: ['148px', '355px'] });
    expect(scroll.style.height).toBe('calc(100% - 404px)'); expect(scroll.dataset.scrollable).toBe('true'); expect(sheet.style.height).toBe('500px');
    Object.defineProperty(window, 'innerHeight', { value: 80, configurable: true }); window.dispatchEvent(new Event('resize'));
    expect(scroll.style.height).toBe('calc(100% - 0px)'); expect(sheet.style.transform).toBe('translate3d(0,0px,0)');
  });
  it('restores inline style values and priorities only after the last drawer unlocks', () => {
    document.body.style.setProperty('overflow', 'scroll', 'important');
    document.body.style.setProperty('padding-right', '7px', 'important');
    document.body.style.setProperty('overscroll-behavior', 'contain', 'important');
    // jsdom drops priorities on overflow shorthands before mount; preserve its actual CSSOM state.
    // The browser lifecycle check separately asserts all three real !important priorities.
    const expected = ['overflow', 'padding-right', 'overscroll-behavior'].map(name => ({ name, value: document.body.style.getPropertyValue(name), priority: document.body.style.getPropertyPriority(name) }));
    expect(document.body.style.getPropertyPriority('padding-right')).toBe('important');
    const one = create(), two = create('two'); one.open(); two.open(); one.destroy();
    expect(document.body.style.getPropertyValue('overflow')).toBe('hidden');
    two.close();
    for (const { name, value, priority } of expected) {
      expect(document.body.style.getPropertyValue(name)).toBe(value); expect(document.body.style.getPropertyPriority(name)).toBe(priority);
    }
  });
  it('settles pause immediately, cancels timers on destroy, and retains readable fallback', () => {
    const controller = create('one', 500); controller.open();
    // jsdom focus schedules selectionchange at 0 ms; the owned settle timer is 524 ms.
    vi.advanceTimersByTime(0);
    expect(vi.getTimerCount()).toBe(1); controller.pause(); expect(vi.getTimerCount()).toBe(0);
    controller.resume(); controller.snapTo(2); expect(vi.getTimerCount()).toBe(1);
    controller.destroy(); vi.advanceTimersByTime(0); expect(vi.getTimerCount()).toBe(0); expect(document.querySelector('dialog')).toBeNull();
    expect(document.querySelector<HTMLElement>('.sd-static')!.hidden).toBe(false);
    expect(document.querySelector<HTMLButtonElement>('.sd-trigger')!.disabled).toBe(true);
  });
  it('keeps a usable static view when native dialogs are unavailable', () => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: undefined });
    const controller = create(); controller.open();
    expect(document.querySelector('dialog')).toBeNull(); expect(document.querySelector<HTMLElement>('.sd-static')!.hidden).toBe(false);
  });
});
