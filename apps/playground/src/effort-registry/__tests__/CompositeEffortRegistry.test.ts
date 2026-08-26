import { describe, it, expect, mock, beforeEach, vi } from 'bun:test';

// Mock IndexedDBService before importing CompositeEffortRegistry
// to avoid triggering real IndexedDB instantiation at module load time.
const mockIndexedDBService = {
  getDB: async () => {
    throw new Error('Mock not configured');
  },
};

mock.module('@/services/db/IndexedDBService', () => ({
  indexedDBService: mockIndexedDBService,
}));

import { fixtureRunning, fixtureRowing, fixtureUserCustom, fixtureUserOverride } from '../fixtures';

// Minimal mock DB shape matching what CompositeEffortRegistry needs.
// CompositeEffortRegistry calls this.db.getDB() which returns an object
// with get/getAll/put/delete methods.
function createMockDB() {
  const store = new Map<string, unknown>();
  const db = {
    get: async (_store: string, slug: string) => store.get(slug),
    getAll: async (_store: string) => Array.from(store.values()),
    put: async (_store: string, value: { slug: string }) => {
      store.set(value.slug, value);
    },
    delete: async (_store: string, slug: string) => {
      store.delete(slug);
    },
  };
  return {
    ...db,
    getDB: async () => db,
  };
}

