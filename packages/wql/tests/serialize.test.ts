import { describe, expect, it } from 'vitest';
import { parseQuery } from '../src/wql';
import type { ParsedAggregateQuery, ParsedFindQuery, ParsedRowsQuery, QueryWindow, TagFilter } from '../src/wql';
import { WQL_AGGREGATORS, WQL_COMPARISON_OPS, WQL_FIND_TARGETS, WQL_ROWS_SCOPE_KEYS, WQL_ROWS_TARGETS } from '../src/vocabulary';
import { serialize } from '../src/serialize';
/** Deep equality on query structure — ignores provenance fields (`raw`,
 * `advisories`) and absent-vs-undefined distinctions. */
function structural(a: unknown): unknown {
  if (Array.isArray(a)) return a.map(structural);
  if (a && typeof a === 'object') {
    const out: Record<string, unknown> = {};
    const keys = Object.keys(a as Record<string, unknown>).sort();
    for (const k of keys) {
      const v = (a as Record<string, unknown>)[k];
      if (k === 'raw' || k === 'advisories' || v === undefined) continue;
      out[k] = structural(v);
    }
    return out;
  }
  return a;
}

function structurallyEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(structural(a)) === JSON.stringify(structural(b));
}

describe('serialize (C6 structured interface)', () => {
  it('round-trips a plain aggregate query', () => {
    const a = parseQuery('sum:totalVolume{discipline:strength}');
    expect(a.error).toBeUndefined();
    const text = serialize(a);
    expect(text).toBe('sum:totalVolume{discipline:strength}');
    expect(structurallyEqual(parseQuery(text), a)).toBe(true);
  });

  it('round-trips an aggregate with by, rollup, display unit, and window', () => {
    const text = 'sum:totalVolume{discipline:strength} by {week, effort}.rollup(1w) in kg last 4w';
    const a = parseQuery(text);
    expect(a.error).toBeUndefined();
    expect(serialize(a)).toBe(text);
    expect(structurallyEqual(parseQuery(serialize(a)), a)).toBe(true);
  });

  it('round-trips civil-date range windows on aggregates', () => {
    const text = 'sum:tis{} from 2026-01-01 to 2026-03-31';
    const a = parseQuery(text);
    expect(a.error).toBeUndefined();
    expect(serialize(a)).toBe(text);
    expect(structurallyEqual(parseQuery(serialize(a)), a)).toBe(true);
  });

  it('omits the range end when the AST has none', () => {
    const a = parseQuery('sum:tis{} from 2026-01-01');
    expect(a.error).toBeUndefined();
    expect(serialize(a)).toBe('sum:tis{} from 2026-01-01');
  });

  it('serializes a hand-built bare find query without filter braces', () => {
    const a: ParsedFindQuery = {
      family: 'find', raw: '', target: 'note', filters: [],
      window: { kind: 'relative', size: 8, unit: 'w' },
    };
    expect(serialize(a)).toBe('find:note last 8w');
    expect(structurallyEqual(parseQuery(serialize(a)), a)).toBe(true);
  });

  it('serializes hand-built find filters with source, wildcard, and quoted values', () => {
    const a: ParsedFindQuery = {
      family: 'find', raw: '', target: 'note',
      filters: [
        { key: 'source', negate: false, values: [{ value: 'journal', wildcard: false }] },
        { key: 'tags', negate: true, values: [{ value: 'pr', wildcard: false }] },
        { key: 'text', negate: false, values: [{ value: '300 Air Squats', wildcard: false }] },
      ],
      window: { kind: 'range', start: '2026-01-01', end: '2026-02-01' },
    };
    expect(serialize(a)).toBe('find:note{source:journal,!tags:pr,text:"300 Air Squats"} from 2026-01-01 to 2026-02-01');
    expect(structurallyEqual(parseQuery(serialize(a)), a)).toBe(true);
  });

  it('serializes hand-built rows queries with scope filters and windows', () => {
    const a: ParsedRowsQuery = {
      family: 'rows', raw: '', outputType: 'segment',
      filters: [
        { key: 'result', negate: false, values: [{ value: 'r13', wildcard: false }] },
        { key: 'source', negate: false, values: [{ value: 'journal', wildcard: false }] },
      ],
      window: { kind: 'relative', size: 4, unit: 'w' },
    };
    expect(serialize(a)).toBe('rows:segment{result:r13,source:journal} last 4w');
    expect(structurallyEqual(parseQuery(serialize(a)), a)).toBe(true);
  });

  it('emits rows:all for a rows AST without outputType narrowing', () => {
    const a: ParsedRowsQuery = {
      family: 'rows', raw: '',
      filters: [{ key: 'result', negate: false, values: [{ value: 'r13', wildcard: false }] }],
    };
    expect(serialize(a)).toBe('rows:all{result:r13}');
    expect(structurallyEqual(parseQuery(serialize(a)), a)).toBe(true);
  });
  it('serializes an aggregate with a find join and windows on both halves', () => {
    const a: ParsedAggregateQuery = {
      family: 'aggregate', raw: '', agg: 'sum', metric: 'totalVolume',
      filters: [], groupBy: [],
      window: { kind: 'relative', size: 8, unit: 'w' },
      join: {
        target: 'note',
        filters: [{ key: 'tags', negate: false, values: [{ value: 'competition', wildcard: false }] }],
        last: { size: 4, unit: 'w' },
      },
    };
    expect(serialize(a)).toBe('sum:totalVolume{} last 8w where find:note{tags:competition} last 4w');
    expect(structurallyEqual(parseQuery(serialize(a)), a)).toBe(true);
  });

  it('serializes a find query with a metric join', () => {
    const a: ParsedFindQuery = {
      family: 'find', raw: '', target: 'block',
      filters: [{ key: 'text', negate: false, values: [{ value: '300 Air Squats', wildcard: false }] }],
      join: {
        agg: 'sum', metric: 'totalVolume',
        filters: [{ key: 'discipline', negate: false, values: [{ value: 'strength', wildcard: false }] }],
        operator: '>', threshold: 5000,
      },
    };
    expect(serialize(a)).toBe('find:block{text:"300 Air Squats"} where sum:totalVolume{discipline:strength} > 5000');
    expect(structurallyEqual(parseQuery(serialize(a)), a)).toBe(true);
  });

  // ── Property: parse(serialize(a)) ≡ a for generated ASTs ──────────

  it('round-trips generated ASTs of every family (property)', () => {
    const BARE_VALUES = ['pr', 'strength', 'back', '2026-01-12', 'hero', 'wod'];
    const KEYS = ['tags', 'discipline', 'effort', 'text', 'category'] as const;
    const SOURCES = ['journal', 'collections', 'feeds', 'all', 'collection:crossfit-girls', 'feed:x/2026-01-12'];
    const METRICS = ['totalVolume', 'tis', 'calc.acwr', 'maxHeartRate'];
    const DIMS = ['week', 'day', 'session', 'round', 'effort'];
    const DATES = ['2026-01-01', '2026-03-31', '2025-11-30'];
    const THRESHOLDS = [0, 5, 5000, 1234.5, 0.25];

    const pick = <T>(rng: () => number, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
    const int = (rng: () => number, lo: number, hi: number): number => lo + Math.floor(rng() * (hi - lo + 1));
    const maybe = (rng: () => number, p: number): boolean => rng() < p;

    function genValue(rng: () => number): { value: string; wildcard: boolean } {
      const roll = rng();
      if (roll < 0.15) return { value: pick(rng, SOURCES), wildcard: false };
      if (roll < 0.3) return { value: '300 Air Squats', wildcard: false };
      return { value: pick(rng, BARE_VALUES), wildcard: maybe(rng, 0.3) };
    }

    function genFilters(rng: () => number, count: number, negate = true): TagFilter[] {
      const keys = [...KEYS].sort(() => rng() - 0.5).slice(0, count);
      return keys.map((key) => ({
        key,
        negate: negate && maybe(rng, 0.25),
        values: Array.from({ length: int(rng, 1, 2) }, () => genValue(rng)),
      }));
    }

    function genWindow(rng: () => number): QueryWindow | undefined {
      if (!maybe(rng, 0.5)) return undefined;
      if (maybe(rng, 0.6)) return { kind: 'relative', size: int(rng, 1, 12), unit: maybe(rng, 0.5) ? 'd' : 'w' };
      const start = pick(rng, DATES);
      return maybe(rng, 0.5) ? { kind: 'range', start, end: pick(rng, DATES) } : { kind: 'range', start };
    }

    function genAggregate(rng: () => number): ParsedAggregateQuery {
      const a: ParsedAggregateQuery = {
        family: 'aggregate', raw: '',
        agg: pick(rng, WQL_AGGREGATORS),
        metric: pick(rng, METRICS),
        filters: genFilters(rng, int(rng, 0, 3)),
        groupBy: maybe(rng, 0.4) ? [...KEYS].sort(() => rng() - 0.5).slice(0, int(rng, 1, 2)) : [],
      };
      if (maybe(rng, 0.4)) a.rollup = { size: pick(rng, [1, 2, 7]), unit: maybe(rng, 0.5) ? 'd' : 'w' };
      if (maybe(rng, 0.3)) a.displayUnit = pick(rng, ['kg', 'lb', 'reps']);
      const w = genWindow(rng);
      if (w) a.window = w;
      if (maybe(rng, 0.3)) {
        a.join = {
          target: pick(rng, WQL_FIND_TARGETS),
          filters: genFilters(rng, int(rng, 0, 2), false),
          ...(maybe(rng, 0.5) ? { last: { size: int(rng, 1, 8), unit: maybe(rng, 0.5) ? 'd' as const : 'w' as const } } : {}),
        };
      }
      return a;
    }

    function genFind(rng: () => number): ParsedFindQuery {
      const f: ParsedFindQuery = {
        family: 'find', raw: '',
        target: pick(rng, WQL_FIND_TARGETS),
        filters: genFilters(rng, int(rng, 0, 3)),
      };
      const w = genWindow(rng);
      if (w) f.window = w;
      if (maybe(rng, 0.25)) {
        f.join = {
          agg: pick(rng, WQL_AGGREGATORS),
          metric: pick(rng, METRICS),
          filters: genFilters(rng, int(rng, 0, 2)),
          operator: pick(rng, WQL_COMPARISON_OPS),
          threshold: pick(rng, THRESHOLDS),
        };
      }
      return f;
    }

    function genRows(rng: () => number): ParsedRowsQuery {
      const scopeKey = pick(rng, WQL_ROWS_SCOPE_KEYS);
      const r: ParsedRowsQuery = {
        family: 'rows', raw: '',
        ...(maybe(rng, 0.5) ? { outputType: pick(rng, WQL_ROWS_TARGETS.filter((t) => t !== 'all')) } : {}),
        filters: [
          { key: scopeKey, negate: false, values: [{ value: pick(rng, ['r1', 'r13', 'blk-9', 'note-3']), wildcard: false }] },
          ...(maybe(rng, 0.4) ? [{ key: 'source', negate: false, values: [{ value: pick(rng, SOURCES), wildcard: false }] }] : []),
        ],
      };
      const w = genWindow(rng);
      if (w) r.window = w;
      return r;
    }

    // mulberry32 — deterministic, no new dependencies.
    const rng = (() => {
      let t = 0x9e3779b9;
      return () => {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
      };
    })();
    const texts = new Set<string>();
    let joins = 0;
    let windows = 0;
    let rollups = 0;
    let units = 0;
    for (let i = 0; i < 400; i++) {
      const a = i % 3 === 0 ? genAggregate(rng) : i % 3 === 1 ? genFind(rng) : genRows(rng);
      const text = serialize(a);
      texts.add(text);
      if (a.join) joins++;
      if (a.window) windows++;
      if (a.family === 'aggregate' && a.rollup) rollups++;
      if (a.family === 'aggregate' && a.displayUnit) units++;
      const back = parseQuery(text);
      expect(back.error, `iteration ${i}: ${text}`).toBeUndefined();
      expect(structurallyEqual(back, a), `iteration ${i}: ${text}`).toBe(true);
      expect(serialize(back), `iteration ${i}: not a fixed point: ${text}`).toBe(text);
    }
    // Generator-coverage guard: the property only proves what it exercises.
    expect(texts.size).toBeGreaterThan(300);
    expect(joins).toBeGreaterThan(50);
    expect(windows).toBeGreaterThan(150);
    expect(rollups).toBeGreaterThan(30);
    expect(units).toBeGreaterThan(20);
  });
  it('leaves canonical corpus strings untouched (fixed-point text)', () => {
    const corpus = [
      'sum:tis{}',
      'sum:totalVolume{discipline:strength,!effort:burpee} by {week, effort}.rollup(1w) in kg last 4w',
      'max:tis{effort:back*}',
      'sum:totalVolume{note:a|b|c}',
      'count:exercise{} from 2025-11-30 to 2026-03-31',
      'find:note',
      'find:note last 8w',
      'find:note{tags:pr,source:journal}',
      'find:block{text:"300 Air Squats"} from 2026-01-01',
      'find:effort{category:hero} where sum:totalVolume{discipline:strength} > 5000',
      'sum:totalVolume{} where find:note{tags:competition} last 4w',
      'sum:tis{} by {session}.rollup(7d) last 12w where find:note',
      'rows:all{result:r13}',
      'rows:segment{result:r13,source:journal} last 4w',
      'rows:note{note:note-3} from 2026-01-01 to 2026-02-01',
    ];
    for (const text of corpus) {
      const a = parseQuery(text);
      expect(a.error, text).toBeUndefined();
      expect(serialize(a), text).toBe(text);
    }
  });

  it('echoes raw text for errored ASTs (total over all parses)', () => {
    for (const bad of ['find:bogus', 'rows:all{}', 'rows:all{result:r1} by {day}', 'sum: in kg', 'find:note last 8w from 2026-01-01']) {
      const a = parseQuery(bad);
      expect(a.error, bad).toBeDefined();
      expect(serialize(a), bad).toBe(bad);
    }
  });

  it('echoes raw for hand-built ASTs flagged with an error', () => {
    const a: ParsedFindQuery = { family: 'find', raw: 'find:note in journal', target: '', filters: [], error: 'x' };
    expect(serialize(a)).toBe('find:note in journal');
  });
});
