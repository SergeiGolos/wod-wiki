import type { IEffort, IEffortRegistry } from './types';
import { normalizeForFuzzy } from './fuzzyMatch';

/**
 * Add an alias to an existing effort.
 *
 * If the effort is bundled, clones it into a user-tier override record with
 * the same slug and derivation from the bundled parent, then adds the alias.
 * If the effort is already a user record, appends the alias and updates it.
 *
 * Idempotent: if the alias is already present (by normalized comparison),
 * returns the existing record without mutation.
 */
export async function addAliasToEffort(
  registry: IEffortRegistry,
  targetSlug: string,
  newAlias: string
): Promise<IEffort> {
  const trimmed = newAlias.trim();
  if (!trimmed) {
    throw new Error('Alias cannot be empty');
  }

  const existing = registry.resolve(targetSlug);
  if (!existing) {
    throw new Error(`Effort "${targetSlug}" not found in registry`);
  }

  const normalizedNew = normalizeForFuzzy(trimmed);
  const alreadyHas =
    normalizeForFuzzy(existing.label) === normalizedNew ||
    existing.aliases.some((a) => normalizeForFuzzy(a) === normalizedNew);

  if (alreadyHas) {
    return existing;
  }

  const updatedAliases = [...existing.aliases, trimmed];
  const now = new Date().toISOString();

  if (existing.registrySource === 'bundled') {
    const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `effort-user-${crypto.randomUUID()}`
      : `effort-user-${Date.now()}`;
    const userEffort: IEffort = {
      ...existing,
      id,
      registrySource: 'user',
      aliases: updatedAliases,
      updatedAt: now,
      derivation: existing.derivation ?? {
        parentSlug: existing.slug,
        coefficients: {},
        hardOverrides: {},
      },
    };
    await registry.upsert(userEffort);
    return userEffort;
  }

  const updatedUserEffort: IEffort = {
    ...existing,
    aliases: updatedAliases,
    updatedAt: now,
  };
  await registry.upsert(updatedUserEffort);
  return updatedUserEffort;
}
