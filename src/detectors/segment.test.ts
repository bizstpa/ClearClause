import { describe, expect, it } from 'vitest';
import { segmentSentences } from './segment';

describe('segmentSentences', () => {
  it('splits on sentence terminators', () => {
    const spans = segmentSentences('We collect data. We share it! Do you agree?');
    expect(spans.map((s) => s.sentence)).toEqual([
      'We collect data.',
      'We share it!',
      'Do you agree?',
    ]);
  });

  it('reports character offsets into the source text', () => {
    const text = 'First sentence. Second sentence.';
    const spans = segmentSentences(text);
    expect(spans[1].index).toBe(text.indexOf('Second'));
    expect(text.slice(spans[1].index, spans[1].index + 6)).toBe('Second');
  });

  it('does not break on common abbreviations', () => {
    const spans = segmentSentences(
      'We operate in the U.S. and the E.U. under Acme Inc. policies. Second sentence here.',
    );
    expect(spans).toHaveLength(2);
    expect(spans[0].sentence).toContain('Acme Inc. policies.');
  });

  it('does not break on decimals or e.g.', () => {
    const spans = segmentSentences('We keep logs for 2.5 years, e.g. server logs. Done.');
    expect(spans).toHaveLength(2);
  });

  it('keeps trailing text without a terminator', () => {
    const spans = segmentSentences('Complete sentence. Trailing fragment');
    expect(spans).toHaveLength(2);
    expect(spans[1].sentence).toBe('Trailing fragment');
  });
});
