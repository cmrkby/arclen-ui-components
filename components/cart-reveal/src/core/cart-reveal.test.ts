// @vitest-environment jsdom
import { describe, expect, test, vi } from 'vitest';
import { defaults, mount, render, resolveSettings } from './index';

function setup() {
  document.body.innerHTML = '<main></main><aside></aside>';
  return {
    host: document.querySelector<HTMLElement>('main')!,
    other: document.querySelector<HTMLElement>('aside')!,
  };
}

describe('Cart Reveal', () => {
  test('escapes labels, normalizes prices and validates raster sources', () => {
    expect(resolveSettings(null)).toEqual(defaults);
    const embedded = 'data:image/webp;base64,UklGRjAAAABXRUJQVlA4ICQAAABwAQCdASoCAAIAAUAmJZQCdAFAAAD++X297lopFRhNJHYAAAA=';
    for (const image of [
      embedded,
      '/media/pack.webp',
      '../pack.png',
      'https://example.com/pack.webp',
    ]) {
      expect(resolveSettings({ image }).image).toBe(image);
    }
    for (const image of [
      'javascript:alert(1)',
      '//another.invalid/pack.png',
      '/malicious.svg',
      'data:image/svg+xml,%3Csvg%3E',
      'data:image/webp;base64,ZmFrZQ==',
    ]) {
      expect(resolveSettings({ image }).image).toBe('');
    }
    expect(resolveSettings({ price: 16.327 }).price).toBe(16.33);
    expect(resolveSettings({ price: -3 }).price).toBe(0);
    expect(render({ title: '<img src=x>', brand: 'A & B' })).toContain(
      '&lt;img src=x&gt;',
    );
    expect(render({ brand: 'A & B' })).toContain('A &amp; B');
  });

  test('validates appearance and duration settings and preserves the open cart on updates', () => {
    const { host } = setup();
    expect(
      resolveSettings({
        radius: 90,
        foldSpeed: 0,
        accent: 'url(bad)',
        confirmThreshold: 5,
        textEntranceSpeed: 0,
        textStagger: -1,
        glowColor: 'url(bad)',
        glowStrength: 150,
        confirmHold: 9999,
      }),
    ).toMatchObject({
      radius: 56,
      foldSpeed: 0.4,
      accent: defaults.accent,
      confirmThreshold: 60,
      textEntranceSpeed: 0.25,
      textStagger: 0,
      glowColor: defaults.glowColor,
      glowStrength: 100,
      confirmHold: 5000,
    });
    const api = mount(host, {}, { paused: true });
    host.querySelector<HTMLButtonElement>('.cr-product')!.click();
    api.update({
      radius: 19,
      accent: '#bb1188',
      foldSpeed: 2,
      confirmSpeed: 0.5,
    });
    const root = host.querySelector<HTMLElement>('.cr-shell')!;
    expect(root.style.getPropertyValue('--cr-radius')).toBe('19px');
    expect(root.style.getPropertyValue('--cr-accent')).toBe('#bb1188');
    expect(root.style.getPropertyValue('--cr-fold')).toBe('0.5');
    expect(root.style.getPropertyValue('--cr-confirm')).toBe('2');
    expect(root.dataset.state).toBe('open');
    api.destroy();
  });
  test('resizes an open cart and recalculates the slide distance at its current progress', () => {
    const { host } = setup();
    const api = mount(host, { cardWidth: 320, framePadding: 10, trackHeight: 50,
      thumbInset: 5, keyboardStep: 20 }, { paused: true });
    const root = host.querySelector<HTMLElement>('.cr-shell')!;
    root.querySelector<HTMLButtonElement>('.cr-product')!.click();
    root.querySelector<HTMLButtonElement>('.cr-step--more')!.click();
    const track = root.querySelector<HTMLElement>('.cr-track')!;
    const thumb = root.querySelector<HTMLButtonElement>('.cr-thumb')!;
    thumb.focus();
    thumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(thumb.getAttribute('aria-valuenow')).toBe('20');
    expect(track.style.getPropertyValue('--cr-offset')).toBe('50px');
    api.update({ cardWidth: 400, trackHeight: 60, receiptFill: '#882244', mediaHeight: 280 });
    expect(root.dataset.state).toBe('open');
    expect(root.querySelector('.cr-count')!.textContent).toBe('2');
    expect(document.activeElement).toBe(thumb);
    expect(track.style.getPropertyValue('--cr-offset')).toBe('64px');
    expect(root.style.getPropertyValue('--cr-media-height')).toBe('280');
    expect(root.style.getPropertyValue('--cr-receipt-fill')).toBe('#882244');
    expect(resolveSettings({ trackHeight: -5, receiptFill: 'invalid', framePadding: 200 }))
      .toMatchObject({ trackHeight: 44, receiptFill: defaults.receiptFill, framePadding: 28 });
    api.destroy();
  });

  test('renders custom action and receipt safely and preserves wishlist, quantity and focus on updates', () => {
    expect(
      resolveSettings({
        confirmLabel: '  ',
        receiptText: 3,
        showWishlist: 'false',
      }),
    ).toMatchObject({
      confirmLabel: defaults.confirmLabel,
      receiptText: defaults.receiptText,
      showWishlist: true,
    });
    const { host } = setup();
    host.innerHTML = render({
      confirmLabel: 'Reserve <two>',
      receiptText: 'Held & ready',
      showWishlist: false,
    });
    const get = <T extends HTMLElement = HTMLElement>(part: string) =>
      host.querySelector<T>(`.cr-${part}`)!;
    expect(get('confirm-label').textContent).toBe('Reserve <two>');
    expect(get('thumb').getAttribute('aria-label')).toBe('Reserve <two>');
    expect(get('receipt-text').textContent).toBe('Held & ready');
    expect(get<HTMLButtonElement>('favorite').disabled).toBe(true);
    const api = mount(host, {}, { paused: true });
    try {
      get('product').click();
      get('step--more').click();
      get('favorite').click();
      get('favorite').focus();
      api.update({
        confirmLabel: 'Reserve pair',
        receiptText: 'Pair reserved',
        showWishlist: false,
      });
      expect(get('favorite').hidden).toBe(true);
      expect(document.activeElement).toBe(get('product'));
      expect(get('count').textContent).toBe('2');
      expect(get('thumb').getAttribute('aria-label')).toBe('Reserve pair');
      get('confirm-label').click();
      expect(get('shell').dataset.state).toBe('receipt');
      expect(get('announcement').textContent).toBe(
        'Pair reserved. 2 items, $118.',
      );
      api.update({ receiptText: 'Saved for pickup', showWishlist: true });
      expect(get('receipt-text').textContent).toBe('Saved for pickup');
      expect(get('announcement').textContent).toContain('Saved for pickup');
      expect(get('favorite').hidden).toBe(false);
      expect(get('favorite').getAttribute('aria-pressed')).toBe('true');
    } finally {
      api.destroy();
    }
  });
  test('keeps favorite independent, handles zero and completes one keyboard confirmation', () => {
    const { host, other } = setup();
    const onConfirm = vi.fn();
    const api = mount(host, { price: 4.1 }, { paused: true, onConfirm });
    const otherApi = mount(other, {}, { paused: true });
    const product = host.querySelector<HTMLButtonElement>('.cr-product')!;
    const favorite = host.querySelector<HTMLButtonElement>('.cr-favorite')!;
    const decrease = host.querySelector<HTMLButtonElement>('.cr-step--less')!;
    const increase = host.querySelector<HTMLButtonElement>('.cr-step--more')!;
    const slider = host.querySelector<HTMLElement>('[role=slider]')!;
    const body = host.querySelector<HTMLElement>('.cr-body')!;
    const orderEvent = vi.fn();
    host.addEventListener('cartconfirm', orderEvent);

    favorite.click();
    expect(favorite.getAttribute('aria-pressed')).toBe('true');
    expect(body.hasAttribute('inert')).toBe(true);
    product.click();
    expect(body.hasAttribute('inert')).toBe(false);
    expect(product.getAttribute('aria-controls')).not.toBe(
      other.querySelector('.cr-product')?.getAttribute('aria-controls'),
    );
    decrease.click();
    decrease.click();
    expect(slider.getAttribute('aria-valuetext')).toBe('Cart is empty');
    expect(slider.tabIndex).toBe(-1);
    slider.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter' }));
    expect(onConfirm).not.toHaveBeenCalled();

    increase.click();
    increase.click();
    expect(host.querySelector('.cr-total')?.textContent).toBe('$8.20');
    slider.focus();
    slider.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'ArrowRight' }),
    );
    expect(slider.getAttribute('aria-valuenow')).toBe('25');
    slider.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter' }));
    slider.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'Enter', repeat: true }),
    );
    expect(onConfirm.mock.calls).toEqual([[{ quantity: 2, total: 8.2 }]]);
    expect(orderEvent.mock.lastCall?.[0].detail).toEqual({
      quantity: 2,
      total: 8.2,
    });
    expect(host.querySelector('.cr-shell')?.getAttribute('data-state')).toBe(
      'receipt',
    );
    expect(body.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(product);
    api.destroy();
    otherApi.destroy();
  });

  test('resets partial, backtracked and cancelled drags and confirms only on full release', () => {
    const { host } = setup();
    const onConfirm = vi.fn();
    const api = mount(host, {}, { paused: true, onConfirm });
    host.querySelector<HTMLButtonElement>('.cr-product')!.click();
    const slider = host.querySelector<HTMLElement>('[role=slider]')!;
    const thumb = host.querySelector<HTMLElement>('.cr-thumb')!;
    Object.defineProperty(host.querySelector('.cr-track'), 'clientWidth', {
      value: 300,
    });
    Object.defineProperty(thumb, 'offsetWidth', { value: 40 });
    const fire = (target: HTMLElement, type: string, clientX: number) => {
      target.dispatchEvent(
        new window.PointerEvent(type, {
          button: 0,
          pointerId: 1,
          isPrimary: true,
          clientX,
          bubbles: true,
          cancelable: true,
        }),
      );
    };

    fire(thumb, 'pointerdown', 20);
    fire(slider, 'pointermove', 275);
    expect(slider.getAttribute('aria-valuenow')).toBe('100');
    expect(onConfirm).not.toHaveBeenCalled();
    fire(slider, 'pointermove', 140);
    fire(slider, 'pointerup', 140);
    expect(slider.getAttribute('aria-valuenow')).toBe('0');
    fire(thumb, 'pointerdown', 20);
    fire(slider, 'pointermove', 275);
    fire(slider, 'pointercancel', 275);
    expect(slider.getAttribute('aria-valuenow')).toBe('0');
    expect(onConfirm).not.toHaveBeenCalled();

    fire(thumb, 'pointerdown', 20);
    fire(slider, 'pointerup', 260);
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith({
      quantity: 1,
      total: 59,
    });
    api.destroy();
  });
  test('confirms from the rail label, clears the receipt, and reopens at one', () => {
    vi.useFakeTimers();
    const { host } = setup();
    const onConfirm = vi.fn();
    const api = mount(
      host,
      { receiptDuration: 750 },
      { paused: true, onConfirm },
    );
    try {
      const click = (part: string) =>
        host.querySelector<HTMLButtonElement>(part)!.click();
      click('.cr-product');
      click('.cr-step--more');
      expect(host.querySelector('.cr-total')?.textContent).toBe('$118');
      click('.cr-confirm-label');
      click('.cr-confirm-label');
      expect(onConfirm).toHaveBeenCalledExactlyOnceWith({
        quantity: 2,
        total: 118,
      });
      expect(host.querySelector('.cr-shell')?.getAttribute('data-state')).toBe(
        'receipt',
      );
      vi.advanceTimersByTime(760);
      expect(host.querySelector('.cr-shell')?.getAttribute('data-state')).toBe(
        'compact',
      );
      expect(host.querySelector('.cr-count')?.textContent).toBe('0');
      click('.cr-product');
      expect(host.querySelector('.cr-total')?.textContent).toBe('$59');
    } finally {
      api.destroy();
      vi.useRealTimers();
    }
  });
});
