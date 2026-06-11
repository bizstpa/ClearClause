import './style.css';
import { detectors, runDetectors } from './detectors/registry';
import type { Category, DetectorResult } from './detectors/types';
import { locales, type UiLang } from './i18n';

interface State {
  lang: UiLang;
  text: string;
  results: DetectorResult[] | null;
  emptyWarning: boolean;
}

const state: State = { lang: 'en', text: '', results: null, emptyWarning: false };

// One detector per category in V1; used to look up label + severity for display.
const detectorByCategory = new Map<Category, (typeof detectors)[number]>(
  detectors.map((d) => [d.category, d]),
);

const app = document.querySelector<HTMLDivElement>('#app')!;

function render(): void {
  const t = locales[state.lang];
  document.documentElement.lang = t.htmlLang;
  document.documentElement.dir = t.dir;
  document.title = `${t.title} — ${t.tagline}`;

  app.replaceChildren();

  const header = el('header');
  const switcher = el('button', { class: 'lang-switch', type: 'button' }, t.switchTo);
  switcher.setAttribute('aria-label', t.switchLabel);
  switcher.addEventListener('click', () => {
    state.lang = state.lang === 'en' ? 'ar' : 'en';
    render();
  });
  header.append(el('h1', {}, t.title), switcher);

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
    if (state.lang === 'ar') {
      results.append(el('p', { class: 'coverage-note' }, t.arabicCoverageNote));
    }
    for (const result of state.results) {
      results.append(renderResult(result));
    }
  }

  const footer = el('footer');
  footer.append(el('p', { class: 'disclaimer' }, t.disclaimer));

  app.append(header, intro, privacy, form, results, footer);
}

function renderResult(result: DetectorResult): HTMLElement {
  const t = locales[state.lang];
  const detector = detectorByCategory.get(result.category)!;

  const card = el('article', { class: `result ${result.found ? 'is-found' : ''}` });
  const head = el('div', { class: 'result-head' });
  head.append(
    el('h3', {}, detector.label[state.lang]),
    el(
      'span',
      { class: `badge ${result.found ? 'badge-found' : 'badge-not-found'}` },
      result.found ? t.found : t.notFound,
    ),
  );
  if (result.found) {
    head.append(
      el('span', { class: `badge badge-${detector.severity}` }, t.severity[detector.severity]),
    );
  }
  card.append(head);

  if (result.found) {
    card.append(
      el('p', { class: 'match-count' }, t.matchCount.replace('{count}', String(result.matches.length))),
    );
    const list = el('ul', { class: 'matches' });
    for (const match of result.matches) {
      const item = el('li');
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
