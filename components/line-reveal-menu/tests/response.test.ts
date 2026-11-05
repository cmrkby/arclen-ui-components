import {test} from 'vitest';
import assert from 'node:assert/strict';
import {response, blendColor} from '../src/core/response';

test('response preserves the default acceleration and small overshoot', () => {
  assert.equal(response(0, 400, .2), 0);
  assert.ok(Math.abs(response(100, 400, .2) - .74835) < .0001);
  assert.ok(response(235, 400, .2) > 1.014 && response(235, 400, .2) < 1.016);
  assert.equal(response(400, 400, .2), 1);
  assert.equal(response(500, 400, .2), 1);
  assert.equal(response(0, 0, .2), 1);
});

test('zero bounce is monotonic and duration rescales the same response', () => {
  let previous = 0;
  for (let ms = 0; ms <= 400; ms += 5) {
    const value = response(ms, 400, 0);
    assert.ok(value >= previous && value <= 1);
    previous = value;
    assert.ok(Math.abs(response(ms, 400, .2) - response(ms / 2, 200, .2)) < 1e-10);
  }
});

test('color changes preserve endpoints, gamma-aware brightness, and valid alpha', () => {
  assert.equal(blendColor('#454545', '#a0a0a0', 0), 'rgba(69,69,69,1)');
  assert.equal(blendColor('#454545', '#a0a0a0', 1), 'rgba(160,160,160,1)');
  assert.equal(blendColor('#000000', '#ffffff', .5), 'rgba(180,180,180,1)');
  assert.equal(blendColor('transparent', '#ffffff', 2), 'rgba(361,361,361,1)');
});
