import { ISummaryProcessor } from '../ISummaryProcessor';
import { extractMetrics } from '../extractMetrics';
import { ProjectionResult } from '../ProjectionResult';
import { IMetric, MetricType } from '../../models/Metric';
import { IOutputStatement } from '../../models/OutputStatement';
import { TimeSpan } from '../../../runtime/models/TimeSpan';

/**
 * RepProjectionEngine - Accumulates total repetitions across the whole workout.
 *
 * Implements calculateFromWorkout so it fires on every call to
 * AnalysisService.runWorkoutProjections() with all metrics so far.
 */
export class RepProjectionEngine implements ISummaryProcessor {
  public readonly id = 'rep-projection';
  public readonly name = 'RepProjectionEngine';
  public readonly fenceTypes = ['wod', 'log', 'plan'] as const;
  public readonly requiredMetrics = [MetricType.Rep] as const;

  summarize(outputs: IOutputStatement[]): ProjectionResult[] {
    const metrics = extractMetrics(outputs);
    const overall = this.calculateFromWorkout(metrics);
    const perEffort = this._runPerEffort(metrics);
    return [...overall, ...perEffort];
  }

  private toSlug(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  private _runPerEffort(metrics: IMetric[]): ProjectionResult[] {
    const grouped = new Map<string, number>();
    let currentEffort: string | null = null;

    for (const m of metrics) {
      if (m.type === MetricType.Effort && typeof m.value === 'string') {
        currentEffort = m.value;
        if (!grouped.has(currentEffort)) grouped.set(currentEffort, 0);
        continue;
      }
      if (currentEffort && m.type === MetricType.Rep && typeof m.value === 'number') {
        grouped.set(currentEffort, (grouped.get(currentEffort) ?? 0) + m.value);
      }
    }

    const now = new Date();
    const results: ProjectionResult[] = [];
    for (const [effortName, totalReps] of grouped.entries()) {
      if (totalReps <= 0) continue;
      results.push({
        name: 'Total Reps',
        value: totalReps,
        unit: 'reps',
        metricType: MetricType.Rep,
        timeSpan: new TimeSpan(now.getTime(), now.getTime()),
        metadata: {
          exerciseName: effortName,
          effortSlug: this.toSlug(effortName),
        },
      });
    }
    return results;
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
