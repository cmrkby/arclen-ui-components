import { resolveSettings } from "./settings";
import {
  renderTitle,
  fitGraphicTitle,
  graphicSlices,
  titleWidth,
  titleSettle,
} from "./title";
export type Phase = "idle" | "covering" | "covered" | "revealing" | "destroyed";
export type TransitionResult = {
  status: "finished" | "cancelled" | "error" | "timeout";
};
export interface NavigationOptions {
  ready?: Promise<unknown> | ((signal: AbortSignal) => Promise<unknown>);
  commit?: (signal: AbortSignal) => void;
  signal?: AbortSignal;
  timeout?: number;
}
export interface PageTransitionController {
  readonly phase: Phase;
  replay(): Promise<TransitionResult>;
  cover(): Promise<TransitionResult>;
  uncover(): Promise<TransitionResult>;
  navigate(options: NavigationOptions): Promise<TransitionResult>;
  cancel(): void;
  update(input: unknown): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}
/** Owns only temporary overlay nodes. Consumer content is never replaced. */
export function createPageTransition(
  host: HTMLElement,
  input: unknown = {},
): PageTransitionController {
  let s = resolveSettings(input),
    phase: Phase = "idle",
    paused = false,
    offscreen = false,
    serial = 0,
    active: AbortController | null = null,
    overlay: HTMLElement | null = null,
    safety: ReturnType<typeof setTimeout> | undefined;
  const animations = new Set<Animation>(),
    view = host.ownerDocument.defaultView,
    media = view?.matchMedia?.("(prefers-reduced-motion: reduce)");
  const originalPosition = host.style.position,
    needsPosition = view?.getComputedStyle(host).position === "static";
  if (needsPosition) host.style.position = "relative";
  const content = () =>
    host.querySelector<HTMLElement>(":scope > [data-pt-content]");
  const setPhase = (p: Phase) => {
    phase = p;
    host.dataset.ptPhase = p;
  };
  const settle = () => {
    clearTimeout(safety);
    for (const a of animations) a.cancel();
    animations.clear();
    overlay?.remove();
    overlay = null;
    if (phase !== "destroyed") setPhase("idle");
  };
  const cancel = () => {
    serial++;
    active?.abort();
    active = null;
    settle();
  };
  const canMove = () =>
    !paused &&
    !offscreen &&
    !media?.matches &&
    typeof host.animate === "function";
  const animate = async (
    el: Element,
    frames: Keyframe[],
    duration: number,
    delay = 0,
    easing = curve(),
  ) => {
    if (!canMove() || active?.signal.aborted) return;
    const a = el.animate(frames, { duration, delay, easing, fill: "both" });
    animations.add(a);
    await a.finished.catch(() => {});
  };
  function curve() {
    return s.easing === "split"
      ? "cubic-bezier(.76,0,.24,1)"
      : s.easing === "linear"
        ? "linear"
        : s.easing === "expressive"
          ? "cubic-bezier(.19,1,.22,1)"
          : "cubic-bezier(.22,1,.36,1)";
  }
  function fitTitle() {
    const title = host.querySelector<HTMLElement>(".pt-title[data-pt-title]");
    if (!title || false) return;
    const hostRect = host.getBoundingClientRect(),
      width = hostRect.width;
    if (fitGraphicTitle(title, width, hostRect.height)) return;
    title.style.fontSize = "198px";
    const natural = title.getBoundingClientRect().width;
    if (natural > 0)
      title.style.fontSize = `${(198 * titleWidth(width)) / natural}px`;
  }
  function makeOverlay() {
    overlay?.remove();
    overlay = host.ownerDocument.createElement("div");
    overlay.dataset.ptOverlay = "";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.setProperty("--pt-label-color", s.overlayText);
    overlay.style.cssText = `position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:10;color:${s.overlayText};`;
    overlay.style.setProperty("--pt-label-color", s.overlayText);
    host.append(overlay);
    return overlay;
  }
  function cells() {
    const root = makeOverlay();
    const cols = 10,
      rows = 1;
    const nodes: HTMLElement[] = [];
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const el = host.ownerDocument.createElement("i");
        el.dataset.ptCell = "";
        el.style.cssText = `position:absolute;left:${(x / cols) * 100}%;top:${(y / rows) * 100}%;width:calc(${100 / cols}% + 1px);height:calc(${100 / rows}% + 1px);background:${s.overlayColor};`;
        root.append(el);
        nodes.push(el);
      }
    return { root, nodes, cols, rows };
  }
  async function reveal() {
    fitTitle();
    setPhase("revealing");
    if (!canMove()) return;
    const root = makeOverlay();
    root.style.background = s.overlayColor;
    const destination = host.querySelector<HTMLElement>("[data-pt-title]"),
      rect = host.getBoundingClientRect(),
      compact = rect.width < 1200;
    const word = host.ownerDocument.createElement("div");
    word.className = "pt-split";
    word.style.setProperty("--pt-label-color", s.overlayText);
    root.append(word);
    if (destination) {
      const box = destination.getBoundingClientRect(),
        style = view!.getComputedStyle(destination);
      word.style.cssText += `;inset:auto;left:${box.left - rect.left}px;top:${box.top - rect.top}px;font:${style.font};letter-spacing:${style.letterSpacing};line-height:${style.lineHeight};transform-origin:left bottom;`;
      void animate(
        destination,
        [{ visibility: "hidden" }, { visibility: "hidden" }],
        1,
      );
    } else {
      word.style.fontSize = `min(198px, ${85 / (Math.max(1, Array.from(s.label || "FRAME").length) * 0.7)}cqw)`;
    }
    const jobs: Promise<void>[] = [],
      clips = [
        [-25.4, 99.6],
        [-0.4, 74.6],
        [24.6, 49.6],
        [49.6, 24.6],
        [74.6, -0.4],
        [99.6, -25.4],
      ];
    let graphicSource = destination;
    if (!graphicSource && s.titleKind !== "text") {
      const source = host.ownerDocument.createElement("div");
      source.innerHTML = renderTitle(s);
      source.style.cssText = "position:absolute;visibility:hidden;";
      root.append(source);
      fitGraphicTitle(source, rect.width, rect.height);
      graphicSource = source;
      if (source.querySelector(".pt-title-art"))
        word.style.cssText +=
          ";inset:auto;left:50%;top:50%;translate:-50% -50%;transform-origin:center;";
    }
    if (graphicSource?.querySelector(".pt-title-art")) {
      for (const { slice, glyph: g, band: i } of graphicSlices(
        word,
        graphicSource,
      ))
        jobs.push(
          animate(
            slice,
            [
              {
                opacity: 0,
                transform: `translateX(${(i + g) % 2 ? 45 : -45}%)`,
              },
              { opacity: 1, transform: "translateX(0)" },
            ],
            s.sliceDuration,
            s.leadIn + i * s.sliceStagger + g * s.glyphStagger,
          ),
        );
    } else
      Array.from(s.label || "FRAME").forEach((letter, g) => {
        const glyph = host.ownerDocument.createElement("span");
        glyph.className = "pt-glyph";
        glyph.textContent = letter === " " ? "\u00a0" : letter;
        word.append(glyph);
        clips.forEach(([top, bottom], i) => {
          const slice = host.ownerDocument.createElement("span");
          slice.textContent = glyph.firstChild!.textContent;
          slice.style.clipPath = `inset(${top}% -20% ${bottom}% -20%)`;
          glyph.append(slice);
          jobs.push(
            animate(
              slice,
              [
                {
                  opacity: 0,
                  transform: `translateX(${(i + g) % 2 ? 45 : -45}%)`,
                },
                { opacity: 1, transform: "translateX(0)" },
              ],
              s.sliceDuration,
              s.leadIn + i * s.sliceStagger + g * s.glyphStagger,
            ),
          );
        });
      });
    const settleAt = s.titleDelay + s.hold,
      target = content();
    // Match the receiving title while the cover clears, before the temporary slices leave.
    if (destination) {
      const finalColor = view!.getComputedStyle(destination).color;
      for (const slice of word.querySelectorAll(".pt-glyph > span"))
        jobs.push(
          animate(
            slice,
            [{ color: s.overlayText }, { color: finalColor }],
            400,
            settleAt,
          ),
        );
    }
    const wordBox = word.getBoundingClientRect(),
      motion = titleSettle(
        rect,
        {
          x: wordBox.left - rect.left,
          y: wordBox.top - rect.top,
          width: wordBox.width,
          height: wordBox.height,
        },
        s.titleScale,
        s.titleTravel,
      );
    if (compact) word.style.transformOrigin = "center center";
    jobs.push(
      animate(
        word,
        [
          {
            transform: `translateY(${motion.travel}px) scale(${motion.scale})`,
          },
          { transform: "translateY(0) scale(1)" },
        ],
        s.settleDuration,
        settleAt,
      ),
    );
    jobs.push(
      animate(
        root,
        [
          { backgroundColor: s.overlayColor },
          { backgroundColor: "transparent" },
        ],
        400,
        settleAt,
      ),
    );
    if (target) {
      jobs.push(
        animate(
          target,
          [{ transform: `scale(${s.scale})` }, { transform: "scale(1)" }],
          s.duration,
          settleAt,
        ),
      );
      jobs.push(
        animate(target, [{ opacity: 0 }, { opacity: 1 }], 400, settleAt),
      );
    }
    await Promise.all(jobs);
    return;
  }
  async function runReveal(): Promise<TransitionResult> {
    if (phase === "destroyed") return { status: "cancelled" };
    cancel();
    const ticket = serial;
    active = new AbortController();
    const signal = active.signal;
    if (!signal.aborted) await reveal();
    if (ticket !== serial) return { status: "cancelled" };
    settle();
    return { status: "finished" };
  }
  async function cover(): Promise<TransitionResult> {
    if (phase === "destroyed") return { status: "cancelled" };
    cancel();
    const ticket = serial;
    active = new AbortController();
    setPhase("covering");
    if (canMove()) {
      const { nodes } = cells();
      await Promise.all(
        nodes.map((n, i) =>
          animate(
            n,
            [{ transform: "translateY(101%)" }, { transform: "translateY(0)" }],
            s.coverDuration,
            Math.min(i, 20) * Math.min(80, 30),
          ),
        ),
      );
    }
    if (ticket !== serial) return { status: "cancelled" };
    setPhase("covered");
    safety = setTimeout(cancel, 8000);
    return { status: "finished" };
  }
  const preference = () => {
    if (media?.matches) cancel();
  };
  media?.addEventListener?.("change", preference);
  const visibility = () => {
    if (host.ownerDocument.hidden) cancel();
  };
  host.ownerDocument.addEventListener("visibilitychange", visibility);
  const observer =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver((entries) => {
          offscreen = !entries[0]?.isIntersecting;
          if (offscreen) cancel();
        });
  observer?.observe(host);
  let lastWidth = host.getBoundingClientRect().width,
    lastHeight = host.getBoundingClientRect().height;
  const resize = () => {
    if (phase === "destroyed") return;
    const rect = host.getBoundingClientRect();
    if (rect.width === lastWidth && rect.height === lastHeight) return;
    lastWidth = rect.width;
    lastHeight = rect.height;
    if (phase === "revealing") cancel();
    fitTitle();
  };
  const resizeObserver =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
  resizeObserver?.observe(host);
  if (!resizeObserver) view?.addEventListener("resize", resize);
  fitTitle();
  const api: PageTransitionController = {
    get phase() {
      return phase;
    },
    replay: runReveal,
    cover,
    async uncover() {
      clearTimeout(safety);
      return runReveal();
    },
    async navigate(options) {
      // Observe an already-running readiness promise before cover's first await.
      // Keep rejection as fulfilled outcome data, including when cover is cancelled.
      const readiness =
        typeof options.ready === "function"
          ? null
          : Promise.resolve(options.ready).then(
              () => ({ ok: true }),
              () => ({ ok: false }),
            );
      if (options.signal?.aborted) return { status: "cancelled" };
      // cover establishes ownership synchronously, including when motion is disabled.
      // Capture before yielding so a superseded continuation cannot borrow the new request.
      const covering = cover(),
        controller = active;
      let ticket = serial;
      const abort = () => {
        if (ticket === serial) cancel();
      };
      options.signal?.addEventListener("abort", abort, { once: true });
      const result = await covering;
      if (
        result.status !== "finished" ||
        ticket !== serial ||
        !controller ||
        controller.signal.aborted
      ) {
        options.signal?.removeEventListener("abort", abort);
        return { status: "cancelled" };
      }
      clearTimeout(safety);
      let timedOut = false;
      const timer = setTimeout(
        () => {
          timedOut = true;
          cancel();
        },
        Math.max(100, Math.min(8000, options.timeout ?? 8000)),
      );
      try {
        const ready =
          readiness ??
          Promise.resolve(
            typeof options.ready === "function"
              ? options.ready(controller.signal)
              : undefined,
          ).then(
            () => ({ ok: true }),
            () => ({ ok: false }),
          );
        const outcome = await Promise.race([
          ready,
          new Promise<void>((resolve) => {
            if (controller.signal.aborted) resolve();
            else
              controller.signal.addEventListener("abort", () => resolve(), {
                once: true,
              });
          }),
        ]);
        if (ticket !== serial || controller.signal.aborted)
          return { status: timedOut ? "timeout" : "cancelled" };
        if (!outcome || !outcome.ok) {
          cancel();
          return { status: "error" };
        }
        options.commit?.(controller.signal);
        if (ticket !== serial) return { status: "cancelled" };
        clearTimeout(timer);
        const uncovering = api.uncover();
        ticket = serial;
        return await uncovering;
      } catch {
        if (ticket === serial) cancel();
        return { status: "error" };
      } finally {
        clearTimeout(timer);
        options.signal?.removeEventListener("abort", abort);
      }
    },
    cancel,
    update(next) {
      cancel();
      s = resolveSettings({
        ...s,
        ...(next && typeof next === "object" ? next : {}),
      });
      fitTitle();
    },
    pause() {
      paused = true;
      cancel();
    },
    resume() {
      paused = false;
    },
    destroy() {
      if (phase === "destroyed") return;
      cancel();
      setPhase("destroyed");
      observer?.disconnect();
      resizeObserver?.disconnect();
      view?.removeEventListener("resize", resize);
      media?.removeEventListener?.("change", preference);
      host.ownerDocument.removeEventListener("visibilitychange", visibility);
      if (needsPosition) host.style.position = originalPosition;
      delete host.dataset.ptPhase;
    },
  };
  return api;
}
