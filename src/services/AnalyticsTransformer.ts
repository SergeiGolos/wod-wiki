import { ScriptRuntime } from '../runtime/ScriptRuntime';
import { AnalyticsGroup, AnalyticsGraphConfig, Segment } from '../core/models/AnalyticsModels';
import { hashCode } from '../lib/utils';
import { TrackedSpan, SpanMetrics, DebugMetadata } from '../runtime/models/ExecutionSpan';
import { spanMetricsToFragments } from '../runtime/utils/metricsToFragments';

/**
 * Format a metric key into a human-readable label.
 * Capitalizes the first letter and replaces underscores with spaces.
 * 
 * @param key The metric key (e.g., 'heart_rate')
 * @returns Formatted label (e.g., 'Heart rate')
 */
function formatMetricLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
}

/**
 * Extract numeric metrics from SpanMetrics object into a Record<string, number>
 */
function extractMetricsFromSpanMetrics(spanMetrics: SpanMetrics | undefined): Record<string, number> {
  const metrics: Record<string, number> = {};

  if (!spanMetrics) return metrics;

  // Extract typed metrics
  if (spanMetrics.reps?.value !== undefined) {
    metrics['repetitions'] = spanMetrics.reps.value;
  }
  if (spanMetrics.weight?.value !== undefined) {
    metrics['resistance'] = spanMetrics.weight.value;
  }
  if (spanMetrics.distance?.value !== undefined) {
    metrics['distance'] = spanMetrics.distance.value;
  }
  if (spanMetrics.duration?.value !== undefined) {
    metrics['time'] = spanMetrics.duration.value;
  }
  if (spanMetrics.calories?.value !== undefined) {
    metrics['calories'] = spanMetrics.calories.value;
  }
  if (spanMetrics.heartRate?.value !== undefined) {
    metrics['heart_rate'] = spanMetrics.heartRate.value;
  }
  if (spanMetrics.power?.value !== undefined) {
    metrics['power'] = spanMetrics.power.value;
  }
  if (spanMetrics.cadence?.value !== undefined) {
    metrics['cadence'] = spanMetrics.cadence.value;
  }
  if (spanMetrics.currentRound !== undefined) {
    metrics['rounds'] = spanMetrics.currentRound;
  }

  // Extract legacy metrics if present
  if (spanMetrics.legacyMetrics) {
    spanMetrics.legacyMetrics.forEach(m => {
      m.values.forEach(v => {
        if (v.value !== undefined) {
          metrics[v.type] = v.value;
        }
      });
    });
  }

  return metrics;
}

// ============================================================================
// AnalyticsTransformer Class
// ============================================================================

/**
 * Extended Segment interface that includes debug metadata from TrackedSpan.
 * This is the UI-ready segment format that includes contextual information.
 */
export interface SegmentWithMetadata extends Segment {
  /** Debug metadata from the source TrackedSpan */
  debugMetadata?: DebugMetadata;
  /** Tags extracted from debugMetadata for easy filtering */
  tags?: string[];
  /** Original span type for reference */
  spanType?: string;
}

/**
 * AnalyticsTransformer - The single point of transformation from TrackedSpan to UI-ready data.
 * 
 * Per the TrackedSpan consolidation plan, this is the ONLY component that should
 * read raw TrackedSpans. UI components should consume Segments produced by this class.
 * 
 * @see docs/plans/jit-01-execution-span-consolidation.md
 */
export class AnalyticsTransformer {

