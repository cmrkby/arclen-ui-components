import {describe,expect,it} from 'vitest';
import {defaults,render,resolveSettings} from './src/core';
import {opticalKeys} from './src/core/settings';
import manifest from './component.json';

describe('Liquid Glass',()=>{
  it('exposes the measured optics and validates values at both bounds',()=>{
    expect(opticalKeys).toHaveLength(13);
    for(const rule of manifest.settings.filter(rule=>rule.kind==='number')){
      const key=rule.key as typeof opticalKeys[number];
      expect(resolveSettings({[key]:-100})[key]).toBe(rule.min);
      expect(resolveSettings({[key]:2000})[key]).toBe(rule.max);
      expect(resolveSettings({[key]:NaN})[key]).toBe(defaults[key]);
    }
  });
  it('renders the full caption before hydration and escapes markup without inserting line breaks',()=>{
    const html=render({caption:'Side <A> & Guy-Manuel de Homem-Christo.',showRing:false});
    expect(html).toContain('<p>Side &lt;A&gt; &amp; Guy-Manuel de Homem-Christo.</p>');
    expect(html).toContain('class="lg-ring" aria-hidden="true" hidden');
    expect(html).toContain('aria-label="Lens controls" inert');
    expect(html.match(/type="range"/g)).toHaveLength(13);
  });
});
