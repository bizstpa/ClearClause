import type { Severity } from './detectors/types';

// All user-facing strings live here — no hardcoded UI copy anywhere else.
// English-only for now; this module is the seam if other languages return.
export const strings = {
  title: 'ClearClause',
  tagline: 'Paste a privacy policy. See what it actually says.',
  privacyNote: 'Analysis runs entirely in your browser — the text never leaves your machine.',
  disclaimer:
    'Not legal advice. ClearClause is a screening aid that surfaces candidate language for you to read; it does not interpret documents or assert legal conclusions.',
  textareaLabel: 'Policy text',
  textareaPlaceholder: 'Paste the full privacy policy or terms here…',
  analyze: 'Analyze',
  resultsHeading: 'Readout',
  found: 'Found',
  notFound: 'Not found',
  /** "{count}" is replaced with the number of matched sentences. */
  matchCount: '{count} matched sentence(s)',
  severity: { info: 'Info', caution: 'Caution', warning: 'Warning' } satisfies Record<
    Severity,
    string
  >,
  emptyInput: 'Paste some policy text first.',
};
