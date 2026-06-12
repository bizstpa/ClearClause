import { describe, expect, it } from 'vitest';
import { dataSale } from './data-sale';
import { iherbRightsSentences, iherbSaleParagraph } from './fixtures/iherb';

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

  describe('consideration-aware (iHerb two-step)', () => {
    it('catches the non-monetary consideration sentence but not the monetary denial', () => {
      const sentences = dataSale.detect(iherbSaleParagraph).map((m) => m.sentence);
      expect(sentences.some((s) => s.includes('non-monetary consideration'))).toBe(true);
      expect(
        sentences.some((s) =>
          s.includes('We do not sell Personal Information in exchange for monetary compensation'),
        ),
      ).toBe(false);
    });

    it('catches the "we may have sold the following categories" assertion', () => {
      const sentences = dataSale.detect(iherbSaleParagraph).map((m) => m.sentence);
      expect(sentences.some((s) => s.includes('may have sold the following categories'))).toBe(
        true,
      );
    });

    it('catches a deny-then-consideration two-step packed into one sentence', () => {
      const matches = dataSale.detect(
        'We do not sell personal information in exchange for monetary compensation; however, we may allow certain third parties to collect your personal information on our sites in exchange for non-monetary consideration.',
      );
      expect(matches).toHaveLength(1);
    });

    it('still treats a denial covering any consideration as a denial', () => {
      expect(
        dataSale.detect('We do not sell your personal information in exchange for any consideration.'),
      ).toHaveLength(0);
    });
  });

  describe('contrastive negation (Stripe deny-then-admit)', () => {
    it('flags the disclosure after "but" despite the leading payment-qualified denial', () => {
      const matches = dataSale.detect(
        'We do not transfer your Personal Data to third parties in exchange for payment, but we may provide your data to third-party partners, such as advertising partners, who assist us in advertising our Services to you.',
      );
      expect(matches).toHaveLength(1);
    });

    it('still treats the denial as a denial when nothing follows the contrastive', () => {
      expect(
        dataSale.detect(
          'We do not transfer your Personal Data to third parties in exchange for payment.',
        ),
      ).toHaveLength(0);
    });

    it('does not treat an unqualified deny-but-share sentence as a sale', () => {
      expect(
        dataSale.detect(
          'We do not sell your personal information, but we share aggregate statistics with partners.',
        ),
      ).toHaveLength(0);
    });
  });

  describe('scare-quoted keywords (Stripe CCPA admission)', () => {
    it('matches "sale" in scare quotes the same as sale', () => {
      const matches = dataSale.detect(
        'Stripe’s provision of data to these parties may be considered a data “sale” or “sharing” (for behavioral advertising) as those terms are defined under the CCPA and other applicable US privacy laws.',
      );
      expect(matches).toHaveLength(1);
    });

    it('still suppresses a scare-quoted denial', () => {
      expect(
        dataSale.detect('We do not knowingly “sell” your personal information.'),
      ).toHaveLength(0);
    });
  });

  describe('rights-aware', () => {
    it('does not flag sentences about the right to opt out of sale', () => {
      expect(dataSale.detect(iherbRightsSentences)).toHaveLength(0);
    });

    it('does not flag the Do Not Sell My Personal Information link text', () => {
      expect(dataSale.detect('Do Not Sell My Personal Information')).toHaveLength(0);
    });

    it('does not flag a long rights sentence whose subject is the user (Stripe right-to-know)', () => {
      expect(
        dataSale.detect(
          'You have a right to request additional information about the categories of personal information collected, sold, disclosed, or shared; purposes for which this personal information was collected, sold, or shared.',
        ),
      ).toHaveLength(0);
    });

    it('still flags assertions when rights sentences surround them', () => {
      const text = `${iherbRightsSentences}\n${iherbSaleParagraph}`;
      const sentences = dataSale.detect(text).map((m) => m.sentence);
      expect(sentences.some((s) => s.includes('non-monetary consideration'))).toBe(true);
      expect(sentences.some((s) => s.includes('right to opt-out'))).toBe(false);
    });
  });
});
