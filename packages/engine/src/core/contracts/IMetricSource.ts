import { MetricType, IMetric, MetricOrigin } from '../models/Metric';

/**
 * Filter configuration for metric retrieval.
 */
export interface MetricFilter {
    /** Only include metric with these origins */
    origins?: MetricOrigin[];
    /** Only include these metric types */
    types?: MetricType[];
    /** Exclude these metric types */
    excludeTypes?: MetricType[];
}

/**
 * Unified contract for any data object that provides displayable metric.
 *
 * Implemented by CodeStatement, OutputStatement, and DisplayMetricMemory.
 * Consumed directly by UI components — no IDisplayItem adapter layer.
 *
 * All metric access goes through this interface, ensuring:
 * 1. Consistent precedence resolution
 * 2. Multi-metric-per-type support
 * 3. Origin-aware filtering
 * 4. Source-type-agnostic UI rendering
 */
export interface IMetricSource {
    /**
     * Unique identifier for React keys and tracking.
     */
    readonly id: string | number;

    /**
     * Get the "display-ready" metric after precedence resolution.
     *
     * For each MetricType present, returns metric from the highest-
     * precedence origin tier. Multiple metric of the same type within
     * the winning tier are preserved (e.g., 3 rep metric for 21-15-9).
     *
     * @param filter Optional filter to restrict which metric are returned
     */
    getDisplayMetrics(filter?: MetricFilter): IMetric[];

    /**
     * Get the highest-precedence single metric of a given type.
     *
     * Precedence order: user > runtime > compiler > parser
     *
     * @param type The metric type to look up
     * @returns The winning metric, or undefined if none exist
     */
    getMetric(type: MetricType): IMetric | undefined;

    /**
     * Get ALL metric of a given type, ordered by precedence (highest first).
     *
     * Use when multiple metric of the same type are meaningful
     * (e.g., rep scheme 21-15-9, multiple actions in a complex).
     */
    getAllMetricsByType(type: MetricType): IMetric[];

    /**
     * Check if any metric of this type exists (at any precedence level).
     */
    hasMetric(type: MetricType): boolean;

    /**
     * Access the raw, unfiltered metric for debugging or advanced use.
     * No precedence resolution applied.
     */
    readonly rawMetrics: IMetric[];
}
