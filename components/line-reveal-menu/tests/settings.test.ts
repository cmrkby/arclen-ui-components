import {test} from 'vitest';
import assert from 'node:assert/strict';
import manifest from '../component.json';
import {defaults,resolveSettings,render,safeDestination} from '../src/core';

test('manifest defaults render without a browser and retain the approved dimensions', () => {
  assert.deepEqual(defaults, Object.fromEntries(manifest.settings.map(s => [s.key, s.default])));
  const html = render();
  for (const value of ['--lm-rest:12px', '--lm-length:24px', '--lm-near:18px', '--lm-size:14px', '--lm-space:8px', '--lm-row:22px', '--lm-collapsed:16px', '--lm-tracking:0em']) assert.ok(html.includes(value), value);
  assert.equal((html.match(/class="lm-link"/g) || []).length, 5);
  assert.ok(html.includes('data-labels-visible="false"'));
  assert.ok(html.includes('data-paused="false"'));
});

test('every numerical control accepts its bounds and rejects out-of-range or off-step input', () => {
  for (const setting of manifest.settings.filter(s => s.kind === 'number')) {
    for (const value of [setting.min, setting.max]) assert.equal(resolveSettings({ [setting.key]: value })[setting.key as keyof typeof defaults], value);
    for (const value of [NaN, Infinity, setting.min! - setting.step!, setting.max! + setting.step!, setting.min! + setting.step! / 2]) assert.throws(() => resolveSettings({ [setting.key]: value }), /Invalid setting/, `${setting.key}: ${value}`);
  }
  assert.throws(() => resolveSettings({ initialIndex: 1.5 }), /Invalid setting/);
});

test('typed controls reject invalid values and callers cannot mutate defaults through resolved arrays', () => {
  for (const input of [null, [], 'menu', { unknown: 1 }, { motion: 'false' }, { fontFamily: 'url(x)' }, { labelCase: 'title' }, { textColor: 'red' }, { labels: ['x'.repeat(81)] }, { labels: new Array(2) }, { destinations: new Array(13).fill('#x') }]) assert.throws(() => resolveSettings(input));
  const input = { labels: ['One'], destinations: ['#one'] }, resolved = resolveSettings(input);
  input.labels[0] = 'Changed'; resolved.destinations[0] = '#changed';
  assert.equal(resolved.labels[0], 'One');
  assert.equal(input.destinations[0], '#one');
  assert.deepEqual(resolveSettings().labels, defaults.labels);
});

test('content pairs keep their source indices, omit unsafe or empty pairs, and escape text', () => {
  const html = render({ labels: ['<First>', '', 'Third', 'Fourth', 'Fifth'], destinations: ['#first', '#second', 'javascript:alert(1)', '/fourth'] });
  assert.ok(html.includes('&lt;First&gt;'));
  assert.ok(html.includes('data-lm-index="0"'));
  assert.ok(html.includes('data-lm-index="3"'));
  assert.equal((html.match(/class="lm-link"/g) || []).length, 2);
  assert.ok(!html.includes('javascript:'));
  assert.equal((render({ labels: [], destinations: [] }).match(/class="lm-link"/g) || []).length, 0);
  const external = render({ labels: ['Read'], destinations: ['https://example.com'], newTab: true });
  assert.ok(external.includes('rel="noopener noreferrer"'));
  assert.ok(external.includes('(opens in new tab)'));
});

test('URL policy accepts navigation URLs and rejects executable, ambiguous and credentialed inputs', () => {
  for (const url of ['#section', '/about', './about', '../about', 'https://example.com/a%20b', 'HTTP://example.com', 'mailto:hello@example.com']) assert.ok(safeDestination(url), url);
  for (const url of ['', '//example.com', '/\\example.com', 'javascript:alert(1)', 'data:text/html,x', 'https://name:pass@example.com', 'https://example.com/a b', 'mailto:a@b?subject=x']) assert.equal(safeDestination(url), null, url);
});

test('typography, persistent labels and motion switches reach the rendered contract', () => {
  const html = render({ fontFamily: 'sans', labelCase: 'lowercase', tracking: .04, rowHeight: 36, collapsedHeight: 24, showLabels: true, motion: false });
  for (const value of ['--lm-font:system-ui,sans-serif', '--lm-case:lowercase', '--lm-tracking:0.04em', '--lm-row:36px', '--lm-collapsed:24px', 'data-labels-visible="true"', 'data-paused="true"']) assert.ok(html.includes(value), value);
  assert.ok(render({ direction: 'directory' }).includes('--lm-case:none'));
  assert.ok(render({ direction: 'horizon' }).includes('--lm-case:uppercase'));
});


test('exported defaults cannot contaminate later instances while resolved settings remain editable', () => {
  const original = resolveSettings();
  assert.ok(Object.isFrozen(defaults));
  assert.ok(Object.isFrozen(defaults.labels));
  assert.ok(Object.isFrozen(defaults.destinations));
  assert.equal(Reflect.set(defaults.labels,'0','Changed'),false);
  assert.throws(() => Array.prototype.push.call(defaults.destinations,'#extra'),TypeError);
  assert.equal(Reflect.set(defaults,'duration',0),false);
  const first = resolveSettings(), second = resolveSettings();
  first.labels[0] = 'Editable'; first.duration = 0;
  assert.deepEqual(second, original);
  assert.deepEqual(resolveSettings(), original);
});
