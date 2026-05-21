import type { IMetric, MetricOrigin } from '../models/Metric';
import type { IEffort, ResolvedEffort } from '@/effort-registry/types';
import { DEFAULT_RESOLVER_OPTIONS } from '@/effort-registry/types';

/**
 * Custom metric type for resolved effort data attached by
 * TwoPassEffortResolutionProcess.
 */
export const EFFORT_DATA_METRIC_TYPE = 'effort-data' as const;

/**
 * Resolved effort data extracted from an enriched metrics stream.
 */
export const DEFAULT_UNRESOLVED_EFFORT_MET = DEFAULT_RESOLVER_OPTIONS.defaultMet;

export interface ResolvedEffortData {
  /** Effective resolved effort instance. */
  resolved: ResolvedEffort;
  /** Effective effort copy retained for legacy callers. */
  effort: IEffort;
  origin: MetricOrigin;
}

function isResolvedEffort(value: unknown): value is ResolvedEffort {
  return !!value
    && typeof value === 'object'
    && 'effort' in value
    && 'met' in value
    && 'disciplineFactor' in value;
}

function coerceResolvedEffort(value: IEffort | ResolvedEffort): ResolvedEffort {
  if (isResolvedEffort(value)) return value;
  const effort = value;
  const discipline = effort.baseAttributes.discipline;
  const disciplineFactor = effort.baseAttributes.disciplineFactor
    ?? (discipline?.toLowerCase() === 'strength' || discipline?.toLowerCase() === 'resistance' ? 1.2 : discipline?.toLowerCase() === 'yoga' ? 0.9 : 1.0);
  return {
    effort,
    definition: effort,
    slug: effort.slug,
    label: effort.label,
    met: effort.baseAttributes.met,
    baseAttributes: effort.baseAttributes,
    discipline,
    disciplineFactor,
    intensityTier: effort.baseAttributes.intensityTier,
    modifiers: {},
    registrySource: effort.registrySource,
    resolvedFrom: effort.registrySource === 'user' ? 'user' : effort.registrySource === 'bundled' ? 'bundled' : 'default',
    isEstimated: effort.registrySource === 'synthetic-unresolved',
  };
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
      const resolved = coerceResolvedEffort(m.value as IEffort | ResolvedEffort);
      last = {
        resolved,
        effort: resolved.effort,
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
