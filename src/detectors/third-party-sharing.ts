import type { Detector, Match } from './types';
import { segmentSentences } from './segment';

// Recipient categories policies name when disclosing data. One source string
// so the verb-recipient patterns below can match in either order.
const RECIPIENT = [
  'third[- ]part(?:y|ies)',
  'affiliates?',
  'affiliated\\s+(?:entities|companies)',
  'subsidiaries',
  'parent\\s+compan(?:y|ies)',
  'service\\s+providers?',
  'business\\s+partners?',
  'financial\\s+(?:institutions?|partners?)',
  'payment\\s+(?:networks?|processors?)',
  'advertis\\w+',
  'analytics\\s+providers?',
  'social\\s+networks?',
  'professional\\s+advis[oe]rs?',
  'member\\s+stations?',
  'government\\s+(?:entities|agencies)',
  'authorit(?:y|ies)',
  'data\\s+brokers?',
  'vendors?',
  'contractors?',
].join('|');

// "provide" is deliberately NOT in the general verb list: "services provided
// by eBay Inc. or its affiliates" is scope boilerplate (who runs the service),
// not disclosure. It earns a match only with a data object — see the dedicated
// pattern below ("provide your information to ...").
const SHARE_VERB =
  'share|shares|shared|sharing|disclose|discloses|disclosed|disclosure';

// Legal-process disclosure (product decision, V2.2): data handed to courts,
// police, or regulators under legal compulsion. Kept inside third_party_sharing
// because it is just another class of disclosure recipient. Every pattern
// requires a concrete legal-demand noun, so security boilerplate that merely
// mentions "disclosure" ("protect against unauthorized disclosure") — which
// names no demand — never matches.
const LEGAL_DEMAND =
  'subpoenas?|court\\s+orders?|search\\s+warrants?|warrants?|legal\\s+process|' +
  'legal\\s+(?:demand|request|proceeding|obligation)s?|lawful\\s+requests?|' +
  '(?:valid|lawful|binding)\\s+orders?|' +
  'law\\s+enforcement|regulatory\\s+authorit\\w+|public\\s+authorit(?:y|ies)|' +
  'judicial\\s+authorit\\w+|(?:relevant|government(?:al)?)\\s+authorit(?:y|ies)';

const LEGAL_PROCESS = [
  // disclosure verb + a legal demand, as recipient or as the reason
  // ("disclose ... to law enforcement", "disclose ... to comply with a subpoena").
  new RegExp(
    `\\b(?:disclos\\w+|shar\\w+|provid\\w+|releas\\w+|produc\\w+|hand(?:ed|s)?\\s+over|turn(?:ed|s)?\\s+over)\\b[^]{0,120}?\\b(?:${LEGAL_DEMAND})\\b`,
    'i',
  ),
  // "to comply with / in response to / respond to / pursuant to" a legal demand;
  // the disclosure is implied by the demand itself.
  new RegExp(
    `\\b(?:comply\\s+with|in\\s+response\\s+to|respond\\s+to|pursuant\\s+to)\\b[^]{0,60}?\\b(?:${LEGAL_DEMAND})\\b`,
    'i',
  ),
  // disclosure "as required / permitted by (applicable) law".
  /\b(?:disclos\w+|shar\w+|provid\w+|releas\w+)\b[^]{0,100}?\b(?:required|permitted)\s+(?:or\s+permitted\s+)?by\s+(?:applicable\s+)?law\b/i,
];

// Data nouns that anchor the "shared with <named company>" pattern below.
// Both cases allowed so a sentence-initial "Audio data …" still qualifies.
const DATA_NOUN =
  '[Tt]ext|[Mm]essages?|[Aa]udio|[Vv]oice|[Dd]ata|[Ii]nformation|' +
  '[Cc]ontent|[Rr]ecordings?|[Ff]iles?|[Dd]ocuments?|[Pp]hotos?|[Vv]ideos?';

// Capitalized tokens that follow "with" but are not third-party recipients
// (pronouns, articles, and our-own-data words), so "shared with You/The/
// Personal Data" never reads as disclosure to an outside entity.
const NOT_A_RECIPIENT =
  'We|Us|You|Your|Our|The|This|These|Those|Such|Personal|Services?|Customers?|Users?';

const POSITIVE = [
  // share/disclose verb + a recipient category in the same sentence
  new RegExp(`\\b(?:${SHARE_VERB})\\b[^]{0,120}?\\b(?:${RECIPIENT})\\b`, 'i'),
  // Data shared with a NAMED third party (a proper-noun company), e.g. message
  // "text … may be shared with Google or Microsoft". A bare company name is not
  // in the recipient-noun list, so without this the disclosure is missed. The
  // data noun before the verb keeps it from firing on unrelated "shared with
  // <Capitalized>" phrasings; case-sensitive so the recipient is a proper noun.
  new RegExp(
    `\\b(?:${DATA_NOUN})\\b[^]{0,200}?\\b(?:shared?|disclosed?)\\s+with\\s+(?!(?:${NOT_A_RECIPIENT})\\b)[A-Z][A-Za-z.]+(?:\\s+(?:or|and|&)\\s+[A-Z][A-Za-z.]+)*`,
  ),
  // "provide" only with a data object before the recipient — "provide your
  // information to advertising partners", not "services provided by affiliates".
  new RegExp(
    `\\bprovid(?:e|es|ed|ing)\\b[^]{0,80}?\\b(?:personal|your|user|customer|consumer)\\b[^]{0,30}?\\b(?:data|information)\\b[^]{0,120}?\\b(?:${RECIPIENT})\\b`,
    'i',
  ),
  ...LEGAL_PROCESS,
  // recipient before the verb: "Valve and its subsidiaries may share your
  // Personal Data with each other" — disclosure reads recipient-first.
  new RegExp(
    `\\b(?:${RECIPIENT})\\b[^]{0,80}?\\b(?:share|shares|disclose|discloses|transfer|transfers)\\b[^]{0,80}?\\b(?:personal|your|user)\\b[^]{0,40}?\\b(?:data|information)\\b`,
    'i',
  ),
  new RegExp(
    `\\b(?:${RECIPIENT})\\b[^]{0,80}?\\b(?:receive|receives|access|collect|obtain)\\b[^]{0,60}?\\b(?:personal|your|user)\\b[^]{0,30}?\\b(?:data|information)\\b`,
    'i',
  ),
  // Other users/account holders as named disclosure recipients. The company
  // must be the one disclosing ("we may share ... with other users") so that
  // user-to-user sharing ("you share content with other users") stays out.
  /\bwe\s+(?:may\s+|will\s+|might\s+)?(?:share|disclose|display)\b[^]{0,120}?\bother\s+(?:\w+\s+)?(?:users|account\s+holders|members)\b/i,
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
    for (const { sentence, index, leadIn } of segmentSentences(text)) {
      // Carry a list lead-in's verb context onto its items ("share … with:"
      // + "(1) our parent company …"). Skip the carry when the lead-in already
      // flags on its own — its disclosure is counted on the lead-in line, so
      // re-flagging every item would just inflate the count.
      const carry = leadIn && !isSharingDisclosure(leadIn);
      const context = carry ? `${leadIn} ${sentence}` : sentence;
      if (isSharingDisclosure(context)) {
        matches.push({ detectorId: 'third_party_sharing', sentence, index });
      }
    }
    return matches;
  },
};
