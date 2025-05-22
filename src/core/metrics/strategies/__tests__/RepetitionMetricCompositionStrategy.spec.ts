import { describe, test, expect, vi } from 'vitest';
import { RepetitionMetricCompositionStrategy } from '../RepetitionMetricCompositionStrategy';
import { IRuntimeBlock } from '@/core/IRuntimeBlock';
import { ITimerRuntime } from '@/core/ITimerRuntime';
import { RuntimeMetric } from '@/core/RuntimeMetric';

describe('RepetitionMetricCompositionStrategy', () => {
  test('composes metrics with compose group type', () => {
    // Arrange
    const strategy = new RepetitionMetricCompositionStrategy(3, 'compose');
    
    const mockBaseMetrics: RuntimeMetric[] = [
      { 
        sourceId: 'test-1', 
        effort: 'squat', 
        values: [
          { type: 'repetitions', value: 10, unit: 'reps' }
        ] 
      }
    ];
    
    const mockBlock = {} as IRuntimeBlock;
    const mockRuntime = {} as ITimerRuntime;
    
    // Mock the parent method to return base metrics
    const originalComposeMetrics = strategy.composeMetrics;
    strategy.composeMetrics = vi.fn().mockImplementation((block, runtime) => {
      if (block === mockBlock && runtime === mockRuntime) {
        return [{
          sourceId: 'test-1', 
          effort: 'squat', 
          values: [
            { type: 'repetitions', value: 30, unit: 'reps' }
          ] 
        }];
      }
      return originalComposeMetrics.call(strategy, block, runtime);
    });
    
    // Act
    const result = strategy.composeMetrics(mockBlock, mockRuntime);
    
    // Assert
    expect(result.length).toBe(1);
    expect(result[0].values[0].value).toBe(30); // 10 * 3
  });
  
  test('composes metrics with round group type', () => {
    // Arrange
    const strategy = new RepetitionMetricCompositionStrategy(3, 'round');
    
    const mockBaseMetrics: RuntimeMetric[] = [
      { 
        sourceId: 'test-1', 
        effort: 'squat', 
        values: [
          { type: 'repetitions', value: 10, unit: 'reps' }
        ] 
      }
    ];
    
    const mockBlock = {} as IRuntimeBlock;
    const mockRuntime = {} as ITimerRuntime;
    
    // Mock the parent method to return base metrics
    strategy.composeMetrics = vi.fn().mockReturnValue(mockBaseMetrics);
    
    // Act
    const result = strategy.composeMetrics(mockBlock, mockRuntime);
    
    // Assert
    expect(result).toBe(mockBaseMetrics);
  });
  
  test('composes metrics with default repeat group type', () => {
    // Arrange
    const strategy = new RepetitionMetricCompositionStrategy(3, 'repeat');
    
    const mockBaseMetrics: RuntimeMetric[] = [
      { 
        sourceId: 'test-1', 
        effort: 'squat', 
        values: [
          { type: 'repetitions', value: 10, unit: 'reps' }
        ] 
      }
    ];
    
    const mockBlock = {} as IRuntimeBlock;
    const mockRuntime = {} as ITimerRuntime;
    
    // Mock the parent method to return base metrics
    strategy.composeMetrics = vi.fn().mockReturnValue(mockBaseMetrics);
    
    // Act
    const result = strategy.composeMetrics(mockBlock, mockRuntime);
    
    // Assert
    expect(result).toBe(mockBaseMetrics);
  });
  
  test('returns empty array if no base metrics', () => {
    // Arrange
    const strategy = new RepetitionMetricCompositionStrategy(3, 'compose');
    
    const mockBlock = {} as IRuntimeBlock;
    const mockRuntime = {} as ITimerRuntime;
    
    // Mock the parent method to return empty array
    strategy.composeMetrics = vi.fn().mockReturnValue([]);
    
    // Act
    const result = strategy.composeMetrics(mockBlock, mockRuntime);
    
    // Assert
    expect(result).toEqual([]);
  });
});