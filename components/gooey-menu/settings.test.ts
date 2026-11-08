import { describe, expect, it } from 'vitest';
import { defaults, render, resolveSettings } from './src/core';

describe('Gooey Menu portable rendering', () => {
  it('rejects invalid settings and bounds numeric and label input', () => {
    expect(resolveSettings(null)).toEqual(defaults);
    const settings = resolveSettings({ direction: 'unknown', openDuration: Infinity, iconSize: 99, surfaceColor: 'red;display:none', itemLabels: ['x'.repeat(80), '', null] });
    expect(settings.direction).toBe('fan');
    expect(settings.openDuration).toBe(defaults.openDuration);
    expect(settings.iconSize).toBe(28);
    expect(settings.surfaceColor).toBe(defaults.surfaceColor);
    expect(settings.itemLabels).toEqual(['x'.repeat(40), ...defaults.itemLabels.slice(1)]);
  });

  it('escapes labels in each layout and keeps closed actions out of tab order', () => {
    for (const direction of ['fan', 'orbit', 'dock', 'rail']) {
      const html = render({ direction, itemLabels: ['<script>', 'B', 'C', 'D'] });
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
      expect(html.match(/tabindex="-1"/g)).toHaveLength(4);
      expect(html).toContain('aria-expanded="false"');
    }
  });

  it('assigns independent filter and controls IDs to server-rendered instances', () => {
    const first = render().match(/filter id="([^"]+)/)?.[1];
    const second = render().match(/filter id="([^"]+)/)?.[1];
    expect(first).toBeTruthy();
    expect(second).not.toBe(first);
    expect(render({ initialOpen: true }).match(/tabindex="0"/g)).toHaveLength(4);
  });
});
