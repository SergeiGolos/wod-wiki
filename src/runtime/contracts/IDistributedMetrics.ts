import { IMetric } from "../core/models/Metric";

/**
 * Describes a strategy for distributing metric across repeated block runs.
 * Example: a rounds block can duplicate its metric per round so runtime
 * recordings land in the correct iteration bucket.
 */
export interface IDistributedMetrics {
  distribute(base: IMetric[], blockType?: string): IMetric[][];
}

/**
 * Default passthrough distributor: keeps a single metric group.
 */
export class PassthroughMetricDistributor implements IDistributedMetrics {
  distribute(base: IMetric[], _blockType?: string): IMetric[][] {
    return [base];
  }
}
