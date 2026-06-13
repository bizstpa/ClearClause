import './style.css';
import { detectors, runDetectors } from './engine';
import type { Category, DetectorResult, Severity } from './engine';
import { strings as t } from './strings';

const SEVERITY_ORDER: Severity[] = ['info', 'caution', 'warning'];

interface State {
  text: string;
  results: DetectorResult[] | null;
  emptyWarning: boolean;
}

const state: State = { text: '', results: null, emptyWarning: false };

// One detector per category in V1; used to look up label + severity for display.
const detectorByCategory = new Map<Category, (typeof detectors)[number]>(
  detectors.map((d) => [d.category, d]),
);

const app = document.querySelector<HTMLDivElement>('#app')!;

function render(): void {
  document.title = `${t.title} — ${t.tagline}`;

  app.replaceChildren();

  const header = el('header');
  header.append(el('h1', {}, t.title));

  const intro = el('p', { class: 'tagline' }, t.tagline);
  const privacy = el('p', { class: 'privacy-note' }, t.privacyNote);

  const form = el('div', { class: 'input-area' });
  const label = el('label', { for: 'policy-text' }, t.textareaLabel);
  const textarea = el('textarea', {
    id: 'policy-text',
    placeholder: t.textareaPlaceholder,
  }) as HTMLTextAreaElement;
  textarea.value = state.text;
  textarea.addEventListener('input', () => {
    state.text = textarea.value;
  });
  const analyze = el('button', { class: 'analyze', type: 'button' }, t.analyze);
  analyze.addEventListener('click', () => {
    if (!state.text.trim()) {
      state.results = null;
      state.emptyWarning = true;
    } else {
      state.results = runDetectors(state.text);
      state.emptyWarning = false;
    }
    render();
  });
  form.append(label, textarea, analyze);

  const results = el('section', { class: 'results', 'aria-live': 'polite' });
  if (state.emptyWarning) {
    results.append(el('p', { class: 'empty-warning' }, t.emptyInput));
  } else if (state.results) {
    results.append(el('h2', {}, t.resultsHeading));
    for (const result of state.results) {
      results.append(renderResult(result));
    }
  }

  const footer = el('footer');
  footer.append(el('p', { class: 'disclaimer' }, t.disclaimer));

  app.append(header, intro, privacy, form, results, footer);
}

function renderResult(result: DetectorResult): HTMLElement {
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

/** Tiny element helper — text is set via textContent, never innerHTML. */
function el(
  tag: string,
  attrs: Record<string, string> = {},
  text?: string,
): HTMLElement {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value) node.setAttribute(key, value);
  }
  if (text !== undefined) node.textContent = text;
  return node;
}

render();
