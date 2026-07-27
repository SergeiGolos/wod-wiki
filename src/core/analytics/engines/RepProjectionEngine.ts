import { ISummaryProcessor } from '../ISummaryProcessor';
import { extractMetrics } from '../extractMetrics';
import { ProjectionResult } from '../ProjectionResult';
import { IMetric, MetricType } from '../../models/Metric';
import { IOutputStatement } from '../../models/OutputStatement';
import { TimeSpan } from '../../../runtime/models/TimeSpan';
import { extractEffortData } from '../effortResolution';
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
    const perEffort = this._runPerEffort(outputs);
    return [...overall, ...perEffort];
  }

  private toSlug(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  private _runPerEffort(outputs: IOutputStatement[]): ProjectionResult[] {
    const grouped = new Map<string, { name: string; slug: string; reps: number }>();

    for (const output of outputs) {
      if (output.outputType !== 'segment') continue;
      const rawMetrics = output.metrics?.rawMetrics ?? [];

      const effortData = extractEffortData(rawMetrics);
      const effortMetric = rawMetrics.find(m => m.type === MetricType.Effort && typeof m.value === 'string');

      const effortName = (effortData?.resolved.label || (typeof effortMetric?.value === 'string' ? effortMetric.value : '')).trim();
      const effortSlug = effortData?.resolved.slug || (effortName ? this.toSlug(effortName) : '');

      if (!effortSlug || effortSlug === 'rest' || effortSlug === 'pause' || effortSlug.startsWith('rest-')) {
        continue;
      }

      let statementReps = 0;
      for (const m of rawMetrics) {
        if (m.type === MetricType.Rep && typeof m.value === 'number') {
          statementReps += m.value;
        }
      }

      if (statementReps > 0) {
        const existing = grouped.get(effortSlug);
        if (existing) {
          existing.reps += statementReps;
        } else {
          grouped.set(effortSlug, { name: effortName || effortSlug, slug: effortSlug, reps: statementReps });
        }
      }
    }

    const now = new Date();
    const results: ProjectionResult[] = [];
    for (const item of grouped.values()) {
      results.push({
        name: 'Total Reps',
        value: item.reps,
        unit: 'reps',
        metricType: MetricType.Rep,
        timeSpan: new TimeSpan(now.getTime(), now.getTime()),
        metadata: {
          exerciseName: item.name,
          effortSlug: item.slug,
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
