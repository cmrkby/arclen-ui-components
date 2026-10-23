const MIN_FONT_SIZE = 32;
const MAX_FONT_SIZE = 96;

/** Measure the padded title and each rendered text fragment, not character counts. */
function fits(root: HTMLElement, title: HTMLElement, paragraph: HTMLElement): boolean {
  const host = root.getBoundingClientRect();
  const inside = (rect: DOMRect) => rect.left >= host.left && rect.right <= host.right &&
    rect.top >= host.top && rect.bottom <= host.bottom;
  const range = root.ownerDocument.createRange();
  range.selectNodeContents(paragraph);
  return inside(title.getBoundingClientRect()) && Array.from(range.getClientRects()).every(inside);
}

export function createHeadlineFitter(root: HTMLElement) {
  let disposed = false;
  let observer: ResizeObserver | undefined;
  let listening = false;
  let generation = 0;
  const fonts = root.ownerDocument.fonts;
  const view = root.ownerDocument.defaultView;
  const paragraph = () => root.querySelector<HTMLElement>('.arclen-mesh-gradient__title > p');

  const fit = () => {
    if (disposed || root.dataset.headlineMode !== 'readable') return;
    const text = paragraph();
    const title = text?.parentElement;
    if (!text || !title) return;
    // Remove the previous fit so larger hosts and newly loaded fonts can use the usual clamp.
    text.style.removeProperty('font-size');
    const box = root.getBoundingClientRect();
    if (!root.isConnected || box.width <= 0 || box.height <= 0 || !view) {
      title.dataset.fit = 'pending';
      return;
    }
    const computed = Number.parseFloat(view.getComputedStyle(text).fontSize);
    if (!Number.isFinite(computed)) {
      title.dataset.fit = 'pending';
      return;
    }
    const usual = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, computed));
    if (fits(root, title, text)) {
      title.dataset.fit = 'natural';
      return;
    }
    text.style.fontSize = `${MIN_FONT_SIZE}px`;
    if (!fits(root, title, text)) {
      // Keep the full text and expose the unsatisfied minimum-size condition.
      title.dataset.fit = 'overflow';
      return;
    }
    let lower = MIN_FONT_SIZE;
    let upper = usual;
    // At most ten layout probes; retain the largest confirmed fitting lower bound.
    for (let attempt = 0; attempt < 10 && upper - lower > 0.0625; attempt++) {
      const candidate = (lower + upper) / 2;
      text.style.fontSize = `${candidate}px`;
      if (fits(root, title, text)) lower = candidate;
      else upper = candidate;
    }
    text.style.fontSize = `${lower}px`;
    title.dataset.fit = 'fitted';
  };

  const stop = () => {
    observer?.disconnect();
    observer = undefined;
    if (listening) {
      fonts.removeEventListener('loadingdone', fit);
      fonts.removeEventListener('loadingerror', fit);
      listening = false;
    }
  };

  const update = () => {
    if (disposed) return;
    const current = ++generation;
    const text = paragraph();
    if (root.dataset.headlineMode !== 'readable' || !text?.textContent) {
      stop();
      text?.style.removeProperty('font-size');
      if (text?.parentElement) delete text.parentElement.dataset.fit;
      return;
    }
    if (!observer && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(fit);
      observer.observe(root);
    }
    if (!listening && fonts?.addEventListener) {
      fonts.addEventListener('loadingdone', fit);
      fonts.addEventListener('loadingerror', fit);
      listening = true;
    }
    fit();
    // Some engines resolve font loading without dispatching FontFaceSet events.
    // Target the current text so completion remeasures its actual loaded metrics.
    if (fonts?.load && view) {
      const style = view.getComputedStyle(text);
      void fonts.load(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, text.textContent || '').then(() => {
        if (!disposed && generation === current && paragraph() === text && root.dataset.headlineMode === 'readable') fit();
      }).catch(() => { /* Native loadingerror handling retains the fallback layout. */ });
    }
  };

  update();
  return {
    update,
    destroy() {
      if (disposed) return;
      disposed = true;
      stop();
    },
  };
}
