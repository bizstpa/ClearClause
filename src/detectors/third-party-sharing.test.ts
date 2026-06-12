import { describe, expect, it } from 'vitest';
import { thirdPartySharing } from './third-party-sharing';
import { iherbRunOnBlock } from './fixtures/iherb';

describe('third_party_sharing detector', () => {
  it('flags sharing with service providers and advertisers', () => {
    const matches = thirdPartySharing.detect(
      'We may share your personal information with service providers and advertising networks.',
    );
    expect(matches).toHaveLength(1);
  });

  it('flags disclosure to affiliates and government entities', () => {
    expect(
      thirdPartySharing.detect(
        'We disclose your personal information to our affiliates and, where required, to government entities.',
      ),
    ).toHaveLength(1);
  });

  it('flags standalone recipient lines from a categories list', () => {
    const sentences = thirdPartySharing.detect(iherbRunOnBlock).map((m) => m.sentence);
    expect(sentences).toContain('Advertising networks');
    expect(sentences).toContain('Internet service providers');
    expect(sentences).toContain('Data analytics providers');
    expect(sentences).toContain('Government entities');
    expect(sentences).toContain('Social networks');
  });

  it('flags business-transfer language', () => {
    expect(
      thirdPartySharing.detect(
        'If we sell or transfer all or a portion of our business or assets, your information may be among the transferred items.',
      ),
    ).toHaveLength(1);
    expect(
      thirdPartySharing.detect(
        'In the event of a merger, acquisition, or bankruptcy, customer records may be reviewed by the acquiring entity.',
      ),
    ).toHaveLength(1);
  });

  it('flags cross-border transfer language', () => {
    expect(
      thirdPartySharing.detect(
        'Your information may be transferred to, and processed in, countries other than the country in which you reside.',
      ),
    ).toHaveLength(1);
  });

  it('flags a denial qualified by an exception carve-out', () => {
    expect(
      thirdPartySharing.detect(
        'We do not share your personal information with companies, organizations, or individuals outside of Google except in the following cases:',
      ),
    ).toHaveLength(1);
    expect(
      thirdPartySharing.detect(
        'We will not disclose your personal data unless you have given us your consent.',
      ),
    ).toHaveLength(1);
  });

  it('flags a denial whose contrastive tail asserts sharing', () => {
    expect(
      thirdPartySharing.detect(
        'We do not share your personal information for marketing; however, we may disclose it to our service providers.',
      ),
    ).toHaveLength(1);
  });

  it('does not flag a denial whose contrastive tail is not about sharing', () => {
    expect(
      thirdPartySharing.detect(
        'We do not share your personal information with third parties, but we work hard to keep it secure.',
      ),
    ).toHaveLength(0);
  });

  it('does not flag no-sharing statements', () => {
    expect(
      thirdPartySharing.detect('We do not share your personal information with third parties.'),
    ).toHaveLength(0);
    expect(
      thirdPartySharing.detect('We will never disclose your data to advertisers.'),
    ).toHaveLength(0);
  });

  it('does not flag unrelated mentions of partners', () => {
    expect(
      thirdPartySharing.detect('Our retail partners offer discounts in their own stores.'),
    ).toHaveLength(0);
  });
});
