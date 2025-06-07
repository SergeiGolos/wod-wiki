import { describe, it, expect } from 'vitest';
import { SpanCalculators } from '../utilities/SpanCalculators';
import { ResultSpan } from '../../../ResultSpan';
import { MetricsContext } from '../types';

describe('SpanCalculators', () => {
  let calculators: SpanCalculators;
  let mockContext: MetricsContext;
  let mockSpans: ResultSpan[];

  beforeEach(() => {
    calculators = new SpanCalculators();
    
    // Create mock spans with timing and metric data
    const span1 = new ResultSpan({
      metrics: [{
        sourceId: 'test',
        effort: 'pushups',
        values: [{ type: 'repetitions', value: 10, unit: 'reps' }]
      }],
      timeSpans: [{
        start: { name: 'start', timestamp: new Date('2023-01-01T10:00:00Z') },
        stop: { name: 'stop', timestamp: new Date('2023-01-01T10:01:00Z') }
      }]
    } as any);

    const span2 = new ResultSpan({
      metrics: [{
        sourceId: 'test',
        effort: 'squats',
        values: [{ type: 'repetitions', value: 15, unit: 'reps' }]
      }],
      timeSpans: [{
        start: { name: 'start', timestamp: new Date('2023-01-01T10:02:00Z') },
        stop: { name: 'stop', timestamp: new Date('2023-01-01T10:03:30Z') }
      }]
    } as any);

    const span3 = new ResultSpan({
      metrics: [{
        sourceId: 'test',
        effort: 'pullups',
        values: [{ type: 'repetitions', value: 5, unit: 'reps' }]
      }],
      timeSpans: []
    } as any);

    mockSpans = [span1, span2, span3];
    mockContext = { spans: mockSpans };
  });

  it('should calculate total duration from timespans', () => {
    const totalDuration = calculators.totalDuration();
    const result = totalDuration(mockSpans, mockContext);
    
    // span1: 60000ms, span2: 90000ms, span3: 0ms (no timespan)
    expect(result).toBe(150000);
  });

  it('should calculate sum using extractor', () => {
    const repExtractor = (metric: any) => metric.values
      .filter((v: any) => v.type === 'repetitions')
      .map((v: any) => v.value);
    
    const sum = calculators.sum(repExtractor);
    const result = sum(mockSpans, mockContext);
    
    expect(result).toBe(30); // 10 + 15 + 5
  });

  it('should calculate average using extractor', () => {
    const repExtractor = (metric: any) => metric.values
      .filter((v: any) => v.type === 'repetitions')
      .map((v: any) => v.value);
    
    const average = calculators.average(repExtractor);
    const result = average(mockSpans, mockContext);
    
    expect(result).toBe(10); // (10 + 15 + 5) / 3
  });

  it('should calculate maximum using extractor', () => {
    const repExtractor = (metric: any) => metric.values
      .filter((v: any) => v.type === 'repetitions')
      .map((v: any) => v.value);
    
    const max = calculators.max(repExtractor);
    const result = max(mockSpans, mockContext);
    
    expect(result).toBe(15);
  });

  it('should calculate minimum using extractor', () => {
    const repExtractor = (metric: any) => metric.values
      .filter((v: any) => v.type === 'repetitions')
      .map((v: any) => v.value);
    
    const min = calculators.min(repExtractor);
    const result = min(mockSpans, mockContext);
    
    expect(result).toBe(5);
  });

  it('should count all spans when no filter is provided', () => {
    const count = calculators.count();
    const result = count(mockSpans, mockContext);
    
    expect(result).toBe(3);
  });

  it('should count spans using filter', () => {
    const filter = (span: ResultSpan) => span.metrics[0].effort === 'pushups';
    const count = calculators.count(filter);
    const result = count(mockSpans, mockContext);
    
    expect(result).toBe(1);
  });

  it('should handle empty spans', () => {
    const emptySpans: ResultSpan[] = [];
    const emptyContext = { spans: emptySpans };
    
    const sum = calculators.sum(() => [1]);
    const avg = calculators.average(() => [1]);
    const max = calculators.max(() => [1]);
    const min = calculators.min(() => [1]);
    const count = calculators.count();
    
    expect(sum(emptySpans, emptyContext)).toBe(0);
    expect(avg(emptySpans, emptyContext)).toBe(0);
    expect(max(emptySpans, emptyContext)).toBe(0);
    expect(min(emptySpans, emptyContext)).toBe(0);
    expect(count(emptySpans, emptyContext)).toBe(0);
  });
});