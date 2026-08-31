

import { AnalyticsGroup, AnalyticsGraphConfig, Segment } from '@bitcobblers/wod-wiki-core';

import { IMetric, MetricType } from '@bitcobblers/wod-wiki-core';
import { MetricContainer } from '@bitcobblers/wod-wiki-core';
import { getHints } from '../metrics/hints';
import { IOutputStatement } from '@bitcobblers/wod-wiki-core';
import type { StoredOutputStatement } from '@bitcobblers/wod-wiki-core';
import { IScriptRuntime } from '../runtime/contracts/IScriptRuntime';
import { INowProvider, wallClockNow } from '../runtime/INowProvider';

/**
 * Union accepted by the transformer — either a live OutputStatement (from a
 * running runtime) or a plain StoredOutputStatement (loaded from IndexedDB).
 */
type OutputLike = IOutputStatement | StoredOutputStatement;

/**
 * Format a metric key into a human-readable label.
 * Capitalizes the first letter and replaces underscores with spaces.
 */
function formatMetricLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
}

/**
 * Extract a stable analytics key from a metric.
 *
 * Preference order:
 *   1. Explicit metric key / calculated target
 *   2. Canonical metric type mapping used by graph surfaces
 *   3. Raw metric type as a safe fallback
 */
function resolveAnalyticsMetricKey(metric: IMetric): string {
  const enrichedMetric = metric as IMetric & { key?: string; metadata?: { target?: string } };
  const explicitKey = enrichedMetric.key ?? enrichedMetric.metadata?.target;
  if (typeof explicitKey === 'string' && explicitKey.trim().length > 0) {
    return explicitKey;
  }

  switch (metric.type) {
    case 'rep':
      return 'reps'; // Canonical Metric Key — same in fact rows and display (CONTEXT.md)
    case 'distance':
      return 'distance';
    case 'resistance':
      return 'resistance';
    default:
      return metric.type;
  }
}

/**
 * Extract numeric metrics from metric groups.
 */
function extractMetricsFromGroups(metricsGroups: IMetric[][]): Record<string, number> {
  const result: Record<string, number> = {};
  const flat = metricsGroups.flat();

  for (const f of flat) {
    if (f.value !== undefined && typeof f.value === 'number') {
      const key = resolveAnalyticsMetricKey(f);
      const val = f.value;
      // Convert time-based metrics (except elapsed/total which are handled separately)
      // from milliseconds to seconds for consistency in the analytics data points.
      if (f.type === 'duration') {
        // Duration (intent) is now handled as a top-level segment property,
        // we don't want it in the dynamic metrics map to avoid double-counting
        // or unit confusion in the performance graphs.
        continue;
      }

      result[key] = (result[key] || 0) + val;
    }
  }
  return result;
}

/**
 * UI-ready segment format.
 */
export interface SegmentWithMetadata extends Segment {
  metrics?: MetricContainer;
  tags?: string[];
  spanType?: string;
  context?: Record<string, unknown>;
}

/**
 * AnalyticsTransformer - Transforms OutputStatements into UI-ready analytics data.
 */
export class AnalyticsTransformer {

