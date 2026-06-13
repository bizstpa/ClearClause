// Builds the Manifest V3 extension into dist-extension/, which is what loads via
// chrome://extensions -> Load unpacked. Uses Vite's JS API so we stay on the
// existing toolchain (no new bundler). Two passes because the popup is an ES
// module page while the injected extraction script must be a self-contained
// classic script.
import { build } from 'vite';
import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const extDir = resolve(root, 'extension');
const outDir = resolve(root, 'dist-extension');

// Pass 1: the popup page (HTML + ES module + CSS). base './' keeps asset URLs
// relative so they resolve under chrome-extension://<id>/.
await build({
  configFile: false,
  root: extDir,
  base: './',
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: { popup: resolve(extDir, 'popup.html') },
    },
  },
});

// Pass 2: the extraction script. It is injected as a file via
// chrome.scripting.executeScript, which runs files as classic scripts, so it
// must be a single self-contained bundle (Readability inlined) — hence IIFE.
// emptyOutDir:false so it lands alongside the popup from pass 1.
await build({
  configFile: false,
  build: {
    outDir,
    emptyOutDir: false,
    lib: {
      entry: resolve(extDir, 'src/extract.ts'),
      formats: ['iife'],
      name: 'ClearClauseExtract',
      fileName: () => 'extract.js',
    },
  },
});

// Static assets Vite doesn't process as part of the popup graph.
mkdirSync(resolve(outDir, 'icons'), { recursive: true });
cpSync(resolve(extDir, 'manifest.json'), resolve(outDir, 'manifest.json'));
for (const size of [16, 32, 48, 128]) {
  cpSync(resolve(extDir, `icons/icon-${size}.png`), resolve(outDir, `icons/icon-${size}.png`));
}

console.log('Extension built into dist-extension/. Load it via chrome://extensions -> Load unpacked.');
