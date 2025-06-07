import { ResultSpan } from "../../../ResultSpan";
import { RuntimeMetric } from "../../../RuntimeMetric";
import { MetricValue } from "../../../MetricValue";
import { IMetricExtractors } from "../interfaces";
import { MetricsContext, MetricExtractorFn } from "../types";

/**
 * Concrete implementation of metric extraction utilities.
 * Follows Single Responsibility Principle - only handles metric extraction.
 */
export class MetricExtractors implements IMetricExtractors {
  
  valuesByType<T extends MetricValue['type']>(type: T): MetricExtractorFn<MetricValue> {
    return (metric: RuntimeMetric, span: ResultSpan, context: MetricsContext) => {
      return metric.values.filter(value => value.type === type);
    };
  }
  
  numericValues(): MetricExtractorFn<number> {
    return (metric: RuntimeMetric, span: ResultSpan, context: MetricsContext) => {
      return metric.values.map(value => value.value);
    };
  }
  
  valuesByUnit(unit: string): MetricExtractorFn<MetricValue> {
    return (metric: RuntimeMetric, span: ResultSpan, context: MetricsContext) => {
      return metric.values.filter(value => value.unit === unit);
    };
  }
  
  effortNames(): MetricExtractorFn<string> {
    return (metric: RuntimeMetric, span: ResultSpan, context: MetricsContext) => {
      return [metric.effort];
    };
  }
}