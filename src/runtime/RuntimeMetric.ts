/**
 * Represents a single measured value in the workout system.
 * Provides a standardized format for all metric data with type classification,
 * numeric value, and unit information.
 */
export type MetricValue = {
  type: "repetitions" | "resistance" | "distance" | "timestamp" | "rounds";
  value: number;
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
  /** Name of the effort/exercise (if any) */
  effort: string;
  /** Array of metric values (reps, distance, etc.) */
  values: MetricValue[];
}
