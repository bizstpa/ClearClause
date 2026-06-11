import type { Detector, Match } from './types';
import { segmentSentences } from './segment';

// Sentences about the user's RIGHTS regarding sale ("right to opt-out of the
// sale", "you may request ... information we sold"). They mention selling but
// are not the company asserting a sale; surfacing them dilutes the finding,
// so they are excluded before any positive pattern runs.
const RIGHTS = [
  /\bright\s+to\b[^]{0,80}?\b(?:opt[- ]?out|sale|sell|sold)\b/i,
  /\bopt(?:ing)?[- ]?out\s+of\s+(?:the\s+)?(?:sale|selling)\b/i,
  /\b(?:you|consumers?|residents?)\s+(?:may|can|have\s+the\s+right\s+to)\s+(?:request|direct|ask)\b/i,
  /\brequest\s+that\s+we\s+disclose\b/i,
  /\bdo\s+not\s+sell\s+my\b/i, // the "Do Not Sell My Personal Information" link
];

// Strong assertions of a sale that careful policies phrase without an
// affirmative sell-word: non-monetary consideration ("allow X to collect ...
// in exchange for ...") and past-sale disclosures ("we may have sold the
// following categories ..."). These are checked BEFORE the negation veto:
// "we do not sell ... for monetary compensation; however, we may allow ..."
// packs denial and sale into one sentence, and the denial must not hide it.
const STRONG = [
  /\ballow\b[^]{0,160}?\bcollect\b[^]{0,160}?\bin\s+exchange\s+for\b/i,
  /\bnon-?monetary\s+consideration\b/i,
  /\bin\s+exchange\s+for\b[^]{0,60}?\bconsideration\b/i,
  /\bwe\s+(?:may\s+)?ha(?:ve|d)\s+["“‘']*sold\b/i,
  /\bsold\s+the\s+following\s+categories\b/i,
];

// A full denial that itself contains consideration language ("we do not sell
// ... in exchange for any consideration") is still a denial — unless the
// sentence pivots ("; however, we may allow ..."), in which case the second
// half is the sale and the sentence stays flagged.
const STRONG_NEGATION = /\bnot\s+(?:[a-z]+\s+){0,3}?sell\b[^]{0,80}?\bin\s+exchange\s+for\b[^]{0,60}?\bconsideration\b/i;
const CONTRAST = /\b(?:however|but|although|though|except)\b/i;

const POSITIVE = [
  // "sell/sold/sale ... personal data / your information / user data"
  /\b(?:sell|sells|selling|sold)\b[^]{0,80}?\b(?:personal|your|user|customer|consumer)\b[^]{0,30}?\b(?:data|information)\b/i,
  /\bsale\s+of\b[^]{0,40}?\b(?:personal|your|user|customer|consumer)\b[^]{0,30}?\b(?:data|information)\b/i,
  /\b(?:personal|your|user)\b[^]{0,30}?\b(?:data|information)\b[^]{0,60}?\b(?:is|are|may be|will be|can be)\s+sold\b/i,
  // CCPA/state-law phrasing: 'could be considered "selling" / a "sale" under
  // ... privacy laws / the CCPA'. The sell-word is usually in scare quotes.
  /\b(?:considered|constitutes?|deemed)\b[^]{0,15}["“‘']*(?:selling|sale|sold|sell)\b["”’']*[^]{0,60}?\b(?:law|laws|ccpa|cpra)\b/i,
  // Disclosure-table phrasing: 'Personal Information ... disclosed, and/or "sold"'.
  /\bpersonal\s+(?:data|information)\b[^]{0,120}?\b(?:sold|selling)\b/i,
  /["“‘'](?:sold|sell|selling)["”’']\s+or\s+["“‘'](?:shared|sharing|share)["”’']/i,
];

// A sentence matching any of these is a no-sale statement (or otherwise not a
// sale assertion) and must never be flagged as a plain sale. SPEC.md, data_sale.
const NEGATION = [
  // The sell-word may sit in scare quotes: 'do not knowingly "sell"'.
  /\b(?:do|does|did|will|shall|would)\s+not\s+(?:[a-z]+\s+){0,3}?["“‘']*sell\b/i,
  /\b(?:don't|won't|doesn't|didn't)\s+(?:[a-z]+\s+){0,3}?["“‘']*sell\b/i,
  /\bnever\s+(?:[a-z]+\s+){0,2}?["“‘']*(?:sell|sold)\b/i,
  /\bnot\s+to\s+sell\b/i,
  /\bwithout\s+selling\b/i,
  /\bno\s+sale\s+of\b/i,
  /\b(?:is|are|was|were)\s+not\s+(?:[a-z]+\s+){0,2}?sold\b/i,
];

export const dataSale: Detector = {
  id: 'data_sale',
  category: 'data_sale',
  label: 'Language about selling data',
  severity: 'warning',
  detect(text) {
    const matches: Match[] = [];
    for (const { sentence, index } of segmentSentences(text)) {
      if (RIGHTS.some((p) => p.test(sentence))) continue;
      const strongNegated = STRONG_NEGATION.test(sentence) && !CONTRAST.test(sentence);
      const strong = STRONG.some((p) => p.test(sentence)) && !strongNegated;
      const plain =
        POSITIVE.some((p) => p.test(sentence)) && !NEGATION.some((p) => p.test(sentence));
      if (strong || plain) {
        matches.push({ detectorId: 'data_sale', sentence, index });
      }
    }
    return matches;
  },
};
