// Fetch a policy page, extract its readable text, and write it to
// corpus/local/<name>.txt (gitignored — fetched full text is never
// committed). A convenience for the tuning workflow in corpus/README.md;
// the analyzer itself still makes zero network calls during analysis.
//
// Extraction is deliberately simple (no headless browser, no dependencies):
// JavaScript-rendered and bot-protected pages are expected to fail, and when
// they do this script says so loudly instead of writing junk — manual paste
// remains the fallback.
//
// Usage: npm run fetch -- <url> [name]
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const localDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'corpus', 'local');

// Below this many characters of extracted text, the page is assumed to be a
// JS shell, a bot-block interstitial, or otherwise not a policy document.
const MIN_TEXT_LENGTH = 2000;

const BLOCK_MARKERS = [
  'enable javascript',
  'javascript is required',
  'javascript is disabled',
  'access denied',
  'captcha',
  'are you a robot',
  'verify you are human',
  'attention required',
  'request blocked',
];

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  copy: '©',
  reg: '®',
  trade: '™',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

function extractText(html: string): string {
  let s = html
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg|iframe|head)\b[^]*?<\/\1\s*>/gi, ' ');

  // Prefer the page's main content region when one is declared; nav,
  // header, footer, and sidebars are boilerplate either way.
  const main =
    s.match(/<main\b[^]*?<\/main\s*>/i) ??
    s.match(/<article\b[^]*?<\/article\s*>/i) ??
    s.match(/<[a-z]+\b[^>]*\brole=["']?main["']?[^>]*>[^]*/i);
  if (main) s = main[0];
  s = s.replace(/<(nav|header|footer|aside|form|button|select)\b[^]*?<\/\1\s*>/gi, ' ');

  // Block-level boundaries become line breaks so list items, headings, and
  // table cells stay separate sentences for the segmenter.
  s = s
    .replace(/<(?:br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/?(?:p|div|li|ul|ol|h[1-6]|tr|td|th|table|section|blockquote|dt|dd|dl|figure|summary|details)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  return decodeEntities(s)
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function fail(message: string): never {
  console.error(`\nExtraction failed: ${message}`);
  console.error('Nothing was written. Paste the policy text manually into corpus/local/<name>.txt instead.');
  process.exit(1);
}

const [url, nameArg] = process.argv.slice(2);
if (!url || !/^https?:\/\//i.test(url)) {
  console.error('Usage: npm run fetch -- <url> [name]');
  process.exit(1);
}

const name = (nameArg ?? new URL(url).hostname.replace(/^www\./, '').split('.')[0])
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-')
  .replace(/^-+|-+$/g, '');
if (!name) fail('could not derive a file name; pass one explicitly: npm run fetch -- <url> <name>');

console.log(`Fetching ${url} ...`);
let html: string;
try {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) fail(`server responded ${res.status} ${res.statusText} (likely a bot-block)`);
  html = await res.text();
} catch (err) {
  fail(`request failed (${err instanceof Error ? err.message : String(err)})`);
}

const text = extractText(html);
const lower = text.slice(0, 4000).toLowerCase();
const marker = BLOCK_MARKERS.find((m) => lower.includes(m));

if (text.length < MIN_TEXT_LENGTH) {
  fail(
    `only ${text.length} characters of readable text extracted — the page is likely JavaScript-rendered or bot-protected`,
  );
}
if (marker && text.length < 8000) {
  fail(`the page looks like a bot-block / JS shell (found "${marker}")`);
}

const outPath = join(localDir, `${name}.txt`);
writeFileSync(outPath, `${text}\n`);
console.log(`Wrote ${text.length} characters to corpus/local/${name}.txt (gitignored).`);
console.log('Skim the file to confirm it is actually the policy text, then run: npm run eval');
