import { describe, expect, it } from 'vitest';
import { segmentSentences } from './segment';
import { iherbRunOnBlock } from './fixtures/iherb';

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

  it('treats line breaks as boundaries even without a period', () => {
    const spans = segmentSentences('Data Retention\nWe keep your data for two years');
    expect(spans.map((s) => s.sentence)).toEqual([
      'Data Retention',
      'We keep your data for two years',
    ]);
  });

  it('splits unpunctuated list items into discrete sentences', () => {
    const text = 'We share data with:\n• Advertising networks\n• Data brokers\n- Social networks';
    const spans = segmentSentences(text);
    expect(spans.map((s) => s.sentence)).toEqual([
      'We share data with:',
      'Advertising networks',
      'Data brokers',
      'Social networks',
    ]);
  });

  it('strips numbered-list markers without breaking on their period', () => {
    const spans = segmentSentences('1. Identifiers such as a real name\n2. Geolocation data');
    expect(spans.map((s) => s.sentence)).toEqual([
      'Identifiers such as a real name',
      'Geolocation data',
    ]);
  });

  it('splits the iHerb run-on block into discrete lines', () => {
    const spans = segmentSentences(iherbRunOnBlock);
    const sentences = spans.map((s) => s.sentence);
    expect(sentences).toContain('Sources of Personal Information');
    expect(sentences).toContain('Advertising networks');
    expect(sentences).toContain('Internet service providers');
    expect(sentences).toContain('Data analytics providers');
    expect(sentences).toContain('Government entities');
    expect(sentences).toContain('Data brokers');
    // No span swallows more than its own line.
    expect(sentences.every((s) => !s.includes('\n'))).toBe(true);
    // Offsets still point at the verbatim text.
    for (const span of spans) {
      expect(iherbRunOnBlock.startsWith(span.sentence, span.index)).toBe(true);
    }
  });
});
