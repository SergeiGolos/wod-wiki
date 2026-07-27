import { describe, it, expect, beforeEach } from 'bun:test';
import { InMemoryEffortRegistry } from '../InMemoryEffortRegistry';
import {
  fixtureRunning,
  fixtureRowing,
  fixtureUserCustom,
  fixtureUserOverride,
  commonFixtureSet,
} from '../fixtures';

describe('InMemoryEffortRegistry', () => {
  let registry: InMemoryEffortRegistry;

  beforeEach(() => {
    registry = new InMemoryEffortRegistry();
  });

  describe('loadBundled', () => {
    it('loads bundled efforts', async () => {
      await registry.loadBundled();
      expect(registry.resolve('rowing')).not.toBeNull();
      expect(registry.resolve('burpee')).not.toBeNull();
    });

    it('filters by source when sourceFilter is set', async () => {
      const filtered = new InMemoryEffortRegistry('bundled');
      await filtered.loadBundled();
      const all = filtered.list();
      expect(all.every((e) => e.registrySource === 'bundled')).toBe(true);
    });
  });

  describe('seed', () => {
    it('seeds arbitrary efforts', () => {
      registry.seed([fixtureRunning, fixtureRowing]);
      expect(registry.resolve('running-6-mph')).toEqual(fixtureRunning);
      expect(registry.resolve('rowing')).toEqual(fixtureRowing);
    });

    it('overrides existing efforts on duplicate slug', () => {
      registry.seed([fixtureRowing]);
      const override = { ...fixtureRowing, label: 'Overridden' };
      registry.seed([override]);
      expect(registry.resolve('rowing')!.label).toBe('Overridden');
    });
  });

  describe('resolve', () => {
    it('returns effort by slug', () => {
      registry.seed(commonFixtureSet);
      expect(registry.resolve('rowing')).toEqual(fixtureRowing);
    });

    it('returns null for unknown slug', () => {
      expect(registry.resolve('unknown')).toBeNull();
    });
  });

  describe('list', () => {
    it('returns all seeded efforts', () => {
      registry.seed(commonFixtureSet);
      expect(registry.list()).toHaveLength(commonFixtureSet.length);
    });

    it('returns empty array when empty', () => {
      expect(registry.list()).toEqual([]);
    });
  });

  describe('listByOrigin', () => {
    it('filters by bundled origin', () => {
      registry.seed(commonFixtureSet);
      const bundled = registry.listByOrigin('bundled');
      expect(bundled.length).toBe(commonFixtureSet.length);
    });

    it('filters by user origin', () => {
      registry.seed([fixtureUserCustom, fixtureRunning]);
      const user = registry.listByOrigin('user');
      expect(user).toHaveLength(1);
      expect(user[0].slug).toBe('my-custom-hiit');
    });

    it('returns empty for synthetic-unresolved', () => {
      registry.seed(commonFixtureSet);
      expect(registry.listByOrigin('synthetic-unresolved')).toEqual([]);
    });
  });

  describe('upsert', () => {
    it('inserts a new user effort', async () => {
      await registry.upsert(fixtureUserCustom);
      expect(registry.resolve('my-custom-hiit')).toEqual(fixtureUserCustom);
    });

    it('updates an existing user effort', async () => {
      await registry.upsert(fixtureUserCustom);
      const updated = { ...fixtureUserCustom, label: 'Updated' };
      await registry.upsert(updated);
      expect(registry.resolve('my-custom-hiit')!.label).toBe('Updated');
    });

    it('throws for non-user efforts', async () => {
      expect(async () => {
        await registry.upsert(fixtureRunning);
      }).toThrow(/only user efforts can be written/);
    });
  });

  describe('delete', () => {
    it('deletes a user effort', async () => {
      await registry.upsert(fixtureUserCustom);
      await registry.delete('my-custom-hiit');
      expect(registry.resolve('my-custom-hiit')).toBeNull();
    });

    it('throws when deleting bundled effort', async () => {
      registry.seed([fixtureRunning]);
      expect(async () => {
        await registry.delete('running-6-mph');
      }).toThrow(/cannot delete non-user effort/);
    });

    it('does not throw for non-existent slug', async () => {
      await registry.delete('non-existent');
      expect(registry.resolve('non-existent')).toBeNull();
    });
  });

  describe('clear', () => {
    it('removes all efforts', () => {
      registry.seed(commonFixtureSet);
      registry.clear();
      expect(registry.list()).toEqual([]);
    });
  });
});
