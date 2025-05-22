import { describe, test, expect, vi } from 'vitest';
import { EffortMetricCompositionStrategy } from '../EffortMetricCompositionStrategy';
import { IRuntimeBlock } from '@/core/IRuntimeBlock';
import { ITimerRuntime } from '@/core/ITimerRuntime';
import { RuntimeMetric } from '@/core/RuntimeMetric';
import { JitStatement } from '@/core/JitStatement';

describe('EffortMetricCompositionStrategy', () => {
  test('enhances metrics with fragment data', () => {
    // Arrange
    const strategy = new EffortMetricCompositionStrategy();
    
    const mockBaseMetrics: RuntimeMetric[] = [
      { sourceId: 'test-1', effort: 'squat', values: [] }
    ];
    
    const mockSource = {
      rep: vi.fn().mockReturnValue({ count: 10 }),
      resistance: vi.fn().mockReturnValue({ weight: 100, unit: 'kg' }),
      distance: vi.fn().mockReturnValue(null)
    } as unknown as JitStatement;
    
    const mockBlock = {
      spans: [],
      sources: [mockSource]
    } as unknown as IRuntimeBlock;
    
    const mockRuntime = {
      blockKey: 'test-key'
    } as unknown as ITimerRuntime;
    
    // Override the parent method to return our base metrics
    vi.spyOn(strategy, 'composeMetrics').mockImplementation(() => mockBaseMetrics);
    
    // Expose the protected method for testing
    const enhanceMethod = (strategy as any).enhanceMetricsWithFragmentData;
    
    // Act
    const result = enhanceMethod(mockBaseMetrics, mockBlock, mockRuntime);
    
    // Assert
    expect(result.length).toBe(1);
    expect(result[0].sourceId).toBe('test-1');
    expect(result[0].effort).toBe('squat');
    expect(result[0].values.length).toBe(2);
    
    // Check repetitions
    expect(result[0].values[0]).toEqual({
      type: 'repetitions',
      value: 10,
      unit: 'reps'
    });
    
    // Check resistance
    expect(result[0].values[1]).toEqual({
      type: 'resistance',
      value: 100,
      unit: 'kg'
    });
    
    // Check that fragment methods were called
    expect(mockSource.rep).toHaveBeenCalledWith('test-key');
    expect(mockSource.resistance).toHaveBeenCalledWith('test-key');
    expect(mockSource.distance).toHaveBeenCalledWith('test-key');
  });
  
  test('returns base metrics if they already have values', () => {
    // Arrange
    const strategy = new EffortMetricCompositionStrategy();
    
    const mockMetrics: RuntimeMetric[] = [
      { 
        sourceId: 'test-1', 
        effort: 'squat', 
        values: [
          { type: 'repetitions', value: 10, unit: 'reps' }
        ] 
      }
    ];
    
    const mockBlock = {
      spans: [],
      sources: []
    } as unknown as IRuntimeBlock;
    
    const mockRuntime = {} as ITimerRuntime;
    
    // Mock the parent method to return metrics with values
    vi.spyOn(strategy, 'composeMetrics').mockReturnValueOnce(mockMetrics);
    
    // Act
    const result = strategy.composeMetrics(mockBlock, mockRuntime);
    
    // Assert
    expect(result).toBe(mockMetrics);
  });
});