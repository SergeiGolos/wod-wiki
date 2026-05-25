import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  UnifiedCellRenderer,
  inferColumnDefFromGridColumn,
} from '../cdlCellRenderer';
import { makeGridRow, makeGridCell } from './test-helpers';
import { MetricType } from '@/core/models/Metric';
import type { ColumnDef } from '../../column-definition-language';
import type { GridColumn } from '../../types';

// ─── Helpers ───────────────────────────────────────────────────

function renderCell(columnDef: ColumnDef, row: any, indent = 0): string {
  const el = React.createElement(UnifiedCellRenderer, {
    columnDef,
    row,
    indent,
  });
  return renderToString(el);
}

// ─── UnifiedCellRenderer ───────────────────────────────────────

describe('UnifiedCellRenderer', () => {
  describe('text format', () => {
    it('should render plain text from fixed field', () => {
      const row = makeGridRow({ sourceBlockKey: 'squat' });
      const colDef: ColumnDef = {
        id: 'blockKey',
        label: 'Block',
        source: { type: 'fixed-field', field: 'sourceBlockKey' },
        format: { type: 'text' },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('squat');
    });

    it('should apply className from text format', () => {
      const row = makeGridRow({ index: 42 });
      const colDef: ColumnDef = {
        id: 'index',
        label: '#',
        source: { type: 'fixed-field', field: 'index' },
        format: { type: 'text', className: 'font-mono text-xs' },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('font-mono');
      expect(html).toContain('42');
    });

    it('should apply transform from text format', () => {
      const row = makeGridRow({ index: 42 });
      const colDef: ColumnDef = {
        id: 'index',
        label: '#',
        source: { type: 'fixed-field', field: 'index' },
        format: { type: 'text', transform: (v) => `#${v}` },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('#42');
    });
  });

  describe('time format', () => {
    it('should render short time (mm:ss)', () => {
      const row = makeGridRow({ elapsed: 125 });
      const colDef: ColumnDef = {
        id: 'elapsed',
        label: 'Elapsed',
        source: { type: 'fixed-field', field: 'elapsed' },
        format: { type: 'time', style: 'short' },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('02:05');
    });

    it('should render long time (h:mm:ss)', () => {
      const row = makeGridRow({ elapsed: 3665 });
      const colDef: ColumnDef = {
        id: 'elapsed',
        label: 'Elapsed',
        source: { type: 'fixed-field', field: 'elapsed' },
        format: { type: 'time', style: 'long' },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('01:01:05');
    });

    it('should render dash for undefined time', () => {
      const row = makeGridRow({});
      const colDef: ColumnDef = {
        id: 'duration',
        label: 'Duration',
        source: { type: 'fixed-field', field: 'duration' },
        format: { type: 'time', style: 'short' },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('—');
    });
  });

  describe('number format', () => {
    it('should render number with decimals', () => {
      const row = makeGridRow({ elapsed: 12.5 });
      const colDef: ColumnDef = {
        id: 'elapsed',
        label: 'Elapsed',
        source: { type: 'fixed-field', field: 'elapsed' },
        format: { type: 'number', decimals: 1, unit: 's' },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('12.5s');
    });

    it('should render dash for non-numeric value', () => {
      const row = makeGridRow({});
      const colDef: ColumnDef = {
        id: 'duration',
        label: 'Duration',
        source: { type: 'fixed-field', field: 'duration' },
        format: { type: 'number', decimals: 0 },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('—');
    });
  });

  describe('badge format', () => {
    it('should render badge with resolved style and text', () => {
      const row = makeGridRow({ outputType: 'segment' });
      const colDef: ColumnDef = {
        id: 'type',
        label: 'Type',
        source: { type: 'fixed-field', field: 'outputType' },
        format: {
          type: 'badge',
          styleResolver: (v) => ({ className: 'bg-blue-100', icon: '●', title: 'Segment' }),
          textResolver: (v) => String(v).toUpperCase(),
        },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('SEGMENT');
      expect(html).toContain('bg-blue-100');
    });

    it('should render dash for null badge value', () => {
      const row = makeGridRow({});
      const colDef: ColumnDef = {
        id: 'type',
        label: 'Type',
        source: { type: 'fixed-field', field: 'completionReason' },
        format: {
          type: 'badge',
          styleResolver: () => ({ className: '' }),
          textResolver: (v) => String(v ?? ''),
        },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('—');
    });
  });

  describe('pill format', () => {
    it('should render pill with background color', () => {
      const row = makeGridRow({ index: 5 });
      const colDef: ColumnDef = {
        id: 'index',
        label: '#',
        source: { type: 'fixed-field', field: 'index' },
        format: { type: 'pill', backgroundColor: 'bg-green-100' },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('5');
      expect(html).toContain('bg-green-100');
    });
  });

  describe('combined format', () => {
    it('should render vertical stacked layout', () => {
      const row = makeGridRow({});
      const colDef: ColumnDef = {
        id: 'combined',
        label: 'Combined',
        source: {
          type: 'fallback',
          semantics: 'all-present-combined',
          sources: [
            { type: 'fixed-field', field: 'sourceBlockKey' },
            { type: 'fixed-field', field: 'outputType' },
          ],
        },
        format: {
          type: 'combined',
          layout: 'vertical',
          primaryFormat: { type: 'text' },
          secondaryFormat: { type: 'text' },
        },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('test-block');
      expect(html).toContain('segment');
    });

    it('should render horizontal layout with separator', () => {
      const row = makeGridRow({});
      const colDef: ColumnDef = {
        id: 'combined',
        label: 'Combined',
        source: {
          type: 'fallback',
          semantics: 'all-present-combined',
          sources: [
            { type: 'fixed-field', field: 'sourceBlockKey' },
            { type: 'fixed-field', field: 'outputType' },
          ],
        },
        format: {
          type: 'combined',
          layout: 'horizontal',
          separator: ' | ',
          primaryFormat: { type: 'text' },
          secondaryFormat: { type: 'text' },
        },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('test-block');
      expect(html).toContain('segment');
    });

    it('should apply primary level styling (large, emphasized)', () => {
      const row = makeGridRow({});
      const colDef: ColumnDef = {
        id: 'combined',
        label: 'Combined',
        source: {
          type: 'fallback',
          semantics: 'all-present-combined',
          sources: [{ type: 'fixed-field', field: 'sourceBlockKey' }],
        },
        format: {
          type: 'combined',
          layout: 'vertical',
          primaryFormat: { type: 'text' },
        },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('font-semibold');
      expect(html).toContain('text-sm');
      expect(html).toContain('test-block');
    });

    it('should apply secondary level styling (medium, supporting)', () => {
      const row = makeGridRow({});
      const colDef: ColumnDef = {
        id: 'combined',
        label: 'Combined',
        source: {
          type: 'fallback',
          semantics: 'all-present-combined',
          sources: [
            { type: 'fixed-field', field: 'sourceBlockKey' },
            { type: 'fixed-field', field: 'outputType' },
          ],
        },
        format: {
          type: 'combined',
          layout: 'vertical',
          primaryFormat: { type: 'text' },
          secondaryFormat: { type: 'text' },
        },
      };
      const html = renderCell(colDef, row);
      // Secondary should have text-xs and text-muted-foreground classes
      expect(html).toContain('text-xs');
      expect(html).toContain('text-muted-foreground');
    });

    it('should apply tertiary level styling (small, supplementary)', () => {
      const row = makeGridRow({ elapsed: 60 });
      const colDef: ColumnDef = {
        id: 'combined',
        label: 'Combined',
        source: {
          type: 'fallback',
          semantics: 'all-present-combined',
          sources: [
            { type: 'fixed-field', field: 'sourceBlockKey' },
            { type: 'fixed-field', field: 'outputType' },
            { type: 'fixed-field', field: 'elapsed' },
          ],
        },
        format: {
          type: 'combined',
          layout: 'vertical',
          primaryFormat: { type: 'text' },
          secondaryFormat: { type: 'text' },
          tertiaryFormat: { type: 'text' },
        },
      };
      const html = renderCell(colDef, row);
      // Tertiary should have text-[11px] and opacity-80 classes
      expect(html).toContain('text-[11px]');
      expect(html).toContain('opacity-80');
    });

    it('should render only primary when secondary/tertiary are undefined', () => {
      const row = makeGridRow({});
      const colDef: ColumnDef = {
        id: 'combined',
        label: 'Combined',
        source: {
          type: 'fallback',
          semantics: 'all-present-combined',
          sources: [
            { type: 'fixed-field', field: 'sourceBlockKey' },
            { type: 'fixed-field', field: 'duration' }, // undefined
          ],
        },
        format: {
          type: 'combined',
          layout: 'vertical',
          primaryFormat: { type: 'text' },
          secondaryFormat: { type: 'text' },
        },
      };
      const html = renderCell(colDef, row);
      // Fallback returns undefined when any source missing, so combined gets undefined
      expect(html).toContain('—');
    });

    it('should render all three levels in horizontal layout with separators', () => {
      const row = makeGridRow({ elapsed: 60 });
      const colDef: ColumnDef = {
        id: 'combined',
        label: 'Combined',
        source: {
          type: 'fallback',
          semantics: 'all-present-combined',
          sources: [
            { type: 'fixed-field', field: 'sourceBlockKey' },
            { type: 'fixed-field', field: 'outputType' },
            { type: 'fixed-field', field: 'elapsed' },
          ],
        },
        format: {
          type: 'combined',
          layout: 'horizontal',
          separator: ' • ',
          primaryFormat: { type: 'text' },
          secondaryFormat: { type: 'text' },
          tertiaryFormat: { type: 'text' },
        },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('test-block');
      expect(html).toContain('segment');
      expect(html).toContain('60');
      expect(html).toContain(' • ');
    });

    it('should render metric pills inside combined format', () => {
      const repCell = makeGridCell([{ type: MetricType.Rep, value: 10 }]);
      const textCell = makeGridCell([{ type: MetricType.Text, value: 'squat' }]);
      const row = makeGridRow({
        cells: [
          [MetricType.Rep, repCell],
          [MetricType.Text, textCell],
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
            { type: 'metric-type', metricType: MetricType.Text },
          ],
        },
        format: {
          type: 'combined',
          layout: 'vertical',
          primaryFormat: { type: 'text' },
          secondaryFormat: { type: 'text' },
        },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('10');
      expect(html).toContain('squat');
    });

    it('should use custom container class name', () => {
      const row = makeGridRow({});
      const colDef: ColumnDef = {
        id: 'combined',
        label: 'Combined',
        source: {
          type: 'fallback',
          semantics: 'all-present-combined',
          sources: [
            { type: 'fixed-field', field: 'sourceBlockKey' },
          ],
        },
        format: {
          type: 'combined',
          layout: 'vertical',
          containerClassName: 'custom-container-class',
          primaryFormat: { type: 'text' },
        },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('custom-container-class');
    });
  });

  describe('custom format', () => {
    it('should render custom React element', () => {
      const row = makeGridRow({ index: 7 });
      const colDef: ColumnDef = {
        id: 'index',
        label: '#',
        source: { type: 'fixed-field', field: 'index' },
        format: {
          type: 'custom',
          render: (value) => React.createElement('strong', null, `idx:${value}`),
        },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('<strong>idx:7</strong>');
    });

    it('should receive context in custom render', () => {
      const row = makeGridRow({ index: 3 });
      const colDef: ColumnDef = {
        id: 'index',
        label: '#',
        source: { type: 'fixed-field', field: 'index' },
        format: {
          type: 'custom',
          render: (_value, ctx) => `prefix:${(ctx as any)?.prefix}`,
          context: { prefix: 'X' },
        },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('prefix:X');
    });
  });

  describe('metric-type cells (GridCell fallback)', () => {
    it('should render metric pills for metric-type source', () => {
      const cell = makeGridCell([{ type: MetricType.Rep, value: 10 }]);
      const row = makeGridRow({ cells: [[MetricType.Rep, cell]] });
      const colDef: ColumnDef = {
        id: 'rep',
        label: 'Reps',
        source: { type: 'metric-type', metricType: MetricType.Rep },
        format: { type: 'text' }, // format is ignored for metric cells; pills are rendered
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('10');
    });

    it('should render dash for empty metric cell', () => {
      const row = makeGridRow({ cells: [] });
      const colDef: ColumnDef = {
        id: 'rep',
        label: 'Reps',
        source: { type: 'metric-type', metricType: MetricType.Rep },
        format: { type: 'text' },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('—');
    });
  });

  describe('indentation', () => {
    it('should render indent spacer when indent > 0', () => {
      const row = makeGridRow({});
      const colDef: ColumnDef = {
        id: 'text',
        label: 'Text',
        source: { type: 'fixed-field', field: 'sourceBlockKey' },
        format: { type: 'text' },
      };
      const html = renderCell(colDef, row, 2);
      expect(html).toContain('border-l-2');
    });

    it('should not render indent spacer when indent is 0', () => {
      const row = makeGridRow({});
      const colDef: ColumnDef = {
        id: 'text',
        label: 'Text',
        source: { type: 'fixed-field', field: 'sourceBlockKey' },
        format: { type: 'text' },
      };
      const html = renderCell(colDef, row, 0);
      expect(html).not.toContain('border-l-2');
    });
  });

  describe('empty / fallback rendering', () => {
    it('should render dash for undefined value with text format', () => {
      const row = makeGridRow({});
      const colDef: ColumnDef = {
        id: 'duration',
        label: 'Duration',
        source: { type: 'fixed-field', field: 'duration' },
        format: { type: 'text' },
      };
      const html = renderCell(colDef, row);
      expect(html).toContain('—');
    });
  });
});

// ─── GridColumn → ColumnDef Bridge ─────────────────────────────

describe('inferColumnDefFromGridColumn', () => {
  it('should infer INDEX column', () => {
    const col: GridColumn = {
      id: '#',
      label: '#',
      sortable: true,
      filterable: false,
      graphable: false,
      isGraphed: false,
      visible: true,
    };
    const def = inferColumnDefFromGridColumn(col);
    expect(def.id).toBe('#');
    expect(def.source.type).toBe('derived');
    expect(def.format.type).toBe('custom');
  });

  it('should infer BLOCK_KEY column', () => {
    const col: GridColumn = {
      id: 'blockKey',
      label: 'Block',
      sortable: true,
      filterable: true,
      graphable: false,
      isGraphed: false,
      visible: true,
    };
    const def = inferColumnDefFromGridColumn(col);
    expect(def.source.type).toBe('fixed-field');
    expect((def.source as any).field).toBe('sourceBlockKey');
    expect(def.format.type).toBe('text');
  });

  it('should infer metric-type column', () => {
    const col: GridColumn = {
      id: MetricType.Rep,
      type: MetricType.Rep,
      label: 'Reps',
      sortable: true,
      filterable: true,
      graphable: true,
      isGraphed: false,
      visible: true,
    };
    const def = inferColumnDefFromGridColumn(col);
    expect(def.source.type).toBe('metric-type');
    expect((def.source as any).metricType).toBe(MetricType.Rep);
    expect(def.format.type).toBe('custom');
  });

  it('should infer TIMESTAMP column with hideMs meta', () => {
    const col: GridColumn = {
      id: 'timestamp',
      label: 'Timestamp',
      sortable: true,
      filterable: false,
      graphable: false,
      isGraphed: false,
      visible: true,
      meta: { hideMs: true },
    };
    const def = inferColumnDefFromGridColumn(col);
    expect(def.source.type).toBe('fixed-field');
    expect((def.source as any).field).toBe('absoluteStartTime');
    expect(def.format.type).toBe('custom');
  });

  it('should infer ELAPSED_TOTAL column', () => {
    const col: GridColumn = {
      id: 'elapsedTotal',
      label: 'Elapsed',
      sortable: true,
      filterable: false,
      graphable: true,
      isGraphed: false,
      visible: true,
    };
    const def = inferColumnDefFromGridColumn(col);
    expect(def.source.type).toBe('derived');
    expect(def.format.type).toBe('custom');
  });

  it('should infer OUTPUT_TYPE column as badge', () => {
    const col: GridColumn = {
      id: 'outputType',
      label: 'Type',
      sortable: true,
      filterable: true,
      graphable: false,
      isGraphed: false,
      visible: true,
    };
    const def = inferColumnDefFromGridColumn(col);
    expect(def.source.type).toBe('fixed-field');
    expect((def.source as any).field).toBe('outputType');
    expect(def.format.type).toBe('custom');
  });
});
