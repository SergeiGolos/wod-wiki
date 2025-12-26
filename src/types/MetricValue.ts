/**
 * Canonical MetricValue type definition.
 * 
 * This is the single source of truth for metric value types in the WOD Wiki system.
 * All other MetricValue definitions are deprecated and will be removed in Phase 3.
 * 
 * @see RuntimeMetric.ts for usage in RuntimeMetric interface
 */

/**
 * Enum of all supported metric value types in the system.
 * Provides type safety and autocompletion for metric type fields.
 */
export enum MetricValueType {
  Repetitions = 'repetitions',
  Resistance = 'resistance',
  Distance = 'distance',
  Timestamp = 'timestamp',
  Rounds = 'rounds',
  Time = 'time',
  Calories = 'calories',
  Action = 'action',
  Effort = 'effort',
  HeartRate = 'heart_rate',
  Cadence = 'cadence',
  Power = 'power',
}

/**
 * Represents a single measured value in the workout system.
 * Provides a standardized format for all metric data with type classification,
 * numeric value, and unit information.
 * 
 * This is the canonical definition. Use this type for all new code.
 * 
 * @example
 * ```typescript
 * const repMetric: MetricValue = {
 *   type: MetricValueType.Repetitions,
 *   value: 10,
 *   unit: 'reps'
 * };
 * ```
 */
export type MetricValue = {
  type: MetricValueType;
  value: number | undefined;
  unit: string;
};
