import { MetricBehavior } from "../../types/MetricBehavior";

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
 * This is the canonical definition used throughout the codebase.
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

export interface TimeSpan {
  start: Date;
  stop: Date;
}

/**
 * Composite metric object returned by compilers.
 */
export interface RuntimeMetric {
  exerciseId: string;
  sourceId?: string;
  behavior: MetricBehavior;
  values: MetricValue[];
  timeSpans: TimeSpan[];
}


/**
 * Flattened metric entry stored in memory so UI/debuggers can see per-value metrics
 * without needing to parse composite RuntimeMetric objects.
 */
export interface MetricEntry {
  /** Identifier for the originating statement/fragment */
  sourceId: string;
  /** Runtime block id that owns this metric entry */
  blockId: string;
  /** Behavior grouping carried from the parent RuntimeMetric */
  behavior?: MetricBehavior;
  /** Metric type */
  type: MetricValue['type'];
  /** Numeric or undefined value */
  value: number | undefined;
  /** Unit string */
  unit: string;
}
