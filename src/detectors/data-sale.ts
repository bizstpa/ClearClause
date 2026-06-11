import type { Detector } from './types';
import { findMatches } from './patterns';

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
// sale assertion) and must never be flagged as a sale. SPEC.md, data_sale.
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
    return findMatches(text, 'data_sale', POSITIVE, NEGATION);
  },
};
