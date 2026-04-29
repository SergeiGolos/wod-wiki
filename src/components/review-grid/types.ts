/**
 * Review Grid — Type Definitions
 *
 * Core data model for the review grid that treats IOutputStatement[] as rows
 * and MetricType columns as the primary data axis.
 */

import type { MetricType, MetricOrigin } from '@/core/models/Metric';
import type { MetricContainer } from '@/core/models/MetricContainer';
import type { OutputStatementType } from '@/core/models/OutputStatement';

// ─── Grid Row ──────────────────────────────────────────────────

/**
 * One row per IOutputStatement, with metrics pivoted into column-keyed cells.
 *
 * Canonical time data lives in `cells` keyed by `MetricType`:
 * - `cells.get(MetricType.Spans)`   → **Time** (raw TimeSpan[] recordings)
 * - `cells.get(MetricType.Elapsed)` → **Elapsed** (Σ span durations)
 * - `cells.get(MetricType.Total)`   → **Total** (wall-clock bracket)
 * - `cells.get(MetricType.Duration)` → **Duration** (parser target)
 *
 * The direct properties below are **deprecated proxies** kept for backward
 * compatibility. New renderers should read from `cells` instead.
 *
 * @see docs/architecture/time-terminology.md
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

  /** **TimeStamp** (Wall-clock) — system Date.now() when started (milliseconds) */
  readonly absoluteStartTime?: number;
  /** **Duration** (Intent) — planned target from the parser (seconds) */
  readonly duration?: number;
  /** **Spans** (Raw) — raw spans relative to workout start (seconds) */
  readonly spans: { started: number; ended?: number }[];
  /** **Elapsed** (Active) — pause-aware active time (seconds) */
  readonly elapsed: number;
  /** **Total** (Wall-clock) — total time from first start to last end (seconds) */
  readonly total: number;

  /** Completion reason (only for 'completion' type) */
  readonly completionReason?: string;
  /** Fragment-type → cell data (canonical source of truth) */
  readonly cells: Map<MetricType, GridCell>;
}

// ─── Grid Cell ─────────────────────────────────────────────────

/**
 * Multi-value cell — a single row can carry multiple metrics of the same type.
 */
export interface GridCell {
  /** All metrics of this type for this row */
  readonly metrics: MetricContainer;
  /** True if any metric has origin 'user' */
  readonly hasUserOverride: boolean;
}

// ─── Grid Column ───────────────────────────────────────────────

/**
 * Column definition for the grid.
 * Fixed columns (index, block key, etc.) have no metricType.
 * Dynamic columns correspond to a MetricType.
 */
export interface GridColumn {
  /** Unique column identifier */
  readonly id: string;
  /** Associated metrics type (undefined for fixed columns) */
  readonly type?: MetricType;
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
  /** Optional metadata for custom rendering or behavior */
  readonly meta?: Record<string, any>;
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
  /** Filter by metrics origin */
  readonly origins?: MetricOrigin[];
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
  /** Which metrics-type columns are visible in this preset */
  readonly visibleColumns: MetricType[];
  /** Whether this preset is the default */
  readonly isDefault?: boolean;
}

// ─── Fixed Column IDs ──────────────────────────────────────────

/**
 * Identifiers for the non-metrics fixed columns.
 *
 * Column names follow the glossary in docs/architecture/time-terminology.md:
 * - TIMESTAMP → **TimeStamp** (system Date.now())
 * - SPANS     → **Time** (session-relative span ranges)
 * - ELAPSED   → **Elapsed** (Σ span durations)
 * - DURATION  → **Duration** (parser-defined target)
 * - TOTAL     → **Total** (wall-clock bracket)
 */
export const FIXED_COLUMN_IDS = {
  INDEX: '#',
  BLOCK_KEY: 'blockKey',
  OUTPUT_TYPE: 'outputType',
  STACK_LEVEL: 'stackLevel',
  ELAPSED: 'elapsed',
  DURATION: 'duration',
  TOTAL: 'total',
  ELAPSED_TOTAL: 'elapsedTotal',
  SPANS: 'spans',
  COMPLETION_REASON: 'completionReason',
  TIMESTAMP: 'timestamp',
} as const;
