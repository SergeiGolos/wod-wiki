import { describe, it, expect } from 'vitest';
import { MetricFactory } from '../utilities/MetricFactory';

describe('MetricFactory', () => {
  let factory: MetricFactory;

  beforeEach(() => {
    factory = new MetricFactory();
  });

  it('should create basic aggregated metric', () => {
    const metric = factory.create(
      'test-id',
      'Test Metric',
      { value: 42 },
      'count',
      'testing'
    );

    expect(metric).toEqual({
      id: 'test-id',
      displayName: 'Test Metric',
      data: { value: 42 },
      unit: 'count',
      category: 'testing'
    });
  });

  it('should create count metric', () => {
    const metric = factory.createCount('count-id', 'Count Metric', 15, 'basic');

    expect(metric).toEqual({
      id: 'count-id',
      displayName: 'Count Metric',
      data: { count: 15 },
      unit: 'count',
      category: 'basic'
    });
  });

  it('should create total metric', () => {
    const metric = factory.createTotal('total-id', 'Total Weight', 125.5, 'kg', 'strength');

    expect(metric).toEqual({
      id: 'total-id',
      displayName: 'Total Weight',
      data: { total: 125.5 },
      unit: 'kg',
      category: 'strength'
    });
  });

  it('should create grouped metric', () => {
    const groups = new Map<string, number>();
    groups.set('pushups', 20);
    groups.set('squats', 30);
    groups.set('pullups', 10);

    const metric = factory.createGrouped('grouped-id', 'Reps by Exercise', groups, 'breakdown');

    expect(metric).toEqual({
      id: 'grouped-id',
      displayName: 'Reps by Exercise',
      data: {
        byGroup: {
          'pushups': 20,
          'squats': 30,
          'pullups': 10
        }
      },
      unit: undefined,
      category: 'breakdown'
    });
  });

  it('should create ratio metric', () => {
    const metric = factory.createRatio('ratio-id', 'Work to Rest Ratio', 180, 60, 'analysis');

    expect(metric).toEqual({
      id: 'ratio-id',
      displayName: 'Work to Rest Ratio',
      data: {
        numerator: 180,
        denominator: 60,
        ratio: 3
      },
      unit: 'ratio',
      category: 'analysis'
    });
  });

  it('should handle ratio with zero denominator', () => {
    const metric = factory.createRatio('zero-ratio', 'Invalid Ratio', 100, 0);

    expect(metric.data.ratio).toBe(0);
    expect(metric.data.numerator).toBe(100);
    expect(metric.data.denominator).toBe(0);
  });

  it('should create metric without optional parameters', () => {
    const metric = factory.create('simple-id', 'Simple Metric', { result: 'success' });

    expect(metric).toEqual({
      id: 'simple-id',
      displayName: 'Simple Metric',
      data: { result: 'success' },
      unit: undefined,
      category: undefined
    });
  });
});