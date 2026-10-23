/** Vite/esbuild emit a URL; Next static image imports include that URL in src. */
export function assetUrl(value: string | { src: string }): string {
  return typeof value === 'string' ? value : value.src;
}
