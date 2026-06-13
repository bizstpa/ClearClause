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
  // Criteria-based / GDPR-style retention names factors but no actual period,
  // so it is the concern just like vague language ("for different periods
  // depending on ...", "we consider the amount, nature, and sensitivity ...",
  // "the criteria used to determine our retention period ...").
  /\bfor\s+(?:different|differing|varying|various)\s+(?:periods?|lengths?\s+of\s+time|amounts?\s+of\s+time)\b/i,
  /\bdepend(?:s|ing)?\s+on\s+(?:what|how|the\s+(?:type|nature|purpose|amount|sensitivity))\b/i,
  /\bcriteria\s+(?:used\s+)?(?:to\s+determine|for\s+determining|we\s+use)\b/i,
  /\b(?:consider|take\s+into\s+account)\b[^]{0,60}?\b(?:amount|nature|sensitivity)\b[^]{0,60}?\b(?:information|data|personal)\b/i,
  /\bfactors?\b[^]{0,50}?\b(?:affect|determine|influence)\b[^]{0,40}?\bretention\b/i,
];

// Word-numbers that introduce a spelled-out duration ("one year", "six months").
const WORDNUM =
  'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|' +
  'thirteen|fourteen|fifteen|eighteen|twenty|twenty-four|thirty|sixty|ninety';

// A specific period is informative — the contrast with vague language is the
// point of this detector.
const SPECIFIC = [
  /\b\w+\s+\(\d+\)\s+(?:day|week|month|year)s?\b/i, // "twelve (12) months"
  /\b\d+\s+\([a-z]+\)\s+(?:day|week|month|year)s?\b/i, // reversed: "30 (thirty) days"
  /\b\d+\s+(?:day|week|month|year)s?\b/i,
  new RegExp(`\\b(?:${WORDNUM})\\s+(?:day|week|month|year)s?\\b`, 'i'), // "one year"
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
