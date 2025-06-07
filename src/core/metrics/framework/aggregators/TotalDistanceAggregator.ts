import { BaseMetricAggregator } from "../BaseMetricAggregator";
import { MetricsContext, AggregatedMetric } from "../types";

/**
 * Sample aggregator that calculates total distance covered across all spans.
 * Demonstrates the new SOLID framework usage.
 */
export class TotalDistanceAggregator extends BaseMetricAggregator {
  
  aggregate(context: MetricsContext): AggregatedMetric[] {
    // Use the injected utilities to filter and calculate
    const spansWithDistance = this.filterSpans(
      context,
      this.filters.byMetricType('distance')
    );
    
    if (spansWithDistance.length === 0) {
      return [];
    }
    
    // Group distances by unit
    const distanceByUnit = new Map<string, number>();
    
    spansWithDistance.forEach(span => {
      span.metrics.forEach(metric => {
        const distanceValues = this.extractors.valuesByType('distance')(metric, span, context);
        distanceValues.forEach(value => {
          const currentTotal = distanceByUnit.get(value.unit) || 0;
          distanceByUnit.set(value.unit, currentTotal + value.value);
        });
      });
    });
    
    // Create the metric using the factory
    return [
      this.factory.createGrouped(
        this.id,
        this.displayName,
        distanceByUnit,
        this.category
      )
    ];
  }
  
  canProcess(context: MetricsContext): boolean {
    return super.canProcess(context) && 
           context.spans.some(span => 
             span.metrics.some(metric => 
               metric.values.some(value => value.type === 'distance')
             )
           );
  }
}