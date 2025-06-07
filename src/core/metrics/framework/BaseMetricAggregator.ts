import { IMetricAggregator } from "../aggregator";
import { ISpanFilters, IMetricExtractors, ISpanCalculators, IMetricFactory } from "../interfaces";
import { MetricsContext, AggregatedMetric } from "../types";

/**
 * Base class for metric aggregators that uses composition instead of inheritance.
 * Follows Dependency Inversion Principle - depends on abstractions, not concretions.
 * Utilities are injected as dependencies for better testability and flexibility.
 */
export abstract class BaseMetricAggregator implements IMetricAggregator {
  
  protected constructor(
    public readonly id: string,
    public readonly displayName: string,
    protected readonly filters: ISpanFilters,
    protected readonly extractors: IMetricExtractors,
    protected readonly calculators: ISpanCalculators,
    protected readonly factory: IMetricFactory,
    public readonly category?: string
  ) {}
  
  /**
   * Template method that delegates to concrete implementations.
   * Subclasses implement the actual aggregation logic.
   */
  abstract aggregate(context: MetricsContext): AggregatedMetric[];
  
  /**
   * Default implementation checks if there are spans to process.
   * Subclasses can override for more specific conditions.
   */
  canProcess(context: MetricsContext): boolean {
    return context.spans.length > 0;
  }
  
  /**
   * Helper method to filter spans using the injected filters utility.
   */
  protected filterSpans(context: MetricsContext, ...filterFns: Parameters<ISpanFilters['and']>): MetricsContext['spans'] {
    const combinedFilter = this.filters.and(...filterFns);
    return context.spans.filter(span => combinedFilter(span, context));
  }
  
  /**
   * Helper method to calculate values using the injected calculators utility.
   */
  protected calculate<T>(spans: MetricsContext['spans'], context: MetricsContext, calculatorFn: (spans: MetricsContext['spans'], context: MetricsContext) => T): T {
    return calculatorFn(spans, context);
  }
}