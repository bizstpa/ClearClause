# CLAUDE.md — Privacy Policy Analyzer

Instructions for any Claude Code session working in this repo. Read this fully before editing anything.

## What this project is
An English-language Privacy Policy Analyzer. A user pastes a privacy policy or app terms into the page and gets back a structured, plain-language readout plus the specific sentences that triggered each flag (data collected, data sale, third-party sharing, retention, binding arbitration, class-action waiver).

## Non-negotiable constraints
- **Runs entirely in the browser.** V1 has no backend, no server, no API key, and makes **zero network calls during analysis**. The pasted text must never leave the user's machine. This is the product's core promise — do not break it, not even "temporarily" or "just for testing."
- **Defensive and privacy-empowering only.** This tool helps people understand documents that apply to them. Never add anything that probes, scrapes, attacks, or deceives.
- **Surfaces, does not adjudicate.** The tool highlights candidate clauses and reports what language is *present*. It does not give legal advice or assert legal conclusions. UI copy and the readout must reflect this — e.g. "Language about selling data: found," never "This company sells your data." Keep a short not-legal-advice note visible in the UI.
- **Open source, MIT licensed, built in public** from the first commit.

## Tech stack
- Vite + TypeScript. No framework for V1 (plain TS + DOM is fine). Do not add React/Vue/etc. unless explicitly asked.
- Vitest for unit tests (ships cleanly with Vite).
- Deploy target: GitHub Pages (static build).
- No runtime dependency that makes network calls. Keep the dependency tree minimal and auditable.

## Architecture rules
- **The detector engine is isolated.** All detection logic lives under `src/detectors/` and has **no dependency on the DOM or any UI code**. Detectors are pure functions: text in, structured results out. This isolation is deliberate — it lets the same engine later be wrapped in a Chrome extension or swapped behind an LLM without a rewrite. Never import UI modules into detector code.
- **Uniform detector contract.** Every detector implements the shared `Detector` interface (see SPEC.md). Adding a new check means adding one file that exports a `Detector` and registering it in one place. No special-casing.
- **UI strings are data.** All user-facing strings live in one strings module (`src/strings.ts`), not scattered through UI code. The product is English-only for now; if other languages return later, that module is the seam.

## How to work in this repo
- Make small, reviewable commits with clear messages (conventional-commits style: `feat:`, `fix:`, `test:`, `docs:`, `chore:`). The commit history is part of the deliverable here, so no giant catch-all commits.
- Write or update a test when you add or change a detector.
- After a meaningful unit of work, stop and report what changed rather than running on into unrequested scope. Ask before adding features beyond the current task.
- Never commit secrets, keys, or `.env` files. There are no secrets in V1 at all.

## Chrome extension (in scope as of V3)
The detector engine is now also shipped as a Manifest V3 Chrome extension that reads the
policy from the page the user is actually on. The extension is an *added* build target — the
web app must keep working and deploying. Its privacy posture is non-negotiable and mirrors the
web app:
- **Zero network calls.** No remote host permissions, no `fetch`/XHR during analysis. The
  policy text never leaves the user's machine.
- **Read a page only on explicit user action.** No passive injection or page reading. The
  extension uses the toolbar action (icon click) + `activeTab` — the page is read only when the
  user clicks to scan. **Permissions are limited to `activeTab` + `scripting`**; no host
  permissions, no `<all_urls>`, no broad content-script injection. Minimal permissions are part
  of the product, not a nice-to-have.
- **Reuse the engine unchanged.** Detection logic in `src/detectors/` is imported by both build
  targets, never forked or modified for the extension. Shared readout rendering lives in
  `src/readout.ts` so the popup and the web app render results identically.
- Live-page text is extracted with Mozilla's Readability on a clone of the rendered `document`.
  When extraction is thin, the popup degrades to "scan the current selection" or a paste box —
  never a dead end. See SPEC.md for the extension flow.

## Out of scope for V1 (do not build unless asked)
- LLM-generated summaries or any API integration (parked as a future bring-your-own-key feature).
- Auto-fetching or scraping a page's policy from a URL (the extension reads the *already-open*
  page on user action; it never navigates to or fetches a remote page).
- User accounts, login, saved history, analytics, or any telemetry.
- Chrome Web Store submission (the extension ships as load-unpacked for now).
