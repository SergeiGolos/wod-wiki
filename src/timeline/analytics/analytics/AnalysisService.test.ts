import { describe, test, expect, beforeEach } from 'bun:test';
import { AnalysisService } from './AnalysisService';
import { ExerciseDefinitionService } from '../../../repositories/workout/ExerciseDefinitionService';
import type { IProjectionEngine } from './IProjectionEngine';
import type { RuntimeMetric } from '../../../runtime/RuntimeMetric';
import type { Exercise } from '../../../exercise.d';
import { Level, Category } from '../../../exercise.d';
import type { ProjectionResult } from './ProjectionResult';
import { FragmentType } from '../../../core/models/CodeFragment';
import type { ICodeFragment } from '../../../core/models/CodeFragment';

// Mock projection engine for testing
class MockProjectionEngine implements IProjectionEngine {
  readonly name = 'MockEngine';
  
  calculate(_metrics: RuntimeMetric[], _definition: Exercise): ProjectionResult[] {
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

  describe('runAllProjections()', () => {
    test('should return empty array if no exercise service', () => {
      const serviceWithoutExercises = new AnalysisService();
      const metrics: RuntimeMetric[] = [];
      
      const results = serviceWithoutExercises.runAllProjections(metrics);
      expect(results).toEqual([]);
    });

    test('should run registered engines on metrics', () => {
      const engine = new MockProjectionEngine();
      service.registerEngine(engine);
      
      const metrics: RuntimeMetric[] = [
        {
          exerciseId: 'Bench Press',
          values: [{ type: 'repetitions', value: 10, unit: 'reps' }],
          timeSpans: [{ start: new Date(), stop: new Date() }],
        },
      ];
      
      const results = service.runAllProjections(metrics);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Mock Result');
    });

    test('should skip metrics with unknown exercise', () => {
      const engine = new MockProjectionEngine();
      service.registerEngine(engine);
      
      const metrics: RuntimeMetric[] = [
        {
          exerciseId: 'Unknown Exercise',
          values: [{ type: 'repetitions', value: 10, unit: 'reps' }],
          timeSpans: [{ start: new Date(), stop: new Date() }],
        },
      ];
      
      const results = service.runAllProjections(metrics);
      expect(results).toEqual([]);
    });

    test('should group metrics by exercise', () => {
      let callCount = 0;
      const countingEngine: IProjectionEngine = {
        name: 'CountingEngine',
        calculate: (_metrics: RuntimeMetric[]) => {
          callCount++;
          return [];
        },
      };
      
      service.registerEngine(countingEngine);
      
      const metrics: RuntimeMetric[] = [
        {
          exerciseId: 'Bench Press',
          values: [{ type: 'repetitions', value: 10, unit: 'reps' }],
          timeSpans: [{ start: new Date(), stop: new Date() }],
        },
        {
          exerciseId: 'Bench Press',
          values: [{ type: 'repetitions', value: 8, unit: 'reps' }],
          timeSpans: [{ start: new Date(), stop: new Date() }],
        },
      ];
      
      service.runAllProjections(metrics);
      
      // Should be called once for the Bench Press exercise
      expect(callCount).toBe(1);
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
      const engine: IProjectionEngine = {
        name: 'FragmentEngine',
        calculate: () => [],
        calculateFromFragments: (_fragments, _exerciseId, _definition) => [{
          name: 'Fragment Result',
          value: 200,
          unit: 'test',
          timeSpan: { start: new Date(), stop: new Date() },
        }],
      };

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
      expect(results[0].name).toBe('Fragment Result');
      expect(results[0].value).toBe(200);
    });

    test('should group fragments by exercise', () => {
      let capturedExerciseId: string | undefined;

      const engine: IProjectionEngine = {
        name: 'CaptureEngine',
        calculate: () => [],
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

    test('should skip engines without calculateFromFragments', () => {
      const legacyEngine: IProjectionEngine = {
        name: 'LegacyEngine',
        calculate: () => [{
          name: 'Should Not Appear',
          value: 0,
          unit: '',
          timeSpan: { start: new Date(), stop: new Date() },
        }],
      };

      service.registerEngine(legacyEngine);

      const fragments: ICodeFragment[] = [
        {
          type: 'effort',
          fragmentType: FragmentType.Effort,
          value: 'Bench Press',
        },
      ];

      const results = service.runAllProjectionsFromFragments(fragments);
      expect(results).toHaveLength(0);
    });
  });
});

