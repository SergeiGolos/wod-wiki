/**
 * seedSync — the boot orchestrator (docs/prototypes/seed-data-unification.md
 * § Version check). Ties together: flag gate → skip-fetch fast path →
 * multi-tab claim → manifest fetch → version decision → SeedImporter →
 * claim release → cross-tab broadcast.
 *
 * Default-on; set localStorage['wodwiki.seedImport.enabled'] = '0' to opt out.
 * Settings → System can force a manual re-sync (`force: true`) and read the
 * local/remote version pair via `readSeedStatus`.
 */
import { emptySeedMeta, SEED_BROADCAST_CHANNEL, type SeedMetaRecord } from '@/types/seed';
import { SeedImporter } from './SeedImporter';
import { HttpSeedSource } from './HttpSeedSource';
import { IndexedDBSeedImportStorage, type SeedImportStorage } from './SeedImportStorage';
import type { ISeedSource } from './ISeedSource';
import { decideSeedImport, EMBEDDED_SEED_VERSION, storedSeedIsCurrent } from './seedVersion';
import { invalidateSeedContent } from '@/services/content/seedContent';
import { hydrateAppEffortRegistry, getAppEffortRegistry } from '@/services/effortRegistry';

export { SEED_BROADCAST_CHANNEL } from '@/types/seed';
export const SEED_IMPORT_FLAG = 'wodwiki.seedImport.enabled';

/** A claim older than this is assumed abandoned (crashed tab). */
export const SEED_CLAIM_TTL_MS = 45_000;

/** Default-on; '0' is the explicit opt-out. */
export function isSeedImportEnabled(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(SEED_IMPORT_FLAG) !== '0';
  } catch {
    return false;
  }
}

export type SeedSyncOutcome = 'disabled' | 'current' | 'busy' | 'imported' | 'server-stale' | 'error';

export interface SeedSyncDeps {
  source?: ISeedSource;
  storage?: SeedImportStorage;
  embeddedVersion?: number;
  /** Claim owner id; defaults to a fresh random per call. */
  owner?: string;
  now?: () => number;
  broadcast?: (message: unknown) => void;
  /** Flag override for tests; defaults to the localStorage flag. */
  isEnabled?: () => boolean;
  /**
   * Manual re-sync (Settings → System): skip the stored===embedded fast path
   * and the version-equality check so every chunk re-applies (ownership
   * rules still gate every row).
   */
  force?: boolean;
}

function defaultBroadcast(message: unknown): void {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      new BroadcastChannel(SEED_BROADCAST_CHANNEL).postMessage(message);
    }
  } catch {
    // Cross-tab notification is best-effort.
  }
}

function freshClaimIsOther(meta: SeedMetaRecord | undefined, owner: string, now: number): boolean {
  const claim = meta?.claim;
  return !!claim && claim.owner !== owner && now - claim.at < SEED_CLAIM_TTL_MS;
}

export async function runSeedSync(deps: SeedSyncDeps = {}): Promise<SeedSyncOutcome> {
  const outcome = await runSeedSyncInner(deps);
  console.info(`[seedSync] outcome: ${outcome}`);
  return outcome;
}

async function runSeedSyncInner(deps: SeedSyncDeps): Promise<SeedSyncOutcome> {
  if (!(deps.isEnabled ?? isSeedImportEnabled)()) return 'disabled';

  const storage = deps.storage ?? new IndexedDBSeedImportStorage();
  const source = deps.source ?? new HttpSeedSource();
  const embeddedVersion = deps.embeddedVersion ?? EMBEDDED_SEED_VERSION;
  const now = deps.now ?? Date.now;
  const owner = deps.owner ?? `seed-${now()}-${Math.random().toString(36).slice(2, 8)}`;
  const broadcast = deps.broadcast ?? defaultBroadcast;

  try {
    const stored = await storage.getSeedMeta();

    // Skip-fetch fast path: this bundle's own seed is already stored.
    if (!deps.force && storedSeedIsCurrent(stored, embeddedVersion)) return 'current';
    if (freshClaimIsOther(stored, owner, now())) return 'busy';

    const manifest = await source.fetchManifest();
    const decision = deps.force ? 'import' : decideSeedImport(stored?.seedVersion, manifest.version);
    if (decision === 'server-stale') return 'server-stale';
    if (decision === 'current') return 'current';

    // Claim before the (potentially long) chunk imports.
    const claimed: SeedMetaRecord = { ...(stored ?? emptySeedMeta()), claim: { owner, at: now() } };
    await storage.putSeedMeta(claimed);
    try {
      const result = await new SeedImporter(storage, source, now).applyAll({ forceAll: deps.force === true });
      if (result.status === 'imported') {
        broadcast({ kind: 'seed-imported', version: manifest.version });
        // BroadcastChannel does not echo to the importing context — refresh
        // this tab's content caches and the effort registry directly.
        invalidateSeedContent();
        const registry = getAppEffortRegistry();
        if (registry.isInitialized()) await hydrateAppEffortRegistry(registry);
      }
    } finally {
      const after = await storage.getSeedMeta();
      if (after?.claim?.owner === owner) {
        await storage.putSeedMeta({ ...after, claim: null });
      }
    }
    return 'imported';
  } catch (err) {
    console.warn('[seedSync] seed sync failed', err);
    return 'error';
  }
}

// ── Status (Settings → System) ─────────────────────────────────────────────

export interface SeedVersionInfo {
  version: number;
  schema: number;
  builtAt: string;
}

export interface SeedStatus {
  /** The import checkpoint in Storage — null before the first import. */
  stored: (SeedVersionInfo & { importedAt: number }) | null;
  /** The published manifest — null when unreachable (offline). */
  remote: SeedVersionInfo | null;
  remoteError: string | null;
}

/** Local + remote seed versions for the Settings status card. */
export async function readSeedStatus(): Promise<SeedStatus> {
  const stored = await new IndexedDBSeedImportStorage().getSeedMeta();
  let remote: SeedStatus['remote'] = null;
  let remoteError: string | null = null;
  try {
    const manifest = await new HttpSeedSource().fetchManifest();
    remote = { version: manifest.version, schema: manifest.schema, builtAt: manifest.builtAt };
  } catch (err) {
    remoteError = err instanceof Error ? err.message : String(err);
  }
  return {
    stored: stored
      ? { version: stored.seedVersion, schema: stored.schema, builtAt: stored.builtAt, importedAt: stored.importedAt }
      : null,
    remote,
    remoteError,
  };
}
