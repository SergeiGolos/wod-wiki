
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
  duration: number;
  parentId: number | null;
  depth: number;
  metrics: Record<string, number>; // Dynamic metrics map (e.g., 'power': 200, 'heart_rate': 150)
  lane: number;
  /** Raw time spans from the output statement */
  spans?: { started: number; ended?: number }[];
  /** Relative time spans (offset from workout start) */
  relativeSpans?: { started: number; ended?: number }[];
  /** Optional fragments carried from runtime spans for visualization */
  fragments?: import('./CodeFragment').ICodeFragment[];
}
