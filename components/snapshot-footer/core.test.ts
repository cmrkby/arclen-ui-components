// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { defaults, mount, render, resolveSettings } from './src/core';

describe('Photo Stack Footer', () => {
  it('preserves defaults and copies content lists', () => {
    const settings = resolveSettings({});
    expect(settings).toEqual(defaults);
    settings.captions[0] = 'New caption';
    expect(defaults.captions[0]).toBe('Mabel, the long way home');
  });
  it('escapes content and rejects unsafe destinations and malformed controls', () => {
    const urls = [...defaults.navUrls]; urls[1] = 'javascript:alert(1)';
    const settings = resolveSettings({navUrls: urls, photo1:'javascript:bad()', accent:'red'});
    expect(settings).toEqual(defaults);
    expect(render({brand:'<img onerror=x>'})).toContain('&lt;img onerror=x&gt;');
    expect(resolveSettings({bookingUrl:'javascript:bad()'}).bookingUrl).toBe(defaults.bookingUrl);
  });
  it('provides a static footer with each print, note and semantic navigation', () => {
    const host = document.createElement('div');
    host.innerHTML = render();
    expect(host.querySelectorAll('.sf-print')).toHaveLength(5);
    expect(host.querySelector('.sf-note')).toBeTruthy();
    expect(host.querySelectorAll('nav')).toHaveLength(2);
    expect(host.querySelectorAll('h2 span')).toHaveLength(5);
  });
  it('handles keyboard and press states, live updates and cleanup', () => {
    const host = document.createElement('div');
    const controller = mount(host);
    const print = host.querySelector('button')!;
    print.click();
    expect(print.getAttribute('aria-pressed')).toBe('true');
    print.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    expect(print.getAttribute('aria-pressed')).toBe('false');
    print.dispatchEvent(new Event('pointerdown',{bubbles:true}));
    expect(print.dataset.pressed).toBe('true');
    window.dispatchEvent(new Event('pointerup'));
    expect(print.dataset.pressed).toBeUndefined();
    controller.pause(); expect(host.querySelector('footer')?.dataset.static).toBe('true');
    controller.update({brand:'Another Studio'});
    expect(host.querySelector('.sf-logo')?.textContent).toBe('Another Studio');
    expect(host.querySelector('footer')?.dataset.static).toBe('true');
    controller.resume(); expect(host.querySelector('footer')?.dataset.static).toBe('false');
    const replacement = host.querySelector('button')!;
    controller.destroy(); controller.destroy(); replacement.click();
    expect(replacement.getAttribute('aria-pressed')).toBe('false');
  });
});
