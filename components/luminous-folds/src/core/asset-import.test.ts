import {afterEach,describe,expect,it,vi} from 'vitest';
afterEach(()=>{vi.doUnmock('../../assets/poster.webp');vi.resetModules();});
async function markup(asset:unknown){vi.resetModules();vi.doMock('../../assets/poster.webp',()=>({default:asset}));return (await import('./index')).render();}
describe('bundled poster import compatibility',()=>{
 it('uses the exact string URL supplied by Vite and portable builds',async()=>{expect(await markup('./assets/poster.webp')).toContain('src="./assets/poster.webp"');});
 it('uses the exact src supplied by Next StaticImageData',async()=>{expect(await markup({src:'/_next/static/media/poster.hash.webp',width:480,height:600})).toContain('src="/_next/static/media/poster.hash.webp"');});
 it.each([null,{}, {src:12},''])('rejects a malformed bundled import %j',async asset=>{await expect(markup(asset)).rejects.toThrow('Bundled poster needs an asset URL.');});
});
