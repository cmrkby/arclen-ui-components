import {describe,expect,it} from 'vitest';
import {defaults,render,resolveSettings} from './index';

describe('Border Tooltip portable settings and output',()=>{
 it('renders stable descriptive links without browser globals',()=>{
  const html=render({},'example');
  expect((html.match(/role="tooltip"/g)||[])).toHaveLength(3);
  expect(html).toContain('aria-describedby="example-0"');
  expect(html).toContain('id="example-0"');
 });
 it('escapes label text and instance identity',()=>{
  const html=render({labels:['<script>bad()</script>','Notes','Ideas']},'x" onclick="bad');
  expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');
  expect(html).toContain('x&quot; onclick=&quot;bad-0');
 });
 it('isolates defaults and accepts transparent focus color',()=>{
  const a=resolveSettings();a.labels[0]='Changed';
  expect(resolveSettings().labels[0]).toBe(defaults.labels[0]);
  expect(resolveSettings({accent:'transparent'}).accent).toBe('transparent');
 });
 it.each([null,[],{labels:[]},{labels:['','Notes','Ideas']},{placement:'middle'},{duration:NaN},{scale:3},{accent:'url(https://example.com)'},{unknown:true}])('rejects invalid settings %#',input=>{
  expect(()=>resolveSettings(input)).toThrow();
 });
});