  /**
   * Transform OutputStatements into UI-ready Segments.
   * This is the primary API for the new runtime architecture.
   */
  fromOutputStatements(outputs: OutputLike[], workoutStartTime?: number, now: INowProvider = wallClockNow): SegmentWithMetadata[] {
    if (!outputs || outputs.length === 0) {
      return [];
    }

    // Find the earliest start time from all outputs (ignoring NaNs).
    // Stored rows may lack a timeSpan (pre-V13 logs) — skip those.
    const validStartTimes = outputs
      .map(o => o.timeSpan?.started)
      .filter((t): t is number => typeof t === 'number' && !isNaN(t));

    const startTime = workoutStartTime ?? (
      validStartTimes.length > 0 ? Math.min(...validStartTimes) : 0
    );

    return outputs.map(output => {
      const outputMetrics = MetricContainer.from(output.metrics as IMetric[], output.id);

      // Intent: parser-defined duration (if any)
      const durationFrag = outputMetrics.find(f => f.type === 'duration');
      const intentDuration = durationFrag?.value !== undefined ? (durationFrag.value as number) / 1000 : undefined;

      // Real Time: pause-aware elapsed time and wall-clock total
      // These are stored as canonical metrics on OutputStatement.
      const elapsedMetric = outputMetrics.find(m => m.type === MetricType.Elapsed);
      const elapsed = (typeof elapsedMetric?.value === 'number' ? elapsedMetric.value : 0) / 1000;

      const totalMetric = outputMetrics.find(m => m.type === MetricType.Total);
      const total = (typeof totalMetric?.value === 'number' ? totalMetric.value : 0) / 1000;

      const startTimeMs = output.timeSpan?.started ?? startTime;
      const endTimeMs = output.timeSpan?.ended ?? now.nowMs();

      const extractedMetrics = extractMetricsFromGroups([outputMetrics.toArray()]);

      const nameMetric = outputMetrics.find(f =>
        f.type === 'effort' ||
        f.type === 'action' ||
        f.type === 'duration' ||
        f.type === 'rounds' ||
        f.type === 'current-round' ||
        f.type === 'label'
      );
      const label = nameMetric?.image || output.sourceBlockKey;
      const type = nameMetric?.type || output.outputType;

      // Spans are recorded using the runtime clock.
      // We convert them to session-relative seconds for visualization.
      const spansMetric = outputMetrics.find(m => m.type === MetricType.Spans);
      const metricSpans = Array.isArray(spansMetric?.value) ? spansMetric.value : [];
      const rawSpans = metricSpans.length > 0
        ? metricSpans
        : (output.timeSpan ? [output.timeSpan] : []);

      const spans = rawSpans.map(s => ({
        started: (s.started - startTime) / 1000,
        ended: s.ended !== undefined ? (s.ended - startTime) / 1000 : undefined,
      }));

      return {
        id: output.id ?? 0,
        name: label ?? '',
        type: type ?? 'segment',
        startTime: (startTimeMs - startTime) / 1000,
        endTime: (endTimeMs - startTime) / 1000,
        absoluteStartTime: startTimeMs,
        duration: intentDuration,
        elapsed,
        total,
        parentId: output.parent ?? null,
        depth: output.stackLevel ?? 0,
        metric: extractedMetrics,
        lane: output.stackLevel ?? 0,
        spans,
        metrics: outputMetrics,
        tags: (() => { const h = getHints(output as { metrics: IMetric[] }); return h.length ? h : undefined; })(),
        context: {
          outputType: output.outputType,
          sourceStatementId: output.sourceStatementId,
          sourceBlockKey: output.sourceBlockKey,
          completionReason: output.completionReason,
        },
        spanType: output.outputType ?? 'segment'
      };
    });
  }

