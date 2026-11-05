import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {defaults, render, resolveSettings} from './index';
import {createEngine, cubicBezier} from './engine';
import {admittedLogoData} from './logo-data';
import manifest from '../../component.json';
import {validateSettings} from '../../../../packages/spec';
describe('Growing Navigation settings and SSR',()=>{
  it('uses independent list defaults from the manifest and the unchanged schema validator',()=>{
    expect(resolveSettings()).toEqual(validateSettings(manifest as never,{}));
    const first=resolveSettings();first.primaryLabels[0]='Changed';expect(resolveSettings().primaryLabels[0]).toBe('Overview');expect(defaults.primaryLabels[0]).toBe('Overview');
  });
  it.each([null,[],false,42,'settings',{missing:true},{height:NaN},{height:Infinity},{height:319},{radius:41},{closedWidth:'400'},{initialOpen:'yes'},{layout:'screen'},{logoText:''},{logoText:'x'.repeat(81)},{surface:'red'},{surface:'url(https://bad.test)'},{primaryLabels:['one']},{primaryLabels:Array(9).fill('x'),primaryUrls:Array(9).fill('#x')},{primaryLabels:['']},{primaryUrls:['javascript:alert(1)','#examples','#guide','#support']},{logoHref:'java\nscript:alert(1)'},{logoHref:'//bad.test'},{logoHref:'data:text/html,Hi'},{logoHref:'https:\\bad.test'},{logoImage:'data:image/svg+xml,<svg onload=alert(1)>'},{logoImage:'javascript:alert(1)'}])('rejects invalid configuration %#',input=>expect(()=>resolveSettings(input)).toThrow());
  it('escapes user labels, logo text and instance attributes in SSR without browser globals',()=>{
    const html=render({logoMode:'text',logoText:'<img onerror="bad">',primaryLabels:['<script>bad()</script>'],primaryUrls:['/guide?q="injection"']},'id" onclick="bad');
    expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');expect(html).toContain('id&quot; onclick=&quot;bad-body');expect(html).not.toContain('href="/guide?q="');
  });
  it('preserves relative/hash/native protocol destinations and explicit empty menus',()=>{
    for(const logoHref of ['#here','/guide','./guide','../guide','guide.html','https://example.com','mailto:hi@example.com','tel:+123'])expect(resolveSettings({logoHref}).logoHref).toBe(logoHref);
    expect(render({primaryLabels:[],primaryUrls:[],secondaryLabels:[],secondaryUrls:[]})).toContain('aria-expanded="false"');
    expect(render({logoMode:'custom',logoImage:''})).toContain('gn-logo-text');
  });
  it('derives every exposed default, preserves changed appearance and identity controls',()=>{
    expect(Object.keys(defaults)).toEqual(manifest.settings.map(row=>row.key));
    const html=render({surface:'#112233',surfaceOpacity:.5,foreground:'#334455',mainLinkSize:40,logoMode:'custom',logoImage:'https://example.com/logo.png',showSecondary:false,height:800});
    expect(html).toContain('rgb(17 34 51 / 0.5)');expect(html).toContain('--gn-main-size:40px');expect(html).toContain('--gn-height:800px');expect(html).not.toContain('class="gn-side"');
  });
  it('accepts bounded portable raster images and only the exact shipped SVG bytes',()=>{
    const expected='data:image/svg+xml;base64,'+readFileSync(new URL('../../assets/arclenui-logo.svg',import.meta.url)).toString('base64');
    expect(admittedLogoData).toBe(expected);
    expect(resolveSettings({logoMode:'custom',logoImage:expected}).logoImage).toBe(expected);
    expect(render({logoMode:'custom',logoImage:expected})).toContain(`src="${expected}"`);
    for(const type of ['png','jpeg','webp','gif','avif']) {
      const logoImage=`data:image/${type};base64,aGVsbG8=`;
      expect(resolveSettings({logoImage}).logoImage).toBe(logoImage);
    }
  });
  it.each([
    'https://example.com/'+ 'x'.repeat(2048),
    'assets/'+ 'x'.repeat(2048),
    'data:image/png;base64,'+'AAAA'.repeat(65536),
    'data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64'),
    'data:text/html;base64,PHNjcmlwdD4=',
    'data:application/javascript;base64,YWxlcnQoMSk=',
    'data:image/png;base64,', 'data:image/png;base64,abc', 'data:image/png;base64,abc===',
    'data:image/png;base64,abcd=efg', 'data:image/png;base64,ab cd==', 'data:image/png;base64,@@@=',
    'data:image/png,hello', 'data:image/png;charset=utf-8;base64,aGVsbG8=',
    admittedLogoData.slice(0,-4)+'AAAA'
  ])('rejects malformed, oversized and unadmitted inline images %#',logoImage=>{
    expect(()=>resolveSettings({logoImage})).toThrow();
  });
});
describe('interruptible instance scheduler',()=>{
  function clock(){let time=0,next=0;const callbacks=new Map<number,FrameRequestCallback>();const view={performance:{now:()=>time},requestAnimationFrame:(fn:FrameRequestCallback)=>{callbacks.set(++next,fn);return next;},cancelAnimationFrame:(id:number)=>callbacks.delete(id)} as unknown as Window;return {view,callbacks,frame(t:number){time=t;const pending=[...callbacks.values()];callbacks.clear();pending.forEach(fn=>fn(t));}};}
  it('retargets from current values, has no idle loop, and destroys only owned RAF',()=>{
    const c=clock(),one=createEngine(c.view),two=createEngine(c.view),paint={paint:()=>{}};const a=one.value(0,paint),b=two.value(0,paint),linear=(x:number)=>x;
    one.tween(a,100,{duration:1,ease:linear});two.tween(b,200,{duration:1,ease:linear});c.frame(400);expect(a.v).toBe(40);one.tween(a,0,{duration:.2,ease:linear});c.frame(500);expect(a.v).toBe(20);one.destroy();expect(c.callbacks.size).toBe(1);c.frame(1000);expect(b.v).toBe(200);expect(c.callbacks.size).toBe(0);
  });
  it('settles delayed motion immediately and leaves no owned resources',()=>{
    const c=clock(),engine=createEngine(c.view);let painted=0,completed=0;const a=engine.value(0,{paint:()=>painted++});engine.setSpeed(0);engine.tween(a,1,{duration:.72,delay:.46,ease:cubicBezier(.76,0,.24,1),done:()=>completed++});expect(a.v).toBe(1);expect(painted).toBe(1);expect(completed).toBe(1);expect(c.callbacks.size).toBe(0);engine.destroy();engine.destroy();
  });
});
