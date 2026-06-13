// Injected into the active tab (isolated world) on the user's explicit click,
// via chrome.scripting.executeScript. Pulls the main policy text out of the
// already-rendered page with Mozilla's Readability — no network, no navigation.
// Bundled to a self-contained classic script (extract.js) so executeScript can
// run it as a file.
import { Readability } from '@mozilla/readability';
import { EXTRACT_GLOBAL_KEY } from './constants';

export interface ExtractionResult {
  /** The main-content text Readability recovered, trimmed. May be empty. */
  text: string;
  /** A human-readable page title for the popup status line. */
  title: string;
}

export function extractPolicyText(): ExtractionResult {
  // Readability mutates the document it parses, so operate on a clone of the
  // live DOM. Because the page is already fully rendered in the user's browser,
  // JS-rendered and login-gated pages — which the old fetch helper couldn't
  // reach — are reachable here. Nav, footer, sidebar, and cookie-banner chrome
  // are dropped by Readability's scoring.
  const fallbackTitle = document.title || '';
  try {
    const docClone = document.cloneNode(true) as Document;
    const article = new Readability(docClone).parse();
    const text = (article?.textContent ?? '').trim();
    const title = article?.title?.trim() || fallbackTitle;
    return { text, title };
  } catch {
    // Unusual DOMs can make Readability throw. Degrade to empty text so the
    // popup offers its select-text / paste fallbacks rather than a dead end.
    return { text: '', title: fallbackTitle };
  }
}

// Exposed as a global so the popup, after injecting this file, can invoke
// extraction with a tiny serializable function in the same isolated world.
(globalThis as Record<string, unknown>)[EXTRACT_GLOBAL_KEY] = extractPolicyText;
