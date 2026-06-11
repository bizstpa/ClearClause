import type { Match } from './types';
import { detectLang, segmentSentences } from './segment';

/**
 * Shared matcher used by all pattern-based detectors: segment the text,
 * return each sentence that matches a positive pattern and no veto pattern.
 *
 * Patterns must not use the `g` flag — `RegExp.test` with `g` is stateful
 * and would skip alternating sentences.
 */
export function findMatches(
  text: string,
  detectorId: string,
  positive: readonly RegExp[],
  veto: readonly RegExp[] = [],
): Match[] {
  const matches: Match[] = [];
  for (const { sentence, index } of segmentSentences(text, detectLang(text))) {
    if (!positive.some((p) => p.test(sentence))) continue;
    if (veto.some((v) => v.test(sentence))) continue;
    matches.push({ detectorId, sentence, index });
  }
  return matches;
}
