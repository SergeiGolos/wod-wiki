import { describe, it, expect } from 'vitest';
import { InMemoryEffortRegistry } from '../../src/effort-registry/InMemoryEffortRegistry';
import { CompositeEffortRegistry } from '../../src/effort-registry/CompositeEffortRegistry';
import { addAliasToEffort } from '../../src/effort-registry/aliasManagement';
import { commonFixtureSet, fixtureRowing, fixtureRunning } from '../../src/effort-registry/fixtures';
import type { IEffort, EffortStorageAdapter } from '../../src/effort-registry/types';

describe('aliasManagement & resolveByAlias', () => {
  describe('resolveByAlias on InMemoryEffortRegistry', () => {
    it('finds effort by primary label or configured alias', () => {
      const registry = new InMemoryEffortRegistry();
      registry.seed(commonFixtureSet);

      const byLabel = registry.resolveByAlias('Rowing');
      expect(byLabel).not.toBeNull();
      expect(byLabel?.slug).toBe('rowing');

      const byAlias = registry.resolveByAlias('rower');
      expect(byAlias).not.toBeNull();
      expect(byAlias?.slug).toBe('rowing');

      const notFound = registry.resolveByAlias('nonexistent-movement-xyz');
      expect(notFound).toBeNull();
    });
  });

  describe('resolveByAlias on CompositeEffortRegistry', () => {
    it('finds bundled and user efforts by alias', async () => {
      const registry = new CompositeEffortRegistry({
        bundled: [fixtureRunning, fixtureRowing],
      });
      await registry.loadBundled();

      const resolved = registry.resolveByAlias('erg');
      expect(resolved).not.toBeNull();
      expect(resolved?.slug).toBe('rowing');
    });

    it('prefers user effort alias over shadowed bundled effort', async () => {
      const userOverride: IEffort = {
        ...fixtureRowing,
        registrySource: 'user',
        aliases: ['rower', 'custom-row-alias'],
      };
      const registry = new CompositeEffortRegistry({
        bundled: [fixtureRowing],
      });
      await registry.loadBundled();
      await registry.upsert(userOverride);

      const resolved = registry.resolveByAlias('custom-row-alias');
      expect(resolved).not.toBeNull();
      expect(resolved?.registrySource).toBe('user');
    });
  });

  describe('addAliasToEffort', () => {
    it('adds an alias to an existing user effort', async () => {
      const registry = new InMemoryEffortRegistry();
      const userEffort: IEffort = {
        ...fixtureRowing,
        registrySource: 'user',
        aliases: ['rower'],
      };
      registry.seed([userEffort]);

      const updated = await addAliasToEffort(registry, 'rowing', 'concept2-row');
      expect(updated.aliases).toContain('concept2-row');
      expect(registry.resolve('rowing')?.aliases).toContain('concept2-row');
    });

    it('adds an alias to a bundled effort by creating a user override', async () => {
      const stored = new Map<string, IEffort>();
      const mockStorage: EffortStorageAdapter = {
        load: async () => Array.from(stored.values()),
        save: async (effort) => { stored.set(effort.slug, effort); },
        delete: async (slug) => { stored.delete(slug); },
      };

      const registry = new CompositeEffortRegistry({
        bundled: [fixtureRowing],
        storage: mockStorage,
      });
      await registry.loadBundled();

      expect(registry.resolve('rowing')?.registrySource).toBe('bundled');

      const updated = await addAliasToEffort(registry, 'rowing', 'erg-machine');
      expect(updated.registrySource).toBe('user');
      expect(updated.aliases).toContain('erg-machine');

      const resolved = registry.resolve('rowing');
      expect(resolved?.registrySource).toBe('user');
      expect(resolved?.aliases).toContain('erg-machine');
      expect(stored.has('rowing')).toBe(true);
    });

    it('is idempotent when adding an existing alias', async () => {
      const registry = new InMemoryEffortRegistry();
      const userEffort: IEffort = {
        ...fixtureRowing,
        registrySource: 'user',
        aliases: ['rower'],
      };
      registry.seed([userEffort]);

      const initialCount = userEffort.aliases.length;
      const updated = await addAliasToEffort(registry, 'rowing', 'rower');
      expect(updated.aliases.length).toBe(initialCount);
    });

    it('throws when target slug does not exist', async () => {
      const registry = new InMemoryEffortRegistry();
      await expect(
        addAliasToEffort(registry, 'nonexistent', 'some-alias')
      ).rejects.toThrow('Effort "nonexistent" not found');
    });
  });
});
