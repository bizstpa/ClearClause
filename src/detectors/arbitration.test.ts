import { describe, expect, it } from 'vitest';
import { arbitration } from './arbitration';

describe('arbitration detector', () => {
  it('flags binding arbitration clauses', () => {
    const matches = arbitration.detect(
      'Any dispute arising out of these Terms will be resolved through binding arbitration.',
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].sentence).toContain('binding arbitration');
  });

  it('flags court/jury waiver phrasing', () => {
    const matches = arbitration.detect(
      'By using the Service, you waive your right to a trial in court before a judge or jury.',
    );
    expect(matches).toHaveLength(1);
  });

  it('does not flag unrelated sentences mentioning similar words', () => {
    expect(
      arbitration.detect('We may make arbitrary updates to these Terms at any time.'),
    ).toHaveLength(0);
    expect(arbitration.detect('Our office is near the courthouse.')).toHaveLength(0);
  });

  it('handles the Arabic starter patterns', () => {
    expect(
      arbitration.detect('تتم تسوية أي نزاع عن طريق التحكيم الملزم وفقاً لهذه الشروط.'),
    ).toHaveLength(1);
  });
});
