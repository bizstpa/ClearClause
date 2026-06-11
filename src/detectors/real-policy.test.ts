import { describe, expect, it } from 'vitest';
import { runDetectors } from './registry';
import { realPolicyExcerpt } from './fixtures/real-policy';

// Regression test against verbatim sentences from real, well-known policies.
// See fixtures/real-policy.ts for provenance. These pin the tuning done on
// 2026-06-12: scare-quoted sell-words, long CCPA sentences, all-caps legal
// text, and headings without terminators.
describe('detectors against a real policy excerpt', () => {
  const results = Object.fromEntries(
    runDetectors(realPolicyExcerpt).map((r) => [r.category, r]),
  );

  it('finds the CCPA "considered selling/sale" sentences', () => {
    const sentences = results.data_sale.matches.map((m) => m.sentence);
    expect(results.data_sale.found).toBe(true);
    expect(sentences.some((s) => s.includes('considered "selling" under other state'))).toBe(true);
    expect(sentences.some((s) => s.includes('"selling" or "sharing" under the CCPA'))).toBe(true);
    expect(sentences.some((s) => s.includes('"sold" or "shared" are below'))).toBe(true);
    expect(sentences.some((s) => s.includes('considered a "sale" under some state'))).toBe(true);
  });

  it('never flags the no-sale sentences, including scare-quoted ones', () => {
    const sentences = results.data_sale.matches.map((m) => m.sentence);
    expect(sentences.some((s) => s.includes('We do not sell your personal information'))).toBe(
      false,
    );
    expect(sentences.some((s) => s.includes('do not knowingly "sell"'))).toBe(false);
  });

  it('finds the arbitration clauses without swallowing the section heading', () => {
    const sentences = results.arbitration.matches.map((m) => m.sentence);
    expect(results.arbitration.found).toBe(true);
    expect(sentences.some((s) => s.includes('binding arbitration as the sole means'))).toBe(true);
    expect(sentences.some((s) => s.includes('WAIVE YOUR RIGHT TO A JURY TRIAL'))).toBe(true);
    expect(sentences.every((s) => !s.startsWith('Settling disputes'))).toBe(true);
  });

  it('finds the class-action waiver language', () => {
    const sentences = results.class_action_waiver.matches.map((m) => m.sentence);
    expect(results.class_action_waiver.found).toBe(true);
    expect(sentences.some((s) => s.includes('NOT AS A PLAINTIFF OR CLASS MEMBER'))).toBe(true);
    expect(sentences.some((s) => s.includes('pursued by you on an individual basis'))).toBe(true);
  });

  it('routes ordinary data-collection sentences to data_collection as info, nowhere else', () => {
    const collection = results.data_collection.matches;
    expect(
      collection.some((m) => m.sentence.includes('We automatically collect certain information')),
    ).toBe(true);
    expect(collection.every((m) => m.severity === 'info')).toBe(true);

    const others = Object.values(results)
      .filter((r) => r.category !== 'data_collection' && r.category !== 'third_party_sharing')
      .flatMap((r) => r.matches.map((m) => m.sentence));
    expect(others.some((s) => s.includes('We automatically collect certain information'))).toBe(
      false,
    );
    expect(others.some((s) => s.includes('Account information, such as date of birth'))).toBe(
      false,
    );
  });

  it('match indexes point at the quoted sentence in the source', () => {
    for (const result of Object.values(results)) {
      for (const match of result.matches) {
        expect(realPolicyExcerpt.startsWith(match.sentence, match.index)).toBe(true);
      }
    }
  });
});
