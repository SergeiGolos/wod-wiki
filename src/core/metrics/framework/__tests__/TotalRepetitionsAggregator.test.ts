import { describe, it, expect } from 'vitest';
import { TotalRepetitionsAggregator } from '../aggregators/TotalRepetitionsAggregator';
import { SpanFilters } from '../utilities/SpanFilters';
import { MetricExtractors } from '../utilities/MetricExtractors';
import { SpanCalculators } from '../utilities/SpanCalculators';
import { MetricFactory } from '../utilities/MetricFactory';
import { ResultSpan } from '../../../ResultSpan';
import { MetricsContext } from '../types';

describe('TotalRepetitionsAggregator', () => {
  let aggregator: TotalRepetitionsAggregator;
  let mockContext: MetricsContext;

  beforeEach(() => {
    const filters = new SpanFilters();
    const extractors = new MetricExtractors();
    const calculators = new SpanCalculators();
    const factory = new MetricFactory();

    aggregator = new TotalRepetitionsAggregator(
      'total-reps',
      'Total Repetitions',
      filters,
      extractors,
      calculators,
      factory,
      'basic'
    );

    // Create mock spans with repetition data
    const span1 = new ResultSpan({
      metrics: [{
        sourceId: 'test',
        effort: 'pushups',
        values: [{ type: 'repetitions', value: 10, unit: 'reps' }]
      }],
      timeSpans: []
    } as any);

    const span2 = new ResultSpan({
      metrics: [{
        sourceId: 'test',
        effort: 'squats',
        values: [{ type: 'repetitions', value: 15, unit: 'reps' }]
      }],
      timeSpans: []
    } as any);

    const span3 = new ResultSpan({
      metrics: [{
        sourceId: 'test',
        effort: 'running',
        values: [{ type: 'distance', value: 100, unit: 'meters' }]
      }],
      timeSpans: []
    } as any);

    mockContext = {
      spans: [span1, span2, span3]
    };
  });

  it('should aggregate total repetitions correctly', () => {
    const results = aggregator.aggregate(mockContext);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      id: 'total-reps',
      displayName: 'Total Repetitions',
      data: { total: 25 }, // 10 + 15
      unit: 'repetitions',
      category: 'basic'
    });
  });

  it('should return empty array when no repetition spans exist', () => {
    const contextWithoutReps = {
      spans: [new ResultSpan({
        metrics: [{
          sourceId: 'test',
          effort: 'running',
          values: [{ type: 'distance', value: 100, unit: 'meters' }]
        }],
        timeSpans: []
      } as any)]
    };

    const results = aggregator.aggregate(contextWithoutReps);
    expect(results).toHaveLength(0);
  });

  it('should check canProcess correctly for spans with repetitions', () => {
    expect(aggregator.canProcess(mockContext)).toBe(true);
  });

  it('should check canProcess correctly for spans without repetitions', () => {
    const contextWithoutReps = {
      spans: [new ResultSpan({
        metrics: [{
          sourceId: 'test',
          effort: 'running',
          values: [{ type: 'distance', value: 100, unit: 'meters' }]
        }],
        timeSpans: []
      } as any)]
    };

    expect(aggregator.canProcess(contextWithoutReps)).toBe(false);
  });

  it('should handle empty spans gracefully', () => {
    const emptyContext = { spans: [] };
    
    expect(aggregator.canProcess(emptyContext)).toBe(false);
    expect(aggregator.aggregate(emptyContext)).toHaveLength(0);
  });

  it('should have correct properties', () => {
    expect(aggregator.id).toBe('total-reps');
    expect(aggregator.displayName).toBe('Total Repetitions');
    expect(aggregator.category).toBe('basic');
  });
});