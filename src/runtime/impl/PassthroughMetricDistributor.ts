import type { MetricContainer } from '../../core/models/MetricContainer';
import type { IDistributedMetrics } from '../contracts/IDistributedMetrics';

/**
 * Default passthrough distributor: keeps a single metric group.
 *
 * Lives in `impl/` rather than `contracts/` to keep the contracts layer free
 * of concrete classes (interface segregation / abstraction-implementation
 * separation).
 */
export class PassthroughMetricDistributor implements IDistributedMetrics {
    distribute(base: MetricContainer, _blockType?: string): MetricContainer[] {
        return [base.clone()];
    }
}