  /**
   * Transform raw TrackedSpans into UI-ready Segments.
   * This is the primary transformation method that UI components should use.
   * 
   * @param spans Array of TrackedSpans from runtime.executionLog
   * @param workoutStartTime Optional start time for calculating relative timestamps
   * @returns Array of Segments ready for UI consumption
   */
  toSegments(spans: TrackedSpan[], workoutStartTime?: number): SegmentWithMetadata[] {
    if (!spans || spans.length === 0) {
      return [];
    }

    // Calculate workout start time if not provided
    const startTime = workoutStartTime ?? Math.min(...spans.map(s => s.startTime));

    // Map IDs to depth for hierarchy
    const idToDepth = new Map<string, number>();

    return spans.map(span => {
      // Calculate depth from parent chain
      let depth = 0;
      if (span.parentSpanId && idToDepth.has(span.parentSpanId)) {
        depth = idToDepth.get(span.parentSpanId)! + 1;
      }
      idToDepth.set(span.id, depth);

      // Calculate duration
      const endTime = span.endTime || Date.now();
      const duration = (endTime - span.startTime) / 1000;

      // Extract metrics
      const metrics = extractMetricsFromSpanMetrics(span.metrics);
      const fragments = (span.fragments && span.fragments.length > 0)
        ? span.fragments
        : spanMetricsToFragments(span.metrics, span.label, span.type);

      const segment: SegmentWithMetadata = {
        id: hashCode(span.id),
        name: span.label,
        type: span.type,
        startTime: (span.startTime - startTime) / 1000,
        endTime: (endTime - startTime) / 1000,
        duration,
        parentId: span.parentSpanId ? hashCode(span.parentSpanId) : null,
        depth,
        metrics,
        lane: depth,
        fragments,
        // Include debug metadata for rich UI display
        debugMetadata: span.debugMetadata,
        tags: span.debugMetadata?.tags,
        spanType: span.type
      };

      return segment;
    });
  }

