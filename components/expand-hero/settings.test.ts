import { describe, expect, it } from 'vitest';
import { defaults, motionAt, render, resolveSettings, settleProgress } from './src/core';

describe('Expand Hero portable rendering', () => {
  it('keeps the selected composition and empty optional corner captions', () => {
    expect(resolveSettings(null)).toEqual(defaults);
    expect(defaults.heading).toBe('Light study.');
    expect(defaults.footer).toBe('');
    expect(defaults.credit).toBe('');
    const html = render({ heading: '<script>', subtitle: '"quoted"' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&quot;quoted&quot;');
    expect(html).not.toContain('data-live');
  });

  it('rejects executable image URLs, credentials and unsafe style values', () => {
    for (const image of ['javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', 'https://user:pass@example.com/a.png', '../secret.png']) {
      expect(resolveSettings({ image }).image).toBe('');
    }
    expect(resolveSettings({ image: './portrait.webp' }).image).toBe('./portrait.webp');
    expect(resolveSettings({ canvasColor: 'red;display:none' }).canvasColor).toBe(defaults.canvasColor);
    expect(resolveSettings({ stageHeight: Infinity }).stageHeight).toBe(defaults.stageHeight);
    expect(resolveSettings({ stageHeight: -1, titleSize: 99 }).stageHeight).toBe(320);
    expect(resolveSettings({ titleSize: 99 }).titleSize).toBe(1.3);
  });

  it('settles and reverses from current progress without overshoot', () => {
    const current = settleProgress(0, 1, 200, 400);
    expect(current).toBeGreaterThan(0);
    expect(current).toBeLessThan(1);
    expect(settleProgress(current, 0, 100, 400)).toBeLessThan(current);
    expect(settleProgress(current, 0, 100, 0)).toBe(0);
    expect(settleProgress(.99999, 1, 16, 400)).toBe(1);
  });

  it('keeps the opening clipped and the final title visible at narrow and wide widths', () => {
    for (const width of [320, 768, 1440]) {
      expect(motionAt(0, width, 900).titleOpacity).toBe(0);
      expect(motionAt(0, width, 900).side).toBeGreaterThan(0);
      const end = motionAt(1, width, 900);
      expect(end.titleOpacity).toBe(1);
      expect(end.titleScale).toBe(1);
      expect(end.bottom).toBe(0);
      expect(end.side).toBeLessThan(0);
    }
  });
});
