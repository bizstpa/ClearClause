import { describe, expect, it } from 'vitest';
import { retention } from './retention';

describe('retention detector', () => {
  it('flags vague duration-of-relationship language as caution', () => {
    const matches = retention.detect(
      'We retain your personal information for the duration of our relationship with you.',
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].severity).toBe('caution');
  });

  it('flags "as long as necessary" as caution', () => {
    const matches = retention.detect(
      'We keep your data for as long as necessary to provide the Services.',
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].severity).toBe('caution');
  });

  it('flags a "reasonable period" as caution', () => {
    expect(
      retention.detect('Records are stored for a reasonable period after account closure.')[0]
        ?.severity,
    ).toBe('caution');
  });

  it('reports specific periods as info', () => {
    const twelve = retention.detect('We retain server logs for twelve (12) months.');
    expect(twelve).toHaveLength(1);
    expect(twelve[0].severity).toBe('info');

    const six = retention.detect('Backup copies are deleted after six (6) months.');
    expect(six).toHaveLength(1);
    expect(six[0].severity).toBe('info');
  });

  it('prefers the vague reading when both appear in one sentence', () => {
    const matches = retention.detect(
      'We retain your data for 12 months or for as long as necessary, whichever is longer.',
    );
    expect(matches[0]?.severity).toBe('caution');
  });

  it('does not mistake the CCPA lookback window for a retention period', () => {
    expect(
      retention.detect(
        'In the preceding twelve (12) months, we may have sold the following categories of Personal Information.',
      ),
    ).toHaveLength(0);
  });

  it('reports a spelled-out duration as info', () => {
    const matches = retention.detect('Account records are retained for one year after closure.');
    expect(matches).toHaveLength(1);
    expect(matches[0].severity).toBe('info');
  });

  it('reports a reversed digit/word duration as info', () => {
    const matches = retention.detect('We keep the data for a grace period of 30 (thirty) days.');
    expect(matches).toHaveLength(1);
    expect(matches[0].severity).toBe('info');
  });

  it('flags criteria-based retention as the concern', () => {
    expect(
      retention.detect(
        'We retain the data we collect for different periods of time depending on what it is and how we use it.',
      )[0]?.severity,
    ).toBe('caution');
    expect(
      retention.detect(
        'To determine the appropriate retention period, we consider the amount, nature, and sensitivity of the personal information.',
      )[0]?.severity,
    ).toBe('caution');
    expect(
      retention.detect('The criteria used to determine our retention period is as follows.')[0]
        ?.severity,
    ).toBe('caution');
  });

  it('does not flag period mentions with no retention context', () => {
    expect(retention.detect('The subscription renews every 12 months.')).toHaveLength(0);
  });
});
