/**
 * Seed versioning — the pure stale-while-revalidate decision plus the
 * build-injected embedded version (docs/prototypes/seed-data-unification.md
 * § Version check).
 *
 * `__SEED_VERSION__` is a Vite `define` constant stamped from
 * `public/seed/manifest.json` at build time. Under bun test (no Vite) the
 * typeof guard yields 0 — which is also the pre-first-import stored version.
 */
import type { SeedMetaRecord } from '@/types/seed';

export const EMBEDDED_SEED_VERSION: number =
  typeof __SEED_VERSION__ === 'number' ? __SEED_VERSION__ : 0;

export type SeedVersionDecision = 'import' | 'current' | 'server-stale';

/**
 * Compare a fetched manifest against the stored checkpoint.
 * Never consults `embeddedVersion` — the skip-fetch optimization
 * (stored === embedded → no network) lives in the orchestrator.
 */
export function decideSeedImport(
  storedVersion: number | undefined,
  remoteVersion: number,
): SeedVersionDecision {
  if (storedVersion === undefined || storedVersion <= 0) return 'import';
  if (remoteVersion > storedVersion) return 'import';
  if (remoteVersion === storedVersion) return 'current';
  return 'server-stale';
}

/** True when the boot check can skip the manifest fetch entirely. */
export function storedSeedIsCurrent(meta: SeedMetaRecord | undefined, embeddedVersion: number): boolean {
  return meta?.seedVersion != null && meta.seedVersion > 0 && meta.seedVersion === embeddedVersion;
}
