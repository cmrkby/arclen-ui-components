import {describe,it,expect} from 'vitest';
import {defaults,resolveSettings,render} from './index';
import manifest from '../../component.json';
describe('Signal Field portable contract',()=>{
 it('uses manifest defaults and survives JSON round trips',()=>{expect(defaults).toEqual(Object.fromEntries(manifest.settings.map(s=>[s.key,s.default])));expect(resolveSettings(JSON.parse(JSON.stringify(defaults)))).toEqual(defaults);});
 it('accepts every declared numeric boundary',()=>{for(const control of manifest.settings){if(control.kind==='number')for(const value of [control.min,control.max])expect((resolveSettings({[control.key]:value}) as unknown as Record<string,unknown>)[control.key]).toBe(value);}});
 it('normalizes invalid shapes and hostile values without emitting markup',()=>{expect(resolveSettings(null)).toEqual(defaults);expect(resolveSettings({speed:Infinity,baseColor:'red;position:fixed'}).baseColor).toBe(defaults.baseColor);expect(render({showText:true,text:'<script>alert(1)</script>'})).not.toContain('<script>');});
 it('shows the reference headline by default with legible fallback contrast',()=>{expect(defaults.showText).toBe(true);expect(render()).toContain('color:#211e34');expect(render({showText:false})).not.toContain('Motion, made visible.');});
 it('renders useful SSR markup without browser globals',()=>{expect(render()).toContain('linear-gradient');expect(render({showText:true})).toContain('Motion, made visible.');});
});
