import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ExerciseIndexManager } from './ExerciseIndexManager';
import type { Exercise } from '../exercise';
import type { ExerciseDataProvider, ExercisePathIndex } from '../types/providers';

// Mock data
const mockIndex: ExercisePathIndex = {
  groups: [
    {
      rootName: 'Push-Up',
      entries: [
        { name: 'Push-Up', path: 'Push-Up', searchTerms: ['push', 'up', 'chest', 'bodyweight'] },
        { name: 'Diamond Push-Up', path: 'Diamond_Push-Up', searchTerms: ['diamond', 'push', 'up', 'triceps'] }
      ]
    }
  ],
  groupsByName: {
    'Push-Up': {
      rootName: 'Push-Up',
      entries: [
        { name: 'Push-Up', path: 'Push-Up', searchTerms: ['push', 'up', 'chest', 'bodyweight'] },
        { name: 'Diamond Push-Up', path: 'Diamond_Push-Up', searchTerms: ['diamond', 'push', 'up', 'triceps'] }
      ]
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

// Mock provider
class MockExerciseProvider implements ExerciseDataProvider {
  private shouldFail = false;
  private failWith404 = false;
  public loadIndexSpy = vi.fn();
  public loadExerciseSpy = vi.fn();
  
  setFailure(fail: boolean, with404: boolean = false) {
    this.shouldFail = fail;
    this.failWith404 = with404;
  }
  
  async loadIndex(): Promise<ExercisePathIndex> {
    this.loadIndexSpy();
    if (this.shouldFail) {
      throw new Error('Network error');
    }
    return mockIndex;
  }
  
  async loadExercise(path: string): Promise<Exercise> {
    this.loadExerciseSpy(path);
    if (this.shouldFail) {
      if (this.failWith404) {
        const error: any = new Error('Exercise not found: 404 Not Found');
        error.permanent = true;
        throw error;
      }
      throw new Error('Persistent network error');
    }
    if (path === 'NonExistent') {
        const error: any = new Error('Exercise not found: 404 Not Found');
        error.permanent = true;
        throw error;
    }
    return { ...mockExercise, name: path };
  }
  
  async searchExercises(query: string, limit?: number): Promise<any[]> {
    const results = mockIndex.allEntries.filter(e => 
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.searchTerms.some(term => term.toLowerCase().includes(query.toLowerCase()))
    );
    return results.slice(0, limit || 50);
  }
}

describe('ExerciseIndexManager', () => {
  let originalLocalStorage: Storage;
  let mockProvider: MockExerciseProvider;

  beforeEach(() => {
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

    // Create mock provider
    mockProvider = new MockExerciseProvider();

    // Clear singleton instance for testing
    (ExerciseIndexManager as any).instance = null;
    (ExerciseIndexManager as any).initPromise = null;

    // Initialize manager and set provider
    const manager = ExerciseIndexManager.getInstance();
    manager.setProvider(mockProvider);
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
  });

  describe('singleton pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = ExerciseIndexManager.getInstance();
      const instance2 = ExerciseIndexManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('index loading', () => {
    it('should load index from provider on first search', async () => {
      const manager = ExerciseIndexManager.getInstance();
      
      // Trigger load via search
      await manager.searchExercises('');

      expect(manager.isIndexLoaded()).toBe(true);
      expect(manager.getAllEntries()).toHaveLength(2);
      expect(mockProvider.loadIndexSpy).toHaveBeenCalled();
    });

    it('should save loaded index to localStorage', async () => {
      const manager = ExerciseIndexManager.getInstance();
      await manager.searchExercises('');

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'wod-wiki-exercise-index',
        expect.any(String)
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'wod-wiki-exercise-index-version',
        '3.0.0'
      );
    });

    it('should handle network errors gracefully', async () => {
      mockProvider.setFailure(true);
      const manager = ExerciseIndexManager.getInstance();

      await manager.searchExercises('');

      expect(manager.isIndexLoaded()).toBe(true); // Fallback empty index
      expect(manager.getAllEntries()).toHaveLength(0);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      const manager = ExerciseIndexManager.getInstance();
      await manager.searchExercises(''); // Ensure loaded
    });

    it('should find exact name matches', async () => {
      const manager = ExerciseIndexManager.getInstance();
      const results = await manager.searchExercises('Push-Up');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('Push-Up');
    });

    it('should find partial name matches', async () => {
      const manager = ExerciseIndexManager.getInstance();
      const results = await manager.searchExercises('push');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.name.includes('Push'))).toBe(true);
    });

    it('should match against search terms', async () => {
      const manager = ExerciseIndexManager.getInstance();
      const results = await manager.searchExercises('chest');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].searchTerms).toContain('chest');
    });

    it('should limit results', async () => {
      const manager = ExerciseIndexManager.getInstance();
      const results = await manager.searchExercises('push', 1);

      expect(results).toHaveLength(1);
    });

    it('should return empty array for empty query', async () => {
      const manager = ExerciseIndexManager.getInstance();
      const results = await manager.searchExercises('');

      expect(results).toHaveLength(0);
    });
  });

  describe('exercise group retrieval', () => {
    beforeEach(async () => {
      const manager = ExerciseIndexManager.getInstance();
      await manager.searchExercises(''); // Ensure loaded
    });

    it('should retrieve exercise group by name', () => {
      const manager = ExerciseIndexManager.getInstance();
      const group = manager.getExerciseGroup('Push-Up') as any;

      expect(group).toBeDefined();
      expect(group?.rootName).toBe('Push-Up');
      expect(group?.entries).toHaveLength(2);
    });

    it('should return undefined for non-existent group', () => {
      const manager = ExerciseIndexManager.getInstance();
      const group = manager.getExerciseGroup('Non-Existent');

      expect(group).toBeUndefined();
    });
  });

  describe('exercise data loading', () => {
    beforeEach(async () => {
      const manager = ExerciseIndexManager.getInstance();
      await manager.searchExercises(''); // Ensure loaded
    });

    it('should load exercise data from provider', async () => {
      const manager = ExerciseIndexManager.getInstance();
      const exercise = await manager.loadExerciseData('Push-Up');

      expect(exercise.name).toBe('Push-Up');
      expect(mockProvider.loadExerciseSpy).toHaveBeenCalledWith('Push-Up');
    });

    it('should cache loaded exercise data', async () => {
      const manager = ExerciseIndexManager.getInstance();

      // First load
      await manager.loadExerciseData('Push-Up');
      expect(manager.isCached('Push-Up')).toBe(true);

      // Reset spy
      mockProvider.loadExerciseSpy.mockClear();

      // Second load should use cache
      const exercise = await manager.loadExerciseData('Push-Up');
      expect(exercise.name).toBe('Push-Up');
      expect(mockProvider.loadExerciseSpy).not.toHaveBeenCalled();
    });

    it('should validate paths to prevent directory traversal', async () => {
      const manager = ExerciseIndexManager.getInstance();

      await expect(manager.loadExerciseData('../../../etc/passwd')).rejects.toThrow('Invalid exercise path');
      await expect(manager.loadExerciseData('/etc/passwd')).rejects.toThrow('Invalid exercise path');
    });

    it('should handle loading errors', async () => {
      const manager = ExerciseIndexManager.getInstance();
      
      // NonExistent triggers 404 in mock
      await expect(manager.loadExerciseData('NonExistent')).rejects.toThrow('404 Not Found');
    });
  });

  describe('cache management', () => {
    beforeEach(async () => {
      const manager = ExerciseIndexManager.getInstance();
      await manager.searchExercises(''); // Ensure loaded
    });

    it('should clear exercise cache', async () => {
      const manager = ExerciseIndexManager.getInstance();

      await manager.loadExerciseData('Push-Up');
      expect(manager.isCached('Push-Up')).toBe(true);

      manager.clearCache();
      expect(manager.isCached('Push-Up')).toBe(false);
    });

    it('should invalidate specific exercise', async () => {
      const manager = ExerciseIndexManager.getInstance();

      await manager.loadExerciseData('Push-Up');
      expect(manager.isCached('Push-Up')).toBe(true);

      manager.invalidateExercise('Push-Up');
      expect(manager.isCached('Push-Up')).toBe(false);
    });

    it('should provide cache statistics', async () => {
      const manager = ExerciseIndexManager.getInstance();

      const stats = manager.getCacheStats();
      expect(stats.indexLoaded).toBe(true);
      expect(stats.totalExercises).toBe(2);
      expect(stats.maxSize).toBe(100);
    });
  });

  describe('batch loading', () => {
    beforeEach(async () => {
      const manager = ExerciseIndexManager.getInstance();
      await manager.searchExercises(''); // Ensure loaded
    });

    it('should load multiple exercises concurrently', async () => {
      const manager = ExerciseIndexManager.getInstance();
      const exercises = await manager.loadExercises(['Push-Up', 'Diamond_Push-Up']);

      expect(exercises).toHaveLength(2);
      expect(exercises[0].name).toBe('Push-Up');
      expect(exercises[1].name).toBe('Diamond_Push-Up');
    });
  });

  describe('retry and timeout', () => {
    beforeEach(async () => {
      const manager = ExerciseIndexManager.getInstance();
      await manager.searchExercises(''); // Ensure loaded
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should retry transient errors with exponential backoff', async () => {
      const manager = ExerciseIndexManager.getInstance();

      let attemptCount = 0;
      // Override mock implementation for this test
      mockProvider.loadExercise = vi.fn().mockImplementation(async (path) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Network error');
        }
        return { ...mockExercise, name: path };
      });

      const loadPromise = manager.loadExerciseData('Push-Up');

      // Fast-forward through retry delays
      await vi.advanceTimersByTimeAsync(1000); // First retry after 1s
      await vi.advanceTimersByTimeAsync(2000); // Second retry after 2s

      const exercise = await loadPromise;
      expect(exercise.name).toBe('Push-Up');
      expect(attemptCount).toBe(3);
    });

    it('should not retry 404 errors', async () => {
      const manager = ExerciseIndexManager.getInstance();
      
      // NonExistent triggers 404 in mock
      await expect(manager.loadExerciseData('NonExistent')).rejects.toThrow('404 Not Found');
      
      // Only one fetch attempt, no retries
      expect(mockProvider.loadExerciseSpy).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      const manager = ExerciseIndexManager.getInstance();

      mockProvider.setFailure(true); // Persistent error

      // Create promise and attach error handler immediately to prevent unhandled rejection
      const loadPromise = manager.loadExerciseData('Push-Up').catch(err => err);

      // Fast-forward through all retry attempts
      await vi.advanceTimersByTimeAsync(1000); // Attempt 1
      await vi.advanceTimersByTimeAsync(2000); // Attempt 2
      await vi.advanceTimersByTimeAsync(4000); // Attempt 3

      const result = await loadPromise;
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Persistent network error');
    });
  });
});