/**
 * ColumnSet Module
 *
 * Manages the lifecycle of all columns including visibility,
 * presets, user overrides, and data-driven visibility.
 *
 * Responsibilities:
 * 1. Holds the canonical column definitions and presets
 * 2. Computes visible columns based on preset + data + overrides
 * 3. Computes available columns (toggleable but not currently visible)
 * 4. Computes graphable and graph-tagged column subsets
 *
 * @see docs/adr/0011-column-definition-language.md
 */

import type { GridRow } from './types';
import type {
  ColumnDef,
  ColumnSetConfig,
  ColumnSetPreset,
  ColumnSource,
  ComputeContext,
} from './column-definition-language';
import { resolveColumnSource } from './interpreters/cdlSourceResolver';

// ─── Public Context ────────────────────────────────────────────

export interface ColumnSetContext {
  /** All grid rows (used for data-driven visibility) */
  readonly rows: GridRow[];
  /** Active preset identifier */
  readonly activePresetId: string;
  /** Whether debug mode is enabled */
  readonly isDebugMode: boolean;
  /** Column IDs currently tagged for graphing */
  readonly graphTaggedColumnIds?: ReadonlySet<string>;
  /** Per-column visibility overrides from user (id → forced visible/hidden) */
  readonly visibilityOverrides?: Readonly<Record<string, boolean>>;
  /** Column IDs explicitly added by the user */
  readonly addedColumnIds?: ReadonlySet<string>;
}

// ─── ColumnSet Class ───────────────────────────────────────────

/**
 * ColumnSet manages column visibility, ordering, and discoverability.
 *
 * The config (definitions + presets) is fixed at construction.
 * The context (rows, preset selection, user overrides) is passed per-query.
 */
export class ColumnSet {
  private readonly definitionMap: ReadonlyMap<string, ColumnDef>;

  constructor(private readonly config: ColumnSetConfig) {
    this.definitionMap = new Map(config.definitions.map((d) => [d.id, d]));
  }

  // ─── Computed Column Lists ─────────────────────────────────

  /**
   * Columns currently visible in the grid, in display order.
   *
   * Ordering:
   * 1. Preset columns in preset order
   * 2. Remaining defined columns in definition order
   * 3. User-added columns appended at the end
   */
  getVisibleColumns(context: ColumnSetContext): ColumnDef[] {
    const candidates = this.getOrderedCandidates(context);
    return candidates.filter((col) => this.computeVisibility(col.id, context));
  }

  /**
   * Columns the user can toggle on (not currently visible but available).
   *
   * A column is available if it is not visible and any of:
   * - It is in the active preset
   * - It is a fixed-field column
   * - It is a derived column
   * - It has data in the current rows
   */
  getAvailableColumns(context: ColumnSetContext): ColumnDef[] {
    const visibleIds = new Set(
      this.getVisibleColumns(context).map((c) => c.id),
    );
    return this.config.definitions.filter((col) => {
      if (visibleIds.has(col.id)) return false;
      return this.isColumnAvailable(col, context);
    });
  }

  /**
   * Columns that are visible AND have graph configuration.
   */
  getGraphableColumns(context: ColumnSetContext): ColumnDef[] {
    return this.getVisibleColumns(context).filter(
      (col) => col.graph !== undefined,
    );
  }

  /**
   * Columns that are visible AND currently tagged for graphing.
   */
  getGraphTaggedColumns(context: ColumnSetContext): ColumnDef[] {
    const tags = context.graphTaggedColumnIds;
    if (!tags || tags.size === 0) return [];
    return this.getVisibleColumns(context).filter((col) => tags.has(col.id));
  }

  /**
   * Whether a specific column is currently visible.
   */
  isColumnVisible(id: string, context: ColumnSetContext): boolean {
    const def = this.getDefinition(id);
    if (!def) return false;
    return this.computeVisibility(id, context);
  }

  // ─── Lookups ───────────────────────────────────────────────

  /**
   * Get a column definition by id.
   */
  getDefinition(id: string): ColumnDef | undefined {
    return this.definitionMap.get(id);
  }

  /**
   * Get a preset by id, falling back to the default preset.
   */
  getPreset(id: string): ColumnSetPreset {
    return (
      this.config.presets[id] ?? this.config.presets[this.config.defaultPreset]
    );
  }

  /**
   * All column definitions in the canonical order.
   */
  getAllDefinitions(): readonly ColumnDef[] {
    return this.config.definitions;
  }

  /**
   * Map of column id → ColumnDef for fast lookups.
   */
  get definitions(): ReadonlyMap<string, ColumnDef> {
    return this.definitionMap;
  }

  /**
   * Resolve a column's value for a given row, including derived columns
   * with full compute context and dependency resolution.
   *
   * @param row       The grid row
   * @param colId     Column identifier
   * @param allRows   All rows in the current dataset
   * @param rowIndex  Index of the current row within allRows
   * @returns         Resolved value, or undefined if absent
   */
  resolveColumnValue(
    row: GridRow,
    colId: string,
    allRows: GridRow[],
    rowIndex?: number,
  ): unknown {
    const def = this.getDefinition(colId);
    if (!def) return undefined;

    const context: ComputeContext = {
      allRows,
      rowIndex: rowIndex ?? allRows.findIndex((r) => r.id === row.id),
      columnDef: def,
      dependencies: new Map(),
    };

    return resolveColumnSource(row, def.source, context, this.definitionMap);
  }

  // ─── Private: Ordering ─────────────────────────────────────

