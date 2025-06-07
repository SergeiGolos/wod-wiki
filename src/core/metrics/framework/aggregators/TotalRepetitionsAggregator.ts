import { BaseMetricAggregator } from "../BaseMetricAggregator";
import { MetricsContext, AggregatedMetric } from "../types";

/**
 * Sample aggregator that calculates total repetitions across all spans.
 * Demonstrates simple aggregation using the new framework.
 */
export class TotalRepetitionsAggregator extends BaseMetricAggregator {
  
  aggregate(context: MetricsContext): AggregatedMetric[] {
    // Use the injected utilities to filter and calculate
    const spansWithReps = this.filterSpans(
      context,
      this.filters.byMetricType('repetitions')
    );
    
    if (spansWithReps.length === 0) {
      return [];
    }
    
    // Calculate total repetitions using the calculator utility
    const repExtractor = this.extractors.valuesByType('repetitions');
    const numericExtractor = (metric: any, span: any, ctx: any) => {
      return repExtractor(metric, span, ctx).map(v => v.value);
    };
    
    const totalReps = this.calculate(
      spansWithReps,
      context,
      this.calculators.sum(numericExtractor)
    );
    
    // Create the metric using the factory
    return [
      this.factory.createTotal(
        this.id,
        this.displayName,
        totalReps,
        'repetitions',
        this.category
      )
    ];
  }
  
  canProcess(context: MetricsContext): boolean {
    return super.canProcess(context) && 
           context.spans.some(span => 
             span.metrics.some(metric => 
               metric.values.some(value => value.type === 'repetitions')
             )
           );
  }
}