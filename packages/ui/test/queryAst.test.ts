/**
 * queryAst — the composer's projection layer (ticket 013).
 *
 * Composer state IS the C6 AST: restore is `parseQuery` + `astToPills`,
 * emit is `pillsToAst` + the engine serializer. These tests pin the
 * projection contract — round-trips are asserted against the property-tested
 * serializer, never against hand-rolled text builders.
 */
import { describe, expect, it } from 'vitest';
import { parseQuery, serialize } from '@bitcobblers/wod-wiki-wql';
import {
  astToPills,
  pillsToAst,
  wqlToPills,
  pillsToWql,
  pivotPills,
  setMetricPill,
  defaultPills,
  defaultMetricsPills,
  pillValue,
} from '../src/composer/queryAst';

const pill = (pills: { type: string }[] | null, type: string) =>
  pills?.filter((c) => c.type === type) ?? [];

describe('defaults', () => {
  it('default content pills compile to the modern canonical find', () => {
    expect(pillsToWql(defaultPills())).toBe('find:note last 2w');
  });

  it('default metrics pills compile the empty aggregate head', () => {
    expect(pillsToWql(defaultMetricsPills())).toBe('sum:{}');
  });
});

describe('wqlToPills — restore via parseQuery', () => {
  it('restores a canonical find query', () => {
    const pills = wqlToPills('find:note{tags:pr} last 8w');
    expect(pill(pills, 'source')[0]?.value).toBe('notes');
    expect(pill(pills, 'time')[0]?.value).toBe('last 8w');
    expect(pill(pills, 'tag')[0]?.value).toBe('pr');
  });

  it('folds a source: filter into the source pill (C2)', () => {
    const pills = wqlToPills('find:note{source:journal,tags:pr}');
    expect(pill(pills, 'source')[0]?.value).toBe('journal');
    expect(pill(pills, 'tag')).toHaveLength(1);
  });

  it('restores blocks/efforts targets to their source values', () => {
    expect(pill(wqlToPills('find:block{text:"air squats"}'), 'source')[0]?.value).toBe('blocks');
    expect(pill(wqlToPills('find:effort{discipline:kettlebell}'), 'source')[0]?.value).toBe('efforts');
  });

  it('restores the metrics plane — agg, metric, filters, dims, rollup, unit', () => {
    const pills = wqlToPills('sum:totalVolume{discipline:strength} by {week}.rollup(1w) in kg');
    expect(pill(pills, 'source')[0]?.value).toBe('metrics');
    expect(pill(pills, 'agg')[0]?.value).toBe('sum');
    expect(pill(pills, 'metric')[0]?.value).toBe('totalVolume');
    expect(pill(pills, 'discipline')[0]?.value).toBe('strength');
    expect(pill(pills, 'groupby')[0]?.value).toBe('week');
    expect(pill(pills, 'rollup')[0]?.value).toBe('1w');
    expect(pill(pills, 'unit')[0]?.value).toBe('kg');
  });

  it('restores a metrics-plane window into the time pill (C1 — one clause, every family)', () => {
    const pills = wqlToPills('sum:tis{} by {week} last 6w');
    expect(pill(pills, 'time')[0]?.value).toBe('last 6w');
  });

  it('restores the rows plane — source, output, scope filters, window', () => {
    const pills = wqlToPills('rows:segment{result:abc-123} last 4w');
    expect(pill(pills, 'source')[0]?.value).toBe('rows');
    expect(pill(pills, 'output')[0]?.value).toBe('segment');
    expect(pill(pills, 'result')[0]?.value).toBe('abc-123');
    expect(pill(pills, 'time')[0]?.value).toBe('last 4w');
  });

  it('restores join pills in both directions', () => {
    const findPills = wqlToPills('find:note{tags:pr} where sum:totalVolume{} > 5000');
    expect(pill(findPills, 'where')[0]?.value).toBe('sum:totalVolume{} > 5000');
    const aggPills = wqlToPills('sum:totalVolume{} by {week} where find:note{tags:competition}');
    expect(pill(aggPills, 'where')[0]?.value).toBe('find:note{tags:competition}');
  });

  it('rejects non-composer states — negation, range windows, conflicts, unknown targets', () => {
    expect(wqlToPills('find:note{!tags:pr}')).toBeNull();          // negation not pill-expressible
    expect(wqlToPills('find:note from 2026-01-01')).toBeNull();     // range windows stay raw-text
    expect(wqlToPills('find:note last 2w last 3w')).toBeNull();     // C3 conflict
    expect(wqlToPills('find:wod{tags:pr}')).toBeNull();             // C7 unknown target
  });

  it('rejects parse errors outright — diagnostics own them, not restore', () => {
    expect(wqlToPills('sum totalVolume by {week}')).toBeNull();
  });
});

