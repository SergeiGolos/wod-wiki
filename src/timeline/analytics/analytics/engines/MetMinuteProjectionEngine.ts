import { IProjectionEngine } from '../IProjectionEngine';
import { IAnalyticsStage } from '../../../../core/analytics/IAnalyticsStage';
import { extractMetrics } from '../../../../core/analytics/extractMetrics';
import { ProjectionResult } from '../ProjectionResult';
import { IMetric, MetricType } from '../../../../core/models/Metric';
import { IOutputStatement } from '../../../../core/models/OutputStatement';
import { TimeSpan } from '../../../../runtime/models/TimeSpan';

/**
 * MetMinuteProjectionEngine - Calculates total energy expenditure in MET-minutes.
 *
 * MET-minutes = METs × duration(minutes). MET values come from a built-in
 * lookup keyed by action name; unknown activities default to 6.0 (vigorous).
 *
 * Formula: ∑(METs × timeMs / 60 000) across all timed segments.
 */
export class MetMinuteProjectionEngine implements IProjectionEngine, IAnalyticsStage {
  public readonly id = 'met-minute-projection';
  public readonly name = 'MetMinuteProjectionEngine';

  project(outputs: IOutputStatement[]): ProjectionResult[] {
    return this.calculateFromWorkout(extractMetrics(outputs));
  }

  private readonly metLookup: Record<string, number> = {
    run: 9.8,
    jog: 7.0,
    walk: 3.5,
    row: 8.5,
    cycle: 8.0,
    burpee: 10.0,
    squat: 6.0,
    lift: 6.0,
    rest: 1.0,
  };

  calculateFromWorkout(metrics: IMetric[]): ProjectionResult[] {
    let totalMetMinutes = 0;
    let lastActionName: string | null = null;

    for (const m of metrics) {
      if (m.type === MetricType.Action && typeof m.value === 'string') {
        lastActionName = m.value.toLowerCase();
      }
      if (m.type === MetricType.Elapsed && typeof m.value === 'number' && m.value > 0) {
        const mets = lastActionName ? (this.metLookup[lastActionName] ?? 6.0) : 6.0;
        totalMetMinutes += mets * (m.value / 60000);
      }
    }

    if (totalMetMinutes <= 0) return [];

    const now = new Date();
    return [{
      name: 'Energy',
      value: Math.round(totalMetMinutes),
      unit: 'MET-min',
      metricType: MetricType.Work,
      timeSpan: new TimeSpan(now.getTime(), now.getTime()),
    }];

  }
}
