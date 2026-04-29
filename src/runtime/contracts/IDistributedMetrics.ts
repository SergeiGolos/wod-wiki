import type { MetricContainer } from "../../core/models/MetricContainer";

/**
 * Describes a strategy for distributing metric across repeated block runs.
 * Example: a rounds block can duplicate its metric per round so runtime
 * recordings land in the correct iteration bucket.
 *
 * Note: The concrete `PassthroughMetricDistributor` implementation lives in
 * `src/runtime/impl/PassthroughMetricDistributor.ts` to keep this contracts
 * file free of implementation code.
 */
export interface IDistributedMetrics {
  distribute(base: MetricContainer, blockType?: string): MetricContainer[];
}
