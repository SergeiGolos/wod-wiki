import { describe, it, expect, beforeEach, vi, afterEach } from 'bun:test';
import { ExerciseSearchEngine } from './ExerciseSearchEngine';
import { ExerciseIndexManager } from './ExerciseIndexManager';
import type { ExercisePathIndex, ExerciseDataProvider } from '../types/providers';

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

// Mock provider
class MockExerciseProvider implements ExerciseDataProvider {
  async loadIndex(): Promise<ExercisePathIndex> {
    return mockIndex;
  }
  
  async loadExercise(path: string): Promise<any> {
    return { name: path };
  }
  
  async searchExercises(query: string, limit?: number): Promise<any[]> {
    const results = mockIndex.allEntries.filter(e => 
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.searchTerms.some(term => term.toLowerCase().includes(query.toLowerCase()))
    );
    return results.slice(0, limit || 50);
  }
}

describe('ExerciseSearchEngine', () => {
  let indexManager: ExerciseIndexManager;
  let searchEngine: ExerciseSearchEngine;

  beforeEach(async () => {
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

    indexManager = ExerciseIndexManager.getInstance();
    indexManager.setProvider(new MockExerciseProvider());
    
    searchEngine = new ExerciseSearchEngine(indexManager);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('immediate search', () => {
    it('should search without debouncing', async () => {
      const results = await searchEngine.searchImmediate('barbell');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Barbell');
    });

    it('should respect search limit', async () => {
      const results = await searchEngine.searchImmediate('', { limit: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for no matches', async () => {
      const results = await searchEngine.searchImmediate('nonexistent');

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
      const results = await searchEngine.searchImmediate('dumbbell');

      await new Promise(resolve => setTimeout(resolve, 200));

      // Callback should not have been called
      expect(callback).not.toHaveBeenCalled();
      expect(results[0].name).toContain('Dumbbell');
    });
  });

  describe('filtering', () => {
    it('should filter by equipment', async () => {
      const results = await searchEngine.searchImmediate('', {
        equipment: ['barbell']
      });

      expect(results.every(r => r.searchTerms.includes('barbell'))).toBe(true);
    });

    it('should filter by muscles', async () => {
      const results = await searchEngine.searchImmediate('', {
        muscles: ['chest']
      });

      expect(results.some(r => r.name === 'Push-Up')).toBe(true);
      expect(results.every(r => 
        r.searchTerms.some(term => term.includes('chest'))
      )).toBe(true);
    });

    it('should filter by difficulty', async () => {
      const results = await searchEngine.searchImmediate('', {
        difficulty: ['beginner']
      });

      expect(results.every(r => r.searchTerms.includes('beginner'))).toBe(true);
    });

    it('should apply multiple filters', async () => {
      const results = await searchEngine.searchImmediate('', {
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
    it('should cache search results', async () => {
      const spy = vi.spyOn(indexManager, 'searchExercises');

      // First search
      await searchEngine.searchImmediate('barbell');
      expect(spy).toHaveBeenCalledTimes(1);

      // Second search with same query should use cache
      await searchEngine.searchImmediate('barbell');
      expect(spy).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('should use different cache for different queries', async () => {
      const spy = vi.spyOn(indexManager, 'searchExercises');

      await searchEngine.searchImmediate('barbell');
      await searchEngine.searchImmediate('dumbbell');

      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should use different cache for different options', async () => {
      const spy = vi.spyOn(indexManager, 'searchExercises');

      await searchEngine.searchImmediate('barbell', { equipment: ['barbell'] });
      await searchEngine.searchImmediate('barbell', { equipment: ['dumbbell'] });

      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should clear cache on demand', async () => {
      const spy = vi.spyOn(indexManager, 'searchExercises');

      await searchEngine.searchImmediate('barbell');
      searchEngine.clearCache();
      await searchEngine.searchImmediate('barbell');

      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should limit cache size', async () => {
      // Perform many searches to fill cache
      for (let i = 0; i < 150; i++) {
        await searchEngine.searchImmediate(`query${i}`);
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
    it('should provide cache statistics', async () => {
      await searchEngine.searchImmediate('barbell');
      await searchEngine.searchImmediate('dumbbell');

      const stats = searchEngine.getCacheStats();
      expect(stats.cacheSize).toBeGreaterThan(0);
      expect(stats.lastQuery).toBeDefined();
      expect(stats.lastResultCount).toBeGreaterThanOrEqual(0);
    });
  });
});
