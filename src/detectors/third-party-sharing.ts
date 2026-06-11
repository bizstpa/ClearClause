import type { Detector } from './types';
import { findMatches } from './patterns';

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
  /\b(?:don't|won't|doesn't|didn't)\s+(?:[a-z]+\s+){0,3}?(?:share|disclose|sell|transfer)\b/i,
  /\bnever\s+(?:[a-z]+\s+){0,2}?(?:share|disclose|sell)\b/i,
];

export const thirdPartySharing: Detector = {
  id: 'third_party_sharing',
  category: 'third_party_sharing',
  label: 'Language about sharing data with third parties',
  severity: 'caution',
  detect(text) {
    return findMatches(text, 'third_party_sharing', POSITIVE, NEGATION);
  },
};
