/**
 * Represents a single measured value in the workout system.
 * Provides a standardized format for all metric data with type classification,
 * numeric value, and unit information.
 */
export type MetricValue = {
  type: "repetitions" | "resistance" | "distance" | "timestamp" | "rounds" | "time" | "calories" | "action" | "effort";
  value: number | undefined;
  unit: string;
};

/**
 * Represents a compiled metric for a workout segment, including effort, 
 * value, and source information. Used to aggregate and report performance 
 * data during and after execution.
 */
export interface RuntimeMetric {
  /** Identifier for the source statement/block */
  sourceId: string;
  /** Array of metric values (reps, distance, etc.) */
  values: MetricValue[];
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
  /** Metric type */
  type: MetricValue['type'];
  /** Numeric or undefined value */
  value: number | undefined;
  /** Unit string */
  unit: string;
}
