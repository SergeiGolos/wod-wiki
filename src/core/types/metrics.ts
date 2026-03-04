/**
 * Fragment types for WOD Wiki
 * 
 * Type definitions for metric visualization and manipulation.
 * 
 * Note: MetricTypeString and FragmentColorMap have been moved to
 * src/views/runtime/metricColorMap.ts as the canonical source.
 */

import type { IMetric } from './core';

/**
 * Parse error for metric visualization
 */
export interface ParseError {
  /** Human-readable error message */
  message: string;
  
  /** Optional line number where error occurred */
  line?: number;
  
  /** Optional column position where error occurred */
  column?: number;
  
  /** Optional code excerpt showing error context */
  excerpt?: string;
}

/**
 * Props for the MetricVisualizer component
 */
export interface MetricVisualizerProps {
  /** Array of metric to visualize, grouped by type */
  metrics: IMetric[];
  
  /** Optional error state to display instead of metric */
  error?: ParseError | null;
  
  /** Optional className for container styling */
  className?: string;
}

/**
 * Re-export CodeMetadata for convenience
 */
export type { CodeMetadata } from './core';

/**
 * Re-export IMetric for convenience
 */
export type { IMetric } from './core';
