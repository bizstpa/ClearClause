// A pure heuristic: does the current tab *look* like a privacy policy, judging
// only by its URL and title? This is used solely to surface a hint in the popup
// ("this looks like a privacy policy — scan it?"). It never triggers a read on
// its own; reading the page still requires the user's explicit click. Checking
// a URL + title needs no special permissions (the popup already has the active
// tab's URL via activeTab), so the hint costs nothing on the permission budget.

const URL_PATTERN =
  /privacy|data[-_]?protection|data[-_]?policy|cookie[-_]?policy|gdpr|ccpa|legal\/privacy/i;

const TITLE_PATTERN =
  /privacy\s+(policy|notice|statement|center)|data\s+(policy|protection)|cookie\s+(policy|notice)/i;

export function looksLikePrivacyPolicy(
  url: string | undefined,
  title: string | undefined,
): boolean {
  return URL_PATTERN.test(url ?? '') || TITLE_PATTERN.test(title ?? '');
}
