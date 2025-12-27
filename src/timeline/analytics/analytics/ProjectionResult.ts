import type { TimeSpan } from '../../../core/models/CollectionSpan';

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
  
  /** Time span over which this projection was calculated */
  timeSpan: TimeSpan;
  
  /** Optional additional metadata for the projection */
  metadata?: Record<string, any>;
}
