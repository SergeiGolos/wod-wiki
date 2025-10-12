import { describe, it, expect, beforeEach } from 'vitest';
import { LRUCache } from './LRUCache';

describe('LRUCache', () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    cache = new LRUCache<string, number>(3); // Small cache for testing
  });

  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      
      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBe(2);
    });

    it('should return undefined for missing keys', () => {
      expect(cache.get('missing')).toBeUndefined();
    });

    it('should check if key exists', () => {
      cache.set('a', 1);
      
      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
    });

    it('should report correct size', () => {
      expect(cache.size).toBe(0);
      
      cache.set('a', 1);
      expect(cache.size).toBe(1);
      
      cache.set('b', 2);
      expect(cache.size).toBe(2);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used when at capacity', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      
      expect(cache.size).toBe(3);
      
      // Adding 'd' should evict 'a' (least recently used)
      cache.set('d', 4);
      
      expect(cache.size).toBe(3);
      expect(cache.has('a')).toBe(false);
      expect(cache.has('d')).toBe(true);
    });

    it('should update LRU order on get', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      
      // Access 'a', making it most recently used
      cache.get('a');
      
      // Adding 'd' should evict 'b' (now least recently used)
      cache.set('d', 4);
      
      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });

    it('should update LRU order on set of existing key', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      
      // Update 'a', making it most recently used
      cache.set('a', 10);
      
      // Adding 'd' should evict 'b' (now least recently used)
      cache.set('d', 4);
      
      expect(cache.get('a')).toBe(10);
      expect(cache.has('b')).toBe(false);
    });
  });

  describe('deletion and clearing', () => {
    it('should delete specific entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      
      expect(cache.delete('a')).toBe(true);
      expect(cache.has('a')).toBe(false);
      expect(cache.size).toBe(1);
    });

    it('should return false when deleting non-existent key', () => {
      expect(cache.delete('missing')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      
      cache.clear();
      
      expect(cache.size).toBe(0);
      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(false);
      expect(cache.has('c')).toBe(false);
    });
  });

  describe('keys and stats', () => {
    it('should return all keys', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      
      const keys = cache.keys();
      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys).toContain('c');
      expect(keys.length).toBe(3);
    });

    it('should provide cache statistics', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      
      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
      expect(stats.utilization).toBeCloseTo(2 / 3);
    });
  });

  describe('edge cases', () => {
    it('should handle cache of size 1', () => {
      const smallCache = new LRUCache<string, number>(1);
      
      smallCache.set('a', 1);
      expect(smallCache.get('a')).toBe(1);
      
      smallCache.set('b', 2);
      expect(smallCache.has('a')).toBe(false);
      expect(smallCache.get('b')).toBe(2);
    });

    it('should handle many operations', () => {
      const largeCache = new LRUCache<number, string>(5);
      
      for (let i = 0; i < 100; i++) {
        largeCache.set(i, `value-${i}`);
      }
      
      // Should only have last 5 entries
      expect(largeCache.size).toBe(5);
      expect(largeCache.has(99)).toBe(true);
      expect(largeCache.has(98)).toBe(true);
      expect(largeCache.has(94)).toBe(false);
    });
  });
});