  /**
   * Group segments by configured analytics categories.
   * Returns an AnalyticsGroup structure for chart/graph display.
   * 
   * @param segments Array of Segments to analyze
   * @returns AnalyticsGroup array with metric configurations
   */
  toAnalyticsGroup(segments: SegmentWithMetadata[]): AnalyticsGroup[] {
    const groups: AnalyticsGroup[] = [];

    // Identify all unique metric keys present in the segments
    const availableMetricKeys = new Set<string>();
    segments.forEach(s => Object.keys(s.metrics).forEach(k => availableMetricKeys.add(k)));

    // Define standard metric configs
    const standardMetrics: Record<string, AnalyticsGraphConfig> = {
      'power': { id: 'power', label: 'Power', unit: 'W', color: '#8b5cf6', dataKey: 'power', icon: 'Zap' },
      'heart_rate': { id: 'heart_rate', label: 'Heart Rate', unit: 'bpm', color: '#ef4444', dataKey: 'heart_rate', icon: 'Activity' },
      'cadence': { id: 'cadence', label: 'Cadence', unit: 'rpm', color: '#3b82f6', dataKey: 'cadence', icon: 'Wind' },
      'speed': { id: 'speed', label: 'Speed', unit: 'km/h', color: '#10b981', dataKey: 'speed', icon: 'Gauge' },
      'resistance': { id: 'resistance', label: 'Resistance', unit: 'kg', color: '#f59e0b', dataKey: 'resistance', icon: 'Dumbbell' },
      'repetitions': { id: 'repetitions', label: 'Reps', unit: 'reps', color: '#6366f1', dataKey: 'repetitions', icon: 'Hash' },
      'calories': { id: 'calories', label: 'Calories', unit: 'cal', color: '#f97316', dataKey: 'calories', icon: 'Flame' },
      'time': { id: 'time', label: 'Time', unit: 'ms', color: '#14b8a6', dataKey: 'time', icon: 'Clock' },
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
          label: formatMetricLabel(key),
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

    return groups;
  }

  /**
   * Filter segments by tag.
   * Uses the debugMetadata.tags to filter segments.
   * 
   * @param segments Array of segments to filter
   * @param tags Tags to filter by (segments must have ALL tags)
   * @returns Filtered array of segments
   */
  filterByTags(segments: SegmentWithMetadata[], tags: string[]): SegmentWithMetadata[] {
    if (!tags || tags.length === 0) {
      return segments;
    }

    return segments.filter(segment => {
      const segmentTags = segment.tags || [];
      return tags.every(tag => segmentTags.includes(tag));
    });
  }

  /**
   * Filter segments by workout type.
   * Common types: 'amrap', 'emom', 'rounds', 'timer', 'effort'
   * 
   * @param segments Array of segments to filter
   * @param type Workout type to filter by
   * @returns Filtered array of segments
   */
  filterByType(segments: SegmentWithMetadata[], type: string): SegmentWithMetadata[] {
    return segments.filter(segment => segment.spanType === type);
  }

  /**
   * Get debug context from a segment.
   * Extracts the strategy-stamped context for analysis.
   * 
   * @param segment The segment to inspect
   * @returns The context object or empty object if not available
   */
  getDebugContext(segment: SegmentWithMetadata): Record<string, unknown> {
    return segment.debugMetadata?.context || {};
  }

  /**
   * Check if a segment was created by a specific strategy.
   * Uses the debugMetadata.context.strategyUsed field.
   * 
   * @param segment The segment to check
   * @param strategyName Strategy name to match
   * @returns True if the segment was created by the specified strategy
   */
  isFromStrategy(segment: SegmentWithMetadata, strategyName: string): boolean {
    const context = this.getDebugContext(segment);
    return context.strategyUsed === strategyName;
  }
}

// ============================================================================
// Legacy Function (Backward Compatibility)
// ============================================================================

// --- Analytics Data Transformation ---
export const transformRuntimeToAnalytics = (runtime: ScriptRuntime | null): { data: any[], segments: Segment[], groups: AnalyticsGroup[] } => {
  if (!runtime) return { data: [], segments: [], groups: [] };

  const segments: Segment[] = [];
  const data: any[] = [];

  // 1. Convert ExecutionRecords to Segments
  // We need to establish a timeline.
  const completedSpans = runtime.tracker.getCompletedSpans();
  const activeSpans = Array.from(runtime.tracker.getActiveSpansMap().values());

  // If the workout hasn't started, return empty.
  if (completedSpans.length === 0 && activeSpans.length === 0) {
    return { data: [], segments: [], groups: [] };
  }

  // Combine completed log and active stack
  const combinedRecords = [
    ...completedSpans,
    ...activeSpans
  ];

  // Deduplicate by record id so active stack entries do not duplicate completed log spans
  const seenRecordIds = new Set<string>();
  const allRecords = combinedRecords.filter(record => {
    const recordId = record.id?.toString();
    if (!recordId) return true;
    if (seenRecordIds.has(recordId)) return false;
    seenRecordIds.add(recordId);
    return true;
  });

  // We need a consistent start time for the timeline
  // Find the earliest start time
  let workoutStartTime = Date.now();
  if (combinedRecords.length > 0) {
    workoutStartTime = Math.min(...combinedRecords.map(r => r.startTime));
  }

  // Sort by start time
  allRecords.sort((a, b) => a.startTime - b.startTime);

  // Map IDs to depth for hierarchy
  const idToDepth = new Map<string, number>();

  allRecords.forEach(record => {
    // Calculate depth
    let depth = 0;
    // For active blocks, we might have parentSpanId from stack structure
    // For log records, we have parentSpanId
    const parentId = 'parentSpanId' in record ? record.parentSpanId : null;
    if (parentId && idToDepth.has(parentId)) {
      depth = (idToDepth.get(parentId) || 0) + 1;
    }
    idToDepth.set(record.id, depth);

    // Calculate duration
    const endTime = record.endTime || Date.now();
    const duration = (endTime - record.startTime) / 1000;

    // Extract metrics from SpanMetrics object
    const metrics = extractMetricsFromSpanMetrics(record.metrics);
    const fragments = (record as any).fragments && (record as any).fragments.length > 0
      ? (record as any).fragments
      : spanMetricsToFragments(record.metrics || ({} as SpanMetrics), record.label || record.type, record.type || 'group');

    segments.push({
      id: hashCode(record.id), // Use hash for numeric ID required by Segment interface
      name: record.label,
      type: record.type,
      startTime: (record.startTime - workoutStartTime) / 1000,
      endTime: (endTime - workoutStartTime) / 1000,
      duration: duration,
      parentId: parentId ? hashCode(parentId) : null,
      depth: depth,
      metrics: metrics,
      lane: depth,
      fragments
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
        label: formatMetricLabel(key),
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
