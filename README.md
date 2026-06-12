# ClearClause — Privacy Policy Analyzer

ClearClause is a privacy policy analyzer (English-only). Paste a privacy policy or app terms into the page and get back a structured, plain-language readout of what the document says on six high-stakes dimensions, along with the exact sentences that triggered each flag, so you can read the source language yourself.

## The six detectors

- **Data collected** — categories of data collected, severity-ranked: ordinary fields (name, email, device identifiers) are informational, while sensitive items — SSN and government IDs, financial and medical information, protected classifications, biometrics, precise geolocation (GPS/Bluetooth/WiFi), session-replay/keystroke capture, and profiling/inferences — are ranked as warnings.
- **Data sale** — sale language including the careful kind that never says "sell": non-monetary consideration ("allow … to collect … in exchange for …") and past-sale disclosures ("we may have sold the following categories …"). Negations ("we do not sell …") are never labelled as sales, and sentences about your *rights regarding* sale (opt-out, access requests) are kept out of the finding.
- **Third-party sharing** — disclosure to affiliates, service providers, advertising networks, analytics providers, government entities, and the like, plus business-transfer and cross-border transfer language.
- **Retention** — vague or indefinite retention ("as long as necessary", "duration of our relationship") is flagged as the concern; specific periods ("twelve (12) months") are reported as informative.
- **Binding arbitration** — mandatory/binding arbitration clauses and court/jury waivers.
- **Class-action waiver** — waivers of class or collective action.

## Privacy promise

**Analysis runs entirely in your browser. The text you paste never leaves your machine.** There is no backend, no API key, and no network call during analysis — you can verify this yourself in your browser's Network tab.

## Not legal advice

ClearClause is a screening aid. It surfaces candidate language for you to read; it does not interpret documents or give legal advice. For decisions that matter, consult a lawyer.

## Evaluation corpus

Detector tuning is systematic, not anecdotal: `npm run eval` runs every detector over the committed regression excerpts plus any full policy texts you drop into the gitignored `corpus/local/` folder, and prints a per-policy, per-category summary. `npm run eval:misses` prints the candidate misses — sentences containing sale/sharing, advertising, or retention keywords that no detector of the matching category flagged — deliberately over-inclusive, for a human to judge. `npm run fetch -- <url>` fetches a policy page into `corpus/local/` (tuning-time convenience only; it fails loudly on JS-rendered or bot-protected pages rather than writing junk). Every tuning fix is pinned as a committed excerpt so it can't silently regress. See [corpus/README.md](corpus/README.md). Rule-based only — no machine learning.

## Development

```sh
npm install
npm run dev          # local dev server
npm test             # unit + corpus regression tests
npm run eval         # cross-policy detector summary
npm run eval:misses  # candidate detector misses (over-inclusive, human-judged)
npm run fetch -- <url>  # fetch a policy into gitignored corpus/local/
npm run build        # static build (deployed to GitHub Pages)
```

## License

MIT — see [LICENSE](LICENSE).

## Status

**Status: in development.** Live at: <https://bizstpa.github.io/ClearClause/>
