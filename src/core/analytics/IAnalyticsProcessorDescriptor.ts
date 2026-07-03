import type { FenceDialect } from '@/components/Editor/types';
import type { MetricType } from '../models/Metric';

/**
 * Shared descriptor for all analytics processors.
 *
 * Defines applicability rules: which fence dialects (the `wod`/`log`/`plan`
 * code-fence language a block was written in) the processor is eligible for,
 * and which metrics must be present in the authored script for the processor
 * to activate.
 *
 * Note: the descriptor field is named `fenceTypes` (not `dialects`) to make
 * clear this is the **fence** axis only. Sport-specific filtering is
 * expressed via `requiredMetrics` (e.g. `ClimbMetricType.Grade` for
 * Climb-only processors). See Tier 3 §3.1.
 */
export interface IAnalyticsProcessorDescriptor {
  readonly id: string;

  /**
   * Allow-list of fence dialects this processor is eligible for.
   * Omit or leave undefined to allow all fence dialects.
   */
  readonly fenceTypes?: readonly FenceDialect[];

  /**
   * Metrics that must ALL be present in the authored script for this
   * processor to activate (AND semantics).
   * Omit or leave undefined when applicability cannot be expressed
   * with a simple metric list (e.g. disjunctive conditions).
   *
   * Typed `MetricType | string` (matching `IMetric.type`'s own type) so a
   * custom dialect's domain metric type (e.g. `ClimbMetricType.Grade`,
   * a plain string constant, not a `MetricType` enum member) can be used
   * here directly — this was already the documented example above before
   * the type was widened to actually allow it.
   */
  readonly requiredMetrics?: readonly (MetricType | string)[];
}
