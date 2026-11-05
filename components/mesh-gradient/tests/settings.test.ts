import { describe, expect, it } from 'vitest';
import manifest from '../component.json';
import { defaults, render, resolveSettings } from '../src/core';
import { toVec4 } from '../src/core/renderer.js';

describe('Mesh Gradient settings and server render', () => {
  it('resolves the actual manifest defaults and all configured previews', () => {
    expect(resolveSettings({})).toEqual(Object.fromEntries(manifest.settings.map(s => [s.key, s.default])));
    for (const preview of manifest.previews) expect(() => resolveSettings(preview.settings)).not.toThrow();
  });
  it('owns returned arrays independently', () => {
    const input = ['#000000', '#ffffff'];
    const first = resolveSettings({ colors: input });
    input[0] = '#ff0000'; first.colors[1] = '#00ff00';
    expect(resolveSettings({}).colors).toEqual(defaults.colors);
    expect(first.colors[0]).toBe('#000000');
    expect(resolveSettings({}).colors).not.toBe(defaults.colors);
  });
  it.each(manifest.settings.filter(s => s.kind === 'number'))('enforces finite bounds for $key', setting => {
    for (const value of [setting.min, setting.max]) expect(resolveSettings({ [setting.key]: value })[setting.key as keyof typeof defaults]).toBe(value);
    for (const value of [NaN, Infinity, -Infinity, '1', null, false, setting.min! - .001, setting.max! + .001]) {
      expect(() => resolveSettings({ [setting.key]: value })).toThrow();
    }
  });
  it('treats step as UI granularity rather than a new integer constraint', () => {
    expect(resolveSettings({ height: 600.5 }).height).toBe(600.5);
  });
  it.each([null, undefined, [], true, 'bad', { nonsense: 1 }, { headline: 4 }, { headline: 'x'.repeat(161) },
    { layout: 'viewport' }, { headlineMode: 'automatic' }, { colors: [] }, { colors: ['#ffffff'] },
    { colors: Array(11).fill('#ffffff') }, { colors: ['#fff', '#000000'] },
    { colors: ['#1234567', '#000000'] }, { colors: ['#12345g', '#000000'] },
    { colors: ['rgba(0,0,0,1)', '#ffffff'] }, { colors: [3, '#ffffff'] }, { colors: null }])('rejects invalid input %j', input => {
    expect(() => resolveSettings(input)).toThrow();
  });
  it('accepts alpha hex and full length text, escapes text and caller IDs in Node', () => {
    expect(resolveSettings({ colors: ['#12345678', '#ABCDEF'], headline: 'x'.repeat(160) }).headline).toHaveLength(160);
    const html = render({ headline: '<tag> & "quoted"' }, '" onmouseover="bad');
    expect(html).toContain('&lt;tag&gt; &amp; &quot;quoted&quot;');
    expect(html).toContain('id="&quot; onmouseover=&quot;bad"');
    expect(html).toContain('alt=""');
    expect(html).not.toContain('<tag>');
    expect(render({}, 'stable')).toBe(render({}, 'stable'));
    expect(render({})).not.toBe(render({}));
  });
  it('retains valid seed color conversions and clamps channels', () => {
    expect(toVec4('#f00')).toEqual([1, 0, 0, 1]);
    expect(toVec4('#11223380')).toEqual([17 / 255, 34 / 255, 51 / 255, 128 / 255]);
    expect(toVec4('rgb(224, 234, 255)')).toEqual(toVec4('#e0eaff'));
    expect(toVec4('rgba(255,0,0,0.5)')).toEqual([1, 0, 0, .5]);
    expect(toVec4('hsl(0,100%,50%)')).toEqual([1, 0, 0, 1]);
    expect(toVec4([2, -1, .5])).toEqual([1, 0, .5, 1]);
  });
});
