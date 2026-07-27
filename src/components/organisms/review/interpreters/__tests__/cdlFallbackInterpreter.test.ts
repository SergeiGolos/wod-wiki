import { describe, it, expect } from 'bun:test';
import { interpretFallbackChain } from '../cdlFallbackInterpreter';
import { makeGridRow, makeGridCell } from './test-helpers';
import { MetricType } from '@/core/models/Metric';
import type { FallbackSource } from '../../column-definition-language';

describe('cdlFallbackInterpreter', () => {
  describe('first-present semantics', () => {
    it('should return first present metric-type source', () => {
      const cell = makeGridCell([{ type: MetricType.Rep, value: 10 }]);
      const row = makeGridRow({ cells: [[MetricType.Rep, cell]] });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'first-present',
        sources: [
          { type: 'metric-type', metricType: MetricType.Increment },
          { type: 'metric-type', metricType: MetricType.Rep },
        ],
      };
      expect(interpretFallbackChain(row, source)).toBe(cell);
    });

    it('should return first source when multiple are present', () => {
      const repCell = makeGridCell([{ type: MetricType.Rep, value: 10 }]);
      const incCell = makeGridCell([{ type: MetricType.Increment, value: 5 }]);
      const row = makeGridRow({
        cells: [
          [MetricType.Rep, repCell],
          [MetricType.Increment, incCell],
        ],
      });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'first-present',
        sources: [
          { type: 'metric-type', metricType: MetricType.Increment },
          { type: 'metric-type', metricType: MetricType.Rep },
        ],
      };
      expect(interpretFallbackChain(row, source)).toBe(incCell);
    });

    it('should skip null/undefined values', () => {
      const cell = makeGridCell([{ type: MetricType.Rep, value: 10 }]);
      const row = makeGridRow({ cells: [[MetricType.Rep, cell]] });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'first-present',
        sources: [
          { type: 'metric-type', metricType: MetricType.Increment },
          { type: 'metric-type', metricType: MetricType.Rep },
        ],
      };
      expect(interpretFallbackChain(row, source)).toBe(cell);
    });

    it('should return undefined when all sources absent', () => {
      const row = makeGridRow({ cells: [] });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'first-present',
        sources: [
          { type: 'metric-type', metricType: MetricType.Increment },
          { type: 'metric-type', metricType: MetricType.Rep },
        ],
      };
      expect(interpretFallbackChain(row, source)).toBeUndefined();
    });

    it('should handle fixed-field sources in chain', () => {
      const row = makeGridRow({ sourceBlockKey: 'squat' });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'first-present',
        sources: [
          { type: 'fixed-field', field: 'duration' },
          { type: 'fixed-field', field: 'sourceBlockKey' },
        ],
      };
      expect(interpretFallbackChain(row, source)).toBe('squat');
    });

    it('should handle derived sources in chain', () => {
      const row = makeGridRow({ elapsed: 60, total: 90 });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'first-present',
        sources: [
          { type: 'fixed-field', field: 'duration' },
          {
            type: 'derived',
            compute: (r) => (r.total ?? 0) - r.elapsed,
          },
        ],
      };
      expect(interpretFallbackChain(row, source)).toBe(30);
    });

    it('should handle nested fallback chains', () => {
      const cell = makeGridCell([{ type: MetricType.Rep, value: 10 }]);
      const row = makeGridRow({ cells: [[MetricType.Rep, cell]] });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'first-present',
        sources: [
          {
            type: 'fallback',
            semantics: 'first-present',
            sources: [
              { type: 'metric-type', metricType: MetricType.Increment },
              { type: 'metric-type', metricType: MetricType.Resistance },
            ],
          },
          { type: 'metric-type', metricType: MetricType.Rep },
        ],
      };
      expect(interpretFallbackChain(row, source)).toBe(cell);
    });

    it('should return undefined for empty source array', () => {
      const row = makeGridRow({});
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'first-present',
        sources: [],
      };
      expect(interpretFallbackChain(row, source)).toBeUndefined();
    });

    it('should treat explicit null values as absent', () => {
      const row = makeGridRow({ completionReason: null as any, outputType: 'segment' });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'first-present',
        sources: [
          { type: 'fixed-field', field: 'completionReason' },
          { type: 'fixed-field', field: 'outputType' },
        ],
      };
      expect(interpretFallbackChain(row, source)).toBe('segment');
    });
  });

  describe('all-present-joined semantics', () => {
    it('should join all present sources with separator', () => {
      const effortCell = makeGridCell([{ type: MetricType.Effort, value: 'Heavy' }]);
      const textCell = makeGridCell([{ type: MetricType.Text, value: 'squat' }]);
      const row = makeGridRow({
        cells: [
          [MetricType.Effort, effortCell],
          [MetricType.Text, textCell],
        ],
      });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'all-present-joined',
        joinString: ' — ',
        sources: [
          { type: 'metric-type', metricType: MetricType.Effort },
          { type: 'metric-type', metricType: MetricType.Text },
        ],
      };
      expect(interpretFallbackChain(row, source)).toBe('Heavy — squat');
    });

    it('should return undefined if any source is missing', () => {
      const effortCell = makeGridCell([{ type: MetricType.Effort, value: 'Heavy' }]);
      const row = makeGridRow({
        cells: [[MetricType.Effort, effortCell]],
      });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'all-present-joined',
        joinString: ' — ',
        sources: [
          { type: 'metric-type', metricType: MetricType.Effort },
          { type: 'metric-type', metricType: MetricType.Text },
        ],
      };
      expect(interpretFallbackChain(row, source)).toBeUndefined();
    });

    it('should use default space separator when joinString omitted', () => {
      const row = makeGridRow({ sourceBlockKey: 'a', outputType: 'b' });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'all-present-joined',
        sources: [
          { type: 'fixed-field', field: 'sourceBlockKey' },
          { type: 'fixed-field', field: 'outputType' },
        ],
      };
      expect(interpretFallbackChain(row, source)).toBe('a b');
    });

    it('should extract display text from GridCell-like values', () => {
      const cell = makeGridCell([{ type: MetricType.Rep, value: 42, image: '42 reps' }]);
      const row = makeGridRow({
        cells: [[MetricType.Rep, cell]],
        sourceBlockKey: 'squat',
      });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'all-present-joined',
        joinString: ' | ',
        sources: [
          { type: 'fixed-field', field: 'sourceBlockKey' },
          { type: 'metric-type', metricType: MetricType.Rep },
        ],
      };
      expect(interpretFallbackChain(row, source)).toBe('squat | 42 reps');
    });

    it('should return undefined for empty source array', () => {
      const row = makeGridRow({});
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'all-present-joined',
        sources: [],
      };
      expect(interpretFallbackChain(row, source)).toBeUndefined();
    });

    it('should handle numeric values in joined output', () => {
      const row = makeGridRow({ elapsed: 60, total: 120 });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'all-present-joined',
        joinString: ' / ',
        sources: [
          { type: 'fixed-field', field: 'elapsed' },
          { type: 'fixed-field', field: 'total' },
        ],
      };
      expect(interpretFallbackChain(row, source)).toBe('60 / 120');
    });

    it('should handle boolean values in joined output', () => {
      const row = makeGridRow({ index: 1 });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'all-present-joined',
        joinString: ', ',
        sources: [
          { type: 'derived', compute: () => true },
          { type: 'derived', compute: () => false },
        ],
      };
      expect(interpretFallbackChain(row, source)).toBe('true, false');
    });
  });

  describe('all-present-combined semantics', () => {
    it('should return array of all present values', () => {
      const repCell = makeGridCell([{ type: MetricType.Rep, value: 10 }]);
      const weightCell = makeGridCell([{ type: MetricType.Resistance, value: 100 }]);
      const row = makeGridRow({
        cells: [
          [MetricType.Rep, repCell],
          [MetricType.Resistance, weightCell],
        ],
      });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'all-present-combined',
        sources: [
          { type: 'metric-type', metricType: MetricType.Rep },
          { type: 'metric-type', metricType: MetricType.Resistance },
        ],
      };
      const result = interpretFallbackChain(row, source);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([repCell, weightCell]);
    });

    it('should return undefined if any source is missing', () => {
      const row = makeGridRow({ cells: [] });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'all-present-combined',
        sources: [
          { type: 'metric-type', metricType: MetricType.Rep },
          { type: 'metric-type', metricType: MetricType.Resistance },
        ],
      };
      expect(interpretFallbackChain(row, source)).toBeUndefined();
    });

    it('should return single-element array for one source', () => {
      const cell = makeGridCell([{ type: MetricType.Rep, value: 10 }]);
      const row = makeGridRow({ cells: [[MetricType.Rep, cell]] });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'all-present-combined',
        sources: [
          { type: 'metric-type', metricType: MetricType.Rep },
        ],
      };
      const result = interpretFallbackChain(row, source);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([cell]);
    });

    it('should return undefined for empty source array', () => {
      const row = makeGridRow({});
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'all-present-combined',
        sources: [],
      };
      expect(interpretFallbackChain(row, source)).toBeUndefined();
    });

    it('should handle mixed source types in combined array', () => {
      const cell = makeGridCell([{ type: MetricType.Rep, value: 10 }]);
      const row = makeGridRow({
        cells: [[MetricType.Rep, cell]],
        sourceBlockKey: 'squat',
      });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'all-present-combined',
        sources: [
          { type: 'fixed-field', field: 'sourceBlockKey' },
          { type: 'metric-type', metricType: MetricType.Rep },
        ],
      };
      const result = interpretFallbackChain(row, source);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['squat', cell]);
    });
  });

  describe('edge cases', () => {
    it('should handle deeply nested fallback chains', () => {
      const cell = makeGridCell([{ type: MetricType.Rep, value: 10 }]);
      const row = makeGridRow({ cells: [[MetricType.Rep, cell]] });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'first-present',
        sources: [
          {
            type: 'fallback',
            semantics: 'first-present',
            sources: [
              {
                type: 'fallback',
                semantics: 'first-present',
                sources: [
                  { type: 'metric-type', metricType: MetricType.Increment },
                  { type: 'metric-type', metricType: MetricType.Resistance },
                ],
              },
              { type: 'metric-type', metricType: MetricType.Distance },
            ],
          },
          { type: 'metric-type', metricType: MetricType.Rep },
        ],
      };
      expect(interpretFallbackChain(row, source)).toBe(cell);
    });

    it('should handle context propagation through chains', () => {
      const row = makeGridRow({ index: 5 });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'first-present',
        sources: [
          {
            type: 'derived',
            compute: (_r, ctx) => (ctx as any)?.multiplier,
          },
          {
            type: 'derived',
            compute: (_r, ctx) => (ctx as any)?.multiplier * 5,
            context: { multiplier: 3 },
          },
        ],
      };
      expect(interpretFallbackChain(row, source, { multiplier: 7 })).toBe(7);
    });

    it('should handle context on all-present-joined derived sources', () => {
      const row = makeGridRow({ index: 1 });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'all-present-joined',
        joinString: 'x',
        sources: [
          {
            type: 'derived',
            compute: (_r, ctx) => (ctx as any)?.prefix,
          },
          {
            type: 'derived',
            compute: (_r, ctx) => (ctx as any)?.suffix,
          },
        ],
      };
      expect(interpretFallbackChain(row, source, { prefix: 'pre', suffix: 'suf' })).toBe('prexsuf');
    });

    it('should handle all-present-joined with all-undefined derived sources', () => {
      const row = makeGridRow({});
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'all-present-joined',
        sources: [
          {
            type: 'derived',
            compute: () => undefined,
          },
          {
            type: 'derived',
            compute: () => 'fallback',
          },
        ],
      };
      expect(interpretFallbackChain(row, source)).toBeUndefined();
    });

    it('should coerce objects with toString in joined output', () => {
      const row = makeGridRow({ index: 1 });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'all-present-joined',
        joinString: ', ',
        sources: [
          { type: 'derived', compute: () => ({ toString: () => 'custom' }) },
          { type: 'derived', compute: () => ({ toString: () => 'object' }) },
        ],
      };
      expect(interpretFallbackChain(row, source)).toBe('custom, object');
    });

    it('should handle string value with no metrics in joined output', () => {
      const row = makeGridRow({ sourceBlockKey: 'squat' });
      const source: FallbackSource = {
        type: 'fallback',
        semantics: 'all-present-joined',
        joinString: ' ',
        sources: [
          { type: 'fixed-field', field: 'sourceBlockKey' },
          { type: 'fixed-field', field: 'outputType' },
        ],
      };
      expect(interpretFallbackChain(row, source)).toBe('squat segment');
    });
  });
});
