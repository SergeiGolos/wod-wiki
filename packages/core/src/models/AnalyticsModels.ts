import type { MetricContainer } from './MetricContainer';

/**
 * Configuration for a single graph/metric to be displayed
 */
export interface AnalyticsGraphConfig {
  id: string;
  label: string;
  unit: string;
  color: string;
  dataKey: string;
  icon?: string;
}

/**
 * Grouping of analytics graphs
 */
export interface AnalyticsGroup {
  id: string;
  name: string;
  icon?: string;
  graphs: AnalyticsGraphConfig[];
}

export interface Segment {
  id: number;
  name: string;
  type: string;
  startTime: number;
  endTime: number;
  /** Wall-clock start time in milliseconds since epoch */
  absoluteStartTime?: number;
  /** Duration (Intent) - Parser-defined planned target in seconds */
  duration?: number;
  /** Elapsed (Active) - pause-aware active time in seconds */
  elapsed: number;
  /** Total (Wall-clock) - total time from first start to last end in seconds */
  total: number;
  parentId: number | null;
  depth: number;
  metric: Record<string, number>;
  lane: number;
  /** Raw time spans from the output statement (seconds relative to workout start) */
  spans?: { started: number; ended?: number }[];
  /** Optional metrics carried from runtime spans for visualization */
  metrics?: MetricContainer;
}
