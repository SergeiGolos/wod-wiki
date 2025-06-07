import { ResultSpan } from "../../ResultSpan";
import { RuntimeMetric } from "../../RuntimeMetric";
import { MetricValue } from "../../MetricValue";
import { IRuntimeBlock } from "../../IRuntimeBlock";

/**
 * Context information available to metric aggregators and utilities.
 * Provides access to the full ResultSpan stack and source nodes.
 */
export interface MetricsContext {
  /** The collection of ResultSpan objects to aggregate */
  spans: ResultSpan[];
  /** Source runtime blocks that generated the spans */
  sourceNodes?: IRuntimeBlock[];
  /** Additional metadata that can be used by aggregators */
  metadata?: Record<string, any>;
}

/**
 * Represents a single aggregated metric result.
 */
export interface AggregatedMetric {
  /** Unique identifier for this metric */
  id: string;
  /** Human-readable display name */
  displayName: string;
  /** The calculated metric data */
  data: Record<string, any>;
  /** Optional unit information */
  unit?: string;
  /** Optional category for grouping related metrics */
  category?: string;
}

/**
 * Filter function type for selecting spans based on criteria.
 */
export type SpanFilterFn = (span: ResultSpan, context: MetricsContext) => boolean;

/**
 * Calculation function type for computing values from spans.
 */
export type SpanCalculatorFn<T> = (spans: ResultSpan[], context: MetricsContext) => T;

/**
 * Extractor function type for pulling specific metric values from spans.
 */
export type MetricExtractorFn<T> = (metric: RuntimeMetric, span: ResultSpan, context: MetricsContext) => T[];

/**
 * Grouping function type for organizing spans by keys.
 */
export type SpanGrouperFn<K> = (span: ResultSpan, context: MetricsContext) => K;

/**
 * Relationship finder function type for finding related spans.
 */
export type RelationshipFinderFn = (span: ResultSpan, allSpans: ResultSpan[], context: MetricsContext) => ResultSpan[];