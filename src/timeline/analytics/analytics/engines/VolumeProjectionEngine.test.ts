import { describe, test, expect } from 'bun:test';
import { VolumeProjectionEngine } from './VolumeProjectionEngine';
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

      const results = engine.calculateFromFragments(fragments, 'bench-press', mockExercise);

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

      const results = engine.calculateFromFragments(fragments, 'bench-press', mockExercise);

      expect(results).toHaveLength(1);
      expect(results[0].value).toBe(1960); // (10*100) + (8*120)
      expect(results[0].metadata?.totalSets).toBe(2);
    });

    test('should return empty array for empty fragments', () => {
      const results = engine.calculateFromFragments([], 'bench-press', mockExercise);
      expect(results).toHaveLength(0);
    });

    test('should return empty array when no valid rep/resistance pairs', () => {
      const fragments: ICodeFragment[] = [
        { type: 'rep', fragmentType: FragmentType.Rep, value: 10 },
        // Missing resistance
      ];

      const results = engine.calculateFromFragments(fragments, 'bench-press', mockExercise);
      expect(results).toHaveLength(0);
    });
  });
});
