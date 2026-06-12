import type { Detector, Match } from './types';
import { segmentSentences } from './segment';

// CCPA sections scare-quote the statutory term ('sale', "sell", “sharing”),
// and quotes around a keyword must not hide it from the patterns. Quotes
// wrapping a single word are stripped from a matching copy of the sentence;
// the verbatim sentence is what the match quotes. Apostrophes inside
// contractions ("don't", "don’t") and possessives are left alone.
const normalize = (s: string) =>
  s.replace(/["“‘']([A-Za-z][A-Za-z-]{0,25})["”’']/g, '$1');

// Sentences whose SUBJECT is the user exercising rights over sale/sharing
// ("you have a right to request …", "Exercising the right to opt-out …").
// They mention selling but are not the company asserting a sale, so they are
// excluded before any positive pattern runs. The split is by subject — the
// company asserting/doing surfaces as a finding; the user's rights regarding
// sale do not — rather than by keyword proximity, which both missed long
// rights sentences and could not tell the two apart.
const RIGHTS = [
  /^(?:exercising\s+)?(?:the\s+|your\s+)?right\s+to\b/i,
  /\b(?:you|consumers?|residents?|users?)\s+(?:also\s+)?ha(?:ve|s)\s+(?:a|the|certain)\s+right\b/i,
  /\b(?:you|consumers?|residents?|users?)\s+(?:may|can|could|are\s+entitled\s+to)\s+(?:request|direct|ask|opt|object|choose|submit)\b/i,
  /\bopt(?:ing)?[- ]?out\s+(?:of|from)\s+(?:the\s+)?(?:sale|selling|sharing)\b/i,
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
  /\bwe\s+(?:may\s+)?ha(?:ve|d)\s+sold\b/i,
  /\bsold\s+the\s+following\s+categories\b/i,
];

// A full denial that itself contains consideration language ("we do not sell
// ... in exchange for any consideration") is still a denial — unless the
// sentence pivots ("; however, we may allow ..."), in which case the second
// half is the sale and the sentence stays flagged.
const STRONG_NEGATION = /\bnot\s+(?:[a-z]+\s+){0,3}?sell\b[^]{0,80}?\bin\s+exchange\s+for\b[^]{0,60}?\bconsideration\b/i;
const CONTRAST = /\b(?:however|but|although|though|except|nevertheless|nonetheless)\b[,;:]?\s/i;

const POSITIVE = [
  // "sell/sold/sale ... personal data / your information / user data"
  /\b(?:sell|sells|selling|sold)\b[^]{0,80}?\b(?:personal|your|user|customer|consumer)\b[^]{0,30}?\b(?:data|information)\b/i,
  /\bsale\s+of\b[^]{0,40}?\b(?:personal|your|user|customer|consumer)\b[^]{0,30}?\b(?:data|information)\b/i,
  /\b(?:personal|your|user)\b[^]{0,30}?\b(?:data|information)\b[^]{0,60}?\b(?:is|are|may be|will be|can be)\s+sold\b/i,
  // CCPA/state-law phrasing: 'may be considered a data "sale" ... as defined
  // under the CCPA'. The definitional clause runs long ("or 'sharing' (for
  // behavioral advertising) as those terms are defined under ..."), so the
  // window to the law-word is generous.
  /\b(?:considered|constitutes?|deemed)\b[^]{0,20}?\b(?:selling|sale|sold|sell)\b[^]{0,120}?\b(?:law|laws|ccpa|cpra)\b/i,
  // Disclosure-table phrasing: 'Personal Information ... disclosed, and/or "sold"'.
  /\bpersonal\s+(?:data|information)\b[^]{0,120}?\b(?:sold|selling)\b/i,
  /\b(?:sold|sell|selling)\b\s+(?:and\/or|and|or)\s+(?:shared|sharing|share)\b/i,
];

// A sentence matching any of these is a no-sale statement (or otherwise not a
// sale assertion) and must never be flagged as a plain sale. SPEC.md, data_sale.
const NEGATION = [
  /\b(?:do|does|did|will|shall|would)\s+not\s+(?:[a-z]+\s+){0,3}?sell\b/i,
  /\b(?:don't|won't|doesn't|didn't|don’t|won’t|doesn’t|didn’t)\s+(?:[a-z]+\s+){0,3}?sell\b/i,
  /\bnever\s+(?:[a-z]+\s+){0,2}?(?:sell|sold)\b/i,
  /\bnot\s+to\s+sell\b/i,
  /\bwithout\s+selling\b/i,
  /\bno\s+sale\s+of\b/i,
  /\b(?:is|are|was|were)\s+not\s+(?:[a-z]+\s+){0,2}?sold\b/i,
  // Selling the business, not the data: "sell or transfer all or a portion
  // of our business or assets" belongs to third_party_sharing.
  /\bsell\s+or\s+transfer\b[^]{0,80}?\b(?:business|assets)\b/i,
];

// The deny-then-admit construction: "we do not transfer your data in exchange
// for payment, but we may provide your data to third-party partners ...".
// The denial is qualified — no *paid* transfer — and the clause after the
// contrastive discloses an unpaid provision, which is exactly the
// non-monetary-consideration shape CCPA treats as a sale. A qualified denial
// followed by a contrastive must not veto the disclosure that follows it.
const QUALIFIED_DENIAL = /\b(?:do|does|did|will|shall|would)\s+not\s+(?:[a-z]+\s+){0,2}?(?:sell|transfer|provide|disclose|share)\b[^]{0,80}?\bin\s+exchange\s+for\b[^]{0,40}?\b(?:payment|money|monetary|compensation|consideration)\b/i;
const DISCLOSURE = /\b(?:provide|share|disclose|give|allow|transfer|sell)\b[^]{0,100}?\b(?:data|information)\b/i;
const TAIL_NEGATED = /\b(?:do|does|did|will|would|shall)\s+not\b|\bnever\b/i;

function isSaleAssertion(s: string): boolean {
  const strongNegated = STRONG_NEGATION.test(s) && !CONTRAST.test(s);
  if (STRONG.some((p) => p.test(s)) && !strongNegated) return true;
  if (POSITIVE.some((p) => p.test(s)) && !NEGATION.some((p) => p.test(s))) return true;

  // Contrastive negation: a denial followed by "but"/"however" only denies
  // the clause before the pivot. Evaluate the clause after it on its own.
  const contrast = CONTRAST.exec(s);
  if (contrast) {
    const head = s.slice(0, contrast.index);
    const tail = s.slice(contrast.index + contrast[0].length);
    const denied = NEGATION.some((p) => p.test(head)) || QUALIFIED_DENIAL.test(head);
    if (denied && !TAIL_NEGATED.test(tail)) {
      if (POSITIVE.some((p) => p.test(tail)) || STRONG.some((p) => p.test(tail))) return true;
      if (QUALIFIED_DENIAL.test(head) && DISCLOSURE.test(tail)) return true;
    }
  }
  return false;
}

export const dataSale: Detector = {
  id: 'data_sale',
  category: 'data_sale',
  label: 'Language about selling data',
  severity: 'warning',
  detect(text) {
    const matches: Match[] = [];
    for (const { sentence, index } of segmentSentences(text)) {
      const s = normalize(sentence);
      if (RIGHTS.some((p) => p.test(s))) continue;
      if (isSaleAssertion(s)) {
        matches.push({ detectorId: 'data_sale', sentence, index });
      }
    }
    return matches;
  },
};
