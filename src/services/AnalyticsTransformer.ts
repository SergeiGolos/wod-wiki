
import { ScriptRuntime } from '../runtime/ScriptRuntime';
import { AnalyticsGroup, AnalyticsGraphConfig, Segment } from '../core/models/AnalyticsModels';
import { hashCode } from '../lib/utils';
import { RuntimeSpan } from '../runtime/models/RuntimeSpan';
import { ICodeFragment } from '../core/models/CodeFragment';

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
      if (f.fragmentType === 'timer') key = 'time';
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
 * AnalyticsTransformer - The single point of transformation from RuntimeSpan to UI-ready data.
 */
export class AnalyticsTransformer {

  /**
   * Transform RuntimeSpans into UI-ready Segments.
   */
  toSegments(spans: RuntimeSpan[], workoutStartTime?: number): SegmentWithMetadata[] {
    if (!spans || spans.length === 0) {
      return [];
    }

    const startTime = workoutStartTime ?? Math.min(...spans.map(s => s.startTime));

    return spans.map(span => {
      const duration = span.total() / 1000;
      const endTime = span.endTime || Date.now();
      const metrics = extractMetricsFromFragments(span.fragments);
      const fragments = span.fragments.flat();

      const nameFragment = fragments.find(f =>
        f.fragmentType === 'effort' ||
        f.fragmentType === 'action' ||
        f.fragmentType === 'timer' ||
        f.fragmentType === 'rounds'
      );
      const label = nameFragment?.image || span.blockId;
      const type = nameFragment?.type || 'group';

      return {
        id: hashCode(span.id),
        name: label,
        type: type,
        startTime: (span.startTime - startTime) / 1000,
        endTime: (endTime - startTime) / 1000,
        duration,
        parentId: null,
        depth: 0,
        metrics,
        lane: 0,
        fragments,
        tags: span.metadata.tags,
        context: span.metadata.context,
        spanType: type
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
      'time': { id: 'time', label: 'Time', unit: 'ms', color: '#14b8a6', dataKey: 'time', icon: 'Clock' },
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
 * Legacy Function (Backward Compatibility)
 */
export const transformRuntimeToAnalytics = (runtime: ScriptRuntime | null): { data: any[], segments: Segment[], groups: AnalyticsGroup[] } => {
  if (!runtime) return { data: [], segments: [], groups: [] };

  const transformer = new AnalyticsTransformer();
  const spans = runtime.tracker.getAllSpans();
  const segments = transformer.toSegments(spans);

  if (segments.length === 0) {
    return { data: [], segments: [], groups: [] };
  }

  const groups = transformer.toAnalyticsGroup(segments);
  const data: any[] = [];

  const totalDuration = segments.length > 0 ? Math.max(...segments.map(s => s.endTime)) : 0;
  const availableMetricKeys = new Set<string>();
  segments.forEach(s => Object.keys(s.metrics).forEach(k => availableMetricKeys.add(k)));

  for (let t = 0; t <= totalDuration; t++) {
    const activeSegs = segments.filter(s => t >= s.startTime && t <= s.endTime);
    const dataPoint: any = { time: t };

    availableMetricKeys.forEach(key => {
      const segWithMetric = activeSegs.find(s => s.metrics[key] !== undefined);
      if (segWithMetric) {
        const baseVal = segWithMetric.metrics[key];
        dataPoint[key] = Math.max(0, Math.round(baseVal + (Math.random() - 0.5) * (baseVal * 0.1)));
      } else {
        dataPoint[key] = 0;
      }
    });
    data.push(dataPoint);
  }

  return { data, segments, groups };
};
