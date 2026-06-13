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
}

const state: State = { phase: 'idle', status: '', results: null, hint: false };

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

/** On open, compute the privacy-policy hint from the active tab's URL + title. */
async function init(): Promise<void> {
  render();
  const tab = await getActiveTab();
  state.hint = looksLikePrivacyPolicy(tab?.url, tab?.title);
  if (state.hint) render();
}

void init();
