import type { IMetric, MetricType } from '../models/Metric';
import type { MetricFilter } from './IMetricSource';

/**
 * Unified resolver for metric ownership precedence.
 *
 * Replaces the legacy `resolveMetricPrecedence` / `selectBestTier` path with a
 * single ownership-ledger-based implementation.
 */
export interface IMetricOwnershipResolver {
  /** Resolve display-ready metrics, applying optional type/layer filters. */
  resolve(metrics: readonly IMetric[], filter?: MetricFilter): IMetric[];

  /** Resolve the single winning metric of a given type, or undefined. */
  resolveOne(metrics: readonly IMetric[], type: MetricType): IMetric | undefined;
}
