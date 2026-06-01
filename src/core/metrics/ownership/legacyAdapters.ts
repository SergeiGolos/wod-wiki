import type { MetricType } from '../../models/Metric';
import type { IMetric } from '../../models/Metric';
import { MetricType as MetricTypeEnum } from '../../models/Metric';
import type { MetricFilter } from '../../contracts/IMetricSource';
import { createMetricOwnershipLedger } from './ledger';

function applyLegacyMetricFilter(metrics: readonly IMetric[], filter?: MetricFilter): IMetric[] {
  let filtered = [...metrics];

  // Hint metrics are semantic markers, never display metrics. Drop them unless
  // a caller explicitly asks for the Hint type.
  const wantsHints = filter?.types?.includes(MetricTypeEnum.Hint) ?? false;
  if (!wantsHints) {
    filtered = filtered.filter((metric) => metric.type !== MetricTypeEnum.Hint);
  }

  if (!filter) {
    return filtered;
  }

  if (filter.origins) {
    filtered = filtered.filter((metric) => filter.origins!.includes(metric.origin ?? 'parser'));
  }

  if (filter.types) {
    filtered = filtered.filter((metric) => filter.types!.includes(metric.type as MetricType));
  }

  if (filter.excludeTypes) {
    filtered = filtered.filter((metric) => !filter.excludeTypes!.includes(metric.type as MetricType));
  }

  return filtered;
}

/**
 * Legacy compatibility seam for display-oriented reads.
 *
 * Preserves existing `MetricFilter` semantics while delegating visibility
 * decisions to the ownership ledger.
 */
export function resolveVisibleMetricsWithOwnership(metrics: readonly IMetric[], filter?: MetricFilter): IMetric[] {
  const filtered = applyLegacyMetricFilter(metrics, filter);
  const ledger = createMetricOwnershipLedger(filtered);
  return ledger.visible();
}

export function resolveVisibleMetricByTypeWithOwnership(
  metrics: readonly IMetric[],
  type: MetricType,
): IMetric | undefined {
  const visible = resolveVisibleMetricsWithOwnership(metrics, { types: [type] });
  return visible[0];
}

export function resolveVisibleMetricsByTypeWithOwnership(metrics: readonly IMetric[], type: MetricType): IMetric[] {
  return resolveVisibleMetricsWithOwnership(metrics, { types: [type] });
}
