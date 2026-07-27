import { describe, it, expect } from 'bun:test';
import {
  extractFilterText,
  matchColumnFilter,
  matchGlobalSearch,
  extractCombinedFilterText,
} from '../cdlFilterInterpreter';
import { makeGridRow, makeGridCell } from './test-helpers';
import { MetricType } from '@/core/models/Metric';
import type { ColumnDef } from '../../column-definition-language';

describe('cdlFilterInterpreter', () => {
  describe('extractFilterText', () => {
    it('should extract text from metric cell', () => {
      const cell = makeGridCell([{ type: MetricType.Text, value: 'squat' }]);
      const row = makeGridRow({ cells: [[MetricType.Text, cell]] });
      const colDef: ColumnDef = {
        id: 'text',
        label: 'Text',
        source: { type: 'metric-type', metricType: MetricType.Text },
        format: { type: 'text' },
        filter: {
          extractor: (cell) => (cell as any)?.metrics?.[0]?.value?.toString(),
        },
      };
      expect(extractFilterText(row, colDef)).toBe('squat');
    });

    it('should extract text from fixed field', () => {
      const row = makeGridRow({ sourceBlockKey: 'deadlift' });
      const colDef: ColumnDef = {
        id: 'blockKey',
        label: 'Block',
        source: { type: 'fixed-field', field: 'sourceBlockKey' },
        format: { type: 'text' },
        filter: {
          extractor: (val) => String(val ?? ''),
        },
      };
      expect(extractFilterText(row, colDef)).toBe('deadlift');
    });

    it('should return empty string if no filter config', () => {
      const row = makeGridRow({});
      const colDef: ColumnDef = {
        id: 'noFilter',
        label: 'No Filter',
        source: { type: 'fixed-field', field: 'index' },
        format: { type: 'text' },
      };
      expect(extractFilterText(row, colDef)).toBe('');
    });

    it('should return empty string if extractor returns undefined', () => {
      const row = makeGridRow({ cells: [] });
      const colDef: ColumnDef = {
        id: 'missing',
        label: 'Missing',
        source: { type: 'metric-type', metricType: MetricType.Rep },
        format: { type: 'text' },
        filter: {
          extractor: (cell) => (cell as any)?.metrics?.[0]?.value?.toString(),
        },
      };
      expect(extractFilterText(row, colDef)).toBe('');
    });
  });

  describe('matchColumnFilter', () => {
    it('should match contained text (case-insensitive)', () => {
      const row = makeGridRow({ sourceBlockKey: 'HeavySquat' });
      const colDef: ColumnDef = {
        id: 'blockKey',
        label: 'Block',
        source: { type: 'fixed-field', field: 'sourceBlockKey' },
        format: { type: 'text' },
        filter: {
          extractor: (val) => String(val ?? ''),
        },
      };
      expect(matchColumnFilter(row, colDef, 'squat')).toBe(true);
      expect(matchColumnFilter(row, colDef, 'SQUAT')).toBe(true);
      expect(matchColumnFilter(row, colDef, 'deadlift')).toBe(false);
    });

    it('should match with case-sensitive filter', () => {
      const row = makeGridRow({ sourceBlockKey: 'HeavySquat' });
      const colDef: ColumnDef = {
        id: 'blockKey',
        label: 'Block',
        source: { type: 'fixed-field', field: 'sourceBlockKey' },
        format: { type: 'text' },
        filter: {
          extractor: (val) => String(val ?? ''),
          caseInsensitive: false,
        },
      };
      expect(matchColumnFilter(row, colDef, 'Squat')).toBe(true);
      expect(matchColumnFilter(row, colDef, 'squat')).toBe(false);
    });

    it('should use custom matcher when provided', () => {
      const row = makeGridRow({ sourceBlockKey: 'squat-5x5' });
      const colDef: ColumnDef = {
        id: 'blockKey',
        label: 'Block',
        source: { type: 'fixed-field', field: 'sourceBlockKey' },
        format: { type: 'text' },
        filter: {
          extractor: (val) => String(val ?? ''),
          matcher: (haystack, needle) => haystack.startsWith(needle),
        },
      };
      expect(matchColumnFilter(row, colDef, 'squat')).toBe(true);
      expect(matchColumnFilter(row, colDef, '5x5')).toBe(false);
    });

    it('should return true for empty filter text', () => {
      const row = makeGridRow({ sourceBlockKey: 'squat' });
      const colDef: ColumnDef = {
        id: 'blockKey',
        label: 'Block',
        source: { type: 'fixed-field', field: 'sourceBlockKey' },
        format: { type: 'text' },
        filter: {
          extractor: (val) => String(val ?? ''),
        },
      };
      expect(matchColumnFilter(row, colDef, '')).toBe(true);
      expect(matchColumnFilter(row, colDef, '   ')).toBe(true);
    });

    it('should return true if column has no filter config', () => {
      const row = makeGridRow({ sourceBlockKey: 'squat' });
      const colDef: ColumnDef = {
        id: 'noFilter',
        label: 'No Filter',
        source: { type: 'fixed-field', field: 'sourceBlockKey' },
        format: { type: 'text' },
      };
      expect(matchColumnFilter(row, colDef, 'squat')).toBe(true);
    });
  });

  describe('matchGlobalSearch', () => {
    it('should match when any column contains search text', () => {
      const cell = makeGridCell([{ type: MetricType.Text, value: 'back squat' }]);
      const row = makeGridRow({
        sourceBlockKey: 'squat',
        cells: [[MetricType.Text, cell]],
      });

      const colDefs: ColumnDef[] = [
        {
          id: 'blockKey',
          label: 'Block',
          source: { type: 'fixed-field', field: 'sourceBlockKey' },
          format: { type: 'text' },
          filter: { extractor: (val) => String(val ?? '') },
        },
        {
          id: 'text',
          label: 'Text',
          source: { type: 'metric-type', metricType: MetricType.Text },
          format: { type: 'text' },
          filter: { extractor: (cell) => (cell as any)?.metrics?.[0]?.value?.toString() ?? '' },
        },
      ];

      expect(matchGlobalSearch(row, colDefs, 'squat')).toBe(true);
      expect(matchGlobalSearch(row, colDefs, 'back')).toBe(true);
      expect(matchGlobalSearch(row, colDefs, 'deadlift')).toBe(false);
    });

    it('should return true for empty search text', () => {
      const row = makeGridRow({});
      const colDefs: ColumnDef[] = [
        {
          id: 'blockKey',
          label: 'Block',
          source: { type: 'fixed-field', field: 'sourceBlockKey' },
          format: { type: 'text' },
          filter: { extractor: (val) => String(val ?? '') },
        },
      ];
      expect(matchGlobalSearch(row, colDefs, '')).toBe(true);
    });

    it('should skip columns without filter config', () => {
      const row = makeGridRow({ sourceBlockKey: 'squat' });
      const colDefs: ColumnDef[] = [
        {
          id: 'noFilter',
          label: 'No Filter',
          source: { type: 'fixed-field', field: 'sourceBlockKey' },
          format: { type: 'text' },
        },
      ];
      expect(matchGlobalSearch(row, colDefs, 'squat')).toBe(false);
    });
  });

  describe('extractCombinedFilterText', () => {
    it('should join array values with default separator', () => {
      expect(extractCombinedFilterText(['Heavy', 'squat'])).toBe('Heavy squat');
    });

    it('should join array values with custom separator', () => {
      expect(extractCombinedFilterText(['Heavy', 'squat'], ' — ')).toBe('Heavy — squat');
    });

    it('should handle non-array value', () => {
      expect(extractCombinedFilterText('single')).toBe('single');
    });

    it('should handle null/undefined in array', () => {
      expect(extractCombinedFilterText(['Heavy', null, 'squat'])).toBe('Heavy squat');
    });

    it('should extract display text from GridCell-like values', () => {
      const cell = makeGridCell([{ type: MetricType.Rep, value: 10 }]);
      expect(extractCombinedFilterText([cell, 'reps'])).toBe('10 reps');
    });

    it('should handle numbers and booleans', () => {
      expect(extractCombinedFilterText([5, true, 'ok'])).toBe('5 true ok');
    });

    it('should work with combined fallback source for filter', () => {
      const effortCell = makeGridCell([{ type: MetricType.Effort, value: 'Heavy' }]);
      const textCell = makeGridCell([{ type: MetricType.Text, value: 'squat' }]);
      const row = makeGridRow({
        cells: [
          [MetricType.Effort, effortCell],
          [MetricType.Text, textCell],
        ],
      });
      const colDef: ColumnDef = {
        id: 'exercise',
        label: 'Exercise',
        source: {
          type: 'fallback',
          semantics: 'all-present-combined',
          sources: [
            { type: 'metric-type', metricType: MetricType.Effort },
            { type: 'metric-type', metricType: MetricType.Text },
          ],
        },
        format: { type: 'combined', layout: 'vertical' },
        filter: {
          extractor: (val) => extractCombinedFilterText(val as unknown[], ' '),
        },
      };
      expect(extractFilterText(row, colDef)).toBe('Heavy squat');
      expect(matchColumnFilter(row, colDef, 'heavy')).toBe(true);
      expect(matchColumnFilter(row, colDef, 'squat')).toBe(true);
      expect(matchColumnFilter(row, colDef, 'bench')).toBe(false);
    });
  });
});
