import { describe, it, expect } from 'vitest';
import { SpanFilters } from '../utilities/SpanFilters';
import { ResultSpan } from '../../../ResultSpan';
import { MetricsContext } from '../types';
import { RuntimeMetric } from '../../../RuntimeMetric';

describe('SpanFilters', () => {
  let filters: SpanFilters;
  let mockContext: MetricsContext;
  let mockSpans: ResultSpan[];

  beforeEach(() => {
    filters = new SpanFilters();
    
    // Create mock spans with different metric types
    const span1 = new ResultSpan({
      blockKey: 'exercise-1',
      metrics: [{
        sourceId: 'test',
        effort: 'pushups',
        values: [{ type: 'repetitions', value: 10, unit: 'reps' }]
      }],
      timeSpans: [],
      leaf: true
    } as any);

    const span2 = new ResultSpan({
      blockKey: 'exercise-2',
      metrics: [{
        sourceId: 'test',
        effort: 'running',
        values: [{ type: 'distance', value: 100, unit: 'meters' }]
      }],
      timeSpans: [],
      leaf: false
    } as any);

    const span3 = new ResultSpan({
      blockKey: 'rest-1',
      metrics: [{
        sourceId: 'test',
        effort: 'rest',
        values: [{ type: 'timestamp', value: 30000, unit: 'ms' }]
      }],
      timeSpans: [],
      leaf: true
    } as any);

    mockSpans = [span1, span2, span3];
    mockContext = { spans: mockSpans };
  });

  it('should filter spans by metric type', () => {
    const repetitionFilter = filters.byMetricType('repetitions');
    const filteredSpans = mockSpans.filter(span => repetitionFilter(span, mockContext));
    
    expect(filteredSpans).toHaveLength(1);
    expect(filteredSpans[0].metrics[0].effort).toBe('pushups');
  });

  it('should filter spans by effort name', () => {
    const effortFilter = filters.byEffort('running');
    const filteredSpans = mockSpans.filter(span => effortFilter(span, mockContext));
    
    expect(filteredSpans).toHaveLength(1);
    expect(filteredSpans[0].metrics[0].effort).toBe('running');
  });

  it('should filter leaf spans only', () => {
    const leafFilter = filters.leafSpansOnly();
    const filteredSpans = mockSpans.filter(span => leafFilter(span, mockContext));
    
    expect(filteredSpans).toHaveLength(2);
    expect(filteredSpans.every(span => span.leaf)).toBe(true);
  });

  it('should filter spans by block key pattern (string)', () => {
    const blockKeyFilter = filters.byBlockKey('exercise');
    const filteredSpans = mockSpans.filter(span => blockKeyFilter(span, mockContext));
    
    expect(filteredSpans).toHaveLength(2);
    expect(filteredSpans.every(span => span.blockKey?.includes('exercise'))).toBe(true);
  });

  it('should filter spans by block key pattern (regex)', () => {
    const blockKeyFilter = filters.byBlockKey(/^exercise-\d+$/);
    const filteredSpans = mockSpans.filter(span => blockKeyFilter(span, mockContext));
    
    expect(filteredSpans).toHaveLength(2);
  });

  it('should combine filters with AND logic', () => {
    const combinedFilter = filters.and(
      filters.byMetricType('repetitions'),
      filters.leafSpansOnly()
    );
    const filteredSpans = mockSpans.filter(span => combinedFilter(span, mockContext));
    
    expect(filteredSpans).toHaveLength(1);
    expect(filteredSpans[0].metrics[0].effort).toBe('pushups');
  });

  it('should combine filters with OR logic', () => {
    const combinedFilter = filters.or(
      filters.byEffort('pushups'),
      filters.byEffort('running')
    );
    const filteredSpans = mockSpans.filter(span => combinedFilter(span, mockContext));
    
    expect(filteredSpans).toHaveLength(2);
  });

  it('should handle empty filter combinations', () => {
    const emptyAndFilter = filters.and();
    const emptyOrFilter = filters.or();
    
    expect(mockSpans.filter(span => emptyAndFilter(span, mockContext))).toHaveLength(3);
    expect(mockSpans.filter(span => emptyOrFilter(span, mockContext))).toHaveLength(0);
  });
});