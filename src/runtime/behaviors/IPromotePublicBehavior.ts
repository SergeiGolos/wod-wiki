import type { IMemoryReference } from '../memory';
import { RuntimeMetric } from '../RuntimeMetric';

/**
 * Promote selected metrics to public visibility for child inheritance.
 * Do not expose internal private `metrics` memory; publish a snapshot to avoid unintended mutation by children.
 */
export interface IPromotePublicBehavior {
    /**
     * Memory allocations:
     * - metrics-snapshot (public): RuntimeMetric[] — filtered or transformed view intended for children
     */
    
    /**
     * Create a public snapshot of metrics for child inheritance
     */
    createPublicMetricsSnapshot(): RuntimeMetric[];
    
    /**
     * Get the public metrics reference that children can access
     */
    getPublicMetricsReference(): IMemoryReference<RuntimeMetric[]> | undefined;
}