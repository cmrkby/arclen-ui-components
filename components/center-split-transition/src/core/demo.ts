import { resolveSettings } from "./settings";
import { createPageTransition, type PageTransitionController } from "./engine";
import { renderHeroImage } from "./hero-image";
import wordmarkImage from "../../assets/arclen-wordmark.svg";
import {
  renderTacticalButton,
  attachTactical,
  type TacticalSettings,
} from "./scan";
const replaySettings: TacticalSettings = {
  label: "Replay reveal",
  disabled: false,
  animate: true,
  textColor: "#eeeae1",
  scatterColor: "#de4912",
  backgroundColor: "var(--pt-detail-fill)",
  cornerColor: "var(--pt-detail-line)",
};
const bundledWordmark = wordmarkImage as unknown as
  | string
  | {
      src: string;
    };
const wordmarkSource =
  typeof bundledWordmark === "string" ? bundledWordmark : bundledWordmark.src;
const escape = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
function renderDemo(input: unknown = {}): string {
  const s = resolveSettings(input);
  return `<section data-page-transitions data-pt-preset="${"center-split"}" style="--pt-bg:${s.background};--pt-fg:${s.foreground};--pt-height:${s.minHeight}px;--pt-title-color:${"#eeeae1"};--pt-pixel-heading:${"#f4f4f0"};--pt-pixel-compact-heading:${"#f4f4f0"};--pt-pixel-mobile-text:${"#fdfdff"}"><div data-pt-content><div class="pt-editorial">${renderHeroImage()}<span class="pt-brand"><img src="${escape(wordmarkSource)}" alt="Arclen" width="94" height="24"/></span><div class="pt-story"><div class="pt-copy"><span class="pt-eyebrow"><span class="pt-eyebrow-a11y">A Study In Motion</span><span class="pt-eyebrow-visual" aria-hidden="true">A Study In Motion</span></span><h2>${escape(s.heading)}</h2><p>${escape(s.caption)}</p></div>${renderTacticalButton(replaySettings).replace("<button", "<button data-pt-replay")}</div><span class="pt-credit">Independent by design.</span></div></div><div class="pt-title" data-pt-title aria-hidden="true">${escape("FRAME")}</div><button data-pt-navigate type="button">Next scene <span aria-hidden="true">→</span></button></section>`;
}
function mountDemo(
  host: HTMLElement,
  input: unknown = {},
): PageTransitionController {
  let s = resolveSettings(input);
  host.innerHTML = renderDemo(s);
  const root = host.querySelector<HTMLElement>("[data-page-transitions]")!,
    api = createPageTransition(root, s),
    replayControl = attachTactical(
      root.querySelector<HTMLButtonElement>("[data-pt-replay]")!,
      replaySettings,
    );
  let alternate = false;
  const navigate = () => {
    void api.navigate({
      commit() {
        alternate = !alternate;
        root.querySelector("h2")!.textContent = alternate
          ? "See things\ndifferently."
          : s.heading;
        root.querySelector("p")!.textContent = alternate
          ? "A small shift. A whole new point of view."
          : s.caption;
      },
    });
  };
  root.querySelector("[data-pt-navigate]")!.addEventListener("click", navigate);
  const replay = () => {
    void api.replay();
  };
  root.querySelector("[data-pt-replay]")!.addEventListener("click", replay);
  if (s.autoplay) void api.replay();
  return {
    ...api,
    get phase() {
      return api.phase;
    },
    pause() {
      replayControl.pause();
      api.pause();
    },
    resume() {
      api.resume();
      replayControl.resume();
    },
    update(next) {
      s = resolveSettings({
        ...s,
        ...(next && typeof next === "object" ? next : {}),
      });
      root.dataset.ptPreset = "center-split";
      root.style.setProperty("--pt-bg", s.background);
      root.style.setProperty("--pt-fg", s.foreground);
      root.style.setProperty("--pt-height", `${s.minHeight}px`);
      root.style.setProperty("--pt-title-color", "#eeeae1");
      root.querySelector("[data-pt-title]")!.textContent = "FRAME";
      root.querySelector("h2")!.textContent = s.heading;
      root.querySelector("p")!.textContent = s.caption;
      root.style.setProperty("--pt-pixel-heading", "#f4f4f0");
      root.style.setProperty("--pt-pixel-compact-heading", "#f4f4f0");
      root.style.setProperty("--pt-pixel-mobile-text", "#fdfdff");
      api.update(s);
      replayControl.update(replaySettings);
      if (s.autoplay) void api.replay();
    },
    destroy() {
      replayControl.destroy();
      api.destroy();
      root
        .querySelector("[data-pt-replay]")
        ?.removeEventListener("click", replay);
      root
        .querySelector("[data-pt-navigate]")
        ?.removeEventListener("click", navigate);
    },
  };
}
export function render(input: unknown = {}): string {
  return renderDemo(input).replace(
    "<section data-page-transitions",
    '<section data-pt-demo="center-split" data-page-transitions',
  );
}
export function mount(
  host: HTMLElement,
  input: unknown = {},
): PageTransitionController {
  const previous = host.getAttribute("data-pt-demo");
  host.setAttribute("data-pt-demo", "center-split");
  const controller = mountDemo(host, input);
  host
    .querySelector("[data-page-transitions]")
    ?.setAttribute("data-pt-demo", "center-split");
  return {
    ...controller,
    get phase() {
      return controller.phase;
    },
    destroy() {
      controller.destroy();
      if (previous === null) host.removeAttribute("data-pt-demo");
      else host.setAttribute("data-pt-demo", previous);
    },
  };
}
