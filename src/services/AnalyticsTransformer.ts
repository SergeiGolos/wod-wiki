

import { AnalyticsGroup, AnalyticsGraphConfig, Segment } from '../core/models/AnalyticsModels';

import { ICodeFragment } from '../core/models/CodeFragment';
import { IOutputStatement } from '../core/models/OutputStatement';
import { IScriptRuntime } from '../runtime/contracts/IScriptRuntime';

/**
 * Time-series data point for analytics visualization.
 * Contains time and dynamic metric values.
 */
export interface AnalyticsDataPoint {
  time: number;
  [key: string]: number;
}

/**
 * Format a metric key into a human-readable label.
 * Capitalizes the first letter and replaces underscores with spaces.
 */
function formatMetricLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
}

/**
 * Extract numeric metrics from fragment groups.
 */
function extractMetricsFromFragments(fragments: ICodeFragment[][]): Record<string, number> {
  const metrics: Record<string, number> = {};
  const flat = fragments.flat();

  for (const f of flat) {
    if (f.value !== undefined && typeof f.value === 'number') {
      let key = f.type;
      if (f.fragmentType === 'rep') key = 'repetitions';
      if (f.fragmentType === 'distance') key = 'distance';
      if (f.fragmentType === 'resistance') key = 'resistance';

      metrics[key] = (metrics[key] || 0) + f.value;
    }
  }
  return metrics;
}

/**
 * UI-ready segment format.
 */
export interface SegmentWithMetadata extends Segment {
  tags?: string[];
  spanType?: string;
  context?: Record<string, any>;
}

/**
 * AnalyticsTransformer - Transforms OutputStatements into UI-ready analytics data.
 */
export class AnalyticsTransformer {

  /**
   * Transform OutputStatements into UI-ready Segments.
   * This is the primary API for the new runtime architecture.
   */
  fromOutputStatements(outputs: IOutputStatement[], workoutStartTime?: number): SegmentWithMetadata[] {
    if (!outputs || outputs.length === 0) {
      return [];
    }

    // Find the earliest start time from all outputs (ignoring NaNs)
    const validStartTimes = outputs
      .map(o => o.timeSpan.started)
      .filter(t => !isNaN(t));

    const startTime = workoutStartTime ?? (
      validStartTimes.length > 0 ? Math.min(...validStartTimes) : 0
    );

    return outputs.map(output => {
      // Paranoid copy of fragments to ensure they persist
      const fragments = output.fragments ? [...output.fragments] : [];

      // Intent: parser-defined duration (if any)
      const durationFrag = fragments.find(f => f.fragmentType === 'duration');
      const intentDuration = (durationFrag?.value as number || 0) / 1000;

      // Real Time: pause-aware elapsed time and wall-clock total
      // These are stored as properties on OutputStatement class or plain objects
      const elapsed = (output.elapsed || 0) / 1000;
      const total = (output.total || 0) / 1000;

      const startTimeMs = output.timeSpan?.started ?? startTime;
      const endTimeMs = output.timeSpan?.ended ?? Date.now();

      const metrics = extractMetricsFromFragments([fragments]);

      const nameFragment = fragments.find(f =>
        f.fragmentType === 'effort' ||
        f.fragmentType === 'action' ||
        f.fragmentType === 'duration' ||
        f.fragmentType === 'rounds' ||
        f.fragmentType === 'current-round'
      );
      const label = nameFragment?.image || output.sourceBlockKey;
      const type = nameFragment?.type || output.outputType;

      // Spans are recorded using the runtime clock.
      // We convert them to session-relative seconds for visualization.
      const rawSpans = (output.spans && output.spans.length > 0)
        ? output.spans
        : (output.timeSpan ? [output.timeSpan] : []);

      const spans = rawSpans.map(s => ({
        started: (s.started - startTime) / 1000,
        ended: s.ended !== undefined ? (s.ended - startTime) / 1000 : undefined,
      }));

      return {
        id: output.id,
        name: label,
        type: type,
        startTime: (startTimeMs - startTime) / 1000,
        endTime: (endTimeMs - startTime) / 1000,
        duration: intentDuration,
        elapsed,
        total,
        parentId: output.parent ?? null,
        depth: output.stackLevel,
        metrics,
        lane: output.stackLevel,
        spans,
        fragments,
        tags: output.hints ? Array.from(output.hints) : undefined,
        context: {
          outputType: output.outputType,
          sourceStatementId: output.sourceStatementId,
          sourceBlockKey: output.sourceBlockKey,
          completionReason: output.completionReason,
        },
        spanType: output.outputType
      };
    });
  }

