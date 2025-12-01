import { ScriptRuntime } from '../runtime/ScriptRuntime';
import { AnalyticsGroup, AnalyticsGraphConfig, Segment } from '../core/models/AnalyticsModels';
import { hashCode } from '../lib/utils';

// --- Analytics Data Transformation ---
export const transformRuntimeToAnalytics = (runtime: ScriptRuntime | null): { data: any[], segments: Segment[], groups: AnalyticsGroup[] } => {
  if (!runtime) return { data: [], segments: [], groups: [] };

  const segments: Segment[] = [];
  const data: any[] = [];

  // 1. Convert ExecutionRecords to Segments
  // We need to establish a timeline.
  // If the workout hasn't started, return empty.
  if (runtime.executionLog.length === 0 && runtime.stack.blocks.length === 0) {
    return { data: [], segments: [], groups: [] };
  }

  // Combine completed log and active stack
  const allRecords = [
    ...runtime.executionLog,
    ...runtime.stack.blocks.map((b, i) => ({
      id: b.key.toString(),
      label: b.label || b.blockType || 'Block',
      type: b.blockType || 'unknown',
      startTime: Date.now(), // This is tricky for active blocks without stored start time
      endTime: undefined,
      parentId: i > 0 ? runtime.stack.blocks[i-1].key.toString() : null,
      depth: i,
      metrics: []
    }))
  ];

  // We need a consistent start time for the timeline
  // Find the earliest start time
  let workoutStartTime = Date.now();
  if (runtime.executionLog.length > 0) {
    workoutStartTime = Math.min(...runtime.executionLog.map(r => r.startTime));
  }

  // Sort by start time
  allRecords.sort((a, b) => a.startTime - b.startTime);

  // Map IDs to depth for hierarchy
  const idToDepth = new Map<string, number>();

  allRecords.forEach(record => {
    // Calculate depth
    let depth = 0;
    // For active blocks, we might have parentId from stack structure
    // For log records, we have parentId
    if (record.parentId && idToDepth.has(record.parentId)) {
      depth = (idToDepth.get(record.parentId) || 0) + 1;
    }
    idToDepth.set(record.id, depth);

    // Calculate duration
    const endTime = record.endTime || Date.now();
    const duration = (endTime - record.startTime) / 1000;

    // Extract metrics dynamically
    const metrics: Record<string, number> = {};

    if (record.metrics) {
      record.metrics.forEach(m => {
        m.values.forEach(v => {
          if (v.value !== undefined) {
            // Use the metric type as the key (e.g., 'power', 'heart_rate', 'cadence')
            // If multiple values of same type exist, we currently overwrite (could average instead)
            metrics[v.type] = v.value;
          }
        });
      });
    }

    segments.push({
      id: hashCode(record.id), // Use hash for numeric ID required by Segment interface
      name: record.label,
      type: record.type,
      startTime: (record.startTime - workoutStartTime) / 1000,
      endTime: (endTime - workoutStartTime) / 1000,
      duration: duration,
      parentId: record.parentId ? hashCode(record.parentId) : null,
      depth: depth,
      metrics: metrics,
      lane: depth
    });
  });

  // 2. Generate Time Series Data
  // In a real app, this would come from a continuous telemetry log.
  // Here we synthesize it based on the active segments at each second.
  const totalDuration = segments.length > 0
    ? Math.max(...segments.map(s => s.endTime))
    : 0;

  // Identify all unique metric keys present in the segments to generate data for
  const availableMetricKeys = new Set<string>();
  segments.forEach(s => Object.keys(s.metrics).forEach(k => availableMetricKeys.add(k)));

  // Ensure we always have at least basic metrics for the graph if nothing else
  if (availableMetricKeys.size === 0) {
    availableMetricKeys.add('power');
    availableMetricKeys.add('heart_rate');
  }

  for (let t = 0; t <= totalDuration; t++) {
    // Find active segments at this second
    const activeSegs = segments.filter(s => t >= s.startTime && t <= s.endTime);

    const dataPoint: any = { time: t };

    // For each available metric, calculate a value for this time point
    availableMetricKeys.forEach(key => {
      // Look for a segment that has this metric
      const segWithMetric = activeSegs.find(s => s.metrics[key] !== undefined);

      if (segWithMetric) {
        // Use the segment's average value + some noise
        const baseVal = segWithMetric.metrics[key];
        // Add 5% noise
        dataPoint[key] = Math.max(0, Math.round(baseVal + (Math.random() - 0.5) * (baseVal * 0.1)));
      } else {
        // Fallback/Default behavior if metric is missing in current segment but exists globally
        // e.g. Rest periods might drop power to 0 but keep HR high
        if (key === 'power' || key === 'resistance') {
          dataPoint[key] = 0;
        } else if (key === 'heart_rate') {
          // Decay HR if not specified
          const prevHr = data.length > 0 ? data[data.length - 1].heart_rate : 100;
          dataPoint[key] = Math.max(60, Math.round(prevHr * 0.99));
        } else {
          dataPoint[key] = 0;
        }
      }
    });

    // Ensure standard keys exist for TimelineView if they were added to availableMetricKeys
    // (TimelineView likely expects specific keys, or we need to update it too.
    // Assuming TimelineView is generic or we map 'power'/'hr' correctly)

    data.push(dataPoint);
  }

  // 3. Generate Analytics Configuration
  // Scan segments for available metrics and create groups
  const groups: AnalyticsGroup[] = [];

  // Define standard metric configs
  const standardMetrics: Record<string, AnalyticsGraphConfig> = {
    'power': { id: 'power', label: 'Power', unit: 'W', color: '#8b5cf6', dataKey: 'power', icon: 'Zap' },
    'heart_rate': { id: 'heart_rate', label: 'Heart Rate', unit: 'bpm', color: '#ef4444', dataKey: 'heart_rate', icon: 'Activity' },
    'cadence': { id: 'cadence', label: 'Cadence', unit: 'rpm', color: '#3b82f6', dataKey: 'cadence', icon: 'Wind' },
    'speed': { id: 'speed', label: 'Speed', unit: 'km/h', color: '#10b981', dataKey: 'speed', icon: 'Gauge' },
    'resistance': { id: 'resistance', label: 'Resistance', unit: 'kg', color: '#f59e0b', dataKey: 'resistance', icon: 'Dumbbell' },
  };

  // Create a "Performance" group for found metrics
  const performanceGraphs: AnalyticsGraphConfig[] = [];

  availableMetricKeys.forEach(key => {
    if (standardMetrics[key]) {
      performanceGraphs.push(standardMetrics[key]);
    } else {
      // Generic fallback for unknown metrics
      performanceGraphs.push({
        id: key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        unit: '',
        color: '#888888',
        dataKey: key
      });
    }
  });

  if (performanceGraphs.length > 0) {
    groups.push({
      id: 'performance',
      name: 'Performance',
      graphs: performanceGraphs
    });
  }

  return { data, segments, groups };
};
