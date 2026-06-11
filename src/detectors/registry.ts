import type { Category, Detector, DetectorResult } from './types';
import { dataSale } from './data-sale';
import { arbitration } from './arbitration';
import { classActionWaiver } from './class-action-waiver';

// The single registration point: a new detector is one new file plus one
// entry here. See CLAUDE.md "Architecture rules".
export const detectors: readonly Detector[] = [dataSale, arbitration, classActionWaiver];

/** Run every registered detector and aggregate matches by category. */
export function runDetectors(text: string): DetectorResult[] {
  const byCategory = new Map<Category, DetectorResult>();
  for (const detector of detectors) {
    const matches = detector.detect(text);
    const existing = byCategory.get(detector.category);
    if (existing) {
      existing.matches.push(...matches);
      existing.found = existing.found || matches.length > 0;
    } else {
      byCategory.set(detector.category, {
        category: detector.category,
        found: matches.length > 0,
        matches,
      });
    }
  }
  return [...byCategory.values()];
}
