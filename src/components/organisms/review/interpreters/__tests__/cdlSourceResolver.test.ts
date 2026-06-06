import { describe, it, expect } from 'bun:test';
import { resolveColumnSource } from '../cdlSourceResolver';
import { makeGridRow, makeGridCell } from './test-helpers';
import { MetricType } from '@/core/models/Metric';
import type { ColumnSource } from '../../column-definition-language';

describe('cdlSourceResolver', () => {
  describe('fixed-field source', () => {
    it('should resolve index field', () => {
      const row = makeGridRow({ index: 42 });
      const source: ColumnSource = { type: 'fixed-field', field: 'index' };
      expect(resolveColumnSource(row, source)).toBe(42);
    });

    it('should resolve sourceBlockKey field', () => {
      const row = makeGridRow({ sourceBlockKey: 'squat' });
      const source: ColumnSource = { type: 'fixed-field', field: 'sourceBlockKey' };
      expect(resolveColumnSource(row, source)).toBe('squat');
    });

    it('should resolve elapsed field', () => {
      const row = makeGridRow({ elapsed: 120 });
      const source: ColumnSource = { type: 'fixed-field', field: 'elapsed' };
      expect(resolveColumnSource(row, source)).toBe(120);
    });
  });

  describe('metric-type source', () => {
    it('should resolve a metric-type cell', () => {
      const cell = makeGridCell([{ type: MetricType.Rep, value: 10 }]);
      const row = makeGridRow({ cells: [[MetricType.Rep, cell]] });
      const source: ColumnSource = { type: 'metric-type', metricType: MetricType.Rep };
      expect(resolveColumnSource(row, source)).toBe(cell);
    });

    it('should return undefined for missing metric type', () => {
      const row = makeGridRow({ cells: [] });
      const source: ColumnSource = { type: 'metric-type', metricType: MetricType.Rep };
      expect(resolveColumnSource(row, source)).toBeUndefined();
    });
  });

  describe('derived source', () => {
    it('should compute a derived value', () => {
      const row = makeGridRow({ elapsed: 60, total: 90 });
      const source: ColumnSource = {
        type: 'derived',
        compute: (r) => (r.total ?? 0) - r.elapsed,
      };
      expect(resolveColumnSource(row, source)).toBe(30);
    });

    it('should receive context', () => {
      const row = makeGridRow({ index: 5 });
      const source: ColumnSource = {
        type: 'derived',
        compute: (_r, ctx) => (ctx as any)?.multiplier * 5,
        context: { multiplier: 3 },
      };
      expect(resolveColumnSource(row, source, { multiplier: 3 })).toBe(15);
    });
  });

  describe('fallback source — first-present', () => {
    it('should return first present source', () => {
      const cell = makeGridCell([{ type: MetricType.Rep, value: 10 }]);
      const row = makeGridRow({ cells: [[MetricType.Rep, cell]] });
      const source: ColumnSource = {
        type: 'fallback',
        semantics: 'first-present',
        sources: [
          { type: 'metric-type', metricType: MetricType.Increment },
          { type: 'metric-type', metricType: MetricType.Rep },
        ],
      };
      expect(resolveColumnSource(row, source)).toBe(cell);
    });

    it('should skip null/undefined sources', () => {
      const cell = makeGridCell([{ type: MetricType.Rep, value: 10 }]);
      const row = makeGridRow({ cells: [[MetricType.Rep, cell]] });
      const source: ColumnSource = {
        type: 'fallback',
        semantics: 'first-present',
        sources: [
          { type: 'metric-type', metricType: MetricType.Increment },
          { type: 'metric-type', metricType: MetricType.Rep },
        ],
      };
      expect(resolveColumnSource(row, source)).toBe(cell);
    });

    it('should return undefined if all sources absent', () => {
      const row = makeGridRow({ cells: [] });
      const source: ColumnSource = {
        type: 'fallback',
        semantics: 'first-present',
        sources: [
          { type: 'metric-type', metricType: MetricType.Increment },
          { type: 'metric-type', metricType: MetricType.Rep },
        ],
      };
      expect(resolveColumnSource(row, source)).toBeUndefined();
    });
  });

  describe('fallback source — all-present-joined', () => {
    it('should join all present sources with separator', () => {
      const effortCell = makeGridCell([{ type: MetricType.Effort, value: 'Heavy' }]);
      const textCell = makeGridCell([{ type: MetricType.Text, value: 'squat' }]);
      const row = makeGridRow({
        cells: [
          [MetricType.Effort, effortCell],
          [MetricType.Text, textCell],
        ],
      });
      const source: ColumnSource = {
        type: 'fallback',
        semantics: 'all-present-joined',
        joinString: ' — ',
        sources: [
          { type: 'metric-type', metricType: MetricType.Effort },
          { type: 'metric-type', metricType: MetricType.Text },
        ],
      };
      expect(resolveColumnSource(row, source)).toBe('Heavy — squat');
    });

    it('should return undefined if any source is missing', () => {
      const effortCell = makeGridCell([{ type: MetricType.Effort, value: 'Heavy' }]);
      const row = makeGridRow({
        cells: [[MetricType.Effort, effortCell]],
      });
      const source: ColumnSource = {
        type: 'fallback',
        semantics: 'all-present-joined',
        joinString: ' — ',
        sources: [
          { type: 'metric-type', metricType: MetricType.Effort },
          { type: 'metric-type', metricType: MetricType.Text },
        ],
      };
      expect(resolveColumnSource(row, source)).toBeUndefined();
    });
  });

  describe('fallback source — all-present-combined', () => {
    it('should return array of all present values', () => {
      const repCell = makeGridCell([{ type: MetricType.Rep, value: 10 }]);
      const weightCell = makeGridCell([{ type: MetricType.Resistance, value: 100 }]);
      const row = makeGridRow({
        cells: [
          [MetricType.Rep, repCell],
          [MetricType.Resistance, weightCell],
        ],
      });
      const source: ColumnSource = {
        type: 'fallback',
        semantics: 'all-present-combined',
        sources: [
          { type: 'metric-type', metricType: MetricType.Rep },
          { type: 'metric-type', metricType: MetricType.Resistance },
        ],
      };
      const result = resolveColumnSource(row, source);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([repCell, weightCell]);
    });

    it('should return undefined if any source is missing', () => {
      const row = makeGridRow({ cells: [] });
      const source: ColumnSource = {
        type: 'fallback',
        semantics: 'all-present-combined',
        sources: [
          { type: 'metric-type', metricType: MetricType.Rep },
          { type: 'metric-type', metricType: MetricType.Resistance },
        ],
      };
      expect(resolveColumnSource(row, source)).toBeUndefined();
    });
  });
});
