import type { MetricOrigin } from './Metric';

/**
 * Status of a display entry in the execution lifecycle
 */
export type DisplayStatus = 'pending' | 'active' | 'completed' | 'failed' | 'skipped';

/**
 * Visual size configurations for display components
 */
export type VisualizerSize = 'compact' | 'normal' | 'focused';

/**
 * Filter configuration for metrics within display entries
 */
export interface VisualizerFilter {
  /** Only show metrics with these origins. If undefined, show all. */
  allowedOrigins?: MetricOrigin[];
  /** Hide metrics of these types (overrides allowedOrigins) */
  typeOverrides?: Record<string, boolean>;
  /** Hide specific named metrics (overrides everything) */
  nameOverrides?: Record<string, boolean>;
}
