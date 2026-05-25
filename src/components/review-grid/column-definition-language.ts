/**
 * Column Definition Language (CDL) — Type Definitions
 *
 * A declarative schema where each column declares its source, format, sort behavior,
 * graph extraction, and filter semantics in one place. Replaces scattered switch statements
 * across GridRow, useGridData, useGraphData, and gridPresets files.
 *
 * @see docs/adr/0011-column-definition-language.md
 */

import type { MetricType, MetricOrigin } from '@/core/models/Metric';
import type { GridRow, GridCell } from './types';

// ─── Column Source ─────────────────────────────────────────────
/**
 * Describes where column data comes from: a row field, a metric type,
 * a derived expression, or a fallback chain across multiple sources.
 */

export type ColumnSourceType = 'fixed-field' | 'metric-type' | 'derived' | 'fallback';

/**
 * Fixed-field source: reads a scalar property directly from GridRow.
 *
 * Examples:
 * - field: 'index' → row.index
 * - field: 'elapsed' → row.elapsed
 * - field: 'duration' → row.duration
 */
export interface FixedFieldSource {
  readonly type: 'fixed-field';
  /** Property key on GridRow */
  readonly field: keyof GridRow;
}

/**
 * Metric-type source: reads from row.cells keyed by MetricType.
 *
 * Examples:
 * - metricType: MetricType.Elapsed → row.cells.get(MetricType.Elapsed)
 * - metricType: MetricType.Rep → row.cells.get(MetricType.Rep)
 *
 * Fallback chain is handled separately via ColumnSource union.
 */
export interface MetricTypeSource {
  readonly type: 'metric-type';
  /** MetricType to look up in row.cells */
  readonly metricType: MetricType;
}

/**
 * Derived source: computes a value from row data using a custom function.
 *
 * Examples:
 * - Pace = distance / duration
 * - Effort + Text combination
 * - Custom aggregate of multiple metrics
 */
export interface DerivedSource {
  readonly type: 'derived';
  /** Compute function: (row, context?) => unknown value */
  readonly compute: (row: GridRow, context?: DerivedSourceContext) => unknown;
  /** Optional context data passed to compute */
  readonly context?: DerivedSourceContext;
}

export interface DerivedSourceContext {
  /** Presentation policy for labels and formatting */
  readonly metricPolicy?: any;
  /** Other contextual data */
  readonly [key: string]: any;
}

/**
 * Fallback chain source: tries sources in order, returns first non-null result.
 *
 * Semantics:
 * - FIRST_PRESENT: return first source with data, fallback to next if absent
 * - ALL_PRESENT_JOINED: only return if all sources present, join with separator
 * - ALL_PRESENT_COMBINED: return combined object if all sources present
 *
 * Examples (FIRST_PRESENT):
 * - [ MetricType.Rep, MetricType.Increment ] → use Rep if present, else Increment
 *
 * Examples (ALL_PRESENT_JOINED):
 * - [ MetricType.Effort, MetricType.Text ] + join: ' — ' → "Heavy — squat" if both present
 */
export type FallbackChainSemantics = 'first-present' | 'all-present-joined' | 'all-present-combined';

export interface FallbackSource {
  readonly type: 'fallback';
  /** Sources to try in order */
  readonly sources: ColumnSource[];
  /** How to handle multiple sources */
  readonly semantics: FallbackChainSemantics;
  /** Join string for 'all-present-joined' */
  readonly joinString?: string;
}

/**
 * Union of all source types.
 */
export type ColumnSource = FixedFieldSource | MetricTypeSource | DerivedSource | FallbackSource;

// ─── Column Format ─────────────────────────────────────────────
/**
 * Describes how to render the column value: plain text, formatted time,
 * badge, combined label, etc.
 */

export type ColumnFormatType =
  | 'text'
  | 'time'
  | 'number'
  | 'badge'
  | 'pill'
  | 'combined'
  | 'custom';

/**
 * Plain text format — renders as-is or with optional CSS class.
 */
export interface TextFormat {
  readonly type: 'text';
  /** Optional CSS class */
  readonly className?: string;
  /** Optional postprocessing function */
  readonly transform?: (value: unknown) => string;
}

