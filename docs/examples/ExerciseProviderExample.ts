/**
 * Example ExerciseDataProvider Implementation
 * 
 * This example shows how to implement the ExerciseDataProvider interface
 * to provide exercise data to WOD Wiki components from your own data source.
 */

import type { ExerciseDataProvider, ExercisePathIndex, ExercisePathEntry } from 'wod-wiki/types';
import type { Exercise } from 'wod-wiki/types';

/**
 * Simple fetch-based provider that loads data from an API
 */
export class FetchExerciseProvider implements ExerciseDataProvider {
  constructor(private apiBaseUrl: string) {}

  async loadIndex(): Promise<ExercisePathIndex> {
    const response = await fetch(`${this.apiBaseUrl}/exercises/index`);
    if (!response.ok) {
      throw new Error(`Failed to load exercise index: ${response.statusText}`);
    }
    return response.json();
  }

  async loadExercise(path: string): Promise<Exercise> {
    // Validate path to prevent directory traversal
    if (path.includes('..') || path.startsWith('/')) {
      throw new Error(`Invalid exercise path: ${path}`);
    }

    const response = await fetch(`${this.apiBaseUrl}/exercises/${path}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Exercise not found: ${path}`);
      }
      throw new Error(`Failed to load exercise: ${response.statusText}`);
    }
    return response.json();
  }

  async searchExercises(query: string, limit: number = 50): Promise<ExercisePathEntry[]> {
    const response = await fetch(
      `${this.apiBaseUrl}/exercises/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    if (!response.ok) {
      throw new Error(`Failed to search exercises: ${response.statusText}`);
    }
    return response.json();
  }
}

/**
 * Example usage with WodWiki component:
 * 
 * ```tsx
 * import { WodWiki } from 'wod-wiki/editor';
 * import { FetchExerciseProvider } from './providers/FetchExerciseProvider';
 * 
 * const provider = new FetchExerciseProvider('https://api.example.com');
 * 
 * function App() {
 *   return (
 *     <WodWiki
 *       id="my-editor"
 *       exerciseProvider={provider}
 *       onValueChange={(script) => console.log('Parsed:', script)}
 *     />
 *   );
 * }
 * ```
 */

/**
 * Advanced provider with caching and offline support
 */
export class CachedExerciseProvider implements ExerciseDataProvider {
  private indexCache: ExercisePathIndex | null = null;
  private exerciseCache: Map<string, Exercise> = new Map();

  constructor(
    private apiBaseUrl: string,
    private cacheKeyPrefix: string = 'wod-wiki'
  ) {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): void {
    try {
      const cached = localStorage.getItem(`${this.cacheKeyPrefix}-index`);
      if (cached) {
        this.indexCache = JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }

  private saveToLocalStorage(index: ExercisePathIndex): void {
    try {
      localStorage.setItem(`${this.cacheKeyPrefix}-index`, JSON.stringify(index));
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }

  async loadIndex(): Promise<ExercisePathIndex> {
    // Return cached index if available
    if (this.indexCache) {
      // Optionally: refresh in background
      this.refreshIndex();
      return this.indexCache;
    }

    // Load from API
    const response = await fetch(`${this.apiBaseUrl}/exercises/index`);
    if (!response.ok) {
      throw new Error(`Failed to load exercise index: ${response.statusText}`);
    }

    const index = await response.json();
    this.indexCache = index;
    this.saveToLocalStorage(index);
    return index;
  }

  private async refreshIndex(): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/exercises/index`);
      if (response.ok) {
        const index = await response.json();
        this.indexCache = index;
        this.saveToLocalStorage(index);
      }
    } catch (error) {
      // Silently fail background refresh
      console.debug('Background index refresh failed:', error);
    }
  }

  async loadExercise(path: string): Promise<Exercise> {
    // Check cache first
    if (this.exerciseCache.has(path)) {
      return this.exerciseCache.get(path)!;
    }

    // Validate path
    if (path.includes('..') || path.startsWith('/')) {
      throw new Error(`Invalid exercise path: ${path}`);
    }

    // Load from API
    const response = await fetch(`${this.apiBaseUrl}/exercises/${path}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Exercise not found: ${path}`);
      }
      throw new Error(`Failed to load exercise: ${response.statusText}`);
    }

    const exercise = await response.json();
    this.exerciseCache.set(path, exercise);
    return exercise;
  }

  async searchExercises(query: string, limit: number = 50): Promise<ExercisePathEntry[]> {
    // If we have index cached, search locally
    if (this.indexCache) {
      const normalizedQuery = query.toLowerCase().trim();
      const results = this.indexCache.allEntries
        .filter(entry => 
          entry.name.toLowerCase().includes(normalizedQuery) ||
          entry.searchTerms.some(term => term.toLowerCase().includes(normalizedQuery))
        )
        .slice(0, limit);
      return results;
    }

    // Otherwise, use API search
    const response = await fetch(
      `${this.apiBaseUrl}/exercises/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    if (!response.ok) {
      throw new Error(`Failed to search exercises: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.indexCache = null;
    this.exerciseCache.clear();
    localStorage.removeItem(`${this.cacheKeyPrefix}-index`);
  }
}

/**
 * Static/bundled data provider for offline use
 */
export class StaticExerciseProvider implements ExerciseDataProvider {
  constructor(
    private indexData: ExercisePathIndex,
    private exerciseData: Map<string, Exercise>
  ) {}

  async loadIndex(): Promise<ExercisePathIndex> {
    return this.indexData;
  }

  async loadExercise(path: string): Promise<Exercise> {
    const exercise = this.exerciseData.get(path);
    if (!exercise) {
      throw new Error(`Exercise not found: ${path}`);
    }
    return exercise;
  }

  async searchExercises(query: string, limit: number = 50): Promise<ExercisePathEntry[]> {
    const normalizedQuery = query.toLowerCase().trim();
    const results = this.indexData.allEntries
      .filter(entry => 
        entry.name.toLowerCase().includes(normalizedQuery) ||
        entry.searchTerms.some(term => term.toLowerCase().includes(normalizedQuery))
      )
      .slice(0, limit);
    return results;
  }

  /**
   * Create provider from imported data
   * 
   * @example
   * ```ts
   * import indexData from './data/exercise-index.json';
   * import * as exercises from './data/exercises';
   * 
   * const provider = StaticExerciseProvider.fromImports(indexData, exercises);
   * ```
   */
  static fromImports(
    indexData: ExercisePathIndex,
    exerciseModules: Record<string, Exercise>
  ): StaticExerciseProvider {
    const exerciseMap = new Map(Object.entries(exerciseModules));
    return new StaticExerciseProvider(indexData, exerciseMap);
  }
}
