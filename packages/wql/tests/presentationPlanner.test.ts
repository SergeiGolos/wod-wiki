import { describe, expect, it } from 'vitest';
import { resolveScalarEndpoint, scatterPairedOnly } from '../src/presentationPlanner';

describe('ticket 23 — scalar endpoint policy', () => {
  it('value widgets take the last point; override is explicit', () => {
    const series = [3, 7, 5];
    expect(resolveScalarEndpoint(series)).toBe(5);
    expect(resolveScalarEndpoint(series, 'first')).toBe(3);
  });

  it('absent renders as absent — the ?? 0 conflation is dead', () => {
    expect(resolveScalarEndpoint([])).toBeUndefined();
    expect(resolveScalarEndpoint([4, null])).toBeUndefined();
    expect(resolveScalarEndpoint([4, undefined])).toBeUndefined();
    expect(resolveScalarEndpoint([0])).toBe(0); // recorded zero participates
  });
});

describe('ticket 23 — scatter paired-only display', () => {
  it('plots both-observed positions; one-sided stay flagged partials', () => {
    const view = scatterPairedOnly<number, number>([
      { a: 1, b: 2 },
      { a: 3, b: undefined },
      { a: undefined, b: 4 },
      { a: 5, b: 6 },
    ]);
    expect(view.paired).toEqual([
      { a: 1, b: 2 },
      { a: 5, b: 6 },
    ]);
    expect(view.partials).toEqual([
      { a: 3, b: undefined },
      { a: undefined, b: 4 },
    ]);
  });
});