  /**
   * Group segments by analytics categories.
   */
  toAnalyticsGroup(segments: SegmentWithMetadata[]): AnalyticsGroup[] {
    const groups: AnalyticsGroup[] = [];
    const availableMetricKeys = new Set<string>();
    segments.forEach(s => Object.keys(s.metric).forEach(k => availableMetricKeys.add(k)));

    const standardMetrics: Record<string, AnalyticsGraphConfig> = {
      'power': { id: 'power', label: 'Power', unit: 'W', color: '#8b5cf6', dataKey: 'power', icon: 'Zap' },
      'heart_rate': { id: 'heart_rate', label: 'Heart Rate', unit: 'bpm', color: '#ef4444', dataKey: 'heart_rate', icon: 'Activity' },
      'cadence': { id: 'cadence', label: 'Cadence', unit: 'rpm', color: '#3b82f6', dataKey: 'cadence', icon: 'Wind' },
      'speed': { id: 'speed', label: 'Speed', unit: 'km/h', color: '#10b981', dataKey: 'speed', icon: 'Gauge' },
      'resistance': { id: 'resistance', label: 'Resistance', unit: 'kg', color: '#f59e0b', dataKey: 'resistance', icon: 'Dumbbell' },
      'reps': { id: 'reps', label: 'Reps', unit: 'reps', color: '#6366f1', dataKey: 'reps', icon: 'Hash' },
      'calories': { id: 'calories', label: 'Calories', unit: 'cal', color: '#f97316', dataKey: 'calories', icon: 'Flame' },
      'duration': { id: 'duration', label: 'Duration', unit: 's', color: '#0ea5e9', dataKey: 'duration', icon: 'Timer' },
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
  segments: SegmentWithMetadata[];
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
  if (!runtime) return { segments: [], groups: [] };

  const transformer = new AnalyticsTransformer();
  const allOutputs = runtime.getOutputStatements();
  // Filter for workout segments and analytics outputs — avoids 'load', 'system', 'event' outputs
  // appearing in results and analytics graphs. During a live session the persisted
  // buffer holds no Tier-2 totals (they stay ephemeral), so fold in the live
  // running-total snapshot for display. After finalize the finals are already in
  // the buffer and the snapshot is empty, so this never double-counts.
  const outputs = allOutputs.filter(o =>
    o.outputType === 'segment' ||
    o.outputType === 'analytics' ||
    o.outputType === 'milestone'
  );
  const liveAnalytics = runtime.getLiveAnalytics?.() ?? [];
  const source = liveAnalytics.length > 0 ? [...outputs, ...liveAnalytics] : outputs;
  
  const segments = transformer.fromOutputStatements(source);

  if (segments.length === 0) {
    return { segments: [], groups: [] };
  }

  const groups = transformer.toAnalyticsGroup(segments);

  return { segments, groups };
}

/**
 * Derive analytics segments from a stored workout log.
 *
 * This is the **canonical read path** for all analytics derived from a
 * completed workout. WorkoutResult.data.logs (StoredOutputStatement[]) is
 * the source of truth; call this function to obtain Segment[] for display,
 * review grids, or trend summaries.
 *
 * Relationship to the analytics IDB store:
 *   The `analytics` IndexedDB store holds AnalyticsDataPoint[] summary fact
 *   rows written by normalizeSummaryFacts() from Tier-2 outputs in data.logs.
 *   They are NOT required for any current display feature. If they disagree
 *   with logs, logs win. Use this function — not the analytics store — to
 *   obtain segment data for display.
 *
 * @param outputs - StoredOutputStatement[] from WorkoutResult.data.logs
 * @param workoutStartTime - Optional workout start timestamp (ms). Used to
 *   anchor relative timing in the segment timeline.
 * @param now - Optional clock provider; defaults to wall-clock.
 */
export function getAnalyticsFromLogs(outputs: StoredOutputStatement[], workoutStartTime?: number, now?: INowProvider): AnalyticsResult {
  if (!outputs || outputs.length === 0) return { segments: [], groups: [] };

  const transformer = new AnalyticsTransformer();
  // Rows read back from storage can carry the weak serialized metric shape
  // and a missing timeSpan (older logs). Normalize once at the boundary:
  // rows written by toStoredOutputStatement always carry both.
  const normalized: (StoredOutputStatement & {
    timeSpan: { started: number; ended?: number };
    metrics: IMetric[];
  })[] = outputs.map(o => ({
    ...o,
    timeSpan: o.timeSpan ?? { started: o.timestamp ?? 0 },
    metrics: (o.metrics as IMetric[]),
  }));

  // Filter for workout segments and analytics outputs — avoids historical 'load' outputs
  // appearing in results and analytics graphs.
  const filteredOutputs = normalized.filter(o =>
    o.outputType === 'segment' ||
    o.outputType === 'analytics' ||
    o.outputType === 'milestone'
  );

  // Drop duplicate 'analytics' outputs: same (label, value, unit) within the
  // same second. The pre-dedupe live+finalize pair was stamped with distinct
  // Date.now() values inside one second, so an exact-ms key misses it; a 1s
  // window catches it while preserving legitimate progressions (same value
  // recurring across rounds, seconds apart). Keep the last occurrence.
  // Fact-row identity is a separate contract — see normalizeSummaryFacts
  // (metricKey, keep-last) and AnalyticsEngine's emission signature.
  const lastKeptByKey = new Map<string, number>();
  const dedupedOutputs: StoredOutputStatement[] = [];
  for (let i = filteredOutputs.length - 1; i >= 0; i--) {
    const o = filteredOutputs[i];
    if (o.outputType === 'analytics') {
      const label = o.metrics.find(m => m.type === MetricType.Label);
      const value = o.metrics.find(m => m.type !== MetricType.Label && typeof m.value === 'number');
      if (label && value) {
        const key = [
          String(label.value ?? label.image ?? ''),
          String(value.value),
          value.unit ?? '',
        ].join('|');
        const kept = lastKeptByKey.get(key);
        if (kept !== undefined && Math.abs(kept - o.timeSpan.started) < 1000) continue;
        lastKeptByKey.set(key, o.timeSpan.started);
      }
    }
    dedupedOutputs.unshift(o);
  }

  const segments = transformer.fromOutputStatements(dedupedOutputs, workoutStartTime, now);

  if (segments.length === 0) {
    return { segments: [], groups: [] };
  }

  const groups = transformer.toAnalyticsGroup(segments);

  return { segments, groups };
}

