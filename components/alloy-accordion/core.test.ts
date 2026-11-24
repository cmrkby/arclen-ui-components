import { describe, expect, it } from 'vitest';
import { defaults, render, resolveSettings } from './src/core';
import { items } from './src/core/content';

describe('Alloy Accordion panel settings', () => {
  for (const item of items) {
    it('keeps ' + item.title + ' settings independent of its neighbours', () => {
      const settings = resolveSettings({ [item.colourKey]: '#102540', [item.scaleKey]: 1.25 });
      expect(settings).toEqual({ ...defaults, [item.colourKey]: '#102540', [item.scaleKey]: 1.25 });
      expect(render(settings, 'demo').match(/--aa-tone:#102540/g)).toHaveLength(1);
      expect(resolveSettings({ [item.scaleKey]: 0 })[item.scaleKey]).toBe(.5);
      expect(resolveSettings({ [item.colourKey]: 'invalid' })[item.colourKey]).toBe(defaults[item.colourKey]);
    });
  }
});
