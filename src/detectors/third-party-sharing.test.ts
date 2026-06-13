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

  it('flags new recipient vocabulary (parent company, financial institutions, payment networks)', () => {
    expect(
      thirdPartySharing.detect(
        'To provide our Services, we may share your personal data with our parent company, Telegram Group Inc.',
      ),
    ).toHaveLength(1);
    expect(
      thirdPartySharing.detect(
        'We may disclose Personal Information with financial institutions to jointly offer a product.',
      ),
    ).toHaveLength(1);
    expect(
      thirdPartySharing.detect(
        'We may disclose Personal Information with payment networks and processors to facilitate payment processing.',
      ),
    ).toHaveLength(1);
  });

  it('flags recipient-before-verb word order', () => {
    expect(
      thirdPartySharing.detect(
        'Valve and its subsidiaries may share your Personal Data with each other.',
      ),
    ).toHaveLength(1);
  });

  it('flags disclosure to other account holders but not user-to-user sharing', () => {
    expect(
      thirdPartySharing.detect(
        'We may disclose Personal Information with other account holders to complete a payment transaction.',
      ),
    ).toHaveLength(1);
    // The user sharing their own content with other users is not the company
    // disclosing — must stay unflagged.
    expect(
      thirdPartySharing.detect(
        'When you chat with others and share content with them, they become capable of seeing it.',
      ),
    ).toHaveLength(0);
  });

  it('flags legal-process disclosure', () => {
    expect(
      thirdPartySharing.detect(
        'We may disclose your information to comply with a court order or subpoena.',
      ),
    ).toHaveLength(1);
    expect(
      thirdPartySharing.detect(
        'We may disclose any collected information to respond to subpoenas, court orders, and legal process.',
      ),
    ).toHaveLength(1);
    expect(
      thirdPartySharing.detect(
        'We may disclose your personal information as otherwise permitted or required by law.',
      ),
    ).toHaveLength(1);
  });

  it('does not flag security boilerplate that merely mentions disclosure', () => {
    expect(
      thirdPartySharing.detect(
        'We work hard to protect you from unauthorized access, alteration, disclosure, or destruction of information we hold.',
      ),
    ).toHaveLength(0);
    expect(
      thirdPartySharing.detect('We protect against unauthorized disclosure.'),
    ).toHaveLength(0);
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

  it('flags "provide" only with a data object, not scope boilerplate', () => {
    expect(
      thirdPartySharing.detect(
        'We provide your personal data to advertising partners.',
      ),
    ).toHaveLength(1);
    // Scope boilerplate: "services provided by X or its affiliates" describes
    // who runs the service, not a disclosure.
    expect(
      thirdPartySharing.detect(
        'This notice applies to all services provided by eBay Inc. or its affiliates.',
      ),
    ).toHaveLength(0);
  });

  it('does not flag unrelated mentions of partners', () => {
    expect(
      thirdPartySharing.detect('Our retail partners offer discounts in their own stores.'),
    ).toHaveLength(0);
  });
});
