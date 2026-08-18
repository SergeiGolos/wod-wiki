/**
 * Runtime error information.
 * Captured errors are stored in the runtime's error list for centralized handling.
 */
export interface RuntimeError {
  /** The error that occurred */
  error: Error;
  /** Where the error occurred (block ID, handler ID, etc.) */
  source: string;
  /** When the error occurred */
  timestamp: Date;
  /** Additional context about the error */
  context?: unknown;

  blockKey?: string;
}
