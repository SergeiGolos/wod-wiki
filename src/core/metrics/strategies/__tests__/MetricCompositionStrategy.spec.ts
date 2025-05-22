import { describe, test, expect, vi } from 'vitest';
import { MetricCompositionStrategy } from '../MetricCompositionStrategy';
import { IRuntimeBlock } from '@/core/IRuntimeBlock';
import { ITimerRuntime } from '@/core/ITimerRuntime';
import { RuntimeMetric } from '@/core/RuntimeMetric';
import { RuntimeSpan } from '@/core/RuntimeSpan';
import { JitStatement } from '@/core/JitStatement';

describe('MetricCompositionStrategy', () => {
  test('extracts metrics from spans if available', () => {
    // Arrange
    const strategy = new MetricCompositionStrategy();
    
    const mockMetrics: RuntimeMetric[] = [
      { sourceId: 'test-1', effort: 'deadlift', values: [] },
      { sourceId: 'test-2', effort: 'squat', values: [] },
    ];
    
    const mockSpan = new RuntimeSpan();
    mockSpan.metrics = [...mockMetrics];
    
    const mockBlock = {
      spans: [mockSpan],
      sources: []
    } as unknown as IRuntimeBlock;
    
    const mockRuntime = {} as ITimerRuntime;
    
    // Act
    const result = strategy.composeMetrics(mockBlock, mockRuntime);
    
    // Assert
    expect(result).toEqual(mockMetrics);
  });
  
  test('falls back to source extraction if no span metrics', () => {
    // Arrange
    const strategy = new MetricCompositionStrategy();
    
    const mockSource = {
      id: 'test-id',
      toString: () => 'test-source',
      effort: vi.fn().mockReturnValue({ effort: 'test-effort' })
    } as unknown as JitStatement;
    
    const mockBlock = {
      spans: [],
      sources: [mockSource]
    } as unknown as IRuntimeBlock;
    
    const mockRuntime = {
      blockKey: 'test-key'
    } as unknown as ITimerRuntime;
    
    // Act
    const result = strategy.composeMetrics(mockBlock, mockRuntime);
    
    // Assert
    expect(result.length).toBe(1);
    expect(result[0].sourceId).toBe('test-id');
    expect(result[0].effort).toBe('test-effort');
    expect(mockSource.effort).toHaveBeenCalledWith('test-key');
  });
  
  test('combineChildMetrics with ADD relationship', () => {
    // Arrange
    const strategy = new MetricCompositionStrategy();
    const childMetrics: RuntimeMetric[] = [
      { 
        sourceId: 'test-1', 
        effort: 'squat', 
        values: [
          { type: 'repetitions', value: 10, unit: 'reps' }
        ] 
      }
    ];
    
    // Act
    const result = strategy.combineChildMetrics(childMetrics, 'ADD');
    
    // Assert
    expect(result).toEqual(childMetrics);
  });
  
  test('combineChildMetrics with MULTIPLY relationship', () => {
    // Arrange
    const strategy = new MetricCompositionStrategy();
    const childMetrics: RuntimeMetric[] = [
      { 
        sourceId: 'test-1', 
        effort: 'squat', 
        values: [
          { type: 'repetitions', value: 10, unit: 'reps' }
        ] 
      }
    ];
    
    // Act
    const result = strategy.combineChildMetrics(childMetrics, 'MULTIPLY', 3);
    
    // Assert
    expect(result[0].values[0].value).toBe(30); // 10 * 3
    expect(result[0].sourceId).toBe('test-1');
    expect(result[0].effort).toBe('squat');
  });
  
  test('combineChildMetrics with INHERIT relationship', () => {
    // Arrange
    const strategy = new MetricCompositionStrategy();
    const childMetrics: RuntimeMetric[] = [
      { 
        sourceId: 'test-1', 
        effort: 'squat', 
        values: [
          { type: 'repetitions', value: 10, unit: 'reps' }
        ] 
      }
    ];
    
    // Act
    const result = strategy.combineChildMetrics(childMetrics, 'INHERIT');
    
    // Assert
    expect(result).toEqual(childMetrics);
  });
});