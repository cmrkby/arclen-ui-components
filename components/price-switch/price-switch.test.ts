import {describe,it,expect} from 'vitest';
import {defaults,resolveSettings,render,spring} from './src/core';
import {resolveGeometry} from './src/core/geometry';
import {createPlanMemory} from './src/core/selection';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PriceSwitch} from './src/react';
import manifest from './component.json';
import {validateSettings,type ComponentManifest} from '../../packages/spec';
describe('Price Switch portable settings and static delivery',()=>{
  it('has one composition with complete manifest-derived defaults and preset',()=>{
    expect(Object.fromEntries(manifest.settings.map(s=>[s.key,s.default]))).toEqual(defaults);
    expect(validateSettings(manifest as ComponentManifest,defaults)).toEqual(defaults);
    expect(manifest.previews).toHaveLength(1);
    expect(validateSettings(manifest as ComponentManifest,manifest.previews[0].settings)).toEqual(defaults);
    expect(defaults).not.toHaveProperty('variant');
    expect(resolveSettings({variant:'cards'})).toEqual(defaults);
    expect(render()).not.toContain('data-variant');
  });
  it('bounds and quantizes every numeric setting against its manifest contract',()=>{
    for(const setting of manifest.settings){
      if(setting.kind!=='number')continue;
      const key=setting.key as keyof typeof defaults;
      expect(resolveSettings({[key]:-999})[key]).toBe(setting.min);
      expect(resolveSettings({[key]:9999})[key]).toBe(setting.max);
      for(const invalid of [NaN,Infinity,'20',null])expect(resolveSettings({[key]:invalid})[key]).toBe(defaults[key]);
    }
    expect(resolveSettings({duration:435,shadowStrength:.176})).toMatchObject({duration:440,shadowStrength:.18});
    expect(resolveSettings(null)).toEqual(defaults);expect(resolveSettings([])).toEqual(defaults);
    expect(resolveSettings(Object.create({value:'annual',height:88}))).toEqual(defaults);
    expect(resolveSettings({trackColor:'url(https://example.com)',value:'x',freeLabel:'   '})).toEqual(defaults);
    for(const value of [new String('annual'),{toString:()=> 'annual'},['monthly']]) {
      expect(resolveSettings({value}).value).toBe(defaults.value);
      expect(render({value}).match(/aria-pressed="true"/g)).toHaveLength(1);
    }
  });
  it('keeps button targets and the selected text line inside the allowed geometry extremes',()=>{
    for(let height=52;height<=88;height++)for(let outerPadding=2;outerPadding<=10;outerPadding++)for(const textSize of [14,18,24]){
      const g=resolveGeometry({height,outerPadding,textSize});
      expect(g.padding).toBeLessThanOrEqual(outerPadding);
      expect(g.targetHeight).toBeGreaterThanOrEqual(44);
      expect(g.targetHeight+g.padding*2).toBe(height);
      expect(g.targetHeight-g.innerInset*2).toBeGreaterThanOrEqual(textSize*1.2+4-1e-9);
      // At the narrowest permitted width and largest section gap, the paid
      // buttons share the right half-cell with no extra internal gaps.
      const halfCell=(280-2*g.padding-12)/2;
      expect(halfCell/2).toBeGreaterThanOrEqual(44);
    }
    expect(resolveGeometry(defaults)).toEqual({padding:4,targetHeight:48,innerInset:4});
    expect(resolveGeometry(resolveSettings({height:52,outerPadding:10}))).toEqual({padding:4,targetHeight:44,innerInset:4});
    expect(resolveSettings({height:52,outerPadding:10}).outerPadding).toBe(10);
  });
  it('retains configured settings in static delivery while escaping all text',()=>{
    const s=resolveSettings({value:'annual',accessibleName:'<Billing>',freeLabel:'Basic',premiumLabel:'Plus & more',monthlyLabel:'Month',annualLabel:'Year',width:600,height:80,outerPadding:8,sectionGap:12,textSize:24,shadowStrength:.25,radius:12,duration:600,trackColor:'#abcdef',activeColor:'#222222',selectedColor:'#333333',textColor:'#444444',activeTextColor:'#dddddd',mutedColor:'#555555'});
    const html=render(s);
    for(const value of ['annual','&lt;Billing&gt;','Basic','Plus &amp; more','Month','Year','--ps-width:600px','--ps-height:80px','--ps-pad:8px','--ps-gap:12px','--ps-text-size:24px','--ps-shadow:0.25','--ps-radius:12px','--ps-duration:600ms','#abcdef','#222222','#333333','#444444','#dddddd','#555555'])expect(html).toContain(value);
    expect(render({freeLabel:'<img src=x onerror="bad">'})).not.toContain('<img');
    expect(resolveSettings({freeLabel:'a'.repeat(30)}).freeLabel).toHaveLength(24);
    expect(resolveSettings({accessibleName:'a'.repeat(90)}).accessibleName).toHaveLength(80);
  });
  it('uses two-stage hidden and inert SSR semantics, including configured React delivery',()=>{
    const free=render({value:'free',premiumLabel:'Upgrade & choose'});
    expect(free).toContain('class="ps-sub" hidden inert');
    expect(free).toMatch(/data-go="premium" data-anim aria-pressed="false" title="Upgrade &amp; choose"/);
    expect(free.match(/aria-pressed="true"/g)).toHaveLength(1);
    for(const value of ['monthly','annual'] as const){
      const html=render({value});
      expect(html).toMatch(/data-go="premium" data-anim aria-pressed="false" hidden inert/);
      expect(html).toContain('<div class="ps-sub">');
      expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
      expect(html).not.toContain('aria-live');
    }
    const react=renderToStaticMarkup(createElement(PriceSwitch,{defaultValue:'free',premiumLabel:'Choose paid',height:80}));
    expect(react).toContain('class="ps-sub" hidden inert');
    expect(react).toContain('Choose paid');
    expect(react).toContain('--ps-height:80px');
  });
  it('remembers only committed paid choices, defaults Premium to Monthly and isolates instances',()=>{
    const first=createPlanMemory('free'),second=createPlanMemory('annual');
    expect(first.request('premium')).toBe('monthly');
    expect(second.request('premium')).toBe('annual');
    // A controlled request is read-only until its parent commits the value.
    expect(first.request('annual')).toBe('annual');
    expect(first.request('premium')).toBe('monthly');
    first.commit('annual');first.commit('free');
    expect(first.request('premium')).toBe('annual');
    first.commit('monthly');first.commit('free');
    expect(first.request('premium')).toBe('monthly');
    expect(second.request('premium')).toBe('annual');
    expect(first.request('free')).toBe('free');
  });
  it('keeps the calibrated spring bounded, finite and consistently scaled',()=>{
    expect(spring(0)).toBe(0);expect(spring(-10)).toBe(0);
    expect(spring(400)).toBe(1);expect(spring(10000)).toBe(1);
    expect(spring(233)).toBeGreaterThan(1);
    expect(spring(100,400)).toBeCloseTo(spring(200,800),12);
    for(let t=0;t<=400;t+=5){expect(spring(t)).toBeGreaterThanOrEqual(0);expect(spring(t)).toBeLessThan(1.02);}
  });
});
