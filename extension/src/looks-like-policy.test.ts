import { describe, expect, it } from 'vitest';
import { looksLikePrivacyPolicy } from './looks-like-policy';

describe('looksLikePrivacyPolicy', () => {
  it('matches common privacy-policy URL shapes', () => {
    for (const url of [
      'https://example.com/privacy',
      'https://example.com/privacy-policy',
      'https://example.com/privacy_policy',
      'https://example.com/legal/privacy',
      'https://example.com/privacy-notice',
      'https://example.com/data-protection',
      'https://example.com/cookie-policy',
    ]) {
      expect(looksLikePrivacyPolicy(url, '')).toBe(true);
    }
  });

  it('matches policy keywords in the page title even when the URL is opaque', () => {
    expect(looksLikePrivacyPolicy('https://example.com/p/12345', 'Privacy Policy')).toBe(true);
    expect(looksLikePrivacyPolicy('https://example.com/x', 'Acme — Privacy Notice')).toBe(true);
    expect(looksLikePrivacyPolicy('https://example.com/x', 'Data Protection Statement')).toBe(true);
  });

  it('does not flag ordinary pages', () => {
    expect(looksLikePrivacyPolicy('https://example.com/blog/hello', 'Hello world')).toBe(false);
    expect(looksLikePrivacyPolicy('https://news.example.com/', 'Top stories')).toBe(false);
    expect(looksLikePrivacyPolicy('', '')).toBe(false);
    expect(looksLikePrivacyPolicy(undefined, undefined)).toBe(false);
  });
});
