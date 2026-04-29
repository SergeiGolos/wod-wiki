/**
 * resolveMetricTable — view layer query over the two-tier metric store.
 *
 * Given a set of spans (filtered by branch/line) and all entries,
 * produces a resolved table: rows are metric keys, columns are SpanLevels.
 * Inheritance is applied left-to-right following the span parent chain.
 */

import type {
  MetricSpan,
  MetricEntry,
  ResolvedMetricRow,
  ResolvedCell,
  SpanLevel,
  MetricEntryState,
} from '../types/inspector';
import { STATE_SYMBOL } from '../types/inspector';

// ─── Span ordering ────────────────────────────────────────────────────────────

const LEVEL_ORDER: SpanLevel[] = [
  'parser',
  'dialect',
  'plan',
  'compiler',
  'runtime',
  'processing',
  'collected',
  'summary',
];

// ─── Display formatter ────────────────────────────────────────────────────────

function formatCell(entry: MetricEntry): ResolvedCell {
  const sym = STATE_SYMBOL[entry.state];
  let display: string;

  switch (entry.state) {
    case 'suppressed':
    case 'pending':
      display = sym;
      break;
    case 'inherited':
      display = sym;
      break;
    default: {
      const val = entry.value !== undefined && entry.value !== null
        ? String(entry.value) + (entry.unit ? ` ${entry.unit}` : '')
        : '';
      display = val ? `${sym}${val}` : sym;
    }
  }

  return { value: entry.value, state: entry.state, displayValue: display };
}

// ─── Core resolver ────────────────────────────────────────────────────────────

/**
 * Resolve a metric table for a given set of span IDs.
 *
 * @param targetSpanIds  The span IDs to include (e.g. all spans for one line)
 * @param allSpans       Full span registry (tier 1)
 * @param allEntries     Full entry registry (tier 2)
 * @param columns        Which SpanLevels to render (defaults to all)
 */
export function resolveMetricTable(
  targetSpanIds: string[],
  allSpans: Record<string, MetricSpan>,
  allEntries: Record<string, MetricEntry>,
  columns?: SpanLevel[],
): ResolvedMetricRow[] {
  const cols = columns ?? LEVEL_ORDER;

  // Build a lookup: level → entries for that span
  const levelEntries: Partial<Record<SpanLevel, MetricEntry[]>> = {};

  for (const spanId of targetSpanIds) {
    const span = allSpans[spanId];
    if (!span) continue;

    const entries = Object.values(allEntries).filter(e => e.spanId === spanId);
    levelEntries[span.level] = [...(levelEntries[span.level] ?? []), ...entries];
  }

  // Collect all metric keys present across all levels
  const allKeys = new Set<string>();
  for (const entries of Object.values(levelEntries)) {
    for (const e of entries ?? []) allKeys.add(e.metricKey);
  }

  // Resolve each metric key across the column levels with inheritance
  const rows: ResolvedMetricRow[] = [];

  for (const key of allKeys) {
    // Find the type from the first level that has it
    let metricType = 'unknown';
    let unit: string | undefined;

    for (const level of cols) {
      const found = (levelEntries[level] ?? []).find(e => e.metricKey === key);
      if (found) { metricType = found.metricType; unit = found.unit; break; }
    }

    const cells: Partial<Record<SpanLevel, ResolvedCell>> = {};
    let lastNonSuppressed: ResolvedCell | undefined;
    let suppressed = false;

    for (const level of cols) {
      const entry = (levelEntries[level] ?? []).find(e => e.metricKey === key);

      if (entry) {
        suppressed = entry.state === 'suppressed';
        const cell = formatCell(entry);
        cells[level] = cell;
        if (!suppressed) lastNonSuppressed = cell;
      } else if (suppressed) {
        cells[level] = { state: 'suppressed', displayValue: STATE_SYMBOL['suppressed'] };
      } else if (lastNonSuppressed) {
        cells[level] = { value: lastNonSuppressed.value, state: 'inherited', displayValue: STATE_SYMBOL['inherited'] };
      }
      // else: level hasn't run or no data — leave undefined (pending)
    }

    rows.push({ metricKey: key, metricType, unit, cells });
  }

  return rows;
}

/**
 * Convenience: get all span IDs for a given level.
 */
export function spansByLevel(
  level: SpanLevel,
  spans: Record<string, MetricSpan>,
): MetricSpan[] {
  return Object.values(spans).filter(s => s.level === level);
}

/**
 * Convenience: get all span IDs for a given parent span (a line's sub-spans).
 */
export function childSpans(
  parentId: string,
  spans: Record<string, MetricSpan>,
): MetricSpan[] {
  return Object.values(spans).filter(s => s.parentSpanId === parentId);
}
