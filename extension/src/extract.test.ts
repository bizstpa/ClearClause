// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { runDetectors } from '../../src/engine';
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

  it('drops a styled fake-heading <p> repeated across sections but keeps a one-off short sentence', () => {
    const body = bodyFrom(`
      <p>Information You Provide Us</p>
      <p>We collect your name and email address when you register an account.</p>
      <p>Information You Provide Us</p>
      <p>We sell your data.</p>
      <p>Information You Provide Us</p>
    `);

    const lines = extractAnalyzableText(body).split('\n');

    // Recurring, punctuation-less, short: structural label without heading markup.
    expect(lines).not.toContain('Information You Provide Us');
    // Short but a one-off real sentence (ends in a period): kept.
    expect(lines).toContain('We sell your data.');
    expect(lines).toContain('We collect your name and email address when you register an account.');
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

  it('rejoins a sentence severed mid-clause across block boundaries', () => {
    // A sentence whose tail sits in a separate block: the block edge becomes a
    // line break, severing "...session replay of" from "your activity...".
    const body = bodyFrom(`
      <p>When using Reddit Ads, we may record a session replay of</p>
      <div>your activity on our services to improve them.</div>
    `);

    const lines = extractAnalyzableText(body).split('\n');

    expect(lines).toContain(
      'When using Reddit Ads, we may record a session replay of your activity on our services to improve them.',
    );
    expect(lines).not.toContain('When using Reddit Ads, we may record a session replay of');
  });

  it('chains a sentence severed across three blocks back into one', () => {
    const body = bodyFrom(`
      <p>We collect device and network connection information when you access and</p>
      <div>use our services, including from</div>
      <span>third-party integrations you connect.</span>
    `);

    const lines = extractAnalyzableText(body).split('\n');

    expect(lines).toContain(
      'We collect device and network connection information when you access and use our services, including from third-party integrations you connect.',
    );
  });

  it('keeps genuinely separate sentences separate (no over-rejoin into run-ons)', () => {
    // First line ends in a period, and the next opens with a capital: two
    // distinct statements must not fuse.
    const body = bodyFrom(`
      <p>We collect your email address when you register.</p>
      <p>We retain it for the life of your account.</p>
    `);

    const lines = extractAnalyzableText(body).split('\n');

    expect(lines).toContain('We collect your email address when you register.');
    expect(lines).toContain('We retain it for the life of your account.');
  });

  it('does not pull a following capitalized line into a heading-less label', () => {
    // A bare label (no terminal punctuation) followed by a capitalized sentence:
    // capitalized continuations stay split, so the label never swallows the body.
    const body = bodyFrom(`
      <p>Information We Collect</p>
      <p>We collect your name and email address.</p>
    `);

    const lines = extractAnalyzableText(body).split('\n');

    expect(lines).toContain('We collect your name and email address.');
    expect(lines).not.toContain(
      'Information We Collect We collect your name and email address.',
    );
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

  it('collapses a short line that recurs 3+ times to a single instance', () => {
    const label = 'Information You Provide Us'; // ~25 chars, under the 40-char floor
    const prose = 'You can opt out of marketing emails.';
    const text = [...Array(20).fill(label), prose].join('\n');

    const lines = dedupeLines(text).split('\n');

    expect(lines.filter((l) => l === label)).toHaveLength(1);
    expect(lines.filter((l) => l === prose)).toHaveLength(1); // one-off short prose untouched
  });
});

// End-to-end: the cleaning pipeline as extractPolicyText composes it (minus
// Readability, which needs a full page to score) feeding the real engine, on
// a Reddit-shaped fixture — a sidebar TOC, a subheader repeated many times,
// and a verbatim-duplicated paragraph wrapped around the actual disclosures.
describe('extraction pipeline → engine (Reddit-shaped fixture)', () => {
  const duplicatedShare =
    'We share information with third-party advertising partners and other affiliates of our business.';

  function pipeline(html: string): string {
    const body = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;
    stripInPageNavigation(body);
    return dedupeLines(extractAnalyzableText(body));
  }

  const html = `
    <ul class="toc">
      <li><a href="#provide">Information You Provide Us</a></li>
      <li><a href="#collect">Information We Collect As You Use Our Services</a></li>
      <li><a href="#share">How We Share Information</a></li>
      <li><a href="#choices">Your Choices</a></li>
    </ul>
    <h2>Information You Provide Us</h2>
    <p>We collect the information you provide directly, including your name and email address.</p>
    <h2>Information We Collect As You Use Our Services</h2>
    <p>We use session replay technology to record your interactions, including keystrokes and mouse movements.</p>
    <p>We collect your precise geolocation when you grant the relevant device permission.</p>
    <h2>Information You Provide Us</h2>
    <h2>How We Share Information</h2>
    <p>${duplicatedShare}</p>
    <p>Disputes are resolved through binding arbitration under the EU-U.S. Data Privacy Framework.</p>
    <p>${duplicatedShare}</p>
    <h2>Information You Provide Us</h2>
  `;

  const text = pipeline(html);

  it('drops the repeated subheader and the table-of-contents entries', () => {
    expect(text.split('\n')).not.toContain('Information You Provide Us');
    expect(text).not.toContain('Your Choices');
  });

  it('collapses the verbatim-duplicated disclosure to one line', () => {
    expect(text.split('\n').filter((l) => l === duplicatedShare)).toHaveLength(1);
  });

  it('still surfaces the real disclosures to the engine', () => {
    const found = new Set(runDetectors(text).filter((r) => r.found).map((r) => r.category));
    expect(found.has('data_collection')).toBe(true); // session replay + geolocation
    expect(found.has('third_party_sharing')).toBe(true);
    expect(found.has('arbitration')).toBe(true);
  });
});
