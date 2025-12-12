import { describe, test, expect, beforeEach } from 'bun:test';
import { AnalysisService } from './AnalysisService';
import { ExerciseDefinitionService } from '../../../repositories/workout/ExerciseDefinitionService';
import { IProjectionEngine } from './IProjectionEngine';
import { RuntimeMetric } from '../runtime/RuntimeMetric';
import { Exercise, Level, Category } from '../../../exercise.d';
import { ProjectionResult } from './ProjectionResult';

// Mock projection engine for testing
class MockProjectionEngine implements IProjectionEngine {
  readonly name = 'MockEngine';
  
  calculate(metrics: RuntimeMetric[], definition: Exercise): ProjectionResult[] {
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
        calculate: (metrics: RuntimeMetric[]) => {
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
});
