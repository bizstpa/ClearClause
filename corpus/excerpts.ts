import type { Category } from '../src/detectors/types';
import {
  iherbRightsSentences,
  iherbRunOnBlock,
  iherbSaleParagraph,
} from '../src/detectors/fixtures/iherb';
import { realPolicyExcerpt } from '../src/detectors/fixtures/real-policy';

// Committed regression excerpts: short quotes only, because committing many
// companies' full policy texts into a public repo is a copyright concern.
// Full policies for bulk tuning go in corpus/local/ (gitignored) instead.
//
// Each excerpt pins a specific detector behaviour — a catch or a correct
// non-catch. src/detectors/corpus.test.ts enforces every pin on every test
// run, so a tuning fix captured here cannot silently regress.
export interface Excerpt {
  name: string;
  source: string;
  text: string;
  /** category → substrings that must appear among that category's matches */
  mustFind?: Partial<Record<Category, string[]>>;
  /** category → substrings that must NOT appear among that category's matches */
  mustNotFind?: Partial<Record<Category, string[]>>;
}

export const excerpts: Excerpt[] = [
  {
    name: 'iherb-run-on-sources',
    source: 'modeled on iHerb Privacy Policy, CCPA sources-of-information list',
    text: iherbRunOnBlock,
    mustFind: {
      third_party_sharing: ['Advertising networks', 'Data brokers', 'Government entities'],
      data_collection: ['categories of Personal Information'],
    },
  },
  {
    name: 'iherb-sale-two-step',
    source: 'modeled on iHerb Privacy Policy, Sale of Personal Information section',
    text: iherbSaleParagraph,
    mustFind: {
      data_sale: ['non-monetary consideration', 'may have sold the following categories'],
    },
    mustNotFind: {
      data_sale: ['We do not sell Personal Information in exchange for monetary compensation'],
    },
  },
  {
    name: 'iherb-rights-not-sales',
    source: 'modeled on iHerb Privacy Policy, CCPA consumer-rights section',
    text: iherbRightsSentences,
    mustNotFind: {
      data_sale: ['right to opt-out', 'request that we disclose', 'sold'],
    },
  },
  {
    name: 'real-policy-composite',
    source: 'verbatim sentences from TikTok / Fox News / Discord policies (2026-06-12)',
    text: realPolicyExcerpt,
    mustFind: {
      data_sale: ['considered "selling" under other state'],
      arbitration: ['binding arbitration as the sole means'],
      class_action_waiver: ['NOT AS A PLAINTIFF OR CLASS MEMBER'],
    },
    mustNotFind: {
      data_sale: ['We do not sell your personal information', 'do not knowingly "sell"'],
    },
  },
  {
    name: 'retention-vague-vs-specific',
    source: 'composite of common retention phrasings',
    text: `Data Retention
We retain your account information for the duration of our relationship with you and as required by law.
Server logs are kept for twelve (12) months.
Backup copies are deleted after six (6) months.`,
    mustFind: {
      retention: ['duration of our relationship', 'twelve (12) months', 'six (6) months'],
    },
  },
  {
    name: 'ccpa-category-list',
    source: 'composite of CCPA category-table lines',
    text: `Categories of Personal Information we collect:
Identifiers such as a real name, alias, postal address, and email address
Social Security number, driver's license number, or passport number
Biometric information
Precise geolocation data derived from GPS, WiFi, and Bluetooth signals
Inferences drawn from other personal information to create a profile about a consumer`,
    mustFind: {
      data_collection: [
        'Social Security number',
        'Biometric information',
        'Precise geolocation data',
        'Inferences drawn',
        'Identifiers such as',
      ],
    },
  },
  {
    name: 'business-and-cross-border-transfer',
    source: 'composite of common transfer phrasings',
    text: `If we sell or transfer all or a portion of our business or assets, we may disclose your personal information to the prospective buyer.
Your information may be transferred to, and processed in, countries other than the country in which you reside.`,
    mustFind: {
      third_party_sharing: ['sell or transfer all or a portion', 'countries other than'],
    },
    // Selling the business is not selling the data (eval over-flag, pinned).
    mustNotFind: {
      data_sale: ['sell or transfer all or a portion'],
    },
  },
  {
    name: 'stripe-sale-constructions',
    source: 'verbatim sentences from Stripe Privacy Policy (2026-06-13)',
    text: `We do not transfer your Personal Data to third parties in exchange for payment, but we may provide your data to third-party partners, such as advertising partners, analytics providers, and social networks, who assist us in advertising our Services to you.
Exercising the right to know: You have a right to request additional information about the categories of personal information collected, sold, disclosed, or shared; purposes for which this personal information was collected, sold, or shared; categories of sources of personal information; and categories of third parties with whom we disclosed or shared this personal information.
Exercising the right to opt-out from a sale or sharing: We do not transfer your personal data to third parties in exchange for payment. However, as noted above, we may provide the data to third party partners, such as advertising partners, analytics providers, and social networks, who assist us in advertising our products and Services to you. Because these third parties may use the data Stripe provides for their own purposes, Stripe's provision of data to these parties may be considered a data “sale” or “sharing” (for behavioral advertising) as those terms are defined under the CCPA and other applicable US privacy laws.`,
    mustFind: {
      // Deny-then-admit: the disclosure after the contrastive survives the
      // denial's veto. Scare-quoted CCPA admission: 'a data “sale”' matches.
      data_sale: [
        'in exchange for payment, but we may provide',
        'may be considered a data “sale”',
      ],
    },
    mustNotFind: {
      // Rights sentence (subject is the user requesting) and the bare denial
      // sentence are not sale assertions.
      data_sale: [
        'You have a right to request additional information',
        'Exercising the right to opt-out from a sale or sharing',
      ],
    },
  },
  {
    name: 'no-sharing-negation',
    source: 'composite no-sharing statement',
    text: 'We do not share your personal information with third parties, and we will never sell your data to anyone.',
    mustNotFind: {
      third_party_sharing: ['We do not share'],
      data_sale: ['never sell'],
    },
  },
];