/**
 * Time format — renders seconds as "mm:ss", "h:mm:ss", or custom.
 */
export interface TimeFormat {
  readonly type: 'time';
  /** Format style: 'short' (m:ss), 'long' (h:mm:ss), 'precise' (ms) */
  readonly style?: 'short' | 'long' | 'precise';
  /** Optional postprocessing */
  readonly transform?: (formatted: string) => string;
}

/**
 * Number format — renders with decimals, rounding, unit suffix.
 */
export interface NumberFormat {
  readonly type: 'number';
  /** Decimal places */
  readonly decimals?: number;
  /** Unit suffix (e.g., ' reps', ' kg') */
  readonly unit?: string;
  /** Optional postprocessing */
  readonly transform?: (formatted: string) => string;
}

/**
 * Badge format — renders as a colored pill with label and optional icon.
 */
export interface BadgeFormat {
  readonly type: 'badge';
  /** Function to determine badge color/style from value */
  readonly styleResolver: (value: unknown) => BadgeStyle;
  /** Function to extract display text */
  readonly textResolver: (value: unknown) => string;
}

export interface BadgeStyle {
  /** CSS class or color name */
  readonly className?: string;
  /** Icon/emoji */
  readonly icon?: string;
  /** Tooltip text */
  readonly title?: string;
}

/**
 * Pill format — renders as an inline box with background color.
 */
export interface PillFormat {
  readonly type: 'pill';
  /** Background color or CSS class */
  readonly backgroundColor?: string;
  /** Optional border radius */
  readonly borderRadius?: string;
  /** Optional postprocessing */
  readonly transform?: (value: unknown) => string;
}

/**
 * Combined format — renders multiple fields in a single cell with layout.
 *
 * Example: Effort (primary) + Text (secondary) — formatted as:
 *   Heavy
 *   squat
 */
export interface CombinedFormat {
  readonly type: 'combined';
  /** Layout direction: vertical (stacked) or horizontal (inline) */
  readonly layout: 'vertical' | 'horizontal';
  /** Separator between primary and secondary (if horizontal) */
  readonly separator?: string;
  /** Format for primary field */
  readonly primaryFormat?: ColumnFormat;
  /** Format for secondary field */
  readonly secondaryFormat?: ColumnFormat;
  /** Format for tertiary field (optional) */
  readonly tertiaryFormat?: ColumnFormat;
  /** CSS class for container */
  readonly containerClassName?: string;
}

/**
 * Custom format — delegates rendering to a custom render function.
 */
export interface CustomFormat {
  readonly type: 'custom';
  /** Render function: (value, context?) => ReactNode | string */
  readonly render: (value: unknown, context?: CustomFormatContext) => any;
  /** Optional context */
  readonly context?: CustomFormatContext;
}

export interface CustomFormatContext {
  readonly [key: string]: any;
}

/**
 * Union of all format types.
 */
export type ColumnFormat =
  | TextFormat
  | TimeFormat
  | NumberFormat
  | BadgeFormat
  | PillFormat
  | CombinedFormat
  | CustomFormat;

// ─── Column Sort ───────────────────────────────────────────────
/**
 * Describes how to extract a sortable value from a cell.
 */

export type ColumnSortType = 'numeric' | 'text' | 'time' | 'custom';

export interface NumericSort {
  readonly type: 'numeric';
  /** Function to extract numeric value, or direct MetricType */
  readonly extractor: (cell: GridCell | unknown) => number | undefined;
}

export interface TextSort {
  readonly type: 'text';
  /** Function to extract text value for string comparison */
  readonly extractor: (cell: GridCell | unknown) => string | undefined;
}

export interface TimeSort {
  readonly type: 'time';
  /** Function to extract seconds (as number) */
  readonly extractor: (cell: GridCell | unknown) => number | undefined;
}

export interface CustomSort {
  readonly type: 'custom';
  /** Comparator: (a, b) => -1 | 0 | 1 */
  readonly comparator: (a: unknown, b: unknown) => number;
}

export type ColumnSortConfig = NumericSort | TextSort | TimeSort | CustomSort;

