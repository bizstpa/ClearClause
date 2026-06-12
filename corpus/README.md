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
