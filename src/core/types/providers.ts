/**
 * Provider interfaces for WOD Wiki
 * 
 * These interfaces define the contract for providing external data
 * to the library, allowing consumers to implement their own data sources.
 */

import { Exercise } from './exercise';

/**
 * Exercise path index entry
 */
export interface ExercisePathEntry {
  name: string;
  path: string;
  searchTerms: string[];
}

/**
 * Exercise path group for organizing exercises
 */
export interface ExercisePathGroup {
  rootName: string;
  entries: ExercisePathEntry[];
}

/**
 * Complete exercise path index structure
 */
export interface ExercisePathIndex {
  groups: ExercisePathGroup[];
  groupsByName: Record<string, ExercisePathGroup>;
  allEntries: ExercisePathEntry[];
  totalExercises: number;
}

/**
 * Provider interface for exercise data
 * 
 * Consumers must implement this interface to provide exercise data
 * to the WOD Wiki editor components.
 * 
 * @example
 * ```typescript
 * class MyExerciseProvider implements ExerciseDataProvider {
 *   async loadIndex(): Promise<ExercisePathIndex> {
 *     const response = await fetch('/api/exercises/index');
 *     return response.json();
 *   }
 *   
 *   async loadExercise(path: string): Promise<Exercise> {
 *     const response = await fetch(`/api/exercises/${path}`);
 *     return response.json();
 *   }
 *   
 *   async searchExercises(query: string, limit?: number): Promise<ExercisePathEntry[]> {
 *     const response = await fetch(`/api/exercises/search?q=${query}&limit=${limit}`);
 *     return response.json();
 *   }
 * }
 * 
 * // Use with WodWiki component
 * <WodWiki exerciseProvider={new MyExerciseProvider()} />
 * ```
 */
export interface ExerciseDataProvider {
  /**
   * Load the complete exercise index
   * @returns Promise resolving to the exercise path index
   */
  loadIndex(): Promise<ExercisePathIndex>;

  /**
   * Load a specific exercise by its path
   * @param path Relative path to the exercise (e.g., "3_4-sit-up")
   * @returns Promise resolving to the exercise data
   */
  loadExercise(path: string): Promise<Exercise>;

  /**
   * Search for exercises by query string
   * @param query Search query
   * @param limit Maximum number of results (default: 50)
   * @returns Promise resolving to matching exercise entries
   */
  searchExercises(query: string, limit?: number): Promise<ExercisePathEntry[]>;
}

/**
 * Provider interface for workout data
 * 
 * Optional provider for loading pre-defined workout templates
 * and programs.
 * 
 * @example
 * ```typescript
 * class MyWorkoutProvider implements WorkoutDataProvider {
 *   async loadWorkout(id: string): Promise<string> {
 *     const response = await fetch(`/api/workouts/${id}`);
 *     return response.text();
 *   }
 *   
 *   async searchWorkouts(query: string): Promise<WorkoutMetadata[]> {
 *     const response = await fetch(`/api/workouts/search?q=${query}`);
 *     return response.json();
 *   }
 * }
 * ```
 */
export interface WorkoutDataProvider {
  /**
   * Load a workout by its ID
   * @param id Workout identifier
   * @returns Promise resolving to workout script text
   */
  loadWorkout(id: string): Promise<string>;

  /**
   * Search for workouts by query
   * @param query Search query
   * @param limit Maximum number of results
   * @returns Promise resolving to matching workout metadata
   */
  searchWorkouts(query: string, limit?: number): Promise<WorkoutMetadata[]>;
}

/**
 * Metadata for a workout template
 */
export interface WorkoutMetadata {
  id: string;
  name: string;
  description?: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  duration?: number;
  equipment?: string[];
}
