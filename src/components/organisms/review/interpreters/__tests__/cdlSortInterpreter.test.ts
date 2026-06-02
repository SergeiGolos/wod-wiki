import { describe, it, expect } from 'bun:test';
import {
  extractSortValue,
  compareSortValues,
  compareRowsByColumn,
  extractCombinedSortValue,
} from '../cdlSortInterpreter';
import { makeGridRow, makeGridCell } from './test-helpers';
import { MetricType } from '@/core/models/Metric';
import type { ColumnDef } from '../column-definition-language';

describe('cdlSortInterpreter', () => {
  describe('extractSortValue', () => {
    it('should extract numeric sort value from metric cell', () => {
      const cell = makeGridCell([{ type: MetricType.Rep, value: 25 }]);
      const row = makeGridRow({ cells: [[MetricType.Rep, cell]] });
      const colDef: ColumnDef = {
        id: 'rep',
        label: 'Reps',
        source: { type: 'metric-type', metricType: MetricType.Rep },
        format: { type: 'text' },
        sort: {
          type: 'numeric',
          extractor: (cell) => (cell as any)?.metrics?.[0]?.value ?? 0,
        },
      };
      expect(extractSortValue(row, colDef)).toBe(25);
    });

    it('should extract text sort value from fixed field', () => {
      const row = makeGridRow({ sourceBlockKey: 'deadlift' });
      const colDef: ColumnDef = {
        id: 'blockKey',
        label: 'Block',
        source: { type: 'fixed-field', field: 'sourceBlockKey' },
        format: { type: 'text' },
        sort: {
          type: 'text',
          extractor: (val) => String(val ?? ''),
        },
      };
      expect(extractSortValue(row, colDef)).toBe('deadlift');
    });

    it('should return empty string if no sort config', () => {
      const row = makeGridRow({});
      const colDef: ColumnDef = {
        id: 'noSort',
        label: 'No Sort',
        source: { type: 'fixed-field', field: 'index' },
        format: { type: 'text' },
      };
      expect(extractSortValue(row, colDef)).toBe('');
    });

    it('should return empty string if extractor returns undefined', () => {
      const row = makeGridRow({ cells: [] });
      const colDef: ColumnDef = {
        id: 'missing',
        label: 'Missing',
        source: { type: 'metric-type', metricType: MetricType.Rep },
        format: { type: 'text' },
        sort: {
          type: 'numeric',
          extractor: (cell) => (cell as any)?.metrics?.[0]?.value,
        },
      };
      expect(extractSortValue(row, colDef)).toBe('');
    });

    it('should extract from derived source', () => {
      const row = makeGridRow({ elapsed: 60, total: 90 });
      const colDef: ColumnDef = {
        id: 'pause',
        label: 'Pause',
        source: {
          type: 'derived',
          compute: (r) => (r.total ?? 0) - r.elapsed,
        },
        format: { type: 'time' },
        sort: {
          type: 'numeric',
          extractor: (val) => val as number,
        },
      };
      expect(extractSortValue(row, colDef)).toBe(30);
    });

    it('should extract from fallback source', () => {
      const cell = makeGridCell([{ type: MetricType.Rep, value: 15 }]);
      const row = makeGridRow({ cells: [[MetricType.Rep, cell]] });
      const colDef: ColumnDef = {
        id: 'effort',
        label: 'Effort',
        source: {
          type: 'fallback',
          semantics: 'first-present',
          sources: [
            { type: 'metric-type', metricType: MetricType.Increment },
            { type: 'metric-type', metricType: MetricType.Rep },
          ],
        },
        format: { type: 'badge', styleResolver: () => ({ className: '' }), textResolver: (v) => String(v) },
        sort: {
          type: 'numeric',
          extractor: (cell) => (cell as any)?.metrics?.[0]?.value ?? 0,
        },
      };
      expect(extractSortValue(row, colDef)).toBe(15);
    });
  });

  describe('compareSortValues', () => {
    it('should compare numbers ascending', () => {
      expect(compareSortValues(10, 20)).toBeLessThan(0);
      expect(compareSortValues(20, 10)).toBeGreaterThan(0);
      expect(compareSortValues(10, 10)).toBe(0);
    });

    it('should compare strings alphabetically', () => {
      expect(compareSortValues('apple', 'banana')).toBeLessThan(0);
      expect(compareSortValues('banana', 'apple')).toBeGreaterThan(0);
      expect(compareSortValues('apple', 'apple')).toBe(0);
    });

    it('should compare numeric strings numerically', () => {
      expect(compareSortValues('10', '2')).toBeGreaterThan(0); // 10 > 2
      expect(compareSortValues('2', '10')).toBeLessThan(0);
    });

    it('should handle NaN gracefully', () => {
      expect(compareSortValues(NaN, NaN)).toBe(0);
      expect(compareSortValues(NaN, 5)).toBeGreaterThan(0);
      expect(compareSortValues(5, NaN)).toBeLessThan(0);
    });
  });

  describe('compareRowsByColumn', () => {
    it('should compare rows ascending', () => {
      const rowA = makeGridRow({ index: 1, elapsed: 30 });
      const rowB = makeGridRow({ index: 2, elapsed: 60 });
      const colDef: ColumnDef = {
        id: 'elapsed',
        label: 'Elapsed',
        source: { type: 'fixed-field', field: 'elapsed' },
        format: { type: 'time' },
        sort: {
          type: 'numeric',
          extractor: (val) => val as number,
        },
      };
      expect(compareRowsByColumn(rowA, rowB, colDef, 'asc')).toBeLessThan(0);
      expect(compareRowsByColumn(rowB, rowA, colDef, 'asc')).toBeGreaterThan(0);
    });

    it('should compare rows descending', () => {
      const rowA = makeGridRow({ index: 1, elapsed: 30 });
      const rowB = makeGridRow({ index: 2, elapsed: 60 });
      const colDef: ColumnDef = {
        id: 'elapsed',
        label: 'Elapsed',
        source: { type: 'fixed-field', field: 'elapsed' },
        format: { type: 'time' },
        sort: {
          type: 'numeric',
          extractor: (val) => val as number,
        },
      };
      expect(compareRowsByColumn(rowA, rowB, colDef, 'desc')).toBeGreaterThan(0);
      expect(compareRowsByColumn(rowB, rowA, colDef, 'desc')).toBeLessThan(0);
    });
  });

  describe('extractCombinedSortValue', () => {
    it('should return primary element by default', () => {
      expect(extractCombinedSortValue(['a', 'b', 'c'])).toBe('a');
    });

    it('should return secondary element when index is 1', () => {
      expect(extractCombinedSortValue(['a', 'b', 'c'], 1)).toBe('b');
    });

    it('should return tertiary element when index is 2', () => {
      expect(extractCombinedSortValue(['a', 'b', 'c'], 2)).toBe('c');
    });

    it('should return undefined for out-of-range index', () => {
      expect(extractCombinedSortValue(['a'], 1)).toBeUndefined();
    });

    it('should return non-array value as-is for index 0', () => {
      expect(extractCombinedSortValue(42)).toBe(42);
    });

    it('should return undefined for non-array value with non-zero index', () => {
      expect(extractCombinedSortValue(42, 1)).toBeUndefined();
    });

    it('should work with combined fallback source for sort', () => {
      const repCell = makeGridCell([{ type: MetricType.Rep, value: 10 }]);
      const weightCell = makeGridCell([{ type: MetricType.Resistance, value: 100 }]);
      const row = makeGridRow({
        cells: [
          [MetricType.Rep, repCell],
          [MetricType.Resistance, weightCell],
        ],
      });
      const colDef: ColumnDef = {
        id: 'combined',
        label: 'Combined',
        source: {
          type: 'fallback',
          semantics: 'all-present-combined',
          sources: [
            { type: 'metric-type', metricType: MetricType.Rep },
            { type: 'metric-type', metricType: MetricType.Resistance },
          ],
        },
        format: { type: 'combined', layout: 'vertical' },
        sort: {
          type: 'numeric',
          extractor: (val) => {
            const primary = extractCombinedSortValue(val, 0);
            return (primary as any)?.metrics?.[0]?.value ?? 0;
          },
        },
      };
      expect(extractSortValue(row, colDef)).toBe(10);
    });
  });
});
