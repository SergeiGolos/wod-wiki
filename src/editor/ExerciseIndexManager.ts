import { LRUCache } from './LRUCache';
import { ExercisePathIndex, ExercisePathEntry, ExercisePathGroup } from '../tools/ExercisePathIndexer';
import { Exercise } from '../exercise';

/**
 * Singleton manager for exercise index and data loading
 * 
 * Provides:
 * - Asynchronous index loading with localStorage caching
 * - Search operations across 873 exercises
 * - LRU cache for exercise data (max 100 entries)
 * - Lazy loading of exercise JSON files
 */
export class ExerciseIndexManager {
  private static instance: ExerciseIndexManager | null = null;
  private static initPromise: Promise<ExerciseIndexManager> | null = null;

  private index: ExercisePathIndex | null = null;
  private exerciseCache: LRUCache<string, Exercise>;
  private loadingPromises: Map<string, Promise<Exercise>>;

  private readonly INDEX_PATH = '/exercise-path-index.json';
  private readonly CACHE_KEY = 'wod-wiki-exercise-index';
  private readonly CACHE_VERSION = '1.0.0';
  private readonly CACHE_VERSION_KEY = 'wod-wiki-exercise-index-version';

  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {
    this.exerciseCache = new LRUCache<string, Exercise>(100);
    this.loadingPromises = new Map();
  }

  /**
   * Get the singleton instance
   * Creates and initializes on first call
   * @returns Promise resolving to ExerciseIndexManager instance
   */
  static async getInstance(): Promise<ExerciseIndexManager> {
    if (this.instance) {
      return this.instance;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initialize();
    this.instance = await this.initPromise;
    return this.instance;
  }

  /**
   * Initialize the manager and load index
   */
  private static async initialize(): Promise<ExerciseIndexManager> {
    const manager = new ExerciseIndexManager();
    await manager.loadIndex();
    return manager;
  }

  /**
   * Load exercise index with caching strategy
   * 1. Check localStorage cache
   * 2. Load from network if cache miss or invalid
   * 3. Save to localStorage on successful load
   */
  private async loadIndex(): Promise<void> {
    try {
      // Try loading from localStorage cache
      const cachedIndex = this.loadFromCache();
      if (cachedIndex) {
        this.index = cachedIndex;
        console.log('[ExerciseIndexManager] Loaded index from cache');
        return;
      }

      // Load from network
      console.log('[ExerciseIndexManager] Loading index from network...');
      const startTime = performance.now();
      
      const response = await fetch(this.INDEX_PATH);
      if (!response.ok) {
        throw new Error(`Failed to load exercise index: ${response.statusText}`);
      }

      const loadedIndex = await response.json() as ExercisePathIndex;
      this.index = loadedIndex;
      const loadTime = performance.now() - startTime;
      
      console.log(`[ExerciseIndexManager] Loaded index in ${loadTime.toFixed(0)}ms`);
      console.log(`[ExerciseIndexManager] ${loadedIndex.totalExercises} exercises, ${loadedIndex.groups.length} groups`);

      // Save to cache
      this.saveToCache(loadedIndex);

    } catch (error) {
      console.error('[ExerciseIndexManager] Failed to load exercise index:', error);
      // Use fallback empty index
      this.index = {
        groups: [],
        groupsByName: {},
        allEntries: [],
        totalExercises: 0
      };
    }
  }

  /**
   * Load index from localStorage cache
   * @returns Cached index or null if not found/invalid
   */
  private loadFromCache(): ExercisePathIndex | null {
    try {
      const cachedVersion = localStorage.getItem(this.CACHE_VERSION_KEY);
      if (cachedVersion !== this.CACHE_VERSION) {
        console.log('[ExerciseIndexManager] Cache version mismatch, invalidating');
        return null;
      }

      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) {
        return null;
      }

      const index = JSON.parse(cached) as ExercisePathIndex;
      
      // Validate structure
      if (!index.groups || !index.allEntries || !index.groupsByName) {
        console.warn('[ExerciseIndexManager] Invalid cached index structure');
        return null;
      }

      return index;
    } catch (error) {
      console.error('[ExerciseIndexManager] Error loading from cache:', error);
      return null;
    }
  }

