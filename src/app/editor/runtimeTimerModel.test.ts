import { describe, expect, it } from 'bun:test';
import { MetricContainer } from '@/core/models/MetricContainer';
import { buildWorkoutResults, countSegmentOutputs } from './runtimeTimerModel';

describe('runtimeTimerModel', () => {
  it('counts only segment outputs', () => {
    const outputs = [
      { outputType: 'segment' },
      { outputType: 'milestone' },
      { outputType: 'segment' },
    ] as any;

    expect(countSegmentOutputs(outputs)).toBe(2);
  });

  it('builds persisted workout results from runtime outputs', () => {
    const startTime = 1_700_000_000_000;
    const outputs = [
      {
        outputType: 'segment',
        id: 1,
        timeSpan: { started: 0, ended: 60 },
        spans: [],
        elapsed: 60000,
        total: 60000,
        sourceBlockKey: 'block-1',
        stackLevel: 0,
        metrics: new MetricContainer(),
        metricMeta: new Map(),
        order: 0,
        line: 1,
        raw: '5:00 Run',
        value: '5:00 Run',
        parentId: null,
        fragments: [],
        getMetric: () => undefined,
        getMetricsByType: () => [],
        getAllMetricsByType: () => [],
        hasMetric: () => false,
        hasAnyMetric: () => false,
        getPrimaryMetric: () => undefined,
        getDisplayMetrics: () => [],
      },
    ] as any;

    const results = buildWorkoutResults(outputs, {
      startTime,
      elapsedTime: 60000,
      completed: true,
    });

    expect(results.startTime).toBe(startTime);
    expect(results.duration).toBe(60000);
    expect(results.completed).toBe(true);
    expect(results.logs).toHaveLength(1);
  });
});
