import { IProjectionEngine } from '../IProjectionEngine';
import { ProjectionResult } from '../ProjectionResult';
import { IMetric, MetricType } from '../../../../core/models/Metric';
import { TimeSpan } from '../../../../runtime/models/TimeSpan';

/**
 * DistanceProjectionEngine - Accumulates total distance across the whole workout.
 *
 * Distance values are expected as `{ amount: number; units?: string }` objects
 * (the standard parser representation). Falls back to raw numeric values too.
 */
export class DistanceProjectionEngine implements IProjectionEngine {
  public readonly name = 'DistanceProjectionEngine';

  calculateFromWorkout(metrics: IMetric[]): ProjectionResult[] {
    let totalDistance = 0;
    let unit = 'm';

    for (const m of metrics) {
      if (m.type === MetricType.Distance) {
        const val = m.value as any;
        if (typeof val?.amount === 'number') {
          totalDistance += val.amount;
          if (val.units) unit = val.units;
        } else if (typeof val === 'number') {
          totalDistance += val;
        }
      }
    }

    if (totalDistance === 0) return [];

    const now = new Date();
    return [{
      name: 'Total Distance',
      value: totalDistance,
      unit,
      timeSpan: new TimeSpan(now.getTime(), now.getTime()),
    }];
  }
}
