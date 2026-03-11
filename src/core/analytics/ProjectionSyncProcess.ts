import { IAnalyticsProcess } from '../contracts/IAnalyticsEngine';
import { IOutputStatement } from '../models/OutputStatement';
import { IMetric } from '../models/Metric';
import { AnalysisService } from '../../timeline/analytics/analytics/AnalysisService';
import { RuntimeStackTracker } from '../../runtime/contracts/IRuntimeOptions';

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

  private allMetrics: IMetric[] = [];

  constructor(
    private readonly analysisService: AnalysisService,
    private readonly tracker?: RuntimeStackTracker,
  ) {}

  process(output: IOutputStatement): IOutputStatement {
    if (output.outputType !== 'segment') return output;

    // Accumulate metrics from this segment
    this.allMetrics.push(...output.metrics);

    if (!this.tracker?.recordMetric) return output;

    // Workout-level projections (reps, distance, volume, load, energy)
    const workoutResults = this.analysisService.runWorkoutProjections(this.allMetrics);

    // Per-exercise projections (needs exerciseService set on analysisService)
    const exerciseResults = this.analysisService.runAllProjectionsFromFragments(this.allMetrics);

    for (const result of [...workoutResults, ...exerciseResults]) {
      this.tracker.recordMetric('session-totals', result.name, result.value, result.unit);
    }

    return output;
  }
}
