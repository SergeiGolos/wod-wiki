import { MetricContainer } from "../../core/models/MetricContainer";

/**
 * Describes a strategy for distributing metric across repeated block runs.
 * Example: a rounds block can duplicate its metric per round so runtime
 * recordings land in the correct iteration bucket.
 */
export interface IDistributedMetrics {
  distribute(base: MetricContainer, blockType?: string): MetricContainer[];
}

/**
 * Default passthrough distributor: keeps a single metric group.
 */
export class PassthroughMetricDistributor implements IDistributedMetrics {
  distribute(base: MetricContainer, _blockType?: string): MetricContainer[] {
    return [MetricContainer.from(base).clone()];
  }
}
