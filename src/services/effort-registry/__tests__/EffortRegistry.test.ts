import { describe, expect, it } from 'bun:test';

import { EffortRegistry } from '../EffortRegistry';
import { InMemoryEffortStore } from '../InMemoryEffortStore';
import type { EffortRecord } from '../types';

const timestamp = '2026-05-20T00:00:00.000Z';

function effort(overrides: Partial<EffortRecord> & Pick<EffortRecord, 'slug' | 'label'>): EffortRecord {
  return {
    id: `effort-${overrides.slug}`,
    slug: overrides.slug,
    label: overrides.label,
    aliases: overrides.aliases ?? [overrides.label],
    discipline: overrides.discipline ?? 'conditioning',
    modality: overrides.modality ?? 'cardio',
    baseAttributes: overrides.baseAttributes ?? { met: 7 },
    visibility: overrides.visibility ?? 'bundled',
    registrySource: overrides.registrySource ?? 'bundled',
    createdAt: overrides.createdAt ?? timestamp,
    updatedAt: overrides.updatedAt ?? timestamp,
    description: overrides.description,
    intensityTier: overrides.intensityTier,
    derivation: overrides.derivation,
  };
}

describe('EffortRegistry', () => {
  it('gives user efforts precedence over bundled efforts with the same slug', async () => {
    const registry = new EffortRegistry(new InMemoryEffortStore({
      bundled: [effort({ slug: 'rowing', label: 'Rowing', aliases: ['row'], baseAttributes: { met: 7 } })],
      user: [effort({ slug: 'rowing', label: 'My Rowing', aliases: ['custom row'], baseAttributes: { met: 8.2 }, registrySource: 'user', visibility: 'private' })],
    }));

    await registry.load();

    const resolved = registry.resolveBySlug('rowing');
    expect(resolved?.label).toBe('My Rowing');
    expect(resolved?.baseAttributes.met).toBe(8.2);
    expect(registry.list()).toHaveLength(1);
  });

  it('resolves exact aliases and normalized aliases', async () => {
    const registry = new EffortRegistry(new InMemoryEffortStore({
      bundled: [effort({ slug: 'assault-bike', label: 'Assault Bike', aliases: ['Echo Bike', 'air-bike'] })],
    }));

    await registry.load();

    expect(registry.resolveByAlias('Echo Bike')?.slug).toBe('assault-bike');
    expect(registry.resolveLabel('air bike')?.trace.matchType).toBe('normalized-alias');
  });

  it('resolves fuzzy aliases within the default threshold and records trace metadata', async () => {
    const registry = new EffortRegistry(new InMemoryEffortStore({
      bundled: [effort({ slug: 'rowing', label: 'Rowing', aliases: ['rowing'] })],
    }));

    await registry.load();

    const resolved = registry.resolveLabel('rowimg');

    expect(resolved?.effort.slug).toBe('rowing');
    expect(resolved?.trace.matchType).toBe('fuzzy');
    expect(resolved?.trace.distance).toBe(1);
    expect(resolved?.trace.threshold).toBe(2);
  });

  it('creates synthetic unresolved efforts when nothing matches', async () => {
    const registry = new EffortRegistry(new InMemoryEffortStore({
      bundled: [effort({ slug: 'rowing', label: 'Rowing', aliases: ['row'] })],
    }));

    await registry.load();

    const resolved = registry.resolveLabel('totally unknown movement');

    expect(resolved?.trace.matchType).toBe('fallback');
    expect(resolved?.effort.registrySource).toBe('synthetic-unresolved');
    expect(resolved?.effort.baseAttributes.met).toBe(5);
    expect(resolved?.effort.slug).toBe('unresolved-totally-unknown-movement');
  });

  it('upserts and removes user efforts after load', async () => {
    const registry = new EffortRegistry(new InMemoryEffortStore());
    await registry.load();

    await registry.upsert(effort({
      slug: 'tempo-run',
      label: 'Tempo Run',
      aliases: ['tempo running'],
      registrySource: 'user',
      visibility: 'private',
      baseAttributes: { met: 10.5 },
    }));

    expect(registry.resolveBySlug('tempo-run')?.label).toBe('Tempo Run');

    await registry.remove('tempo-run');

    expect(registry.resolveBySlug('tempo-run')).toBeNull();
  });

  it('rejects duplicate normalized aliases across different effective slugs', async () => {
    const registry = new EffortRegistry(new InMemoryEffortStore({
      bundled: [
        effort({ slug: 'air-bike', label: 'Air Bike', aliases: ['bike erg'] }),
        effort({ slug: 'echo-bike', label: 'Echo Bike', aliases: ['bike-erg'] }),
      ],
    }));

    await expect(registry.load()).rejects.toThrow("Duplicate normalized alias 'bike erg'");
  });
});
