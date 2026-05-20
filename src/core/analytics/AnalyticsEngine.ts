import { IAnalyticsEngine } from '../contracts/IAnalyticsEngine';
import { IAnalyticsStage } from './IAnalyticsStage';
import type { IRealtimeProcessor } from './IRealtimeProcessor';
import type { ISummaryProcessor } from './ISummaryProcessor';
import { IOutputStatement, OutputStatement } from '../models/OutputStatement';
import { MetricType } from '../models/Metric';
import { MetricContainer } from '../models/MetricContainer';
import { IRuntimeStackTracker } from '../contracts/RuntimeStackTracker';
import { ProjectionResult } from './ProjectionResult';

export class AnalyticsEngine implements IAnalyticsEngine {
  private realtimeProcessors: IRealtimeProcessor[] = [];
  private summaryProcessors: ISummaryProcessor[] = [];
  private outputHistory: IOutputStatement[] = [];
  private tracker?: IRuntimeStackTracker;

  setTracker(tracker: IRuntimeStackTracker): void {
    this.tracker = tracker;
  }

  addRealtimeProcessor(processor: IRealtimeProcessor): void {
    this.realtimeProcessors.push(processor);
  }

  addSummaryProcessor(processor: ISummaryProcessor): void {
    this.summaryProcessors.push(processor);
  }

  /**
   * @deprecated Use {@link addRealtimeProcessor} and {@link addSummaryProcessor}
   *   instead. This shim routes legacy stages into the typed lists for backward
   *   compatibility during migration.
   */
  addStage(stage: IAnalyticsStage): void {
    if (!stage.enrich && !stage.project) {
      console.warn(`[AnalyticsEngine] Stage '${stage.id}' implements neither enrich nor project — skipping.`);
      return;
    }

    if (stage.enrich) {
      const shim: IRealtimeProcessor = {
        id: stage.id,
        process: (output: IOutputStatement) => stage.enrich!(output),
      };
      this.addRealtimeProcessor(shim);
    }

    if (stage.project) {
      const shim: ISummaryProcessor = {
        id: stage.id,
        summarize: (outputs: IOutputStatement[]) => stage.project!(outputs),
      };
      this.addSummaryProcessor(shim);
    }
  }

  run(output: IOutputStatement): IOutputStatement {
    // Phase 1: realtime enrichment — per-segment metric derivation
    let current = output;
    for (const processor of this.realtimeProcessors) {
      try {
        current = processor.process(current);
      } catch (err) {
        console.error(`[AnalyticsEngine] realtime error in '${processor.id}':`, err);
      }
    }

    // Accumulate segment outputs for summary processors
    if (current.outputType === 'segment') {
      this.outputHistory.push(current);

      // Phase 2: live summary update — runs after every new segment
      if (this.tracker?.recordMetric) {
        const projections = this._runSummaries();
        for (const p of projections) {
          this.tracker.recordMetric('session-totals', p.name, p.value, p.unit);
        }
      }
    }

    return current;
  }

  finalize(): IOutputStatement[] {
    const projections = this._runSummaries();
    const now = Date.now();

    const results: IOutputStatement[] = projections.map(p => {
      const metrics = MetricContainer.empty(`projection-${p.name}`).add(
        {
          type: MetricType.Label,
          image: p.name,
          value: p.name,
          origin: p.origin ?? 'analyzed',
          timestamp: new Date(now),
        },
        {
          type: (p.metricType as MetricType) || MetricType.Metric,
          image: `${p.value} ${p.unit}`,
          value: p.value,
          unit: p.unit,
          origin: p.origin ?? 'analyzed',
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

  /** Run all summary processors over current output history. */
  private _runSummaries(): ProjectionResult[] {
    const results: ProjectionResult[] = [];
    for (const processor of this.summaryProcessors) {
      try {
        results.push(...processor.summarize(this.outputHistory));
      } catch (err) {
        console.error(`[AnalyticsEngine] summary error in '${processor.id}':`, err);
      }
    }
    return results;
  }
}
