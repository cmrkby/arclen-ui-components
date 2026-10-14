import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {defaults,resolveSettings,render} from './index';
import {artwork} from './assets';
import {COMPONENT_VERSION} from './props';
import {coverRect,targetFor,samplePoint,samplingPitch} from './math';
import manifest from '../../component.json';
describe('Halftone portable contract',()=>{
 it('marks every original portrait for Arclen Gallery without marking the generated poster',()=>{const originals=manifest.assets.filter(a=>a.path.startsWith('assets/')&&a.path.endsWith('.webp'));expect(originals).toHaveLength(3);expect(originals.every(a=>a.gallery===true)).toBe(true);expect(manifest.assets.find(a=>a.path==='poster.webp')?.gallery).toBeUndefined();});
 it('uses manifest defaults with all numeric bounds accepted',()=>{expect(COMPONENT_VERSION).toBe(manifest.version);expect(defaults).toEqual(Object.fromEntries(manifest.settings.map(s=>[s.key,s.default])));for(const control of manifest.settings){if(control.kind==='number')for(const value of [control.min,control.max])expect((resolveSettings({[control.key]:value}) as unknown as Record<string,unknown>)[control.key]).toBe(value);}});
 it('ships exactly the bundled artwork bytes and renders default artwork on the server',()=>{for(const [name,url]of Object.entries(artwork)){const bytes=readFileSync(new URL(`../../assets/${name}.webp`,import.meta.url));expect(Buffer.from(url.split(',')[1]!,'base64').equals(bytes)).toBe(true);}expect(render()).toContain(artwork.ronin);});
 it('rejects unsafe settings but supports local uploads and custom hosted images',()=>{expect(resolveSettings({src:'javascript:alert(1)',background:'red;position:fixed'})).toEqual(defaults);for(const src of ['blob:https://example.com/image','https://example.com/image.webp','assets/photo.webp'])expect(resolveSettings({src}).src).toBe(src);expect(render({alt:'<script>x</script>'})).not.toContain('<script>');});
 it('preserves crop proportions and resets a reduced-motion pointer',()=>{const rect=coverRect(800,400,100,200,'contain',1,.5,.5);expect(rect).toEqual({x:300,y:0,width:200,height:400});expect(targetFor(20,30,{x:0,y:0,active:false},180,32)).toEqual([20,30]);expect(samplePoint(255,255,255,0,0,0,defaults)).toBeNull();});
 it('retains authored dot spacing without adapting it to the host or display density',()=>{for(const spacing of [2,3,4,8,12])expect(samplingPitch(spacing)).toBe(spacing);expect(samplingPitch(1)).toBe(2);expect(defaults.background).toBe('transparent');expect(resolveSettings({background:'#000000'}).background).toBe('#000000');});
 it('round trips each artwork preset',()=>{for(const preview of manifest.previews){const state=resolveSettings(preview.settings);expect(resolveSettings(JSON.parse(JSON.stringify(state)))).toEqual(state);}});
});
