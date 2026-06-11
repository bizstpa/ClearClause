import { describe, expect, it } from 'vitest';
import { runDetectors } from './registry';

describe('runDetectors', () => {
  it('returns one result per registered category with found flags', () => {
    const results = runDetectors(
      'We may sell your personal information. Disputes are resolved through binding arbitration.',
    );
    const byCategory = Object.fromEntries(results.map((r) => [r.category, r]));

    expect(byCategory.data_sale.found).toBe(true);
    expect(byCategory.arbitration.found).toBe(true);
    expect(byCategory.class_action_waiver.found).toBe(false);
    expect(byCategory.class_action_waiver.matches).toEqual([]);
  });

  it('reports nothing found on benign text', () => {
    const results = runDetectors('We bake bread daily. Visit our store anytime.');
    expect(results.every((r) => !r.found)).toBe(true);
  });
});
