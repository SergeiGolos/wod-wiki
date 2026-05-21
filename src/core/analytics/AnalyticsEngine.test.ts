import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { AnalyticsEngine } from './AnalyticsEngine';
import { IOutputStatement, OutputStatement } from '../models/OutputStatement';
import { MetricContainer } from '../models/MetricContainer';
import { IAnalyticsStage } from './IAnalyticsStage';
import { IRealtimeProcessor } from './IRealtimeProcessor';
import { ISummaryProcessor } from './ISummaryProcessor';
import { ProjectionResult } from './ProjectionResult';
import { MetricType } from '../models/Metric';
import { IRuntimeStackTracker } from '../contracts/RuntimeStackTracker';

function makeSegmentOutput(id: string, extraMetrics?: { type: MetricType; value: unknown }[]): IOutputStatement {
  const metrics = MetricContainer.empty(id);
  if (extraMetrics) {
    for (const m of extraMetrics) {
      metrics.add({
        type: m.type,
        image: String(m.value),
        value: m.value,
        origin: 'runtime',
        timestamp: new Date(0),
      });
    }
  }
  return new OutputStatement({
    outputType: 'segment',
    sourceBlockKey: id,
    stackLevel: 0,
    timeSpan: { started: 0, ended: 1000 },
    metrics,
    isLeaf: true,
  });
}

function makeSystemOutput(id: string): IOutputStatement {
  return new OutputStatement({
    outputType: 'system',
    sourceBlockKey: id,
    stackLevel: 0,
    timeSpan: { started: 0, ended: 1000 },
    metrics: MetricContainer.empty(id),
    isLeaf: true,
  });
}

