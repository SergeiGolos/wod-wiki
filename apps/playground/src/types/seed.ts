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

/** Chunk payload kinds. `'block-index'` chunks carry precomputed BlockIndexRow[]. */
export type ChunkKind = 'notes' | 'block-index';

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
  /** Row payload kind — defaults to `'notes'` (raw markdown rows). */
  kind?: ChunkKind;
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
  /**
   * Per-chunk checkpoint: last applied sha + the row ids the chunk owns.
   * `noteIds` for notes chunks, `blockIds` for block-index chunks.
   */
  chunks: Record<string, { sha256: string; noteIds?: string[]; blockIds?: string[] }>;
  /** Multi-tab single-writer claim; stale after CLAIM_TTL_MS. */
  claim?: { owner: string; at: number } | null;
}

/** v4 — per-note seed segment ids (`seed:<noteId>`); forces one re-apply. */
export const SEED_SCHEMA = 4;
/** The `meta`-store key holding the import checkpoint record. */
export const SEED_META_KEY = 'seed';
/**
 * Every seed note owns exactly one immutable segment; its id is
 * `seed:<noteId>` — unique per note (the segments store keys by
 * [segmentId, version], so a shared literal id would collapse rows).
 */
export function seedSegmentId(noteId: string): string {
  return `seed:${noteId}`;
}
/** Cross-tab notification channel: a fresh seed has landed in Storage. */
export const SEED_BROADCAST_CHANNEL = 'wodwiki.seed';
/** Efforts corpus chunk — materializes IEffort records alongside its notes. */
export const EFFORTS_CHUNK_ID = 'efforts';
/** Prefix of the split block-index chunks (`block-index.<n>`). */
export const BLOCK_INDEX_CHUNK_PREFIX = 'block-index.';

/** Empty checkpoint — pre-first-import state. */
export function emptySeedMeta(): SeedMetaRecord {
  return { key: SEED_META_KEY, schema: SEED_SCHEMA, seedVersion: 0, builtAt: '', importedAt: 0, chunks: {}, claim: null };
}
