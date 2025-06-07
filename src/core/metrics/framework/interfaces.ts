import { ResultSpan } from "../../ResultSpan";
import { RuntimeMetric } from "../../RuntimeMetric";
import { MetricValue } from "../../MetricValue";
import { 
  MetricsContext, 
  AggregatedMetric, 
  SpanFilterFn, 
  SpanCalculatorFn, 
  MetricExtractorFn, 
  SpanGrouperFn, 
  RelationshipFinderFn 
} from "./types";

/**
 * Interface for filtering ResultSpan objects based on various criteria.
 * Follows Single Responsibility Principle - only handles filtering.
 */
export interface ISpanFilters {
  /** Filter spans that contain metrics with specific types */
  byMetricType(metricType: MetricValue['type']): SpanFilterFn;
  
  /** Filter spans that contain specific effort/exercise names */
  byEffort(effortName: string): SpanFilterFn;
  
  /** Filter spans that are leaf nodes in the execution tree */
  leafSpansOnly(): SpanFilterFn;
  
  /** Filter spans by block key patterns */
  byBlockKey(keyPattern: string | RegExp): SpanFilterFn;
  
  /** Combine multiple filters with AND logic */
  and(...filters: SpanFilterFn[]): SpanFilterFn;
  
  /** Combine multiple filters with OR logic */
  or(...filters: SpanFilterFn[]): SpanFilterFn;
}

/**
 * Interface for extracting specific metric values from spans.
 * Follows Single Responsibility Principle - only handles metric extraction.
 */
export interface IMetricExtractors {
  /** Extract all metric values of a specific type */
  valuesByType<T extends MetricValue['type']>(type: T): MetricExtractorFn<MetricValue>;
  
  /** Extract numeric values only */
  numericValues(): MetricExtractorFn<number>;
  
  /** Extract values with specific units */
  valuesByUnit(unit: string): MetricExtractorFn<MetricValue>;
  
  /** Extract effort/exercise names */
  effortNames(): MetricExtractorFn<string>;
}

/**
 * Interface for performing calculations on collections of spans.
 * Follows Single Responsibility Principle - only handles calculations.
 */
export interface ISpanCalculators {
  /** Calculate total duration across spans */
  totalDuration(): SpanCalculatorFn<number>;
  
  /** Calculate sum of numeric values */
  sum(extractor: MetricExtractorFn<number>): SpanCalculatorFn<number>;
  
  /** Calculate average of numeric values */
  average(extractor: MetricExtractorFn<number>): SpanCalculatorFn<number>;
  
  /** Calculate maximum value */
  max(extractor: MetricExtractorFn<number>): SpanCalculatorFn<number>;
  
  /** Calculate minimum value */
  min(extractor: MetricExtractorFn<number>): SpanCalculatorFn<number>;
  
  /** Count occurrences */
  count(filter?: SpanFilterFn): SpanCalculatorFn<number>;
}

/**
 * Interface for advanced metric calculations.
 * Follows Single Responsibility Principle - only handles metric math.
 */
export interface IMetricCalculators {
  /** Calculate work-to-rest ratio */
  workRestRatio(workFilter: SpanFilterFn, restFilter: SpanFilterFn): SpanCalculatorFn<number>;
  
  /** Calculate rate per unit time */
  ratePerTime(valueExtractor: MetricExtractorFn<number>, timeUnit: 'second' | 'minute' | 'hour'): SpanCalculatorFn<number>;
  
  /** Calculate compound metrics (e.g., weight * reps) */
  compound(extractor1: MetricExtractorFn<number>, extractor2: MetricExtractorFn<number>, operation: 'multiply' | 'divide' | 'add' | 'subtract'): SpanCalculatorFn<number>;
  
  /** Calculate percentiles */
  percentile(extractor: MetricExtractorFn<number>, percentile: number): SpanCalculatorFn<number>;
}

/**
 * Interface for grouping spans by various criteria.
 * Follows Single Responsibility Principle - only handles grouping.
 */
export interface ISpanGroupers {
  /** Group spans by effort/exercise */
  byEffort(): SpanGrouperFn<string>;
  
  /** Group spans by block key */
  byBlockKey(): SpanGrouperFn<string>;
  
  /** Group spans by custom key extractor */
  byCustomKey<K>(keyExtractor: (span: ResultSpan) => K): SpanGrouperFn<K>;
  
  /** Group spans by metric type presence */
  byMetricType(metricType: MetricValue['type']): SpanGrouperFn<boolean>;
  
  /** Group spans by time ranges */
  byTimeRange(rangeSize: number): SpanGrouperFn<number>;
}

/**
 * Interface for finding relationships between spans.
 * Follows Single Responsibility Principle - only handles relationships.
 */
export interface ISpanRelationships {
  /** Find parent spans */
  findParents(span: ResultSpan): RelationshipFinderFn;
  
  /** Find child spans */
  findChildren(span: ResultSpan): RelationshipFinderFn;
  
  /** Find spans with the same effort */
  findSameEffort(span: ResultSpan): RelationshipFinderFn;
  
  /** Find sequential spans (next/previous in time) */
  findSequential(span: ResultSpan, direction: 'before' | 'after' | 'both'): RelationshipFinderFn;
  
  /** Find spans within time proximity */
  findTimeProximity(span: ResultSpan, maxDistance: number): RelationshipFinderFn;
}

/**
 * Interface for creating standardized metric result objects.
 * Follows Single Responsibility Principle - only handles metric creation.
 */
export interface IMetricFactory {
  /** Create a basic aggregated metric */
  create(id: string, displayName: string, data: Record<string, any>, unit?: string, category?: string): AggregatedMetric;
  
  /** Create a metric with count data */
  createCount(id: string, displayName: string, count: number, category?: string): AggregatedMetric;
  
  /** Create a metric with total/sum data */
  createTotal(id: string, displayName: string, total: number, unit: string, category?: string): AggregatedMetric;
  
  /** Create a metric with grouped data */
  createGrouped<K>(id: string, displayName: string, groups: Map<K, any>, category?: string): AggregatedMetric;
  
  /** Create a metric with ratio data */
  createRatio(id: string, displayName: string, numerator: number, denominator: number, category?: string): AggregatedMetric;
}