  /**
   * Group segments by analytics categories.
   */
  toAnalyticsGroup(segments: SegmentWithMetadata[]): AnalyticsGroup[] {
    const groups: AnalyticsGroup[] = [];
    const availableMetricKeys = new Set<string>();
    segments.forEach(s => Object.keys(s.metrics).forEach(k => availableMetricKeys.add(k)));

    const standardMetrics: Record<string, AnalyticsGraphConfig> = {
      'power': { id: 'power', label: 'Power', unit: 'W', color: '#8b5cf6', dataKey: 'power', icon: 'Zap' },
      'heart_rate': { id: 'heart_rate', label: 'Heart Rate', unit: 'bpm', color: '#ef4444', dataKey: 'heart_rate', icon: 'Activity' },
      'cadence': { id: 'cadence', label: 'Cadence', unit: 'rpm', color: '#3b82f6', dataKey: 'cadence', icon: 'Wind' },
      'speed': { id: 'speed', label: 'Speed', unit: 'km/h', color: '#10b981', dataKey: 'speed', icon: 'Gauge' },
      'resistance': { id: 'resistance', label: 'Resistance', unit: 'kg', color: '#f59e0b', dataKey: 'resistance', icon: 'Dumbbell' },
      'repetitions': { id: 'repetitions', label: 'Reps', unit: 'reps', color: '#6366f1', dataKey: 'repetitions', icon: 'Hash' },
      'calories': { id: 'calories', label: 'Calories', unit: 'cal', color: '#f97316', dataKey: 'calories', icon: 'Flame' },
      'elapsed': { id: 'elapsed', label: 'Elapsed', unit: 's', color: '#14b8a6', dataKey: 'elapsed', icon: 'Clock' },
      'total': { id: 'total', label: 'Total', unit: 's', color: '#f43f5e', dataKey: 'total', icon: 'Timer' },
    };

    const performanceGraphs: AnalyticsGraphConfig[] = [];
    availableMetricKeys.forEach(key => {
      if (standardMetrics[key]) {
        performanceGraphs.push(standardMetrics[key]);
      } else {
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
      groups.push({ id: 'performance', name: 'Performance', graphs: performanceGraphs });
    }

    return groups;
  }

  /**
   * Filter segments by tag.
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
   */
  filterByType(segments: SegmentWithMetadata[], type: string): SegmentWithMetadata[] {
    return segments.filter(segment => segment.spanType === type);
  }

  /**
   * Get debug context from a segment.
   */
  getDebugContext(segment: SegmentWithMetadata): Record<string, unknown> {
    return segment.context || {};
  }

  /**
   * Check if a segment was created by a specific strategy.
   */
  isFromStrategy(segment: SegmentWithMetadata, strategyName: string): boolean {
    const context = this.getDebugContext(segment);
    return context.strategyUsed === strategyName;
  }
}

/**
 * Analytics result from transforming runtime output.
 */
export interface AnalyticsResult {
  data: AnalyticsDataPoint[];
  segments: Segment[];
  groups: AnalyticsGroup[];
}

/**
 * Transform runtime output statements into analytics-ready data.
 * This is the primary entry point for analytics visualization.
 * 
 * @param runtime The script runtime to extract output from
 * @returns Analytics data including time-series data, segments, and metric groups
 */
export function getAnalyticsFromRuntime(runtime: IScriptRuntime | null): AnalyticsResult {
  if (!runtime) return { data: [], segments: [], groups: [] };

  const transformer = new AnalyticsTransformer();
  const outputs = runtime.getOutputStatements();
  const segments = transformer.fromOutputStatements(outputs);

  if (segments.length === 0) {
    return { data: [], segments: [], groups: [] };
  }

  const groups = transformer.toAnalyticsGroup(segments);
  const data: AnalyticsDataPoint[] = [];

  const totalDuration = segments.length > 0 ? Math.max(...segments.map(s => s.endTime)) : 0;
  const availableMetricKeys = new Set<string>();
  segments.forEach(s => {
    Object.keys(s.metrics).forEach(k => availableMetricKeys.add(k));
    availableMetricKeys.add('elapsed');
    availableMetricKeys.add('total');
  });

  for (let t = 0; t <= totalDuration; t++) {
    const activeSegs = segments.filter(s => t >= s.startTime && t <= s.endTime);
    const dataPoint: AnalyticsDataPoint = { time: t };

    availableMetricKeys.forEach(key => {
      const segWithMetric = activeSegs.find(s => (s.metrics[key] !== undefined) || (key === 'elapsed') || (key === 'total'));
      if (segWithMetric) {
        let baseVal = (key === 'elapsed') ? segWithMetric.elapsed : 
                      (key === 'total') ? segWithMetric.total :
                      (segWithMetric.metrics[key] || 0);

        // Add slight variation for visualization (can be removed if deterministic values needed)
        dataPoint[key] = Math.max(0, Math.round(baseVal + (Math.random() - 0.5) * (baseVal * 0.1)));
      } else {
        dataPoint[key] = 0;
      }
    });
    data.push(dataPoint);
  }

  return { data, segments, groups };
}

/**
 * Transform raw output statements into analytics-ready data.
 * Used for historical analysis where no runtime instance exists.
 */
export function getAnalyticsFromLogs(outputs: IOutputStatement[], workoutStartTime?: number): AnalyticsResult {
  if (!outputs || outputs.length === 0) return { data: [], segments: [], groups: [] };

  const transformer = new AnalyticsTransformer();
  const segments = transformer.fromOutputStatements(outputs, workoutStartTime);

  if (segments.length === 0) {
    return { data: [], segments: [], groups: [] };
  }

  const groups = transformer.toAnalyticsGroup(segments);
  const data: AnalyticsDataPoint[] = [];

  const totalDuration = segments.length > 0 ? Math.max(...segments.map(s => s.endTime)) : 0;
  const availableMetricKeys = new Set<string>();
  segments.forEach(s => {
    Object.keys(s.metrics).forEach(k => availableMetricKeys.add(k));
    availableMetricKeys.add('elapsed');
    availableMetricKeys.add('total');
  });

  for (let t = 0; t <= totalDuration; t++) {
    const activeSegs = segments.filter(s => t >= s.startTime && t <= s.endTime);
    const dataPoint: AnalyticsDataPoint = { time: t };

    availableMetricKeys.forEach(key => {
      const segWithMetric = activeSegs.find(s => (s.metrics[key] !== undefined) || (key === 'elapsed') || (key === 'total'));
      if (segWithMetric) {
        let baseVal = (key === 'elapsed') ? segWithMetric.elapsed : 
                      (key === 'total') ? segWithMetric.total :
                      (segWithMetric.metrics[key] || 0);
        dataPoint[key] = Math.round(baseVal); // No variation for historical logs
      } else {
        dataPoint[key] = 0;
      }
    });
    data.push(dataPoint);
  }

  return { data, segments, groups };
}
