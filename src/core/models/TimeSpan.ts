/**
 * TimeSpan represents a discrete start/stop segment of time.
 *
 * Core keeps this as a pure data shape so that `core/` never
 * needs to import runtime classes.
 */
export interface TimeSpan {
  started: number;
  ended?: number;
}

