import type { IMetric, MetricType } from '../models/Metric';
import type { MetricFilter } from './IMetricSource';

/**
 * Unified resolver for metric ownership precedence.
 *
 * Implements the canonical 5-tier ownership ledger resolution:
 * parser -> dialect -> user-plan -> runtime -> user-entry
 */
export interface IMetricOwnershipResolver {
  /** Resolve display-ready metrics, applying optional type/layer filters. */
  resolve(metrics: readonly IMetric[], filter?: MetricFilter): IMetric[];

  /** Resolve the single winning metric of a given type, or undefined. */
  resolveOne(metrics: readonly IMetric[], type: MetricType | string): IMetric | undefined;

  /** Resolve all metrics of a given type, sorted by ownership tier (highest first). */
  resolveAll?(metrics: readonly IMetric[], type: MetricType | string): IMetric[];
}
