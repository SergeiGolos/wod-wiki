/**
 * Seed contract — shared between the build-time compiler
 * (scripts/generate-seed.ts) and the runtime importer (src/services/seed/).
 * See docs/prototypes/seed-data-unification.md.
 *
 * Type-only + pure constants: safe to import from both the Bun script and
 * the Vite bundle.
 */

/** One row of a seed chunk — a source file's identity + raw text. */
export interface SeedRow {
  /** Repo-relative POSIX path of the source markdown. */
  path: string;
  /** Raw file text. */
  content: string;
}

/** One chunk entry in the seed manifest. */
export interface ManifestChunk {
  id: string;
  /** Path under the seed dir, e.g. `chunks/efforts.ab12cd34.json`. */
  path: string;
  /**
   * Full hex sha256 of the chunk bytes — the change-detection token for
   * checkpointed re-import. Transport integrity is HTTPS's job; the runtime
   * does not re-verify this hash against re-serialized JSON.
   */
  sha256: string;
  bytes: number;
  /** Row count. */
  count: number;
}

/** `seed/manifest.json` — the only file a boot version check must fetch. */
export interface SeedManifest {
  /** Seed format version — bump on incompatible row-shape changes. */
  schema: number;
  /** Monotonic: builtAt epoch ms. */
  version: number;
  builtAt: string;
  chunks: ManifestChunk[];
}

/** The `meta`-store record (key `seed`) — the import checkpoint. */
export interface SeedMetaRecord {
  key: 'seed';
  /** Seed format version of the last full apply — mismatch forces re-apply. */
  schema: number;
  /** manifest.version of the last fully-applied manifest. */
  seedVersion: number;
  builtAt: string;
  importedAt: number;
  /** Per-chunk checkpoint: last applied sha + the note ids the chunk owns. */
  chunks: Record<string, { sha256: string; noteIds: string[] }>;
  /** Multi-tab single-writer claim; stale after CLAIM_TTL_MS. */
  claim?: { owner: string; at: number } | null;
}

/** v2 — the efforts chunk additionally materializes IEffort records. */
export const SEED_SCHEMA = 2;
export const SEED_META_KEY = 'seed';
/** Every seed note owns exactly one immutable segment at this position id. */
export const SEED_SEGMENT_ID = 'seed';
/** Efforts corpus chunk — materializes IEffort records alongside its notes. */
export const EFFORTS_CHUNK_ID = 'efforts';

/** Empty checkpoint — pre-first-import state. */
export function emptySeedMeta(): SeedMetaRecord {
  return { key: SEED_META_KEY, schema: SEED_SCHEMA, seedVersion: 0, builtAt: '', importedAt: 0, chunks: {}, claim: null };
}
