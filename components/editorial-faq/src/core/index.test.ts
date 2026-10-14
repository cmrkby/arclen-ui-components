import {describe,it,expect} from 'vitest';
import {defaults,resolveSettings,render} from './index';
describe('Editorial FAQ contract',()=>{
 it('resolves bounded paired lists and invalid selections',()=>{expect(resolveSettings({titles:['One'],descriptions:['Answer'],initialOpen:2}).initialOpen).toBe(-1);expect(resolveSettings({titles:['One'],descriptions:['One','Two']})).toEqual(defaults);expect(resolveSettings({titles:['x'.repeat(81)]}).titles).toEqual(defaults.titles);expect(resolveSettings({motionScale:NaN,maxWidth:Infinity}).motionScale).toBe(1);expect(resolveSettings({motionScale:9,maxWidth:-1})).toMatchObject({motionScale:2,maxWidth:0})});
 it('escapes text and keeps every answer readable before enhancement',()=>{const html=render({titles:['<img onerror="bad">'],descriptions:['<script>bad</script>']});expect(html).toContain('&lt;img');expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>');expect(html).not.toContain(' hidden');expect(html).toContain('disabled aria-expanded="true"')});
 it('does not mutate manifest defaults through resolved arrays',()=>{const value=resolveSettings({});value.titles[0]='Changed';expect(defaults.titles[0]).not.toBe('Changed')});
});

it("keeps style-default width and floors only positive custom caps",()=>{expect(resolveSettings({maxWidth:0}).maxWidth).toBe(0);expect(resolveSettings({maxWidth:8}).maxWidth).toBe(240);expect(resolveSettings({maxWidth:480}).maxWidth).toBe(480);expect(resolveSettings({maxWidth:1440}).maxWidth).toBe(1440)});
