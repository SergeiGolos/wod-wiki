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
      { key: 'discipline', negate: false, values: [{ value: 'strength', wildcard: false }] },
      { key: 'effort', negate: true, values: [{ value: 'burpee', wildcard: false }] },
    ]);
    expect(parsed.groupBy).toEqual(['week', 'effort']);
    expect(parsed.rollup).toEqual({ size: 1, unit: 'w' });
  });

  it('parses wildcard tag values', () => {
    const parsed = parseQuery('max:tis{effort:back*}');
    expect(parsed.filters).toEqual([{ key: 'effort', negate: false, values: [{ value: 'back', wildcard: true }] }]);
  });

  it('parses multi-value tag filters (OR within a key)', () => {
    const parsed = parseQuery('sum:totalVolume{note:a|b|c}');
    expect(parsed.error).toBeUndefined();
    expect(parsed.filters).toEqual([
      { key: 'note', negate: false, values: [
        { value: 'a', wildcard: false },
        { value: 'b', wildcard: false },
        { value: 'c', wildcard: false },
      ] },
    ]);
  });

  it('parses multi-value tag filters with per-value wildcards and negation', () => {
    const parsed = parseQuery('sum:totalVolume{!effort:back*|squat*}');
    expect(parsed.error).toBeUndefined();
    expect(parsed.filters).toEqual([
      { key: 'effort', negate: true, values: [
        { value: 'back', wildcard: true },
        { value: 'squat', wildcard: true },
      ] },
    ]);
  });

  it('parses mixed single- and multi-value filters in the same query', () => {
    const parsed = parseQuery('sum:totalVolume{discipline:strength,effort:thruster|burpee} by {week}');
    expect(parsed.filters).toEqual([
      { key: 'discipline', negate: false, values: [{ value: 'strength', wildcard: false }] },
      { key: 'effort', negate: false, values: [
        { value: 'thruster', wildcard: false },
        { value: 'burpee', wildcard: false },
      ] },
    ]);
    expect(parsed.groupBy).toEqual(['week']);
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
