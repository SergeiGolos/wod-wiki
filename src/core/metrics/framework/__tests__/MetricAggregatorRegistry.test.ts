import { describe, it, expect } from 'vitest';
import { MetricAggregatorRegistry } from '../MetricAggregatorRegistry';
import { IMetricAggregator } from '../aggregator';
import { MetricsContext, AggregatedMetric } from '../types';

// Mock aggregator for testing
class MockAggregator implements IMetricAggregator {
  constructor(
    public readonly id: string,
    public readonly displayName: string,
    public readonly category?: string,
    private shouldProcess: boolean = true
  ) {}

  aggregate(context: MetricsContext): AggregatedMetric[] {
    return [{
      id: this.id,
      displayName: this.displayName,
      data: { mock: true },
      category: this.category
    }];
  }

  canProcess(context: MetricsContext): boolean {
    return this.shouldProcess && context.spans.length > 0;
  }
}

describe('MetricAggregatorRegistry', () => {
  let registry: MetricAggregatorRegistry;

  beforeEach(() => {
    registry = new MetricAggregatorRegistry();
  });

  it('should register and retrieve aggregators', () => {
    const aggregator = new MockAggregator('test-1', 'Test Aggregator 1');
    
    registry.register(aggregator);
    
    expect(registry.getAll()).toHaveLength(1);
    expect(registry.getById('test-1')).toBe(aggregator);
  });

  it('should unregister aggregators', () => {
    const aggregator = new MockAggregator('test-1', 'Test Aggregator 1');
    
    registry.register(aggregator);
    expect(registry.getAll()).toHaveLength(1);
    
    registry.unregister('test-1');
    expect(registry.getAll()).toHaveLength(0);
    expect(registry.getById('test-1')).toBeUndefined();
  });

  it('should get aggregators by category', () => {
    const agg1 = new MockAggregator('test-1', 'Test 1', 'basic');
    const agg2 = new MockAggregator('test-2', 'Test 2', 'advanced');
    const agg3 = new MockAggregator('test-3', 'Test 3', 'basic');
    
    registry.register(agg1);
    registry.register(agg2);
    registry.register(agg3);
    
    const basicAggregators = registry.getByCategory('basic');
    expect(basicAggregators).toHaveLength(2);
    expect(basicAggregators.map(a => a.id)).toEqual(['test-1', 'test-3']);
    
    const advancedAggregators = registry.getByCategory('advanced');
    expect(advancedAggregators).toHaveLength(1);
    expect(advancedAggregators[0].id).toBe('test-2');
  });

  it('should get compatible aggregators', () => {
    const compatibleAgg = new MockAggregator('compatible', 'Compatible', undefined, true);
    const incompatibleAgg = new MockAggregator('incompatible', 'Incompatible', undefined, false);
    
    registry.register(compatibleAgg);
    registry.register(incompatibleAgg);
    
    const context: MetricsContext = { spans: [{}] as any };
    const compatible = registry.getCompatible(context);
    
    expect(compatible).toHaveLength(1);
    expect(compatible[0].id).toBe('compatible');
  });

  it('should clear all aggregators', () => {
    const agg1 = new MockAggregator('test-1', 'Test 1');
    const agg2 = new MockAggregator('test-2', 'Test 2');
    
    registry.register(agg1);
    registry.register(agg2);
    expect(registry.getAll()).toHaveLength(2);
    
    registry.clear();
    expect(registry.getAll()).toHaveLength(0);
  });

  it('should handle duplicate registration', () => {
    const agg1 = new MockAggregator('test-1', 'Test 1');
    const agg2 = new MockAggregator('test-1', 'Test 1 Updated'); // Same ID
    
    registry.register(agg1);
    registry.register(agg2); // Should replace the first one
    
    expect(registry.getAll()).toHaveLength(1);
    expect(registry.getById('test-1')?.displayName).toBe('Test 1 Updated');
  });

  it('should handle non-existent aggregator operations gracefully', () => {
    expect(registry.getById('non-existent')).toBeUndefined();
    expect(registry.getByCategory('non-existent')).toHaveLength(0);
    
    // Should not throw when unregistering non-existent aggregator
    expect(() => registry.unregister('non-existent')).not.toThrow();
  });
});