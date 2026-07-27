/**
 * ColumnSet Module Tests
 *
 * @see ColumnSet.ts
 * @see docs/adr/0011-column-definition-language.md
 */

import { describe, it, expect } from 'bun:test';
import { ColumnSet } from './ColumnSet';
import type { ColumnSetContext } from './ColumnSet';
import type { ColumnDef, ColumnSetConfig } from './column-definition-language';
import { MetricType } from '@/core/models/Metric';
import { makeGridRow, makeGridCell } from './interpreters/__tests__/test-helpers';
import type { GridRow } from './types';

// ─── Test Fixtures ─────────────────────────────────────────────

const indexCol: ColumnDef = {
  id: '#',
  label: '#',
  source: { type: 'fixed-field', field: 'index' },
  format: { type: 'text' },
};

const blockKeyCol: ColumnDef = {
  id: 'blockKey',
  label: 'Block',
  source: { type: 'fixed-field', field: 'sourceBlockKey' },
  format: { type: 'text' },
};

const repCol: ColumnDef = {
  id: 'rep',
  label: 'Reps',
  source: { type: 'metric-type', metricType: MetricType.Rep },
  format: { type: 'number' },
};

const textCol: ColumnDef = {
  id: 'text',
  label: 'Text',
  source: { type: 'metric-type', metricType: MetricType.Text },
  format: { type: 'text' },
};

const debugCol: ColumnDef = {
  id: 'stackLevel',
  label: 'Depth',
  source: { type: 'fixed-field', field: 'stackLevel' },
  format: { type: 'text' },
  meta: { debugOnly: true },
};

const hiddenFixedCol: ColumnDef = {
  id: 'outputType',
  label: 'Type',
  source: { type: 'fixed-field', field: 'outputType' },
  format: { type: 'text' },
};

const derivedCol: ColumnDef = {
  id: 'pace',
  label: 'Pace',
  source: {
    type: 'derived',
    compute: (row) => {
      const dist = row.cells.get(MetricType.Distance);
      const dur = row.cells.get(MetricType.Duration);
      if (!dist || !dur) return undefined;
      return 0;
    },
  },
  format: { type: 'number' },
};

const fallbackCol: ColumnDef = {
  id: 'effort',
  label: 'Effort',
  source: {
    type: 'fallback',
    semantics: 'first-present',
    sources: [
      { type: 'metric-type', metricType: MetricType.Effort },
      { type: 'metric-type', metricType: MetricType.Rep },
    ],
  },
  format: { type: 'text' },
};

const defaultPreset = {
  label: 'Default',
  visibleColumnIds: ['#', 'blockKey', 'rep', 'text', 'pace'],
};

const debugPreset = {
  label: 'Debug',
  visibleColumnIds: ['#', 'blockKey', 'rep', 'text', 'pace', 'stackLevel'],
};

function makeConfig(extraDefs: ColumnDef[] = []): ColumnSetConfig {
  return {
    definitions: [
      indexCol,
      blockKeyCol,
      repCol,
      textCol,
      debugCol,
      hiddenFixedCol,
      derivedCol,
      fallbackCol,
      ...extraDefs,
    ],
    presets: {
      default: defaultPreset,
      debug: debugPreset,
    },
    defaultPreset: 'default',
  };
}

function makeContext(partial: Partial<ColumnSetContext> & { rows?: GridRow[] }): ColumnSetContext {
  return {
    rows: partial.rows ?? [],
    activePresetId: partial.activePresetId ?? 'default',
    isDebugMode: partial.isDebugMode ?? false,
    graphTaggedColumnIds: partial.graphTaggedColumnIds,
    visibilityOverrides: partial.visibilityOverrides,
    addedColumnIds: partial.addedColumnIds,
  };
}

// ─── Tests ─────────────────────────────────────────────────────

