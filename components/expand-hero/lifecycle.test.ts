import { expect, it } from 'vitest';
import { mount } from './src/core';

it('suspends a nested hero when its scroll container leaves the viewport and cleans up', () => {
  class ElementStub extends EventTarget {
    innerHTML = '';
    parentElement: ElementStub | null = null;
    ownerDocument: unknown;
    clientTop = 0;
    complete = false;
    naturalWidth = 0;
    dataset: Record<string, string> = {};
    style = { setProperty() {} };
    children: Record<string, ElementStub> = {};
    rect = { top: 0, height: 900, width: 1000 };
    removed = false;
    querySelector(selector: string) { return this.children[selector]; }
    getBoundingClientRect() { return this.rect; }
    setAttribute() {}
    toggleAttribute() {}
    remove() { this.removed = true; }
  }
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  let intersection: IntersectionObserverCallback | undefined;
  let observerRoot: Element | Document | null | undefined;
  let observed: unknown;
  let disconnected = false;
  const media = Object.assign(new EventTarget(), { matches: false });
  const scrollport = new ElementStub();
  const win = Object.assign(new EventTarget(), {
    matchMedia: () => media,
    getComputedStyle: (el: unknown) => ({ overflowY: el === scrollport ? 'auto' : 'visible' }),
    performance: { now: () => 0 },
    requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: (id: number) => { frames.delete(id); },
    IntersectionObserver: class {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) { intersection = callback; observerRoot = options?.root; }
      observe(element: unknown) { observed = element; }
      disconnect() { disconnected = true; }
    },
  });
  const doc = Object.assign(new EventTarget(), { hidden: false, defaultView: win, body: new ElementStub() });
  const host = new ElementStub(), root = new ElementStub(), track = new ElementStub(), stage = new ElementStub();
  host.ownerDocument = doc;
  host.parentElement = scrollport;
  scrollport.parentElement = doc.body;
  host.children['[data-expand-hero]'] = root;
  root.children = { '.eh-track': track, '.eh-stage': stage, img: new ElementStub() };
  track.rect.height = 2700;
  const controller = mount(host as unknown as HTMLElement);
  const reportIntersection = (visible: boolean) => intersection!([{ isIntersecting: visible } as IntersectionObserverEntry], {} as IntersectionObserver);

  // A viewport root observes clipping through the entire ancestor chain. An
  // explicit nested scrollport would remain intersecting when moved offscreen.
  expect(observerRoot ?? null).toBeNull();
  expect(observed).toBe(track);
  track.rect.top = -900;
  win.dispatchEvent(new Event('scroll'));
  expect(frames.size).toBe(1);
  reportIntersection(false);
  const offscreenPaints = controller.inspect().paints;
  expect(frames.size).toBe(0);
  expect(controller.inspect().visible).toBe(false);
  win.dispatchEvent(new Event('scroll'));
  controller.resume();
  expect(frames.size).toBe(0);
  expect(controller.inspect().paints).toBe(offscreenPaints);

  reportIntersection(true);
  expect(frames.size).toBe(1);
  const [id, frame] = [...frames][0];
  frames.delete(id);
  frame(16);
  expect(controller.inspect().paints).toBe(offscreenPaints + 1);
  expect(controller.inspect().progress).toBeGreaterThan(0);
  controller.destroy();
  controller.destroy();
  expect(frames.size).toBe(0);
  expect(disconnected).toBe(true);
  expect(root.removed).toBe(true);
  win.dispatchEvent(new Event('scroll'));
  expect(frames.size).toBe(0);
});
