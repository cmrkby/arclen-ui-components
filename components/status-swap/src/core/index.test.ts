import { describe, expect, it } from 'vitest';
import manifest from '../../component.json';
import { defaults, render, resolveSettings } from './index';

describe('Status Swap portable settings', () => {
  it('derives all 24 defaults and validates every preview', () => {
    expect(Object.keys(defaults)).toHaveLength(24);
    expect(resolveSettings({})).toEqual(Object.fromEntries(manifest.settings.map(s => [s.key, s.default])));
    for (const preview of manifest.previews) expect(() => resolveSettings(preview.settings)).not.toThrow();
  });
  it('accepts bounded values and rejects invalid values for every control', () => {
    for (const rule of manifest.settings) {
      if (rule.kind === 'number') {
        expect(resolveSettings({ [rule.key]: rule.min })[rule.key as keyof typeof defaults]).toBe(rule.min);
        expect(() => resolveSettings({ [rule.key]: rule.max })).not.toThrow();
        for (const value of [NaN, Infinity, rule.min! - .01, rule.max! + .01, '1']) expect(() => resolveSettings({ [rule.key]: value })).toThrow();
      } else if (rule.kind === 'boolean') {
        expect(() => resolveSettings({ [rule.key]: true })).not.toThrow();
        expect(() => resolveSettings({ [rule.key]: 1 })).toThrow();
      } else if (rule.kind === 'color') {
        for (const value of ['transparent', '#123456', '#12345678']) expect(() => resolveSettings({ [rule.key]: value })).not.toThrow();
        expect(() => resolveSettings({ [rule.key]: 'url(https://example.com)' })).toThrow();
      } else if (rule.kind === 'select') {
        for (const option of rule.options!) expect(() => resolveSettings({ [rule.key]: option.value })).not.toThrow();
        expect(() => resolveSettings({ [rule.key]: 'unknown' })).toThrow();
      }
    }
    for (const key of ['idleLabel', 'activeLabel']) for (const value of ['', '   ', '\u0000', 'x'.repeat(41)]) expect(() => resolveSettings({ [key]: value })).toThrow();
    for (const value of [null, [], true, { unknown: 1 }]) expect(() => resolveSettings(value)).toThrow();
  });
  it('escapes markup and renders the final configured state before JavaScript', () => {
    const html = render({ initialSaved: true, activeLabel: '<Saved & kept>' });
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-label="&lt;Saved &amp; kept&gt;"');
    expect(html).toContain(' disabled ');
    expect(html).not.toContain('aria-label="<');
    expect(render({})).toContain('aria-pressed="false"');
  });
  it('keeps Circle green and Roll white while honoring each appearance’s saved colors', () => {
    expect(render({ initialSaved: true })).toContain('--ss-saved:#16864b;--ss-tick:#ffffff;');
    expect(render({ appearance: 'roll', initialSaved: true })).toContain('--ss-saved:#ffffff;--ss-tick:#111111;');
    expect(render({ appearance: 'roll', rollSavedSurface: '#123456', rollSavedTextColor: '#abcdef' })).toContain('--ss-saved:#123456;--ss-tick:#abcdef;');
    expect(render({ savedSurface: '#654321', savedIconColor: '#fedcba' })).toContain('--ss-saved:#654321;--ss-tick:#fedcba;');
  });

});
