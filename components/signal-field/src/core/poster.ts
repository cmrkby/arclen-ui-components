import image from '../../poster.webp';

// Next.js image imports expose src; other supported bundlers return the URL.
const imageUrl = (asset: string | { src: string }): string =>
  typeof asset === 'string' ? asset : asset.src;

/** Static capture of the bundled Signal Field renderer. Original Arclen UI artwork. */
export const poster = imageUrl(image);
