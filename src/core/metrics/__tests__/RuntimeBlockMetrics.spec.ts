import { describe, test, expect, vi } from 'vitest';
import { RuntimeBlockMetrics } from '../RuntimeBlockMetrics';
import { ITimerRuntime } from '@/core/ITimerRuntime';
import { BlockKey } from '@/core/BlockKey';
import { JitStatement } from '@/core/JitStatement';

describe('RuntimeBlockMetrics', () => {
  test('should build metrics from sources using RuntimeMetricBuilder', () => {
    // Arrange
    const mockRuntime = {
      blockKey: new BlockKey()
    } as unknown as ITimerRuntime;
    
    const mockSources = [
      {
        id: 1,
        repetition: vi.fn().mockReturnValue({ reps: 10 }),
        effort: vi.fn().mockReturnValue({ effort: 'squats' }),
        resistance: vi.fn().mockReturnValue(null),
        distance: vi.fn().mockReturnValue(null),
        toString: vi.fn().mockReturnValue('10 squats')
      },
      {
        id: 2,
        repetition: vi.fn().mockReturnValue(null),
        effort: vi.fn().mockReturnValue({ effort: 'deadlift' }),
        resistance: vi.fn().mockReturnValue({ value: 100, units: 'kg' }),
        distance: vi.fn().mockReturnValue(null),
        toString: vi.fn().mockReturnValue('deadlift 100kg')
      }
    ] as unknown as JitStatement[];
    
    // Act
    const metrics = RuntimeBlockMetrics.buildMetrics(mockRuntime, mockSources);
    
    // Assert
    expect(metrics.length).toBe(2);
    
    // First metric
    expect(metrics[0].sourceId).toBe('1');
    expect(metrics[0].effort).toBe('squats');
    expect(metrics[0].values).toHaveLength(1);
    expect(metrics[0].values[0]).toEqual({
      type: 'repetitions',
      value: 10,
      unit: 'reps'
    });
    
    // Second metric
    expect(metrics[1].sourceId).toBe('2');
    expect(metrics[1].effort).toBe('deadlift');
    expect(metrics[1].values).toHaveLength(1);
    expect(metrics[1].values[0]).toEqual({
      type: 'resistance',
      value: 100,
      unit: 'kg'
    });
  });
  
  test('should handle empty sources array', () => {
    // Arrange
    const mockRuntime = {
      blockKey: new BlockKey()
    } as unknown as ITimerRuntime;
    
    const emptySources: JitStatement[] = [];
    
    // Act
    const metrics = RuntimeBlockMetrics.buildMetrics(mockRuntime, emptySources);
    
    // Assert
    expect(metrics).toEqual([]);
  });
  
  test('should use the runtime blockKey for fragment extraction', () => {
    // Arrange
    const blockKey = new BlockKey();
    blockKey.push(['test'], 1); // Set some custom state
    
    const mockRuntime = {
      blockKey: blockKey
    } as unknown as ITimerRuntime;
    
    const mockSource = {
      id: 1,
      repetition: vi.fn().mockReturnValue({ reps: 5 }),
      effort: vi.fn().mockReturnValue({ effort: 'pushups' }),
      resistance: vi.fn().mockReturnValue(null),
      distance: vi.fn().mockReturnValue(null),
      toString: vi.fn().mockReturnValue('5 pushups')
    } as unknown as JitStatement;
    
    // Act
    RuntimeBlockMetrics.buildMetrics(mockRuntime, [mockSource]);
    
    // Assert
    expect(mockSource.repetition).toHaveBeenCalledWith(blockKey);
    expect(mockSource.effort).toHaveBeenCalledWith(blockKey);
    expect(mockSource.resistance).toHaveBeenCalledWith(blockKey);
    expect(mockSource.distance).toHaveBeenCalledWith(blockKey);
  });
});