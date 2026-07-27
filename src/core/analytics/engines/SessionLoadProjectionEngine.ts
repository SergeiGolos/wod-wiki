import { ISummaryProcessor } from '../ISummaryProcessor';
import { extractMetrics } from '../extractMetrics';
import { ProjectionResult } from '../ProjectionResult';
import { IMetric, MetricType } from '../../models/Metric';
import { IOutputStatement } from '../../models/OutputStatement';
import { TimeSpan } from '../../../runtime/models/TimeSpan';

/**
 * SessionLoadProjectionEngine - Calculates total training load (AU) for the workout.
 *
 * Uses the Foster sRPE methodology:
 *   SessionLoad (AU) = sRPE × Duration (minutes)
 *
 * Effort labels map to RPE values. When no explicit effort is found a
 * moderate default (5) is used so that duration-only workouts still produce
 * a sensible load score.
 */
export class SessionLoadProjectionEngine implements ISummaryProcessor {
  public readonly id = 'session-load-projection';
  public readonly name = 'SessionLoadProjectionEngine';
  public readonly fenceTypes = ['wod', 'log'] as const;

  summarize(outputs: IOutputStatement[]): ProjectionResult[] {
    return this.calculateFromWorkout(extractMetrics(outputs), outputs);
  }

  private readonly effortToRpe: Record<string, number> = {
    easy: 3,
    moderate: 5,
    hard: 7,
    'all-out': 10,
    max: 10,
  };

  calculateFromWorkout(metrics: IMetric[], outputs?: IOutputStatement[]): ProjectionResult[] {
    let totalElapsedMs = 0;
    let maxRpe = 0;

    // Calculate total session duration from statement hierarchy to prevent double-counting
    // parent container elapsed metrics (e.g. SessionRoot/root block) with child block elapsed metrics.
    if (outputs && outputs.length > 0) {
      const segmentOutputs = outputs.filter(o => o.outputType === 'segment');
      const rootSegment = segmentOutputs.find(o => o.stackLevel === 0 || o.sourceBlockKey === 'root');
      const rootElapsed = rootSegment?.metrics.find(m => m.type === MetricType.Elapsed && typeof m.value === 'number');

      if (rootElapsed && typeof rootElapsed.value === 'number') {
        totalElapsedMs = rootElapsed.value;
      } else {
        const leafSegments = segmentOutputs.filter(o => (o.stackLevel ?? 0) > 0);
        const targetSegments = leafSegments.length > 0 ? leafSegments : segmentOutputs;
        for (const s of targetSegments) {
          const m = s.metrics.find(m => m.type === MetricType.Elapsed && typeof m.value === 'number');
          if (m && typeof m.value === 'number') {
            totalElapsedMs += m.value;
          }
        }
      }
    } else {
      // Fallback when outputs array is not provided directly (direct metrics array calls):
      // Gather all elapsed values. If the max elapsed value equals or exceeds the sum of the rest,
      // the max value represents the root session duration and should be used to avoid double counting.
      const elapsedValues: number[] = [];
      for (const m of metrics) {
        if (m.type === MetricType.Elapsed && typeof m.value === 'number') {
          elapsedValues.push(m.value);
        }
      }
      if (elapsedValues.length > 0) {
        const maxVal = Math.max(...elapsedValues);
        const restSum = elapsedValues.reduce((a, b) => a + b, 0) - maxVal;
        totalElapsedMs = (restSum === 0 || maxVal >= restSum) ? maxVal : elapsedValues.reduce((a, b) => a + b, 0);
      }
    }

    for (const m of metrics) {
      if (m.type === MetricType.Effort) {
        const effortVal = typeof m.value === 'string' ? m.value.toLowerCase() : null;
        const rpe = effortVal ? (this.effortToRpe[effortVal] ?? 0) : (typeof m.value === 'number' ? m.value : 0);
        if (rpe > maxRpe) maxRpe = rpe;
      }
      // User-captured session RPE (post-workout prompt, #735) is authoritative
      // over the effort-label heuristic — same pattern as TISProcessor.
      if (m.type === MetricType.SessionRPE && typeof m.value === 'number') {
        maxRpe = m.value;
      }
    }

    if (totalElapsedMs === 0) return [];

    const sRPE = maxRpe > 0 ? maxRpe : 5;
    const sessionLoad = Math.round(sRPE * (totalElapsedMs / 60000));

    const now = new Date();
    return [{
      name: 'Training Load',
      value: sessionLoad,
      unit: 'AU',
      metricType: MetricType.Load,
      timeSpan: new TimeSpan(now.getTime(), now.getTime()),
      metadata: { sRPE, durationMinutes: totalElapsedMs / 60000 },
    }];
  }
}
