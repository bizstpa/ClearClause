import { describe, expect, it } from 'vitest';
import { dataSale } from './data-sale';

describe('data_sale detector', () => {
  it('flags an explicit sale sentence and quotes it verbatim', () => {
    const text =
      'We value transparency. We may sell your personal information to advertising partners. Contact us anytime.';
    const matches = dataSale.detect(text);
    expect(matches).toHaveLength(1);
    expect(matches[0].sentence).toBe(
      'We may sell your personal information to advertising partners.',
    );
    expect(matches[0].detectorId).toBe('data_sale');
    expect(text.slice(matches[0].index)).toMatch(/^We may sell/);
  });

  it('flags "sale of personal data" phrasing', () => {
    const matches = dataSale.detect(
      'The sale of your personal data to brokers is described in Section 4.',
    );
    expect(matches).toHaveLength(1);
  });

  it('never labels a no-sale sentence as a sale', () => {
    expect(dataSale.detect('We do not sell your personal information.')).toHaveLength(0);
    expect(dataSale.detect('We will never sell your data to anyone.')).toHaveLength(0);
    expect(dataSale.detect("We don't and won't sell user data.")).toHaveLength(0);
  });

  it('ignores sentences about selling unrelated things', () => {
    expect(dataSale.detect('We sell handmade furniture and ship worldwide.')).toHaveLength(0);
  });

  it('flags only the sale sentence when a negation sentence sits next to it', () => {
    const matches = dataSale.detect(
      'We do not sell your data to advertisers. However, we may sell your personal information after a merger.',
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].sentence).toContain('after a merger');
  });
});
