/**
 * CDL Examples — Fallback Chains & Grouping Semantics
 *
 * This file demonstrates the key CDL patterns:
 * - Fallback chains with different semantics
 * - Grouping multiple metrics in a single cell
 * - Derived columns
 * - Fixed fields
 *
 * @see docs/adr/0011-column-definition-language.md
 */

import type { ColumnDef } from './column-definition-language';
import { MetricType } from '@/core/models/Metric';

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 1: FIRST-PRESENT FALLBACK CHAIN
// ═══════════════════════════════════════════════════════════════
/**
 * Effort column: try Rep first, then Increment, then Effort
 *
 * Semantics: FIRST_PRESENT means "use the first metric type that has data,
 * don't try the next one unless this one is absent".
 *
 * Use case: Different workout types have different effort metrics:
 * - Strength: Rep (sets × reps)
 * - Cardio: Increment (e.g., 30-second intervals)
 * - Hybrid: Effort (generic effort scale)
 */

export const effortColumnFirstPresent: ColumnDef = {
  id: 'effort',
  label: 'Effort',
  icon: '💪',
  source: {
    type: 'fallback',
    semantics: 'first-present',
    sources: [
      { type: 'metric-type', metricType: MetricType.Rep },
      { type: 'metric-type', metricType: MetricType.Increment },
      { type: 'metric-type', metricType: MetricType.Effort },
    ],
  },
  format: {
    type: 'badge',
    styleResolver: (value) => {
      // Render as colored badge based on effort level
      const num = (value as any)?.value || 0;
      return {
        className: num > 100 ? 'badge-intense' : num > 50 ? 'badge-moderate' : 'badge-light',
        icon: '●',
      };
    },
    textResolver: (value) => (value as any)?.value?.toString() || '—',
  },
  sort: {
    type: 'numeric',
    extractor: (cell) => (cell as any)?.metrics?.value || 0,
  },
  graph: {
    extractor: (cell) => (cell as any)?.metrics?.value,
    axisLabel: 'Effort',
    unit: 'reps/units',
  },
  filter: {
    extractor: (cell) => (cell as any)?.metrics?.value?.toString() || '',
    caseInsensitive: true,
  },
  meta: {
    tags: ['effort', 'core'],
    defaultVisible: true,
  },
};

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 2: ALL-PRESENT-JOINED FALLBACK (GROUPING)
// ═══════════════════════════════════════════════════════════════
/**
 * "Effort + Label" column: Combines Effort (primary) + Text (secondary)
 *
 * Semantics: ALL_PRESENT_JOINED means "only show if both metrics are present,
 * and render them together with a separator".
 *
 * Example output:
 *   Heavy
 *   squat
 *
 * Or horizontally:
 *   Heavy — squat
 *
 * Use case: Contextual grouping where the combination is more meaningful
 * than individual metrics. E.g., "heavy squat" vs just "heavy".
 */

export const effortLabelGroupedColumn: ColumnDef = {
  id: 'effortLabel',
  label: 'Exercise',
  icon: '📋',
  source: {
    type: 'fallback',
    semantics: 'all-present-joined',
    joinString: ' — ',
    sources: [
      { type: 'metric-type', metricType: MetricType.Effort },
      { type: 'metric-type', metricType: MetricType.Text },
    ],
  },
  format: {
    type: 'combined',
    layout: 'vertical',
    separator: '',
    primaryFormat: {
      type: 'badge',
      styleResolver: (_value) => ({
        className: 'badge-effort',
        icon: '💪',
      }),
      textResolver: (value) => (value as any)?.toString() || '—',
    },
    secondaryFormat: {
      type: 'text',
      className: 'text-secondary font-mono',
      transform: (value) => (value as any)?.toString() || '—',
    },
    containerClassName: 'flex flex-col gap-1',
  },
  sort: {
    type: 'text',
    extractor: (cell) => (cell as any)?.metrics?.text || '',
  },
  filter: {
    extractor: (cell) => {
      const effort = (cell as any)?.metrics?.[0]?.toString() || '';
      const text = (cell as any)?.metrics?.[1]?.toString() || '';
      return `${effort} ${text}`;
    },
  },
  meta: {
    tags: ['context', 'grouping'],
    defaultVisible: true,
  },
};

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 3: DERIVED COLUMN (Pace = Distance / Duration)
// ═══════════════════════════════════════════════════════════════
/**
 * Pace column: computed field derived from row data
 *
 * Semantics: Derived sources run custom functions to compute values.
 * This example calculates pace (distance per time unit).
 *
 * Example: 5 km in 30 minutes → 10 km/hour or 6:00 min/km
 */

export const paceColumnDerived: ColumnDef = {
  id: 'pace',
  label: 'Pace',
  icon: '⏱️',
  source: {
    type: 'derived',
    compute: (row) => {
      // Read distance and duration from cells
      const distanceCell = row.cells.get(MetricType.Distance);
      const durationCell = row.cells.get(MetricType.Duration);

      if (!distanceCell || !durationCell) return undefined;

      const distance = (distanceCell as any)?.metrics?.value || 0;
      const duration = (durationCell as any)?.metrics?.value || 0;

      if (duration === 0) return undefined;

      // Compute pace (e.g., km/hour)
      return (distance / duration) * 3600;
    },
  },
  format: {
    type: 'number',
    decimals: 2,
    unit: ' km/h',
    transform: (value) => {
      // Convert to time-based pace if needed (min:sec per km)
      const kph = value as number;
      const secPerKm = 3600 / kph;
      const min = Math.floor(secPerKm / 60);
      const sec = Math.round(secPerKm % 60);
      return `${min}:${sec.toString().padStart(2, '0')}/km`;
    },
  },
  sort: {
    type: 'numeric',
    extractor: (cell) => (cell as any)?.value || 0,
  },
  graph: {
    extractor: (cell) => (cell as any)?.value,
    axisLabel: 'Pace (km/h)',
    unit: 'km/h',
  },
  filter: {
    extractor: (cell) => (cell as any)?.value?.toFixed(2) || '',
  },
  meta: {
    tags: ['derived', 'timing'],
    defaultVisible: false,
  },
};

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 4: FIXED FIELD COLUMN (Simple Row Property)
// ═══════════════════════════════════════════════════════════════
/**
 * Index column: reads directly from row.index (fixed field)
 *
 * Semantics: Fixed-field sources read scalar properties directly from GridRow.
 * No lookup, no formatting complexity — just display the raw value.
 */

