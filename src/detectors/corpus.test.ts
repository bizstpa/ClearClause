import { describe, expect, it } from 'vitest';
import { runDetectors } from './registry';
import { excerpts } from '../../corpus/excerpts';
import type { Category } from './types';

// Enforces every pin in the committed eval corpus. When tuning against
// corpus/local/ fixes a miss or an over-flag, the fix gets pinned as an
// excerpt in corpus/excerpts.ts and this test keeps it from regressing.
describe('corpus excerpts', () => {
  for (const excerpt of excerpts) {
    describe(excerpt.name, () => {
      const results = new Map(runDetectors(excerpt.text).map((r) => [r.category, r]));
      const sentencesFor = (category: Category) =>
        (results.get(category)?.matches ?? []).map((m) => m.sentence);

      for (const [category, needles] of Object.entries(excerpt.mustFind ?? {})) {
        for (const needle of needles) {
          it(`${category} finds "${needle}"`, () => {
            expect(
              sentencesFor(category as Category).some((s) => s.includes(needle)),
            ).toBe(true);
          });
        }
      }

      for (const [category, needles] of Object.entries(excerpt.mustNotFind ?? {})) {
        for (const needle of needles) {
          it(`${category} does not flag "${needle}"`, () => {
            expect(
              sentencesFor(category as Category).some((s) => s.includes(needle)),
            ).toBe(false);
          });
        }
      }
    });
  }
});
