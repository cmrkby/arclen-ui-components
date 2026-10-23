import { describe, expect, it } from 'vitest';
import { assetUrl } from '../src/core/asset-url';

describe('portable static poster import', () => {
  it('retains Vite/esbuild URL strings without alteration', () => {
    for (const value of ['./assets/poster.webp', '/_assets/poster-abc.webp', 'data:image/webp;base64,dGVzdA==']) {
      expect(assetUrl(value)).toBe(value);
    }
  });
  it('uses the actual src of Next static image data without stringifying the object', () => {
    const image = { src: '/_next/static/media/poster.1234.webp', width: 1440, height: 600, blurDataURL: 'data:image/webp;base64,eA==' };
    expect(assetUrl(image)).toBe(image.src);
    expect(assetUrl(image)).not.toContain('[object Object]');
  });
});