export const indexColumnFixed: ColumnDef = {
  id: '#',
  label: '#',
  source: {
    type: 'fixed-field',
    field: 'index',
  },
  format: {
    type: 'text',
    className: 'text-center text-gray-500 font-mono',
  },
  sort: {
    type: 'numeric',
    extractor: (row) => (row as any)?.index || 0,
  },
  meta: {
    tags: ['layout'],
    defaultVisible: true,
    width: '40px',
    resizable: false,
  },
};

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 5: ELAPSED_TOTAL (Fixed Grouping)
// ═══════════════════════════════════════════════════════════════
/**
 * ELAPSED_TOTAL column: cumulative elapsed time up to this row
 *
 * This is an example of a "pseudo-column" that's currently implemented
 * as a fixed switch in GridRow.tsx. CDL exposes it as a derived column
 * that accumulates elapsed time from all previous rows.
 *
 * Current broken implementation in GridRow.tsx used a legacy fixed-column
 * branch for cumulative elapsed time.
 *
 * CDL approach (cleaner):
 */

export const elapsedTotalColumnDerived: ColumnDef = {
  id: 'elapsedTotal',
  label: 'Session Elapsed',
  icon: '⏱️',
  source: {
    type: 'derived',
    compute: (row, context) => {
      // In Phase 2, context will include the full row list
      // For now, this shows the structure
      const rowList = (context as any)?.allRows || [];
      const currentRowId = (row as any)?.id;
      const indexOfCurrent = rowList.findIndex((r: any) => r.id === currentRowId);

      if (indexOfCurrent === -1) return undefined;

      // Sum all elapsed times up to and including this row
      return rowList.slice(0, indexOfCurrent + 1).reduce((sum: number, r: any) => sum + r.elapsed, 0);
    },
  },
  format: {
    type: 'time',
    style: 'long', // h:mm:ss format
  },
  sort: {
    type: 'numeric',
    extractor: (cell) => (cell as any)?.value || 0,
  },
  graph: {
    extractor: (cell) => (cell as any)?.value,
    axisLabel: 'Cumulative Elapsed (s)',
    unit: 'seconds',
  },
  meta: {
    tags: ['timing', 'derived'],
    defaultVisible: true,
  },
};

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 6: METRIC TYPE COLUMN (Simple)
// ═══════════════════════════════════════════════════════════════
/**
 * Rep column: reads MetricType.Rep from row.cells
 *
 * This is the simplest case — just look up a single metric type
 * and render it with a standard formatter.
 */

export const repColumnSimple: ColumnDef = {
  id: 'rep',
  label: 'Reps',
  icon: '🔢',
  source: {
    type: 'metric-type',
    metricType: MetricType.Rep,
  },
  format: {
    type: 'badge',
    styleResolver: (_value) => ({
      className: 'badge-rep',
      icon: '●',
    }),
    textResolver: (value) => (value as any)?.value?.toString() || '—',
  },
  sort: {
    type: 'numeric',
    extractor: (cell) => (cell as any)?.metrics?.value || 0,
  },
  graph: {
    extractor: (cell) => (cell as any)?.metrics?.value,
    axisLabel: 'Reps',
    unit: 'reps',
  },
  filter: {
    extractor: (cell) => (cell as any)?.metrics?.value?.toString() || '',
  },
  meta: {
    tags: ['effort', 'core'],
    defaultVisible: true,
  },
};

// ═══════════════════════════════════════════════════════════════
// SUMMARY OF PATTERNS
// ═══════════════════════════════════════════════════════════════

/**
 * Pattern 1: FIRST-PRESENT FALLBACK
 *   - Try multiple metric types in order
 *   - Use first one that has data
 *   - Example: Rep → Increment → Effort
 *   - Use case: Different metric types for different workout styles
 *
 * Pattern 2: ALL-PRESENT-JOINED GROUPING
 *   - Combine multiple metrics if all are present
 *   - Render together with separator or layout
 *   - Example: Effort + Text as "Heavy — squat"
 *   - Use case: Contextual grouping, composite meanings
 *
 * Pattern 3: DERIVED COMPUTATION
 *   - Custom function computes value from row
 *   - Example: Pace = Distance / Duration
 *   - Use case: Derived metrics, cumulative sums, transformations
 *
 * Pattern 4: FIXED FIELD
 *   - Direct row property, no lookup
 *   - Example: Index, BlockKey, Elapsed
 *   - Use case: Metadata, layout columns, simple row attributes
 *
 * Pattern 5: SIMPLE METRIC LOOKUP
 *   - Single metric type from row.cells
 *   - Example: Rep, Text, Duration
 *   - Use case: 1:1 metric columns
 */
