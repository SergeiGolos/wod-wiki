import { MetricBehavior } from "../types/MetricBehavior";

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
  type: MetricValueType | "repetitions" | "resistance" | "distance" | "timestamp" | "rounds" | "time" | "calories" | "action" | "effort" | "heart_rate" | "cadence" | "power";
  value: number | undefined;
  unit: string;
};

/**
 * Represents a time span with start and stop times.
 * Used to track when values were recorded during workout execution.
 */
export interface TimeSpan {
  start: Date;
  stop: Date;
}

/**
 * Represents a compiled metric for a workout segment, including effort, 
 * value, and source information. Used to aggregate and report performance 
 * data during and after execution.
 * 
 * @deprecated RuntimeMetric is being phased out in favor of ICodeFragment + MetricBehavior.
 * Use FragmentMetricCollector and fragment-based analytics instead.
 * 
 * **Migration Path:**
 * - Analytics: Use `AnalysisService.runAllProjectionsFromFragments()` instead of `runAllProjections()`
 * - Collection: Use `FragmentMetricCollector` instead of `MetricCollector`
 * - Display: Use `fragmentsToDisplayMetrics()` utility for UI rendering
 * 
 * **Timeline:**
 * - Phase 2 (Current): Both paths supported, equivalence tests passing
 * - Phase 3 (Now): RuntimeMetric marked deprecated but fully functional
 * - Q2 2025: RuntimeMetric will be removed entirely
 * 
 * @see ICodeFragment for the replacement type
 * @see FragmentMetricCollector for fragment-based collection
 * @see MIGRATION_GUIDE.md for detailed migration instructions
 */
export interface RuntimeMetric {
  /** The ID of the ExerciseDefinition this metric relates to. */
  exerciseId: string;
  /** Behavior grouping that explains how this metric is intended to be used. */
  behavior?: MetricBehavior;
  /** Array of metric values (reps, distance, etc.) */
  values: MetricValue[];
  /** The time spans during which the values were recorded. */
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
