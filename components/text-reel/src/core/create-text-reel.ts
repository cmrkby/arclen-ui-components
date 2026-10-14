import manifest from '../../component.json';
import { resolveTextReelOptions } from "./options";
import type { TextReelController, TextReelOptions } from "./types";

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const repetitions = 19;

export function materializeTextReelMarkup(value: TextReelOptions = {}): string {
  const options = resolveTextReelOptions(value);
  const items = Array.from({ length: repetitions }, (_, copyIndex) => options.words.map((word, wordIndex) =>
    `<span class="tr-item" data-arclen-role="item" data-word-index="${wordIndex}" data-copy-index="${copyIndex}">${escapeHtml(word)}</span>`).join("")).join("");
  const phrase = `${options.leading} ${options.words[0] ?? ""}`;
  return `<span class="text-reel" data-arclen-component="text-reel@${manifest.version}"><span class="tr-sr-only" data-arclen-role="accessible" aria-live="off">${escapeHtml(phrase)}</span><span class="tr-leading" data-arclen-role="leading" aria-hidden="true">${escapeHtml(options.leading)}</span><button class="tr-viewport" data-arclen-role="viewport" type="button" disabled aria-hidden="true"><span class="tr-rail" data-arclen-role="rail">${items}</span></button></span>`;
}

const px = (value: string, fallback: number) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

function requiredElement<T extends HTMLElement>(root: HTMLElement, role: string): T {
  const matches = root.querySelectorAll<T>(`[data-arclen-role="${role}"]`);
  const element = matches[0];
  if (matches.length !== 1 || !element) throw Error("dom-contract");
  return element;
}

