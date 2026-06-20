import type { MetricOrigin, MetricType } from '../models/Metric';
import type { TimeSpan } from '../models/CollectionSpan';

/**
 * Generic result structure for projection engine calculations.
 *
 * Provides a standardized format for all analytical projections,
 * making results self-describing and easy to consume by UI components.
 */
export interface ProjectionResult {
  /** Human-readable name of the projection (e.g., "Total Volume", "Average Power") */
  name: string;

  /** Calculated value */
  value: number;

  /** Unit of measurement (e.g., "kg", "watts", "calories") */
  unit: string;

  /** Associated metric type for UI categorization (optional) */
  metricType?: MetricType | string;

  /** Time span over which this projection was calculated */
  timeSpan: TimeSpan;

  /**
   * Origin of the projection value.
   * Defaults to 'analyzed' when not specified.
   * Use 'analyzed-estimated' when the value was computed with fallback
   * assumptions (e.g. population-average METmax when VO2max is unknown).
   */
  origin?: MetricOrigin;

  /** Optional additional metadata for the projection */
  metadata?: Record<string, any>;
}
