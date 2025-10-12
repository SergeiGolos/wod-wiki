import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ExerciseIndexManager } from './ExerciseIndexManager';
import type { ExercisePathIndex } from '../tools/ExercisePathIndexer';
import type { Exercise } from '../exercise';

// Mock data
const mockIndex: ExercisePathIndex = {
  groups: [
    {
      rootName: 'Push-Up',
      variations: [
        { name: 'Push-Up', path: 'Push-Up', searchTerms: ['push', 'up', 'chest', 'bodyweight'] },
        { name: 'Diamond Push-Up', path: 'Diamond_Push-Up', searchTerms: ['diamond', 'push', 'up', 'triceps'] }
      ],
      searchTerms: ['push', 'up', 'chest', 'bodyweight', 'diamond', 'triceps'],
      variationCount: 2
    }
  ],
  groupsByName: {
    'Push-Up': {
      rootName: 'Push-Up',
      variations: [
        { name: 'Push-Up', path: 'Push-Up', searchTerms: ['push', 'up', 'chest', 'bodyweight'] },
        { name: 'Diamond Push-Up', path: 'Diamond_Push-Up', searchTerms: ['diamond', 'push', 'up', 'triceps'] }
      ],
      searchTerms: ['push', 'up', 'chest', 'bodyweight', 'diamond', 'triceps'],
      variationCount: 2
    }
  },
  allEntries: [
    { name: 'Push-Up', path: 'Push-Up', searchTerms: ['push', 'up', 'chest', 'bodyweight'] },
    { name: 'Diamond Push-Up', path: 'Diamond_Push-Up', searchTerms: ['diamond', 'push', 'up', 'triceps'] }
  ],
  totalExercises: 2
};

const mockExercise: Exercise = {
  name: 'Push-Up',
  primaryMuscles: ['chest' as any],
  secondaryMuscles: ['triceps' as any],
  level: 'beginner' as any,
  equipment: 'body only' as any,
  category: 'strength' as any,
  instructions: ['Get into plank position', 'Lower body', 'Push back up']
};