describe('ColumnSet', () => {
  describe('getVisibleColumns', () => {
    it('returns preset columns in preset order', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({
        rows: [
          makeGridRow({
            cells: [
              [MetricType.Rep, makeGridCell([{ type: MetricType.Rep, value: 5 }])],
              [MetricType.Text, makeGridCell([{ type: MetricType.Text, value: 'squat' }])],
            ],
          }),
        ],
      });

      const visible = set.getVisibleColumns(ctx);
      const ids = visible.map((c) => c.id);
      // effort is a fallback column not in the default preset → hidden
      expect(ids).toEqual(['#', 'blockKey', 'rep', 'text', 'pace']);
    });

    it('hides metric-type columns with no data', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({
        rows: [
          makeGridRow({
            cells: [
              [MetricType.Text, makeGridCell([{ type: MetricType.Text, value: 'squat' }])],
            ],
          }),
        ],
      });

      const visible = set.getVisibleColumns(ctx);
      const ids = visible.map((c) => c.id);
      expect(ids).toContain('#');
      expect(ids).toContain('blockKey');
      expect(ids).toContain('text');
      expect(ids).not.toContain('rep');
    });

    it('shows fixed-field columns in preset even without data', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({ rows: [] });

      const visible = set.getVisibleColumns(ctx);
      const ids = visible.map((c) => c.id);
      expect(ids).toContain('#');
      expect(ids).toContain('blockKey');
    });

    it('hides fixed-field columns not in preset', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({
        activePresetId: 'default',
        rows: [makeGridRow({})],
      });
      // default preset does NOT include stackLevel
      const visible = set.getVisibleColumns(ctx);
      const ids = visible.map((c) => c.id);
      expect(ids).not.toContain('stackLevel');
    });

    it('shows debugOnly columns only in debug mode', () => {
      const set = new ColumnSet(makeConfig());
      const debugCtx = makeContext({
        activePresetId: 'debug',
        isDebugMode: true,
        rows: [makeGridRow({})],
      });
      const normalCtx = makeContext({
        activePresetId: 'debug',
        isDebugMode: false,
        rows: [makeGridRow({})],
      });

      expect(set.getVisibleColumns(debugCtx).map((c) => c.id)).toContain('stackLevel');
      expect(set.getVisibleColumns(normalCtx).map((c) => c.id)).not.toContain('stackLevel');
    });

    it('shows derived columns in preset even without data', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({ rows: [] });

      const visible = set.getVisibleColumns(ctx);
      const ids = visible.map((c) => c.id);
      expect(ids).toContain('pace');
    });

    it('shows orphan metric-type columns with data even if not in preset', () => {
      const orphan: ColumnDef = {
        id: 'distance',
        label: 'Distance',
        source: { type: 'metric-type', metricType: MetricType.Distance },
        format: { type: 'number' },
      };
      const set = new ColumnSet(makeConfig([orphan]));
      const ctx = makeContext({
        rows: [
          makeGridRow({
            cells: [
              [MetricType.Distance, makeGridCell([{ type: MetricType.Distance, value: 100 }])],
            ],
          }),
        ],
      });

      const visible = set.getVisibleColumns(ctx);
      const ids = visible.map((c) => c.id);
      // distance is NOT in default preset but has data
      expect(ids).toContain('distance');
    });

    it('hides orphan metric-type columns without data', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({ rows: [makeGridRow({})] });

      const visible = set.getVisibleColumns(ctx);
      const ids = visible.map((c) => c.id);
      expect(ids).not.toContain('effort');
    });

    it('appends user-added columns at the end', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({
        rows: [makeGridRow({})],
        addedColumnIds: new Set(['stackLevel']),
      });

      const visible = set.getVisibleColumns(ctx);
      const ids = visible.map((c) => c.id);
      expect(ids.at(-1)).toBe('stackLevel');
    });

    it('user visibility override can force-hide a preset column', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({
        rows: [
          makeGridRow({
            cells: [
              [MetricType.Rep, makeGridCell([{ type: MetricType.Rep, value: 5 }])],
            ],
          }),
        ],
        visibilityOverrides: { rep: false },
      });

      const visible = set.getVisibleColumns(ctx);
      const ids = visible.map((c) => c.id);
      expect(ids).not.toContain('rep');
    });

    it('user visibility override can force-show a non-preset column', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({
        rows: [makeGridRow({})],
        visibilityOverrides: { stackLevel: true },
      });

      const visible = set.getVisibleColumns(ctx);
      const ids = visible.map((c) => c.id);
      expect(ids).toContain('stackLevel');
    });

    it('shows fallback columns when any source has data', () => {
      const fallbackInPreset: ColumnDef = {
        id: 'effort',
        label: 'Effort',
        source: {
          type: 'fallback',
          semantics: 'first-present',
          sources: [
            { type: 'metric-type', metricType: MetricType.Effort },
            { type: 'metric-type', metricType: MetricType.Rep },
          ],
        },
        format: { type: 'text' },
      };
      const config: ColumnSetConfig = {
        definitions: [indexCol, blockKeyCol, repCol, fallbackInPreset],
        presets: {
          default: { label: 'Default', visibleColumnIds: ['#', 'blockKey', 'rep', 'effort'] },
        },
        defaultPreset: 'default',
      };
      const set = new ColumnSet(config);
      const ctx = makeContext({
        rows: [
          makeGridRow({
            cells: [
              [MetricType.Rep, makeGridCell([{ type: MetricType.Rep, value: 5 }])],
            ],
          }),
        ],
      });

      // effort is in preset and Rep (a fallback source) has data
      const visible = set.getVisibleColumns(ctx);
      const ids = visible.map((c) => c.id);
      expect(ids).toContain('effort');
    });

    it('hides fallback columns when no source has data', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({
        rows: [makeGridRow({})],
      });

      const visible = set.getVisibleColumns(ctx);
      const ids = visible.map((c) => c.id);
      expect(ids).not.toContain('effort');
    });
  });

  describe('getAvailableColumns', () => {
    it('returns hidden preset columns as available', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({
        rows: [makeGridRow({})],
        visibilityOverrides: { blockKey: false },
      });

      const available = set.getAvailableColumns(ctx);
      const ids = available.map((c) => c.id);
      expect(ids).toContain('blockKey');
    });

    it('returns hidden fixed columns as available', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({ rows: [makeGridRow({})] });

      const available = set.getAvailableColumns(ctx);
      const ids = available.map((c) => c.id);
      // outputType is fixed, not in default preset, not debugOnly → available
      expect(ids).toContain('outputType');
    });

    it('does not return debugOnly columns as available when not in debug mode', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({
        isDebugMode: false,
        rows: [makeGridRow({})],
      });

      const available = set.getAvailableColumns(ctx);
      const ids = available.map((c) => c.id);
      expect(ids).not.toContain('stackLevel');
    });

    it('does not return currently visible columns as available', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({ rows: [makeGridRow({})] });

      const visible = set.getVisibleColumns(ctx);
      const available = set.getAvailableColumns(ctx);
      const visibleIds = new Set(visible.map((c) => c.id));

      for (const col of available) {
        expect(visibleIds.has(col.id)).toBe(false);
      }
    });

    it('returns derived columns as available even without data', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({
        rows: [makeGridRow({})],
        activePresetId: 'default',
      });
      // pace is in default preset so it's visible, not available
      // Let's hide it to test availability
      const ctxHidden = makeContext({
        rows: [makeGridRow({})],
        activePresetId: 'default',
        visibilityOverrides: { pace: false },
      });

      const available = set.getAvailableColumns(ctxHidden);
      const ids = available.map((c) => c.id);
      expect(ids).toContain('pace');
    });
  });

  describe('getGraphableColumns', () => {
    it('returns only visible columns with graph config', () => {
      const graphRep: ColumnDef = {
        ...repCol,
        graph: { extractor: (cell) => (cell as any)?.metrics?.value },
      };
      const config: ColumnSetConfig = {
        ...makeConfig(),
        definitions: [indexCol, blockKeyCol, graphRep, textCol],
      };
      const set = new ColumnSet(config);
      const ctx = makeContext({
        rows: [
          makeGridRow({
            cells: [
              [MetricType.Rep, makeGridCell([{ type: MetricType.Rep, value: 5 }])],
            ],
          }),
        ],
      });

      const graphable = set.getGraphableColumns(ctx);
      expect(graphable.map((c) => c.id)).toEqual(['rep']);
    });

    it('excludes visible columns without graph config', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({ rows: [makeGridRow({})] });

      const graphable = set.getGraphableColumns(ctx);
      expect(graphable.length).toBe(0);
    });
  });

  describe('getGraphTaggedColumns', () => {
    it('returns visible columns that are tagged for graphing', () => {
      const graphRep: ColumnDef = {
        ...repCol,
        graph: { extractor: (cell) => (cell as any)?.metrics?.value },
      };
      const config: ColumnSetConfig = {
        ...makeConfig(),
        definitions: [indexCol, blockKeyCol, graphRep, textCol],
      };
      const set = new ColumnSet(config);
      const ctx = makeContext({
        rows: [
          makeGridRow({
            cells: [
              [MetricType.Rep, makeGridCell([{ type: MetricType.Rep, value: 5 }])],
            ],
          }),
        ],
        graphTaggedColumnIds: new Set(['rep']),
      });

      const tagged = set.getGraphTaggedColumns(ctx);
      expect(tagged.map((c) => c.id)).toEqual(['rep']);
    });

    it('excludes tagged columns that are not visible', () => {
      const graphRep: ColumnDef = {
        ...repCol,
        graph: { extractor: (cell) => (cell as any)?.metrics?.value },
      };
      const config: ColumnSetConfig = {
        ...makeConfig(),
        definitions: [indexCol, blockKeyCol, graphRep, textCol],
      };
      const set = new ColumnSet(config);
      const ctx = makeContext({
        rows: [makeGridRow({})], // no Rep data → rep column hidden
        graphTaggedColumnIds: new Set(['rep']),
      });

      const tagged = set.getGraphTaggedColumns(ctx);
      expect(tagged.length).toBe(0);
    });
  });

  describe('isColumnVisible', () => {
    it('returns false for unknown column ids', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({ rows: [makeGridRow({})] });
      expect(set.isColumnVisible('nonexistent', ctx)).toBe(false);
    });

    it('returns true for visible preset columns with data', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({
        rows: [
          makeGridRow({
            cells: [
              [MetricType.Rep, makeGridCell([{ type: MetricType.Rep, value: 5 }])],
            ],
          }),
        ],
      });
      expect(set.isColumnVisible('rep', ctx)).toBe(true);
    });

    it('returns false for hidden columns', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({ rows: [makeGridRow({})] });
      expect(set.isColumnVisible('rep', ctx)).toBe(false);
    });
  });

  describe('getPreset', () => {
    it('returns the requested preset', () => {
      const set = new ColumnSet(makeConfig());
      expect(set.getPreset('debug').label).toBe('Debug');
    });

    it('falls back to default preset for unknown ids', () => {
      const set = new ColumnSet(makeConfig());
      const preset = set.getPreset('nonexistent');
      expect(preset.label).toBe('Default');
      expect(preset.visibleColumnIds).toEqual(defaultPreset.visibleColumnIds);
    });
  });

  describe('getDefinition', () => {
    it('returns the column definition by id', () => {
      const set = new ColumnSet(makeConfig());
      expect(set.getDefinition('rep')?.label).toBe('Reps');
      expect(set.getDefinition('nonexistent')).toBeUndefined();
    });
  });

  describe('ordering', () => {
    it('places preset columns before non-preset columns', () => {
      const orphan: ColumnDef = {
        id: 'distance',
        label: 'Distance',
        source: { type: 'metric-type', metricType: MetricType.Distance },
        format: { type: 'number' },
      };
      const set = new ColumnSet(makeConfig([orphan]));
      const ctx = makeContext({
        rows: [
          makeGridRow({
            cells: [
              [MetricType.Distance, makeGridCell([{ type: MetricType.Distance, value: 100 }])],
            ],
          }),
        ],
      });

      const visible = set.getVisibleColumns(ctx);
      const ids = visible.map((c) => c.id);
      const presetIdx = ids.indexOf('text');
      const orphanIdx = ids.indexOf('distance');
      expect(orphanIdx).toBeGreaterThan(presetIdx);
    });

    it('deduplicates columns that appear in both preset and addedColumnIds', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({
        rows: [makeGridRow({})],
        addedColumnIds: new Set(['#']),
      });

      const visible = set.getVisibleColumns(ctx);
      const ids = visible.map((c) => c.id);
      expect(ids.filter((id) => id === '#').length).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty row arrays', () => {
      const set = new ColumnSet(makeConfig());
      const ctx = makeContext({ rows: [] });

      const visible = set.getVisibleColumns(ctx);
      const ids = visible.map((c) => c.id);
      // Only fixed and derived preset columns visible when no rows
      expect(ids).toEqual(['#', 'blockKey', 'pace']);
    });

    it('handles empty definitions', () => {
      const set = new ColumnSet({
        definitions: [],
        presets: { default: { label: 'Default', visibleColumnIds: [] } },
        defaultPreset: 'default',
      });
      const ctx = makeContext({ rows: [makeGridRow({})] });
      expect(set.getVisibleColumns(ctx)).toEqual([]);
    });

    it('handles rows with null fixed-field values', () => {
      const col: ColumnDef = {
        id: 'completionReason',
        label: 'Reason',
        source: { type: 'fixed-field', field: 'completionReason' },
        format: { type: 'text' },
      };
      const set = new ColumnSet({
        definitions: [indexCol, col],
        presets: {
          default: { label: 'Default', visibleColumnIds: ['#', 'completionReason'] },
        },
        defaultPreset: 'default',
      });
      const ctx = makeContext({
        rows: [makeGridRow({ completionReason: undefined })],
      });

      // Fixed-field columns in preset are visible even with null data
      const visible = set.getVisibleColumns(ctx);
      const ids = visible.map((c) => c.id);
      expect(ids).toContain('completionReason');
    });
  });
});