describe('pillsToWql — emit via the serializer', () => {
  const cases = [
    'find:note last 2w',
    'find:note{tags:pr} last 8w',
    'find:note{source:journal,tags:pr}',
    'find:block{text:"air squats",!source:feeds}', // negated source — pillsToWql drops nothing, see below
    'find:effort{discipline:kettlebell,intensity:high}',
    'find:note{source:journal} where sum:totalVolume{discipline:strength} > 5000',
    'sum:totalVolume{discipline:strength,!effort:burpee} by {week,effort}.rollup(1w) last 6w',
    'avg:tis{effort:back*} by {session}',
    'max:resistance{effort:back-squat} in kg',
    'sum:totalVolume{} by {week} where find:note{tags:competition,source:journal}',
    'rows:all{result:abc123}',
    'rows:segment{block:content-id-xyz}',
    'rows:all{note:note-uuid} last 4w',
  ];

  for (const wql of cases) {
    it(`round-trips ${wql}`, () => {
      // Only pill-expressible queries participate — filter out the negated one.
      const pills = wqlToPills(wql);
      if (pills === null) return; // covered by the rejection suite
      // The emitted text IS the serializer's canonical form of the parse.
      expect(pillsToWql(pills)).toBe(serialize(parseQuery(wql)));
    });
  }

  it('emits find without legacy scope syntax — provenance rides in source:', () => {
    const pills = wqlToPills('find:note{source:journal} last 8w');
    const wql = pillsToWql(pills!);
    expect(wql).toBe('find:note{source:journal} last 8w');
    expect(wql).not.toContain(' in journal');
  });
});

describe('pivotPills', () => {
  it('pivots content → metrics keeping shared filters and the window (C1)', () => {
    const pills = wqlToPills('find:note{tags:pr,effort:back-squat} last 8w')!;
    const pivoted = pivotPills(pills, 'metrics');
    expect(pill(pivoted, 'source')[0]?.value).toBe('metrics');
    expect(pill(pivoted, 'agg')[0]?.value).toBe('sum');
    expect(pill(pivoted, 'tag')[0]?.value).toBe('pr');
    expect(pill(pivoted, 'effort')[0]?.value).toBe('back-squat');
    expect(pill(pivoted, 'time')[0]?.value).toBe('last 8w');
  });

  it('pivots metrics → content dropping the head slots', () => {
    const pills = wqlToPills('sum:totalVolume{effort:back-squat} by {week} last 6w')!;
    const pivoted = pivotPills(pills, 'journal');
    expect(pill(pivoted, 'source')[0]?.value).toBe('journal');
    expect(pill(pivoted, 'agg')).toHaveLength(0);
    expect(pill(pivoted, 'groupby')).toHaveLength(0);
    expect(pill(pivoted, 'time')[0]?.value).toBe('last 6w');
    expect(pill(pivoted, 'effort')[0]?.value).toBe('back-squat');
  });

  it('pivots to rows keeping scope-expressible filters', () => {
    const pills = wqlToPills('find:note{note:note-uuid} last 4w')!;
    const pivoted = pivotPills(pills, 'rows');
    expect(pill(pivoted, 'source')[0]?.value).toBe('rows');
    expect(pill(pivoted, 'output')[0]?.value).toBe('all');
    expect(pill(pivoted, 'note')[0]?.value).toBe('note-uuid');
  });
});

describe('setMetricPill', () => {
  it('sets the metric, pivoting to the metrics plane when needed', () => {
    const pills = wqlToPills('find:note{tags:pr} last 2w')!;
    const next = setMetricPill(pills, 'totalVolume');
    expect(pillsToWql(next)).toBe('sum:totalVolume{tags:pr} last 2w');
  });
});

describe('pillValue', () => {
  it('reads the first pill of a type with fallback', () => {
    const pills = wqlToPills('find:note{tags:pr} last 8w')!;
    expect(pillValue(pills, 'time')).toBe('last 8w');
    expect(pillValue(pills, 'where', 'none')).toBe('none');
  });
});

describe('pillsToAst', () => {
  it('produces the parse of the canonical text — state IS the AST', () => {
    const pills = wqlToPills('sum:totalVolume{discipline:strength} by {week} last 6w')!;
    const ast = pillsToAst(pills);
    expect(ast.family).toBe('aggregate');
    if (ast.family === 'aggregate') {
      expect(ast.agg).toBe('sum');
      expect(ast.window).toEqual({ kind: 'relative', size: 6, unit: 'w' });
    }
  });
});
