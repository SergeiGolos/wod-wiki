import { MetricsContext, AggregatedMetric } from "./types";

/**
 * Modern interface for metric aggregators using the new SOLID framework.
 * Each aggregator can return zero or more metrics and has access to the full context.
 */
export interface IMetricAggregator {
  /** Unique identifier for this aggregator */
  readonly id: string;
  
  /** Human-readable display name */
  readonly displayName: string;
  
  /** Optional category for grouping related aggregators */
  readonly category?: string;
  
  /** 
   * Process the metrics context to generate aggregated metrics.
   * Can return zero or more metrics.
   */
  aggregate(context: MetricsContext): AggregatedMetric[];
  
  /** 
   * Check if this aggregator can process the given context.
   * Useful for conditional aggregators.
   */
  canProcess(context: MetricsContext): boolean;
}

/**
 * Registry interface for managing metric aggregator discovery and registration.
 * Follows Open/Closed Principle - open for extension via registration.
 */
export interface IMetricAggregatorRegistry {
  /** Register a new aggregator */
  register(aggregator: IMetricAggregator): void;
  
  /** Unregister an aggregator by ID */
  unregister(id: string): void;
  
  /** Get all registered aggregators */
  getAll(): IMetricAggregator[];
  
  /** Get aggregators by category */
  getByCategory(category: string): IMetricAggregator[];
  
  /** Get a specific aggregator by ID */
  getById(id: string): IMetricAggregator | undefined;
  
  /** Get aggregators that can process the given context */
  getCompatible(context: MetricsContext): IMetricAggregator[];
  
  /** Clear all registered aggregators */
  clear(): void;
}

/**
 * Main aggregation engine interface that coordinates the aggregation process.
 */
export interface IMetricAggregationEngine {
  /** Process a metrics context using all applicable aggregators */
  aggregate(context: MetricsContext): AggregatedMetric[];
  
  /** Process using only specific aggregators */
  aggregateWith(context: MetricsContext, aggregatorIds: string[]): AggregatedMetric[];
  
  /** Get the underlying registry for management operations */
  getRegistry(): IMetricAggregatorRegistry;
}