describe('ExerciseIndexManager', () => {
  let originalFetch: typeof global.fetch;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    // Mock fetch
    originalFetch = global.fetch;
    global.fetch = vi.fn();

    // Mock localStorage
    originalLocalStorage = global.localStorage;
    const storage: Record<string, string> = {};
    global.localStorage = {
      getItem: vi.fn((key: string) => storage[key] || null),
      setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
      removeItem: vi.fn((key: string) => { delete storage[key]; }),
      clear: vi.fn(() => { Object.keys(storage).forEach(key => delete storage[key]); }),
      length: 0,
      key: vi.fn(() => null)
    } as any;

    // Clear singleton instance for testing
    (ExerciseIndexManager as any).instance = null;
    (ExerciseIndexManager as any).initPromise = null;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.localStorage = originalLocalStorage;
  });

  describe('singleton pattern', () => {
    it('should return same instance on multiple calls', async () => {
      // Mock successful fetch
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockIndex
      });

      const instance1 = await ExerciseIndexManager.getInstance();
      const instance2 = await ExerciseIndexManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should initialize only once even with concurrent calls', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockIndex
      });

      const [instance1, instance2, instance3] = await Promise.all([
        ExerciseIndexManager.getInstance(),
        ExerciseIndexManager.getInstance(),
        ExerciseIndexManager.getInstance()
      ]);

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('index loading', () => {
    it('should load index from network on first call', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockIndex
      });

      const manager = await ExerciseIndexManager.getInstance();

      expect(manager.isIndexLoaded()).toBe(true);
      expect(manager.getAllEntries()).toHaveLength(2);
      expect(global.fetch).toHaveBeenCalledWith('/exercise-path-index.json');
    });

    it('should save loaded index to localStorage', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockIndex
      });

      await ExerciseIndexManager.getInstance();

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'wod-wiki-exercise-index',
        expect.any(String)
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'wod-wiki-exercise-index-version',
        '1.0.0'
      );
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const manager = await ExerciseIndexManager.getInstance();

      expect(manager.isIndexLoaded()).toBe(true); // Fallback empty index
      expect(manager.getAllEntries()).toHaveLength(0);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockIndex
      });
    });

    it('should find exact name matches', async () => {
      const manager = await ExerciseIndexManager.getInstance();
      const results = manager.searchExercises('Push-Up');

      expect(results.length).toBeGreaterThan(0);
      // Exact match should be first
      expect(results[0].name).toBe('Push-Up');
    });

    it('should find partial name matches', async () => {
      const manager = await ExerciseIndexManager.getInstance();
      const results = manager.searchExercises('push');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.name.includes('Push'))).toBe(true);
    });

    it('should match against search terms', async () => {
      const manager = await ExerciseIndexManager.getInstance();
      const results = manager.searchExercises('chest');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].searchTerms).toContain('chest');
    });

    it('should limit results', async () => {
      const manager = await ExerciseIndexManager.getInstance();
      const results = manager.searchExercises('push', 1);

      expect(results).toHaveLength(1);
    });

    it('should return empty array for empty query', async () => {
      const manager = await ExerciseIndexManager.getInstance();
      const results = manager.searchExercises('');

      expect(results).toHaveLength(0);
    });

    it('should rank exact matches higher than partial matches', async () => {
      const manager = await ExerciseIndexManager.getInstance();
      const results = manager.searchExercises('Push-Up');

      // Exact match should be first
      expect(results[0].name).toBe('Push-Up');
    });
  });

  describe('exercise group retrieval', () => {
    beforeEach(async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockIndex
      });
    });

    it('should retrieve exercise group by name', async () => {
      const manager = await ExerciseIndexManager.getInstance();
      const group = manager.getExerciseGroup('Push-Up');

      expect(group).toBeDefined();
      expect(group?.rootName).toBe('Push-Up');
      expect(group?.variationCount).toBe(2);
    });

    it('should return undefined for non-existent group', async () => {
      const manager = await ExerciseIndexManager.getInstance();
      const group = manager.getExerciseGroup('Non-Existent');

      expect(group).toBeUndefined();
    });
  });

  describe('exercise data loading', () => {
    beforeEach(async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockIndex
      });
    });

    it('should load exercise data from file', async () => {
      const manager = await ExerciseIndexManager.getInstance();

      // Mock exercise data fetch
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockExercise
      });

      const exercise = await manager.loadExerciseData('Push-Up');

      expect(exercise.name).toBe('Push-Up');
      expect(global.fetch).toHaveBeenCalledWith('/exercises/Push-Up/exercise.json');
    });

    it('should cache loaded exercise data', async () => {
      const manager = await ExerciseIndexManager.getInstance();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockExercise
      });

      // First load
      await manager.loadExerciseData('Push-Up');
      expect(manager.isCached('Push-Up')).toBe(true);

      // Reset mock to track calls
      (global.fetch as any).mockClear();

      // Second load should use cache
      const exercise = await manager.loadExerciseData('Push-Up');
      expect(exercise.name).toBe('Push-Up');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should validate paths to prevent directory traversal', async () => {
      const manager = await ExerciseIndexManager.getInstance();

      await expect(manager.loadExerciseData('../../../etc/passwd')).rejects.toThrow('Invalid exercise path');
      await expect(manager.loadExerciseData('/etc/passwd')).rejects.toThrow('Invalid exercise path');
    });

    it('should handle loading errors', async () => {
      const manager = await ExerciseIndexManager.getInstance();

      (global.fetch as any).mockRejectedValueOnce(new Error('404 Not Found'));

      await expect(manager.loadExerciseData('NonExistent')).rejects.toThrow();
    });
  });

  describe('cache management', () => {
    beforeEach(async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockIndex
      });
    });

    it('should clear exercise cache', async () => {
      const manager = await ExerciseIndexManager.getInstance();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockExercise
      });

      await manager.loadExerciseData('Push-Up');
      expect(manager.isCached('Push-Up')).toBe(true);

      manager.clearCache();
      expect(manager.isCached('Push-Up')).toBe(false);
    });

    it('should invalidate specific exercise', async () => {
      const manager = await ExerciseIndexManager.getInstance();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockExercise
      });

      await manager.loadExerciseData('Push-Up');
      expect(manager.isCached('Push-Up')).toBe(true);

      manager.invalidateExercise('Push-Up');
      expect(manager.isCached('Push-Up')).toBe(false);
    });

    it('should provide cache statistics', async () => {
      const manager = await ExerciseIndexManager.getInstance();

      const stats = manager.getCacheStats();
      expect(stats.indexLoaded).toBe(true);
      expect(stats.totalExercises).toBe(2);
      expect(stats.maxSize).toBe(100);
    });
  });
});
