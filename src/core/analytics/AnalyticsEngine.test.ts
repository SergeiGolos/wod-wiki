import { describe, it, expect, mock } from 'bun:test';
import { AnalyticsEngine } from './AnalyticsEngine';
import { IOutputStatement, OutputStatement } from '../models/OutputStatement';
import { MetricContainer } from '../models/MetricContainer';
import { IAnalyticsStage } from './IAnalyticsStage';
import { IRealtimeProcessor } from './IRealtimeProcessor';
import { ISummaryProcessor } from './ISummaryProcessor';
import { ProjectionResult } from './ProjectionResult';

function makeSegmentOutput(id: string): IOutputStatement {
  return new OutputStatement({
    outputType: 'segment',
    sourceBlockKey: id,
    stackLevel: 0,
    timeSpan: { started: 0, ended: 1000 },
    metrics: MetricContainer.empty(id),
    isLeaf: true,
  });
}

describe('AnalyticsEngine', () => {
  it('should run realtime processors in order on run()', () => {
    const engine = new AnalyticsEngine();
    const order: string[] = [];

    const p1: IRealtimeProcessor = {
      id: 'p1',
      process: (out: IOutputStatement) => {
        order.push('p1');
        return out;
      },
    };
    const p2: IRealtimeProcessor = {
      id: 'p2',
      process: (out: IOutputStatement) => {
        order.push('p2');
        return out;
      },
    };

    engine.addRealtimeProcessor(p1);
    engine.addRealtimeProcessor(p2);
    engine.run(makeSegmentOutput('test'));

    expect(order).toEqual(['p1', 'p2']);
  });

  it('should run summary processors on finalize()', () => {
    const engine = new AnalyticsEngine();
    let summarized = false;

    const summary: ISummaryProcessor = {
      id: 'sum1',
      summarize: (_outputs: IOutputStatement[]): ProjectionResult[] => {
        summarized = true;
        return [{
          name: 'Total Reps',
          value: 42,
          unit: 'reps',
          timeSpan: { started: 0, ended: 1000 },
        }];
      },
    };

    engine.addSummaryProcessor(summary);
    engine.run(makeSegmentOutput('s1'));
    const results = engine.finalize();

    expect(summarized).toBe(true);
    expect(results).toHaveLength(1);
    expect(results[0].outputType).toBe('analytics');
  });

  it('should route legacy IAnalyticsStage through addStage shim', () => {
    const engine = new AnalyticsEngine();
    const order: string[] = [];

    const stage: IAnalyticsStage = {
      id: 'legacy',
      enrich: (out: IOutputStatement) => {
        order.push('enrich');
        return out;
      },
      project: (_outputs: IOutputStatement[]): ProjectionResult[] => {
        order.push('project');
        return [{
          name: 'Legacy',
          value: 1,
          unit: 'x',
          timeSpan: { started: 0, ended: 1000 },
        }];
      },
    };

    engine.addStage(stage);
    engine.run(makeSegmentOutput('s1'));
    engine.finalize();

    expect(order).toEqual(['enrich', 'project']);
  });

  it('should skip legacy stage with neither enrich nor project', () => {
    const engine = new AnalyticsEngine();
    const warnSpy = mock(() => {});
    const originalWarn = console.warn;
    console.warn = warnSpy as unknown as typeof console.warn;

    try {
      engine.addStage({ id: 'noop' } as IAnalyticsStage);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    } finally {
      console.warn = originalWarn;
    }
  });
});
