/**
 * Equivalence Tests for Analytics Dual-Path Migration
 * 
 * These tests ensure that the new fragment-based analytics path produces
 * identical results to the legacy RuntimeMetric path during Phase 2 migration.
 * 
 * This validates that the migration doesn't introduce analytical regressions.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { AnalysisService } from '../AnalysisService';
import { VolumeProjectionEngine } from '../engines/VolumeProjectionEngine';
import { ExerciseDefinitionService } from '../../../../repositories/workout/ExerciseDefinitionService';
import { RuntimeMetric, MetricValueType } from '../../../../runtime/models/RuntimeMetric';
import { ICodeFragment, FragmentType } from '../../../../core/models/CodeFragment';
import { Exercise, Level, Category } from '../../../../exercise.d';
import { metricsToFragments } from '../../../../runtime/utils/metricsToFragments';

describe('Analytics Dual-Path Equivalence', () => {
  let service: AnalysisService;
  let exerciseService: ExerciseDefinitionService;
  let engine: VolumeProjectionEngine;

  const mockExercise: Exercise = {
    name: 'Bench Press',
    primaryMuscles: [],
    secondaryMuscles: [],
    level: Level.intermediate,
    category: Category.strength,
    instructions: [],
  };

  beforeEach(() => {
    service = new AnalysisService();
    engine = new VolumeProjectionEngine();
    service.registerEngine(engine);

    ExerciseDefinitionService.reset();
    const exercises: Exercise[] = [mockExercise];
    exerciseService = ExerciseDefinitionService.getInstance(exercises);
    service.setExerciseService(exerciseService);
  });

  describe('VolumeProjectionEngine equivalence', () => {
    test('should produce identical volume calculations for single set', () => {
      // Create RuntimeMetric path data
      const metrics: RuntimeMetric[] = [{
        exerciseId: 'Bench Press',
        values: [
          { type: MetricValueType.Repetitions, value: 10, unit: 'reps' },
          { type: MetricValueType.Resistance, value: 100, unit: 'kg' },
        ],
        timeSpans: [
          { start: new Date('2024-01-01T10:00:00Z'), stop: new Date('2024-01-01T10:01:00Z') }
        ],
      }];

      // Create equivalent fragment path data
      const fragments: ICodeFragment[] = [
        {
          type: 'effort',
          fragmentType: FragmentType.Effort,
          value: 'Bench Press',
          image: 'Bench Press',
        },
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

      // Execute both paths
      const metricsResults = service.runAllProjections(metrics);
      const fragmentsResults = service.runAllProjectionsFromFragments(fragments);

      // Verify results
      expect(metricsResults).toHaveLength(1);
      expect(fragmentsResults).toHaveLength(1);

      // Compare volume values
      expect(metricsResults[0].value).toBe(1000); // 10 * 100
      expect(fragmentsResults[0].value).toBe(1000);
      expect(metricsResults[0].value).toBe(fragmentsResults[0].value);

      // Compare metadata
      expect(metricsResults[0].name).toBe('Total Volume');
      expect(fragmentsResults[0].name).toBe('Total Volume');
      expect(metricsResults[0].unit).toBe('kg');
      expect(fragmentsResults[0].unit).toBe('kg');
    });

    test('should produce identical volume calculations for multiple sets', () => {
      // Create RuntimeMetric path data with 3 sets
      const metrics: RuntimeMetric[] = [
        {
          exerciseId: 'Bench Press',
          values: [
            { type: MetricValueType.Repetitions, value: 10, unit: 'reps' },
            { type: MetricValueType.Resistance, value: 100, unit: 'kg' },
          ],
          timeSpans: [
            { start: new Date('2024-01-01T10:00:00Z'), stop: new Date('2024-01-01T10:01:00Z') }
          ],
        },
        {
          exerciseId: 'Bench Press',
          values: [
            { type: MetricValueType.Repetitions, value: 8, unit: 'reps' },
            { type: MetricValueType.Resistance, value: 120, unit: 'kg' },
          ],
          timeSpans: [
            { start: new Date('2024-01-01T10:02:00Z'), stop: new Date('2024-01-01T10:03:00Z') }
          ],
        },
        {
          exerciseId: 'Bench Press',
          values: [
            { type: MetricValueType.Repetitions, value: 6, unit: 'reps' },
            { type: MetricValueType.Resistance, value: 135, unit: 'kg' },
          ],
          timeSpans: [
            { start: new Date('2024-01-01T10:04:00Z'), stop: new Date('2024-01-01T10:05:00Z') }
          ],
        },
      ];

      // Create equivalent fragment path data
      const fragments: ICodeFragment[] = [
        {
          type: 'effort',
          fragmentType: FragmentType.Effort,
          value: 'Bench Press',
        },
        // Set 1
        { type: 'rep', fragmentType: FragmentType.Rep, value: 10 },
        { type: 'resistance', fragmentType: FragmentType.Resistance, value: 100 },
        // Set 2
        { type: 'rep', fragmentType: FragmentType.Rep, value: 8 },
        { type: 'resistance', fragmentType: FragmentType.Resistance, value: 120 },
        // Set 3
        { type: 'rep', fragmentType: FragmentType.Rep, value: 6 },
        { type: 'resistance', fragmentType: FragmentType.Resistance, value: 135 },
      ];

      // Execute both paths
      const metricsResults = service.runAllProjections(metrics);
      const fragmentsResults = service.runAllProjectionsFromFragments(fragments);

      // Verify results
      expect(metricsResults).toHaveLength(1);
      expect(fragmentsResults).toHaveLength(1);

      // Compare volume values: (10*100) + (8*120) + (6*135) = 1000 + 960 + 810 = 2770
      const expectedVolume = 2770;
      expect(metricsResults[0].value).toBe(expectedVolume);
      expect(fragmentsResults[0].value).toBe(expectedVolume);
      expect(metricsResults[0].value).toBe(fragmentsResults[0].value);
    });

    test('should handle incomplete data identically', () => {
      // Metrics with only reps (no resistance)
      const metrics: RuntimeMetric[] = [{
        exerciseId: 'Bench Press',
        values: [
          { type: MetricValueType.Repetitions, value: 10, unit: 'reps' },
        ],
        timeSpans: [
          { start: new Date('2024-01-01T10:00:00Z'), stop: new Date('2024-01-01T10:01:00Z') }
        ],
      }];

      // Fragments with only reps (no resistance)
      const fragments: ICodeFragment[] = [
        { type: 'effort', fragmentType: FragmentType.Effort, value: 'Bench Press' },
        { type: 'rep', fragmentType: FragmentType.Rep, value: 10 },
      ];

      // Execute both paths
      const metricsResults = service.runAllProjections(metrics);
      const fragmentsResults = service.runAllProjectionsFromFragments(fragments);

      // Both should return empty results (no valid data)
      expect(metricsResults).toHaveLength(0);
      expect(fragmentsResults).toHaveLength(0);
    });

    test('should handle empty inputs identically', () => {
      const metricsResults = service.runAllProjections([]);
      const fragmentsResults = service.runAllProjectionsFromFragments([]);

      expect(metricsResults).toHaveLength(0);
      expect(fragmentsResults).toHaveLength(0);
    });
  });

  describe('metricsToFragments conversion equivalence', () => {
    test('converted metrics should produce same results as direct fragments', () => {
      // Original RuntimeMetric
      const metrics: RuntimeMetric[] = [{
        exerciseId: 'Bench Press',
        values: [
          { type: MetricValueType.Repetitions, value: 10, unit: 'reps' },
          { type: MetricValueType.Resistance, value: 100, unit: 'kg' },
        ],
        timeSpans: [
          { start: new Date('2024-01-01T10:00:00Z'), stop: new Date('2024-01-01T10:01:00Z') }
        ],
      }];

      // Convert metrics to fragments using bridge utility
      const convertedFragments = metricsToFragments(metrics);

      // Execute both paths
      const metricsResults = service.runAllProjections(metrics);
      const convertedFragmentsResults = service.runAllProjectionsFromFragments(convertedFragments);

      // Verify both produce results
      expect(metricsResults).toHaveLength(1);
      expect(convertedFragmentsResults).toHaveLength(1);

      // Compare volume values
      expect(metricsResults[0].value).toBe(convertedFragmentsResults[0].value);
      expect(metricsResults[0].name).toBe(convertedFragmentsResults[0].name);
    });
  });

  describe('Multi-exercise equivalence', () => {
    test('should handle multiple exercises identically', () => {
      // Add another exercise
      const squatExercise: Exercise = {
        name: 'Squat',
        primaryMuscles: [],
        secondaryMuscles: [],
        level: Level.intermediate,
        category: Category.strength,
        instructions: [],
      };

      ExerciseDefinitionService.reset();
      exerciseService = ExerciseDefinitionService.getInstance([mockExercise, squatExercise]);
      service.setExerciseService(exerciseService);

      // Metrics for two exercises
      const metrics: RuntimeMetric[] = [
        {
          exerciseId: 'Bench Press',
          values: [
            { type: MetricValueType.Repetitions, value: 10, unit: 'reps' },
            { type: MetricValueType.Resistance, value: 100, unit: 'kg' },
          ],
          timeSpans: [
            { start: new Date('2024-01-01T10:00:00Z'), stop: new Date('2024-01-01T10:01:00Z') }
          ],
        },
        {
          exerciseId: 'Squat',
          values: [
            { type: MetricValueType.Repetitions, value: 5, unit: 'reps' },
            { type: MetricValueType.Resistance, value: 200, unit: 'kg' },
          ],
          timeSpans: [
            { start: new Date('2024-01-01T10:02:00Z'), stop: new Date('2024-01-01T10:03:00Z') }
          ],
        },
      ];

      // Fragments for two exercises
      const fragments: ICodeFragment[] = [
        { type: 'effort', fragmentType: FragmentType.Effort, value: 'Bench Press' },
        { type: 'rep', fragmentType: FragmentType.Rep, value: 10 },
        { type: 'resistance', fragmentType: FragmentType.Resistance, value: 100 },
        { type: 'effort', fragmentType: FragmentType.Effort, value: 'Squat' },
        { type: 'rep', fragmentType: FragmentType.Rep, value: 5 },
        { type: 'resistance', fragmentType: FragmentType.Resistance, value: 200 },
      ];

      // Execute both paths
      const metricsResults = service.runAllProjections(metrics);
      const fragmentsResults = service.runAllProjectionsFromFragments(fragments);

      // Both should produce 2 results (one per exercise)
      expect(metricsResults).toHaveLength(2);
      expect(fragmentsResults).toHaveLength(2);

      // Sort results by exercise name for comparison
      const sortByExercise = (a: any, b: any) => 
        a.metadata?.exerciseName?.localeCompare(b.metadata?.exerciseName);
      
      metricsResults.sort(sortByExercise);
      fragmentsResults.sort(sortByExercise);

      // Compare Bench Press results
      expect(metricsResults[0].value).toBe(1000); // 10 * 100
      expect(fragmentsResults[0].value).toBe(1000);
      expect(metricsResults[0].metadata?.exerciseName).toBe('Bench Press');
      expect(fragmentsResults[0].metadata?.exerciseName).toBe('Bench Press');

      // Compare Squat results
      expect(metricsResults[1].value).toBe(1000); // 5 * 200
      expect(fragmentsResults[1].value).toBe(1000);
      expect(metricsResults[1].metadata?.exerciseName).toBe('Squat');
      expect(fragmentsResults[1].metadata?.exerciseName).toBe('Squat');
    });
  });
});
