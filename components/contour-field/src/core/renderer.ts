import type {Settings} from './settings';
import {createTerrainFrame, terrainSvg} from './terrain';
import {advancePointer, clearPointer, createPointer, pointerPending, targetPointer} from './pointer';

export interface Renderer {update(settings: Settings): void; pause(): void; resume(): void; destroy(): void;}

/** One clock, set of observers and canvas per instance. No document selectors. */
export function createRenderer(scene: HTMLElement, canvas: HTMLCanvasElement, initial: Settings, initiallyPaused = false): Renderer {
  const document = canvas.ownerDocument, view = document.defaultView!;
  let settings = initial, paused = initiallyPaused, destroyed = false, visible = true;
  let frame = 0, clock = 0, lastTick = 0, lastDraw = 0, width = 0, height = 0, ratio = 1;
  const pointer = createPointer();
  const media = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reduced = media?.matches ?? false;
  let context: CanvasRenderingContext2D | null = null;
  try {context = canvas.getContext('2d', {alpha: false});} catch { /* SVG remains usable. */ }
  const canAnimate = () => !destroyed && !paused && !reduced && visible && !document.hidden && (settings.speed > 0 || pointerPending(pointer)) && !!context;
  const fallback = () => scene.querySelector<SVGSVGElement>('[data-contour-fallback]');
  const paint = () => {
    if (destroyed || document.hidden || !visible) return;
    if (!context) {
      const previous = fallback();
      if (previous) previous.outerHTML = terrainSvg(settings);
      return;
    }
    const bounds = scene.getBoundingClientRect();
    const w = Math.max(1, Math.round(bounds.width)), h = Math.max(1, Math.round(bounds.height));
    // Limit backing-store work without changing terrain topology. DPR2 preserves
    // fine lines; large receivers are capped to a 3.2 megapixel bitmap.
    const dpr = Math.min(2, view.devicePixelRatio || 1, Math.sqrt(3_200_000 / (w * h)));
    if (w !== width || h !== height || dpr !== ratio) {
      width = w; height = h; ratio = dpr;
      canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.globalAlpha = 1; context.fillStyle = settings.backgroundColor; context.fillRect(0, 0, width, height);
    context.lineCap = 'round'; context.lineJoin = 'round';
    const terrain = createTerrainFrame(settings, width, height, clock, pointer.strength > 0 ? pointer : undefined);
    for (const layer of terrain.layers) {
      context.beginPath(); context.strokeStyle = layer.color; context.globalAlpha = layer.opacity; context.lineWidth = layer.weight;
      for (let i = 0; i < layer.segments.length; i += 4) {
        context.moveTo(layer.segments[i], layer.segments[i + 1]); context.lineTo(layer.segments[i + 2], layer.segments[i + 3]);
      }
      context.stroke();
    }
    if (pointer.strength > .001) {
      const radius = Math.min(width, height) * .24, x = pointer.x * width, y = pointer.y * height;
      const highlight = context.createRadialGradient(x, y, 0, x, y, radius);
      highlight.addColorStop(0, `rgba(220,224,214,${pointer.strength * .7})`);
      highlight.addColorStop(.55, `rgba(220,224,214,${pointer.strength * .5})`);
      highlight.addColorStop(1, 'rgba(220,224,214,0)');
      context.strokeStyle = highlight;
      for (const layer of terrain.layers) {
        context.beginPath(); context.globalAlpha = layer.opacity; context.lineWidth = layer.weight;
        for (let i = 0; i < layer.segments.length; i += 4) {
          context.moveTo(layer.segments[i], layer.segments[i + 1]); context.lineTo(layer.segments[i + 2], layer.segments[i + 3]);
        }
        context.stroke();
      }
    }
    context.globalAlpha = 1;
    canvas.style.visibility = 'visible';
    const staticImage = fallback(); if (staticImage) staticImage.style.visibility = 'hidden';
  };
  const stop = () => {if (frame) view.cancelAnimationFrame(frame); frame = 0; lastTick = 0; lastDraw = 0;};
  const tick = (timestamp: number) => {
    frame = 0;
    if (!canAnimate()) {lastTick = 0; lastDraw = 0; return;}
    const delta = lastTick ? Math.min(0.1, (timestamp - lastTick) / 1000) : 1 / 60;
    if (lastTick) clock += delta * settings.speed;
    advancePointer(pointer, delta);
    lastTick = timestamp;
    // A deliberate 30Hz ceiling; phase advances at wall-clock speed between paints.
    if (!lastDraw || timestamp - lastDraw >= 1000 / 30 - 1 || !canAnimate()) {paint(); lastDraw = timestamp;}
    if (canAnimate()) frame = view.requestAnimationFrame(tick);
    else {lastTick = 0; lastDraw = 0;}
  };
  const sync = () => {
    if (!canAnimate()) {stop(); return;}
    // Keep a live clock and its pending frame across rapid settings changes.
    if (!frame) frame = view.requestAnimationFrame(tick);
  };
  const pointerAllowed = () => settings.pointerInteraction && !destroyed && !paused && !reduced && visible && !document.hidden && !!context;
  const onPointer = (event: PointerEvent) => {
    if (!pointerAllowed() || event.pointerType === 'touch') return;
    const bounds = scene.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    targetPointer(pointer, (event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height);
    sync();
  };
  const onLeave = () => {pointer.targetStrength = 0; sync();};
  const onVisibility = () => {if (document.hidden) clearPointer(pointer); else paint(); sync();};
  const onMotion = () => {reduced = media?.matches ?? false; if (reduced) {clearPointer(pointer); paint();} applyPointerStyle(); sync();};
  const applyPointerStyle = () => {scene.style.pointerEvents = settings.pointerInteraction && !!context ? 'auto' : 'none'; scene.style.cursor = pointerAllowed() ? 'none' : '';};
  const onResize = () => {paint();};
  const resize = view.ResizeObserver ? new view.ResizeObserver(onResize) : null;
  const intersection = view.IntersectionObserver ? new view.IntersectionObserver(entries => {
    if (destroyed) return;
    const entry = entries.find(item => item.target === scene);
    if (!entry) return;
    const wasVisible = visible; visible = entry.isIntersecting;
    if (!visible) clearPointer(pointer);
    if (visible && !wasVisible) paint();
    sync();
  }) : null;
  resize?.observe(scene); intersection?.observe(scene);
  if (!resize) view.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);
  media?.addEventListener('change', onMotion);
  scene.addEventListener('pointerenter', onPointer);
  scene.addEventListener('pointermove', onPointer);
  scene.addEventListener('pointerleave', onLeave);
  scene.addEventListener('pointercancel', onLeave);
  applyPointerStyle(); paint(); sync();
  return {
    update(next) {if (destroyed) return; settings = next; if (!settings.pointerInteraction) clearPointer(pointer); applyPointerStyle(); paint(); sync();},
    pause() {if (!destroyed) {paused = true; stop(); applyPointerStyle();}},
    resume() {if (!destroyed) {paused = false; applyPointerStyle(); sync();}},
    destroy() {
      if (destroyed) return;
      destroyed = true; stop(); resize?.disconnect(); intersection?.disconnect();
      view.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVisibility); media?.removeEventListener('change', onMotion);
      scene.removeEventListener('pointerenter', onPointer); scene.removeEventListener('pointermove', onPointer);
      scene.removeEventListener('pointerleave', onLeave); scene.removeEventListener('pointercancel', onLeave);
      scene.style.pointerEvents = 'none'; scene.style.cursor = '';
    }
  };
}
