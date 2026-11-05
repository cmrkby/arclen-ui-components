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
  const wait = (ms: number, signal: AbortSignal) =>
    new Promise<void>((resolve) => {
      if (signal.aborted || !ms) {
        resolve();
        return;
      }
      const done = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", done);
        resolve();
      };
      const timer = setTimeout(done, ms);
      signal.addEventListener("abort", done, { once: true });
    });
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
  async function reveal(signal: AbortSignal) {
    setPhase("revealing");
    if (!canMove()) return;
    const root = makeOverlay(),
      top = host.ownerDocument.createElement("i"),
      bottom = host.ownerDocument.createElement("i"),
      line = host.ownerDocument.createElement("i"),
      fill = host.ownerDocument.createElement("i"),
      count = host.ownerDocument.createElement("span");
    top.dataset.ptHalf = "top";
    bottom.dataset.ptHalf = "bottom";
    line.dataset.ptTrack = "";
    fill.dataset.ptFill = "";
    count.dataset.ptCount = "";
    count.textContent = "0";
    top.style.cssText = `position:absolute;inset:0 0 50%;background:${s.overlayColor};`;
    bottom.style.cssText = `position:absolute;inset:50% 0 0;background:${s.overlayColor};`;
    line.style.cssText =
      "position:absolute;left:0;top:calc(50% - 1px);height:2px;width:100%;background:rgba(255,255,255,.06);overflow:hidden;border-radius:1px;";
    fill.style.cssText = `position:absolute;left:calc(50% - min(100px, (100% - 48px) / 2));top:0;bottom:0;width:min(200px,calc(100% - 48px));background:${s.counterColor};transform-origin:left;`;
    line.append(fill);
    count.style.cssText = `position:absolute;left:50%;bottom:calc(50% + 13px);width:min(200px,calc(100% - 48px));transform:translateX(-50%);text-align:center;font:500 16px/1.3 Arial,sans-serif;font-variant-numeric:tabular-nums;letter-spacing:0;color:${s.counterColor};`;
    root.append(top, bottom, line, count);
    await wait(s.leadIn, signal);
    if (signal.aborted) return;
    const ratio = s.lineDuration / 1031,
      short = "inset(0 calc(50% - min(100px, (100% - 48px) / 2)) round 1px)",
      closed = "inset(0 50% round 1px)",
      openAt = s.lineDuration + s.hold;
    // All offsets share one origin: stretch and opening intentionally overlap by 44ms.
    const counter = (async () => {
      await wait(225 * ratio, signal);
      const start = Date.now();
      while (!signal.aborted) {
        const progress = Math.min(1, (Date.now() - start) / (500 * ratio));
        count.textContent = String(Math.round(progress * 100));
        if (progress === 1) return;
        await wait(16, signal);
      }
    })();
    const target = content();
    await Promise.all([
      animate(
        line,
        [
          { clipPath: closed, offset: 0, easing: "cubic-bezier(.22,1,.36,1)" },
          { clipPath: short, offset: 300 / 1075, easing: "linear" },
          {
            clipPath: short,
            offset: 725 / 1075,
            easing: "cubic-bezier(.76,0,.24,1)",
          },
          { clipPath: "inset(0 0 round 1px)", offset: 1 },
        ],
        1075 * ratio,
        0,
        "linear",
      ),
      animate(
        fill,
        [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        500 * ratio,
        225 * ratio,
        "cubic-bezier(.65,0,.35,1)",
      ),
      animate(
        count,
        [{ opacity: 1 }, { opacity: 0 }],
        250 * ratio,
        725 * ratio,
        "ease-out",
      ),
      animate(
        fill,
        [{ opacity: 1 }, { opacity: 0 }],
        250 * ratio,
        725 * ratio,
        "ease-out",
      ),
      counter,
      animate(
        line,
        [{ opacity: 1 }, { opacity: 0 }],
        10 * ratio,
        openAt,
        "linear",
      ),
      animate(
        top,
        [{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }],
        s.duration,
        openAt,
      ),
      animate(
        bottom,
        [{ transform: "translateY(0)" }, { transform: "translateY(100%)" }],
        s.duration,
        openAt,
      ),
      ...(target
        ? [
            animate(
              target,
              [
                { opacity: 0, transform: `translateY(${s.travel}px)` },
                { opacity: 1, transform: "translateY(0)" },
              ],
              600,
              openAt,
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
    if (!signal.aborted) await reveal(signal);
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
