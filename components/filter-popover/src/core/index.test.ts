import manifest from '../../component.json';
import {intersects, warpLine} from './warp';
import {describe, expect, it} from 'vitest';
import {defaults, popupGeometry, render, resolveSettings} from './index';
describe('Filter Popover settings and server output', () => {
  it('owns a fresh options array and handles empty and duplicate options', () => {
    const a = resolveSettings(); a.options.push('Another');
    expect(defaults.options).not.toContain('Another');
    expect(resolveSettings({options: ['Design', 'Design', '', 'Culture'], selected: 'Unknown'})).toMatchObject({options: ['Design', 'Culture'], selected: 'Design'});
    expect(render({options: []})).toContain(' disabled');
  });
  it('clamps geometry, rejects CSS injection and escapes user content and IDs', () => {
    expect(resolveSettings({width: Infinity, duration: -30, accent: 'red;position:fixed', variant: 'bad'})).toMatchObject({width: defaults.width, duration: 0, accent: defaults.accent, variant: defaults.variant});
    for (const variant of [['grid'], new String('grid'), {toString: () => 'grid'}, {toString: () => {throw Error('Do not coerce');}}]) {
      expect(resolveSettings({variant}).variant).toBe(defaults.variant);
    }
    for (const placement of [['above'], new String('above'), {toString: () => 'above'}, {toString: () => {throw Error('Do not coerce');}}]) {
      expect(resolveSettings({placement}).placement).toBe(defaults.placement);
    }
    const html = render({label: '<script>', options: ['<img onerror=alert(1)>']}, '" onclick="bad');
    expect(html).not.toContain('<script>'); expect(html).not.toContain('<img'); expect(html).toContain('&quot;');
  });
  it('renders all three different structures with named semantics and isolated IDs', () => {
    for (const variant of ['panel', 'grid', 'sheet'] as const) {
      const html = render({variant}, `sample-${variant}`);
      expect(html).toContain(`data-variant="${variant}"`);
      expect(html).toContain('aria-haspopup="listbox"'); expect(html).toContain(`id="sample-${variant}-list"`);
      expect(html).toContain('aria-expanded="false"'); expect(html).toContain('data-fp-panel hidden');
    }
  });
});


describe('Filter Popover anchor geometry and folds', () => {
  it('opens above a low pill and bounds a near-right-edge popup', () => {
    const g = popupGeometry({left: 350, top: 650, width: 64, height: 40}, 336, 300, {width: 390, height: 844});
    expect(g.left).toBe(38); expect(g.top).toBe(340);
    expect(g.left + g.width).toBeLessThanOrEqual(374);
    expect(g.top + g.height).toBeLessThan(650);
  });
  it('uses below at the top edge and scrolls a tall menu without covering its pill', () => {
    const anchor = {left: 30, top: 16, width: 80, height: 40};
    const g = popupGeometry(anchor, 420, 900, {width: 390, height: 600});
    expect(g.width).toBe(358); expect(g.top).toBe(66);
    expect(g.top + g.height).toBe(584);
    const centered = popupGeometry({...anchor, top: 280}, 336, 300, {width: 800, height: 600});
    expect(centered.top + centered.height).toBe(270);
    expect(centered.maxHeight).toBe(254);
  });
  it('reserves viewport insets for the mobile sheet independent of the anchor', () => {
    const g = popupGeometry({left: 300, top: 180, width: 64, height: 40}, 336, 480, {width: 390, height: 844}, true);
    expect(g).toMatchObject({left: 16, top: 348, width: 358, height: 480});
  });

});


describe('Cuisine and nonlinear opening contracts', () => {
  it('reveals cuisine only for Dining and isolates cuisine settings', () => {
    expect(render({selected: 'Dining'})).toContain('data-fp-cuisine>');
    expect(render({selected: 'Dining', showCuisine: false})).toContain('data-fp-cuisine hidden');
    expect(render({selected: 'All'})).toContain('data-fp-cuisine hidden');
    expect(resolveSettings({cuisines: ['Thai', '', 'Thai', 'French'], selectedCuisine: 'Bad'})).toMatchObject({cuisines: ['Thai', 'French'], selectedCuisine: 'Thai'});
    expect(resolveSettings({cuisines: []}).selectedCuisine).toBe('');
    const s = resolveSettings(); s.cuisines.push('Other'); expect(defaults.cuisines).not.toContain('Other');
    expect(render({cuisines: ['<script>']})).not.toContain('<script>');
  });
  it('maps every cross-section from the pill to the full menu with no inverted bands', () => {
    const anchor = {left: 24, top: 344, width: 68, height: 36}, popup = {left: 24, top: 42, width: 336, height: 292};
    for (const t of [0, .2, .5, .8, 1]) {
      expect(warpLine(anchor, popup, 0, t)).toEqual({x: 24, y: 344 + 36 * t, width: 68});
      expect(warpLine(anchor, popup, 1, t).width).toBe(336);
      expect(warpLine(anchor, popup, 1, t).y).toBeCloseTo(42 + 292 * t);
    }
    for (const p of [.1, .3, .5, .8]) {
      const top = warpLine(anchor, popup, p, 0), middle = warpLine(anchor, popup, p, .5), neck = warpLine(anchor, popup, p, 1);
      expect(top.width).toBeGreaterThan(middle.width); expect(middle.width).toBeGreaterThan(neck.width);
      expect(top.y).toBeLessThan(middle.y); expect(middle.y).toBeLessThan(neck.y);
      expect(middle.x).toBeGreaterThan((top.x + neck.x) / 2);
    }
  });
  it('reverses the taper for a menu below the pill and clamps progress', () => {
    const anchor = {left: 280, top: 20, width: 68, height: 36}, popup = {left: 32, top: 66, width: 336, height: 292};
    expect(warpLine(anchor, popup, .4, 1).width).toBeGreaterThan(warpLine(anchor, popup, .4, 0).width);
    expect(warpLine(anchor, popup, -5, 0)).toEqual(warpLine(anchor, popup, 0, 0));
    expect(warpLine(anchor, popup, 4, 1)).toEqual(warpLine(anchor, popup, 1, 1));
  });
});


