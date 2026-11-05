import { resolveSettings } from "./settings";
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
  function makeOverlay() {
    overlay?.remove();
    overlay = host.ownerDocument.createElement("div");
    overlay.dataset.ptOverlay = "";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.setProperty("--pt-label-color", "#eeeae1");
    overlay.style.cssText = `position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:10;color:${"#eeeae1"};`;
    overlay.style.setProperty("--pt-label-color", "#eeeae1");
    host.append(overlay);
    return overlay;
  }
  function cells() {
    const root = makeOverlay();
    const cols = 3,
      rows = 1;
    const nodes: HTMLElement[] = [];
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const el = host.ownerDocument.createElement("i");
        el.dataset.ptCell = "";
        el.style.cssText = `position:absolute;left:${(x / cols) * 100}%;top:${(y / rows) * 100}%;width:calc(${100 / cols}% + 1px);height:calc(${100 / rows}% + 1px);background:${"#0a0a0a"};`;
        el.style.top = "-1%";
        el.style.height = "102%";
        el.style.width = `${100 / cols}%`;
        el.style.background = s.panelColor;
        el.style.borderRadius = `${s.panelRadius}px`;
        if (x < 2) {
          const seam = host.ownerDocument.createElement("i");
          seam.dataset.ptSeam = "";
          seam.style.cssText = `position:absolute;right:0;top:0;bottom:0;width:1px;background:${s.panelColor};`;
          el.append(seam);
        }
        root.append(el);
        nodes.push(el);
      }
    return { root, nodes, cols, rows };
  }
  async function reveal() {
    setPhase("revealing");
    if (!canMove()) return;
    const { root, nodes } = cells();
    const mask = host.ownerDocument.createElement("div");
    mask.className = "pt-label-mask";
    const label = host.ownerDocument.createElement("span");
    label.textContent = s.label;
    label.style.color = s.panelText;
    mask.append(label);
    root.append(mask);
    // Continuous shutter easing avoids velocity steps.
    const frames = (distance: number, unit: string): Keyframe[] => [
      { transform: "translateY(0)" },
      { transform: `translateY(${-distance}${unit})` },
    ];
    const easing =
        s.easing === "shutter" ? "cubic-bezier(.83,0,.15,1)" : curve(),
      delay = s.leadIn + s.hold;
    const image = host.querySelector<HTMLElement>("[data-pt-image]");
    await Promise.all([
      ...nodes.map((el, i) =>
        animate(
          el,
          frames(100, "%"),
          s.duration,
          delay + i * s.stagger,
          easing,
        ),
      ),
      animate(label, frames(s.labelTravel, "px"), s.duration, delay, easing),
      // Only the media rises; typography stays anchored. Tracked WAAPI effects clean up on every cancellation path.
      ...(image && s.imageRise > 0
        ? [
            animate(
              image,
              [
                { transform: `translateY(${s.imageRise}px)` },
                { transform: "translateY(0)" },
              ],
              s.imageDuration,
              delay + s.imageDelay,
              "cubic-bezier(.12,.96,.44,1)",
            ),
          ]
        : []),
    ]);
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
            Math.min(i, 20) * Math.min(s.stagger, 30),
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
      media?.removeEventListener?.("change", preference);
      host.ownerDocument.removeEventListener("visibilitychange", visibility);
      if (needsPosition) host.style.position = originalPosition;
      delete host.dataset.ptPhase;
    },
  };
  return api;
}
