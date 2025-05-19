import { RuntimeMetric } from "../RuntimeMetric";

/**
 * Container class for metrics operations
 * Manages metrics storage, updates, and parent-child relationships
 */
export class MetricsContext {
  private metrics: RuntimeMetric[] = [];
  private parent?: MetricsContext;

  /**
   * Create a new MetricsContext
   * @param parent Optional parent context to inherit metrics from
   */
  constructor(parent?: MetricsContext) {
    this.parent = parent;
  }

  /**
   * Add metrics to the context
   * @param metrics Metrics to add
   */
  public addMetrics(metrics: RuntimeMetric[]): void {
    if (!metrics || metrics.length === 0) {
      return;
    }

    // Merge new metrics with existing ones
    this.metrics = this.mergeMetrics(this.metrics, metrics);
  }

  /**
   * Update existing metrics by sourceId
   * @param sourceId Source ID to update metrics for
   * @param updater Function to update the metric
   */
  public updateMetricsBySourceId(sourceId: string, updater: (metric: RuntimeMetric) => void): void {
    const matchingMetrics = this.metrics.filter(m => m.sourceId === sourceId);
    
    if (matchingMetrics.length > 0) {
      matchingMetrics.forEach(updater);
    }
  }

  /**
   * Update all metrics in this context
   * @param updater Function that takes current metrics and returns updated metrics
   */
  public updateMetrics(updater: (metrics: RuntimeMetric[]) => RuntimeMetric[]): void {
    this.metrics = updater([...this.metrics]);
  }

  /**
   * Get metrics by source ID
   * @param sourceId The source ID to get metrics for
   * @returns Array of metrics with matching source ID
   */
  public getMetricsBySourceId(sourceId: string): RuntimeMetric[] {
    return this.metrics.filter(m => m.sourceId === sourceId);
  }

  /**
   * Get all metrics in this context
   * @param includeParent Whether to include metrics from parent context
   * @returns Array of all metrics
   */
  public getAllMetrics(includeParent: boolean = false): RuntimeMetric[] {
    if (!includeParent || !this.parent) {
      return [...this.metrics];
    }

    const parentMetrics = this.parent.getAllMetrics(true);
    return this.mergeMetrics(this.metrics, parentMetrics, true);
  }

  /**
   * Create a child context that inherits from this context
   * @returns A new MetricsContext with this context as parent
   */
  public createChildContext(): MetricsContext {
    return new MetricsContext(this);
  }

  /**
   * Merges two sets of metrics, with options to handle conflicts
   * @param targetMetrics The target metrics that will receive new metrics
   * @param sourceMetrics The source metrics to merge in
   * @param onlyIfMissing If true, only add metrics that don't already exist in target
   * @returns A new array containing the merged metrics
   */
  private mergeMetrics(
    targetMetrics: RuntimeMetric[],
    sourceMetrics: RuntimeMetric[],
    onlyIfMissing: boolean = false
  ): RuntimeMetric[] {
    const result = [...targetMetrics];
    
    for (const sourceMetric of sourceMetrics) {
      const existingIndex = result.findIndex(m => m.effort === sourceMetric.effort);
      
      if (existingIndex >= 0) {
        if (!onlyIfMissing) {
          // Merge values from source into existing metric
          const existing = result[existingIndex];
          const newValues = sourceMetric.values.filter(sv => 
            !existing.values.some(ev => ev.type === sv.type)
          );
          existing.values.push(...newValues);
        }
      } else {
        // Add the entire source metric if it doesn't exist in target
        result.push({...sourceMetric});
      }
    }
    
    return result;
  }
}