describe('Shared layout-independent fold', () => {
  it.each([
    {name: 'two-column panel', width: 336, height: 295},
    {name: 'three-column tiles', width: 336, height: 363},
    {name: 'mobile single-column sheet', width: 358, height: 480}
  ])('unfolds $name from its pill without changing final geometry', ({width, height}) => {
    const anchor = {left: 32, top: 650, width: 80, height: 36};
    const popup = {left: 16, top: 650 - height - 10, width, height};
    for (const t of [0, .25, .5, .75, 1]) {
      expect(warpLine(anchor, popup, 0, t).width).toBe(80);
      expect(warpLine(anchor, popup, 1, t).width).toBe(width);
      expect(warpLine(anchor, popup, 1, t).y).toBeCloseTo(popup.top + height * t);
    }
    expect(warpLine(anchor, popup, .5, 0).width).toBeGreaterThan(warpLine(anchor, popup, .5, 1).width);
  });
  it('excludes offscreen scroll items but keeps partially visible rows for clipping', () => {
    const viewport = {left: 16, top: 100, width: 358, height: 480};
    expect(intersects({left: 30, top: 50, width: 320, height: 45}, viewport)).toBe(false);
    expect(intersects({left: 30, top: 580, width: 320, height: 45}, viewport)).toBe(false);
    expect(intersects({left: 30, top: 80, width: 320, height: 45}, viewport)).toBe(true);
    expect(intersects({left: 30, top: 560, width: 320, height: 45}, viewport)).toBe(true);
  });
});


describe('Appearance and placement controls', () => {
  it.each([
    ['textSize', 14, 22, 18], ['iconSize', 16, 28, 20], ['radius', 8, 40, 28],
    ['itemSpacing', 0, 10, 3], ['surfaceOpacity', 30, 100, 58], ['blur', 0, 30, 10]
  ] as const)('validates %s against the manifest range', (key, min, max, initial) => {
    expect(manifest.settings.find(row => row.key === key)).toMatchObject({default: initial, min, max});
    expect(resolveSettings({[key]: -999})[key]).toBe(min);
    expect(resolveSettings({[key]: 999})[key]).toBe(max);
    for (const bad of [NaN, Infinity, '22;position:fixed', null]) expect(resolveSettings({[key]: bad})[key]).toBe(initial);
  });
  it('keeps new default controls neutral for all existing layout proportions', () => {
    for (const variant of ['panel', 'grid', 'sheet'] as const) {
      const html = render({variant});
      expect(html).toContain('--fp-text-scale:1;--fp-icon-scale:1;--fp-radius-scale:1;');
      expect(html).toContain('--fp-gap:3px;--fp-gap-grid:5px;--fp-gap-sheet:2px;');
      expect(html).toContain('--fp-opacity:58%;--fp-opacity-dense:78%;--fp-blur:10px;--fp-blur-dense:24px');
    }
    expect(resolveSettings()).toMatchObject(Object.fromEntries(manifest.settings.map(row => [row.key, row.default])));
  });
  it('wires configured values into CSS and validates icon and placement switches', () => {
    const html = render({textSize: 22, iconSize: 28, radius: 40, itemSpacing: 0, surfaceOpacity: 100, blur: 0, showIcons: false});
    expect(html).toContain('data-fp-icons="false"'); expect(html).toContain('--fp-icon-scale:1.4;');
    expect(html).toContain('--fp-gap:0px;--fp-gap-grid:2px;--fp-gap-sheet:0px;');
    expect(html).toContain('--fp-opacity:100%;--fp-opacity-dense:100%;--fp-blur:0px;--fp-blur-dense:0px');
    expect(resolveSettings({showIcons: 'false', placement: 'below;left:0'})).toMatchObject({showIcons: true, placement: 'auto'});
  });
  it('honors the preferred side and falls back when a 44px row cannot fit', () => {
    const viewport = {width: 800, height: 800}, anchor = {left: 100, top: 400, width: 70, height: 36};
    const above = popupGeometry(anchor, 336, 295, viewport, false, 'above');
    const below = popupGeometry(anchor, 336, 295, viewport, false, 'below');
    expect(above.top + above.height).toBeLessThan(anchor.top);
    expect(below.top).toBeGreaterThan(anchor.top + anchor.height);
    expect(popupGeometry({...anchor, top: 16}, 336, 295, viewport, false, 'above').top).toBe(62);
    expect(popupGeometry({...anchor, top: 748}, 336, 295, viewport, false, 'below').top).toBe(443);
    expect(popupGeometry(anchor, 336, 295, viewport, true, 'below')).toEqual(popupGeometry(anchor, 336, 295, viewport, true, 'above'));
  });
});
