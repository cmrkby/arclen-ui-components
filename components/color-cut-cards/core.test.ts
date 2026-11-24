import {expect,it} from 'vitest';
import {render} from './src/core';

it('keeps the artwork in place unless a destination is supplied',()=>{
 for(const collection of ['signal','obsidian','optical']){
  const html=render({collection});
  expect(html.match(/class="cc-card" tabindex="0"/g)).toHaveLength(3);
  expect(html).not.toMatch(/<a\b[^>]*\shref=/);
 }
 const links=render({href1:'/models',href2:'javascript:alert(1)'});
 expect(links.match(/<a\b[^>]*\shref=/g)).toHaveLength(1);
 expect(links).toContain('href="/models"');
});