describe('AnalyticsEngine', () => {
  beforeEach(() => {
    OutputStatement.resetIdCounter();
  });

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

  describe('processor split behavior', () => {
    it('realtime processors enrich per-segment outputs', () => {
      const engine = new AnalyticsEngine();
      const enricher: IRealtimeProcessor = {
        id: 'enrich-reps',
        process: (out: IOutputStatement) => {
          if (out.outputType === 'segment') {
            out.metrics.add({
              type: MetricType.Rep,
              image: '10',
              value: 10,
              origin: 'analyzed',
              timestamp: new Date(0),
            });
          }
          return out;
        },
      };

      engine.addRealtimeProcessor(enricher);
      const result = engine.run(makeSegmentOutput('seg1'));

      expect(result.getMetric(MetricType.Rep)?.value).toBe(10);
    });

    it('summary processors receive accumulated segment history', () => {
      const engine = new AnalyticsEngine();
      let receivedOutputs: IOutputStatement[] = [];

      const summarizer: ISummaryProcessor = {
        id: 'count-segments',
        summarize: (outputs: IOutputStatement[]): ProjectionResult[] => {
          receivedOutputs = outputs;
          return [{
            name: 'Segment Count',
            value: outputs.length,
            unit: 'segments',
            timeSpan: { started: 0, ended: 1000 },
          }];
        },
      };

      engine.addSummaryProcessor(summarizer);
      engine.run(makeSegmentOutput('s1'));
      engine.run(makeSegmentOutput('s2'));
      engine.run(makeSegmentOutput('s3'));
      engine.finalize();

      expect(receivedOutputs).toHaveLength(3);
    });

    it('does not accumulate non-segment outputs in history', () => {
      const engine = new AnalyticsEngine();
      let receivedOutputs: IOutputStatement[] = [];

      const summarizer: ISummaryProcessor = {
        id: 'count-segments',
        summarize: (outputs: IOutputStatement[]): ProjectionResult[] => {
          receivedOutputs = outputs;
          return [];
        },
      };

      engine.addSummaryProcessor(summarizer);
      engine.run(makeSegmentOutput('s1'));
      engine.run(makeSystemOutput('sys1'));
      engine.run(makeSegmentOutput('s2'));
      engine.finalize();

      expect(receivedOutputs).toHaveLength(2);
      expect(receivedOutputs.every(o => o.outputType === 'segment')).toBe(true);
    });

    it('isolates realtime processor errors so others continue', () => {
      const engine = new AnalyticsEngine();
      const order: string[] = [];
      const errorSpy = mock(() => {});
      const originalError = console.error;
      console.error = errorSpy as unknown as typeof console.error;

      try {
        const bad: IRealtimeProcessor = {
          id: 'bad',
          process: () => {
            order.push('bad');
            throw new Error('intentional failure');
          },
        };
        const good: IRealtimeProcessor = {
          id: 'good',
          process: (out: IOutputStatement) => {
            order.push('good');
            return out;
          },
        };

        engine.addRealtimeProcessor(bad);
        engine.addRealtimeProcessor(good);
        engine.run(makeSegmentOutput('s1'));

        expect(order).toEqual(['bad', 'good']);
        expect(errorSpy).toHaveBeenCalledTimes(1);
      } finally {
        console.error = originalError;
      }
    });

    it('isolates summary processor errors so others continue', () => {
      const engine = new AnalyticsEngine();
      const errorSpy = mock(() => {});
      const originalError = console.error;
      console.error = errorSpy as unknown as typeof console.error;

      try {
        const bad: ISummaryProcessor = {
          id: 'bad-sum',
          summarize: () => {
            throw new Error('intentional failure');
          },
        };
        const good: ISummaryProcessor = {
          id: 'good-sum',
          summarize: (): ProjectionResult[] => [{
            name: 'Good',
            value: 1,
            unit: 'x',
            timeSpan: { started: 0, ended: 1000 },
          }],
        };

        engine.addSummaryProcessor(bad);
        engine.addSummaryProcessor(good);
        engine.run(makeSegmentOutput('s1'));
        const results = engine.finalize();

        expect(results).toHaveLength(1);
        expect(results[0].outputType).toBe('analytics');
        expect(errorSpy).toHaveBeenCalledTimes(1);
      } finally {
        console.error = originalError;
      }
    });

    it('pushes live summary projections to tracker after each segment', () => {
      const engine = new AnalyticsEngine();
      const recordedMetrics: { owner: string; key: string; value: unknown; unit?: string }[] = [];

      const tracker: IRuntimeStackTracker = {
        recordMetric: (owner, key, value, unit) => {
          recordedMetrics.push({ owner, key, value, unit });
        },
      } as IRuntimeStackTracker;

      const summary: ISummaryProcessor = {
        id: 'live-sum',
        summarize: (outputs: IOutputStatement[]): ProjectionResult[] => [{
          name: 'Count',
          value: outputs.length,
          unit: 'segments',
          timeSpan: { started: 0, ended: 1000 },
        }],
      };

      engine.setTracker(tracker);
      engine.addSummaryProcessor(summary);
      engine.run(makeSegmentOutput('s1'));
      engine.run(makeSegmentOutput('s2'));

      expect(recordedMetrics).toHaveLength(2);
      expect(recordedMetrics[0]).toEqual({ owner: 'session-totals', key: 'Count', value: 1, unit: 'segments' });
      expect(recordedMetrics[1]).toEqual({ owner: 'session-totals', key: 'Count', value: 2, unit: 'segments' });
    });

    it('finalize produces analytics OutputStatements with metrics', () => {
      const engine = new AnalyticsEngine();
      const summary: ISummaryProcessor = {
        id: 'sum',
        summarize: (): ProjectionResult[] => [{
          name: 'Total',
          value: 99,
          unit: 'reps',
          metricType: MetricType.Rep,
          timeSpan: { started: 0, ended: 1000 },
        }],
      };

      engine.addSummaryProcessor(summary);
      engine.run(makeSegmentOutput('s1'));
      const results = engine.finalize();

      expect(results).toHaveLength(1);
      expect(results[0].outputType).toBe('analytics');
      expect(results[0].sourceBlockKey).toBe('analytics-summary');
      expect(results[0].getMetric(MetricType.Label)?.value).toBe('Total');
      expect(results[0].getMetric(MetricType.Rep)?.value).toBe(99);
    });

    it('passes through analyzed-estimated origin from ProjectionResult', () => {
      const engine = new AnalyticsEngine();
      const summary: ISummaryProcessor = {
        id: 'est-sum',
        summarize: (_outputs: IOutputStatement[]): ProjectionResult[] => {
          return [{
            name: 'Estimated Metric',
            value: 50,
            unit: 'pts',
            origin: 'analyzed-estimated',
            timeSpan: { started: 0, ended: 1000 },
          }];
        },
      };

      engine.addSummaryProcessor(summary);
      engine.run(makeSegmentOutput('s1'));
      const results = engine.finalize();

      expect(results).toHaveLength(1);
      const metrics = results[0].metrics?.rawMetrics ?? [];
      const valueMetric = metrics.find((m: any) => m.type !== 'label');
      expect(valueMetric?.origin).toBe('analyzed-estimated');
    });

    it('defaults to analyzed origin when ProjectionResult has no origin', () => {
      const engine = new AnalyticsEngine();
      const summary: ISummaryProcessor = {
        id: 'normal-sum',
        summarize: (_outputs: IOutputStatement[]): ProjectionResult[] => {
          return [{
            name: 'Normal Metric',
            value: 42,
            unit: 'x',
            timeSpan: { started: 0, ended: 1000 },
          }];
        },
      };

      engine.addSummaryProcessor(summary);
      engine.run(makeSegmentOutput('s1'));
      const results = engine.finalize();

      const metrics = results[0].metrics?.rawMetrics ?? [];
      const valueMetric = metrics.find((m: any) => m.type !== 'label');
      expect(valueMetric?.origin).toBe('analyzed');
    });
  });
});
