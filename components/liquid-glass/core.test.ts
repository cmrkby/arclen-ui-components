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
  it('starts with a keyboard-operable pill and renders badges as text',()=>{
    expect(render()).not.toContain('lg-record');
    expect(render()).toContain('<canvas hidden>');
    expect(render()).toContain('class="lg-button" type="button" aria-pressed="false"');
    const badge=render({shape:'badge',badgeLabel:'Salt & sand',badgeWidth:180,badgeHeight:42,badgeRadius:4});
    expect(badge).toContain('Salt &amp; sand');
    expect(badge).toContain('--lg-radius:4px;--lg-width:180;--lg-height:42');
    expect(badge).not.toContain('<button');
  });
  it('renders the full caption before hydration and escapes markup without inserting line breaks',()=>{
    const html=render({shape:'card',caption:'Side <A> & Guy-Manuel de Homem-Christo.',showRing:false});
    expect(html).toContain('<p>Side &lt;A&gt; &amp; Guy-Manuel de Homem-Christo.</p>');
    expect(html).toContain('class="lg-ring" aria-hidden="true" hidden');
    expect(html).not.toMatch(/<(button|input|section)\b/);
  });
});
