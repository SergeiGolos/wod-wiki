import { IAnalyticsEngine } from '../contracts/IAnalyticsEngine';
import type { IRealtimeProcessor } from './IRealtimeProcessor';
import type { ISummaryProcessor } from './ISummaryProcessor';
import { IOutputStatement, OutputStatement } from '../models/OutputStatement';
import { IMetric, MetricType } from '../models/Metric';
import { MetricContainer } from '../models/MetricContainer';
import { ProjectionResult } from './ProjectionResult';

export class AnalyticsEngine implements IAnalyticsEngine {
  private realtimeProcessors: IRealtimeProcessor[] = [];
  private summaryProcessors: ISummaryProcessor[] = [];
  private outputHistory: IOutputStatement[] = [];
  /** Emits a live 'analytics' output per segment so the UI updates in real time. */
  private _onLiveOutput?: (output: IOutputStatement) => void;

  /** Wire a sink for live analytics outputs (one per segment, as projections update). */
  setLiveOutputEmitter(emit: (output: IOutputStatement) => void): void {
    this._onLiveOutput = emit;
  }

  addRealtimeProcessor(processor: IRealtimeProcessor): void {
    this.realtimeProcessors.push(processor);
  }

  addSummaryProcessor(processor: ISummaryProcessor): void {
    this.summaryProcessors.push(processor);
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

    // Accumulate segment outputs for summary processors, and emit a live
    // 'analytics' output so session-totals reach the UI over the output stream
    // (no separate tracker channel). Bounded recursion: the emitted 'analytics'
    // output is not a 'segment', so re-entering run() does not re-trigger this.
    if (current.outputType === 'segment') {
      this.outputHistory.push(current);
      if (this._onLiveOutput) {
        const now = Date.now();
        for (const stmt of this._buildProjectionOutputs(this._runSummaries(), now)) {
          this._onLiveOutput(stmt);
        }
      }
    }

    return current;
  }

  finalize(): IOutputStatement[] {
    return this._buildProjectionOutputs(this._runSummaries(), Date.now());
  }

  /** Build one 'analytics' OutputStatement per summary projection. */
  private _buildProjectionOutputs(projections: ProjectionResult[], now: number): IOutputStatement[] {
    return projections.map(p => {
      const metrics = MetricContainer.empty(`projection-${p.name}`).add(
        {
          type: MetricType.Label,
          image: p.name,
          value: p.name,
          origin: p.origin ?? 'analyzed',
          timestamp: new Date(now),
        },
        // Projection value metric — constructed from a ProjectionResult, whose
        // shape the compiler can't verify against IMetric, hence the boundary cast.
        {
          type: (p.metricType as MetricType) || MetricType.Metric,
          image: `${p.value} ${p.unit}`,
          value: p.value,
          unit: p.unit,
          origin: p.origin ?? 'analyzed',
          timestamp: new Date(now),
          ...(p.metadata ? { metadata: p.metadata } : {}),
        } as unknown as IMetric
      );
      return new OutputStatement({
        outputType: 'analytics',
        timeSpan: { started: now, ended: now },
        sourceBlockKey: 'analytics-summary',
        stackLevel: 0,
        metrics,
      });
    });
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
