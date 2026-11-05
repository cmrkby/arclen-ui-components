import {describe,it,expect} from 'vitest';
import {render,defaults} from './index';
describe('Luminous Folds server markup',()=>{
 it('renders decorative bounded markup without DOM globals and escapes identifiers',()=>{const html=render({height:480},'a"<b');expect(html).toContain('height:480px');expect(html).toContain('aria-hidden="true"');expect(html).toContain('a&quot;&lt;b');expect(html).toContain('data-folds-fallback');expect(html).not.toContain('tabindex');expect(defaults.height).toBe(600);});
 it('supports fill and rejects malformed inputs before producing markup',()=>{expect(render({layout:'fill'})).toContain('height:100%');expect(()=>render({height:-1})).toThrow();expect(()=>render({},12 as unknown as string)).toThrow();});
});
