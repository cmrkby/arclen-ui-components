export type Box = {left: number; top: number; width: number; height: number};
/** Independent height-dependent unfolding: the far edge releases before the neck. */
export function warpLine(anchor: Box, popup: Box, progress: number, fraction: number) {
  const p = Math.max(0, Math.min(1, progress)), t = Math.max(0, Math.min(1, fraction));
  const above = popup.top < anchor.top, distance = above ? 1 - t : t;
  const release = 1 - Math.pow(1 - p, .42 + distance * 2.8);
  const lift = 1 - Math.pow(1 - p, 2);
  return {
    x: anchor.left + (popup.left - anchor.left) * release + Math.sin(t * Math.PI) * Math.sin(p * Math.PI) * 4,
    y: anchor.top + anchor.height * t + (popup.top + popup.height * t - anchor.top - anchor.height * t) * lift,
    width: anchor.width + (popup.width - anchor.width) * release
  };
}
export function intersects(item: Box, viewport: Box) {
  return item.left < viewport.left + viewport.width && item.left + item.width > viewport.left && item.top < viewport.top + viewport.height && item.top + item.height > viewport.top;
}
export function createWarp(panel: HTMLElement, anchor: Box, root: HTMLElement) {
  const popup = panel.getBoundingClientRect(), surface = getComputedStyle(panel);
  const layer = document.createElement('div'); layer.className = 'aui-filter-warp'; layer.dataset.fpWarp = '';
  layer.setAttribute('aria-hidden', 'true'); layer.inert = true;
  const glass = document.createElement('div'); glass.className = 'aui-filter-warp-glass';
  const origin = {left: Math.min(anchor.left, popup.left) - 8, top: Math.min(anchor.top, popup.top)};
  glass.style.cssText = `left:${origin.left}px;top:${origin.top}px;width:${Math.max(anchor.left + anchor.width, popup.right) - origin.left + 8}px;height:${Math.max(anchor.top + anchor.height, popup.bottom) - origin.top}px;background:${surface.backgroundColor};backdrop-filter:${surface.backdropFilter};`;
  layer.append(glass);
  const count = 72, slice = popup.height / count;
  const radius = Math.min(parseFloat(surface.borderRadius) || 28, popup.height / 2, popup.width / 2);
  // Capture each visible option once; clones have no interactive elements or roles.
  const items = [...panel.querySelectorAll<HTMLElement>('[role=option]')].flatMap(item => {
    const box = item.getBoundingClientRect();
    if (!intersects(box, popup)) return [];
    const style = getComputedStyle(item), visual = document.createElement('div');
    visual.className = 'aui-filter-warp-option'; visual.dataset.selected = item.getAttribute('aria-selected') ?? 'false';
    visual.style.cssText = `left:${box.left - popup.left}px;top:${box.top - popup.top}px;width:${box.width}px;height:${box.height}px;padding:${style.padding};min-height:0;display:${style.display};flex-direction:${style.flexDirection};align-items:${style.alignItems};justify-content:${style.justifyContent};gap:${style.gap};border:${style.border};border-radius:${style.borderRadius};background:${style.backgroundColor};color:${style.color};font:${style.font};letter-spacing:${style.letterSpacing};text-align:${style.textAlign};`;
    for (const child of item.children) {
      const rect = child.getBoundingClientRect(), computed = getComputedStyle(child);
      const copy = child.cloneNode(true) as HTMLElement;
      // Children are owned spans/SVGs, never consumer markup. Strip semantics defensively.
      for (const node of [copy, ...copy.querySelectorAll<HTMLElement>('*')]) {
        for (const attribute of [...node.attributes]) if (attribute.name === 'id' || attribute.name === 'role' || attribute.name === 'tabindex' || attribute.name.startsWith('aria-') || attribute.name.startsWith('data-fp-')) node.removeAttribute(attribute.name);
      }
      copy.style.cssText = `position:absolute;left:${rect.left - box.left}px;top:${rect.top - box.top}px;right:auto;bottom:auto;width:${rect.width}px;height:${rect.height}px;min-width:0;min-height:0;margin:0;padding:0;display:${computed.display};opacity:${computed.opacity};border-radius:${computed.borderRadius};background:${computed.backgroundColor};color:${computed.color};font:${computed.font};letter-spacing:${computed.letterSpacing};line-height:${computed.lineHeight};text-align:${computed.textAlign};`;
      visual.append(copy);
    }
    return [{box, visual}];
  });
  const bands = Array.from({length: count}, (_, i) => {
    const band = document.createElement('div'); band.className = 'aui-filter-warp-band';
    band.style.cssText = `width:${popup.width}px;height:${slice + .35}px;`;
    const skin = document.createElement('div'); skin.className = 'aui-filter-warp-skin';
    skin.style.cssText = `width:${popup.width}px;height:${popup.height}px;top:${-i * slice}px;border-radius:${surface.borderRadius};`;
    for (const {box, visual} of items) {
      const top = box.top - popup.top;
      if (top + box.height < i * slice || top > (i + 1) * slice) continue;
      skin.append(visual.cloneNode(true));
    }
    band.append(skin); layer.append(band); return band;
  });
  root.append(layer); panel.style.opacity = '0'; panel.dataset.fpWarping = 'true';
  return {
    draw(progress: number) {
      // One continuous glass silhouette prevents overlaps from darkening each strip.
      const left: string[] = [], right: string[] = [];
      for (let i = 0; i <= 96; i++) {
        const t = i / 96, sourceY = popup.height * t;
        const cornerY = sourceY < radius ? radius - sourceY : sourceY > popup.height - radius ? sourceY - (popup.height - radius) : 0;
        const inset = radius - Math.sqrt(Math.max(0, radius * radius - cornerY * cornerY));
        const line = warpLine(anchor, popup, progress, t), edgeInset = inset * line.width / popup.width;
        left.push(`${line.x + edgeInset - origin.left}px ${line.y - origin.top}px`);
        right.push(`${line.x + line.width - edgeInset - origin.left}px ${line.y - origin.top}px`);
      }
      glass.style.clipPath = `polygon(${[...left, ...right.reverse()].join(',')})`;
      for (let i = 0; i < count; i++) {
        const a = warpLine(anchor, popup, progress, i / count), b = warpLine(anchor, popup, progress, (i + 1) / count);
        bands[i].style.transform = `matrix(${a.width / popup.width},0,${(b.x - a.x) / slice},${(b.y - a.y) / slice},${a.x},${a.y})`;
      }
    },
    destroy() { layer.remove(); panel.style.removeProperty('opacity'); delete panel.dataset.fpWarping; }
  };
}