export function mountTextReel(root: HTMLElement, initial: TextReelOptions = {}): TextReelController {
  const view = root.ownerDocument.defaultView;
  if (!view) throw Error("runtime-unavailable");
  const accessible = requiredElement<HTMLElement>(root, "accessible");
  const leading = requiredElement<HTMLElement>(root, "leading");
  const viewport = requiredElement<HTMLButtonElement>(root, "viewport");
  const rail = requiredElement<HTMLElement>(root, "rail");
  const reduceQuery = typeof view.matchMedia === "function"
    ? view.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false, addEventListener() {}, removeEventListener() {} };
  let options = resolveTextReelOptions(initial);
  let index = 0;
  let visible = true;
  let paused = false;
  let destroyed = false;
  let moving = false;
  let controller = new AbortController();

  const pitch = () => px(view.getComputedStyle(root).getPropertyValue("--tr-pitch"), 41);
  const position = () => pitch() / 2 - index * pitch();
  const updateSemantics = () => {
    const word = options.words[index] ?? options.words[0] ?? "";
    accessible.textContent = `${options.leading} ${word}`;
    accessible.setAttribute("aria-live", options.mode === "on-demand" ? "polite" : "off");
    viewport.setAttribute("aria-label", `Show next phrase. Current: ${word}`);
    const interactive = options.mode === "on-demand" && !paused;
    viewport.disabled = !interactive;
    if (interactive) viewport.removeAttribute("aria-hidden"); else viewport.setAttribute("aria-hidden", "true");
  };
  const place = () => {
    rail.style.transform = `translate3d(0, ${position()}px, 0)`;
    rail.style.filter = "blur(0px)";
    updateSemantics();
  };
  const fitViewport = () => {
    viewport.style.width = "";
    viewport.style.flexBasis = "";
    const floor = px(view.getComputedStyle(root).getPropertyValue("--tr-viewport-width"), 207);
    const widest = Math.max(0, ...Array.from(rail.children).map(item => (item as HTMLElement).scrollWidth));
    const width = Math.max(floor, Math.ceil(widest + 0.25));
    viewport.style.width = `${width}px`;
    viewport.style.flexBasis = `${width}px`;
  };
  const wait = (duration: number, signal: AbortSignal) => new Promise<void>(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      view.clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = view.setTimeout(finish, duration);
    signal.addEventListener("abort", finish, { once: true });
  });
  const play = async (animation: Animation, signal: AbortSignal) => {
    const cancel = () => animation.cancel();
    signal.addEventListener("abort", cancel, { once: true });
    try { await animation.finished; return true; } catch { return false; }
    finally { signal.removeEventListener("abort", cancel); }
  };
  const spring = (from: number, target: number, signal: AbortSignal) => new Promise<void>(resolve => {
    let positionValue = from;
    let velocity = 0;
    let last: number | undefined;
    let frame = 0;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      view.cancelAnimationFrame(frame);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    signal.addEventListener("abort", finish, { once: true });
    const tick = (time: number) => {
      if (signal.aborted) { finish(); return; }
      if (last === undefined) last = time;
      const dt = Math.min((time - last) / 1000, 0.032);
      last = time;
      const acceleration = (-140 * (positionValue - target) - 12 * velocity) / 1.4;
      velocity += acceleration * dt;
      positionValue += velocity * dt;
      rail.style.transform = `translate3d(0, ${positionValue}px, 0)`;
      if (Math.abs(velocity) <= 0.1 && Math.abs(target - positionValue) <= 0.1) {
        rail.style.transform = `translate3d(0, ${target}px, 0)`;
        finish();
        return;
      }
      frame = view.requestAnimationFrame(tick);
    };
    frame = view.requestAnimationFrame(tick);
  });
  const advance = async (signal: AbortSignal) => {
    if (moving || signal.aborted) return;
    moving = true;
    const itemPitch = pitch();
    const start = position();
    if (reduceQuery.matches || typeof rail.animate !== "function") {
      index = (index + 1) % options.words.length;
      place();
      moving = false;
      return;
    }
    if (options.mode === "original") {
      const stride = 3 * options.words.length + 1;
      const overshoot = start - (stride + 1) * itemPitch;
      const resting = start - stride * itemPitch;
      const travel = rail.animate([{ transform: `translate3d(0, ${start}px, 0)` }, { transform: `translate3d(0, ${overshoot}px, 0)` }], { duration: 1200, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" });
      const blur = rail.animate([{ filter: "blur(0px)" }, { filter: "blur(3px)" }], { duration: 240, easing: "ease-out", fill: "forwards" });
      const completed = (await Promise.all([play(travel, signal), play(blur, signal)])).every(Boolean);
      travel.cancel(); blur.cancel();
      if (completed && !signal.aborted) {
        rail.style.transform = `translate3d(0, ${overshoot}px, 0)`;
        rail.style.filter = "blur(3px)";
        const clear = rail.animate([{ filter: "blur(3px)" }, { filter: "blur(0px)" }], { duration: 150, easing: "ease-out", fill: "forwards" });
        await Promise.all([play(clear, signal), spring(overshoot, resting, signal)]);
        clear.cancel();
      }
    } else {
      const target = start - itemPitch;
      const motion = rail.animate([
        { transform: `translate3d(0, ${start}px, 0)`, filter: "blur(0px)", offset: 0 },
        { transform: `translate3d(0, ${target - itemPitch * 0.12}px, 0)`, filter: "blur(1.5px)", offset: 0.78 },
        { transform: `translate3d(0, ${target}px, 0)`, filter: "blur(0px)", offset: 1 },
      ], { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" });
      await play(motion, signal);
      motion.cancel();
    }
    if (!signal.aborted) { index = (index + 1) % options.words.length; place(); }
    if (!signal.aborted) moving = false;
  };
  const run = async (signal: AbortSignal) => {
    place();
    const hold = options.mode === "original" ? 1500 : 2600;
    while (!signal.aborted && visible && !paused && options.mode !== "on-demand" && options.words.length > 1 && !reduceQuery.matches) {
      await wait(hold, signal);
      if (!signal.aborted && visible && !paused && !root.ownerDocument.hidden) await advance(signal);
    }
  };
  const restart = () => {
    controller.abort();
    controller = new AbortController();
    moving = false;
    place();
    if (visible && !paused && options.mode !== "on-demand" && options.words.length > 1 && !reduceQuery.matches && !root.ownerDocument.hidden) void run(controller.signal);
  };
  const rebuild = () => {
    leading.textContent = options.leading;
    rail.replaceChildren(...Array.from({ length: repetitions }, (_, copyIndex) => options.words.map((word, wordIndex) => {
      const item = root.ownerDocument.createElement("span");
      item.className = "tr-item";
      item.dataset["arclenRole"] = "item";
      item.dataset["wordIndex"] = String(wordIndex);
      item.dataset["copyIndex"] = String(copyIndex);
      item.textContent = word;
      return item;
    })).flat());
    index = 0;
    fitViewport();
    restart();
  };
  const click = () => { if (options.mode === "on-demand" && !paused) void advance(controller.signal); };
  const visibility = () => restart();
  const motionPreference = () => { index = 0; restart(); };
  const resize = () => { fitViewport(); restart(); };
  const Intersection = view.IntersectionObserver;
  const observer = Intersection ? new Intersection(([entry]) => {
    const next = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.1);
    if (next !== visible) { visible = next; index = 0; restart(); }
  }, { threshold: [0, 0.1] }) : null;
  const Resize = view.ResizeObserver;
  const resizeObserver = Resize ? new Resize(resize) : null;
  viewport.addEventListener("click", click);
  root.ownerDocument.addEventListener("visibilitychange", visibility);
  reduceQuery.addEventListener("change", motionPreference);
  view.addEventListener("resize", resize, { passive: true });
  observer?.observe(root);
  resizeObserver?.observe(root);
  fitViewport();
  restart();
  void root.ownerDocument.fonts?.ready.then(() => { if (!destroyed) resize(); });

  return {
    setOptions(next) { if (destroyed) return; options = resolveTextReelOptions(next); rebuild(); },
    replay() { if (!destroyed) { index = 0; restart(); } },
    pause() { if (!destroyed) { paused = true; restart(); } },
    resume() { if (!destroyed) { paused = false; restart(); } },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      controller.abort();
      observer?.disconnect();
      resizeObserver?.disconnect();
      viewport.removeEventListener("click", click);
      root.ownerDocument.removeEventListener("visibilitychange", visibility);
      reduceQuery.removeEventListener("change", motionPreference);
      view.removeEventListener("resize", resize);
      paused = true;
      index = 0;
      place();
    },
  };
}

export function createTextReel(host: HTMLElement, initial: TextReelOptions = {}): TextReelController {
  const options = resolveTextReelOptions(initial);
  host.innerHTML = materializeTextReelMarkup(options);
  const root = host.firstElementChild;
  if (!(root instanceof HTMLElement)) throw Error("dom-contract");
  const mounted = mountTextReel(root, options);
  return {
    ...mounted,
    destroy() { mounted.destroy(); host.replaceChildren(); },
  };
}
