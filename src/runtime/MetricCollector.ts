import { RuntimeMetric } from './RuntimeMetric';

/**
 * Interface for metric collection subsystem.
 * 
 * This service collects metrics during workout execution and makes them
 * available for analysis after the workout completes.
 */
export interface IMetricCollector {
  /**
   * Collect a runtime metric during workout execution.
   * 
   * @param metric The metric to collect
   */
  collect(metric: RuntimeMetric): void;
  
  /**
   * Get all collected metrics.
   * 
   * @returns Array of all collected metrics
   */
  getMetrics(): RuntimeMetric[];
  
  /**
   * Clear all collected metrics.
   * Used to reset state between workouts.
   */
  clear(): void;
}

/**
 * Default implementation of metric collection.
 * 
 * Stores metrics in memory during workout execution for later analysis.
 */
export class MetricCollector implements IMetricCollector {
  private metrics: RuntimeMetric[] = [];
  
  collect(metric: RuntimeMetric): void {
    this.metrics.push(metric);
  }
  
  getMetrics(): RuntimeMetric[] {
    return [...this.metrics];
  }
  
  clear(): void {
    this.metrics = [];
  }
}
