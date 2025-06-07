import { IMetricAggregationEngine, IMetricAggregatorRegistry } from "../aggregator";
import { MetricsContext, AggregatedMetric } from "../types";

/**
 * Concrete implementation of the metric aggregation engine.
 * Coordinates the aggregation process using the registry.
 */
export class MetricAggregationEngine implements IMetricAggregationEngine {
  
  constructor(private registry: IMetricAggregatorRegistry) {}
  
  aggregate(context: MetricsContext): AggregatedMetric[] {
    const compatibleAggregators = this.registry.getCompatible(context);
    const results: AggregatedMetric[] = [];
    
    for (const aggregator of compatibleAggregators) {
      try {
        const metrics = aggregator.aggregate(context);
        results.push(...metrics);
      } catch (error) {
        // Log error but continue with other aggregators
        console.warn(`Error in aggregator ${aggregator.id}:`, error);
      }
    }
    
    return results;
  }
  
  aggregateWith(context: MetricsContext, aggregatorIds: string[]): AggregatedMetric[] {
    const results: AggregatedMetric[] = [];
    
    for (const id of aggregatorIds) {
      const aggregator = this.registry.getById(id);
      if (aggregator && aggregator.canProcess(context)) {
        try {
          const metrics = aggregator.aggregate(context);
          results.push(...metrics);
        } catch (error) {
          console.warn(`Error in aggregator ${aggregator.id}:`, error);
        }
      }
    }
    
    return results;
  }
  
  getRegistry(): IMetricAggregatorRegistry {
    return this.registry;
  }
}