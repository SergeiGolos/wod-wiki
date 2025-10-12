import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ExerciseSearchEngine } from './ExerciseSearchEngine';
import { ExerciseIndexManager } from './ExerciseIndexManager';
import type { ExercisePathIndex } from '../tools/ExercisePathIndexer';

// Mock data
const mockIndex: ExercisePathIndex = {
  groups: [],
  groupsByName: {},
  allEntries: [
    { name: 'Barbell Squat', path: 'Barbell_Squat', searchTerms: ['barbell', 'squat', 'legs', 'quadriceps', 'intermediate'] },
    { name: 'Dumbbell Curl', path: 'Dumbbell_Curl', searchTerms: ['dumbbell', 'curl', 'biceps', 'arms', 'beginner'] },
    { name: 'Push-Up', path: 'Push-Up', searchTerms: ['push', 'up', 'chest', 'bodyweight', 'beginner'] },
    { name: 'Pull-Up', path: 'Pull-Up', searchTerms: ['pull', 'up', 'back', 'lats', 'intermediate'] }
  ],
  totalExercises: 4
};

describe('ExerciseSearchEngine', () => {
  let indexManager: ExerciseIndexManager;
  let searchEngine: ExerciseSearchEngine;

  beforeEach(async () => {
    // Mock fetch for index loading
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockIndex
    });

    // Mock localStorage
    const storage: Record<string, string> = {};
    global.localStorage = {
      getItem: vi.fn((key: string) => storage[key] || null),
      setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn()
    } as any;

    // Clear singleton
    (ExerciseIndexManager as any).instance = null;
    (ExerciseIndexManager as any).initPromise = null;

    indexManager = await ExerciseIndexManager.getInstance();
    searchEngine = new ExerciseSearchEngine(indexManager);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('immediate search', () => {
    it('should search without debouncing', () => {
      const results = searchEngine.searchImmediate('barbell');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Barbell');
    });

    it('should respect search limit', () => {
      const results = searchEngine.searchImmediate('', { limit: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for no matches', () => {
      const results = searchEngine.searchImmediate('nonexistent');

      expect(results).toEqual([]);
    });
  });

  describe('debounced search', () => {
    it('should debounce multiple rapid searches', async () => {
      const callback = vi.fn();

      searchEngine.search('bar', {}, callback);
      searchEngine.search('barb', {}, callback);
      searchEngine.search('barbe', {}, callback);
      searchEngine.search('barbell', {}, callback);

      // Should not have been called yet
      expect(callback).not.toHaveBeenCalled();

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should have been called only once with final query
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Barbell Squat' })
        ])
      );
    });

    it('should execute callback after debounce delay', async () => {
      const callback = vi.fn();

      searchEngine.search('dumbbell', {}, callback);

      expect(callback).not.toHaveBeenCalled();

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should cancel pending search on immediate search', async () => {
      const callback = vi.fn();

      searchEngine.search('barbell', {}, callback);

      // Immediate search should cancel debounced search
      const results = searchEngine.searchImmediate('dumbbell');

      await new Promise(resolve => setTimeout(resolve, 200));

      // Callback should not have been called
      expect(callback).not.toHaveBeenCalled();
      expect(results[0].name).toContain('Dumbbell');
    });
  });

  describe('filtering', () => {
    it('should filter by equipment', () => {
      const results = searchEngine.searchImmediate('', {
        equipment: ['barbell']
      });

      expect(results.every(r => r.searchTerms.includes('barbell'))).toBe(true);
    });

    it('should filter by muscles', () => {
      const results = searchEngine.searchImmediate('', {
        muscles: ['chest']
      });

      expect(results.some(r => r.name === 'Push-Up')).toBe(true);
      expect(results.every(r => 
        r.searchTerms.some(term => term.includes('chest'))
      )).toBe(true);
    });

    it('should filter by difficulty', () => {
      const results = searchEngine.searchImmediate('', {
        difficulty: ['beginner']
      });

      expect(results.every(r => r.searchTerms.includes('beginner'))).toBe(true);
    });

    it('should apply multiple filters', () => {
      const results = searchEngine.searchImmediate('', {
        equipment: ['barbell'],
        difficulty: ['intermediate']
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => 
        r.searchTerms.includes('barbell') && r.searchTerms.includes('intermediate')
      )).toBe(true);
    });
  });

  describe('caching', () => {
    it('should cache search results', () => {
      const spy = vi.spyOn(indexManager, 'searchExercises');

      // First search
      searchEngine.searchImmediate('barbell');
      expect(spy).toHaveBeenCalledTimes(1);

      // Second search with same query should use cache
      searchEngine.searchImmediate('barbell');
      expect(spy).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('should use different cache for different queries', () => {
      const spy = vi.spyOn(indexManager, 'searchExercises');

      searchEngine.searchImmediate('barbell');
      searchEngine.searchImmediate('dumbbell');

      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should use different cache for different options', () => {
      const spy = vi.spyOn(indexManager, 'searchExercises');

      searchEngine.searchImmediate('barbell', { equipment: ['barbell'] });
      searchEngine.searchImmediate('barbell', { equipment: ['dumbbell'] });

      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should clear cache on demand', () => {
      const spy = vi.spyOn(indexManager, 'searchExercises');

      searchEngine.searchImmediate('barbell');
      searchEngine.clearCache();
      searchEngine.searchImmediate('barbell');

      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should limit cache size', () => {
      // Perform many searches to fill cache
      for (let i = 0; i < 150; i++) {
        searchEngine.searchImmediate(`query${i}`);
      }

      const stats = searchEngine.getCacheStats();
      expect(stats.cacheSize).toBeLessThanOrEqual(100);
    });
  });

  describe('last results tracking', () => {
    it('should track last query', async () => {
      const callback = vi.fn();
      searchEngine.search('barbell', {}, callback);

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(searchEngine.getLastQuery()).toBe('barbell');
    });

    it('should track last results', async () => {
      const callback = vi.fn();
      searchEngine.search('dumbbell', {}, callback);

      await new Promise(resolve => setTimeout(resolve, 200));

      const lastResults = searchEngine.getLastResults();
      expect(lastResults.length).toBeGreaterThan(0);
      expect(lastResults[0].name).toContain('Dumbbell');
    });
  });

  describe('cancellation', () => {
    it('should cancel pending search', async () => {
      const callback = vi.fn();

      searchEngine.search('barbell', {}, callback);
      searchEngine.cancelPending();

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('statistics', () => {
    it('should provide cache statistics', () => {
      searchEngine.searchImmediate('barbell');
      searchEngine.searchImmediate('dumbbell');

      const stats = searchEngine.getCacheStats();
      expect(stats.cacheSize).toBeGreaterThan(0);
      expect(stats.lastQuery).toBeDefined();
      expect(stats.lastResultCount).toBeGreaterThanOrEqual(0);
    });
  });
});
