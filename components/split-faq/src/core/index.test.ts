import { describe, expect, it } from 'vitest';
import { defaults, render, resolveSettings } from './index';

describe('Split FAQ portable contract', () => {
  it('escapes every user text occurrence while preserving semantic question/answer pairs', () => {
    const html = render({ titles: ['<img onerror="bad">'], descriptions: ['<script>bad()</script>'] }, 'safe-prefix');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('aria-controls="safe-prefix-a-0"');
    expect(html).toContain('aria-labelledby="safe-prefix-q-0"');
    expect(html).not.toContain(' hidden');
  });
  it('rejects malformed paired content without modifying shared defaults', () => {
    for (const input of [null, [], { titles: [] }, { titles: ['One'] }, { descriptions: [1] }, { titles: ['x'.repeat(81)] }, { motionScale: NaN }, { theme: 'custom' }, { appearance: 'connected' }]) expect(() => resolveSettings(input)).toThrow();
    const settings = resolveSettings({});
    settings.titles[0] = 'Changed';
    expect(defaults.titles[0]).not.toBe('Changed');
  });
  it('clamps selection against content length and admits the complete bounded custom setting set', () => {
    expect(resolveSettings({ initialOpen: 100 }).initialOpen).toBe(-1);
    expect(resolveSettings({ initialOpen: -4 }).initialOpen).toBe(-1);
    expect(() => resolveSettings({ initialOpen: 1.5 })).toThrow();
    expect(resolveSettings({ titles: ['Only'], descriptions: ['Answer'], initialOpen: 1, maxWidth: 240, motionScale: 0, theme: 'light' })).toMatchObject({ initialOpen: -1, maxWidth: 240, motionScale: 0, theme: 'light' });
  });
});

it("keeps style-default width and floors only positive custom caps",()=>{expect(resolveSettings({maxWidth:0}).maxWidth).toBe(0);expect(resolveSettings({maxWidth:8}).maxWidth).toBe(240);expect(resolveSettings({maxWidth:480}).maxWidth).toBe(480);expect(resolveSettings({maxWidth:1440}).maxWidth).toBe(1440)});
