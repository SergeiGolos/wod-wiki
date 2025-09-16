import type { IMemoryReference } from '../memory';
import { RuntimeMetric } from '../RuntimeMetric';

/**
 * Make parent metrics visible/available to children respecting inheritance rules.
 * Composition should run during JIT compile (MetricComposer) rather than at runtime when possible.
 */
export interface IInheritMetricsBehavior {
    /**
     * Memory allocations:
     * - inherited-metrics (public): RuntimeMetric[] — composed metrics children may consume
     */
    
    /**
     * Get inherited metrics from parent's public metrics-snapshot
     */
    getInheritedMetrics(): RuntimeMetric[];
    
    /**
     * Get the inherited metrics reference
     */
    getInheritedMetricsReference(): IMemoryReference<RuntimeMetric[]> | undefined;
}