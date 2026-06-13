// Background service worker — registers a privacy-preserving toolbar hint.
//
// On pages whose URL looks like a privacy policy, Chrome swaps the toolbar icon
// to a "hint" variant before the user clicks. The match is evaluated entirely
// inside the browser via chrome.declarativeContent + PageStateMatcher: the
// extension declares a URL-pattern rule once and only ever learns that *a* rule
// matched — it never receives the tab's URL or any browsing history. That is the
// whole reason declarativeContent.SetIcon takes pre-rendered ImageData rather
// than a path: it needs no host permission, no `tabs` permission, and no page
// read. The only permission this adds over activeTab + scripting is
// `declarativeContent`. Nothing here makes a network call or reads page content.

// URL signals mirror looksLikePrivacyPolicy's URL side. `urlContains` matches a
// substring anywhere in the URL, so 'privacy' already covers privacy-policy and
// privacy-notice; the rest are listed for parity with the popup's heuristic.
const URL_SIGNALS = ['privacy', 'privacy-policy', 'legal/privacy', 'privacy-notice'];

/**
 * Draw the "this looks like a policy" icon at a given size. Generated at runtime
 * with OffscreenCanvas so SetIcon gets ImageData (no fetch of a packaged PNG,
 * which would put a network primitive in the bundle). A filled rounded square in
 * the brand green with a white dot reads as an active/alert state distinct from
 * the default icon.
 */
function drawHintIcon(size: number): ImageData {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d')!;
  const r = size * 0.25;

  ctx.fillStyle = '#1a7f5a';
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(size, 0, size, size, r);
  ctx.arcTo(size, size, 0, size, r);
  ctx.arcTo(0, size, 0, 0, r);
  ctx.arcTo(0, 0, size, 0, r);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.18, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

function buildActions(): chrome.events.Rule['actions'] {
  const actions: chrome.events.Rule['actions'] = [
    new chrome.declarativeContent.ShowAction(),
  ];
  // SetIcon is the visible hint; if ImageData generation ever fails, fall back to
  // ShowAction alone (the in-popup hint still informs the user) rather than
  // losing the whole rule.
  try {
    actions.push(
      new chrome.declarativeContent.SetIcon({
        imageData: { 16: drawHintIcon(16), 32: drawHintIcon(32) },
      }),
    );
  } catch {
    /* keep ShowAction-only */
  }
  return actions;
}

function registerHintRule(): void {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: URL_SIGNALS.map(
          (signal) =>
            new chrome.declarativeContent.PageStateMatcher({
              pageUrl: { urlContains: signal },
            }),
        ),
        actions: buildActions(),
      },
    ]);
  });
}

chrome.runtime.onInstalled.addListener(registerHintRule);
