
/**
 * Configuration for a single graph/metric to be displayed
 */
export interface AnalyticsGraphConfig {
  id: string;
  label: string;      // Display label (e.g., "Power")
  unit: string;       // Unit of measurement (e.g., "W")
  color: string;      // Color for the graph line/UI elements
  dataKey: string;    // Key in the data point object (e.g., "power")
  icon?: string;      // Icon name (optional)
}

/**
 * Grouping of analytics graphs (e.g., "Performance", "Health")
 * Currently we might just have one group or group by type
 */
export interface AnalyticsGroup {
  id: string;
  name: string;       // Display name
  icon?: string;      // Icon name
  graphs: AnalyticsGraphConfig[];
}

export interface Segment {
  id: number;
  name: string;
  type: string;
  startTime: number;
  endTime: number;
  /** Duration (Intent) - Parser-defined planned target in seconds */
  duration: number;
  /** Elapsed (Active) - pause-aware active time in seconds */
  elapsed: number;
  /** Total (Wall-clock) - total time from first start to last end in seconds */
  total: number;
  parentId: number | null;
  depth: number;
  metrics: Record<string, number>; // Dynamic metrics map (e.g., 'power': 200, 'heart_rate': 150)
  lane: number;
  /** Raw time spans from the output statement (seconds relative to workout start) */
  spans?: { started: number; ended?: number }[];
  /** Optional fragments carried from runtime spans for visualization */
  fragments?: import('./CodeFragment').ICodeFragment[];
}
