/**
 * WQL parser tests — the reference string parser the Lezer grammar replaces.
 * Defends the AST shape contract (the grammar ticket must produce the same).
 */
import { describe, expect, it } from 'bun:test';
import { parseQuery as _parseQuery, isFindQuery, WQL_COMPARISON_OPS, type ParsedQuery } from './wql';
import { WQL_CONTENT_FILTER_KEYS } from '@/parser/wql-language';

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

  it('parses find:block with text filter', () => {
    const parsed = _parseQuery('find:block{text:fran}');
    expect(isFindQuery(parsed)).toBe(true);
    if (!isFindQuery(parsed)) return;
    expect(parsed.target).toBe('block');
    expect(parsed.filters).toEqual([
      { key: 'text', negate: false, values: [{ value: 'fran', wildcard: false }] },
    ]);
  });

  it('parses find:block with type filter and scope', () => {
    const parsed = _parseQuery('find:block{type:wod} in journal');
    expect(isFindQuery(parsed)).toBe(true);
    if (!isFindQuery(parsed)) return;
    expect(parsed.target).toBe('block');
    expect(parsed.scope).toBe('journal');
    expect(parsed.filters[0].key).toBe('type');
    expect(parsed.filters[0].values[0].value).toBe('wod');
  });

  it('parses source: filter as an affirmative kind', () => {
    const parsed = _parseQuery('find:note{source:feed}');
    if (!isFindQuery(parsed)) throw new Error('expected find query');
    expect(parsed.filters).toEqual([
      { key: 'source', negate: false, values: [{ value: 'feed', wildcard: false }] },
    ]);
  });

  it('parses !source: filter as a negation', () => {
    const parsed = _parseQuery('find:note{!source:feed}');
    if (!isFindQuery(parsed)) throw new Error('expected find query');
    expect(parsed.filters).toEqual([
      { key: 'source', negate: true, values: [{ value: 'feed', wildcard: false }] },
    ]);
  });

  it('parses source: with a catalog-prefixed literal id', () => {
    const parsed = _parseQuery('find:note{source:collection:crossfit-girls}');
    if (!isFindQuery(parsed)) throw new Error('expected find query');
    expect(parsed.filters[0].values[0].value).toBe('collection:crossfit-girls');
  });

  it('parses source: combined with another key in the same braces', () => {
    const parsed = _parseQuery('find:note{!source:feed,text:fran}');
    if (!isFindQuery(parsed)) throw new Error('expected find query');
    expect(parsed.filters).toEqual([
      { key: 'source', negate: true, values: [{ value: 'feed', wildcard: false }] },
      { key: 'text', negate: false, values: [{ value: 'fran', wildcard: false }] },
    ]);
  });

  it('includes `source` in the content filter key vocabulary', () => {
    expect(WQL_CONTENT_FILTER_KEYS).toContain('source');
  });
 });

// ── Cross-store `where` join tests (#800) ──────────────────────────
describe('parseQuery — cross-store where joins', () => {
  it('parses find:note joined to a metric predicate', () => {
    const parsed = _parseQuery('find:note where sum:totalVolume{} > 5000');
    expect(isFindQuery(parsed)).toBe(true);
    if (!isFindQuery(parsed) || !parsed.join) return;
    expect(parsed.join).toEqual({
      agg: 'sum', metric: 'totalVolume', filters: [],
      operator: '>', threshold: 5000,
    });
  });

  it('parses an analytics query joined to a find predicate', () => {
    const parsed = _parseQuery('sum:totalVolume{} where find:note{tags:competition}');
    expect(isFindQuery(parsed)).toBe(false);
    if ('join' in parsed && parsed.join) {
      expect(parsed.join).toEqual({
        target: 'note',
        filters: [{ key: 'tags', negate: false, values: [{ value: 'competition', wildcard: false }] }],
      });
    } else {
      throw new Error('expected a join');
    }
  });

  it('preserves the find half\'s own scope + last on the join', () => {
    const parsed = _parseQuery('sum:totalVolume{} where find:note{tags:pr} in journal last 8w');
    expect(isFindQuery(parsed)).toBe(false);
    if (!('join' in parsed) || !parsed.join) throw new Error('expected a join');
    expect(parsed.join.scope).toBe('journal');
    expect(parsed.join.last).toEqual({ size: 8, unit: 'w' });
  });

  it('parses every comparison operator in WQL_COMPARISON_OPS', () => {
    // The exported vocabulary (composer typeahead) must match what CMP_RE
    // accepts — iterating the const ties the two declarations together.
    for (const op of WQL_COMPARISON_OPS) {
      const parsed = _parseQuery(`find:block where sum:totalVolume{} ${op} 1000`);
      if (!isFindQuery(parsed) || !parsed.join) throw new Error(`no join for ${op}`);
      expect(parsed.join.operator).toBe(op);
      expect(parsed.join.threshold).toBe(1000);
    }
  });

  it('passes the metric predicate\'s own filters through', () => {
    const parsed = _parseQuery('find:note where sum:totalVolume{discipline:strength} >= 4000');
    if (!isFindQuery(parsed) || !parsed.join) throw new Error('expected a join');
    expect(parsed.join.filters).toEqual([
      { key: 'discipline', negate: false, values: [{ value: 'strength', wildcard: false }] },
    ]);
    expect(parsed.join.operator).toBe('>=');
  });

  it('treats `where` inside filters as a tag value, not a join', () => {
    // Single-word tag values parse; a top-level join is not created.
    const parsed = _parseQuery('find:note{text:where}');
    expect(isFindQuery(parsed)).toBe(true);
    if (!isFindQuery(parsed)) return;
    expect(parsed.join).toBeUndefined();
    expect(parsed.filters[0].values[0].value).toBe('where');
  });

  it('rejects a find query joined to another find half', () => {
    const parsed = _parseQuery('find:note where find:block{}');
    if (!isFindQuery(parsed)) throw new Error('expected find query');
    expect(parsed.error).toContain('agg:metric');
  });

  it('rejects an analytics query joined to a metric half', () => {
    const parsed = _parseQuery('sum:totalVolume{} where sum:tis{} > 5');
    expect(parsed.error).toContain('find:');
  });

  it('unquotes a multi-word text filter value (#867)', () => {
    const parsed = _parseQuery('find:note{text:"300 Air Squats"} in all');
    expect(isFindQuery(parsed)).toBe(true);
    if (!isFindQuery(parsed)) return;
    expect(parsed.error).toBeUndefined();
    expect(parsed.target).toBe('note');
    expect(parsed.filters).toEqual([
      { key: 'text', negate: false, values: [{ value: '300 Air Squats', wildcard: false }] },
    ]);
  });

  it('round-trips a quoted text value with single-word text unchanged', () => {
    const single = _parseQuery('find:note{text:pr}');
    if (!isFindQuery(single)) return;
    expect(single.filters[0].values[0].value).toBe('pr');
  });
});
