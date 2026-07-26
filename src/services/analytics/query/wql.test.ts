/**
 * WQL parser tests — the reference string parser the Lezer grammar replaces.
 * Defends the AST shape contract (the grammar ticket must produce the same).
 */
import { describe, expect, it } from 'bun:test';
import { parseQuery } from './wql';

describe('parseQuery', () => {
  it('parses the full surface: agg:metric{filters} by {dims} .rollup(period)', () => {
    const parsed = parseQuery('sum:totalVolume{discipline:strength,!effort:burpee} by {week,effort}.rollup(1w)');
    expect(parsed.error).toBeUndefined();
    expect(parsed.agg).toBe('sum');
    expect(parsed.metric).toBe('totalVolume');
    expect(parsed.filters).toEqual([
      { key: 'discipline', value: 'strength', negate: false, wildcard: false },
      { key: 'effort', value: 'burpee', negate: true, wildcard: false },
    ]);
    expect(parsed.groupBy).toEqual(['week', 'effort']);
    expect(parsed.rollup).toEqual({ size: 1, unit: 'w' });
  });

  it('parses wildcard tag values', () => {
    const parsed = parseQuery('max:tis{effort:back*}');
    expect(parsed.filters).toEqual([{ key: 'effort', value: 'back', negate: false, wildcard: true }]);
  });

  it('parses day rollups and bare heads', () => {
    expect(parseQuery('avg:tis{}.rollup(7d)').rollup).toEqual({ size: 7, unit: 'd' });
    const bare = parseQuery('count:totalReps');
    expect(bare.error).toBeUndefined();
    expect(bare.filters).toEqual([]);
    expect(bare.groupBy).toEqual([]);
  });

  it('rejects unknown aggregators', () => {
    expect(parseQuery('median:tis').error).toContain('Unknown aggregator');
  });

  it('rejects malformed heads', () => {
    expect(parseQuery('not a query').error).toContain('Cannot parse');
  });
});
