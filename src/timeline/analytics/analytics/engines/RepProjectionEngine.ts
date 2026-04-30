import { IAnalyticsStage } from '../../../../core/analytics/IAnalyticsStage';
import { extractMetrics } from '../../../../core/analytics/extractMetrics';
import { ProjectionResult } from '../ProjectionResult';
import { IMetric, MetricType } from '../../../../core/models/Metric';
import { IOutputStatement } from '../../../../core/models/OutputStatement';
import { TimeSpan } from '../../../../runtime/models/TimeSpan';

/**
 * RepProjectionEngine - Accumulates total repetitions across the whole workout.
 *
 * Implements calculateFromWorkout so it fires on every call to
 * AnalysisService.runWorkoutProjections() with all metrics so far.
 */
export class RepProjectionEngine implements IAnalyticsStage {
  public readonly id = 'rep-projection';
  public readonly name = 'RepProjectionEngine';

  project(outputs: IOutputStatement[]): ProjectionResult[] {
    return this.calculateFromWorkout(extractMetrics(outputs));
  }

  calculateFromWorkout(metrics: IMetric[]): ProjectionResult[] {
    let totalReps = 0;

    for (const m of metrics) {
      if (m.type === MetricType.Rep && typeof m.value === 'number') {
        totalReps += m.value;
      }
    }

    if (totalReps === 0) return [];

    const now = new Date();
    return [{
      name: 'Total Reps',
      value: totalReps,
      unit: 'reps',
      metricType: MetricType.Rep,
      timeSpan: new TimeSpan(now.getTime(), now.getTime()),
    }];
  }
}
