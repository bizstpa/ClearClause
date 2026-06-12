import type { Detector, Match } from './types';
import { segmentSentences } from './segment';

const POSITIVE = [
  // share/disclose verb + a recipient category in the same sentence
  /\b(?:share|shares|shared|sharing|disclose|discloses|disclosed|disclosure|provide|provided)\b[^]{0,120}?\b(?:third[- ]part(?:y|ies)|affiliates?|subsidiaries|service\s+providers?|business\s+partners?|advertis\w+|analytics\s+providers?|social\s+networks?|government\s+(?:entities|agencies|authorities)|data\s+brokers?|vendors?|contractors?)\b/i,
  /\b(?:third[- ]part(?:y|ies)|affiliates?|service\s+providers?|partners?)\b[^]{0,80}?\b(?:receive|receives|access|collect|obtain)\b[^]{0,60}?\b(?:personal|your|user)\b[^]{0,30}?\b(?:data|information)\b/i,
  // Standalone recipient lines from categories-of-recipients lists — after
  // line-break segmentation these carry no verb at all.
  /^(?:advertising\s+networks?|internet\s+service\s+providers?|data\s+analytics\s+providers?|social\s+(?:networks?|media(?:\s+platforms)?)|government\s+entities|data\s+brokers?|operating\s+systems(?:\s+and\s+platforms)?)\.?$/i,
  // Business transfer: assets and customer data change hands together.
  /\bsell\s+or\s+transfer\b[^]{0,80}?\b(?:business|assets)\b/i,
  /\bin\s+the\s+event\s+of\b[^]{0,80}?\b(?:merger|acquisition|bankruptcy|reorganization|sale\s+of\s+(?:our\s+)?assets)\b/i,
  /\b(?:merger|acquisition|bankruptcy|reorganization)\b[^]{0,100}?\b(?:personal|your)\b[^]{0,30}?\b(?:data|information)\b[^]{0,60}?\btransferr?\w*\b/i,
  // Cross-border transfer.
  /\b(?:transferr?\w*|process\w*|stor\w+)\b[^]{0,100}?\b(?:outside|abroad|other\s+countries|across\s+borders|internationally|cross[- ]border)\b/i,
  /\bcountries\s+other\s+than\b/i,
  /\btransferred\s+to\b[^]{0,60}?\bunited\s+states\b/i,
];

const NEGATION = [
  /\b(?:do|does|did|will|shall|would)\s+not\s+(?:[a-z]+\s+){0,3}?(?:share|disclose|sell|transfer)\b/i,
  /\b(?:don't|won't|doesn't|didn't|don’t|won’t|doesn’t|didn’t)\s+(?:[a-z]+\s+){0,3}?(?:share|disclose|sell|transfer)\b/i,
  /\bnever\s+(?:[a-z]+\s+){0,2}?(?:share|disclose|sell)\b/i,
];

// A denial followed by an exception carve-out is not a denial — the carve-out
// IS the disclosure ("we do not share ... except in the following cases").
// Same contrastive-negation idea as data-sale.ts, split in two because the
// introducers behave differently:
//  - except/unless/other-than introduce exceptions to the denial itself, so
//    their mere presence after the denial means sharing happens in some cases;
//  - but/however/although start a new clause that only counts if it
//    independently asserts sharing.
// A flat denial with neither stays suppressed.
const EXCEPTION = /\b(?:except|unless|other\s+than)\b/i;
const CONTRAST = /\b(?:however|but|although|though|nevertheless|nonetheless)\b[,;:]?\s/i;

// The denial must be about disclosing data (not e.g. "we do not share office
// space") for its exception carve-out to count as a data disclosure.
const DENIED_DATA_SHARING =
  /\bnot\s+(?:[a-z]+\s+){0,3}?(?:share|disclose|sell|transfer)\b[^]{0,80}?\b(?:personal|your|user)\b[^]{0,40}?\b(?:data|information)\b|\bnever\s+(?:[a-z]+\s+){0,2}?(?:share|disclose|sell)\b[^]{0,80}?\b(?:personal|your|user)\b[^]{0,40}?\b(?:data|information)\b/i;

function firstNegation(s: string): RegExpExecArray | null {
  let earliest: RegExpExecArray | null = null;
  for (const p of NEGATION) {
    const m = p.exec(s);
    if (m && (!earliest || m.index < earliest.index)) earliest = m;
  }
  return earliest;
}

function isSharingDisclosure(s: string): boolean {
  const negation = firstNegation(s);
  if (!negation) return POSITIVE.some((p) => p.test(s));

  const tail = s.slice(negation.index + negation[0].length);
  if (EXCEPTION.test(tail)) {
    return DENIED_DATA_SHARING.test(s) || POSITIVE.some((p) => p.test(s));
  }
  const contrast = CONTRAST.exec(tail);
  if (contrast) {
    return POSITIVE.some((p) => p.test(tail.slice(contrast.index + contrast[0].length)));
  }
  return false;
}

export const thirdPartySharing: Detector = {
  id: 'third_party_sharing',
  category: 'third_party_sharing',
  label: 'Language about sharing data with third parties',
  severity: 'caution',
  detect(text) {
    const matches: Match[] = [];
    for (const { sentence, index } of segmentSentences(text)) {
      if (isSharingDisclosure(sentence)) {
        matches.push({ detectorId: 'third_party_sharing', sentence, index });
      }
    }
    return matches;
  },
};
