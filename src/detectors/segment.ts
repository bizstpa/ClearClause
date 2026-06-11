export type Lang = 'en' | 'ar';

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

const TERMINATORS_EN = '.!?';
// Arabic question mark, Arabic-script full stop, plus Latin terminators
// (Arabic policies routinely use the Latin period). '؛' (semicolon) is
// treated as a soft separator so detector quotes stay short.
const TERMINATORS_AR = '.!؟۔؛';

/**
 * Crude language sniff used by detectors, which receive plain text with no
 * language tag: whichever script dominates wins.
 */
export function detectLang(text: string): Lang {
  const arabic = (text.match(/[؀-ۿ]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return arabic > latin ? 'ar' : 'en';
}

export function segmentSentences(text: string, lang: Lang): SentenceSpan[] {
  // SEAM(ar): Arabic gets only this starter pass for V1 — terminator
  // characters differ, but there is no diacritic normalization, no '،'
  // soft-separator handling, and no Arabic abbreviation list yet.
  // See SPEC.md "Sentence segmentation" before extending.
  const terminators = lang === 'ar' ? TERMINATORS_AR : TERMINATORS_EN;
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
    if (!terminators.includes(text[i])) continue;
    if (lang === 'en' && text[i] === '.' && isFalseBreak(text, i)) continue;

    // Consume runs of terminators ("...", "?!") and trailing close-quotes.
    let end = i + 1;
    while (end < text.length && (terminators.includes(text[end]) || '"”’)'.includes(text[end]))) {
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
