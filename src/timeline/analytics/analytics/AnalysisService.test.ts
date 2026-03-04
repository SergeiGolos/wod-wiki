import { describe, test, expect, beforeEach } from 'bun:test';
import { AnalysisService } from './AnalysisService';
import { ExerciseDefinitionService } from '../../../repositories/workout/ExerciseDefinitionService';
import type { IProjectionEngine } from './IProjectionEngine';
import type { Exercise } from '../../../exercise.d';
import { Level, Category } from '../../../exercise.d';
import { MetricType } from '../../../core/models/Metric';
import type { IMetric } from '../../../core/models/Metric';

// Mock projection engine for testing
class MockProjectionEngine implements IProjectionEngine {
  readonly name = 'MockEngine';

  calculateFromFragments(_metrics: IMetric[], _exerciseId: string, _definition: Exercise) {
    return [{
      name: 'Mock Result',
      value: 100,
      unit: 'test',
      timeSpan: { start: new Date(), stop: new Date() } as any,
    }];
  }
}

describe('AnalysisService', () => {
  let service: AnalysisService;
  let exerciseService: ExerciseDefinitionService;

  beforeEach(() => {
    service = new AnalysisService();
    ExerciseDefinitionService.reset();

    const exercises: Exercise[] = [
      {
        name: 'Bench Press',
        primaryMuscles: [],
        secondaryMuscles: [],
        level: Level.intermediate,
        category: Category.strength,
        instructions: [],
      },
    ];

    exerciseService = ExerciseDefinitionService.getInstance(exercises);
    service.setExerciseService(exerciseService);
  });

  describe('registerEngine()', () => {
    test('should register a projection engine', () => {
      const engine = new MockProjectionEngine();
      service.registerEngine(engine);

      const engines = service.getEngines();
      expect(engines).toHaveLength(1);
      expect(engines[0]).toBe(engine);
    });

    test('should register multiple engines', () => {
      const engine1 = new MockProjectionEngine();
      const engine2 = new MockProjectionEngine();

      service.registerEngine(engine1);
      service.registerEngine(engine2);

      const engines = service.getEngines();
      expect(engines).toHaveLength(2);
    });
  });

  describe('clearEngines()', () => {
    test('should clear all registered engines', () => {
      const engine = new MockProjectionEngine();
      service.registerEngine(engine);

      expect(service.getEngines()).toHaveLength(1);

      service.clearEngines();
      expect(service.getEngines()).toHaveLength(0);
    });
  });

  describe('runAllProjectionsFromFragments()', () => {
    test('should run metrics-based projections', () => {
      const engine = new MockProjectionEngine();
      service.registerEngine(engine);

      const metrics: IMetric[] = [
        {
          type: 'effort',
          metricType: MetricType.Effort,
          value: 'Bench Press',
          image: 'Bench Press',
        },
        {
          type: 'rep',
          metricType: MetricType.Rep,
          value: 10,
        },
      ];

      const results = service.runAllProjectionsFromFragments(metrics);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Mock Result');
      expect(results[0].value).toBe(100);
    });

    test('should group metrics by exercise', () => {
      let capturedExerciseId: string | undefined;

      const engine: IProjectionEngine = {
        name: 'CaptureEngine',
        calculateFromFragments: (_metrics, exerciseId) => {
          capturedExerciseId = exerciseId;
          return [];
        },
      };

      service.registerEngine(engine);

      const metrics: IMetric[] = [
        {
          type: 'effort',
          metricType: MetricType.Effort,
          value: 'Bench Press',
        },
        {
          type: 'rep',
          metricType: MetricType.Rep,
          value: 10,
        },
      ];

      service.runAllProjectionsFromFragments(metrics);
      expect(capturedExerciseId).toBe('Bench Press');
    });

    test('should skip metrics without a preceding effort metrics', () => {
      let callCount = 0;
      const engine: IProjectionEngine = {
        name: 'TestEngine',
        calculateFromFragments: () => {
          callCount++;
          return [];
        },
      };

      service.registerEngine(engine);

      // Fragment without Effort metrics before it
      const metrics: IMetric[] = [
        {
          type: 'rep',
          metricType: MetricType.Rep,
          value: 10,
        },
      ];

      service.runAllProjectionsFromFragments(metrics);
      expect(callCount).toBe(0);
    });
  });
});
