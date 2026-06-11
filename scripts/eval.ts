// Evaluation harness: run every detector over the committed corpus excerpts
// plus any full policy texts dropped into corpus/local/ (gitignored), and
// print a per-policy, per-category summary so misses and over-flags are
// visible across the whole set at a glance.
//
// Usage: npm run eval        (rule-based tuning aid — no ML, no network)
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectors, runDetectors } from '../src/detectors/registry';
import { excerpts } from '../corpus/excerpts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const localDir = join(root, 'corpus', 'local');

interface Doc {
  name: string;
  text: string;
}

const docs: Doc[] = excerpts.map((e) => ({ name: `excerpt:${e.name}`, text: e.text }));

if (existsSync(localDir)) {
  for (const file of readdirSync(localDir).filter((f) => f.endsWith('.txt')).sort()) {
    docs.push({ name: `local:${basename(file, '.txt')}`, text: readFileSync(join(localDir, file), 'utf8') });
  }
}

const categories = [...new Set(detectors.map((d) => d.category))];
const pad = Math.max(...categories.map((c) => c.length)) + 2;
const totals = new Map(categories.map((c) => [c, 0]));

const clip = (s: string, max = 90) =>
  s.length > max ? `${s.slice(0, max - 1)}…` : s;

console.log(`ClearClause eval — ${excerpts.length} committed excerpt(s), ${docs.length - excerpts.length} local polic${docs.length - excerpts.length === 1 ? 'y' : 'ies'}\n`);

for (const doc of docs) {
  console.log(`=== ${doc.name} ===`);
  const results = new Map(runDetectors(doc.text).map((r) => [r.category, r]));
  for (const category of categories) {
    const matches = results.get(category)?.matches ?? [];
    totals.set(category, (totals.get(category) ?? 0) + matches.length);
    const count = String(matches.length).padStart(3);
    const sample = matches.length > 0 ? `  e.g. "${clip(matches[0].sentence)}"` : '';
    console.log(`  ${category.padEnd(pad)}${count}${sample}`);
  }
  console.log('');
}

console.log('=== totals across all documents ===');
for (const category of categories) {
  console.log(`  ${category.padEnd(pad)}${String(totals.get(category)).padStart(4)}`);
}

if (docs.length === excerpts.length) {
  console.log('\nTip: drop full policy texts as .txt files into corpus/local/ for bulk tuning (see corpus/README.md).');
}
