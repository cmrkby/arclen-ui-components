import {describe,it,expect} from 'vitest';
import {defaults,resolveSettings,render} from './index';
import manifest from '../../component.json';
describe('Text Reel portable contract',()=>{
 it('derives manifest defaults and retains ordered phrases',()=>{expect(defaults).toEqual(Object.fromEntries(manifest.settings.map(s=>[s.key,s.default])));expect(resolveSettings({words:['third','first','second']}).words).toEqual(['third','first','second']);});
 it('handles empty, single, maximum and invalid lists',()=>{expect(resolveSettings({words:[]}).words).toEqual(defaults.words);expect(resolveSettings({words:['Only']}).words).toEqual(['Only']);expect(resolveSettings({words:Array(24).fill('word')}).words).toHaveLength(24);expect(resolveSettings({words:Array(25).fill('word')}).words).toEqual(defaults.words);expect(resolveSettings({words:['valid','']}).words).toEqual(defaults.words);});
 it('escapes hostile copy and includes an accessible static phrase',()=>{const html=render({leading:'Build & ship',words:['<agents>','APIs']});expect(html).toContain('Build &amp; ship &lt;agents&gt;');expect(html).not.toContain('<agents>');expect(html).toContain('aria-live="off"');expect((html.match(/class="tr-item"/g)??[]).length).toBe(38);});
 it('round trips every mode',()=>{for(const mode of ['original','readable','on-demand']){const state=resolveSettings({mode});expect(resolveSettings(JSON.parse(JSON.stringify(state)))).toEqual(state);}});
});
