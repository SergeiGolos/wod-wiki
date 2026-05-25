/**
 * Derived Columns with Context — Tests
 *
 * Validates that derived column compute functions receive full row context
 * (allRows, rowIndex, columnDef, dependencies) and that dependency chains
 * between derived columns resolve correctly.
 *
 * @see WOD-682
 */

import { describe, it, expect } from 'bun:test';
import { resolveColumnSource } from '../cdlSourceResolver';
import {
  extractSortValue,
  compareSortValues,
} from '../cdlSortInterpreter';
import {
  extractFilterText,
  matchColumnFilter,
} from '../cdlFilterInterpreter';
import { extractGraphValue } from '../cdlGraphInterpreter';
import { ColumnSet } from '../../ColumnSet';
import { makeGridRow, makeGridCell } from './test-helpers';
import { MetricType } from '@/core/models/Metric';
import type { ColumnDef, ComputeContext } from '../../column-definition-language';
import type { GridRow } from '../../types';

// ─── Helpers ───────────────────────────────────────────────────

function makeSimpleColumnSet(defs: ColumnDef[]): ColumnSet {
  return new ColumnSet({
    definitions: defs,
    presets: { default: { label: 'Default', visibleColumnIds: defs.map((d) => d.id) } },
    defaultPreset: 'default',
  });
}

function makeRows(count: number, overrides?: Partial<GridRow>[]): GridRow[] {
  return Array.from({ length: count }, (_, i) =>
    makeGridRow({
      id: i + 1,
      index: i + 1,
      sourceBlockKey: `block-${i + 1}`,
      elapsed: (i + 1) * 10,
      total: (i + 1) * 12,
      ...overrides?.[i],
    }),
  );
}

// ─── Compute Context Receiving Full Row Context ─────────────────

describe('derived column compute context', () => {
  it('should receive allRows in compute context', () => {
    const rows = makeRows(3);
    let captured: ComputeContext | undefined;

    const colDef: ColumnDef = {
      id: 'ctx-test',
      label: 'Ctx Test',
      source: {
        type: 'derived',
        compute: (_row, ctx) => {
          captured = ctx;
          return ctx.allRows.length;
        },
      },
      format: { type: 'number' },
    };

    const set = makeSimpleColumnSet([colDef]);
    const value = set.resolveColumnValue(rows[0], 'ctx-test', rows, 0);

    expect(value).toBe(3);
    expect(captured!.allRows).toEqual(rows);
  });

  it('should receive rowIndex in compute context', () => {
    const rows = makeRows(5);
    let captured: ComputeContext | undefined;

    const colDef: ColumnDef = {
      id: 'ctx-test',
      label: 'Ctx Test',
      source: {
        type: 'derived',
        compute: (_row, ctx) => {
          captured = ctx;
          return ctx.rowIndex;
        },
      },
      format: { type: 'number' },
    };

    const set = makeSimpleColumnSet([colDef]);
    const value = set.resolveColumnValue(rows[2], 'ctx-test', rows, 2);

    expect(value).toBe(2);
    expect(captured!.rowIndex).toBe(2);
  });

  it('should receive columnDef in compute context', () => {
    const rows = makeRows(1);
    let captured: ComputeContext | undefined;

    const colDef: ColumnDef = {
      id: 'my-col',
      label: 'My Column',
      source: {
        type: 'derived',
        compute: (_row, ctx) => {
          captured = ctx;
          return ctx.columnDef.id;
        },
      },
      format: { type: 'text' },
    };

    const set = makeSimpleColumnSet([colDef]);
    set.resolveColumnValue(rows[0], 'my-col', rows, 0);

    expect(captured!.columnDef.id).toBe('my-col');
    expect(captured!.columnDef.label).toBe('My Column');
  });

  it('should allow statistics over allRows', () => {
    const rows = makeRows(3, [
      { cells: [[MetricType.Rep, makeGridCell([{ type: MetricType.Rep, value: 5 }])]] },
      { cells: [[MetricType.Rep, makeGridCell([{ type: MetricType.Rep, value: 10 }])]] },
      { cells: [[MetricType.Rep, makeGridCell([{ type: MetricType.Rep, value: 15 }])]] },
    ]);

    const colDef: ColumnDef = {
      id: 'avg-rep',
      label: 'Avg Rep',
      source: {
        type: 'derived',
        compute: (row, ctx) => {
          const repCell = row.cells.get(MetricType.Rep);
          const rep = repCell?.metrics.toArray?.()[0]?.value as number ?? 0;
          const allReps = ctx.allRows.map(
            (r) => (r.cells.get(MetricType.Rep)?.metrics.toArray?.()[0]?.value as number) ?? 0,
          );
          const avg = allReps.reduce((a, b) => a + b, 0) / allReps.length;
          return rep / avg;
        },
      },
      format: { type: 'number', decimals: 2 },
    };

    const set = makeSimpleColumnSet([colDef]);
    const value = set.resolveColumnValue(rows[0], 'avg-rep', rows, 0) as number;

    // avg = (5 + 10 + 15) / 3 = 10
    // row[0] ratio = 5 / 10 = 0.5
    expect(value).toBeCloseTo(0.5, 2);
  });

  it('should support relative calculations using rowIndex', () => {
    const rows = makeRows(3, [
      { elapsed: 10 },
      { elapsed: 20 },
      { elapsed: 30 },
    ]);

    const colDef: ColumnDef = {
      id: 'delta-prev',
      label: 'Δ Prev',
      source: {
        type: 'derived',
        compute: (row, ctx) => {
          if (ctx.rowIndex === 0) return 0;
          const prev = ctx.allRows[ctx.rowIndex - 1];
          return row.elapsed - prev.elapsed;
        },
      },
      format: { type: 'number' },
    };

    const set = makeSimpleColumnSet([colDef]);
    expect(set.resolveColumnValue(rows[0], 'delta-prev', rows, 0)).toBe(0);
    expect(set.resolveColumnValue(rows[1], 'delta-prev', rows, 1)).toBe(10);
    expect(set.resolveColumnValue(rows[2], 'delta-prev', rows, 2)).toBe(10);
  });
});

