import { describe, test, expect } from 'bun:test';
import { VolumeProjectionEngine } from './VolumeProjectionEngine';
import { RuntimeMetric } from '../../../../runtime/models/RuntimeMetric';
import { Exercise, Level, Category } from '../../../../exercise.d';
import { ICodeFragment, FragmentType } from '../../../../core/models/CodeFragment';

describe('VolumeProjectionEngine', () => {
  const engine = new VolumeProjectionEngine();

  const mockExercise: Exercise = {
    name: 'Bench Press',
    primaryMuscles: [],
    secondaryMuscles: [],
    level: Level.intermediate,
    category: Category.strength,
    instructions: [],
  };

  describe('calculate()', () => {
    test('should return empty array for empty metrics', () => {
      const results = engine.calculate([], mockExercise);
      expect(results).toEqual([]);
    });

    test('should return empty array if no time spans', () => {
      const metrics: RuntimeMetric[] = [
        {
          exerciseId: 'Bench Press',
          values: [
            { type: 'repetitions', value: 10, unit: 'reps' },
            { type: 'resistance', value: 100, unit: 'kg' },
          ],
          timeSpans: [],
        },
      ];

      const results = engine.calculate(metrics, mockExercise);
      expect(results).toEqual([]);
    });

    test('should calculate volume from single metric', () => {
      const start = new Date('2025-10-12T10:00:00Z');
      const stop = new Date('2025-10-12T10:05:00Z');

      const metrics: RuntimeMetric[] = [
        {
          exerciseId: 'Bench Press',
          values: [
            { type: 'repetitions', value: 10, unit: 'reps' },
            { type: 'resistance', value: 100, unit: 'kg' },
          ],
          timeSpans: [{ start, stop }],
        },
      ];

      const results = engine.calculate(metrics, mockExercise);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Total Volume');
      expect(results[0].value).toBe(1000); // 10 * 100
      expect(results[0].unit).toBe('kg');
      expect(results[0].timeSpan.start).toEqual(start);
      expect(results[0].timeSpan.stop).toEqual(stop);
    });

    test('should calculate volume from multiple metrics', () => {
      const start1 = new Date('2025-10-12T10:00:00Z');
      const stop1 = new Date('2025-10-12T10:05:00Z');
      const start2 = new Date('2025-10-12T10:06:00Z');
      const stop2 = new Date('2025-10-12T10:11:00Z');

      const metrics: RuntimeMetric[] = [
        {
          exerciseId: 'Bench Press',
          values: [
            { type: 'repetitions', value: 10, unit: 'reps' },
            { type: 'resistance', value: 100, unit: 'kg' },
          ],
          timeSpans: [{ start: start1, stop: stop1 }],
        },
        {
          exerciseId: 'Bench Press',
          values: [
            { type: 'repetitions', value: 8, unit: 'reps' },
            { type: 'resistance', value: 100, unit: 'kg' },
          ],
          timeSpans: [{ start: start2, stop: stop2 }],
        },
      ];

      const results = engine.calculate(metrics, mockExercise);

      expect(results).toHaveLength(1);
      expect(results[0].value).toBe(1800); // (10 * 100) + (8 * 100)
      expect(results[0].timeSpan.start).toEqual(start1);
      expect(results[0].timeSpan.stop).toEqual(stop2);
    });

    test('should skip metrics without reps or resistance', () => {
      const start = new Date('2025-10-12T10:00:00Z');
      const stop = new Date('2025-10-12T10:05:00Z');

      const metrics: RuntimeMetric[] = [
        {
          exerciseId: 'Bench Press',
          values: [
            { type: 'repetitions', value: 10, unit: 'reps' },
            // Missing resistance
          ],
          timeSpans: [{ start, stop }],
        },
      ];

      const results = engine.calculate(metrics, mockExercise);
      expect(results).toEqual([]);
    });

    test('should include metadata', () => {
      const start = new Date('2025-10-12T10:00:00Z');
      const stop = new Date('2025-10-12T10:05:00Z');

      const metrics: RuntimeMetric[] = [
        {
          exerciseId: 'Bench Press',
          values: [
            { type: 'repetitions', value: 10, unit: 'reps' },
            { type: 'resistance', value: 100, unit: 'kg' },
          ],
          timeSpans: [{ start, stop }],
        },
      ];

      const results = engine.calculate(metrics, mockExercise);

      expect(results[0].metadata).toBeDefined();
      expect(results[0].metadata?.exerciseName).toBe('Bench Press');
      expect(results[0].metadata?.totalSets).toBe(1);
    });
  });

  describe('calculateFromFragments()', () => {
    test('should calculate volume from rep and resistance fragments', () => {
      const fragments: ICodeFragment[] = [
        {
          type: 'rep',
          fragmentType: FragmentType.Rep,
          value: 10,
        },
        {
          type: 'resistance',
          fragmentType: FragmentType.Resistance,
          value: 100,
        },
      ];

      const definition: Exercise = {
        name: 'Bench Press',
        primaryMuscles: [],
        secondaryMuscles: [],
        level: Level.intermediate,
        category: Category.strength,
        instructions: [],
      };

      const results = engine.calculateFromFragments(fragments, 'bench-press', definition);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Total Volume');
      expect(results[0].value).toBe(1000); // 10 * 100
      expect(results[0].unit).toBe('kg');
      expect(results[0].metadata?.source).toBe('fragments');
    });

    test('should calculate volume from multiple sets', () => {
      const fragments: ICodeFragment[] = [
        // Set 1
        { type: 'rep', fragmentType: FragmentType.Rep, value: 10 },
        { type: 'resistance', fragmentType: FragmentType.Resistance, value: 100 },
        // Set 2
        { type: 'rep', fragmentType: FragmentType.Rep, value: 8 },
        { type: 'resistance', fragmentType: FragmentType.Resistance, value: 120 },
      ];

      const definition: Exercise = {
        name: 'Bench Press',
        primaryMuscles: [],
        secondaryMuscles: [],
        level: Level.intermediate,
        category: Category.strength,
        instructions: [],
      };

      const results = engine.calculateFromFragments(fragments, 'bench-press', definition);

      expect(results).toHaveLength(1);
      expect(results[0].value).toBe(1960); // (10*100) + (8*120)
      expect(results[0].metadata?.totalSets).toBe(2);
    });

    test('should return empty array for empty fragments', () => {
      const definition: Exercise = {
        name: 'Bench Press',
        primaryMuscles: [],
        secondaryMuscles: [],
        level: Level.intermediate,
        category: Category.strength,
        instructions: [],
      };

      const results = engine.calculateFromFragments([], 'bench-press', definition);

      expect(results).toHaveLength(0);
    });

    test('should return empty array when no valid rep/resistance pairs', () => {
      const fragments: ICodeFragment[] = [
        { type: 'rep', fragmentType: FragmentType.Rep, value: 10 },
        // Missing resistance
      ];

      const definition: Exercise = {
        name: 'Bench Press',
        primaryMuscles: [],
        secondaryMuscles: [],
        level: Level.intermediate,
        category: Category.strength,
        instructions: [],
      };

      const results = engine.calculateFromFragments(fragments, 'bench-press', definition);

      expect(results).toHaveLength(0);
    });
  });
});

