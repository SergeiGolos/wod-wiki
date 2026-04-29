import { IAnalyticsStage } from '../../../../core/analytics/IAnalyticsStage';
import { extractMetrics } from '../../../../core/analytics/extractMetrics';
import { ProjectionResult } from '../ProjectionResult';
import { IMetric, MetricType } from '../../../../core/models/Metric';
import { IOutputStatement } from '../../../../core/models/OutputStatement';
import { TimeSpan } from '../../../../runtime/models/TimeSpan';

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
export class SessionLoadProjectionEngine implements IAnalyticsStage {
  public readonly id = 'session-load-projection';
  public readonly name = 'SessionLoadProjectionEngine';

  project(outputs: IOutputStatement[]): ProjectionResult[] {
    return this.calculateFromWorkout(extractMetrics(outputs));
  }

  private readonly effortToRpe: Record<string, number> = {
    easy: 3,
    moderate: 5,
    hard: 7,
    'all-out': 10,
    max: 10,
  };

  calculateFromWorkout(metrics: IMetric[]): ProjectionResult[] {
    let totalElapsedMs = 0;
    let maxRpe = 0;

    for (const m of metrics) {
      if (m.type === MetricType.Elapsed && typeof m.value === 'number') {
        totalElapsedMs += m.value;
      }
      if (m.type === MetricType.Effort) {
        const effortVal = typeof m.value === 'string' ? m.value.toLowerCase() : null;
        const rpe = effortVal ? (this.effortToRpe[effortVal] ?? 0) : (typeof m.value === 'number' ? m.value : 0);
        if (rpe > maxRpe) maxRpe = rpe;
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