describe('CompositeEffortRegistry', () => {
  let mockDB: ReturnType<typeof createMockDB>;
  let registry: import('../CompositeEffortRegistry').CompositeEffortRegistry;
  let CompositeEffortRegistry: typeof import('../CompositeEffortRegistry').CompositeEffortRegistry;

  beforeEach(async () => {
    const mod = await import('../CompositeEffortRegistry');
    CompositeEffortRegistry = mod.CompositeEffortRegistry;
    mockDB = createMockDB();
    registry = new CompositeEffortRegistry(mockDB as unknown as typeof mockIndexedDBService);
  });

  describe('loadBundled', () => {
    it('loads bundled efforts into memory', async () => {
      await registry.loadBundled();
      expect(registry.resolve('rowing')).not.toBeNull();
      expect(registry.resolve('rowing')!.registrySource).toBe('bundled');
    });

    it('loads user efforts from IndexedDB', async () => {
      await mockDB.put('efforts', fixtureUserCustom);
      await registry.loadBundled();
      expect(registry.resolve('my-custom-hiit')).toEqual(fixtureUserCustom);
    });

    it('continues with bundled-only when IndexedDB fails', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const failingDB = {
          getDB: async () => {
            throw new Error('quota exceeded');
          },
        };
        const failingRegistry = new CompositeEffortRegistry(failingDB as unknown as typeof mockIndexedDBService);
        await failingRegistry.loadBundled();
        expect(failingRegistry.resolve('rowing')).not.toBeNull();
        expect(failingRegistry.isInitialized()).toBe(true);
        expect(consoleWarn).toHaveBeenCalledTimes(1);
        expect(String(consoleWarn.mock.calls[0]?.[0])).toBe('[CompositeEffortRegistry] Failed to load user efforts from IndexedDB:');
      } finally {
        consoleWarn.mockRestore();
      }
    });

    it('marks initialized after load', async () => {
      expect(registry.isInitialized()).toBe(false);
      await registry.loadBundled();
      expect(registry.isInitialized()).toBe(true);
    });
  });

  describe('resolve', () => {
    it('user effort wins over bundled', async () => {
      await mockDB.put('efforts', fixtureUserOverride);
      await registry.loadBundled();
      const resolved = registry.resolve('rowing');
      expect(resolved!.registrySource).toBe('user');
      expect(resolved!.label).toBe('Rowing (Calibrated)');
    });

    it('falls back to bundled when no user override', async () => {
      await registry.loadBundled();
      expect(registry.resolve('rowing')!.registrySource).toBe('bundled');
    });

    it('returns null for unknown slug', async () => {
      await registry.loadBundled();
      expect(registry.resolve('unknown')).toBeNull();
    });
  });

  describe('list', () => {
    it('merges bundled and user efforts', async () => {
      await mockDB.put('efforts', fixtureUserCustom);
      await registry.loadBundled();
      const all = registry.list();
      const slugs = all.map((e) => e.slug);
      expect(slugs).toContain('rowing');
      expect(slugs).toContain('my-custom-hiit');
    });

    it('user override replaces bundled in merged list', async () => {
      await mockDB.put('efforts', fixtureUserOverride);
      await registry.loadBundled();
      const all = registry.list();
      const rowing = all.find((e) => e.slug === 'rowing');
      expect(rowing!.registrySource).toBe('user');
    });
  });

  describe('listByOrigin', () => {
    it('returns only bundled efforts', async () => {
      await mockDB.put('efforts', fixtureUserCustom);
      await registry.loadBundled();
      const bundled = registry.listByOrigin('bundled');
      expect(bundled.some((e) => e.slug === 'rowing')).toBe(true);
      expect(bundled.some((e) => e.slug === 'my-custom-hiit')).toBe(false);
    });

    it('returns only user efforts', async () => {
      await mockDB.put('efforts', fixtureUserCustom);
      await registry.loadBundled();
      const user = registry.listByOrigin('user');
      expect(user).toHaveLength(1);
      expect(user[0].slug).toBe('my-custom-hiit');
    });
  });

  describe('upsert', () => {
    it('inserts user effort into memory and IndexedDB', async () => {
      await registry.loadBundled();
      await registry.upsert(fixtureUserCustom);
      expect(registry.resolve('my-custom-hiit')).toEqual(fixtureUserCustom);
      const persisted = await mockDB.get('efforts', 'my-custom-hiit');
      expect(persisted).toEqual(fixtureUserCustom);
    });

    it('updates existing user effort', async () => {
      await registry.loadBundled();
      await registry.upsert(fixtureUserCustom);
      const updated = { ...fixtureUserCustom, label: 'Updated' };
      await registry.upsert(updated);
      expect(registry.resolve('my-custom-hiit')!.label).toBe('Updated');
    });

    it('throws for non-user efforts', async () => {
      await registry.loadBundled();
      expect(async () => {
        await registry.upsert(fixtureRunning);
      }).toThrow(/only user efforts can be written/);
    });

    it('continues in memory when IndexedDB persist fails', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const failingDB = {
          getDB: async () => ({
            get: async () => undefined,
            getAll: async () => [],
            put: async () => { throw new Error('quota exceeded'); },
            delete: async () => {},
          }),
        };
        const failingRegistry = new CompositeEffortRegistry(failingDB as unknown as typeof mockIndexedDBService);
        await failingRegistry.loadBundled();
        await failingRegistry.upsert(fixtureUserCustom);
        expect(failingRegistry.resolve('my-custom-hiit')).toEqual(fixtureUserCustom);
        expect(consoleWarn).toHaveBeenCalledTimes(1);
        expect(String(consoleWarn.mock.calls[0]?.[0])).toBe('[CompositeEffortRegistry] Failed to persist effort to IndexedDB:');
      } finally {
        consoleWarn.mockRestore();
      }
    });
  });

  describe('delete', () => {
    it('deletes user effort from memory and IndexedDB', async () => {
      await registry.loadBundled();
      await registry.upsert(fixtureUserCustom);
      await registry.delete('my-custom-hiit');
      expect(registry.resolve('my-custom-hiit')).toBeNull();
      const persisted = await mockDB.get('efforts', 'my-custom-hiit');
      expect(persisted).toBeUndefined();
    });

    it('throws when deleting bundled effort', async () => {
      await registry.loadBundled();
      expect(async () => {
        await registry.delete('rowing');
      }).toThrow(/cannot delete non-user effort/);
    });

    it('continues in memory when IndexedDB delete fails', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const failingDB = {
          getDB: async () => ({
            get: async () => undefined,
            getAll: async () => [],
            put: async () => {},
            delete: async () => { throw new Error('quota exceeded'); },
          }),
        };
        const failingRegistry = new CompositeEffortRegistry(failingDB as unknown as typeof mockIndexedDBService);
        await failingRegistry.loadBundled();
        await failingRegistry.upsert(fixtureUserCustom);
        await failingRegistry.delete('my-custom-hiit');
        expect(failingRegistry.resolve('my-custom-hiit')).toBeNull();
        expect(consoleWarn).toHaveBeenCalledTimes(1);
        expect(String(consoleWarn.mock.calls[0]?.[0])).toBe('[CompositeEffortRegistry] Failed to delete effort from IndexedDB:');
      } finally {
        consoleWarn.mockRestore();
      }
    });
  });
});
