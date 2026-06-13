# ClearClause — Privacy Policy Analyzer

ClearClause is a privacy policy analyzer (English-only). It gives you a structured, plain-language readout of what a document says on six high-stakes dimensions, along with the exact sentences that triggered each flag, so you can read the source language yourself.

It ships two ways, both driven by the same detector engine:

- **Web app** — paste a privacy policy or app terms into the page. ([Live](https://bizstpa.github.io/ClearClause/))
- **Chrome extension** — scan the privacy policy on the page you're already on, with one click.

## The six detectors

- **Data collected** — categories of data collected, severity-ranked: ordinary fields (name, email, device identifiers) are informational, while sensitive items — SSN and government IDs, financial and medical information, protected classifications, biometrics, precise geolocation (GPS/Bluetooth/WiFi), session-replay/keystroke capture, and profiling/inferences — are ranked as warnings. A denial of collection or use ("we don't show ads based on sensitive categories such as race …") is not mistaken for collection.
- **Data sale** — sale language including the careful kind that never says "sell": non-monetary consideration ("allow … to collect … in exchange for …") and past-sale disclosures ("we may have sold the following categories …"). Negations ("we do not sell …") are never labelled as sales, and sentences about your *rights regarding* sale (opt-out, access requests) are kept out of the finding.
- **Third-party sharing** — disclosure to affiliates, parent companies, service providers, financial institutions, payment networks/processors, advertising and analytics providers, professional advisors, other account holders, named third-party processors ("shared with Google or Microsoft"), and the like, in either word order ("we share … with X" or "X may share your data") and including recipients introduced as a list ("we share your data with: (1) … (2) …"). Includes legal-process disclosure (subpoenas, court orders, judicial/lawful orders, law enforcement and other authorities, "as required by law"), business-transfer, and cross-border transfer language. A denial qualified by a carve-out ("we do not share … except in the following cases") is read as the disclosure it is; flat denials and security boilerplate ("protect against unauthorized disclosure") are not flagged.
- **Retention** — vague, indefinite, or criteria-based retention ("as long as necessary", "duration of our relationship", "for different periods depending on …") is flagged as the concern; specific periods — digits, spelled-out ("one year"), or mixed ("30 (thirty) days") — are reported as informative.
- **Binding arbitration** — mandatory/binding arbitration clauses and court/jury waivers.
- **Class-action waiver** — waivers of class or collective action.

## Browser extension

The same engine, wrapped in a Manifest V3 Chrome extension that reads the policy from the page you're actually on — including JavaScript-rendered and login-gated pages that a server-side fetch can't reach, because the page is already rendered in your browser.

How it works: click the toolbar icon and the popup opens. If the page looks like a privacy policy (judged from its URL and title), the popup says so — but it never reads the page on its own. You click **Scan this page**; the extension extracts the main text with Mozilla's [Readability](https://github.com/mozilla/readability) (run on a clone of the live page, dropping nav/footer/cookie chrome), runs the detectors, and shows the same readout as the web app. If a page yields little usable text (collapsed sections, multi-page policies, PDFs), the popup falls back to **scanning your current selection** or a **paste box** — never a dead end.

Its privacy posture mirrors the web app and is non-negotiable:

- **Zero network calls.** No remote host permissions and no `fetch`/XHR anywhere — the policy text never leaves your machine.
- **Reads a page only when you click.** Permissions are limited to `activeTab` + `scripting`; there are no host permissions, no `<all_urls>`, and no passive/background page reading. The page is read solely on your explicit action.

### Load it (unpacked)

```sh
npm install
npm run build:extension     # builds into dist-extension/
```

Then in Chrome: open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the `dist-extension/` folder. Pin the ClearClause icon and click it on any privacy-policy page.

> Chrome Web Store submission is out of scope for now — the extension ships load-unpacked.

## Privacy promise

**Analysis runs entirely in your browser. The text you paste — or that the extension reads from the open page — never leaves your machine.** There is no backend, no API key, and no network call during analysis in either the web app or the extension. You can verify this yourself in your browser's Network tab (the extension fires zero requests when scanning).

## Not legal advice

ClearClause is a screening aid. It surfaces candidate language for you to read; it does not interpret documents or give legal advice. For decisions that matter, consult a lawyer.

## Evaluation corpus

Detector tuning is systematic, not anecdotal: `npm run eval` runs every detector over the committed regression excerpts plus any full policy texts you drop into the gitignored `corpus/local/` folder, and prints a per-policy, per-category summary. `npm run eval:misses` prints the candidate misses — sentences containing sale/sharing, advertising, or retention keywords that no detector of the matching category flagged — deliberately over-inclusive, for a human to judge. `npm run fetch -- <url>` fetches a policy page into `corpus/local/` (tuning-time convenience only; it fails loudly on JS-rendered or bot-protected pages rather than writing junk, and collapses exact-duplicate paragraphs so pages that render the same notice twice don't inflate counts). Every tuning fix is pinned as a committed excerpt so it can't silently regress. See [corpus/README.md](corpus/README.md). Rule-based only — no machine learning.

## Development

```sh
npm install
npm run dev          # local dev server
npm test             # unit + corpus regression tests
npm run eval         # cross-policy detector summary
npm run eval:misses  # candidate detector misses (over-inclusive, human-judged)
npm run fetch -- <url>  # fetch a policy into gitignored corpus/local/
npm run build        # static web build (deployed to GitHub Pages)
npm run build:extension  # MV3 extension build into dist-extension/ (load unpacked)
```

The detector engine in `src/detectors/` is shared by both targets through `src/engine.ts` and is never forked — the web app and the extension run identical detection and render the readout through the same `src/readout.ts`.

## License

MIT — see [LICENSE](LICENSE).

## Status

**Status: in development.** Live at: <https://bizstpa.github.io/ClearClause/>
