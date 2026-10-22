import {describe,expect,it} from 'vitest';
import {balancedColor,rampWeights} from './colour-balance';
import {defaults,resolveSettings,render} from './index';
import {fallbackImage} from './fallback';
const keys=['coreStrength','glowStrength','edgeStrength','rimStrength'] as const;
describe('Relative colour balance',()=>{
 it('normalizes contributions instead of dimming and ignores a removed colour',()=>{
  const colors=['#FF0000','#00FF00','#0000FF','#FFFFFF'];
  expect(balancedColor(colors,[1,1,1,1],[.5,.5,0,0])).toBe('#808000');
  expect(balancedColor(colors,[2,1,1,1],[.5,.5,0,0])).toBe('#AA5500');
  expect(balancedColor(colors,[0,1,1,1],[.5,.5,0,0])).toBe('#00FF00');
  expect(balancedColor(colors,[0,1,1,1],[1,0,0,0])).toBe('#00FF00');
  expect(balancedColor(colors,[0,0,0,0],[1,0,0,0])).toBe('#000000');
 });
 it('preserves relative balance when all strengths have the same scale',()=>{
  const colors=['#FEDCBA','#A54321','#42B064','#5577CC'],weights=rampWeights([.4,.6,.2]);
  expect(weights.reduce((a,b)=>a+b,0)).toBeCloseTo(1);
  expect(balancedColor(colors,[.5,.5,.5,.5],weights)).toBe(balancedColor(colors,[2,2,2,2],weights));
  for(const variant of ['original','ribbons','blanket'] as const){const base=resolveSettings({variant});expect(fallbackImage({...base,coreStrength:2,glowStrength:2,edgeStrength:2,rimStrength:2})).toBe(fallbackImage(base));}
 });
 for(const key of keys)it(`validates ${key} and defaults to 1`,()=>{
  expect(defaults[key]).toBe(1);for(const value of [0,.05,.67,1,2])expect(resolveSettings({[key]:value})[key]).toBe(value);
  for(const value of [-.01,2.01,NaN,Infinity,'1',null])expect(()=>resolveSettings({[key]:value})).toThrow();
 });
 it('renders an opaque black static scene for all-zero strengths in every structure',()=>{
  for(const variant of ['original','ribbons','blanket']){const html=render({variant,coreStrength:0,glowStrength:0,edgeStrength:0,rimStrength:0});expect(html).toContain('background-color:#000;background-image:none');}
 });
 it('changes configured CSS colors for each independent strength without changing the host dimensions',()=>{
  for(const variant of ['original','ribbons','blanket'])for(const key of keys){const base=render({variant,height:420});const next=render({variant,height:420,[key]:.25});expect(next).not.toBe(base);expect(next).toContain('height:420px');expect(next).not.toContain('NaN');}
 });
 it('keeps the soft-field CSS rim warm-calibrated while fading into black',()=>{
  const settings=resolveSettings({variant:'blanket',coreStrength:0,glowStrength:0,edgeStrength:0,rimStrength:1});
  const stops=[...fallbackImage(settings).matchAll(/#([a-f0-9]{6})([a-f0-9]{2})/gi)];
  expect(stops.length).toBeGreaterThan(2);
  expect(new Set(stops.map(stop=>stop[1].toLowerCase()))).toEqual(new Set(['691c2c']));
  const opacity=stops.map(stop=>parseInt(stop[2],16));
  expect(opacity[0]).toBe(255);expect(opacity.at(-1)).toBe(0);
  expect(opacity.every((value,i)=>i===0||value<=opacity[i-1])).toBe(true);
 });

});
