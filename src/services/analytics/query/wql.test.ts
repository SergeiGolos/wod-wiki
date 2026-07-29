/**
 * WQL parser tests — the reference string parser the Lezer grammar replaces.
 * Defends the AST shape contract (the grammar ticket must produce the same).
 */
import { describe, expect, it } from 'bun:test';
import { parseQuery as _parseQuery, isFindQuery, type ParsedQuery } from './wql';

// All tests in this file use analytics queries (not find: queries) — narrow
// the union type so .agg/.metric/.groupBy are accessible.
function parseQuery(raw: string): ParsedQuery {
  return _parseQuery(raw) as ParsedQuery;
}

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

  it('parses the display unit directive at the end of the query', () => {
    const parsed = parseQuery('sum:totalVolume{} by {week}.rollup(1w) in kg');
    expect(parsed.error).toBeUndefined();
    expect(parsed.displayUnit).toBe('kg');
    expect(parsed.agg).toBe('sum');
    expect(parsed.metric).toBe('totalVolume');
    expect(parsed.groupBy).toEqual(['week']);
    expect(parsed.rollup).toEqual({ size: 1, unit: 'w' });
  });

  it('parses display unit directive on bare and filtered queries', () => {
    expect(parseQuery('avg:tis{} in lb').displayUnit).toBe('lb');
    expect(parseQuery('sum:totalVolume{discipline:strength} in kg').displayUnit).toBe('kg');
  });

  it('does not treat "in" inside filters as a display directive', () => {
    const parsed = parseQuery('sum:totalVolume{note:in}');
    expect(parsed.error).toBeUndefined();
    expect(parsed.displayUnit).toBeUndefined();
    expect(parsed.filters).toEqual([{ key: 'note', negate: false, values: [{ value: 'in', wildcard: false }] }]);
  });

  it('errors on a dangling "in" without a unit', () => {
    expect(parseQuery('sum:totalVolume{} in').error).toContain('Cannot parse');
  });
});

// ── Find query tests ──────────────────────────────────────────────
// Uses the real (un-narrowed) parseQuery to verify content dispatch.
describe('parseQuery — find: content queries', () => {
  it('parses find:note with filters', () => {
    const parsed = _parseQuery('find:note{tags:pr}');
    expect(parsed.error).toBeUndefined();
    expect(isFindQuery(parsed)).toBe(true);
    if (!isFindQuery(parsed)) return;
    expect(parsed.target).toBe('note');
    expect(parsed.filters).toEqual([
      { key: 'tags', negate: false, values: [{ value: 'pr', wildcard: false }] },
    ]);
    expect(parsed.scope).toBeUndefined();
    expect(parsed.last).toBeUndefined();
  });

  it('parses scope clause (in journal)', () => {
    const parsed = _parseQuery('find:note{tags:pr} in journal');
    expect(isFindQuery(parsed)).toBe(true);
    if (!isFindQuery(parsed)) return;
    expect(parsed.scope).toBe('journal');
  });

  it('parses time window (last 8w)', () => {
    const parsed = _parseQuery('find:note{type:wod} in journal last 8w');
    expect(isFindQuery(parsed)).toBe(true);
    if (!isFindQuery(parsed)) return;
    expect(parsed.scope).toBe('journal');
    expect(parsed.last).toEqual({ size: 8, unit: 'w' });
  });

  it('parses time window without scope', () => {
    const parsed = _parseQuery('find:note{tags:pr} last 4d');
    expect(isFindQuery(parsed)).toBe(true);
    if (!isFindQuery(parsed)) return;
    expect(parsed.scope).toBeUndefined();
    expect(parsed.last).toEqual({ size: 4, unit: 'd' });
  });

  it('parses empty filters', () => {
    const parsed = _parseQuery('find:note{}');
    expect(isFindQuery(parsed)).toBe(true);
    if (!isFindQuery(parsed)) return;
    expect(parsed.filters).toEqual([]);
  });

  it('parses multi-value tag filters in find queries', () => {
    const parsed = _parseQuery('find:note{tags:pr|benchmark}');
    expect(isFindQuery(parsed)).toBe(true);
    if (!isFindQuery(parsed)) return;
    expect(parsed.filters[0].values).toEqual([
      { value: 'pr', wildcard: false },
      { value: 'benchmark', wildcard: false },
    ]);
  });

  it('does NOT route analytics queries to the find path', () => {
    expect(isFindQuery(_parseQuery('sum:totalVolume{}'))).toBe(false);
    expect(isFindQuery(_parseQuery('last:sessionLoad{}'))).toBe(false);
  });
});
