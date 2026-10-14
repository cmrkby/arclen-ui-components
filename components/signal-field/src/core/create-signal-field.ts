import { createGlyphField } from "./glyph-field";
import { resolveSignalFieldOptions } from "./options";
import type { ResolvedSignalFieldOptions, SignalFieldController, SignalFieldOptions } from "./types";
import { createWebGLField } from "./webgl-field";

const LAYER_STYLE = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;box-sizing:border-box;";
const RESTING_CURSOR = { x: 0.5, y: 0.5 };

function createLayer<T extends HTMLElement>(doc: Document, tag: string, layer: string): T {
  const element = doc.createElement(tag) as T;
  element.dataset["signalLayer"] = layer;
  element.setAttribute("aria-hidden", "true");
  element.style.cssText = LAYER_STYLE;
  return element;
}

function fallbackBackground(options: ResolvedSignalFieldOptions): string {
  return `linear-gradient(132deg, ${options.surfaceColor}, ${options.baseColor} 48%, ${options.accentColor} 78%, ${options.secondaryAccentColor})`;
}

function cursorStyle(cursor: ResolvedSignalFieldOptions["cursor"]): string {
  return cursor === "hidden" ? "none" : cursor;
}

export function createSignalField(host: HTMLElement, initialOptions: SignalFieldOptions = {}): SignalFieldController {
  const doc = host.ownerDocument;
  const view = doc.defaultView ?? window;
  let options = resolveSignalFieldOptions(initialOptions);
  const fallback = createLayer<HTMLDivElement>(doc, "div", "fallback");
  const webglCanvas = createLayer<HTMLCanvasElement>(doc, "canvas", "webgl");
  const glyphCanvas = createLayer<HTMLCanvasElement>(doc, "canvas", "glyphs");
  const textLayer = createLayer<HTMLDivElement>(doc, "div", "text");
  // Decorative sample text only. Authored document copy belongs outside this layer.
  textLayer.style.cssText += "align-items:center;justify-content:center;text-align:center;padding:8%;font:600 clamp(1.75rem,6vw,5.5rem)/1.05 system-ui,sans-serif;letter-spacing:-.055em;";
  const syncText = () => {
    textLayer.style.display = options.showText ? "flex" : "none";
    textLayer.textContent = options.text;
    const color = options.baseColor.slice(1);
    const luminance = [0, 2, 4].reduce((sum, offset, index) => sum + parseInt(color.slice(offset, offset + 2), 16) / 255 * [0.2126, 0.7152, 0.0722][index]!, 0);
    textLayer.style.color = luminance > 0.5 ? "#211e34" : "#ffffff";
  };
  const initialCursor = host.style.cursor;
  const initialCursorPriority = host.style.getPropertyPriority("cursor");
  const initialPosition = host.style.position;
  const initialPositionPriority = host.style.getPropertyPriority("position");
  const needsPosition = view.getComputedStyle(host).position === "static";
  const pointer = { x: RESTING_CURSOR.x, y: RESTING_CURSOR.y, easedX: RESTING_CURSOR.x, easedY: RESTING_CURSOR.y, active: 0, activity: 0 };
  const glyphField = createGlyphField(glyphCanvas);
  const webglResult = createWebGLField(webglCanvas);
  let webglField = webglResult.ok ? webglResult.field : null;
  const motionQuery = typeof view.matchMedia === "function" ? view.matchMedia("(prefers-reduced-motion: reduce)") : null;
  let previousDraw = view.performance.now();
  let elapsed = 3.2;

  if (needsPosition) host.style.position = "relative";
  host.append(fallback, webglCanvas, glyphCanvas, textLayer);
  syncText();
  fallback.style.background = fallbackBackground(options);
  fallback.hidden = !webglResult.ok;
  host.style.cursor = cursorStyle(options.cursor);

  if (!webglResult.ok) {
    webglCanvas.hidden = true;
    host.dataset["webgl"] = "unavailable";
  }

  if (webglResult.ok) host.dataset["webgl"] = "ready";
  let destroyed = false;
  let visible = true;
  let reducedMotion = motionQuery?.matches ?? false;
  let frame: number | null = null;
  let lastFrame = 0;
  let width = 0;
  let height = 0;
  let devicePixelRatio = 1;
  let glyphDirty = true;
  let glyphWasActive = false;

  const staticFrame = () => reducedMotion || !options.animate;
  const canAnimate = () => !destroyed && visible && !doc.hidden && !staticFrame() && (!!webglField || pointer.active > 0 || pointer.activity > 0.001);

  const resizeLayers = () => {
    webglField?.resize(width, height, devicePixelRatio, options.resolutionScale);
    glyphField.resize(width, height, devicePixelRatio);
    glyphDirty = true;
  };

  const measure = () => {
    if (destroyed) return;
    const box = host.getBoundingClientRect();
    width = box.width;
    height = box.height;
    devicePixelRatio = view.devicePixelRatio || 1;
    resizeLayers();
  };

  const draw = (now = view.performance.now()) => {
    if (destroyed) return;
    const delta = Math.max(0, Math.min(64, now - previousDraw));
    previousDraw = now;
    if (!staticFrame()) elapsed += delta / 1000 * options.speed;
    if (!staticFrame()) {
      const follow = 1 - Math.exp(-delta / (20 + options.pointerSmoothing * (options.interaction === "ascii-lens" ? 100 : 220)));
      pointer.easedX += (pointer.x - pointer.easedX) * follow;
      pointer.easedY += (pointer.y - pointer.easedY) * follow;
      pointer.activity += (pointer.active - pointer.activity) * (1 - Math.exp(-delta / 160));
      if (Math.abs(pointer.active - pointer.activity) < 0.001) pointer.activity = pointer.active;
      // Finish the approach so both layers return to an exact resting image.
      if (Math.abs(pointer.x - pointer.easedX) < 0.0001) pointer.easedX = pointer.x;
      if (Math.abs(pointer.y - pointer.easedY) < 0.0001) pointer.easedY = pointer.y;
    }
    const easedPointer = { x: pointer.easedX, y: pointer.easedY };
    const activeOptions = { ...options, pointerStrength: options.pointerStrength * pointer.activity, asciiStrength: staticFrame() ? 0 : options.asciiStrength * pointer.activity };
    webglField?.draw(activeOptions, reducedMotion ? RESTING_CURSOR : easedPointer, reducedMotion, elapsed);
    const glyphActive = !staticFrame() && options.showGlyphs && (options.glyphStrength > 0 || options.interaction === "ascii-lens") && pointer.activity > 0;
    // Ambient waves follow the same bounded clock as the shader. Without WebGL,
    // keep the low-cost fallback resting unless the pointer is interacting.
    const glyphAmbient = !!webglField && !staticFrame() && options.showGlyphs && options.speed > 0;
    if (glyphDirty || glyphAmbient || glyphActive || glyphWasActive) {
      glyphField.draw(webglField ? options : {...options,interaction:"classic"}, reducedMotion ? RESTING_CURSOR : easedPointer, staticFrame(), pointer.activity, elapsed);
      glyphDirty = false;
    }
    glyphWasActive = glyphActive;
  };

  const stop = () => {
    if (frame !== null) {
      view.cancelAnimationFrame(frame);
      frame = null;
    }
  };

  const start = () => {
    if (canAnimate() && frame === null) frame = view.requestAnimationFrame(tick);
  };

  const tick = (now: number) => {
    frame = null;
    if (!canAnimate()) return;
    const frameInterval = 1000 / options.frameRate;
    // Advance an exact frame clock. Fractional RAF timestamps must not turn a
    // 60Hz display into an uneven 30/60Hz cadence around the interval boundary.
    const intervals = Math.floor((now - lastFrame + 0.5) / frameInterval);
    if (intervals >= 1) {
      lastFrame += intervals * frameInterval;
      draw(now);
    }
    start();
  };

  const updateAnimation = () => {
    if (canAnimate()) start();
    else stop();
  };

  const onPointerMove = (event: PointerEvent) => {
    // Scrolling on touch devices must not create an invisible moving target.
    if (event.pointerType === "touch" || staticFrame()) return;
    const box = host.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;
    pointer.x = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
    pointer.y = 1 - Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
    if (!pointer.active && !pointer.activity) {
      pointer.easedX = pointer.x;
      pointer.easedY = pointer.y;
    }
    pointer.active = 1;
    start();
  };
  const onPointerLeave = () => {
    // Fade where the pointer left instead of dragging a spotlight to the centre.
    pointer.active = 0;
    if (staticFrame()) {
      pointer.easedX = RESTING_CURSOR.x;
      pointer.easedY = RESTING_CURSOR.y;
      pointer.activity = 0;
      draw();
    }
  };
  const onVisibility = () => {
    previousDraw = view.performance.now();
    if (doc.hidden) pointer.active = 0;
    updateAnimation();
  };
  const onMotion = (event: MediaQueryListEvent) => {
    reducedMotion = event.matches;
    glyphDirty = true;
    draw();
    updateAnimation();
  };
  const onContextLost = (event: Event) => {
    event.preventDefault();
    webglField = null;
    webglCanvas.style.display = "none";
    host.dataset["webgl"] = "unavailable";
    fallback.hidden = true;
    glyphDirty = true;
    draw();
    updateAnimation();
  };
  const onContextRestored = () => {
    if (destroyed) return;
    const recovered = createWebGLField(webglCanvas);
    webglField = recovered.ok ? recovered.field : null;
    webglCanvas.style.display = recovered.ok ? "" : "none";
    host.dataset["webgl"] = recovered.ok ? "ready" : "unavailable";
    fallback.hidden = !recovered.ok;
    resizeLayers();
    draw();
    updateAnimation();
  };
  webglCanvas.addEventListener("webglcontextlost", onContextLost);
  webglCanvas.addEventListener("webglcontextrestored", onContextRestored);

  let intersectionObserver: IntersectionObserver | undefined;
  if (typeof view.IntersectionObserver !== "undefined") {
    intersectionObserver = new view.IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      updateAnimation();
    });
    intersectionObserver.observe(host);
  }

  const resize = () => {
    measure();
    draw();
  };
  const resizeObserver = typeof view.ResizeObserver !== "undefined" ? new view.ResizeObserver(resize) : undefined;
  resizeObserver?.observe(host);
  // Window resize also catches DPR changes when the CSS host size is unchanged.
  view.addEventListener("resize", resize);
  host.addEventListener("pointermove", onPointerMove, { passive: true });
  host.addEventListener("pointerleave", onPointerLeave, { passive: true });
  host.addEventListener("pointercancel", onPointerLeave, { passive: true });
  doc.addEventListener("visibilitychange", onVisibility);
  motionQuery?.addEventListener("change", onMotion);

  resize();
  start();

  return {
    setOptions(next) {
      if (destroyed) return;
      const previousResolutionScale = options.resolutionScale;
      options = resolveSignalFieldOptions({ ...options, ...next });
      glyphDirty = true;
      if (options.resolutionScale !== previousResolutionScale) resizeLayers();
      fallback.style.background = fallbackBackground(options);
      host.style.cursor = cursorStyle(options.cursor);
      syncText();
      if (staticFrame()) pointer.activity = 0;
      draw();
      updateAnimation();
    },

    resize() {
      if (destroyed) return;
      resize();
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
      view.removeEventListener("resize", resize);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      host.removeEventListener("pointercancel", onPointerLeave);
      doc.removeEventListener("visibilitychange", onVisibility);
      motionQuery?.removeEventListener("change", onMotion);
      webglCanvas.removeEventListener("webglcontextlost", onContextLost);
      webglCanvas.removeEventListener("webglcontextrestored", onContextRestored);
      webglField?.destroy();
      glyphField.destroy();
      host.style.setProperty("cursor", initialCursor, initialCursorPriority);
      if (needsPosition) host.style.setProperty("position", initialPosition, initialPositionPriority);
      fallback.remove();
      webglCanvas.remove();
      glyphCanvas.remove();
      textLayer.remove();
    },
  };
}
