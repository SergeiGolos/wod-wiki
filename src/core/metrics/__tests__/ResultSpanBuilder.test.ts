import { describe, test, expect, beforeEach, jest } from 'vitest';
import { ResultSpanBuilder } from '../ResultSpanBuilder';
import { RuntimeMetric } from '../../RuntimeMetric';
import { MetricValue } from '../../MetricValue';
import { IRuntimeBlock } from '../../IRuntimeBlock';
import { BlockKey } from '../../BlockKey';

describe('ResultSpanBuilder', () => {
  let mockMetrics: RuntimeMetric[];
  let mockBlock: IRuntimeBlock;

  beforeEach(() => {
    // Setup mock metrics
    mockMetrics = [
      {
        sourceId: 'test-source-1',
        effort: 'Pushup',
        values: [
          { type: 'repetitions', value: 10, unit: 'reps' } as MetricValue
        ]
      }
    ];

    // Setup mock block
    mockBlock = {
      blockKey: new BlockKey(),
      blockId: 'test-block-id',
      getIndex: jest.fn().mockReturnValue(1),
      sources: [],
      spans: jest.fn().mockReturnValue([]),
      selectMany: jest.fn(),
      handle: jest.fn(),
      enter: jest.fn(),
      next: jest.fn(),
      leave: jest.fn(),
      onStart: jest.fn(),
      onStop: jest.fn(),
      composeMetrics: jest.fn()
    };
    
    mockBlock.blockKey.push = jest.fn();
    mockBlock.blockKey.index = 1;
  });

  test('Create method initializes a new span with metrics', () => {
    const builder = new ResultSpanBuilder();
    builder.Create(mockMetrics);
    
    const span = builder.Current();
    
    expect(span.metrics).toEqual(mockMetrics);
    expect(span.timeSpans).toEqual([]);
  });

  test('Inherit method adds new metric values', () => {
    const builder = new ResultSpanBuilder();
    builder.Create(mockMetrics);
    
    const newValue: MetricValue = { type: 'distance', value: 100, unit: 'meters' };
    builder.Inherit(newValue);
    
    const span = builder.Current();
    
    expect(span.metrics[0].values).toContainEqual(newValue);
  });

  test('Inherit method does not duplicate existing metric values', () => {
    const builder = new ResultSpanBuilder();
    builder.Create(mockMetrics);
    
    const existingValue: MetricValue = { type: 'repetitions', value: 10, unit: 'reps' };
    builder.Inherit(existingValue);
    
    const span = builder.Current();
    
    // Should still only have one 'repetitions' value
    expect(span.metrics[0].values.filter(v => v.type === 'repetitions')).toHaveLength(1);
  });

  test('Override method replaces existing metric values', () => {
    const builder = new ResultSpanBuilder();
    builder.Create(mockMetrics);
    
    const newValue: MetricValue = { type: 'repetitions', value: 20, unit: 'reps' };
    builder.Override(newValue);
    
    const span = builder.Current();
    
    expect(span.metrics[0].values).toContainEqual(newValue);
    expect(span.metrics[0].values.filter(v => v.type === 'repetitions')).toHaveLength(1);
    expect(span.metrics[0].values[0].value).toBe(20);
  });

  test('Start method adds a timespan with start event', () => {
    const builder = new ResultSpanBuilder();
    builder.Create(mockMetrics);
    builder.Start();
    
    const span = builder.Current();
    
    expect(span.timeSpans).toHaveLength(1);
    expect(span.timeSpans[0].start).toBeDefined();
    expect(span.timeSpans[0].start?.name).toBe('span_started');
    expect(span.timeSpans[0].stop).toBeUndefined();
  });

  test('Stop method adds stop event to the latest timespan', () => {
    const builder = new ResultSpanBuilder();
    builder.Create(mockMetrics);
    builder.Start();
    builder.Stop();
    
    const span = builder.Current();
    
    expect(span.timeSpans[0].stop).toBeDefined();
    expect(span.timeSpans[0].stop?.name).toBe('span_stopped');
  });

  test('ForBlock method associates spans with a block', () => {
    const builder = new ResultSpanBuilder();
    builder.Create(mockMetrics);
    builder.Start();
    builder.ForBlock(mockBlock);
    
    const span = builder.Current();
    
    expect(span.blockKey).toBe(mockBlock.blockKey);
    expect(span.index).toBe(mockBlock.blockKey.index);
    expect(span.timeSpans[0].blockKey).toBe(mockBlock.blockKey.toString());
  });

  test('All method returns all spans', () => {
    const builder = new ResultSpanBuilder();
    builder.Create([mockMetrics[0]]);
    builder.Start();
    
    // Create another span
    builder.Create([{
      sourceId: 'test-source-2',
      effort: 'Squat',
      values: [
        { type: 'repetitions', value: 15, unit: 'reps' } as MetricValue
      ]
    }]);
    builder.Start();
    
    const spans = builder.All();
    
    expect(spans).toHaveLength(2);
    expect(spans[0].metrics[0].effort).toBe('Pushup');
    expect(spans[1].metrics[0].effort).toBe('Squat');
  });

  test('Current method throws error if no span exists', () => {
    const builder = new ResultSpanBuilder();
    
    expect(() => builder.Current()).toThrow("No current span exists");
  });

  test('Inherit method throws error if no span exists', () => {
    const builder = new ResultSpanBuilder();
    
    expect(() => builder.Inherit({ type: 'repetitions', value: 10, unit: 'reps' }))
      .toThrow("No current span exists");
  });

  test('Methods can be chained for fluent API', () => {
    const builder = new ResultSpanBuilder();
    
    const span = builder
      .Create(mockMetrics)
      .Start()
      .Inherit({ type: 'distance', value: 100, unit: 'meters' })
      .Stop()
      .ForBlock(mockBlock)
      .Current();
    
    expect(span.metrics[0].values).toHaveLength(2);
    expect(span.timeSpans[0].start).toBeDefined();
    expect(span.timeSpans[0].stop).toBeDefined();
    expect(span.blockKey).toBe(mockBlock.blockKey);
  });
});