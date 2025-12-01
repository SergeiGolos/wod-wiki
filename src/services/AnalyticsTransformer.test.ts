import { describe, it, expect, vi } from 'vitest';
import { transformRuntimeToAnalytics } from './AnalyticsTransformer';
import { ScriptRuntime } from '../runtime/ScriptRuntime';
import { ExecutionSpan } from '../runtime/models/ExecutionSpan';

describe('AnalyticsTransformer', () => {
  it('returns empty result when runtime is null', () => {
    const result = transformRuntimeToAnalytics(null);
    expect(result.data).toEqual([]);
    expect(result.segments).toEqual([]);
    expect(result.groups).toEqual([]);
  });

  it('returns empty result when runtime has no logs or blocks', () => {
    const runtime = {
      executionLog: [],
      stack: { blocks: [] }
    } as unknown as ScriptRuntime;

    const result = transformRuntimeToAnalytics(runtime);
    expect(result.data).toEqual([]);
    expect(result.segments).toEqual([]);
    expect(result.groups).toEqual([]);
  });

  it('transforms execution logs into segments', () => {
    const startTime = Date.now();
    const runtime = {
      executionLog: [
        {
          id: 'block-1',
          blockId: 'block-1',
          label: 'Warmup',
          type: 'group',
          startTime: startTime,
          endTime: startTime + 60000,
          parentSpanId: null,
          status: 'completed',
          metrics: {},
          segments: []
        } as ExecutionSpan
      ],
      stack: { blocks: [] }
    } as unknown as ScriptRuntime;

    const result = transformRuntimeToAnalytics(runtime);

    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].name).toBe('Warmup');
    expect(result.segments[0].duration).toBe(60);
    expect(result.data.length).toBeGreaterThan(0);
  });
});