  /**
   * Build the candidate column list in display order.
   * Visibility filtering happens separately in computeVisibility.
   */
  private getOrderedCandidates(context: ColumnSetContext): ColumnDef[] {
    const preset = this.getPreset(context.activePresetId);
    const result: ColumnDef[] = [];
    const seen = new Set<string>();

    const add = (id: string) => {
      if (seen.has(id)) return;
      const def = this.getDefinition(id);
      if (!def) return;
      result.push(def);
      seen.add(id);
    };

    // 1. Preset order first
    for (const id of preset.visibleColumnIds) {
      add(id);
    }

    // 2. Remaining definitions in definition order
    for (const def of this.config.definitions) {
      add(def.id);
    }

    // 3. User-added columns (may not be in definitions yet)
    if (context.addedColumnIds) {
      for (const id of context.addedColumnIds) {
        add(id);
      }
    }

    return result;
  }

  // ─── Private: Visibility ───────────────────────────────────

  /**
   * Core visibility logic.
   *
   * Priority:
   * 1. User visibility override (highest)
   * 2. User-added columns
   * 3. debugOnly columns hidden unless debug mode
   * 4. Preset columns: fixed/derived always shown; metric/fallback shown only if data
   * 5. Non-preset columns: metric/fallback shown only if data; fixed/derived hidden
   */
  private computeVisibility(
    id: string,
    context: ColumnSetContext,
    checkingSubsumes?: boolean,
  ): boolean {
    // 1. User override wins
    if (context.visibilityOverrides && id in context.visibilityOverrides) {
      return context.visibilityOverrides[id];
    }
    // 2. User-added columns are visible
    if (context.addedColumnIds?.has(id)) return true;
    const def = this.getDefinition(id);
    if (!def) return false;
    // 3. debugOnly check
    if (def.meta?.debugOnly && !context.isDebugMode) return false;
    // 3b. Check if this column is subsumed by another visible column
    // (e.g., effort/label/rounds/text should be hidden when descriptor/exercise is visible)
    // Skip this check if we're already inside a subsumption check (prevents recursion)
    if (!checkingSubsumes && this.isColumnSubsumed(id, context)) {
      return false;
    }
    const preset = this.getPreset(context.activePresetId);
    const inPreset = preset.visibleColumnIds.includes(id);
    // 4. Data-driven visibility
    const hasData = this.hasDataInRows(def, context.rows);
    switch (def.source.type) {
      case 'fixed-field':
        // Fixed columns: visible only if in preset (user can add via addedColumnIds)
        return inPreset;
      case 'derived':
        // Derived columns: visible only if in preset (compute handles missing data)
        return inPreset;
      case 'metric-type':
        // Metric-type columns: visible if they have data (supports orphan discovery)
        return hasData;
      case 'fallback':
        // Fallback columns: visible only if in preset AND have data
        // (we do not auto-discover composite columns outside presets)
        return inPreset && hasData;
      default:
        return inPreset;
    }
  }
  /**
   * Check if a column is hidden by another visible column's subsumes declaration.
   * Does NOT call computeVisibility recursively to avoid infinite loops.
   */
  private isColumnSubsumed(id: string, context: ColumnSetContext): boolean {
    for (const def of this.config.definitions) {
      if (!def.meta?.subsumes?.length) continue;
      // Only check columns that are IN their preset (user can override this via visibilityOverrides)
      // We use preset inclusion as a proxy for "this column might be visible"
      const preset = this.getPreset(context.activePresetId);
      if (!preset.visibleColumnIds.includes(def.id)) continue;
      // Check if this column lists the target id in its subsumes
      if (def.meta.subsumes.includes(id)) {
        return true;
      }
    }
    return false;
  }
  private isColumnAvailable(def: ColumnDef, context: ColumnSetContext): boolean {
    if (def.meta?.debugOnly && !context.isDebugMode) return false;
    const preset = this.getPreset(context.activePresetId);
    // A preset column is only "available" if it's NOT currently visible
    // (already-hidden preset columns should still be available to re-show,
    // but columns that ARE visible shouldn't appear twice in the add menu)
    if (preset.visibleColumnIds.includes(def.id)) {
      return !this.computeVisibility(def.id, context);
    }
    if (def.source.type === 'fixed-field') return true;
    if (def.source.type === 'derived') return true;
    return this.hasDataInRows(def, context.rows);
  }

  // ─── Private: Data Presence ────────────────────────────────

  /**
   * Check whether any row has data for this column definition.
   *
   * Performance note: For typical grid sizes (<1000 rows, <50 columns)
   * this scan is negligible. For larger grids, memoize at the call site.
   */
  private hasDataInRows(def: ColumnDef, rows: GridRow[]): boolean {
    if (rows.length === 0) return false;

    switch (def.source.type) {
      case 'fixed-field':
        return true;
      case 'metric-type': {
        const { metricType } = def.source;
        return rows.some((r) => r.cells.has(metricType));
      }
      case 'derived':
        // Derived columns: assume they have data (compute handles missing inputs)
        return true;
      case 'fallback': {
        const { sources } = def.source;
        return rows.some((r) => sources.some((src) => this.sourceHasDataInRow(src, r)));
      }
      default:
        return true;
    }
  }

  private sourceHasDataInRow(source: ColumnSource, row: GridRow): boolean {
    switch (source.type) {
      case 'fixed-field':
        return (
          (row as any)[source.field] !== undefined &&
          (row as any)[source.field] !== null
        );
      case 'metric-type':
        return row.cells.has(source.metricType);
      case 'derived':
        return true;
      case 'fallback':
        return source.sources.some((s) => this.sourceHasDataInRow(s, row));
      default:
        return false;
    }
  }
}
