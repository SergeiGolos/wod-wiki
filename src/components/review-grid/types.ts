/**
 * Review Grid — Type Definitions
 *
 * Core data model for the review grid that treats IOutputStatement[] as rows
 * and FragmentType columns as the primary data axis.
 */

import type { ICodeFragment, FragmentType, FragmentOrigin } from '@/core/models/CodeFragment';
import type { OutputStatementType } from '@/core/models/OutputStatement';

// ─── Grid Row ──────────────────────────────────────────────────

/**
 * One row per IOutputStatement, with fragments pivoted into column-keyed cells.
 */
export interface GridRow {
  /** Unique row identifier (from output statement id) */
  readonly id: number;
  /** Display index (1-based execution order) */
  readonly index: number;
  /** Block key that produced this output */
  readonly sourceBlockKey: string;
  /** Source statement ID (if available) */
  readonly sourceStatementId?: number;
  /** Output type classification */
  readonly outputType: OutputStatementType;
  /** Stack depth when emitted */
  readonly stackLevel: number;
  /** Pause-aware elapsed time in ms */
  readonly elapsed: number;
  /** Total wall-clock time in ms */
  readonly total: number;
  /** Completion reason (only for 'completion' type) */
  readonly completionReason?: string;
  /** Fragment-type → cell data */
  readonly cells: Map<FragmentType, GridCell>;
}

// ─── Grid Cell ─────────────────────────────────────────────────

/**
 * Multi-value cell — a single row can carry multiple fragments of the same type.
 */
export interface GridCell {
  /** All fragments of this type for this row */
  readonly fragments: ICodeFragment[];
  /** True if any fragment has origin 'user' */
  readonly hasUserOverride: boolean;
}

// ─── Grid Column ───────────────────────────────────────────────

/**
 * Column definition for the grid.
 * Fixed columns (index, block key, etc.) have no fragmentType.
 * Dynamic columns correspond to a FragmentType.
 */
export interface GridColumn {
  /** Unique column identifier */
  readonly id: string;
  /** Associated fragment type (undefined for fixed columns) */
  readonly fragmentType?: FragmentType;
  /** Display label */
  readonly label: string;
  /** Optional icon/emoji */
  readonly icon?: string;
  /** Whether the column supports sorting */
  readonly sortable: boolean;
  /** Whether the column supports filtering */
  readonly filterable: boolean;
  /** Whether this column can be tagged for graphing */
  readonly graphable: boolean;
  /** Currently tagged for graph visualization */
  isGraphed: boolean;
  /** Column visibility */
  visible: boolean;
}

// ─── Sorting ───────────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc';

export interface GridSortConfig {
  /** Column ID to sort by */
  readonly columnId: string;
  /** Sort direction */
  readonly direction: SortDirection;
}

// ─── Filtering ─────────────────────────────────────────────────

export interface GridFilterConfig {
  /** Filter by output type */
  readonly outputTypes?: OutputStatementType[];
  /** Filter by fragment origin */
  readonly origins?: FragmentOrigin[];
  /** Global text search across all cells */
  readonly searchText?: string;
  /** Per-column filter values (column id → filter text) */
  readonly columnFilters?: Record<string, string>;
}

// ─── View Presets ──────────────────────────────────────────────

export interface GridViewPreset {
  /** Unique preset identifier */
  readonly id: string;
  /** Display label */
  readonly label: string;
  /** Filter configuration for this preset */
  readonly filters: GridFilterConfig;
  /** Which fragment-type columns are visible in this preset */
  readonly visibleColumns: FragmentType[];
  /** Whether this preset is the default */
  readonly isDefault?: boolean;
}

// ─── Fixed Column IDs ──────────────────────────────────────────

/**
 * Identifiers for the non-fragment fixed columns.
 */
export const FIXED_COLUMN_IDS = {
  INDEX: '#',
  BLOCK_KEY: 'blockKey',
  OUTPUT_TYPE: 'outputType',
  STACK_LEVEL: 'stackLevel',
  ELAPSED: 'elapsed',
  TOTAL: 'total',
  COMPLETION_REASON: 'completionReason',
} as const;
