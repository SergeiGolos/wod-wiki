import { describe, test, expect, vi } from 'vitest';
import { RuntimeBlockMetrics } from '../RuntimeBlockMetrics'; // Changed import
import { BlockKey } from '@/core/BlockKey';
import { JitStatement } from '@/core/JitStatement';

describe('RuntimeBlockMetrics', () => { // Changed describe to match class
  test('should build empty metrics array when no statements are added', () => {
    // Arrange
    const builder = new RuntimeBlockMetrics(); // Changed to RuntimeBlockMetrics
    const blockKey = new BlockKey();
    
    // Act
    const metrics = builder.build(blockKey);
    
    // Assert
    expect(metrics).toEqual([]);
  });
  
  test('should add single statement correctly', () => {
    // Arrange
    const builder = new RuntimeBlockMetrics(); // Changed to RuntimeBlockMetrics
    const blockKey = new BlockKey();
    
    const mockStatement = {
      id: 1,
      repetition: vi.fn().mockReturnValue({ reps: 10 }),
      effort: vi.fn().mockReturnValue({ effort: 'squats' }),
      resistance: vi.fn().mockReturnValue(null),
      distance: vi.fn().mockReturnValue(null),
      round: vi.fn().mockReturnValue(null), // Added mock for round
      fragments: [{ applyToMetric: vi.fn((metric, _rounds) => { metric.values.push({type: 'repetitions', value: 10, unit: 'reps'})}) }], // Mock fragments with applyToMetric
      toString: vi.fn().mockReturnValue('10 squats')
    } as unknown as JitStatement;
    
    // Act
    builder.addStatements([mockStatement]); // addStatements expects an array
    const metrics = builder.build(blockKey);
    
    // Assert
    expect(metrics.length).toBe(1);
    expect(metrics[0].sourceId).toBe('1');
    expect(metrics[0].effort).toBe('squats');
    expect(metrics[0].values).toHaveLength(1);
    expect(metrics[0].values[0]).toEqual({
      type: 'repetitions',
      value: 10,
      unit: 'reps'
    });
  });
  
  test('should add multiple statements correctly', () => {
    // Arrange
    const builder = new RuntimeBlockMetrics(); // Changed to RuntimeBlockMetrics
    const blockKey = new BlockKey();
    
    const mockStatements = [
      {
        id: 1,
        repetition: vi.fn().mockReturnValue({ reps: 10 }),
        effort: vi.fn().mockReturnValue({ effort: 'squats' }),
        resistance: vi.fn().mockReturnValue(null),
        distance: vi.fn().mockReturnValue(null),
        round: vi.fn().mockReturnValue(null), // Added mock for round
        fragments: [{ applyToMetric: vi.fn((metric, _rounds) => { metric.values.push({type: 'repetitions', value: 10, unit: 'reps'})}) }],
        toString: vi.fn().mockReturnValue('10 squats')
      },
      {
        id: 2,
        repetition: vi.fn().mockReturnValue(null),
        effort: vi.fn().mockReturnValue({ effort: 'deadlift' }),
        resistance: vi.fn().mockReturnValue({ value: 100, units: 'kg' }),
        distance: vi.fn().mockReturnValue(null),
        round: vi.fn().mockReturnValue(null), // Added mock for round
        fragments: [{ applyToMetric: vi.fn((metric, _rounds) => { metric.values.push({type: 'resistance', value: 100, unit: 'kg'})}) }],
        toString: vi.fn().mockReturnValue('deadlift 100kg')
      }
    ] as unknown as JitStatement[];
    
    // Act
    builder.addStatements(mockStatements);
    const metrics = builder.build(blockKey);
    
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
  
  test('should extract all value types correctly', () => {
    // Arrange
    const builder = new RuntimeBlockMetrics(); // Changed to RuntimeBlockMetrics
    const blockKey = new BlockKey();
    
    const mockStatement = {
      id: 1,
      repetition: vi.fn().mockReturnValue({ reps: 5 }),
      effort: vi.fn().mockReturnValue({ effort: 'run' }),
      resistance: vi.fn().mockReturnValue({ value: 20, units: 'lb' }),
      distance: vi.fn().mockReturnValue({ value: 400, units: 'm' }),
      round: vi.fn().mockReturnValue(null), // Added mock for round
      fragments: [
        { applyToMetric: vi.fn((metric, _rounds) => { metric.values.push({type: 'repetitions', value: 5, unit: 'reps'})}) },
        { applyToMetric: vi.fn((metric, _rounds) => { metric.values.push({type: 'resistance', value: 20, unit: 'lb'})}) },
        { applyToMetric: vi.fn((metric, _rounds) => { metric.values.push({type: 'distance', value: 400, unit: 'm'})}) },
      ],
      toString: vi.fn().mockReturnValue('5 times run 400m with 20lb')
    } as unknown as JitStatement;
    
    // Act
    builder.addStatements([mockStatement]); // addStatements expects an array
    const metrics = builder.build(blockKey);
    
    // Assert
    expect(metrics.length).toBe(1);
    expect(metrics[0].sourceId).toBe('1');
    expect(metrics[0].effort).toBe('run');
    expect(metrics[0].values).toHaveLength(3);
    
    // Check all values are extracted correctly
    expect(metrics[0].values).toContainEqual({
      type: 'repetitions',
      value: 5,
      unit: 'reps'
    });
    
    expect(metrics[0].values).toContainEqual({
      type: 'resistance',
      value: 20,
      unit: 'lb'
    });
    
    expect(metrics[0].values).toContainEqual({
      type: 'distance',
      value: 400,
      unit: 'm'
    });
  });
  
  test('should use toString for effort name when effort fragment is not available', () => {
    // Arrange
    const builder = new RuntimeBlockMetrics(); // Changed to RuntimeBlockMetrics
    const blockKey = new BlockKey();
    
    const mockStatement = {
      id: 1,
      repetition: vi.fn().mockReturnValue({ reps: 10 }),
      effort: vi.fn().mockReturnValue(null), // Effort is null
      resistance: vi.fn().mockReturnValue(null),
      distance: vi.fn().mockReturnValue(null),
      round: vi.fn().mockReturnValue(null), // Added mock for round
      fragments: [{ applyToMetric: vi.fn((metric, _rounds) => { metric.values.push({type: 'repetitions', value: 10, unit: 'reps'})}) }],
      toString: vi.fn().mockReturnValue('10 burpees')
    } as unknown as JitStatement;
    
    // Act
    builder.addStatements([mockStatement]);
    const metrics = builder.build(blockKey);
    
    // Assert
    expect(metrics.length).toBe(1);
    expect(metrics[0].sourceId).toBe('1');
    expect(metrics[0].effort).toBe('10 burpees');
  });
  
  test('should use generic name with id when neither effort nor toString provides a name', () => {
    // Arrange
    const builder = new RuntimeBlockMetrics(); // Changed to RuntimeBlockMetrics
    const blockKey = new BlockKey();
    
    const mockStatement = {
      id: 42,
      repetition: vi.fn().mockReturnValue({ reps: 10 }),
      effort: vi.fn().mockReturnValue(null), // Effort is null
      resistance: vi.fn().mockReturnValue(null),
      distance: vi.fn().mockReturnValue(null),
      round: vi.fn().mockReturnValue(null), // Added mock for round
      fragments: [{ applyToMetric: vi.fn((metric, _rounds) => { metric.values.push({type: 'repetitions', value: 10, unit: 'reps'})}) }],
      toString: vi.fn().mockReturnValue('[object Object]') // toString is generic
    } as unknown as JitStatement;
    
    // Act
    builder.addStatements([mockStatement]);
    const metrics = builder.build(blockKey);
    
    // Assert
    expect(metrics.length).toBe(1);
    expect(metrics[0].sourceId).toBe('42');
    expect(metrics[0].effort).toBe('Exercise 42'); // Default name check
  });
});