import { describe, expect, it } from 'vitest';
import { defaults, render, resolveSettings } from './index';

describe('Cascade Menu delivery safety', () => {
  it('uses the host theme by default while allowing explicit overrides', () => {
    expect(defaults.theme).toBe('system');
    expect(render()).toContain('theme="system"');
    expect(render({theme:'dark'})).toContain('theme="dark"');
    expect(render({lightWheel:'#123456',darkWheel:'#654321'})).toContain('--wheel-light:#123456');
    expect(render({lightWheel:'#123456',darkWheel:'#654321'})).toContain('--wheel-dark:#654321');
    expect(() => resolveSettings({lightWheel:'red; background:url(javascript:alert(1))'})).toThrow('Invalid color');
  });
  it('rejects scriptable action URLs before rendering or mounting', () => {
    const urls = [...defaults.itemUrls];
    urls[0] = 'javascript:alert(1)';
    expect(() => resolveSettings({ itemUrls: urls })).toThrow('Unsafe action URL');
  });

  it('escapes configured labels and links in the no-JavaScript fallback', () => {
    const labels = [...defaults.itemLabels];
    const urls = [...defaults.itemUrls];
    labels[0] = '<Work & Life>';
    urls[0] = '/search?q="hello"&page=1';
    const html = render({ itemLabels: labels, itemUrls: urls });
    expect(html).toContain('&lt;Work &amp; Life&gt;');
    expect(html).toContain('/search?q=&quot;hello&quot;&amp;page=1');
    expect(html).not.toContain('<Work & Life>');
  });
});
