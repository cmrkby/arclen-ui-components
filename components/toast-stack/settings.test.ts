import { describe, expect, it } from 'vitest';
import manifest from './component.json';
import { defaults, render, resolveSettings } from './src/core';
import { validateSettings, type ComponentManifest } from '../../packages/spec';

describe('Toast Stack settings and static HTML', () => {
  it('uses all manifest defaults and accepts every configured preview', () => {
    expect(resolveSettings()).toEqual(Object.fromEntries(manifest.settings.map(d => [d.key,d.default])));
    for (const preview of manifest.previews) expect(resolveSettings(preview.settings)).toEqual(validateSettings(manifest as ComponentManifest,preview.settings));
  });
  it('copies mutable lists and ignores undefined without accepting unknown fields', () => {
    const first=resolveSettings({messages:['Saved']});first.messages.push('Changed');
    expect(resolveSettings().messages).toEqual([]);expect(defaults.messages).toEqual([]);
    expect(resolveSettings({width:undefined}).width).toBe(420);
    expect(()=>resolveSettings({width:null})).toThrow();expect(()=>resolveSettings({unknown:undefined})).toThrow();
  });
  it('rejects unsafe and unbounded settings', () => {
    for(const input of [{width:NaN},{maxVisible:2.5},{inset:-1},{width:961},{textColor:'red;display:none'}, {title:'x'.repeat(241)}, {messages:['x'.repeat(241)]}, {messages:Array(21).fill('x')}]) expect(()=>resolveSettings(input)).toThrow();
  });
  it('renders readable escaped HTML and disables static actions', () => {
    const html=render({title:'<script>alert("x")</script>',description:'A & B',showAction:true,showClose:true,type:'loading'});
    expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');expect(html).toContain('A &amp; B');expect(html).toContain('disabled');expect(html).not.toContain('class="ats-close"');expect(html).not.toContain('opacity:0');expect(html).toContain('<ol');
  });
});

describe('Toast Stack gradient settings',()=>{
 it('uses the stronger status default while retaining neutral, flat and wide presets',()=>{
  expect(defaults.gradientMode).toBe('status');expect(defaults.gradientStrength).toBe(17);expect(defaults.gradientShape).toBe('spotlight');expect(defaults.gradientX).toBe(94);expect(defaults.gradientY).toBe(70);expect(defaults.gradientSpread).toBe(72);
  const monochrome=manifest.previews.find(p=>p.name==='Monochrome')!.settings;
  expect(resolveSettings(monochrome)).toMatchObject({palette:'monochrome',gradientMode:'neutral',gradientStrength:4,gradientShape:'spotlight',gradientX:52,gradientY:70,gradientSpread:72});
  for(const patch of [{gradientShape:'linear'},{gradientMode:'animated'},{gradientStrength:-1},{gradientStrength:61},{gradientStrength:28.5},{gradientStrength:NaN},{gradientX:-1},{gradientY:101},{gradientSpread:29},{gradientColor:'url(example)'}])expect(()=>resolveSettings(patch)).toThrow();
  expect(manifest.previews.find(p=>p.name==='Compact')?.settings).toMatchObject({gradientMode:'off'});
  expect(manifest.previews.find(p=>p.name==='Headless')?.settings).toMatchObject({gradientMode:'off'});
  expect(manifest.previews.find(p=>p.name==='Banner')?.settings).toMatchObject({gradientStrength:6});
  for(const gradientStrength of [0,17,60])expect(resolveSettings({gradientStrength}).gradientStrength).toBe(gradientStrength);
  const html=render({gradientShape:'wash',gradientMode:'custom',gradientColor:'#abcdef',gradientStrength:8,gradientX:20,gradientY:30,gradientSpread:60});
  expect(html).toContain('data-gradient-shape="wash"');expect(html).toContain('data-gradient="custom"');expect(html).toContain('--gradientColor:#abcdef');expect(html).toContain('--gradientStrength:8%');expect(html).toContain('--gradientX:20%');
  for(const type of ['success','info','warning','error'] as const){
   const fallback=render({type});expect(fallback).toContain('data-gradient-shape="spotlight"');expect(fallback).toContain('data-gradient="status"');expect(fallback).toContain('--gradientStrength:17%');expect(fallback).toContain(`data-type="${type}"`);
  }
 });
});
