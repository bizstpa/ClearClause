import type { Detector, Match } from './types';
import { segmentSentences } from './segment';

// Every retention match requires a retention verb in the sentence, so that
// e.g. the CCPA lookback "in the preceding twelve (12) months, we sold ..."
// is not mistaken for a retention period.
const CONTEXT = /\b(?:retain\w*|retention|keep\w*|kept|stor\w+|delet\w+|preserve\w*|maintain\w*|hold|held)\b/i;

// Vague or indefinite retention is the concern.
const VAGUE = [
  /\bas\s+long\s+as\s+(?:necessary|needed|required|reasonably)\b/i,
  /\bduration\s+of\s+(?:our|your|the)\s+relationship\b/i,
  /\breasonable\s+(?:period|time|amount\s+of\s+time)\b/i,
  /\bindefinite(?:ly)?\b/i,
  /\bfor\s+as\s+long\s+as\b/i,
  /\buntil\s+(?:it\s+is\s+)?no\s+longer\s+(?:needed|necessary|required)\b/i,
  /\bas\s+(?:required|permitted)\s+by\s+(?:applicable\s+)?law\b/i,
  /\b(?:business|legal|operational)\s+(?:purposes?|needs?|requirements?|obligations?)\b/i,
];

// A specific period is informative — the contrast with vague language is the
// point of this detector.
const SPECIFIC = [
  /\b\w+\s+\(\d+\)\s+(?:day|week|month|year)s?\b/i, // "twelve (12) months"
  /\b\d+\s+(?:day|week|month|year)s?\b/i,
  /\b(?:thirty|sixty|ninety)\s+(?:day|week|month|year)s?\b/i,
];

export const retention: Detector = {
  id: 'retention',
  category: 'retention',
  label: 'Language about data retention',
  severity: 'caution',
  detect(text) {
    const matches: Match[] = [];
    for (const { sentence, index } of segmentSentences(text)) {
      if (!CONTEXT.test(sentence)) continue;
      if (VAGUE.some((p) => p.test(sentence))) {
        matches.push({ detectorId: 'retention', sentence, index, severity: 'caution' });
      } else if (SPECIFIC.some((p) => p.test(sentence))) {
        matches.push({ detectorId: 'retention', sentence, index, severity: 'info' });
      }
    }
    return matches;
  },
};
