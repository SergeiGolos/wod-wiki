import { describe, expect, it } from 'bun:test';
import { MetricContainer } from '@/core/models/MetricContainer';
import { MetricType } from '@/core/models/Metric';
import { buildWorkoutResults, countSegmentOutputs, prepareRuntimeBlock } from './runtimeTimerModel';
import { frozenNow } from '@/runtime/INowProvider';
import type { ScriptBlock } from '@/components/Editor/types';

function makeBlock(content: string): ScriptBlock {
  return {
    id: 'block-1',
    startLine: 0,
    endLine: 2,
    content,
    state: 'parsed',
    widgetIds: {},
    version: 1,
    createdAt: Date.now(),
  };
}

describe('runtimeTimerModel', () => {
  it('prepares parsed statements without collapsing choices', () => {
    const block = prepareRuntimeBlock(makeBlock('135|185 lbs'));

    expect(block.statements.length).toBeGreaterThan(0);
    expect(block.statements.some(stmt => stmt.metrics.some(m => m.type === MetricType.Choice))).toBe(true);
  });
  it('counts only segment outputs', () => {
    const outputs = [
      { outputType: 'segment' },
      { outputType: 'milestone' },
      { outputType: 'segment' },
    ] as any;

    expect(countSegmentOutputs(outputs)).toBe(2);
  });

  it('counts zero when no segment outputs', () => {
    const outputs = [
      { outputType: 'system' },
      { outputType: 'compiler' },
    ] as any;

    expect(countSegmentOutputs(outputs)).toBe(0);
  });

  it('counts zero for empty outputs array', () => {
    expect(countSegmentOutputs([])).toBe(0);
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
      now: frozenNow(new Date(startTime)),
    });

    expect(results.startTime).toBe(startTime);
    expect(results.duration).toBe(60000);
    expect(results.completed).toBe(true);
    expect(results.logs).toHaveLength(1);
  });

  it('uses Date.now() as startTime fallback when not provided', () => {
    const startTime = Date.now();
    const results = buildWorkoutResults([], {
      elapsedTime: 0,
      completed: false,
      now: frozenNow(new Date(startTime)),
    });

    // startTime should fall back to the provider's now
    expect(results.startTime).toBe(startTime);
    expect(results.endTime).toBe(startTime);
    expect(results.duration).toBe(0);
    expect(results.completed).toBe(false);
    expect(results.logs).toHaveLength(0);
  });

  it('buildWorkoutResults handles zero elapsedTime and incomplete state', () => {
    const results = buildWorkoutResults([], {
      startTime: 1_700_000_000_000,
      elapsedTime: 0,
      now: frozenNow(new Date(1_700_000_000_000)),
      completed: false,
    });

    expect(results.duration).toBe(0);
    expect(results.completed).toBe(false);
    expect(results.logs).toHaveLength(0);
  });
});
