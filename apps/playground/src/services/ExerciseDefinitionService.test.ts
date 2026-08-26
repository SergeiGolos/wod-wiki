import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { ExerciseDefinitionService } from '../repositories/workout/ExerciseDefinitionService';
import { Exercise, Level, Category } from '../exercise.d';

describe('ExerciseDefinitionService', () => {
  afterEach(() => {
    // Reset singleton after each test
    ExerciseDefinitionService.reset();
  });

  describe('getInstance()', () => {
    test('should create singleton instance with exercises', () => {
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

      const service = ExerciseDefinitionService.getInstance(exercises);
      expect(service).toBeDefined();
    });

    test('should return same instance on subsequent calls', () => {
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

      const service1 = ExerciseDefinitionService.getInstance(exercises);
      const service2 = ExerciseDefinitionService.getInstance();
      
      expect(service1).toBe(service2);
    });

    test('should throw error if no exercises provided on first instantiation', () => {
      expect(() => {
        ExerciseDefinitionService.getInstance();
      }).toThrow('Exercises must be provided on first instantiation');
    });
  });

  describe('findById()', () => {
    test('should find exercise by name', () => {
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

      const service = ExerciseDefinitionService.getInstance(exercises);
      const found = service.findById('Bench Press');
      
      expect(found).toBeDefined();
      expect(found?.name).toBe('Bench Press');
    });

    test('should return undefined for non-existent exercise', () => {
      const exercises: Exercise[] = [];
      const service = ExerciseDefinitionService.getInstance(exercises);
      
      const found = service.findById('Non-Existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getAllExercises()', () => {
    test('should return all exercises', () => {
      const exercises: Exercise[] = [
        {
          name: 'Bench Press',
          primaryMuscles: [],
          secondaryMuscles: [],
          level: Level.intermediate,
          category: Category.strength,
          instructions: [],
        },
        {
          name: 'Squat',
          primaryMuscles: [],
          secondaryMuscles: [],
          level: Level.intermediate,
          category: Category.strength,
          instructions: [],
        },
      ];

      const service = ExerciseDefinitionService.getInstance(exercises);
      const all = service.getAllExercises();
      
      expect(all).toHaveLength(2);
    });
  });

  describe('addExercise()', () => {
    test('should add new exercise', () => {
      const service = ExerciseDefinitionService.getInstance([]);
      
      const exercise: Exercise = {
        name: 'Deadlift',
        primaryMuscles: [],
        secondaryMuscles: [],
        level: Level.intermediate,
        category: Category.strength,
        instructions: [],
      };

      service.addExercise(exercise);
      
      const found = service.findById('Deadlift');
      expect(found).toBeDefined();
      expect(found?.name).toBe('Deadlift');
    });

    test('should update existing exercise', () => {
      const exercise1: Exercise = {
        name: 'Bench Press',
        primaryMuscles: [],
        secondaryMuscles: [],
        level: Level.beginner,
        category: Category.strength,
        instructions: [],
      };

      const service = ExerciseDefinitionService.getInstance([exercise1]);
      
      const exercise2: Exercise = {
        name: 'Bench Press',
        primaryMuscles: [],
        secondaryMuscles: [],
        level: Level.intermediate,
        category: Category.strength,
        instructions: [],
      };

      service.addExercise(exercise2);
      
      const found = service.findById('Bench Press');
      expect(found?.level).toBe(Level.intermediate);
    });
  });
});
