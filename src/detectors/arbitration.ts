import type { Detector } from './types';
import { findMatches } from './patterns';

const POSITIVE = [
  /\b(?:binding|mandatory|final)\s+arbitration\b/i,
  /\b(?:resolved?|settled?|decided)\b[^]{0,60}?\b(?:through|by|via|in)\s+(?:individual\s+)?arbitration\b/i,
  /\barbitration\s+(?:agreement|clause|provision)\b/i,
  /\bsubmit\b[^]{0,60}?\bto\s+arbitration\b/i,
  /\bwaiv(?:e|er|ing)\b[^]{0,80}?\b(?:right|rights)\b[^]{0,80}?\b(?:court|jury|judge|sue)\b/i,
  // Arabic starter set — see SPEC.md.
  /تحكيم\s+ملزم|التحكيم\s+الملزم/,
  /(?:عن\s+طريق|من\s+خلال|باللجوء\s+إلى)\s+التحكيم/,
];

export const arbitration: Detector = {
  id: 'arbitration',
  category: 'arbitration',
  label: { en: 'Language about binding arbitration', ar: 'عبارات حول التحكيم الملزم' },
  severity: 'warning',
  detect(text) {
    return findMatches(text, 'arbitration', POSITIVE);
  },
};
