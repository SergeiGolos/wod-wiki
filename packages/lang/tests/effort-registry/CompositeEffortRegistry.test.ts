import { describe, it, expect, beforeEach } from 'vitest';
import { CompositeEffortRegistry } from '../../src/effort-registry/CompositeEffortRegistry';
import type { EffortStorageAdapter, IEffort } from '../../src/effort-registry/types';
import { fixtureRowing, fixtureUserCustom, fixtureUserOverride } from '../../src/effort-registry/fixtures';

interface MockStorage extends EffortStorageAdapter {
  store: Map<string, IEffort>;
}

function createMockStorage(): MockStorage {
  const store = new Map<string, IEffort>();
  return {
    store,
    load: async () => Array.from(store.values()),
    save: async (effort: IEffort) => {
      store.set(effort.slug, effort);
    },
    delete: async (slug: string) => {
      store.delete(slug);
    },
  };
}

describe('CompositeEffortRegistry', () => {
  let mockStorage: MockStorage;
  let registry: CompositeEffortRegistry;

  beforeEach(() => {
    mockStorage = createMockStorage();
    registry = new CompositeEffortRegistry({ storage: mockStorage });
  });

  describe('loadBundled', () => {
    it('loads bundled efforts into memory', async () => {
      await registry.loadBundled();
      expect(registry.resolve('rowing')).not.toBeNull();
      expect(registry.resolve('rowing')!.registrySource).toBe('bundled');
    });

    it('loads user efforts from storage adapter', async () => {
      await mockStorage.save(fixtureUserCustom);
      await registry.loadBundled();
      expect(registry.resolve('my-custom-hiit')).toEqual(fixtureUserCustom);
    });

    it('supports custom bundled seed in options', async () => {
      const customBundledRegistry = new CompositeEffortRegistry({
        bundled: [{ ...fixtureRowing, slug: 'custom-row', label: 'Custom Row' }],
      });
      await customBundledRegistry.loadBundled();
      expect(customBundledRegistry.resolve('custom-row')).not.toBeNull();
      expect(customBundledRegistry.resolve('rowing')).toBeNull();
    });

    it('continues with bundled-only when storage adapter fails', async () => {
      const failingStorage: EffortStorageAdapter = {
        load: async () => {
          throw new Error('Storage unavailable');
        },
        save: async () => {},
        delete: async () => {},
      };
      const failingRegistry = new CompositeEffortRegistry({ storage: failingStorage });
      await failingRegistry.loadBundled();
      expect(failingRegistry.resolve('rowing')).not.toBeNull();
      expect(failingRegistry.isInitialized()).toBe(true);
    });
  });

  describe('lookup precedence: user wins over bundled', () => {
    beforeEach(async () => {
      await mockStorage.save(fixtureUserOverride);
      await registry.loadBundled();
    });

    it('user effort shadows bundled effort with same slug', () => {
      const resolved = registry.resolve('rowing');
      expect(resolved).not.toBeNull();
      expect(resolved!.label).toBe(fixtureUserOverride.label);
      expect(resolved!.registrySource).toBe('user');
    });

    it('returns bundled effort when no user override exists', () => {
      const resolved = registry.resolve('running-6-mph');
      expect(resolved).not.toBeNull();
      expect(resolved!.registrySource).toBe('bundled');
    });

    it('returns null for unknown slug', () => {
      expect(registry.resolve('non-existent-effort-xyz')).toBeNull();
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await mockStorage.save(fixtureUserCustom);
      await mockStorage.save(fixtureUserOverride);
      await registry.loadBundled();
    });

    it('includes user efforts and unshadowed bundled efforts', () => {
      const all = registry.list();
      const rowing = all.find((e) => e.slug === 'rowing');
      expect(rowing).toBeDefined();
      expect(rowing!.label).toBe(fixtureUserOverride.label);

      const custom = all.find((e) => e.slug === 'my-custom-hiit');
      expect(custom).toBeDefined();

      const running = all.find((e) => e.slug === 'running-6-mph');
      expect(running).toBeDefined();
    });

    it('does not duplicate slugs when user shadows bundled', () => {
      const all = registry.list();
      const rowingEntries = all.filter((e) => e.slug === 'rowing');
      expect(rowingEntries.length).toBe(1);
    });
  });

  describe('listByOrigin', () => {
    beforeEach(async () => {
      await mockStorage.save(fixtureUserCustom);
      await registry.loadBundled();
    });

    it('filters by user origin', () => {
      const userEfforts = registry.listByOrigin('user');
      expect(userEfforts.length).toBe(1);
      expect(userEfforts[0]!.slug).toBe('my-custom-hiit');
    });

    it('filters by bundled origin', () => {
      const bundled = registry.listByOrigin('bundled');
      expect(bundled.every((e) => e.registrySource === 'bundled')).toBe(true);
      expect(bundled.some((e) => e.slug === 'rowing')).toBe(true);
    });
  });

  describe('upsert', () => {
    beforeEach(async () => {
      await registry.loadBundled();
    });

    it('updates memory immediately and persists via storage', async () => {
      await registry.upsert(fixtureUserCustom);
      expect(registry.resolve('my-custom-hiit')).toEqual(fixtureUserCustom);
      expect(mockStorage.store.get('my-custom-hiit')).toEqual(fixtureUserCustom);
    });

    it('rejects non-user effort with an error', async () => {
      const bundledEffort: IEffort = {
        ...fixtureUserCustom,
        registrySource: 'bundled',
      };
      await expect(registry.upsert(bundledEffort)).rejects.toThrow(
        'only user efforts can be written'
      );
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await mockStorage.save(fixtureUserCustom);
      await registry.loadBundled();
    });

    it('removes user effort from memory and storage', async () => {
      expect(registry.resolve('my-custom-hiit')).not.toBeNull();
      await registry.delete('my-custom-hiit');
      expect(registry.resolve('my-custom-hiit')).toBeNull();
      expect(mockStorage.store.has('my-custom-hiit')).toBe(false);
    });

    it('rejects attempt to delete bundled effort', async () => {
      await expect(registry.delete('rowing')).rejects.toThrow(
        'cannot delete non-user effort'
      );
    });

    it('handles delete of non-existent effort gracefully', async () => {
      await expect(registry.delete('does-not-exist')).resolves.toBeUndefined();
    });
  });
});
