import {describe,it,expect} from 'vitest';
import {defaults,resolveSettings,render} from './src/core';
import manifest from './component.json';
import {validateSettings,type ComponentManifest} from '../../packages/spec';
describe('Gooey Switch standalone contract',()=>{
 it('validates all concrete defaults and complete presets',()=>{
  expect(validateSettings(manifest as ComponentManifest,defaults)).toEqual(defaults);
  for(const p of manifest.previews){expect(Object.keys(p.settings)).toHaveLength(15);expect(validateSettings(manifest as ComponentManifest,p.settings)).toEqual(p.settings);}
 });
 it('bounds finite numeric inputs and ignores inherited or unknown fields',()=>{
  const s=resolveSettings({width:999,stretchAmount:-1,springDamping:22.3,motionDuration:NaN,shadowStrength:Infinity});
  expect(s.width).toBe(520);expect(s.stretchAmount).toBe(0);expect(s.springDamping).toBe(22.5);expect(s.motionDuration).toBe(880);expect(s.shadowStrength).toBe(1);
  expect(resolveSettings(Object.create({checked:true})).checked).toBe(false);
  expect(resolveSettings(null)).toEqual(defaults);expect(resolveSettings([])).toEqual(defaults);
 });
 it('keeps strings, colors, semantics and generated IDs safe',()=>{
  expect(resolveSettings({accessibleName:'   ',inkColor:'url(https://example.com)',interaction:'invalid',checked:'yes'})).toEqual(defaults);
  const html=render({accessibleName:'<img onerror="bad">',checked:true},'unsafe"><id');
  expect(html).toContain('aria-checked="true"');expect(html).toContain('&lt;img');expect(html).not.toContain('<img');expect(html).not.toContain('id="unsafe">');
  expect(render()).not.toEqual(render());
 });
 it('renders a usable static endpoint without browser globals',()=>{
  const html=render({checked:true,disabled:true,width:160});expect(html).toContain('cx="266"');expect(html).toContain('role="switch"');expect(html).toContain(' disabled');expect(html).toContain('--gooey-width:160px');
  expect(html.match(/data-gooey-drop/g)).toHaveLength(28);expect(html).toContain('aria-hidden="true"');expect(html).toContain('data-gooey-motion="rest"');
 });
});
