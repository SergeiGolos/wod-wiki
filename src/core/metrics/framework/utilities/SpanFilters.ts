import { ResultSpan } from "../../../ResultSpan";
import { MetricValue } from "../../../MetricValue";
import { ISpanFilters } from "../interfaces";
import { MetricsContext, SpanFilterFn } from "../types";

/**
 * Concrete implementation of span filtering utilities.
 * Follows Single Responsibility Principle - only handles filtering logic.
 */
export class SpanFilters implements ISpanFilters {
  
  byMetricType(metricType: MetricValue['type']): SpanFilterFn {
    return (span: ResultSpan, context: MetricsContext) => {
      return span.metrics.some(metric => 
        metric.values.some(value => value.type === metricType)
      );
    };
  }
  
  byEffort(effortName: string): SpanFilterFn {
    return (span: ResultSpan, context: MetricsContext) => {
      return span.metrics.some(metric => metric.effort === effortName);
    };
  }
  
  leafSpansOnly(): SpanFilterFn {
    return (span: ResultSpan, context: MetricsContext) => {
      return span.leaf === true;
    };
  }
  
  byBlockKey(keyPattern: string | RegExp): SpanFilterFn {
    return (span: ResultSpan, context: MetricsContext) => {
      if (!span.blockKey) return false;
      
      if (typeof keyPattern === 'string') {
        return span.blockKey.includes(keyPattern);
      } else {
        return keyPattern.test(span.blockKey);
      }
    };
  }
  
  and(...filters: SpanFilterFn[]): SpanFilterFn {
    return (span: ResultSpan, context: MetricsContext) => {
      return filters.every(filter => filter(span, context));
    };
  }
  
  or(...filters: SpanFilterFn[]): SpanFilterFn {
    return (span: ResultSpan, context: MetricsContext) => {
      return filters.some(filter => filter(span, context));
    };
  }
}