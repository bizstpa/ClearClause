# SPEC.md — Privacy Policy Analyzer, V1

The durable product + technical spec for V1. CLAUDE.md governs *how* to build; this governs *what* V1 is.

## Goal
Paste a privacy policy and get (1) a structured readout of what the policy does on a handful of high-stakes dimensions, and (2) the exact sentences that triggered each finding, so the user can read the source language themselves.

## User flow
1. User opens the page (English-only).
2. User pastes policy text into a textarea and clicks Analyze.
3. Analysis runs synchronously, in-browser. No network call.
4. Results render: a readout summary at the top, then per-category flagged sentences below, each quoting the matched sentence verbatim.

## The detector contract
```ts
type Category =
  | 'data_collection'
  | 'data_sale'
  | 'third_party_sharing'
  | 'retention'
  | 'arbitration'
  | 'class_action_waiver';

type Severity = 'info' | 'caution' | 'warning';

interface Match {
  detectorId: string;
  sentence: string;   // the matched sentence, verbatim, for display
  index: number;      // character offset in the source text
  severity?: Severity; // per-match override; defaults to the detector's severity
}

interface DetectorResult {
  category: Category;
  found: boolean;     // did this detector match anything?
  matches: Match[];
}

interface Detector {
  id: string;
  category: Category;
  label: string;
  severity: Severity;
  detect(text: string): Match[];
}
```
A detector is a pure function — text in, matches out. No DOM, no network, no shared mutable state. The engine runs every registered detector and aggregates results by category into the readout.

## Sentence segmentation
Detectors quote whole sentences, so the engine needs a shared `segmentSentences(text)` helper.
- Split on `.`, `?`, `!` with handling for common false breaks ("U.S.", "e.g.", "Inc.").
- Keep this in one util so all detectors share it.

## V1 detectors
Each reports `found` plus the sentences that triggered it. Detectors flag *candidate* language for the user to read; they do not assert a legal conclusion, and the readout wording reflects that.

- **data_sale** — language indicating personal data is or may be sold. Handle negation: "we do not sell…" is a different finding from "we sell…". V1 may surface both but must never label a no-sale sentence as a sale. When uncertain, surface the sentence under a neutral "mentions selling data" framing rather than asserting it.
- **arbitration** — binding/mandatory arbitration clauses ("binding arbitration", "resolved through arbitration", "waive your right to … court").
- **class_action_waiver** — waiver of class/collective action ("class action waiver", "on an individual basis", "not as a … class").
- **third_party_sharing** — sharing/disclosure of data with third parties, partners, affiliates, advertisers, plus business-transfer and cross-border transfer language.
- **data_collection** — categories of data collected, severity-ranked per match: ordinary fields (name, email, device identifiers) are `info`; sensitive items (SSN, government IDs, financial/medical information, protected classifications, biometrics, precise geolocation, session-replay/keystroke capture, profiling/inferences) are `warning`.
- **retention** — how long data is kept; vague/indefinite language ("as long as necessary", "duration of our relationship") is the concern (`caution`), while specific periods ("twelve (12) months") are reported as informative (`info`).

## Readout
For each category: found / not found, severity, and a count of matched sentences, with the sentences expandable beneath. The readout is a screening aid, not legal advice; a short disclaimer to that effect is always visible.

## UI
- English-only.
- All strings from a single strings module; nothing hardcoded in UI code.
- Plain, legible, no branding needed for V1. Accessible contrast and keyboard operability.

## Testing
- Vitest unit tests per detector against short fixture strings (a positive case and a negation/near-miss case each).
- At least one fixture built from a real, well-known policy to catch over- and under-flagging.

## Deploy
Static Vite build deployed to GitHub Pages. The live URL goes in the README.

## Chrome extension (V3)
The same engine, wrapped in a Manifest V3 extension that reads the policy from the page the
user is already on. The engine and detector contract are unchanged; only the input source and
the surrounding shell differ.

### Privacy constraints (non-negotiable, mirror the web app)
- **Zero network calls.** No remote host permissions, no `fetch`/XHR during analysis.
- **Explicit user action only.** Reading a page happens solely when the user clicks the toolbar
  icon and then scans. No passive injection, no background page reading.
- **Minimal permissions.** `activeTab` + `scripting` + `declarativeContent` only. No host
  permissions, no `<all_urls>`, no `tabs` permission, no persistent content scripts. A minimal
  background service worker exists solely to register the `declarativeContent` URL-pattern rule
  that powers the toolbar-icon hint; it reads no page content and makes no network call.

### Flow
1. User clicks the toolbar icon → popup opens. `activeTab` grants transient access to the
   current tab on this invocation.
2. The popup reads the active tab's URL + title and computes a *hint* (`looksLikePrivacyPolicy`)
   — URL contains `privacy`, `privacy-policy`, `legal/privacy`, `privacy-notice`, or the title
   carries policy keywords. The hint only surfaces a "this looks like a privacy policy — scan
   it?" affordance; it never triggers a read on its own. The toolbar icon also carries this hint
   *before* the popup opens: a `declarativeContent` rule (registered by a minimal background
   service worker) matches the same URL signals entirely inside Chrome and swaps the action icon
   to a hint variant via `SetIcon`. Because Chrome evaluates the URL, the extension only learns
   that a rule matched — it never receives the URL or browsing history, and this needs no `tabs`
   or host permission (only `declarativeContent`).
3. User clicks **Scan this page** → the popup injects `extract.js` (bundled Readability) via
   `chrome.scripting.executeScript`, which clones the live `document`, runs Readability to drop
   nav/footer/sidebar/cookie chrome, and returns the main text. Because the page is already
   rendered in the user's browser, JS-rendered and login-gated pages are reachable.
   The recovered text is cleaned before it reaches the engine so on-page wayfinding isn't
   analyzed as policy language: in-page nav and table-of-contents jump-link lists are stripped
   from the clone, standalone headings (`h1`–`h6`, `role="heading"`) are dropped rather than
   emitted as sentences, and exact-duplicate blocks are collapsed. Two further rules catch
   styled subheaders with no heading markup (e.g. a recurring "Information You Provide Us"
   rendered as a plain `<p>`): a short line that recurs 3+ times collapses to one instance, and a
   short, punctuation-less block that recurs is treated as a heading and not emitted. All three
   conditions (short, no sentence-ending punctuation, recurring) must hold, so one-off short
   lines and short sentences ending in a period are kept. Cleaning errs toward keeping body text
   — when a block is ambiguous between navigation and content, it is kept. This lives entirely in
   the extraction layer; the detector engine (`src/detectors/`) is unchanged.
4. The extracted text is piped into the existing engine (`runDetectors`) and the popup renders
   the shared readout (`src/readout.ts`).

### Fallbacks (required)
Auto-extraction can return thin/empty text (collapsed accordions, multi-page policies, PDFs).
When the extracted text is below a usable threshold, the popup offers, in order of effort:
- **Scan selected text** — reads `window.getSelection()` on the page (still user-action-gated).
- **Paste box** — the ultimate fallback; the user pastes text directly into the popup.
Both feed the same `runDetectors` engine. A failed auto-extract degrades gracefully, never a
dead end.

### Build target
`extension/` holds the manifest, popup HTML/CSS, and the popup + extraction sources. The
extension build (`npm run build:extension`) bundles into `dist-extension/`, which is what loads
via `chrome://extensions` → Load unpacked. The web app build is unaffected.

## Non-goals for V1
LLM summaries, any API/key, auto-fetching/scraping page policies from a URL, accounts, history,
analytics/telemetry, Chrome Web Store submission.
