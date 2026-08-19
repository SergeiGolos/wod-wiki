import { describe, expect, it } from 'bun:test';
import { parseQuery as _pq, type ParsedQuery, type QueryResult } from '@bitcobblers/wod-wiki-engine';
import {
  addFilterToQuery,
  EXAMPLE_QUERIES,
  getQueryChartShape,
  serializeQuery,
} from './explorerQueries';
// All tests use analytics queries — narrow the union.
const parseQuery = (raw: string): ParsedQuery => _pq(raw) as ParsedQuery;

describe('explorerQueries', () => {
  describe('serializeQuery', () => {
    it('round-trips a complete query', () => {
      const q = 'sum:totalVolume{discipline:strength} by {week}.rollup(1w)';
      expect(serializeQuery(parseQuery(q))).toBe(q);
    });

    it('serializes a bare metric head', () => {
      expect(serializeQuery(parseQuery('avg:tis'))).toBe('avg:tis');
    });

    it('serializes multiple filters preserving order', () => {
      const q = 'sum:totalVolume{discipline:strength,effort:back-squat} by {week}.rollup(1w)';
      expect(serializeQuery(parseQuery(q))).toBe(q);
    });

    it('serializes multi-value tag filters', () => {
      const q = 'sum:totalVolume{note:a|b|c,!effort:back*} by {week}';
      expect(serializeQuery(parseQuery(q))).toBe(q);
    });
  });

  describe('addFilterToQuery', () => {
    it('adds a filter to a bare head', () => {
      expect(addFilterToQuery('sum:totalVolume', 'discipline', 'strength')).toBe(
        'sum:totalVolume{discipline:strength}',
      );
    });

    it('replaces an existing filter with the same key', () => {
      expect(addFilterToQuery('sum:totalVolume{discipline:strength}', 'discipline', 'endurance')).toBe(
        'sum:totalVolume{discipline:endurance}',
      );
    });

    it('replaces a multi-value filter with a single value', () => {
      expect(addFilterToQuery('sum:totalVolume{note:a|b}', 'note', 'c')).toBe('sum:totalVolume{note:c}');
    });

    it('appends a new tag key without touching existing filters', () => {
      expect(addFilterToQuery('sum:totalVolume{discipline:strength}', 'effort', 'thruster')).toBe(
        'sum:totalVolume{discipline:strength,effort:thruster}',
      );
    });

    it('leaves an errored query unchanged', () => {
      expect(addFilterToQuery('not-a-query', 'discipline', 'strength')).toBe('not-a-query');
    });
  });

  describe('getQueryChartShape', () => {
    it('returns empty for an empty query', () => {
      expect(getQueryChartShape('', undefined)).toEqual({ kind: 'empty' });
    });

    it('returns error when the result carries a parse error', () => {
      const result: QueryResult = {
        parsed: parseQuery('bad'),
        series: [],
        stages: { selected: 0, buckets: 0, aggregated: 0, groups: 0 },
        matched: [],
      };
      expect(getQueryChartShape('bad', result).kind).toBe('error');
    });

    it('returns scalar for a single series with a single point', () => {
      const result: QueryResult = {
        parsed: parseQuery('sum:totalVolume'),
        series: [{ key: 'totalVolume', label: 'totalVolume', points: [{ ts: 1, value: 42 }] }],
        stages: { selected: 1, buckets: 1, aggregated: 1, groups: 1 },
        matched: [],
        scalar: 42,
      };
      expect(getQueryChartShape('sum:totalVolume', result)).toEqual({ kind: 'scalar', value: 42 });
    });

    it('returns timeseries when any series has multiple points', () => {
      const result: QueryResult = {
        parsed: parseQuery('sum:totalVolume by {week}'),
        series: [
          {
            key: 'totalVolume',
            label: 'totalVolume',
            points: [
              { ts: 1, value: 10 },
              { ts: 2, value: 20 },
            ],
          },
        ],
        stages: { selected: 2, buckets: 2, aggregated: 2, groups: 1 },
        matched: [],
      };
      expect(getQueryChartShape('sum:totalVolume by {week}', result)).toEqual({ kind: 'timeseries' });
    });

    it('returns bars for multiple single-point series', () => {
      const result: QueryResult = {
        parsed: parseQuery('sum:totalVolume by {effort}'),
        series: [
          { key: 'a', label: 'a', points: [{ ts: 1, value: 10 }] },
          { key: 'b', label: 'b', points: [{ ts: 1, value: 20 }] },
        ],
        stages: { selected: 2, buckets: 1, aggregated: 2, groups: 2 },
        matched: [],
      };
      expect(getQueryChartShape('sum:totalVolume by {effort}', result)).toEqual({ kind: 'bars' });
    });
  });

  describe('EXAMPLE_QUERIES', () => {
    it('uses only real metric keys', () => {
      const realKeys: Record<string, true> = {
        totalVolume: true,
        tis: true,
        sessionLoad: true,
        totalReps: true,
        // Rollup Facts written by the lazy rollup driver (#736).
        'calc.acwr': true,
      };
      for (const ex of EXAMPLE_QUERIES) {
        const parsed = parseQuery(ex.query);
        // Find queries have no metric key — skip content-discovery examples.
        if ('target' in parsed) continue;
        expect(parsed.error).toBeUndefined();
        expect(realKeys[parsed.metric]).toBe(true);
      }
    });

    it('does not use PR or compliance facts that are not yet shipped', () => {
      for (const ex of EXAMPLE_QUERIES) {
        expect(ex.query).not.toContain('e1rm');
        expect(ex.query).not.toContain('compliance');
      }
    });
  });
});