// ─── Column Graph ─────────────────────────────────────────────
/**
 * Describes how to extract a numeric value for charting/graphing.
 */

export interface ColumnGraphConfig {
  /** Function to extract numeric value for graphing */
  readonly extractor: (cell: GridCell | unknown) => number | undefined;
  /** Optional label for the graph axis */
  readonly axisLabel?: string;
  /** Optional unit (e.g., 'seconds', 'reps') */
  readonly unit?: string;
}

// ─── Column Filter ─────────────────────────────────────────────
/**
 * Describes how to match cell content against filter text.
 */

export interface ColumnFilterConfig {
  /** Function to extract text for filter matching */
  readonly extractor: (cell: GridCell | unknown) => string | undefined;
  /** If true, match is case-insensitive */
  readonly caseInsensitive?: boolean;
  /** Custom matcher function if extractor is insufficient */
  readonly matcher?: (cellText: string, filterText: string) => boolean;
}

// ─── Complete Column Definition ─────────────────────────────────

/**
 * ColumnDef: The unified column definition combining source, format, sort, graph, and filter.
 *
 * This replaces the shallow GridColumn interface with a full declarative specification.
 * All rendering, sorting, filtering, and graphing logic is encoded in one place.
 *
 * @see docs/adr/0011-column-definition-language.md for semantics and examples
 */
export interface ColumnDef {
  /** Unique column identifier */
  readonly id: string;
  /** Display label */
  readonly label: string;
  /** Optional icon/emoji */
  readonly icon?: string;
  /** Where data comes from */
  readonly source: ColumnSource;
  /** How to render the value */
  readonly format: ColumnFormat;
  /** How to sort by this column (if sortable) */
  readonly sort?: ColumnSortConfig;
  /** How to graph this column (if graphable) */
  readonly graph?: ColumnGraphConfig;
  /** How to filter by this column (if filterable) */
  readonly filter?: ColumnFilterConfig;
  /** Metadata: visibility, tags, display options */
  readonly meta?: ColumnMetadata;
}

export interface ColumnMetadata {
  /** Default visibility in view presets */
  readonly defaultVisible?: boolean;
  /** Tags for grouping columns (e.g., 'timing', 'effort', 'debug') */
  readonly tags?: string[];
  /** Whether visible in debug mode only */
  readonly debugOnly?: boolean;
  /** Display width (CSS unit) */
  readonly width?: string;
  /** Whether column is resizable */
  readonly resizable?: boolean;
  /** Additional custom metadata */
  readonly [key: string]: any;
}

// ─── Column Set ─────────────────────────────────────────────────
/**
 * ColumnSet: manages the lifecycle of all columns including visibility,
 * presets, user overrides, and data-driven visibility.
 *
 * Responsibilities:
 * 1. Define the canonical column set (all possible columns)
 * 2. Apply preset selection (e.g., Default, Debug, Strength, Endurance)
 * 3. Apply data-driven visibility (only show columns with data)
 * 4. Apply user overrides (graph tags, visibility toggles, added columns)
 *
 * Exposes:
 * - visibleColumns: columns shown in current view
 * - availableColumns: all columns user can toggle
 * - graphableColumns: columns that can be graphed
 *
 * @see Phase 2 implementation
 */
export interface ColumnSetConfig {
  /** All available column definitions */
  readonly definitions: ColumnDef[];
  /** Named presets (e.g., Default, Debug, Strength) */
  readonly presets: Record<string, ColumnSetPreset>;
  /** Default preset to use */
  readonly defaultPreset: string;
}

export interface ColumnSetPreset {
  /** Display label */
  readonly label: string;
  /** Column IDs visible in this preset */
  readonly visibleColumnIds: string[];
  /** Whether this preset is read-only */
  readonly readOnly?: boolean;
  /** Description */
  readonly description?: string;
}

// ─── Export Index ──────────────────────────────────────────────

export type {
  FixedFieldSource,
  MetricTypeSource,
  DerivedSource,
  FallbackSource,
  TextFormat,
  TimeFormat,
  NumberFormat,
  BadgeFormat,
  PillFormat,
  CombinedFormat,
  CustomFormat,
  NumericSort,
  TextSort,
  TimeSort,
  CustomSort,
};
