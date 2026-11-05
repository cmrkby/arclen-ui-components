const namespace = 'http://www.w3.org/2000/svg';
let maskSequence = 0;

/** One opaque image behind independently animated tiles, only in opted-in thumbnails. */
export function mountThumbnailMosaic(host: HTMLElement, overlay: HTMLElement, image: HTMLImageElement, columns: number, rows: number) {
  const geometry = () => {
    const hint = host.closest('[data-arclen-render-scale]')?.getAttribute('data-arclen-render-scale');
    const renderScale = Number(hint);
    if (!hint?.trim() || !Number.isFinite(renderScale) || renderScale <= 0 || renderScale > 1 ||
      image.getAttribute('data-pt-opaque') !== 'true' || !image.complete || !image.currentSrc) return null;
    const {width, height} = host.getBoundingClientRect();
    if (![width, height, image.naturalWidth, image.naturalHeight].every(value => Number.isFinite(value) && value > 0)) return null;
    const tokens = host.ownerDocument.defaultView!.getComputedStyle(image).objectPosition.trim().split(/\s+/);
    if (tokens.length !== 2) return null;
    const position = tokens.map(token => token.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(%|px)$/));
    if (position.some(token => !token || !Number.isFinite(Number(token[1])))) return null;
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const imageWidth = image.naturalWidth * scale, imageHeight = image.naturalHeight * scale;
    const offset = (index: number, free: number) => {
      const token = position[index]!;
      return Number(token[1]) * (token[2] === '%' ? free / 100 : 1);
    };
    const x = offset(0, width - imageWidth), y = offset(1, height - imageHeight);
    if (![imageWidth, imageHeight, x, y].every(Number.isFinite)) return null;
    return {width, height, imageWidth, imageHeight, x, y, source: image.currentSrc};
  };
  const initial = geometry();
  if (!initial) return null;
  const document = host.ownerDocument;
  let id: string;
  do { id = `arclen-pixel-mask-${++maskSequence}`; } while (document.getElementById(id));
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:none';
  const definitions = document.createElementNS(namespace, 'defs');
  const mask = document.createElementNS(namespace, 'mask');
  mask.id = id;
  mask.setAttribute('maskUnits', 'userSpaceOnUse');
  mask.setAttribute('maskContentUnits', 'userSpaceOnUse');
  mask.setAttribute('mask-type', 'alpha');
  mask.setAttribute('x', '0');
  mask.setAttribute('y', '0');
  const targets = Array.from({length: columns * rows}, () => {
    const rectangle = document.createElementNS(namespace, 'rect');
    rectangle.setAttribute('data-pt-cell', '');
    rectangle.setAttribute('fill', 'white');
    rectangle.setAttribute('opacity', '0');
    mask.append(rectangle);
    return rectangle;
  });
  const artwork = document.createElementNS(namespace, 'image');
  artwork.setAttribute('preserveAspectRatio', 'none');
  artwork.setAttribute('mask', `url(#${id})`);
  const apply = (next: NonNullable<ReturnType<typeof geometry>>) => {
    svg.setAttribute('viewBox', `0 0 ${next.width} ${next.height}`);
    mask.setAttribute('width', String(next.width));
    mask.setAttribute('height', String(next.height));
    artwork.setAttribute('href', next.source);
    artwork.setAttribute('x', String(next.x));
    artwork.setAttribute('y', String(next.y));
    artwork.setAttribute('width', String(next.imageWidth));
    artwork.setAttribute('height', String(next.imageHeight));
    targets.forEach((rectangle, index) => {
      rectangle.setAttribute('x', String((index % columns) * next.width / columns));
      rectangle.setAttribute('y', String(Math.floor(index / columns) * next.height / rows));
      // Retain the authored overlap and fractional boundaries. Do not snap pixels.
      rectangle.setAttribute('width', String(next.width / columns + 1));
      rectangle.setAttribute('height', String(next.height / rows + 1));
    });
  };
  apply(initial);
  definitions.append(mask);
  svg.append(definitions, artwork);
  overlay.append(svg);
  return {
    targets,
    resize() {
      const next = geometry();
      if (!next) return false;
      apply(next);
      return true;
    },
    destroy() { svg.remove(); },
  };
}
