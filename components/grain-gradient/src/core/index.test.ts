import {describe, expect, it} from 'vitest';
import manifest from '../../component.json';
import {defaults, resolveSettings, render} from './index';

describe('Grain Gradient portable settings', () => {
  it('agrees with manifest defaults and previews without sharing mutable results', () => {
    expect(resolveSettings()).toEqual(Object.fromEntries(manifest.settings.map(setting => [setting.key, setting.default])));
    for (const preview of manifest.previews) expect(resolveSettings(preview.settings)).toEqual(preview.settings);
    const first = resolveSettings(); first.size = .5;
    expect(resolveSettings().size).toBe(.69);
    expect(Object.isFrozen(defaults)).toBe(true);
  });
  it('preserves valid precision instead of snapping to UI increments', () => {
    expect(resolveSettings({size: .69137, grainScale: 1.234, speed: .0001})).toMatchObject({size: .69137, grainScale: 1.234, speed: .0001});
    expect(resolveSettings({coreColor: '#ffaa04'}).coreColor).toBe('#FFAA04');
  });
  it.each([null, [], 'warm', 1, true, {unknown: 1}, {size: NaN}, {speed: Infinity}, {size: .349999}, {size: 1.050001}, {seed: 12.1}, {seed: -1}, {seed: 10000}, {height: 159}, {height: 1601}, {layout: 'viewport'}, {variant: 'B'}, {variant: 'unknown'}, {variant: 'orbital'}, {variant: null}, {variant: 1}, {coreColor: 'transparent'}, {glowColor: '#FFA504FF'}, {edgeColor: '#fff'}, {rimColor: 'red'}, {coreColor: ' #FFA504'}, {size: undefined}])('rejects invalid input %j', input => {
    expect(() => resolveSettings(input)).toThrow();
  });
  it('rejects unknown non-enumerable and symbol keys', () => {
    expect(() => resolveSettings(Object.defineProperty({}, 'unexpected', {value: 1}))).toThrow();
    expect(() => resolveSettings({[Symbol('unexpected')]: 1})).toThrow();
  });
  it('accepts exact bounds including a stopped speed and zero grain', () => {
    expect(resolveSettings({size: .35, grain: 0, grainScale: .65, softness: 0, speed: 0, seed: 0, height: 160})).toMatchObject({size: .35, grain: 0, speed: 0});
    expect(resolveSettings({size: 1.05, grain: .45, grainScale: 4, softness: 1, speed: 4, seed: 9999, height: 1600})).toMatchObject({size: 1.05, seed: 9999});
  });
});

describe('Grain Gradient server output', () => {
  it('renders deterministic visible static artwork without browser globals', () => {
    expect(typeof window).toBe('undefined');
    expect(render()).toBe(render());
    const output = render({height: 420, coreColor: '#112233'});
    expect(output).toContain('height:420px');
    expect(output).toContain('#112233');
    expect(output).toContain('radial-gradient(');
    expect(output).toContain('aria-hidden="true"');
    expect(output).not.toContain('tabindex');
  });
  it('escapes caller-supplied IDs as data rather than executable markup', () => {
    const markup = render({}, '\"><script>alert(1)</script>&');
    expect(markup).not.toContain('<script>');
    expect(markup).toContain('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;&amp;');
    expect(() => render({}, 123 as unknown as string)).toThrow();
  });
  it('uses a receiving height in fill mode and retains the fixed-height setting', () => {
    expect(render({layout: 'fill', height: 420})).toContain('height:100%');
    expect(resolveSettings({layout: 'fill', height: 420}).height).toBe(420);
  });
});


describe('Grain structures', () => {
  it('keeps Original warm as the default and accepts each portable structure', () => {
    expect(defaults.variant).toBe('original');
    for (const variant of ['original', 'ribbons', 'blanket']) {
      expect(resolveSettings({variant})).toMatchObject({variant, height:600, coreColor:'#FFA504'});
    }
  });
  it('renders distinct configured static structures without changing dimensions or semantics', () => {
    const outputs = ['original', 'ribbons', 'blanket'].map(variant => render({variant, height:420, coreColor:'#123456'}));
    expect(new Set(outputs).size).toBe(3);
    for (const [index,html] of outputs.entries()) {
      expect(html).toContain('height:420px'); expect(html).toContain(index===2?'#133456':'#123456');
      expect(html.match(/<canvas /g)).toHaveLength(1);
      expect(html).toContain('aria-hidden="true"'); expect(html).not.toContain('<script');
    }
    expect(outputs[0]).toContain('circle at -3% 103%');
    expect(outputs[1]).toContain('at 50% 29%');
    expect(outputs[2]).toContain('at 111% 96%');
  });
});
