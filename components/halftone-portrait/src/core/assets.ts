import ronin from '../../assets/ronin.webp';
import eclipse from '../../assets/eclipse.webp';
import sentinel from '../../assets/sentinel.webp';

// Next.js image imports expose src; other supported bundlers return the URL.
const imageUrl = (asset: string | { src: string }): string =>
  typeof asset === 'string' ? asset : asset.src;

/** Original artwork. See assets/NOTICE.md. */
export const artwork = {
  ronin: imageUrl(ronin),
  eclipse: imageUrl(eclipse),
  sentinel: imageUrl(sentinel),
};

export function imageSource(src: string): string {
  return artwork[src as keyof typeof artwork] ?? src;
}
