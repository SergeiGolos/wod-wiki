import { IProjectionEngine } from '../IProjectionEngine';
import { IAnalyticsStage } from '../../../../core/analytics/IAnalyticsStage';
import { extractMetrics } from '../../../../core/analytics/extractMetrics';
import { ProjectionResult } from '../ProjectionResult';
import { IMetric, MetricType } from '../../../../core/models/Metric';
import { IOutputStatement } from '../../../../core/models/OutputStatement';
import { TimeSpan } from '../../../../runtime/models/TimeSpan';

/**
 * DistanceProjectionEngine - Accumulates total distance across the whole workout.
 *
 * Distance values are expected as `{ amount: number; units?: string }` objects
 * (the standard parser representation). Falls back to raw numeric values too.
 */
export class DistanceProjectionEngine implements IProjectionEngine, IAnalyticsStage {
  public readonly id = 'distance-projection';
  public readonly name = 'DistanceProjectionEngine';

  project(outputs: IOutputStatement[]): ProjectionResult[] {
    return this.calculateFromWorkout(extractMetrics(outputs));
  }

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
      metricType: MetricType.Distance,
      timeSpan: new TimeSpan(now.getTime(), now.getTime()),
    }];
  }
}
