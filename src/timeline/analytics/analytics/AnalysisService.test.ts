import { describe, test, expect, beforeEach } from 'bun:test';
import { AnalysisService } from './AnalysisService';
import { ExerciseDefinitionService } from '../../../repositories/workout/ExerciseDefinitionService';
import type { IProjectionEngine } from './IProjectionEngine';
import type { Exercise } from '../../../exercise.d';
import { Level, Category } from '../../../exercise.d';
import { FragmentType } from '../../../core/models/CodeFragment';
import type { ICodeFragment } from '../../../core/models/CodeFragment';

// Mock projection engine for testing
class MockProjectionEngine implements IProjectionEngine {
  readonly name = 'MockEngine';

  calculateFromFragments(_fragments: ICodeFragment[], _exerciseId: string, _definition: Exercise) {
    return [{
      name: 'Mock Result',
      value: 100,
      unit: 'test',
      timeSpan: { start: new Date(), stop: new Date() },
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
    test('should run fragment-based projections', () => {
      const engine = new MockProjectionEngine();
      service.registerEngine(engine);

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
      ];

      const results = service.runAllProjectionsFromFragments(fragments);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Mock Result');
      expect(results[0].value).toBe(100);
    });

    test('should group fragments by exercise', () => {
      let capturedExerciseId: string | undefined;

      const engine: IProjectionEngine = {
        name: 'CaptureEngine',
        calculateFromFragments: (_fragments, exerciseId) => {
          capturedExerciseId = exerciseId;
          return [];
        },
      };

      service.registerEngine(engine);

      const fragments: ICodeFragment[] = [
        {
          type: 'effort',
          fragmentType: FragmentType.Effort,
          value: 'Bench Press',
        },
        {
          type: 'rep',
          fragmentType: FragmentType.Rep,
          value: 10,
        },
      ];

      service.runAllProjectionsFromFragments(fragments);
      expect(capturedExerciseId).toBe('Bench Press');
    });

    test('should skip fragments without a preceding effort fragment', () => {
      let callCount = 0;
      const engine: IProjectionEngine = {
        name: 'TestEngine',
        calculateFromFragments: () => {
          callCount++;
          return [];
        },
      };

      service.registerEngine(engine);

      // Fragment without Effort fragment before it
      const fragments: ICodeFragment[] = [
        {
          type: 'rep',
          fragmentType: FragmentType.Rep,
          value: 10,
        },
      ];

      service.runAllProjectionsFromFragments(fragments);
      expect(callCount).toBe(0);
    });
  });
});
