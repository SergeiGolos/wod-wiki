import { ResultSpan } from "../../../ResultSpan";
import { ISpanCalculators } from "../interfaces";
import { MetricsContext, SpanCalculatorFn, MetricExtractorFn, SpanFilterFn } from "../types";

/**
 * Concrete implementation of span calculation utilities.
 * Follows Single Responsibility Principle - only handles calculations.
 */
export class SpanCalculators implements ISpanCalculators {
  
  totalDuration(): SpanCalculatorFn<number> {
    return (spans: ResultSpan[], context: MetricsContext) => {
      return spans.reduce((total, span) => {
        if (span.timeSpans && span.timeSpans.length > 0) {
          const firstTimeSpan = span.timeSpans[0];
          if (firstTimeSpan.start && firstTimeSpan.stop) {
            const duration = firstTimeSpan.stop.timestamp.getTime() - firstTimeSpan.start.timestamp.getTime();
            return total + duration;
          }
        }
        return total;
      }, 0);
    };
  }
  
  sum(extractor: MetricExtractorFn<number>): SpanCalculatorFn<number> {
    return (spans: ResultSpan[], context: MetricsContext) => {
      let total = 0;
      spans.forEach(span => {
        span.metrics.forEach(metric => {
          const values = extractor(metric, span, context);
          total += values.reduce((sum, value) => sum + value, 0);
        });
      });
      return total;
    };
  }
  
  average(extractor: MetricExtractorFn<number>): SpanCalculatorFn<number> {
    return (spans: ResultSpan[], context: MetricsContext) => {
      const values: number[] = [];
      spans.forEach(span => {
        span.metrics.forEach(metric => {
          const metricValues = extractor(metric, span, context);
          values.push(...metricValues);
        });
      });
      return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    };
  }
  
  max(extractor: MetricExtractorFn<number>): SpanCalculatorFn<number> {
    return (spans: ResultSpan[], context: MetricsContext) => {
      let maxValue = Number.NEGATIVE_INFINITY;
      spans.forEach(span => {
        span.metrics.forEach(metric => {
          const values = extractor(metric, span, context);
          values.forEach(value => {
            maxValue = Math.max(maxValue, value);
          });
        });
      });
      return maxValue === Number.NEGATIVE_INFINITY ? 0 : maxValue;
    };
  }
  
  min(extractor: MetricExtractorFn<number>): SpanCalculatorFn<number> {
    return (spans: ResultSpan[], context: MetricsContext) => {
      let minValue = Number.POSITIVE_INFINITY;
      spans.forEach(span => {
        span.metrics.forEach(metric => {
          const values = extractor(metric, span, context);
          values.forEach(value => {
            minValue = Math.min(minValue, value);
          });
        });
      });
      return minValue === Number.POSITIVE_INFINITY ? 0 : minValue;
    };
  }
  
  count(filter?: SpanFilterFn): SpanCalculatorFn<number> {
    return (spans: ResultSpan[], context: MetricsContext) => {
      if (!filter) {
        return spans.length;
      }
      return spans.filter(span => filter(span, context)).length;
    };
  }
}