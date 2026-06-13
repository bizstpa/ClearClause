// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { stripInPageNavigation } from './extract';

/** Build a detached document body from an HTML string for DOM-level assertions. */
function bodyFrom(html: string): HTMLElement {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  return doc.body;
}

describe('stripInPageNavigation', () => {
  it('drops a table-of-contents jump-link list but keeps body prose', () => {
    const body = bodyFrom(`
      <ul class="toc">
        <li><a href="#collect">Information We Collect</a></li>
        <li><a href="#share">How We Share Information</a></li>
        <li><a href="#retention">Data Retention</a></li>
        <li><a href="#rights">Your Rights</a></li>
      </ul>
      <p>We collect your name, email address, and device identifiers when you use our services.</p>
    `);

    stripInPageNavigation(body);

    const text = body.textContent ?? '';
    expect(text).not.toContain('Information We Collect');
    expect(text).not.toContain('Your Rights');
    expect(text).toContain('We collect your name, email address, and device identifiers');
  });

  it('removes <nav> and role="navigation" regions', () => {
    const body = bodyFrom(`
      <nav><a href="/home">Home</a><a href="/about">About</a></nav>
      <div role="navigation"><a href="#top">Back to top</a></div>
      <p>We retain personal data for as long as your account is active.</p>
    `);

    stripInPageNavigation(body);

    const text = body.textContent ?? '';
    expect(text).not.toContain('Home');
    expect(text).not.toContain('Back to top');
    expect(text).toContain('We retain personal data for as long as your account is active.');
  });

  it('keeps a list whose links navigate off-page (real content, not a TOC)', () => {
    const body = bodyFrom(`
      <ul>
        <li><a href="https://example.com/a">Partner A</a></li>
        <li><a href="https://example.com/b">Partner B</a></li>
        <li><a href="https://example.com/c">Partner C</a></li>
      </ul>
    `);

    stripInPageNavigation(body);

    expect(body.textContent ?? '').toContain('Partner A');
  });

  it('keeps a list with substantial prose around the odd inline link', () => {
    const body = bodyFrom(`
      <ul>
        <li>We share your data with advertising partners to deliver relevant ads, and you can opt out at any time via <a href="#optout">these settings</a>.</li>
        <li>We may disclose information to comply with legal obligations or valid government requests.</li>
        <li>We sell aggregated, de-identified data to third parties for analytics purposes.</li>
      </ul>
    `);

    stripInPageNavigation(body);

    expect(body.textContent ?? '').toContain('advertising partners');
    expect(body.textContent ?? '').toContain('We sell aggregated');
  });
});
