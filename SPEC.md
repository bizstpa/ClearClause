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
- **third_party_sharing** — sharing/disclosure of data with third parties, partners, affiliates, advertisers.
- **data_collection** — categories of data collected (location, contacts, device identifiers, biometrics, browsing).
- **retention** — how long data is kept; flag both explicit periods and vague/indefinite language ("as long as necessary", "indefinitely").

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

## Non-goals for V1
LLM summaries, any API/key, Chrome extension packaging, auto-fetching page policies, accounts, history, analytics/telemetry.