  /**
   * Save index to localStorage cache
   * @param index Index to cache
   */
  private saveToCache(index: ExercisePathIndex): void {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(index));
      localStorage.setItem(this.CACHE_VERSION_KEY, this.CACHE_VERSION);
      console.log('[ExerciseIndexManager] Saved index to cache');
    } catch (error) {
      console.error('[ExerciseIndexManager] Error saving to cache:', error);
    }
  }

  /**
   * Search for exercises by query string
   * @param query Search query
   * @param limit Maximum results (default: 50)
   * @returns Array of matching exercise entries
   */
  searchExercises(query: string, limit: number = 50): ExercisePathEntry[] {
    if (!this.index || !query) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const results: Array<{ entry: ExercisePathEntry; score: number }> = [];

    // Search through all entries
    for (const entry of this.index.allEntries) {
      const score = this.calculateRelevanceScore(entry, normalizedQuery);
      if (score > 0) {
        results.push({ entry, score });
      }
    }

    // Sort by score (highest first) and limit results
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map(r => r.entry);
  }

  /**
   * Calculate relevance score for an exercise against a query
   * @param entry Exercise entry
   * @param query Normalized query string
   * @returns Relevance score (higher is better, 0 = no match)
   */
  private calculateRelevanceScore(entry: ExercisePathEntry, query: string): number {
    const nameLower = entry.name.toLowerCase();
    
    // Exact match
    if (nameLower === query) {
      return 100;
    }

    // Starts with query
    if (nameLower.startsWith(query)) {
      return 80;
    }

    // Contains query
    if (nameLower.includes(query)) {
      return 60;
    }

    // Check search terms
    for (const term of entry.searchTerms) {
      const termLower = term.toLowerCase();
      
      if (termLower === query) {
        return 50;
      }
      
      if (termLower.startsWith(query)) {
        return 40;
      }
      
      if (termLower.includes(query)) {
        return 20;
      }
    }

    return 0;
  }

  /**
   * Get exercise group by root name
   * @param rootName Root exercise name
   * @returns Exercise group or undefined
   */
  getExerciseGroup(rootName: string): ExercisePathGroup | undefined {
    if (!this.index) {
      return undefined;
    }
    return this.index.groupsByName[rootName];
  }

  /**
   * Load full exercise data from JSON file
   * @param path Relative path to exercise directory
   * @returns Promise resolving to Exercise data
   */
  async loadExerciseData(path: string): Promise<Exercise> {
    // Check cache first
    if (this.exerciseCache.has(path)) {
      return this.exerciseCache.get(path)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(path)) {
      return this.loadingPromises.get(path)!;
    }

    // Start loading
    const loadPromise = this.fetchExerciseData(path);
    this.loadingPromises.set(path, loadPromise);

    try {
      const exercise = await loadPromise;
      this.exerciseCache.set(path, exercise);
      return exercise;
    } finally {
      this.loadingPromises.delete(path);
    }
  }

  /**
   * Fetch exercise data from JSON file
   * @param path Relative path to exercise directory
   * @returns Promise resolving to Exercise data
   */
  private async fetchExerciseData(path: string): Promise<Exercise> {
    // Validate path to prevent directory traversal
    if (path.includes('..') || path.startsWith('/')) {
      throw new Error(`Invalid exercise path: ${path}`);
    }

    const exercisePath = `/exercises/${path}/exercise.json`;
    
    try {
      const response = await fetch(exercisePath);
      if (!response.ok) {
        throw new Error(`Failed to load exercise: ${response.statusText}`);
      }

      const exercise = await response.json() as Exercise;
      return exercise;
    } catch (error) {
      console.error(`[ExerciseIndexManager] Error loading exercise data from ${exercisePath}:`, error);
      throw error;
    }
  }

  /**
   * Check if exercise data is cached
   * @param path Exercise path
   * @returns true if cached
   */
  isCached(path: string): boolean {
    return this.exerciseCache.has(path);
  }

  /**
   * Clear exercise data cache
   */
  clearCache(): void {
    this.exerciseCache.clear();
    console.log('[ExerciseIndexManager] Cache cleared');
  }

  /**
   * Invalidate specific exercise from cache
   * @param path Exercise path
   */
  invalidateExercise(path: string): void {
    this.exerciseCache.delete(path);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      ...this.exerciseCache.getStats(),
      indexLoaded: this.index !== null,
      totalExercises: this.index?.totalExercises || 0,
      totalGroups: this.index?.groups.length || 0
    };
  }

  /**
   * Get all exercise entries (for testing/debugging)
   */
  getAllEntries(): ExercisePathEntry[] {
    return this.index?.allEntries || [];
  }

  /**
   * Check if index is loaded
   */
  isIndexLoaded(): boolean {
    return this.index !== null;
  }
}
