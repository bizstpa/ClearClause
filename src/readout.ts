// Shared readout rendering: the per-category card with its found/severity
// badges and the quoted matched sentences. Both the web app and the extension
// popup render results through here so the readout looks and behaves
// identically across both targets. This is UI (it touches the DOM), so detector
// code never imports it — the dependency only ever points this way.
import { detectors } from './engine';
import type { Category, DetectorResult, Severity } from './engine';
import { strings as t } from './strings';
import { el } from './dom';

const SEVERITY_ORDER: Severity[] = ['info', 'caution', 'warning'];

// One detector per category in V1; used to look up label + severity for display.
const detectorByCategory = new Map<Category, (typeof detectors)[number]>(
  detectors.map((d) => [d.category, d]),
);

/** Render one category's result card (found/severity badges + quoted matches). */
export function renderResult(result: DetectorResult): HTMLElement {
  const detector = detectorByCategory.get(result.category)!;

  // The card badge shows the highest severity among matches; matches may
  // override the detector's base severity (e.g. sensitive data categories).
  const severityOf = (m: { severity?: Severity }) => m.severity ?? detector.severity;
  const cardSeverity = result.matches.reduce<Severity>(
    (top, m) =>
      SEVERITY_ORDER.indexOf(severityOf(m)) > SEVERITY_ORDER.indexOf(top) ? severityOf(m) : top,
    detector.severity,
  );

  const card = el('article', { class: `result ${result.found ? 'is-found' : ''}` });
  const head = el('div', { class: 'result-head' });
  head.append(
    el('h3', {}, detector.label),
    el(
      'span',
      { class: `badge ${result.found ? 'badge-found' : 'badge-not-found'}` },
      result.found ? t.found : t.notFound,
    ),
  );
  if (result.found) {
    head.append(el('span', { class: `badge badge-${cardSeverity}` }, t.severity[cardSeverity]));
  }
  card.append(head);

  if (result.found) {
    card.append(
      el('p', { class: 'match-count' }, t.matchCount.replace('{count}', String(result.matches.length))),
    );
    const list = el('ul', { class: 'matches' });
    for (const match of result.matches) {
      const item = el('li');
      if (match.severity) {
        item.append(
          el('span', { class: `badge badge-${match.severity} match-severity` }, t.severity[match.severity]),
        );
      }
      item.append(el('blockquote', {}, match.sentence));
      list.append(item);
    }
    card.append(list);
  }
  return card;
}
