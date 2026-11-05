import {describe,it,expect} from 'vitest';
import {defaults,resolveSettings,resolvePatch} from './settings';
import {backingSize} from './renderer';
describe('Luminous Folds settings',()=>{
 it('resolves declared defaults and preserves unrelated patch values',()=>{expect(resolveSettings()).toEqual(defaults);const next=resolvePatch({blueColor:'#aabbcc',speed:0},{...defaults,emberStrength:.4});expect(next.blueColor).toBe('#AABBCC');expect(next.emberStrength).toBe(.4);expect(next.speed).toBe(0);expect(defaults.blueColor).toBe('#087EFF');});
 it.each([null,[],1,{speed:NaN},{speed:Infinity},{speed:-1},{speed:4},{blueColor:'transparent'},{blueColor:'#12345678'},{blueColor:'red'},{layout:'auto'},{unknown:1},{[Symbol('key')]:1}])('rejects invalid input atomically: %s',input=>{const before={...defaults};expect(()=>resolvePatch(input,before)).toThrow();expect(before).toEqual(defaults);});
 it('bounds backing allocations at large dimensions and hardware limits',()=>{for(const [w,h,dpr] of [[390,600,3],[1440,900,2],[8000,8000,4],[1,1,1]]){const s=backingSize(w,h,dpr);expect(s.width*s.height).toBeLessThanOrEqual(1250000);expect(s.width).toBeLessThanOrEqual(4096);expect(s.height).toBeLessThanOrEqual(4096);}expect(backingSize(2000,1000,2,512).width).toBe(512);});
});
