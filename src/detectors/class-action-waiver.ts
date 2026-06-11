import type { Detector } from './types';
import { findMatches } from './patterns';

const POSITIVE = [
  /\bclass[\s-]action\s+waiver\b/i,
  /\bwaiv(?:e|er|ing)\b[^]{0,100}?\bclass\b/i,
  /\bclass\b[^]{0,60}?\bwaiv(?:e|er|ed|ing)\b/i,
  /\bnot\s+as\s+a\b[^]{0,40}?\b(?:plaintiff|class\s+member|member\s+of\s+a\s+class)\b/i,
  /\bno\s+(?:class|representative|collective)\s+(?:actions?|proceedings?|arbitrations?)\b/i,
  // "individual basis" only counts in a disputes context — policies use the
  // same phrase for innocent things ("requests are reviewed on an individual basis").
  // Window is wide (160) because real clauses ramble: "any Dispute ... may
  // only be pursued by you on an individual basis" (Discord ToS).
  /\b(?:claims?|disputes?|proceed(?:ings?)?|arbitrations?|actions?)\b[^]{0,160}?\bindividual\s+basis\b/i,
  /\bindividual\s+basis\b[^]{0,80}?\b(?:claims?|disputes?|class|collective|representative)\b/i,
  /\bclass\s+or\s+collective\s+actions?\b/i,
];

export const classActionWaiver: Detector = {
  id: 'class_action_waiver',
  category: 'class_action_waiver',
  label: 'Language about class-action waiver',
  severity: 'warning',
  detect(text) {
    return findMatches(text, 'class_action_waiver', POSITIVE);
  },
};
