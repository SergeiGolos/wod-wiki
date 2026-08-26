/**
 * TimeSpan represents a discrete start/stop segment of time.
 *
 * Core keeps this as a pure data shape with zero runtime dependencies.
 */
export interface TimeSpan {
  started: number;
  ended?: number;
}
