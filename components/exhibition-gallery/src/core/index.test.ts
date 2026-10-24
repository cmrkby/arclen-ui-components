import {describe,expect,it} from 'vitest';
import {defaults,render,resolveSettings} from './index';

describe('Exhibition Gallery portable settings and output',()=>{
 it('renders all twelve photographs without browser globals',()=>{
  const html=render();
  expect((html.match(/class="eg-tile"/g)||[])).toHaveLength(12);
  expect(html).toContain('Atlantic edge');
  expect(html).not.toContain('automotive-');
  expect(html).not.toContain('low-weather-');
 });
 it('isolates list defaults between consumers',()=>{
  const changed=resolveSettings();changed.captions[0]='Changed';
  expect(resolveSettings().captions[0]).toBe(defaults.captions[0]);
 });
 it('escapes custom metadata and preserves one image with several filters',()=>{
  const html=render({imageUrls:['./photo.webp'],captions:['<script>bad()</script>'],categories:['Field'],memberships:['Field, Quiet']});
  expect(html).not.toContain('<script>');
  expect(html).toContain('&lt;script&gt;');
  expect((html.match(/class="eg-tile"/g)||[])).toHaveLength(1);
  expect(html).toContain('data-category="Quiet"');
 });
 it.each([null,[],{columns:NaN},{gap:100},{viewer:'yes'},{direction:'a'},{imageUrls:['javascript:alert(1)']},{imageUrls:['data:image/svg+xml,<svg onload=alert(1)>']},{background:'url(https://example.com)'}])('rejects invalid settings %#',input=>{
  expect(()=>resolveSettings(input)).toThrow();
 });
 it('supports semantic image links when the viewer is disabled',()=>{
  const html=render({viewer:false,imageUrls:['./photo.webp'],captions:['A field']});
  expect(html).toContain('href="./photo.webp"');
  expect(html).toContain('A field');
 });
});
