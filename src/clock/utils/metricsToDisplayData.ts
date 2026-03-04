/**
 * Fragment to Display Metric Converter
 * 
 * Transforms IMetric arrays into IDisplayMetric format for the Clock UI,
 * allowing the UI to work directly with metric.
 * 
 * Part of Phase 1 metrics consolidation: Fragment-based architecture.
 */

import { IMetric, MetricType } from '../../core/models/Metric';
import { IDisplayMetric } from '../types/DisplayTypes';
import { MetricBehavior } from '../../types/MetricBehavior';

/**
 * Convert a single IMetric to IDisplayMetric for display rendering.
 * 
 * @param metric The code metric to convert
 * @returns IDisplayMetric for UI rendering
 */
export function metricToDisplayData(metric: IMetric): IDisplayMetric {
  // Use the metric's image if available, otherwise construct from value and type
  const displayImage = metric.image || formatFragmentValue(metric);

  return {
    type: metric.metricType,
    value: metric.value as string | number,
    image: displayImage,
    unit: getFragmentUnit(metric),
    isActive: metric.origin === 'tracked',
  };
}

/**
 * Convert an array of IMetric to IDisplayMetric[] for display rendering.
 * Optionally filter by behavior (e.g., only show Collected or Recorded metrics).
 * 
 * @param metrics Array of code metrics (can be flat or nested)
 * @param behaviorFilter Optional filter to include only specific behaviors
 * @returns Array of display metrics
 * 
 * @example
 * ```typescript
 * // Get all collected and recorded metrics for display
 * const displayMetrics = metricsToDisplayData(
 *   block.metrics,
 *   [MetricBehavior.Collected, MetricBehavior.Recorded]
 * );
 * ```
 */
export function metricsToDisplayData(
  metrics: IMetric[] | IMetric[][],
  behaviorFilter?: MetricBehavior[]
): IDisplayMetric[] {
  // Flatten if nested
  const flat = Array.isArray(metrics[0])
    ? (metrics as IMetric[][]).flat()
    : (metrics as IMetric[]);

  // Filter by behavior if specified
  let filtered = flat;
  if (behaviorFilter && behaviorFilter.length > 0) {
    filtered = flat.filter(f =>
      f.behavior && behaviorFilter.includes(f.behavior)
    );
  }

  // Convert to display metrics
  return filtered.map(metricToDisplayData);
}

/**
 * Get displayable metrics from metrics, excluding script-defined values.
 * This is useful for showing only user-collected or runtime-recorded metrics.
 * 
 * @param metrics Array of code metrics
 * @returns Display metrics for collected/recorded values only
 */
export function getCollectedDisplayMetrics(
  metrics: IMetric[] | IMetric[][]
): IDisplayMetric[] {
  return metricsToDisplayData(metrics, [
    MetricBehavior.Collected,
    MetricBehavior.Recorded,
  ]);
}

/**
 * Format a metrics's value for display.
 * Handles different metrics types appropriately.
 * 
 * @param metrics The metrics to format
 * @returns Formatted string value
 */
function formatFragmentValue(metric: IMetric): string {
  if (metric.value === undefined || metric.value === null) {
    return '';
  }

  const value = metric.value;

  // Handle different metric types
  switch (metric.metricType) {
    case MetricType.Duration:
    case MetricType.Duration:
    case MetricType.Elapsed:
    case MetricType.Total:
      // Format time values (assume milliseconds)
      if (typeof value === 'number') {
        return formatDuration(value);
      }
      return String(value);

    case MetricType.Spans:
      // Display span count or use image
      return metric.image || `${Array.isArray(value) ? value.length : 0} spans`;

    case MetricType.SystemTime:
      // Display ISO timestamp
      return value instanceof Date ? value.toISOString() : String(value);

    case MetricType.Rep:
      return `${value} reps`;

    case MetricType.Resistance:
      return `${value}`;

    case MetricType.Distance:
      return `${value}`;

    case MetricType.Rounds:
      return `Round ${value}`;

    case MetricType.Effort:
    case MetricType.Action:
      return String(value);

    default:
      return String(value);
  }
}

/**
 * Get the unit string for a metric based on its type.
 * 
 * @param metric The metric
 * @returns Unit string or empty string
 */
function getFragmentUnit(metric: IMetric): string | undefined {
  switch (metric.metricType) {
    case MetricType.Rep:
      return 'reps';
    case MetricType.Resistance:
      return 'lbs'; // Default, should ideally come from metric metadata
    case MetricType.Distance:
      return 'm';
    case MetricType.Rounds:
      return 'rounds';
    case MetricType.Duration:
    case MetricType.Duration:
    case MetricType.Elapsed:
    case MetricType.Total:
      return 'ms';
    default:
      return undefined;
  }
}

/**
 * Format a duration in milliseconds to MM:SS or HH:MM:SS format.
 * 
 * @param ms Duration in milliseconds
 * @returns Formatted time string
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
