import { describe, expect, it } from 'vitest';
import { defaults, render, resolveSettings } from './index';

describe('Testimonial Swipe standalone settings and server output', () => {
  it('gives callers independent story arrays and retains the manifest defaults', () => {
    const first = resolveSettings({});
    first.quotes[0] = 'Changed by caller';
    expect(resolveSettings({}).quotes[0]).toBe(defaults.quotes[0]);
    expect(Object.isFrozen(defaults.quotes)).toBe(true);
  });

  it('rejects malformed content, unknown controls and unsafe portrait sources', () => {
    for (const input of [null, [], { unexpected: true }, { quotes: [] }, { names: [''] }, { quotes: Array(6).fill('Example') }, { initialStory: 1.5 }, { interval: Infinity }, { interval: 3999 }, { duration: 901 }, { autoPlay: 'true' }, { sizing: 'viewport' }, { height: 479 }, { panelColor: 'red' }, { progressColor: 'url(javascript:x)' }, { showProgress: 'true' }, { direction: 'unknown' }, { portrait1: 'javascript:alert(1)' }, { portrait1: '//example.com/a.jpg' }, { portrait1: 'https://user:password@example.com/a.jpg' }, { portrait1: 'https://example.com/"onerror="x' }, { portrait1: 'data:image/svg+xml;base64,PHN2Zz4=' }]) {
      expect(() => resolveSettings(input)).toThrow();
    }
  });

  it('allows only deliberate application image routes', () => {
    for (const source of ['', 'https://example.com/a.webp?width=600', 'assets/person.webp', './assets/person.webp', 'data:image/png;base64,YQ==', 'blob:https://example.com/portrait']) {
      expect(resolveSettings({ portrait1: source }).portrait1).toBe(source);
    }
  });

  it('escapes story content and attributes while preserving story pairing', () => {
    const html = render({ initialStory: 2, headings: ['First', '<strong>Second</strong>'], quotes: ['First quote', '<script>alert("x")</script>'], names: ['First person', 'Second & person'], roles: ['First role', 'Second role'] });
    expect(html).toContain('data-active="2"');
    expect(html).toContain('&lt;strong&gt;Second&lt;/strong&gt;');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).toContain('Second &amp; person');
    expect(html).toContain('Second role');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('First quote');
  });

  it('uses quote count as the bounded story count and clamps the start', () => {
    const html = render({ initialStory: 5, quotes: ['One fictional story.'], names: ['Example person'] });
    expect(html.match(/data-card=/g)).toHaveLength(1);
    expect(html).toContain('data-active="1"');
    expect(html).toContain('data-current>01</span> <span>/ 01</span>');
    expect(html).toContain('Example person');
    expect(html).toContain('disabled');
  });

  it('keeps the dwell and decorative progress controls consistent in server output', () => {
    expect(defaults.interval).toBe(6000);
    const configured = resolveSettings({ showProgress: false, progressColor: '#123456', interval: 4000 });
    expect(configured.showProgress).toBe(false);
    expect(configured.progressColor).toBe('#123456');
    const html = render(configured);
    expect(html).toContain('data-progress-visible="false"');
    expect(html).toContain('--aui-ts-progress:#123456');
    expect(html).toContain('class="aui-ts-progress" viewBox="0 0 100 100" aria-hidden="true" focusable="false"');
    expect(html).toContain('aria-label="Next story"');
  });

  it('ships the portrait deck with a single presentation API', () => {
    const html = render({ initialStory: 3 });
    expect(html).toContain('data-direction="split"');
    expect(html).toContain('data-sizing="fill"');
    expect(html).toContain(defaults.quotes[2]);
    expect(html).toContain(defaults.names[2]);
    expect(html).toContain('Previous story');
    expect(html).toContain('Next story');
    expect(html).toContain('Pause autoplay');
    expect(html).not.toMatch(/src="https?:\/\//);
    expect(() => resolveSettings({ direction: 'split' })).toThrow('Unknown');
  });

  it('bounds typography, spacing, crop and framing independently', () => {
    const lower = resolveSettings({ headingScale: .8, quoteScale: .85, contentSpacing: .75, panelMaxWidth: 800, panelPadding: 24, phonePadding: 14, frameWidth: 0, portraitRadius: 0, portraitX: 0, portraitY: 0 });
    expect(lower.frameWidth).toBe(0);
    expect(lower.portraitX).toBe(0);
    const upper = resolveSettings({ headingScale: 1.25, quoteScale: 1.25, contentSpacing: 1.5, panelMaxWidth: 1440, panelPadding: 64, phonePadding: 36, frameWidth: 14, portraitRadius: 40, portraitX: 100, portraitY: 100 });
    expect(upper.portraitY).toBe(100);
    for (const bad of [{ headingScale: .79 }, { quoteScale: 1.26 }, { contentSpacing: 1.51 }, { panelMaxWidth: 1441 }, { panelPadding: 23 }, { phonePadding: 37 }, { frameWidth: -1 }, { portraitRadius: 41 }, { portraitX: 101 }, { portraitY: -.1 }, { typeface: 'url(https://example.com/font)' }, { frameColor: 'red' }, { showAvatar: 0 }, { swipeEnabled: 'false' }, { dragHint: 'x'.repeat(41) }]) expect(() => resolveSettings(bad)).toThrow();
  });

  it('preserves configured appearance and safely renders optional guidance', () => {
    const html = render({ typeface: 'serif', headingScale: 1.2, quoteScale: .9, contentSpacing: 1.1, panelMaxWidth: 1000, panelPadding: 32, phonePadding: 18, frameWidth: 4, portraitRadius: 18, frameColor: '#123456', portraitX: 25, portraitY: 75, showAvatar: false, dragHint: '<img src=x onerror=alert(1)>', swipeEnabled: false });
    expect(html).toContain('--aui-ts-font:Georgia,serif');
    expect(html).toContain('--aui-ts-frame:#123456');
    expect(html).toContain('--aui-ts-portrait-x:25%');
    expect(html).toContain('--aui-ts-portrait-y:75%');
    expect(html).toContain('data-avatar-visible="false"');
    expect(html).toContain('data-swipe-enabled="false"');
    expect(html).toContain('data-hint-visible="false"');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src=x');
    expect(render({ showDragHint: false })).toContain('data-hint-visible="false"');
    expect(render({ showDragHint: true, swipeEnabled: true })).toContain('data-hint-visible="true"');
  });
});
