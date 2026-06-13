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

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const DOCUMENT_NODE = 9;

const HEADING_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

// Block-level elements whose boundaries become line breaks, so list items,
// table cells, and paragraphs stay separate lines for the segmenter rather
// than merging into one run-on string (newlines are hard sentence boundaries).
const BLOCK_TAGS = new Set([
  'P', 'DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'ASIDE', 'MAIN',
  'UL', 'OL', 'LI', 'DL', 'DT', 'DD',
  'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH',
  'BLOCKQUOTE', 'PRE', 'FIGURE', 'FIGCAPTION', 'BR', 'HR',
]);

/** A heading element or ARIA heading — structure, not an analyzable sentence. */
function isHeading(el: Element): boolean {
  return HEADING_TAGS.has(el.tagName) || el.getAttribute('role') === 'heading';
}

function collectText(node: Node, out: string[]): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === TEXT_NODE) {
      out.push(child.textContent ?? '');
      continue;
    }
    if (child.nodeType !== ELEMENT_NODE) continue;
    const el = child as Element;
    // Headings are structure, not statements: a bare "Information You Provide
    // Us" with no disclosure shouldn't reach the engine as an analyzable line.
    if (isHeading(el)) continue;
    const block = BLOCK_TAGS.has(el.tagName);
    if (block) out.push('\n');
    collectText(el, out);
    if (block) out.push('\n');
  }
}

/** Roughly the longest a visual subheader runs before it reads as prose. */
const MAX_HEADING_LENGTH = 60;

/** A line ending in sentence punctuation is a statement, not a bare label. */
const ENDS_A_SENTENCE = /[.?!]$/;

/**
 * Drop visual subheaders that carry no heading markup. Some pages style a
 * recurring label (e.g. Reddit's "Information You Provide Us") as an ordinary
 * `<p>` rather than an `h1`–`h6`/ARIA heading, so `isHeading` can't catch it and
 * the engine flags it once per section. A line is treated as such a heading only
 * when all three hold: it is short, ends with no sentence punctuation, and recurs
 * in the document. Conservative on purpose — a one-off short line, or a short
 * line ending in a period, may be real content and is kept.
 */
function stripRecurringHeadings(lines: string[]): string[] {
  const counts = new Map<string, number>();
  for (const line of lines) counts.set(line, (counts.get(line) ?? 0) + 1);

  return lines.filter((line) => {
    const looksLikeHeading =
      line.length < MAX_HEADING_LENGTH &&
      !ENDS_A_SENTENCE.test(line) &&
      (counts.get(line) ?? 0) >= 2;
    return !looksLikeHeading;
  });
}

/** A continuation fragment opens with a lowercase letter; a new heading or
 * sentence opens with a capital, digit, or bullet. */
const STARTS_CONTINUATION = /^[a-z]/;

/** A line that already closes a clause shouldn't absorb the next line. A colon
 * is included alongside `.?!` so a list lead-in ("We collect:") keeps its items
 * separate rather than swallowing them into a run-on. */
const ENDS_A_CLAUSE = /[.?!:]$/;

/**
 * Rejoin a sentence severed across block boundaries. Converting block edges to
 * line breaks splits one sentence into fragments when it spans nested or inline
 * blocks — e.g. Reddit's "...we may record a session replay of" / "your activity
 * on our services", which then displays as a truncated match. A line that does
 * not end in clause-ending punctuation is merged with the following line only
 * when that line opens with a lowercase letter, a strong signal it continues the
 * same clause; a new heading or sentence opens with a capital and is left split.
 * Conservative on purpose — capitalized continuations stay separate rather than
 * risk fusing genuinely distinct sentences or pulling a heading into the prose
 * above it. Merges chain, so a sentence broken into three blocks reassembles.
 */
function rejoinSeveredSentences(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const prev = out[out.length - 1];
    if (prev !== undefined && !ENDS_A_CLAUSE.test(prev) && STARTS_CONTINUATION.test(line)) {
      out[out.length - 1] = `${prev} ${line}`;
    } else {
      out.push(line);
    }
  }
  return out;
}

/**
 * Flatten an extracted-content root to analyzable text. Block elements become
 * line breaks so the segmenter sees real sentence boundaries, and heading
 * elements (`h1`–`h6`, `role="heading"`) are dropped entirely — a lone heading
 * is page structure, not a sentence to analyze. Recurring punctuation-less short
 * blocks are dropped too, catching visual subheaders that lack heading markup.
 * Finally, sentences severed mid-clause across block edges are stitched back so
 * matches display whole. Body paragraphs are untouched.
 */
export function extractAnalyzableText(root: Element): string {
  const out: string[] = [];
  collectText(root, out);
  const lines = out
    .join('')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);
  return rejoinSeveredSentences(stripRecurringHeadings(lines)).join('\n');
}

