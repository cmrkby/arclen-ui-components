import {describe, expect, it} from 'vitest';
import manifest from './component.json';
import {defaults, render, resolveSettings} from './src/core';

describe(manifest.name, () => {
  it('renders the catalogue defaults and ignores invalid numeric input', () => {
    const number = manifest.settings.find(rule => rule.kind === 'number')!;
    expect(resolveSettings({[number.key]: NaN})).toEqual(defaults);
    expect(render(defaults)).toMatch(/<[^>]+>/);
    expect(resolveSettings({[number.key]: Infinity})).toEqual(defaults);
  });
});