// ─── Dependencies Between Derived Columns ──────────────────────

describe('derived column dependencies', () => {
  it('should resolve simple dependency between two derived columns', () => {
    const rows = makeRows(1, [
      { cells: [[MetricType.Distance, makeGridCell([{ type: MetricType.Distance, value: 100 }])]] },
    ]);

    const baseCol: ColumnDef = {
      id: 'dist-m',
      label: 'Distance (m)',
      source: {
        type: 'derived',
        compute: (row) => {
          const cell = row.cells.get(MetricType.Distance);
          return (cell?.metrics.toArray?.()[0]?.value as number) ?? 0;
        },
      },
      format: { type: 'number' },
    };

    const derivedCol: ColumnDef = {
      id: 'dist-km',
      label: 'Distance (km)',
      source: {
        type: 'derived',
        compute: (_row, ctx) => {
          const distM = ctx.dependencies.get('dist-m') as number;
          return distM / 1000;
        },
        dependencies: ['dist-m'],
      },
      format: { type: 'number', decimals: 2 },
    };

    const set = makeSimpleColumnSet([baseCol, derivedCol]);
    expect(set.resolveColumnValue(rows[0], 'dist-km', rows, 0)).toBeCloseTo(0.1, 2);
  });

  it('should resolve transitive dependencies (A → B → C)', () => {
    const rows = makeRows(1);

    const colA: ColumnDef = {
      id: 'a',
      label: 'A',
      source: { type: 'derived', compute: () => 2 },
      format: { type: 'number' },
    };

    const colB: ColumnDef = {
      id: 'b',
      label: 'B',
      source: {
        type: 'derived',
        compute: (_row, ctx) => {
          const a = ctx.dependencies.get('a') as number;
          return a * 3;
        },
        dependencies: ['a'],
      },
      format: { type: 'number' },
    };

    const colC: ColumnDef = {
      id: 'c',
      label: 'C',
      source: {
        type: 'derived',
        compute: (_row, ctx) => {
          const b = ctx.dependencies.get('b') as number;
          return b + 1;
        },
        dependencies: ['b'],
      },
      format: { type: 'number' },
    };

    const set = makeSimpleColumnSet([colA, colB, colC]);
    // A = 2, B = 2 * 3 = 6, C = 6 + 1 = 7
    expect(set.resolveColumnValue(rows[0], 'c', rows, 0)).toBe(7);
  });

  it('should detect direct circular dependencies', () => {
    const rows = makeRows(1);

    const colA: ColumnDef = {
      id: 'a',
      label: 'A',
      source: {
        type: 'derived',
        compute: () => 1,
        dependencies: ['b'],
      },
      format: { type: 'number' },
    };

    const colB: ColumnDef = {
      id: 'b',
      label: 'B',
      source: {
        type: 'derived',
        compute: () => 2,
        dependencies: ['a'],
      },
      format: { type: 'number' },
    };

    const set = makeSimpleColumnSet([colA, colB]);
    expect(() => set.resolveColumnValue(rows[0], 'a', rows, 0)).toThrow('Circular dependency');
  });

  it('should detect indirect circular dependencies', () => {
    const rows = makeRows(1);

    const colA: ColumnDef = {
      id: 'a',
      label: 'A',
      source: { type: 'derived', compute: () => 1, dependencies: ['b'] },
      format: { type: 'number' },
    };
    const colB: ColumnDef = {
      id: 'b',
      label: 'B',
      source: { type: 'derived', compute: () => 2, dependencies: ['c'] },
      format: { type: 'number' },
    };
    const colC: ColumnDef = {
      id: 'c',
      label: 'C',
      source: { type: 'derived', compute: () => 3, dependencies: ['a'] },
      format: { type: 'number' },
    };

    const set = makeSimpleColumnSet([colA, colB, colC]);
    expect(() => set.resolveColumnValue(rows[0], 'a', rows, 0)).toThrow('Circular dependency');
  });

  it('should allow derived column without dependencies', () => {
    const rows = makeRows(1, [{ elapsed: 60, total: 90 }]);

    const colDef: ColumnDef = {
      id: 'pause',
      label: 'Pause',
      source: {
        type: 'derived',
        compute: (row) => (row.total ?? 0) - row.elapsed,
      },
      format: { type: 'number' },
    };

    const set = makeSimpleColumnSet([colDef]);
    expect(set.resolveColumnValue(rows[0], 'pause', rows, 0)).toBe(30);
  });

  it('should pass custom context merged into ComputeContext', () => {
    const rows = makeRows(1);

    const colDef: ColumnDef = {
      id: 'scaled',
      label: 'Scaled',
      source: {
        type: 'derived',
        compute: (_row, ctx) => {
          const base = 10;
          const multiplier = ctx.multiplier as number;
          return base * multiplier;
        },
        context: { multiplier: 5 },
      },
      format: { type: 'number' },
    };

    const set = makeSimpleColumnSet([colDef]);
    expect(set.resolveColumnValue(rows[0], 'scaled', rows, 0)).toBe(50);
  });
});

