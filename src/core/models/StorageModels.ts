import { ExecutionSpan } from '../../runtime/models/ExecutionSpan';

/**
 * Represents the outcome of running a workout.
 */
export interface WodResult {
  id: string;              // UUID
  documentId: string;      // Reference to the WodDocument (if saved)
  documentTitle: string;   // Snapshot of title in case doc is deleted
  timestamp: number;       // When the workout finished
  duration: number;        // Total milliseconds
  logs: ExecutionSpan[];   // The detailed runtime logs (splits, reps)
  metadata: {
    user?: string;
    notes?: string;
  };
  schemaVersion: number;
}

/**
 * Metadata for listing results without loading full logs.
 */
export type WodResultMetadata = Omit<WodResult, 'logs'>;
