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
  it('validates beam controls and carries adaptive and explicit palettes into portable markup', () => {
    expect(defaults.beamPalette).toBe('adaptive'); expect(defaults.beamRestOpacity).toBe(0); expect(defaults.beamHoverOpacity).toBe(.9);
    const adaptive = render(resolveSettings({}));
    expect(defaults.beamCoreHighlight).toBe(.85); expect(adaptive).toContain('--sd-beam-core-highlight:85%');
    expect(adaptive).toContain('--sd-beam-glow:10px'); expect(adaptive).toContain('--sd-beam-blur:4px');
    expect(render(resolveSettings({ beamCoreHighlight: 0 }))).toContain('--sd-beam-core-highlight:0%');
    expect(render(resolveSettings({ beamCoreHighlight: 1 }))).toContain('--sd-beam-core-highlight:100%');
    expect(adaptive).toContain('--sd-beam-light1:#003dff'); expect(adaptive).toContain('--sd-beam-dark1:#003dff');
    expect(defaults.beamDarkIntensity).toBe(.85); expect(adaptive).toContain('--sd-beam-light-intensity:1'); expect(adaptive).toContain('--sd-beam-dark-intensity:0.85');
    expect(render(resolveSettings({ beamPalette: 'arclen' }))).toContain('--sd-beam-light1:#f54e00');
    expect(render(resolveSettings({ beamPalette: 'silver' }))).toContain('--sd-beam-light1:#a1a1aa');
    expect(render(resolveSettings({ theme: 'custom', surfaceColor: '#101010' }))).toContain('--sd-beam-light1:#003dff');
    expect(render(resolveSettings({ theme: 'custom', surfaceColor: '#101010', beamDarkIntensity: .4 }))).toContain('--sd-beam-light-intensity:0.4');
    expect(render(resolveSettings({ theme: 'custom', surfaceColor: '#fafafa', beamDarkIntensity: .4 }))).toContain('--sd-beam-light-intensity:1');
    expect(render(resolveSettings({ theme: 'dark', beamPalette: 'silver', beamDarkIntensity: 1 }))).toContain('--sd-beam-dark-intensity:1');
    expect(render(resolveSettings({ theme: 'system', beamDarkIntensity: 0 }))).toContain('--sd-beam-dark-intensity:0');
    expect(render(resolveSettings({ theme: 'custom', surfaceColor: '#fafafa' }))).toContain('--sd-beam-light1:#003dff');
    for (const input of [{ beamCoreHighlight: -.01 }, { beamCoreHighlight: 1.01 }, { beamDarkIntensity: -.01 }, { beamDarkIntensity: 1.01 }, { beamHoverOpacity: 1.01 }, { beamRestOpacity: -.1 }, { beamEndFade: 51 }, { beamWidth: 0 }, { beamActivationDistance: 73 }, { beamFadeDuration: -1 }, { beamLineThickness: 0 }, { beamGlowBlur: 13 }, { beamPalette: 'rainbow' }, { beamColor1: 'red' }, { beamEnabled: 'yes' }, { beamEasing: 'spring' }]) expect(() => resolveSettings(input)).toThrow();
    expect(resolveSettings({ beamGlowThickness: 0, beamGlowBlur: 0, beamActivationDistance: 0, beamFadeDuration: 0, beamEndFade: 50 }).beamFadeDuration).toBe(0);
  });
  it('validates handle controls and exports contrasting adaptive and custom colors', () => {
    expect(defaults.handleFeedbackEnabled).toBe(true); expect(defaults.handlePalette).toBe('adaptive');
    const markup = render(resolveSettings({}));
    expect(markup).toContain('--sd-handle-light-hover:#3b82f6'); expect(markup).toContain('--sd-handle-dark-drag:#f5faff');
    expect(render(resolveSettings({ theme: 'custom', surfaceColor: '#101010' }))).toContain('--sd-handle-light-hover:#93c5fd');
    const custom = render(resolveSettings({ handlePalette: 'custom', handleHoverColor: '#112233', handleDragColor: '#abcdef', handleFeedbackDuration: 0 }));
    expect(custom).toContain('--sd-handle-light-hover:#112233'); expect(custom).toContain('--sd-handle-dark-drag:#abcdef'); expect(custom).toContain('--sd-handle-duration:0ms');
    for (const input of [{ handlePalette: 'bad' }, { handleHoverColor: 'red' }, { handleFeedbackDuration: -1 }, { handleFeedbackDuration: 501 }, { handleFeedbackEnabled: 1 }]) expect(() => resolveSettings(input)).toThrow();
  });
  it('escapes content and produces readable content before enhancement', () => {
    const markup = render(resolveSettings({ title: '<img src=x onerror=alert(1)>', actionHref: '/go?a=1&b=2' }), 'example');
    expect(markup).toContain('&lt;img'); expect(markup).not.toContain('<img src=x');
    expect(markup).toContain('disabled aria-haspopup="dialog"'); expect(markup).toContain('<article'); expect(markup).not.toContain('aria-modal');
    expect(markup).toContain('href="/go?a=1&amp;b=2"');
  });
  it('keeps optional social content opt-in and the product details readable without enhancement', () => {
    const host = document.createElement('div'); host.innerHTML = render(resolveSettings({}));
    expect(host.querySelector('.sd-rating')).toBeNull(); expect(host.querySelector('.sd-quote')).toBeNull();
    expect(host.querySelector('h2')?.textContent).toBe('Arc desk lamp');
    expect(host.querySelector('.sd-metadata')?.textContent).toBe('$128 USD · In stock');
    expect([...host.querySelectorAll('.sd-group h3')].map(node => node.textContent)).toEqual(['Specifications', 'Delivery & returns']);
    expect(host.querySelector('.sd-action')?.tagName).toBe('BUTTON');
    host.innerHTML = render(resolveSettings({ showRating: true, rating: 3, showQuote: true, quote: '<Optional note>', quoteAttribution: 'Your attribution' }));
    expect(host.querySelector('.sd-rating')?.getAttribute('aria-label')).toBe('3 out of 5 stars');
    expect(host.querySelector('.sd-quote blockquote')?.textContent).toBe('<Optional note>');
    expect(host.querySelector('.sd-quote figcaption')?.textContent).toBe('Your attribution');
  });
  it('accepts portable image sources and rejects active or ambiguous URLs', () => {
    for (const imageUrl of ['', './lamp.webp', '/images/lamp.webp', 'images/lamp.webp', 'https://example.com/lamp.webp?v=2', 'data:image/webp;base64,AAAA', 'blob:https://example.com/image-id']) expect(resolveSettings({ imageUrl }).imageUrl).toBe(imageUrl);
    for (const imageUrl of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', '//example.com/lamp.webp', 'https://user:secret@example.com/lamp.webp', '../private.webp', 'images/../private.webp', 'https://example.com/\nimage.webp', 'http://example.com/lamp.webp', 'file:///lamp.webp']) expect(() => resolveSettings({ imageUrl })).toThrow();
    expect(() => resolveSettings({ imageAlt: 'a'.repeat(301) })).toThrow();
    expect(resolveSettings({ imageAlt: '' }).imageAlt).toBe('');
  });
  it('omits disabled images and keeps the no-JavaScript content text-only', () => {
    const absent = render(resolveSettings({ showImage: false, imageUrl: 'https://example.com/private.webp' }));
    expect(absent).not.toContain('class="sd-image '); expect(absent).not.toContain('private.webp');
    const markup = render(resolveSettings({ imageUrl: '/images/lamp.webp', imageAlt: '<Lamp> "on"' }));
    expect(markup).toContain('data-sd-src="/images/lamp.webp"'); expect(markup).not.toContain('<noscript><img');
    expect(markup).toContain('<noscript><style>.sd .sd-image{display:none!important}.sd .sd-product-header{display:block}</style></noscript>');
    expect(markup).toContain('Arc desk lamp'); expect(markup).toContain('Specifications'); expect(markup).toContain('Delivery &amp; returns');
    expect(markup).toContain('aria-label="&lt;Lamp&gt; &quot;on&quot;"'); expect(markup).not.toContain('aria-label="<Lamp>');
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
  it('opens on the handle and keeps a keyboard dismissal path when the handle is hidden', () => {
    const controller = create();
    const trigger = document.querySelector<HTMLButtonElement>('.sd-trigger')!;
    trigger.focus(); controller.open();
    const modal = document.querySelector<HTMLDialogElement>('dialog')!, handle = modal.querySelector<HTMLElement>('.sd-handle')!, sheet = modal.querySelector<HTMLElement>('.sd-sheet')!;
    expect(document.activeElement).toBe(handle);
    expect(modal.querySelector('[data-sd-control="close"]')).toBeNull();
    controller.update({ duration: 0, showHandle: false });
    expect(document.activeElement).toBe(sheet);
    expect(handle.tabIndex).toBe(-1);
    modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(sheet);
    modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(modal.open).toBe(false); expect(document.activeElement).toBe(trigger);
    controller.open(); expect(document.activeElement).toBe(sheet);
  });
  it('keeps explicit pointer dismissal when drag and overlay dismissal are both disabled', () => {
    const controller = create(); controller.update({ duration: 0, showHandle: false, showAction: false, dragEnabled: false, dismissOnOverlay: false }); controller.open();
    const modal = document.querySelector<HTMLDialogElement>('dialog')!, close = modal.querySelector<HTMLButtonElement>('.sd-dismiss')!;
    expect(close.hidden).toBe(false); close.click(); expect(modal.open).toBe(false);
    controller.update({ duration: 0, dragEnabled: false, dismissOnOverlay: true }); controller.open(); expect(close.hidden).toBe(true);
  });
  it('enters the visible tab order from either end when the hidden-handle sheet has focus', () => {
    const controller = create(); controller.update({ duration: 0, showHandle: false }); controller.open(); controller.snapTo(2);
    const modal = document.querySelector<HTMLDialogElement>('dialog')!, sheet = modal.querySelector<HTMLElement>('.sd-sheet')!, scroll = modal.querySelector<HTMLElement>('.sd-scroll')!, action = modal.querySelector<HTMLElement>('.sd-action')!;
    const box = (top: number, bottom: number) => ({ top, bottom, left: 0, right: 400, width: 400, height: bottom - top, x: 0, y: top, toJSON() {} });
    vi.spyOn(scroll, 'getBoundingClientRect').mockReturnValue(box(30, 1000));
    vi.spyOn(action, 'getBoundingClientRect').mockReturnValue(box(200, 248));
    // jsdom's grouped selector can return the ancestor after its child. Native
    // Chromium covers this order separately; normalize only the unit DOM shim.
    const query = modal.querySelectorAll.bind(modal);
    vi.spyOn(modal, 'querySelectorAll').mockImplementation(selector => {
      const nodes = query(selector);
      return selector.includes('button:not(:disabled)')
        ? [...nodes].sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1) as unknown as NodeListOf<Element>
        : nodes;
    });
    sheet.focus(); modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(action);
    sheet.focus(); modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(scroll);
  });
  it('ignores a queued native close event after a new opening', () => {
    const controller = create(); document.querySelector<HTMLButtonElement>('.sd-trigger')!.focus(); controller.open(); controller.close(); controller.open();
    const modal = document.querySelector<HTMLDialogElement>('dialog')!;
    modal.dispatchEvent(new Event('close'));
    expect(modal.open).toBe(true); expect(document.activeElement).toBe(modal.querySelector('.sd-handle'));
    modal.open = false; modal.dispatchEvent(new Event('close'));
    expect(document.activeElement).toBe(document.querySelector('.sd-trigger'));
  });
  it('returns focus to the surviving drawer handle or sheet when a peer closes', () => {
    const one = create(), two = create('two');
    one.open(); two.open(); two.close();
    expect(document.activeElement).toBe(document.querySelector('.sd-handle'));
    one.update({ duration: 0, showHandle: false }); two.open(); two.close();
    expect(document.activeElement).toBe(document.querySelector('.sd-sheet'));
  });
  it('lights only near the edge for hover pointers and clears stale light across lifecycle changes', () => {
    const controller = create(); controller.open();
    const modal = document.querySelector<HTMLElement>('.sd-modal')!, sheet = modal.querySelector<HTMLElement>('.sd-sheet')!;
    vi.spyOn(sheet, 'getBoundingClientRect').mockReturnValue({ left: 100, right: 500, top: 300, bottom: 900, width: 400, height: 600, x: 100, y: 300, toJSON() {} });
    const hover = (x: number, y: number, pointerType = 'mouse') => {
      const event = new Event('pointermove', { bubbles: true });
      Object.assign(event, { clientX: x, clientY: y, pointerType, buttons: 0 }); modal.dispatchEvent(event);
    };
    const intensity = () => Number(sheet.style.getPropertyValue('--sd-beam-strength'));
    expect(intensity()).toBe(0);
    hover(220, 300); expect(intensity()).toBeCloseTo(.9); expect(sheet.hasAttribute('data-beam-hover')).toBe(true);
    hover(300, 288); expect(intensity()).toBeCloseTo(.9); expect(sheet.style.getPropertyValue('--sd-beam-x')).toBe('');
    hover(480, 312, 'pen'); expect(intensity()).toBeCloseTo(.9);
    for (const [x, y, type] of [[300, 313, 'mouse'], [300, 287, 'mouse'], [99, 300, 'mouse'], [501, 300, 'mouse'], [220, 300, 'touch']] as const) {
      hover(x, y, type); expect(intensity()).toBe(0);
    }
    hover(220, 300); modal.dispatchEvent(new Event('pointerleave')); expect(intensity()).toBe(0); expect(sheet.hasAttribute('data-beam-hover')).toBe(false);
    hover(220, 300); window.dispatchEvent(new Event('blur')); expect(intensity()).toBe(0);
    hover(220, 300); controller.pause(); expect(intensity()).toBe(0);
    hover(220, 300); expect(intensity()).toBe(0);
    controller.resume(); expect(intensity()).toBe(0);
    hover(220, 300); controller.snapTo(1); expect(intensity()).toBe(0);
    hover(220, 300); controller.close(); expect(intensity()).toBe(0);
    controller.open(); expect(intensity()).toBe(0);
    hover(220, 300); controller.destroy(); hover(220, 300); expect(intensity()).toBe(0);
  });
  it('clears edge feedback when the document becomes hidden', () => {
    const controller = create(); controller.open();
    const modal = document.querySelector<HTMLElement>('.sd-modal')!, sheet = modal.querySelector<HTMLElement>('.sd-sheet')!;
    sheet.style.setProperty('--sd-beam-strength', '.9');
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(sheet.style.getPropertyValue('--sd-beam-strength')).toBe('');
    expect(sheet.hasAttribute('data-beam-inactive')).toBe(true);
  });
  it('updates beam controls without closing, moving focus or resetting the current snap', () => {
    const controller = create(); controller.open(); controller.snapTo(1);
    const modal = document.querySelector<HTMLElement>('.sd-modal')!, handle = modal.querySelector<HTMLElement>('.sd-handle')!;
    handle.focus(); const snap = modal.dataset.snap;
    controller.update({ duration: 0, beamPalette: 'custom', beamColor1: '#112233', beamHoverOpacity: .2, beamWidth: 75, beamDarkIntensity: .55, beamCoreHighlight: .6 });
    expect(modal.hasAttribute('open')).toBe(true); expect(document.activeElement).toBe(handle); expect(modal.dataset.snap).toBe(snap);
    expect(modal.style.getPropertyValue('--sd-beam-light1')).toBe('#112233');
    expect(modal.style.getPropertyValue('--sd-beam-core-highlight')).toBe('60%');
    expect(modal.style.getPropertyValue('--sd-beam-dark-intensity')).toBe('0.55');
    expect(modal.style.getPropertyValue('--sd-beam-hover')).toBe('0.2'); expect(modal.style.getPropertyValue('--sd-beam-width')).toBe('75%');
    controller.update({ duration: 0, beamEnabled: false, beamRestOpacity: 1 });
    expect(modal.dataset.beamEnabled).toBe('false'); expect(document.activeElement).toBe(handle);
    const sheet = modal.querySelector<HTMLElement>('.sd-sheet')!;
    const event = new Event('pointermove', { bubbles: true }); Object.assign(event, { clientX: 0, clientY: 0, pointerType: 'mouse', buttons: 0 }); modal.dispatchEvent(event);
    expect(sheet.hasAttribute('data-beam-inactive')).toBe(true); expect(sheet.style.getPropertyValue('--sd-beam-strength')).toBe('');
    controller.update({ duration: 0 }); expect(modal.dataset.beamEnabled).toBe('true'); expect(modal.style.getPropertyValue('--sd-beam-rest')).toBe('0');
  });
  it('updates handle feedback independently without resetting the open drawer or scroll', () => {
    const controller = create(); controller.open(); controller.snapTo(2);
    const modal = document.querySelector<HTMLElement>('.sd-modal')!, handle = modal.querySelector<HTMLElement>('.sd-handle')!, scroll = modal.querySelector<HTMLElement>('.sd-scroll')!;
    handle.focus(); scroll.scrollTop = 125; const snap = modal.dataset.snap;
    controller.update({ duration: 0, beamEnabled: false, handlePalette: 'custom', handleHoverColor: '#112233', handleFeedbackDuration: 80 });
    expect(modal.dataset.handleFeedback).toBe('true'); expect(modal.dataset.beamEnabled).toBe('false');
    expect(modal.style.getPropertyValue('--sd-handle-light-hover')).toBe('#112233'); expect(modal.style.getPropertyValue('--sd-handle-duration')).toBe('80ms');
    expect(document.activeElement).toBe(handle); expect(scroll.scrollTop).toBe(125); expect(modal.dataset.snap).toBe(snap);
    controller.update({ duration: 0, handleFeedbackEnabled: false }); expect(modal.dataset.handleFeedback).toBe('false'); expect(document.activeElement).toBe(handle);
    expect(modal.hasAttribute('open')).toBe(true); expect(scroll.scrollTop).toBe(125);
  });
  it('keeps closed media inert and instantiates each image only when needed', () => {
    const controller = create(); const modal = document.querySelector('.sd-modal')!;
    expect(document.querySelectorAll('img')).toHaveLength(0);
    expect(modal.querySelectorAll('.sd-image-template')).toHaveLength(2);
    const template = modal.querySelector<HTMLTemplateElement>('.sd-image-large .sd-image-template')!;
    expect(template.content.querySelector('img')!.hasAttribute('src')).toBe(false);
    controller.open();
    const thumb = modal.querySelector<HTMLImageElement>('.sd-image-thumb img[data-sd-src]')!, thumbFrame = thumb.parentElement!;
    expect(thumb.getAttribute('src')).toBe(thumb.dataset.sdSrc); expect(modal.querySelector('.sd-image-large img')).toBeNull();
    controller.snapTo(1); expect(modal.querySelector('.sd-image-large img')).toBeNull();
    controller.snapTo(2); const image = modal.querySelector<HTMLImageElement>('.sd-image-large img[data-sd-src]')!;
    expect(image.getAttribute('src')).toBe(image.dataset.sdSrc);
    image.dispatchEvent(new Event('load')); expect(image.hidden).toBe(false); expect(image.parentElement!.dataset.imageState).toBe('loaded');
    expect(image.parentElement!.hasAttribute('role')).toBe(false); expect(image.alt).toBe(defaults.imageAlt);
    controller.close(); expect(thumb.hasAttribute('src')).toBe(false); expect(thumb.isConnected).toBe(false); expect(thumbFrame.dataset.imageState).toBe('idle');
    expect(modal.querySelectorAll('img')).toHaveLength(1); expect(image.isConnected).toBe(true);
    controller.open(); expect(modal.querySelector('.sd-image-thumb img')).not.toBe(thumb);
  });
  it('replaces pending images safely, preserves failed-image frames and cleans up on destroy', () => {
    const controller = create(); controller.open(); controller.snapTo(2);
    const stale = document.querySelector<HTMLImageElement>('.sd-modal .sd-image-large img[data-sd-src]')!;
    controller.update({ duration: 0, imageUrl: '/replacement.webp', imageAlt: 'Replacement lamp' });
    const current = document.querySelector<HTMLImageElement>('.sd-modal .sd-image-large img[data-sd-src]')!, currentFrame = current.parentElement!;
    expect(current).not.toBe(stale); expect(current.getAttribute('src')).toBe('/replacement.webp'); expect(stale.hasAttribute('src')).toBe(false);
    stale.dispatchEvent(new Event('error')); expect(current.parentElement!.dataset.imageState).toBe('loading');
    current.dispatchEvent(new Event('error')); expect(current.hidden).toBe(true); expect(current.isConnected).toBe(false); expect(currentFrame.dataset.imageState).toBe('error');
    expect(currentFrame.getAttribute('aria-label')).toBe('Image unavailable: Replacement lamp');
    expect(currentFrame.querySelector<HTMLElement>('.sd-image-note')!.hidden).toBe(false);
    controller.snapTo(2); expect(currentFrame.querySelector('img')).toBeNull();
    controller.update({ duration: 0, imageUrl: '/pending.webp' });
    const pending = document.querySelector<HTMLImageElement>('.sd-modal .sd-image-large img[data-sd-src]')!, frame = pending.parentElement!;
    controller.destroy(); expect(pending.hasAttribute('src')).toBe(false); pending.dispatchEvent(new Event('load'));
    expect(frame.dataset.imageState).toBe('idle'); expect(pending.hidden).toBe(true);
    expect(document.querySelectorAll('img')).toHaveLength(0);
  });
  it('hydrates replacement images at custom highest snaps and removes both when disabled', () => {
    const controller = create(); controller.update({ duration: 0, snapPoints: ['148px', '355px'] }); controller.open(); controller.snapTo(1);
    expect(document.querySelector<HTMLImageElement>('.sd-modal .sd-image-large img[data-sd-src]')!.hasAttribute('src')).toBe(true);
    controller.update({ duration: 0, showImage: false }); expect(document.querySelector('.sd-modal .sd-image')).toBeNull();
    controller.close(); controller.update({ duration: 0, imageUrl: '/new.webp' });
    expect(document.querySelectorAll('.sd-modal img')).toHaveLength(0);
  });
  it('shows the drag affordance by default and keeps its visibility configurable', () => {
    const controller = create(); const handle = document.querySelector<HTMLElement>('.sd-modal .sd-handle')!;
    expect(defaults.showHandle).toBe(true); expect(handle.hidden).toBe(false); expect(handle.getAttribute('role')).toBe('slider'); expect(handle.tabIndex).toBe(0);
    controller.update({ duration: 0, showHandle: false }); expect(handle.dataset.visible).toBe('false'); expect(handle.tabIndex).toBe(-1);
    controller.update({ duration: 0 }); expect(handle.dataset.visible).toBe('true');
  });
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
    document.getElementById('one')!.addEventListener('snap-drawer:action', event => {
      expect((event as CustomEvent).detail.settings).toMatchObject({ title: 'Arc desk lamp', actionLabel: 'Choose this lamp', actionHref: '' });
      event.preventDefault();
    }, { once: true });
    action.click(); expect(document.querySelector('dialog')!.open).toBe(true);
    action.click(); expect(document.querySelector('dialog')!.open).toBe(false);
  });
  it('changes reachable views with the focused handle and keeps focus at endpoints', () => {
    const controller = create(); controller.open();
    const handle = document.querySelector<HTMLElement>('.sd-handle')!, modal = document.querySelector('dialog')!;
    expect(modal.querySelectorAll('[data-sd-control]')).toHaveLength(0);
    expect(handle.getAttribute('aria-label')).toBe('Drawer height');
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    const key = (name: string) => { const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }); handle.dispatchEvent(event); expect(event.defaultPrevented).toBe(true); };
    handle.focus(); key('ArrowUp'); expect(modal.dataset.reachableSnap).toBe('1');
    expect(handle.getAttribute('aria-valuetext')).toBe('View 2 of 3');
    key('End'); key('ArrowUp'); expect(handle.getAttribute('aria-valuenow')).toBe('3');
    key('ArrowLeft'); expect(handle.getAttribute('aria-valuenow')).toBe('2');
    key('Home'); key('ArrowDown'); expect(handle.getAttribute('aria-valuenow')).toBe('1');
    expect(document.activeElement).toBe(handle); expect(modal.open).toBe(true);
    controller.update({ duration: 0, snapPoints: ['100%', '148px', '355px'], maxHeight: 50 });
    key('End'); expect(handle.getAttribute('aria-valuemax')).toBe('2'); expect(modal.dataset.snap).toBe('0');
    key('Home'); expect(modal.dataset.snap).toBe('1');
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); expect(modal.open).toBe(false);
  });
  it('keeps pointer dragging available on the keyboard handle', () => {
    const controller = create(); controller.open();
    const handle = document.querySelector<HTMLElement>('.sd-handle')!, sheet = document.querySelector<HTMLElement>('.sd-sheet')!;
    const pointer = (target: EventTarget, type: string, y: number) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientY: y });
      Object.defineProperties(event, { pointerType: { value: 'mouse' }, pointerId: { value: 7 } }); target.dispatchEvent(event);
    };
    pointer(handle, 'pointerdown', 940); pointer(window, 'pointermove', 920);
    expect(sheet.dataset.dragging).toBe(''); expect(sheet.style.transform).toBe('translate3d(0,832px,0)');
    pointer(window, 'pointercancel', 920); expect(sheet.hasAttribute('data-dragging')).toBe(false);
  });
  it('provides a keyboard reading stop at the highest snap even without an action', () => {
    const controller = create(); controller.update({ duration: 0, showAction: false }); controller.open();
    const scroll = document.querySelector<HTMLElement>('.sd-scroll')!, modal = document.querySelector('dialog')!;
    expect(scroll.tabIndex).toBe(-1);
    controller.snapTo(2); expect(scroll.tabIndex).toBe(0); expect(scroll.getAttribute('aria-label')).toBe('Details content');
    const box = { top: 30, bottom: 60, left: 0, right: 100, width: 100, height: 30, x: 0, y: 30, toJSON() { return {}; } };
    for (const node of modal.querySelectorAll<HTMLElement>('button,.sd-scroll')) vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(box);
    const close = modal.querySelector<HTMLElement>('.sd-handle')!; close.focus();
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
  it.each(['', '#selected'])('keeps a visible middle action stable and keyboard reachable (%s)', actionHref => {
    const controller = create(); controller.update({ duration: 0, actionHref }); controller.open();
    const modal = document.querySelector<HTMLDialogElement>('.sd-modal')!, scroll = modal.querySelector<HTMLElement>('.sd-scroll')!;
    const action = modal.querySelector<HTMLElement>('.sd-action')!, close = modal.querySelector<HTMLElement>('.sd-handle')!;
    const box = (top: number, bottom: number) => ({ top, bottom, left: 20, right: 420, width: 400, height: bottom - top, x: 20, y: top, toJSON() { return {}; } });
    vi.spyOn(scroll, 'getBoundingClientRect').mockReturnValue(box(676, 1645));
    for (const node of modal.querySelectorAll<HTMLElement>('.sd-controls button')) vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(box(680, 712));
    vi.spyOn(action, 'getBoundingClientRect').mockReturnValue(box(884, 932));
    const reveal = vi.fn(); Object.defineProperty(action, 'scrollIntoView', { configurable: true, value: reveal });
    controller.snapTo(1); expect(action.tabIndex).toBe(0);
    close.focus(); modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(action); expect(modal.dataset.snap).toBe('1'); expect(reveal).not.toHaveBeenCalled();
    // A native pointer may focus the control before an in-flight tab-stop refresh.
    close.focus(); action.tabIndex = -1; action.focus();
    expect(modal.dataset.snap).toBe('1'); expect(reveal).not.toHaveBeenCalled();
    if (!actionHref) { const selected = vi.fn(); document.getElementById('one')!.addEventListener('snap-drawer:action', selected); action.click(); expect(selected).toHaveBeenCalledTimes(1); expect(modal.open).toBe(false); }
  });
  it('still reveals an offscreen focused child control from a partial snap', () => {
    const controller = create(); controller.open();
    const action = document.querySelector<HTMLButtonElement>('.sd-modal .sd-action')!;
    const reveal = vi.fn(); Object.defineProperty(action, 'scrollIntoView', { configurable: true, value: reveal });
    expect(action.tabIndex).toBe(-1); action.focus();
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
  it('keeps visible fallback images current when opening the native dialog fails', () => {
    const controller = create();
    const modal = document.querySelector<HTMLDialogElement>('.sd-modal')!;
    vi.spyOn(modal, 'showModal').mockImplementation(() => { throw new Error('Dialog unavailable'); });
    controller.open();
    const fallback = document.querySelector<HTMLElement>('.sd-static')!;
    expect(fallback.hidden).toBe(false); expect(document.querySelector<HTMLButtonElement>('.sd-trigger')!.disabled).toBe(true);
    const previous = fallback.querySelector<HTMLImageElement>('.sd-image-large img[data-sd-src]')!;
    expect(previous.hasAttribute('src')).toBe(true);
    controller.update({ duration: 0, imageUrl: '/replacement.webp', imageAlt: 'Replacement lamp' });
    expect(previous.hasAttribute('src')).toBe(false);
    const images = [...fallback.querySelectorAll<HTMLImageElement>('img[data-sd-src]')];
    expect(images).toHaveLength(2); expect(images.every(image => image.getAttribute('src') === '/replacement.webp')).toBe(true);
    images.forEach(image => image.dispatchEvent(new Event('load')));
    expect(images.every(image => !image.hidden)).toBe(true);
    expect(images[1].alt).toBe('Replacement lamp');
    expect(modal.querySelectorAll('img')).toHaveLength(0);
    controller.update({ duration: 0, showImage: false }); expect(fallback.querySelector('.sd-image')).toBeNull();
  });
  it('keeps a usable static view when native dialogs are unavailable', () => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: undefined });
    const controller = create(); controller.open();
    expect(document.querySelector('dialog')).toBeNull(); expect(document.querySelector<HTMLElement>('.sd-static')!.hidden).toBe(false);
  });
});
