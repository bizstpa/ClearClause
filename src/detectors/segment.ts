export interface SentenceSpan {
  sentence: string; // trimmed sentence text, verbatim otherwise
  index: number; // character offset of the sentence start in the source text
}

// Tokens that end with a period without ending a sentence. Compared
// lowercase, with the trailing period already stripped, so "U.S." is
// looked up as "u.s" and "Inc." as "inc".
const ABBREVIATIONS = new Set([
  'u.s',
  'u.k',
  'e.g',
  'i.e',
  'etc',
  'inc',
  'ltd',
  'llc',
  'co',
  'corp',
  'mr',
  'mrs',
  'ms',
  'dr',
  'no',
  'vs',
  'st',
  'jr',
  'sr',
  'art',
  'sec',
  'para',
]);

const TERMINATORS = '.!?';

// Leading list markers ("•", "- ", "1.", "(a)") are layout, not sentence
// text; they are skipped so quotes start at the words and a numbered
// marker's period is never mistaken for a sentence end.
const LIST_MARKER = /^[^\S\n]*(?:[•◦▪‣·]|[-–—*]|\(?\d{1,3}[.)])\s+/;

export function segmentSentences(text: string): SentenceSpan[] {
  // Line breaks are hard sentence boundaries. List items, table cells, and
  // headings in real policies often carry no terminal punctuation, so once
  // flattened to plain text they would otherwise merge into one giant
  // "sentence". A matched unit should read as one line, not a section.
  const spans: SentenceSpan[] = [];
  let lineStart = 0;
  for (let i = 0; i <= text.length; i++) {
    if (i < text.length && text[i] !== '\n') continue;
    const line = text.slice(lineStart, i);
    const marker = line.match(LIST_MARKER);
    const offset = lineStart + (marker ? marker[0].length : 0);
    for (const span of segmentBlock(marker ? line.slice(marker[0].length) : line)) {
      spans.push({ sentence: span.sentence, index: span.index + offset });
    }
    lineStart = i + 1;
  }
  return spans;
}

function segmentBlock(text: string): SentenceSpan[] {
  const spans: SentenceSpan[] = [];
  let start = 0;

  const push = (rawStart: number, rawEnd: number) => {
    const raw = text.slice(rawStart, rawEnd);
    const sentence = raw.trim();
    if (sentence) {
      spans.push({ sentence, index: rawStart + (raw.length - raw.trimStart().length) });
    }
  };

  for (let i = 0; i < text.length; i++) {
    if (!TERMINATORS.includes(text[i])) continue;
    if (text[i] === '.' && isFalseBreak(text, i)) continue;

    // Consume runs of terminators ("...", "?!") and trailing close-quotes.
    let end = i + 1;
    while (end < text.length && (TERMINATORS.includes(text[end]) || '"”’)'.includes(text[end]))) {
      end++;
    }
    push(start, end);
    i = end - 1;
    start = end;
  }
  push(start, text.length);

  return spans;
}

/** A period that does not end a sentence: abbreviation, initial, or decimal. */
function isFalseBreak(text: string, dotIndex: number): boolean {
  const prev = text[dotIndex - 1];
  const next = text[dotIndex + 1];

  // Decimal number: "2.5"
  if (/\d/.test(prev ?? '') && /\d/.test(next ?? '')) return true;

  // Word immediately before the dot (may itself contain dots: "U.S").
  let wordStart = dotIndex;
  while (wordStart > 0 && /[A-Za-z.]/.test(text[wordStart - 1])) wordStart--;
  const word = text.slice(wordStart, dotIndex).replace(/\.+$/, '');

  if (word.length === 1) return true; // initials and the inner dots of "e.g."
  if (ABBREVIATIONS.has(word.toLowerCase())) return true;

  // A following lowercase word means the sentence continues ("etc. and so on").
  const after = text.slice(dotIndex + 1).match(/^\s*([a-z])/);
  return after !== null;
}
