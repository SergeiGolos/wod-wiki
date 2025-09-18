import type { IMemoryReference } from '../memory';
import { IBehavior } from './IBehavior';
import { RuntimeMetric } from '../RuntimeMetric';

/**
 * AllocateMetrics - Manages workout metrics data.
 * 
 * Functions:
 * - Writes metrics to the designated memory location
 * - Creates and maintains measurement data structures
 * 
 * Used By: TimeBoundBlock, TimedBlock
 * 
 * Note: The metric object as they are on the runtime block now, will now live in memory.
 */
export interface IAllocateMetricsBehavior extends IBehavior {
    /**
     * Memory allocations:
     * - metrics (private): RuntimeMetric[] - the metrics data for this block
     */
    
    /**
     * Get the metrics from memory
     */
    getMetrics(): RuntimeMetric[];
    
    /**
     * Set the metrics in memory
     */
    setMetrics(metrics: RuntimeMetric[]): void;
    
    /**
     * Add a metric to the collection
     */
    addMetric(metric: RuntimeMetric): void;
    
    /**
     * Get the metrics memory reference
     */
    getMetricsReference(): IMemoryReference<RuntimeMetric[]> | undefined;
    
    /**
     * Create and initialize the metrics in memory
     */
    initializeMetrics(initialMetrics: RuntimeMetric[]): void;
}