/** Resolve the owning document for either a Document or an Element root. */
function ownerDocumentOf(root: Document | Element): Document {
  return root.nodeType === DOCUMENT_NODE ? (root as Document) : (root as Element).ownerDocument!;
}

/**
 * An anchor that jumps within the current page rather than navigating away:
 * an explicit fragment (`href="#section"`) or a link back to the same path.
 * These are the building blocks of a table-of-contents / jump-link list.
 */
function isInPageLink(a: Element, doc: Document): boolean {
  const href = a.getAttribute('href');
  if (!href) return false;
  if (href.startsWith('#')) return true;
  try {
    const base = doc.location?.href || doc.baseURI || 'http://localhost/';
    const target = new URL(href, base);
    const here = new URL(base);
    return target.origin === here.origin && target.pathname === here.pathname;
  } catch {
    return false;
  }
}

/**
 * Whether a list is a jump-link contents list rather than real policy body.
 * Conservative on purpose — recall over precision on body text:
 *   - needs several links (a one- or two-link list is probably prose);
 *   - the links must be predominantly in-page (off-page links read as content);
 *   - link text must dominate the element's text (prose between links → keep).
 * Any of these failing leaves the list in place.
 */
function isJumpLinkList(list: Element, doc: Document): boolean {
  const links = Array.from(list.querySelectorAll('a'));
  if (links.length < 3) return false;

  const inPage = links.filter((a) => isInPageLink(a, doc)).length;
  if (inPage / links.length < 0.8) return false;

  const linkTextLen = links.reduce((n, a) => n + (a.textContent ?? '').trim().length, 0);
  const totalTextLen = (list.textContent ?? '').trim().length;
  return totalTextLen === 0 || linkTextLen / totalTextLen >= 0.7;
}

/**
 * Remove in-page navigation and tables-of-contents from a cloned page before
 * Readability scores it. Two shapes are dropped: semantic navigation (`<nav>`
 * and `role="navigation"` regions) and jump-link lists (a `<ul>`/`<ol>` of
 * mostly same-page anchor links). These are layout/wayfinding, not policy
 * statements; left in, the engine faithfully flags the contents-list entries.
 * Bias is toward keeping content — losing body text is worse than a stray link.
 */
export function stripInPageNavigation(root: Document | Element): void {
  for (const nav of Array.from(root.querySelectorAll('nav, [role="navigation"]'))) {
    nav.remove();
  }
  const doc = ownerDocumentOf(root);
  for (const list of Array.from(root.querySelectorAll('ul, ol'))) {
    if (isJumpLinkList(list, doc)) list.remove();
  }
}

/**
 * Collapse exact-duplicate lines, keeping the first occurrence. Some policies
 * render the same disclosure into more than one container (a visible copy plus
 * a print/SEO copy, repeated section intros), which doubles every flag the
 * engine reports. Mirrors the fetch helper's dedup: exact-block only, no fuzzy
 * matching.
 *
 * Long lines (>= 40 chars) collapse on first repeat. Short lines normally repeat
 * harmlessly (headings, table cells) and are left alone — but a short string
 * that recurs 3+ times verbatim is a structural label, not prose, so it too
 * collapses to a single instance. Collapsing (not deleting) means a genuinely
 * meaningful repeat still appears once.
 */
export function dedupeLines(text: string): string {
  const lines = text.split('\n');

  // Count occurrences up front so a short line repeated many times can be
  // recognized as a structural label even though it falls under the 40-char floor.
  const counts = new Map<string, number>();
  for (const line of lines) {
    const key = line.trim();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const seen = new Set<string>();
  return lines
    .filter((line) => {
      const key = line.trim();
      const collapsible = key.length >= 40 || (counts.get(key) ?? 0) >= 3;
      if (!collapsible) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join('\n');
}

export function extractPolicyText(): ExtractionResult {
  // Readability mutates the document it parses, so operate on a clone of the
  // live DOM. Because the page is already fully rendered in the user's browser,
  // JS-rendered and login-gated pages — which the old fetch helper couldn't
  // reach — are reachable here. Nav, footer, sidebar, and cookie-banner chrome
  // are dropped by Readability's scoring; in-page nav and contents lists that
  // survive that scoring are stripped first so they never reach the engine.
  // The recovered content is then walked block-by-block (rather than taking
  // Readability's flat textContent) so headings are dropped and block
  // boundaries become line breaks for the segmenter.
  const fallbackTitle = document.title || '';
  try {
    const docClone = document.cloneNode(true) as Document;
    stripInPageNavigation(docClone);
    const article = new Readability(docClone).parse();
    const title = article?.title?.trim() || fallbackTitle;
    const contentDoc = new DOMParser().parseFromString(article?.content ?? '', 'text/html');
    const text = dedupeLines(extractAnalyzableText(contentDoc.body));
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
