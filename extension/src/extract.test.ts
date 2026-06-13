// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { dedupeLines, extractAnalyzableText, stripInPageNavigation } from './extract';

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

describe('extractAnalyzableText', () => {
  it('does not emit a bare heading as an analyzable line but keeps the body sentence', () => {
    const body = bodyFrom(`
      <h2>Information You Provide Us</h2>
      <p>We collect your name and email address when you register an account.</p>
      <h2>Information You Provide Us</h2>
    `);

    const lines = extractAnalyzableText(body).split('\n');

    expect(lines).not.toContain('Information You Provide Us');
    expect(lines).toContain('We collect your name and email address when you register an account.');
  });

  it('drops ARIA heading-role elements too', () => {
    const body = bodyFrom(`
      <div role="heading" aria-level="2">How We Share Information</div>
      <p>We may share information with third-party advertising partners.</p>
    `);

    const text = extractAnalyzableText(body);

    expect(text).not.toContain('How We Share Information');
    expect(text).toContain('We may share information with third-party advertising partners.');
  });

  it('puts block-level siblings on separate lines', () => {
    const body = bodyFrom(`
      <p>We retain personal data for as long as your account is active.</p>
      <p>We sell de-identified data to analytics providers.</p>
    `);

    const lines = extractAnalyzableText(body).split('\n');

    expect(lines).toContain('We retain personal data for as long as your account is active.');
    expect(lines).toContain('We sell de-identified data to analytics providers.');
  });
});

describe('dedupeLines', () => {
  it('keeps a single instance of a verbatim-repeated line', () => {
    const repeated = 'We collect your name, email address, and device identifiers when you sign up.';
    const text = [repeated, 'You can request deletion of your account at any time.', repeated].join('\n');

    const lines = dedupeLines(text).split('\n');

    expect(lines.filter((l) => l === repeated)).toHaveLength(1);
    expect(lines).toContain('You can request deletion of your account at any time.');
  });

  it('leaves short repeated lines (headings, table cells) alone', () => {
    const text = ['Yes', 'We share data with partners.', 'Yes'].join('\n');

    const lines = dedupeLines(text).split('\n');

    expect(lines.filter((l) => l === 'Yes')).toHaveLength(2);
  });
});
