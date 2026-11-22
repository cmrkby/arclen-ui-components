import type { Settings } from './index';

const metrics = ['performance', 'accessibility', 'seo'] as const;
type Metric = typeof metrics[number];
type FaceRenderer = (s: Settings, score: number, escapedTitle: string) => string;

export function auditText(value: unknown, fallback: string, limit: number) {
  return typeof value === 'string' ? value.trim().slice(0, limit) || fallback : fallback;
}

function escapeText(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function summaryName(label: string, score: number) {
  return `${label}, ${score} out of 100, finding`;
}

function tile(metric: Metric, s: Settings, face: FaceRenderer) {
  const score = s[`${metric}Score`];
  const label = s[`${metric}Label`];
  const name = escapeText(summaryName(label, score)).replaceAll('"', '&quot;');
  return `<details class="cd-audit-tile">
    <summary aria-label="${name}">
      ${face(s, score, escapeText(label))}
      <span class="cd-audit-hint" aria-hidden="true">Finding<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="m6 9 6 6 6-6"/></svg></span>
    </summary>
    <p class="cd-audit-finding">${escapeText(s[`${metric}Finding`])}</p>
  </details>`;
}

export function renderAudit(s: Settings, style: string, face: FaceRenderer) {
  return `<section class="cd-shell cd-audit" data-climate-dial data-mode="site-audit" data-theme="${s.theme}" style="${style}" aria-label="Site audit"><div class="cd-audit-grid">${metrics.map(metric => tile(metric, s, face)).join('')}</div></section>`;
}

export function updateAudit(host: HTMLElement, s: Settings, style: string, face: FaceRenderer, paint: (s: Settings, score: number) => string) {
  const root = host.querySelector<HTMLElement>('.cd-audit')!;
  root.dataset.theme = s.theme;
  root.style.cssText = style;
  root.querySelectorAll<HTMLDetailsElement>('details').forEach((el, i) => {
    const metric = metrics[i];
    const label = s[`${metric}Label`];
    const score = s[`${metric}Score`];
    const summary = el.querySelector('summary')!;
    const name = summaryName(label, score);
    const instrument = summary.querySelector<HTMLElement>('.cd-instrument')!;
    if (summary.getAttribute('aria-label') !== name) {
      instrument.outerHTML = face(s, score, escapeText(label));
      summary.setAttribute('aria-label', name);
    } else {
      const style = paint(s, score);
      if (instrument.getAttribute('style') !== style) instrument.setAttribute('style', style);
    }
    el.querySelector('.cd-audit-finding')!.textContent = s[`${metric}Finding`];
  });
}
