import { IAnalyticsProcess } from '../contracts/IAnalyticsEngine';
import { IOutputStatement, OutputStatement } from '../models/OutputStatement';
import { MetricType } from '../models/Metric';
import { MetricContainer } from '../models/MetricContainer';
import { AnalysisService } from '../../timeline/analytics/analytics/AnalysisService';
import { RuntimeStackTracker } from '../../runtime/contracts/IRuntimeOptions';
import { TimeSpan } from '../../runtime/models/TimeSpan';

/**
 * ProjectionSyncProcess - Bridges the projection pipeline into the real-time tracker.
 *
 * After every segment output this process:
 *  1. Accumulates the segment's metrics into a running collection.
 *  2. Runs AnalysisService.runWorkoutProjections() (workout-level totals) and
 *     runAllProjectionsFromFragments() (per-exercise totals) over all metrics so far.
 *  3. Records each ProjectionResult in the tracker under 'session-totals', which
 *     drives the MetricTrackerCard displayed above the timer.
 *
 * This is a _stateful_ process (it accumulates metrics across segments) but it
 * does not modify the output statement — it is purely a side-effect sink.
 */
export class ProjectionSyncProcess implements IAnalyticsProcess {
  public readonly id = 'projection-sync';

  private allMetrics: MetricContainer = MetricContainer.empty('projection-sync');

  constructor(
    private readonly analysisService: AnalysisService,
    private readonly tracker?: RuntimeStackTracker,
  ) {}

  process(output: IOutputStatement): IOutputStatement {
    if (output.outputType !== 'segment') return output;

    // Accumulate metrics from this segment
    this.allMetrics.merge(output.metrics);

    if (!this.tracker?.recordMetric) return output;

    // Workout-level projections (reps, distance, volume, load, energy)
    const currentMetrics = this.allMetrics.resolve();
    const workoutResults = this.analysisService.runWorkoutProjections(currentMetrics);

    // Per-exercise projections (needs exerciseService set on analysisService)
    const exerciseResults = this.analysisService.runAllProjectionsFromFragments(currentMetrics);

    for (const result of [...workoutResults, ...exerciseResults]) {
      this.tracker.recordMetric('session-totals', result.name, result.value, result.unit);
    }

    return output;
  }

  finalize(): IOutputStatement[] {
    const resolvedMetrics = this.allMetrics.resolve();
    const workoutResults = this.analysisService.runWorkoutProjections(resolvedMetrics);
    const exerciseResults = this.analysisService.runAllProjectionsFromFragments(resolvedMetrics);

    const now = Date.now();
    return [...workoutResults, ...exerciseResults].map(result => {
      // Create a Label metric for the result name so it appears as a row title
      const metrics = MetricContainer.empty(`projection-${result.name}`).add(
        {
          type: MetricType.Label,
          image: result.name,
          value: result.name,
          origin: 'analyzed',
          timestamp: new Date(now)
        },
        {
          type: (result.metricType as MetricType) || MetricType.Metric,
          image: `${result.value} ${result.unit}`,
          value: result.value,
          unit: result.unit,
          origin: 'analyzed',
          timestamp: new Date(now)
        }
      );

      return new OutputStatement({
        outputType: 'analytics',
        timeSpan: new TimeSpan(now, now),
        sourceBlockKey: 'analytics-summary',
        stackLevel: 0,
        metrics
      });
    });
  }
}
