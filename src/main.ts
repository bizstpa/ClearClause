import './style.css';
import { runDetectors } from './engine';
import type { DetectorResult } from './engine';
import { strings as t } from './strings';
import { el } from './dom';
import { renderResult } from './readout';

interface State {
  text: string;
  results: DetectorResult[] | null;
  emptyWarning: boolean;
}

const state: State = { text: '', results: null, emptyWarning: false };

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

render();