// ─── Sort / Filter / Graph on Derived Columns ──────────────────

describe('derived column sort with context', () => {
  it('should sort by derived column using allRows context', () => {
    const rows = makeRows(3, [
      { elapsed: 10 },
      { elapsed: 30 },
      { elapsed: 20 },
    ]);

    const colDef: ColumnDef = {
      id: 'pct-of-max',
      label: '% of Max',
      source: {
        type: 'derived',
        compute: (row, ctx) => {
          const maxElapsed = Math.max(...ctx.allRows.map((r) => r.elapsed));
          return (row.elapsed / maxElapsed) * 100;
        },
      },
      format: { type: 'number' },
      sort: {
        type: 'numeric',
        extractor: (val) => val as number,
      },
    };

    const definitionMap = new Map<string, ColumnDef>([[colDef.id, colDef]]);
    const sorted = [...rows].sort((a, b) => {
      const ctxA: ComputeContext = { allRows: rows, rowIndex: rows.indexOf(a), columnDef: colDef, dependencies: new Map() };
      const ctxB: ComputeContext = { allRows: rows, rowIndex: rows.indexOf(b), columnDef: colDef, dependencies: new Map() };
      const valA = extractSortValue(a, colDef, ctxA, definitionMap);
      const valB = extractSortValue(b, colDef, ctxB, definitionMap);
      return compareSortValues(valA, valB);
    });

    // pct-of-max: [33.3, 100, 66.6] → sorted ascending: [33.3, 66.6, 100]
    expect(sorted.map((r) => r.elapsed)).toEqual([10, 20, 30]);
  });
});

describe('derived column filter with context', () => {
  it('should filter by derived column text using allRows context', () => {
    const rows = makeRows(3, [
      { sourceBlockKey: 'squat' },
      { sourceBlockKey: 'deadlift' },
      { sourceBlockKey: 'bench' },
    ]);

    const colDef: ColumnDef = {
      id: 'ranked',
      label: 'Ranked',
      source: {
        type: 'derived',
        compute: (row, ctx) => {
          const sorted = [...ctx.allRows].sort((a, b) =>
            a.sourceBlockKey.localeCompare(b.sourceBlockKey),
          );
          const rank = sorted.findIndex((r) => r.id === row.id) + 1;
          return `#${rank} ${row.sourceBlockKey}`;
        },
      },
      format: { type: 'text' },
      filter: {
        extractor: (val) => String(val ?? ''),
      },
    };

    const definitionMap = new Map<string, ColumnDef>([[colDef.id, colDef]]);

    // Row 0: squat → sorted keys: [bench, deadlift, squat] → rank 3 → "#3 squat"
    // Row 1: deadlift → rank 2 → "#2 deadlift"
    // Row 2: bench → rank 1 → "#1 bench"
    const ctx0: ComputeContext = { allRows: rows, rowIndex: 0, columnDef: colDef, dependencies: new Map() };
    const ctx1: ComputeContext = { allRows: rows, rowIndex: 1, columnDef: colDef, dependencies: new Map() };
    const ctx2: ComputeContext = { allRows: rows, rowIndex: 2, columnDef: colDef, dependencies: new Map() };
    expect(matchColumnFilter(rows[0], colDef, '#3', ctx0, definitionMap)).toBe(true);
    expect(matchColumnFilter(rows[0], colDef, 'deadlift', ctx0, definitionMap)).toBe(false);
    expect(matchColumnFilter(rows[2], colDef, '#1', ctx2, definitionMap)).toBe(true);
  });
});

