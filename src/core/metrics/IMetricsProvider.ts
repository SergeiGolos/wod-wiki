import { RuntimeMetric } from "../RuntimeMetric";

/**
 * Interface for components that can provide metrics
 * This enables a clean separation between statement structure and runtime representation
 */
export interface IMetricsProvider {
  /**
   * Get metrics from this provider
   * @param includeChildren Whether to include metrics from child components
   * @param inheritFromParent Whether to inherit metrics from parent components
   * @returns Array of RuntimeMetric objects
   */
  getMetrics(includeChildren?: boolean, inheritFromParent?: boolean): RuntimeMetric[];
  
  /**
   * Update metrics for this provider
   * @param updater Function that takes current metrics and returns updated metrics
   */
  updateMetrics(updater: (metrics: RuntimeMetric[]) => RuntimeMetric[]): void;
}
