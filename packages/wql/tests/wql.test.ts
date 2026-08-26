import { describe, expect, it } from 'vitest';
import { parseQuery as _parseQuery, isFindQuery, isRowsQuery, isAggregateQuery, normalizeWql, WQL_COMPARISON_OPS, type ParsedAggregateQuery } from '../src/wql';
import { WQL_CONTENT_FILTER_KEYS } from '../src/vocabulary';

function parseQuery(raw: string): ParsedAggregateQuery {
  return _parseQuery(raw) as ParsedAggregateQuery;
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
    expect(parsed.window).toBeUndefined();
  });

  it('normalizes legacy scope clause (in journal) to source: filter with advisory (C2)', () => {
    const parsed = _parseQuery('find:note{tags:pr} in journal');
    expect(isFindQuery(parsed)).toBe(true);
    if (!isFindQuery(parsed)) return;
    expect(parsed.filters).toContainEqual({
      key: 'source',
      negate: false,
      values: [{ value: 'journal', wildcard: false }],
    });
    expect(parsed.advisories?.[0]).toContain("Legacy 'in <scope>' syntax is deprecated");
  });

  it('parses time window with legacy scope', () => {
    const parsed = _parseQuery('find:note{type:wod} in journal last 8w');
    expect(isFindQuery(parsed)).toBe(true);
    if (!isFindQuery(parsed)) return;
    expect(parsed.filters).toContainEqual({
      key: 'source',
      negate: false,
      values: [{ value: 'journal', wildcard: false }],
    });
    expect(parsed.window).toEqual({ kind: 'relative', size: 8, unit: 'w' });
  });

  it('parses time window without scope', () => {
    const parsed = _parseQuery('find:note{tags:pr} last 4d');
    expect(isFindQuery(parsed)).toBe(true);
    if (!isFindQuery(parsed)) return;
    expect(parsed.window).toEqual({ kind: 'relative', size: 4, unit: 'd' });
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

  it('parses find:block with type filter and legacy scope', () => {
    const parsed = _parseQuery('find:block{type:wod} in journal');
    expect(isFindQuery(parsed)).toBe(true);
    if (!isFindQuery(parsed)) return;
    expect(parsed.target).toBe('block');
    expect(parsed.filters).toContainEqual({
      key: 'type',
      negate: false,
      values: [{ value: 'wod', wildcard: false }],
    });
    expect(parsed.filters).toContainEqual({
      key: 'source',
      negate: false,
      values: [{ value: 'journal', wildcard: false }],
    });
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
    expect(parsed.join.filters).toContainEqual({
      key: 'source',
      negate: false,
      values: [{ value: 'journal', wildcard: false }],
    });
    expect(parsed.join.last).toEqual({ size: 8, unit: 'w' });
  });

  it('parses every comparison operator in WQL_COMPARISON_OPS', () => {
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
    const parsed = _parseQuery('find:note{text:"300 Air Squats"}');
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

describe('grain:rollup retirement (ticket 003)', () => {
  it('rejects grain:rollup with a pointer to the .rollup suffix', () => {
    const parsed = _parseQuery('sum:totalVolume{grain:rollup}');
    expect(parsed.error).toContain('.rollup suffix');
  });

  it('accepts the unified grain values', () => {
    expect(_parseQuery('sum:totalVolume{grain:event}').error).toBeUndefined();
    expect(_parseQuery('sum:totalVolume{grain:summary}').error).toBeUndefined();
  });

  it('retires grain:rollup on rows queries too', () => {
    expect(_parseQuery('rows:all{result:x,grain:rollup}').error).toContain('.rollup suffix');
  });
});

describe('suffix conflicts surface as parse errors (C3)', () => {
  it('analytics: duplicate by clauses error naming both spans', () => {
    const parsed = _parseQuery('sum:tis{} by {week} by {effort}');
    expect(parsed.error).toContain("Duplicate 'by' clause");
    expect(parsed.error).toContain('by {week}');
    expect(parsed.error).toContain('by {effort}');
  });

  it('rows: duplicate window clauses error before rows-specific checks', () => {
    const parsed = _parseQuery('rows:{note:a} last 4w last 8w');
    expect(parsed.error).toContain("'last 4w' conflicts with 'last 8w'");
  });

  it('find: duplicate scope clauses error', () => {
    const parsed = _parseQuery('find:note{tags:pr} in journal in feeds');
    expect(parsed.error).toContain("'in journal' conflicts with 'in feeds'");
  });

  it('valid queries stay error-free across all families', () => {
    expect(_parseQuery('sum:tis{} by {week}.rollup(1w) in kg').error).toBeUndefined();
    expect(_parseQuery('find:note{tags:pr} in journal last 8w').error).toBeUndefined();
    expect(_parseQuery('rows:all{result:x} last 4w').error).toBeUndefined();
  });
});

describe('discriminated query union (C5)', () => {
  it('stamps family on every parse path, including error results', () => {
    expect(_parseQuery('sum:totalVolume{}').family).toBe('aggregate');
    expect(_parseQuery('find:note{tags:pr} in journal').family).toBe('find');
    expect(_parseQuery('rows:{result:x}').family).toBe('rows');
    // Error paths keep the family — a malformed query still narrows.
    expect(_parseQuery('sum:').family).toBe('aggregate');
    expect(_parseQuery('find:').family).toBe('find');
    expect(_parseQuery('rows: where x').family).toBe('rows');
  });

  it('guards discriminate on family alone', () => {
    const agg = _parseQuery('sum:totalVolume{}');
    const find = _parseQuery('find:note{}');
    const rows = _parseQuery('rows:{}');
    expect(isAggregateQuery(agg)).toBe(true);
    expect(isAggregateQuery(find)).toBe(false);
    expect(isAggregateQuery(rows)).toBe(false);
    expect(isFindQuery(agg)).toBe(false);
    expect(isFindQuery(find)).toBe(true);
    expect(isRowsQuery(rows)).toBe(true);
    expect(isRowsQuery(agg)).toBe(false);
  });
});

describe('find/rows target validation (C7)', () => {
  it('find: unknown target errors listing valid targets', () => {
    const parsed = _parseQuery('find:exercise{tags:pr}');
    expect(parsed.family).toBe('find');
    expect(parsed.error).toContain('Unknown find target "exercise"');
    expect(parsed.error).toContain('note, block, effort');
  });

  it('find: known content targets stay error-free', () => {
    expect(_parseQuery('find:note{}').error).toBeUndefined();
    expect(_parseQuery('find:block{}').error).toBeUndefined();
    expect(_parseQuery('find:effort{}').error).toBeUndefined();
  });

  it('find: validation reaches the join half of an analytics query', () => {
    const parsed = _parseQuery('sum:totalVolume{} where find:exercise{}');
    expect(parsed.family).toBe('aggregate');
    expect(parsed.error).toContain('Unknown find target "exercise"');
  });

  it('rows: unknown target errors listing valid planes', () => {
    const parsed = _parseQuery('rows:exercise{result:rA}');
    expect(parsed.family).toBe('rows');
    expect(parsed.error).toContain('Unknown rows target "exercise"');
    expect(parsed.error).toContain('segment');
    expect(parsed.error).toContain('note');
  });

  it('rows: result planes and content planes stay error-free', () => {
    expect(_parseQuery('rows:segment{result:rA}').error).toBeUndefined();
    expect(_parseQuery('rows:analytics{result:rA}').error).toBeUndefined();
    expect(_parseQuery('rows:wellness{result:rA}').error).toBeUndefined();
    expect(_parseQuery('rows:note{note:n1}').error).toBeUndefined();
    expect(_parseQuery('rows:block{block:bc-1}').error).toBeUndefined();
    expect(_parseQuery('rows:effort{result:rA}').error).toBeUndefined();
  });
});

describe('rows-in-grammar cutover (C4)', () => {
  it('bare rows head normalizes to rows:all with advisory under parseQuery (C2)', () => {
    const parsed = _parseQuery('rows:{note:n1}');
    expect(parsed.family).toBe('rows');
    expect(parsed.error).toBeUndefined();
    expect(parsed.advisories?.[0]).toContain("Bare 'rows:{...}' syntax is deprecated");
  });
  it('rows:all parses without outputType narrowing', () => {
    const parsed = _parseQuery('rows:all{note:n1}');
    expect(parsed.error).toBeUndefined();
    expect(parsed.outputType).toBeUndefined();
  });

  it('filter rules error at parse: unsupported keys, negation, wildcards', () => {
    expect(_parseQuery('rows:all{tags:x}').error).toContain('Unsupported rows filter');
    expect(_parseQuery('rows:segment{!result:rA}').error).toContain('Unsupported rows filter');
    expect(_parseQuery('rows:all{block:bc-*}').error).toContain('Unsupported rows filter');
  });

  it('scope requirement errors at parse', () => {
    expect(_parseQuery('rows:segment{}').error).toContain('needs a scope');
    expect(_parseQuery('rows:all{}').error).toContain('needs a scope');
  });
});

describe('window module (C1)', () => {
  it('aggregates accept a relative window', () => {
    const parsed = _parseQuery('sum:totalVolume{} last 6w');
    expect(parsed.family).toBe('aggregate');
    expect(parsed.error).toBeUndefined();
    expect(isAggregateQuery(parsed) ? parsed.window : undefined)
      .toEqual({ kind: 'relative', size: 6, unit: 'w' });
  });

  it('aggregates accept a from/to civil-date range', () => {
    const parsed = _parseQuery('sum:tis{} from 2026-01-01 to 2026-03-31');
    expect(parsed.error).toBeUndefined();
    expect(isAggregateQuery(parsed) ? parsed.window : undefined)
      .toEqual({ kind: 'range', start: '2026-01-01', end: '2026-03-31' });
  });

  it('from without to is an open-ended range', () => {
    const parsed = _parseQuery('sum:tis{} from 2026-01-01');
    expect(parsed.error).toBeUndefined();
    expect(isAggregateQuery(parsed) ? parsed.window : undefined)
      .toEqual({ kind: 'range', start: '2026-01-01' });
  });

  it('find and rows carry the window too — last folds in', () => {
    const find = _parseQuery('find:note{tags:pr} last 8w');
    expect(find.error).toBeUndefined();
    expect(isFindQuery(find) ? find.window : undefined)
      .toEqual({ kind: 'relative', size: 8, unit: 'w' });
    const rows = _parseQuery('rows:all{result:x} from 2026-02-01 to 2026-02-28');
    expect(rows.error).toBeUndefined();
    expect(isRowsQuery(rows) ? rows.window : undefined)
      .toEqual({ kind: 'range', start: '2026-02-01', end: '2026-02-28' });
  });

  it('last and from are mutually exclusive — conflict naming both spans', () => {
    const parsed = _parseQuery('sum:tis{} last 4w from 2026-01-01');
    expect(parsed.error).toContain("'last 4w' conflicts with 'from 2026-01-01'");
  });

  it('duplicate from clauses conflict', () => {
    const parsed = _parseQuery('sum:tis{} from 2026-01-01 from 2026-02-01');
    expect(parsed.error).toContain("Duplicate 'window' clause");
  });

  it('rejects impossible civil dates at parse', () => {
    expect(_parseQuery('sum:tis{} from 2026-13-01').error).toContain('Invalid window date');
    expect(_parseQuery('sum:tis{} from 2026-02-30').error).toContain('Invalid window date');
  });

  it('window rides the canonical tail after unit and rollup', () => {
    const parsed = _parseQuery('sum:totalVolume{} by {week}.rollup(1w) in kg last 6w');
    expect(parsed.error).toBeUndefined();
    expect(isAggregateQuery(parsed) ? parsed.window : undefined)
      .toEqual({ kind: 'relative', size: 6, unit: 'w' });
  });

  it('range windows on join halves are a parse error, not a silent drop', () => {
    const parsed = _parseQuery('sum:tis{} where find:note{tags:x} from 2026-01-01');
    expect(parsed.error).toContain('Range windows are not supported on join halves');
  });

  it('relative last on a join half still parses', () => {
    const parsed = _parseQuery('sum:tis{} where find:note{tags:x} last 4w');
    expect(parsed.error).toBeUndefined();
    expect(isAggregateQuery(parsed) && parsed.join ? parsed.join.last : undefined)
      .toEqual({ size: 4, unit: 'w' });
  });
});

describe('de-overload in with compat normalizer (C2)', () => {
  it('normalizes bare rows:{...} to rows:all{...}', () => {
    const parsed = _parseQuery('rows:{result:r1}');
    expect(parsed.error).toBeUndefined();
    expect(isRowsQuery(parsed)).toBe(true);
    if (!isRowsQuery(parsed)) return;
    expect(parsed.outputType).toBeUndefined();
    expect(parsed.filters).toEqual([
      { key: 'result', negate: false, values: [{ value: 'r1', wildcard: false }] },
    ]);
    expect(parsed.advisories?.[0]).toContain("Bare 'rows:{...}' syntax is deprecated");
  });

  it('normalizes legacy in <scope> on rows queries', () => {
    const parsed = _parseQuery('rows:all{result:r1} in journal');
    expect(parsed.error).toBeUndefined();
    expect(isRowsQuery(parsed)).toBe(true);
    if (!isRowsQuery(parsed)) return;
    expect(parsed.filters).toContainEqual({
      key: 'source',
      negate: false,
      values: [{ value: 'journal', wildcard: false }],
    });
    expect(parsed.advisories?.[0]).toContain("Legacy 'in <scope>' syntax is deprecated");
  });

  it('rejects unknown source: filter values with clear error', () => {
    const parsed = _parseQuery('find:note{source:invalid_scope}');
    expect(parsed.error).toContain('Unknown source "invalid_scope"');
    expect(parsed.error).toContain('Try: journal, collections, feeds, all');
  });

  it('rejects unknown legacy in <scope> values with clear error', () => {
    const parsed = _parseQuery('find:note in invalid_scope');
    expect(parsed.error).toContain('Unknown source "invalid_scope"');
  });

  it('accepts all canonical source values and catalog prefixes', () => {
    for (const src of ['journal', 'collections', 'collection', 'feeds', 'feed', 'all']) {
      const p = _parseQuery(`find:note{source:${src}}`);
      expect(p.error).toBeUndefined();
    }
    expect(_parseQuery('find:note{source:collection:crossfit-girls}').error).toBeUndefined();
    expect(_parseQuery('find:note{source:"feed:crossfit-programming/2026-01-12"}').error).toBeUndefined();
  });

  it('in means units on aggregates without triggering scope normalization', () => {
    const parsed = _parseQuery('sum:totalVolume{} in kg');
    expect(parsed.error).toBeUndefined();
    expect(isAggregateQuery(parsed)).toBe(true);
    if (!isAggregateQuery(parsed)) return;
    expect(parsed.displayUnit).toBe('kg');
    expect(parsed.advisories).toBeUndefined();
  });

  it('normalizeWql helper rewrites legacy queries and leaves modern queries unchanged', () => {
    const r1 = normalizeWql('find:note{tags:pr} in journal last 8w');
    expect(r1.query).toBe('find:note{tags:pr,source:journal} last 8w');
    expect(r1.advisories.length).toBe(1);

    const r2 = normalizeWql('rows:{result:r1}');
    expect(r2.query).toBe('rows:all{result:r1}');
    expect(r2.advisories.length).toBe(1);

    const r3 = normalizeWql('sum:totalVolume{} in kg last 4w');
    expect(r3.query).toBe('sum:totalVolume{} in kg last 4w');
    expect(r3.advisories.length).toBe(0);
  });

  it('preserves by/rollup on legacy rows queries so they loudly error at parse', () => {
    const parsed = _parseQuery('rows:all{result:r1} in journal by {day}');
    expect(parsed.error).toContain('Rows queries return raw statements');
  });

  it('propagates deprecation advisory from legacy where join find clause', () => {
    const parsed = _parseQuery('sum:totalVolume{} where find:note in journal');
    expect(parsed.error).toBeUndefined();
    expect(parsed.advisories?.[0]).toContain("Legacy 'in <scope>' syntax is deprecated");
  });
});
