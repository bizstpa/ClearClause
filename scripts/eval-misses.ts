// Candidate-miss report: scan every corpus document sentence-by-sentence for
// keyword families (sale/sharing, advertising, retention) and print each
// sentence that contains a family keyword but was NOT flagged by a detector
// of a matching category.
//
// This report is intentionally OVER-INCLUSIVE. It surfaces candidates for a
// human to judge, not verdicts — many printed lines are legitimate
// non-matches (business transfers, ad-buying, denials). Its job is to make
// sure nothing important is silently dropped: it is the automated version of
// the manual grep pass that found the Stripe sale-detector bug.
//
// Usage: npm run eval:misses
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runDetectors } from '../src/detectors/registry';
import { segmentSentences } from '../src/detectors/segment';
import type { Category } from '../src/detectors/types';
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

// A sentence containing one of a family's keywords is expected to be flagged
// by a detector in one of the family's categories; otherwise it prints as a
// candidate miss. Keywords are matched as case-insensitive substrings, so
// stems like "advertis" cover advertising/advertisers/advertisement.
interface Family {
  name: string;
  keywords: string[];
  categories: Category[];
}

// Sale and sharing keywords map to separate categories on purpose: a sale
// admission inside a sentence the sharing detector already flags must still
// print as a data_sale candidate (that masking is exactly how the Stripe
// CCPA "sale" admission went unnoticed).
const families: Family[] = [
  {
    name: 'sale',
    keywords: ['sell', 'sold', 'sale', 'in exchange', 'consideration'],
    categories: ['data_sale'],
  },
  {
    name: 'sharing',
    keywords: ['share', 'disclos'],
    categories: ['third_party_sharing'],
  },
  {
    name: 'advertising',
    keywords: ['advertis', 'ad partner', 'ad network', 'interest-based'],
    categories: ['data_sale', 'third_party_sharing'],
  },
  {
    name: 'retention',
    keywords: ['retain', 'retention', 'as long as', 'period'],
    categories: ['retention'],
  },
];

const clip = (s: string, max = 140) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

console.log(
  `ClearClause eval:misses — sentences with family keywords not flagged in a matching category.`,
);
console.log(
  `Over-inclusive by design: these are candidates for a human to judge, not verdicts.\n`,
);

let total = 0;

for (const doc of docs) {
  // Detectors and this report segment the same text the same way, so a
  // match's character index identifies its sentence exactly.
  const flagged = new Map<Category, Set<number>>();
  for (const result of runDetectors(doc.text)) {
    flagged.set(result.category, new Set(result.matches.map((m) => m.index)));
  }

  const lines: string[] = [];
  for (const { sentence, index } of segmentSentences(doc.text)) {
    const lower = sentence.toLowerCase();
    for (const family of families) {
      if (!family.keywords.some((k) => lower.includes(k))) continue;
      if (family.categories.some((c) => flagged.get(c)?.has(index))) continue;
      lines.push(`  [${family.name}] "${clip(sentence)}"`);
    }
  }

  console.log(`=== ${doc.name} — ${lines.length} candidate miss${lines.length === 1 ? '' : 'es'} ===`);
  for (const line of lines) console.log(line);
  console.log('');
  total += lines.length;
}

console.log(`${total} candidate misses across ${docs.length} documents.`);