describe('derived column graph with context', () => {
  it('should extract graph value from derived column using context', () => {
    const rows = makeRows(3, [
      { elapsed: 10, total: 12 },
      { elapsed: 20, total: 24 },
      { elapsed: 30, total: 36 },
    ]);

    const colDef: ColumnDef = {
      id: 'efficiency',
      label: 'Efficiency',
      source: {
        type: 'derived',
        compute: (row, ctx) => {
          const avgTotal = ctx.allRows.reduce((sum, r) => sum + r.total, 0) / ctx.allRows.length;
          return (row.elapsed / avgTotal) * 100;
        },
      },
      format: { type: 'number' },
      graph: {
        extractor: (val) => val as number,
        axisLabel: 'Efficiency %',
      },
    };

    const definitionMap = new Map<string, ColumnDef>([[colDef.id, colDef]]);

    // avgTotal = (12 + 24 + 36) / 3 = 24
    // row[0]: 10 / 24 * 100 = 41.67
    // row[1]: 20 / 24 * 100 = 83.33
    // row[2]: 30 / 24 * 100 = 125
    const ctx0: ComputeContext = { allRows: rows, rowIndex: 0, columnDef: colDef, dependencies: new Map() };
    const ctx1: ComputeContext = { allRows: rows, rowIndex: 1, columnDef: colDef, dependencies: new Map() };
    const ctx2: ComputeContext = { allRows: rows, rowIndex: 2, columnDef: colDef, dependencies: new Map() };
    const v0 = extractGraphValue(rows[0], colDef, ctx0, definitionMap);
    const v1 = extractGraphValue(rows[1], colDef, ctx1, definitionMap);
    const v2 = extractGraphValue(rows[2], colDef, ctx2, definitionMap);

    expect(v0!).toBeCloseTo(41.67, 1);
    expect(v1!).toBeCloseTo(83.33, 1);
    expect(v2!).toBeCloseTo(125, 1);
  });
});

// ─── resolveColumnSource direct usage ──────────────────────────

describe('resolveColumnSource with ComputeContext', () => {
  it('should resolve derived source with full ComputeContext', () => {
    const rows = makeRows(2);
    const colDef: ColumnDef = {
      id: 'ctx-check',
      label: 'Ctx Check',
      source: {
        type: 'derived',
        compute: (_row, ctx) => ({
          rowCount: ctx.allRows.length,
          rowIndex: ctx.rowIndex,
          colId: ctx.columnDef.id,
        }),
      },
      format: { type: 'text' },
    };

    const context: ComputeContext = {
      allRows: rows,
      rowIndex: 1,
      columnDef: colDef,
      dependencies: new Map(),
    };

    const result = resolveColumnSource(rows[1], colDef.source, context) as any;
    expect(result.rowCount).toBe(2);
    expect(result.rowIndex).toBe(1);
    expect(result.colId).toBe('ctx-check');
  });

  it('should resolve derived source with dependencies via definitionMap', () => {
    const rows = makeRows(1, [
      { cells: [[MetricType.Rep, makeGridCell([{ type: MetricType.Rep, value: 10 }])]] },
    ]);

    const baseCol: ColumnDef = {
      id: 'reps',
      label: 'Reps',
      source: {
        type: 'derived',
        compute: (row) => {
          const cell = row.cells.get(MetricType.Rep);
          return (cell?.metrics.toArray?.()[0]?.value as number) ?? 0;
        },
      },
      format: { type: 'number' },
    };

    const doubleCol: ColumnDef = {
      id: 'double-reps',
      label: 'Double Reps',
      source: {
        type: 'derived',
        compute: (_row, ctx) => {
          const reps = ctx.dependencies.get('reps') as number;
          return reps * 2;
        },
        dependencies: ['reps'],
      },
      format: { type: 'number' },
    };

    const definitionMap = new Map<string, ColumnDef>([
      ['reps', baseCol],
      ['double-reps', doubleCol],
    ]);

    const context: ComputeContext = {
      allRows: rows,
      rowIndex: 0,
      columnDef: doubleCol,
      dependencies: new Map(),
    };

    const result = resolveColumnSource(rows[0], doubleCol.source, context, definitionMap);
    expect(result).toBe(20);
  });
});
