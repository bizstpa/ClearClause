# Evaluation corpus

How the detector engine improves systematically instead of one policy at a time. This is **rule-based tuning, not model training** — no ML anywhere.

## Two parts

- **`excerpts.ts` (committed):** short excerpts only, each pinning a specific detector behaviour — a catch or a correct non-catch. Short quotes only, because committing many companies' full privacy-policy texts into a public repo is a copyright concern. Every pin is enforced on every test run by `src/detectors/corpus.test.ts`.
- **`local/` (gitignored):** drop full policy texts here as `.txt` files for bulk tuning. Never committed.

## Tuning workflow

1. Copy a full policy's text into `corpus/local/<company>.txt`.
2. Run `npm run eval` — it runs all detectors over every local policy plus the committed excerpts and prints a per-policy, per-category summary (match counts and a sample matched line each), so misses and over-flags are visible across the whole set at a glance.
3. Tune patterns in `src/detectors/`.
4. **Pin every fix:** add a short excerpt with `mustFind` / `mustNotFind` expectations to `excerpts.ts` so the fix can't silently regress. Then `npm test`.
