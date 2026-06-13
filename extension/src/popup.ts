// Popup entry point. On the user's explicit click it extracts the live page's
// policy text (via the injected Readability bundle) and runs the shared engine.
// No network, no passive reading — extraction only happens on a button press.
import { runDetectors } from '../../src/engine';
import type { DetectorResult } from '../../src/engine';
import { strings as t } from '../../src/strings';
import { renderResult } from '../../src/readout';
import { EXTRACT_GLOBAL_KEY, MIN_USABLE_TEXT_LENGTH } from './constants';
import { looksLikePrivacyPolicy } from './looks-like-policy';
import type { ExtractionResult } from './extract';

type Phase = 'idle' | 'scanning' | 'results' | 'thin' | 'error';

interface State {
  phase: Phase;
  status: string;
  results: DetectorResult[] | null;
  /** Whether the active tab's URL/title look like a privacy policy. */
  hint: boolean;
  /** Whether the paste-box fallback is expanded. */
  pasteOpen: boolean;
  /** Retained paste-box contents across re-renders. */
  pasteText: string;
}

const state: State = {
  phase: 'idle',
  status: '',
  results: null,
  hint: false,
  pasteOpen: false,
  pasteText: '',
};

const app = document.querySelector<HTMLDivElement>('#app')!;

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/** Inject the extraction bundle into the tab, then call it for the result. */
async function extractFromTab(tabId: number): Promise<ExtractionResult> {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['extract.js'] });
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    args: [EXTRACT_GLOBAL_KEY],
    func: (key: string) => {
      const fn = (globalThis as Record<string, unknown>)[key] as
        | (() => { text: string; title: string })
        | undefined;
      return fn ? fn() : { text: '', title: document.title || '' };
    },
  });
  return (injection?.result as ExtractionResult) ?? { text: '', title: '' };
}

async function scanPage(): Promise<void> {
  state.phase = 'scanning';
  render();

  const tab = await getActiveTab();
  if (!tab?.id) {
    state.phase = 'error';
    state.status = t.ext.noTab;
    render();
    return;
  }

  try {
    const { text, title } = await extractFromTab(tab.id);
    if (text.length < MIN_USABLE_TEXT_LENGTH) {
      state.phase = 'thin';
      state.results = null;
      render();
      return;
    }
    state.results = runDetectors(text);
    state.phase = 'results';
    state.status = t.ext.scanned
      .replace('{title}', title || 'this page')
      .replace('{count}', text.length.toLocaleString());
    render();
  } catch {
    state.phase = 'error';
    state.status = t.ext.extractError;
    render();
  }
}

/** Run the engine on text from a fallback path and show the readout. */
function analyzeText(text: string, statusTemplate: string): void {
  state.results = runDetectors(text);
  state.phase = 'results';
  state.status = statusTemplate.replace('{count}', text.length.toLocaleString());
  render();
}

/** Fallback: scan whatever the user has selected on the page. */
async function scanSelection(): Promise<void> {
  const tab = await getActiveTab();
  if (!tab?.id) {
    state.status = t.ext.noTab;
    render();
    return;
  }
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection()?.toString() ?? '',
  });
  const text = ((injection?.result as string) ?? '').trim();
  if (!text) {
    state.status = t.ext.noSelection;
    render();
    return;
  }
  analyzeText(text, t.ext.scannedSelection);
}

/** Fallback: analyze text the user pasted directly into the popup. */
function analyzePaste(): void {
  const text = state.pasteText.trim();
  if (!text) {
    state.status = t.emptyInput;
    render();
    return;
  }
  analyzeText(text, t.ext.scannedPaste);
}

function render(): void {
  app.replaceChildren();

  const header = document.createElement('header');
  const h1 = document.createElement('h1');
  h1.textContent = t.title;
  const tagline = document.createElement('p');
  tagline.className = 'tagline';
  tagline.textContent = t.ext.tagline;
  header.append(h1, tagline);
  app.append(header);

  // Hint only — surfaced from the tab's URL/title, never an auto-read.
  if (state.hint && state.phase === 'idle') {
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = t.ext.hint;
    app.append(hint);
  }

  const scan = document.createElement('button');
  scan.className = 'analyze';
  scan.type = 'button';
  scan.textContent = state.phase === 'scanning' ? t.ext.scanning : t.ext.scanPage;
  scan.disabled = state.phase === 'scanning';
  scan.addEventListener('click', () => void scanPage());
  app.append(scan);

  if (state.status) {
    const status = document.createElement('p');
    status.className = 'status';
    status.textContent = state.status;
    app.append(status);
  }

  // When auto-extraction is thin or fails, degrade to user-driven fallbacks
  // rather than a dead end: scan the page selection, or paste text directly.
  if (state.phase === 'thin' || state.phase === 'error') {
    app.append(renderFallbacks());
  }

  if (state.phase === 'results' && state.results) {
    const heading = document.createElement('h2');
    heading.textContent = t.resultsHeading;
    app.append(heading);
    for (const result of state.results) {
      app.append(renderResult(result));
    }
  }

  const disclaimer = document.createElement('p');
  disclaimer.className = 'disclaimer';
  disclaimer.textContent = t.disclaimer;
  app.append(disclaimer);
}

/** The select-text + paste-box fallbacks, shown when extraction is thin. */
function renderFallbacks(): HTMLElement {
  const wrap = document.createElement('section');
  wrap.className = 'fallbacks';

  if (state.phase === 'thin') {
    const note = document.createElement('p');
    note.className = 'thin-note';
    note.textContent = t.ext.thinNote;
    wrap.append(note);
  }

  const selectBtn = document.createElement('button');
  selectBtn.className = 'analyze secondary';
  selectBtn.type = 'button';
  selectBtn.textContent = t.ext.scanSelection;
  selectBtn.addEventListener('click', () => void scanSelection());
  wrap.append(selectBtn);

  const paste = document.createElement('details');
  paste.className = 'paste';
  paste.open = state.pasteOpen;
  paste.addEventListener('toggle', () => {
    state.pasteOpen = paste.open;
  });
  const summary = document.createElement('summary');
  summary.textContent = t.ext.pasteToggle;
  paste.append(summary);

  const textarea = document.createElement('textarea');
  textarea.id = 'paste-text';
  textarea.placeholder = t.textareaPlaceholder;
  textarea.value = state.pasteText;
  textarea.addEventListener('input', () => {
    state.pasteText = textarea.value;
  });

  const pasteBtn = document.createElement('button');
  pasteBtn.className = 'analyze';
  pasteBtn.type = 'button';
  pasteBtn.textContent = t.ext.analyzePaste;
  pasteBtn.addEventListener('click', () => analyzePaste());

  paste.append(textarea, pasteBtn);
  wrap.append(paste);
  return wrap;
}

/** On open, compute the privacy-policy hint from the active tab's URL + title. */
async function init(): Promise<void> {
  render();
  const tab = await getActiveTab();
  state.hint = looksLikePrivacyPolicy(tab?.url, tab?.title);
  if (state.hint) render();
}

void init();
