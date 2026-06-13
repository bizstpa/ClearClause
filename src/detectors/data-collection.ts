import type { Detector, Match } from './types';
import { segmentSentences } from './segment';

// High-severity categories: the items someone installs this tool to find.
// These match without requiring a collect-verb, because in real policies they
// usually appear as bare list lines ("Biometric information").
const SENSITIVE = [
  /\bsocial\s+security\s+number/i,
  /\bSSN\b/,
  /\bdriver'?s?\s+licen[cs]e/i,
  /\bpassport\b/i,
  /\b(?:financial|bank)\s+(?:account|information)\b/i,
  /\b(?:credit|debit)\s+card\b/i,
  /\bmedical\s+(?:information|records?|history|conditions?)\b/i,
  /\bhealth\s+(?:information|data|records?|insurance)\b/i,
  /\bprotected\s+classifications?\b/i,
  /\b(?:race|ethnicity|national\s+origin|sexual\s+orientation|religious\s+beliefs?)\b/i,
  /\bbiometric\b/i,
  /\bsensory\s+(?:data|information)\b/i,
  /\b(?:fingerprints?|faceprints?|voiceprints?)\b/i,
  /\bprecise\s+(?:geo)?location\b/i,
  /\bgeolocation\b/i,
  /\b(?:location|position)\b[^]{0,80}?\b(?:gps|bluetooth|wi-?fi|cell\s+tower)\b/i,
  /\b(?:gps|bluetooth|wi-?fi)\b[^]{0,60}?\b(?:location|geolocation|tracking)\b/i,
  /\bsession[- ]replay\b/i,
  /\bkeystrokes?\b/i,
  /\bmouse\s+movements?\b/i,
  /\bscreen\s+recordings?\b/i,
  /\binferences?\s+(?:drawn|about|regarding)\b/i,
  /\b(?:create|build|develop)\b[^]{0,40}?\ba?\s*profile\s+(?:about|of|reflecting)\b/i,
  /\bprofiling\b/i,
];

// A denial of collection or use must not be reported as collection — and
// especially not at warning severity. Google's "we don't show you personalized
// ads based on sensitive categories, such as race, religion ..." names
// sensitive categories only to say it does NOT act on them. The veto is
// verb-specific (a negated collect/use/show/...) so an affirmative collection
// sentence that merely contains the word "not" elsewhere still flags.
const NEGATED = [
  /\b(?:do|does|did|will|would|shall)\s+not\s+(?:[a-z]+\s+){0,3}?(?:collect|use|sell|share|show|display|process|retain|store|disclose|require|request|ask)\b/i,
  /\b(?:don't|doesn't|didn't|won't|don’t|doesn’t|didn’t|won’t)\s+(?:[a-z]+\s+){0,3}?(?:collect|use|sell|share|show|display|process|retain|store|disclose|require|request|ask)\b/i,
  /\bnever\s+(?:[a-z]+\s+){0,2}?(?:collect|use|sell|share|show|display|process|store)\b/i,
];

// Ordinary categories: only flagged inside a collection context, because
// words like "name" or "email" appear everywhere.
const ORDINARY = [
  /\bcollect\w*\b[^]{0,160}?\b(?:name|alias|email|phone|postal\s+address|address|date\s+of\s+birth|identifiers?|device|ip\s+address|browsing|search\s+history|usage|cookies?|contacts?|payment|account|purchase)\b/i,
  /\bcategories\s+of\s+personal\s+(?:information|data)\b/i,
  /\bidentifiers\s+such\s+as\b/i,
  /\binformation\s+(?:we|you)\s+(?:collect|provide)\b/i,
  /\b(?:personal|your)\s+(?:data|information)\b[^]{0,60}?\b(?:is|are|will\s+be)\s+collected\b/i,
];

export const dataCollection: Detector = {
  id: 'data_collection',
  category: 'data_collection',
  label: 'Categories of data collected',
  severity: 'info',
  detect(text) {
    const matches: Match[] = [];
    for (const { sentence, index } of segmentSentences(text)) {
      if (NEGATED.some((p) => p.test(sentence))) continue;
      if (SENSITIVE.some((p) => p.test(sentence))) {
        matches.push({ detectorId: 'data_collection', sentence, index, severity: 'warning' });
      } else if (ORDINARY.some((p) => p.test(sentence))) {
        matches.push({ detectorId: 'data_collection', sentence, index, severity: 'info' });
      }
    }
    // Sensitive items first — they are the reason someone runs this tool.
    return matches.sort((a, b) => Number(b.severity === 'warning') - Number(a.severity === 'warning'));
  },
};
