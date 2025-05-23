import { ResultSpan } from "../ResultSpan";

/**
 * Interface for classes that aggregate statistics from ResultSpan objects.
 * Implementations will calculate specific metrics such as total repetitions,
 * total weight moved, total distance covered, etc.
 */
export interface IResultSpanAggregate {
  /**
   * Process a collection of ResultSpan objects to calculate aggregated statistics.
   * 
   * @param spans - Collection of ResultSpan objects to aggregate
   * @returns An object containing the aggregated statistics
   */
  aggregate(spans: ResultSpan[]): Record<string, any>;
  
  /**
   * Gets the unique identifier for this aggregator.
   * Used to identify the aggregator in the results.
   */
  get id(): string;
  
  /**
   * Gets the display name for this aggregator.
   * Used for display purposes in UI components.
   */
  get displayName(): string;
}