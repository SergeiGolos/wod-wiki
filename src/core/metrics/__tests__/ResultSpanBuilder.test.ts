import { describe, test, expect, beforeEach, jest } from 'vitest';
import { ResultSpanBuilder, SpanNode } from '../ResultSpanBuilder';
import { RuntimeMetric } from '../../RuntimeMetric';
import { MetricValue } from '../../MetricValue';
import { IRuntimeBlock } from '../../IRuntimeBlock';
import { RuntimeSpan } from '../../RuntimeSpan';
import { BlockKey } from '../../BlockKey';

describe('ResultSpanBuilder', () => {
  let builder: ResultSpanBuilder;
  let mockMetrics: RuntimeMetric[];
  let mockBlock: IRuntimeBlock;
  let mockSpan: RuntimeSpan;

  beforeEach(() => {
    builder = new ResultSpanBuilder();
    
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
    const blockKey = new BlockKey();
    blockKey.index = 1;
    
    mockBlock = {
      blockKey,
      blockId: 'test-block-id',
      getIndex: jest.fn().mockReturnValue(1),
      sources: [],
      spans: jest.fn(),
      selectMany: jest.fn(),
      handle: jest.fn(),
      enter: jest.fn(),
      next: jest.fn(),
      leave: jest.fn(),
      onStart: jest.fn(),
      onStop: jest.fn(),
      composeMetrics: jest.fn()
    };
    
    // Setup mock span
    mockSpan = new RuntimeSpan();
    mockSpan.blockKey = blockKey;
    mockSpan.metrics = [...mockMetrics];
    mockSpan.timeSpans = [{
      start: { name: 'test_start', timestamp: new Date(), blockKey: blockKey.toString() },
      blockKey: blockKey.toString()
    }];
    
    // Configure mock block to return our mock span
    (mockBlock.spans as jest.Mock).mockReturnValue([mockSpan]);
  });

  test('Create method initializes a new span with metrics', () => {
    builder.Create(mockMetrics);
    
    const span = builder.Current();
    expect(span.metrics).toEqual(mockMetrics);
  });

  test('Builder methods can be chained', () => {
    const span = builder
      .Create(mockMetrics)
      .Start()
      .Override({ type: 'repetitions', value: 20, unit: 'reps' })
      .Current();
    
    expect(span.metrics[0].values[0].value).toBe(20);
    expect(span.timeSpans).toHaveLength(1);
  });

  test('registerSpan adds a span to the registry', () => {
    builder.registerSpan(mockSpan);
    
    const spans = builder.getAllSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0]).toBe(mockSpan);
  });

  test('registerBlockSpans adds all spans from a block', () => {
    builder.registerBlockSpans(mockBlock);
    
    const spans = builder.getAllSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0]).toBe(mockSpan);
    expect(mockBlock.spans).toHaveBeenCalled();
  });

  test('getSpansByBlockKey filters spans by block key', () => {
    builder.registerSpan(mockSpan);
    
    const filteredSpans = builder.getSpansByBlockKey(mockSpan.blockKey.toString());
    expect(filteredSpans).toHaveLength(1);
    expect(filteredSpans[0]).toBe(mockSpan);
  });

  test('clear method resets both spans and builder', () => {
    // Add a span to the registry
    builder.registerSpan(mockSpan);
    expect(builder.getAllSpans()).toHaveLength(1);
    
    // Create a span with the builder
    builder.Create(mockMetrics).Start();
    expect(builder.All()).toHaveLength(1);
    
    // Clear the builder
    builder.clear();
    
    // Both spans and builder should be reset
    expect(builder.getAllSpans()).toHaveLength(0);
    
    // The builder should create a new span after clearing
    expect(() => builder.Current()).toThrow("No current span exists");
  });

  test('All method returns spans from the builder', () => {
    // Create two spans with the builder
    builder
      .Create([mockMetrics[0]])
      .Start();
    
    builder
      .Create([{
        sourceId: 'test-source-2',
        effort: 'Squat',
        values: [
          { type: 'repetitions', value: 15, unit: 'reps' } as MetricValue
        ]
      }])
      .Start();
    
    const builderSpans = builder.All();
    expect(builderSpans).toHaveLength(2);
    expect(builderSpans[0].metrics[0].effort).toBe('Pushup');
    expect(builderSpans[1].metrics[0].effort).toBe('Squat');
  });
});