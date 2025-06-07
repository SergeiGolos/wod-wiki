import { IMetricAggregationEngine } from '../framework/aggregator';
import { MetricsContext, AggregatedMetric } from '../framework/types';
import { ResultSpan } from '../../ResultSpan';
import { ResultSpanBuilder } from '../ResultSpanBuilder';

/**
 * Adapter that integrates the new SOLID metrics framework with the existing ResultSpanBuilder.
 * This enables gradual migration and backwards compatibility.
 */
export class MetricsIntegrationAdapter {
  
  constructor(
    private aggregationEngine: IMetricAggregationEngine
  ) {}
  
  /**
   * Process spans from a ResultSpanBuilder using the new framework.
   * This allows the runtime system to leverage the new aggregation capabilities
   * without changing the existing ResultSpanBuilder usage.
   */
  public processSpansFromBuilder(builder: ResultSpanBuilder): AggregatedMetric[] {
    const spans = builder.Build();
    const resultSpans = spans.map(span => new ResultSpan(span));
    
    const context: MetricsContext = {
      spans: resultSpans,
      metadata: {
        source: 'ResultSpanBuilder',
        timestamp: new Date().toISOString()
      }
    };
    
    return this.aggregationEngine.aggregate(context);
  }
  
  /**
   * Process spans directly using the new framework.
   */
  public processSpans(spans: ResultSpan[], sourceNodes?: any[]): AggregatedMetric[] {
    const context: MetricsContext = {
      spans,
      sourceNodes,
      metadata: {
        source: 'direct',
        timestamp: new Date().toISOString()
      }
    };
    
    return this.aggregationEngine.aggregate(context);
  }
  
  /**
   * Convert new framework results to legacy format for backwards compatibility.
   */
  public toLegacyFormat(metrics: AggregatedMetric[]): Record<string, any> {
    const results: Record<string, any> = {};
    
    metrics.forEach(metric => {
      results[metric.id] = {
        displayName: metric.displayName,
        data: metric.data,
        unit: metric.unit,
        category: metric.category
      };
    });
    
    return results;
  }
  
  /**
   * Helper method to demonstrate integration with TimerRuntime.
   * This shows how the runtime could optionally use the new framework.
   */
  public static createForRuntime(): MetricsIntegrationAdapter {
    // This would typically be injected or configured
    const { MetricsFrameworkFactory } = require('../framework');
    const framework = MetricsFrameworkFactory.createDefault();
    
    return new MetricsIntegrationAdapter(framework.engine);
  }
}