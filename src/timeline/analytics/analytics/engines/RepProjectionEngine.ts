import { IProjectionEngine } from '../IProjectionEngine';
import { ProjectionResult } from '../ProjectionResult';
import { IMetric, MetricType } from '../../../../core/models/Metric';
import { TimeSpan } from '../../../../runtime/models/TimeSpan';

/**
 * RepProjectionEngine - Accumulates total repetitions across the whole workout.
 *
 * Implements calculateFromWorkout so it fires on every call to
 * AnalysisService.runWorkoutProjections() with all metrics so far.
 */
export class RepProjectionEngine implements IProjectionEngine {
  public readonly name = 'RepProjectionEngine';

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
      timeSpan: new TimeSpan(now.getTime(), now.getTime()),
    }];
  }
}
