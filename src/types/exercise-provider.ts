/**
 * Provider contracts for editor data injection.
 *
 * These interfaces define how the app supplies external data (exercise
 * catalogs, workout templates) to editor components, keeping the editor
 * decoupled from any concrete data source. They previously lived in the
 * engine package's `core/types/providers` but are app-editor concerns over
 * app-owned data (`Exercise`, `ExercisePathIndex`) and moved here on the
 * package cutover (#970).
import type { ExercisePathEntry, ExercisePathIndex } from '@/tools/ExercisePathIndexer';
import type { Exercise } from '@/exercise';

/**
 * Provider interface for exercise data.
 *
 * Consumers must implement this interface to provide exercise data
 * to the WOD Wiki editor components.
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
