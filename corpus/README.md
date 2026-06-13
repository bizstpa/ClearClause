# Evaluation corpus

How the detector engine improves systematically instead of one policy at a time. This is **rule-based tuning, not model training** — no ML anywhere.

## Two parts

- **`excerpts.ts` (committed):** short excerpts only, each pinning a specific detector behaviour — a catch or a correct non-catch. Short quotes only, because committing many companies' full privacy-policy texts into a public repo is a copyright concern. Every pin is enforced on every test run by `src/detectors/corpus.test.ts`.
- **`local/` (gitignored):** drop full policy texts here as `.txt` files for bulk tuning. Never committed.

## Tuning workflow

1. Copy a full policy's text into `corpus/local/<company>.txt` — by hand, or with `npm run fetch -- <url> [name]`, which extracts the page's readable text for you. The fetcher fails loudly instead of writing junk when a page is JavaScript-rendered or bot-protected; paste manually in that case.
2. Run `npm run eval` — it runs all detectors over every local policy plus the committed excerpts and prints a per-policy, per-category summary (match counts and a sample matched line each), so misses and over-flags are visible across the whole set at a glance.
3. Run `npm run eval:misses` — it prints, per policy, every sentence that contains a sale, sharing, advertising, or retention keyword but was **not** flagged by a detector of the matching category. It is intentionally over-inclusive: most lines it prints are legitimate non-matches (business transfers, ad-buying, denials), and its job is to surface candidates for a human to judge so nothing important is silently dropped.
4. Tune patterns in `src/detectors/`.
5. **Pin every fix:** add a short excerpt with `mustFind` / `mustNotFind` expectations to `excerpts.ts` so the fix can't silently regress. Then `npm test`.

A clean `eval:misses` run proves the engine handles the **current corpus**, nothing more. Tuning only against known fixtures is how a detector becomes confidently wrong — keep adding fresh, untuned policies by hand.

## V2.2 tuning pass

A validation pass across 10 policies (ally, ebay, google, itch, npr, paypal, spotify, steam, stripe, telegram) drove these fixes, each pinned as a committed excerpt:

- **Sharing — contrastive negation** (`google-sharing-denial-with-exceptions`): a denial qualified by an exception carve-out ("we do not share … except in the following cases") is the disclosure; flat denials stay suppressed.
- **Sharing — recipient vocabulary & word order** (`sharing-recipient-vocabulary-and-order`): broader recipient nouns (parent company, financial institutions, payment networks/processors, professional advisors, member stations, …) and recipient-before-verb order ("Valve and its subsidiaries may share your data").
- **Sharing — legal process** (`legal-process-disclosure`): disclosure under subpoena/court order/legal process/law enforcement/"as required by law" is flagged; security boilerplate ("unauthorized disclosure") is not.
- **Sharing — scope boilerplate** (`ebay-scope-not-sharing`): "services provided by X or its affiliates" no longer reads as sharing; "provide" needs a data object.
- **Collection — negation** (`sensitive-collection-negation`): "we don't show ads based on sensitive categories such as race …" no longer flags as warning-severity collection.
- **Retention — number formats** (`retention-number-formats`): spelled-out ("one year"), reversed ("30 (thirty) days"), and criteria-based ("for different periods depending on …") retention now caught, with the existing specific-vs-vague framing preserved.
- **Fetch dedup**: `scripts/fetch-policy.ts` collapses exact-duplicate paragraphs (eBay rendered its notice twice, ~2× inflation).

Result across the corpus: third-party-sharing recall rose on Telegram (2→3), PayPal (34→52), Google (6→7), Stripe (24→39), NPR (26→35), Spotify (8→12), and Steam (6→9); candidate misses fell ~16% (666→557). Data-sale behavior was unchanged (Stripe 3→3; business transfer still routes to sharing, not sale). Remaining candidate misses (event-based retention, and "advertising"-family lines, which are not a detector category) are left for human review — not tuned in this pass.
