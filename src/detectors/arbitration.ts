import type { Detector } from './types';
import { findMatches } from './patterns';

const POSITIVE = [
  /\b(?:binding|mandatory|final)\s+arbitration\b/i,
  /\b(?:resolved?|settled?|decided)\b[^]{0,60}?\b(?:through|by|via|in)\s+(?:individual\s+)?arbitration\b/i,
  /\barbitration\s+(?:agreement|clause|provision)\b/i,
  /\bagreement\s+to\s+arbitrate\b/i,
  /\bsubmit\b[^]{0,60}?\bto\s+arbitration\b/i,
  /\bwaiv(?:e|er|ing)\b[^]{0,80}?\b(?:right|rights)\b[^]{0,80}?\b(?:court|jury|judge|sue)\b/i,
];

export const arbitration: Detector = {
  id: 'arbitration',
  category: 'arbitration',
  label: 'Language about binding arbitration',
  severity: 'warning',
  detect(text) {
    return findMatches(text, 'arbitration', POSITIVE);
  },
};
