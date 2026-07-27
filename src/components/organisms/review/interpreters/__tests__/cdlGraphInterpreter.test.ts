import { describe, it, expect } from 'bun:test';
import { extractGraphValue, buildGraphDataPoint } from '../cdlGraphInterpreter';
import { makeGridRow, makeGridCell } from './test-helpers';
import { MetricType } from '@/core/models/Metric';
import type { ColumnDef } from '../../column-definition-language';

describe('cdlGraphInterpreter', () => {
  describe('extractGraphValue', () => {
    it('should extract numeric value from metric cell', () => {
      const cell = makeGridCell([{ type: MetricType.Rep, value: 25 }]);
      const row = makeGridRow({ cells: [[MetricType.Rep, cell]] });
      const colDef: ColumnDef = {
        id: 'rep',
        label: 'Reps',
        source: { type: 'metric-type', metricType: MetricType.Rep },
        format: { type: 'text' },
        graph: {
          extractor: (cell) => (cell as any)?.metrics?.[0]?.value,
          axisLabel: 'Reps',
          unit: 'reps',
        },
      };
      expect(extractGraphValue(row, colDef)).toBe(25);
    });

    it('should return undefined for missing metric', () => {
      const row = makeGridRow({ cells: [] });
      const colDef: ColumnDef = {
        id: 'rep',
        label: 'Reps',
        source: { type: 'metric-type', metricType: MetricType.Rep },
        format: { type: 'text' },
        graph: {
          extractor: (cell) => (cell as any)?.metrics?.[0]?.value,
        },
      };
      expect(extractGraphValue(row, colDef)).toBeUndefined();
    });

    it('should return undefined if no graph config', () => {
      const row = makeGridRow({});
      const colDef: ColumnDef = {
        id: 'noGraph',
        label: 'No Graph',
        source: { type: 'fixed-field', field: 'index' },
        format: { type: 'text' },
      };
      expect(extractGraphValue(row, colDef)).toBeUndefined();
    });

    it('should extract from fixed field', () => {
      const row = makeGridRow({ elapsed: 120 });
      const colDef: ColumnDef = {
        id: 'elapsed',
        label: 'Elapsed',
        source: { type: 'fixed-field', field: 'elapsed' },
        format: { type: 'time' },
        graph: {
          extractor: (val) => val as number,
          axisLabel: 'Elapsed (s)',
          unit: 'seconds',
        },
      };
      expect(extractGraphValue(row, colDef)).toBe(120);
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
        graph: {
          extractor: (val) => val as number,
        },
      };
      expect(extractGraphValue(row, colDef)).toBe(30);
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
        graph: {
          extractor: (cell) => (cell as any)?.metrics?.[0]?.value,
        },
      };
      expect(extractGraphValue(row, colDef)).toBe(15);
    });
  });

  describe('buildGraphDataPoint', () => {
    it('should build a data point from multiple columns', () => {
      const repCell = makeGridCell([{ type: MetricType.Rep, value: 10 }]);
      const distCell = makeGridCell([{ type: MetricType.Distance, value: 500 }]);
      const row = makeGridRow({
        cells: [
          [MetricType.Rep, repCell],
          [MetricType.Distance, distCell],
        ],
      });

      const colDefs: ColumnDef[] = [
        {
          id: 'rep',
          label: 'Reps',
          source: { type: 'metric-type', metricType: MetricType.Rep },
          format: { type: 'text' },
          graph: { extractor: (cell) => (cell as any)?.metrics?.[0]?.value },
        },
        {
          id: 'distance',
          label: 'Distance',
          source: { type: 'metric-type', metricType: MetricType.Distance },
          format: { type: 'text' },
          graph: { extractor: (cell) => (cell as any)?.metrics?.[0]?.value },
        },
        {
          id: 'noGraph',
          label: 'No Graph',
          source: { type: 'fixed-field', field: 'index' },
          format: { type: 'text' },
        },
      ];

      const point = buildGraphDataPoint(row, colDefs);
      expect(point).toEqual({
        rep: 10,
        distance: 500,
      });
    });
  });
});
