import type { IMetric, MetricOrigin } from '../models/Metric';
import type { IEffort } from '@/effort-registry/types';

/**
 * Custom metric type for resolved effort data attached by
 * TwoPassEffortResolutionProcess.
 */
export const EFFORT_DATA_METRIC_TYPE = 'effort-data' as const;

/**
 * Resolved effort data extracted from an enriched metrics stream.
 */
export interface ResolvedEffortData {
  effort: IEffort;
  origin: MetricOrigin;
}

/**
 * Extract the most recent resolved effort data from a metric stream.
 *
 * Iterates in order and returns the last `effort-data` metric found,
 * since metrics are processed sequentially and later entries override
 * earlier ones within a segment.
 */
export function extractEffortData(metrics: IMetric[]): ResolvedEffortData | undefined {
  let last: ResolvedEffortData | undefined;
  for (const m of metrics) {
    if (m.type === EFFORT_DATA_METRIC_TYPE && m.value && typeof m.value === 'object') {
      last = {
        effort: m.value as IEffort,
        origin: m.origin as MetricOrigin,
      };
    }
  }
  return last;
}

/**
 * Determine the dominant origin across a collection of effort data.
 *
 * Priority: analyzed-estimated (most conservative) > analyzed > compiler.
 * If any effort was unresolved synthetic, the whole projection is flagged
 * as estimated so downstream consumers know to treat it with caution.
 */
export function resolveDominantOrigin(origins: MetricOrigin[]): MetricOrigin {
  if (origins.length === 0) return 'analyzed';
  if (origins.some(o => o === 'analyzed-estimated')) return 'analyzed-estimated';
  if (origins.some(o => o === 'analyzed')) return 'analyzed';
  if (origins.every(o => o === 'compiler')) return 'compiler';
  return 'analyzed';
}
