import {describe,it,expect} from 'vitest';
import {defaults,render,resolveSettings} from './index';
describe('Connected FAQ portable input boundary',()=>{
 it('keeps the accepted default appearance and paired content',()=>{const value=resolveSettings(null);expect(value.appearance).toBe('connected');expect(value.titles).toHaveLength(5);expect(value.descriptions).toHaveLength(5)});
 it('rejects mismatched and oversized paired text without losing readable fallback',()=>{expect(resolveSettings({titles:['Only one']}).titles).toEqual(defaults.titles);expect(resolveSettings({titles:['x'.repeat(81)],descriptions:['answer']}).titles).toEqual(defaults.titles)});
 it('treats invalid selection as all closed and clamps numeric controls',()=>{expect(resolveSettings({initialOpen:99,motionScale:Infinity,maxWidth:9999})).toMatchObject({initialOpen:-1,motionScale:1,maxWidth:1440});expect(resolveSettings({initialOpen:1.5,motionScale:-1})).toMatchObject({initialOpen:-1,motionScale:0})});
 it('escapes authored text and exposes every answer before enhancement',()=>{const html=render({titles:['<img onerror="alert(1)">'],descriptions:['A & B <script>bad()</script>']});expect(html).not.toContain('<img');expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');expect(html).toContain('aria-expanded="true" disabled');expect(html).not.toContain(' hidden')});
 it('returns independent lists so caller edits do not mutate defaults',()=>{const value=resolveSettings({});value.titles[0]='changed';expect(resolveSettings({}).titles[0]).toBe(defaults.titles[0])});
});

it("keeps style-default width and floors only positive custom caps",()=>{expect(resolveSettings({maxWidth:0}).maxWidth).toBe(0);expect(resolveSettings({maxWidth:8}).maxWidth).toBe(240);expect(resolveSettings({maxWidth:480}).maxWidth).toBe(480);expect(resolveSettings({maxWidth:1440}).maxWidth).toBe(1440)});
