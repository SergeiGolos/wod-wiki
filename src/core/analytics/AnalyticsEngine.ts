import { IAnalyticsEngine } from '../contracts/IAnalyticsEngine';
import { IAnalyticsStage } from './IAnalyticsStage';
import { IOutputStatement, OutputStatement } from '../models/OutputStatement';
import { MetricType } from '../models/Metric';
import { MetricContainer } from '../models/MetricContainer';
import { TimeSpan } from '../models/TimeSpan';
import { RuntimeStackTracker } from '../contracts/RuntimeStackTracker';
import { ProjectionResult } from './ProjectionResult';

export class AnalyticsEngine implements IAnalyticsEngine {
  private stages: IAnalyticsStage[] = [];
  private outputHistory: IOutputStatement[] = [];
  private tracker?: RuntimeStackTracker;

  setTracker(tracker: RuntimeStackTracker): void {
    this.tracker = tracker;
  }

  addStage(stage: IAnalyticsStage): void {
    if (!stage.enrich && !stage.project) {
      console.warn(`[AnalyticsEngine] Stage '${stage.id}' implements neither enrich nor project — skipping.`);
      return;
    }
    this.stages.push(stage);
  }

  run(output: IOutputStatement): IOutputStatement {
    // Phase 1: enrich — per-segment metric derivation
    let current = output;
    for (const stage of this.stages) {
      if (stage.enrich) {
        try {
          current = stage.enrich(current);
        } catch (err) {
          console.error(`[AnalyticsEngine] enrich error in '${stage.id}':`, err);
        }
      }
    }

    // Accumulate segment outputs for projection
    if (current.outputType === 'segment') {
      this.outputHistory.push(current);

      // Phase 2: live projection update — runs after every new segment
      if (this.tracker?.recordMetric) {
        const projections = this._runProjections();
        for (const p of projections) {
          this.tracker.recordMetric('session-totals', p.name, p.value, p.unit);
        }
      }
    }

    return current;
  }

  finalize(): IOutputStatement[] {
    const projections = this._runProjections();
    const now = Date.now();

    const results: IOutputStatement[] = projections.map(p => {
      const metrics = MetricContainer.empty(`projection-${p.name}`).add(
        {
          type: MetricType.Label,
          image: p.name,
          value: p.name,
          origin: 'analyzed',
          timestamp: new Date(now),
        },
        {
          type: (p.metricType as MetricType) || MetricType.Metric,
          image: `${p.value} ${p.unit}`,
          value: p.value,
          unit: p.unit,
          origin: 'analyzed',
          timestamp: new Date(now),
        }
      );
      return new OutputStatement({
        outputType: 'analytics',
        timeSpan: { started: now, ended: now },
        sourceBlockKey: 'analytics-summary',
        stackLevel: 0,
        metrics,
      });
    });

    return results;
  }

  /** Run all project() stages over current output history. */
  private _runProjections(): ProjectionResult[] {
    const results: ProjectionResult[] = [];
    for (const stage of this.stages) {
      if (stage.project) {
        try {
          results.push(...stage.project(this.outputHistory));
        } catch (err) {
          console.error(`[AnalyticsEngine] project error in '${stage.id}':`, err);
        }
      }
    }
    return results;
  }
}
