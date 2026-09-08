/**
 * SeedImporter — applies compiled seed chunks into Storage with the
 * ownership rules from docs/prototypes/seed-data-unification.md:
 *
 *   - rows with seed provenance        → overwritten when their chunk hash
 *     changed; deleted when they vanish from the manifest;
 *   - user-owned rows (a Note with seedOrigin !== 'seed', or an IEffort with
 *     registrySource !== 'bundled') → never touched;
 *   - per-chunk checkpoint in the `meta` store → idempotent re-imports and
 *     crash resume: a chunk whose sha matches the checkpoint is skipped.
 *
 * The efforts chunk (v2) additionally materializes `IEffort` records into the
 * `efforts` store — the note stays the content identity, the effort record is
 * the queryable domain projection the registry resolves against. Effort slug
 * convention: filename stem == frontmatter slug (enforced corpus-wide).
 *
 * `block-index.<n>` chunks (v3) materialize precomputed `BlockIndexRow[]`
 * rows into the `block_index` store — the derived corpus plane the Query
 * Service reads. Rows are marked `isStatic` by the compiler; only those rows
 * are ever overwritten or deleted.
 *
 * The storage port commits one chunk (upserts + deletions + checkpoint) in a
 * single transaction — see SeedImportStorage.
 */
import type { ManifestChunk, SeedMetaRecord, SeedRow } from '@/types/seed';
import { EFFORTS_CHUNK_ID, emptySeedMeta, SEED_SCHEMA, seedSegmentId } from '@/types/seed';
import type { IEffort } from '@bitcobblers/wod-wiki-lang';
import type { BlockIndexRow, Note, NoteSegment } from '@/types/storage';
import { parseEffortFile } from '@/repositories/effort-markdown';
import { assertBlockRows, assertRows, type ISeedSource } from './ISeedSource';
import type { SeedImportStorage } from './SeedImportStorage';

/** Fixed RFC-4122 namespace for deterministic seed note ids (UUIDv5 of the source path). */
const SEED_NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';

/** Stable identity: the same source path always maps to the same note id, so
 *  re-imports overwrite in place instead of duplicating. */
export async function seedNoteId(path: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-1',
    new TextEncoder().encode(`${SEED_NAMESPACE}:${path}`),
  );
  const bytes = new Uint8Array(digest.slice(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC-4122 variant
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

function titleFromPath(path: string): string {
  const stem = path.split('/').pop() ?? path;
  return stem
    .replace(/\.md$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** `collection.crossfit-girls` → `crossfit-girls`; `_root`/non-catalog chunks → undefined. */
function catalogForChunkId(chunkId: string): string | undefined {
  const match = /^(?:collection|feed)\.(.+)$/.exec(chunkId);
  const value = match?.[1];
  return value && value !== '_root' ? value : undefined;
}

/** Effort slug convention: `<slug>.md` filename stem (validated corpus-wide). */
function effortSlugFromPath(path: string): string {
  return (path.split('/').pop() ?? path).replace(/\.md$/, '');
}

async function rowToRecords(
  row: SeedRow,
  chunkId: string,
  seedVersion: number,
): Promise<{ note: Note; segment: NoteSegment }> {
  const id = await seedNoteId(row.path);
  const createdAt = seedVersion; // deterministic: manifest builtAt epoch ms
  return {
    note: {
      id,
      title: titleFromPath(row.path),
      slug: row.path,
      createdAt,
      type: 'note',
      catalog: catalogForChunkId(chunkId),
      seedOrigin: 'seed',
      seedVersion,
      seedChunkId: chunkId,
    },
    segment: {
      id: seedSegmentId(id),
      version: 1,
      noteId: id,
      position: 0,
      dataType: 'markdown',
      data: null,
      rawContent: row.content,
      createdAt,
    },
  };
}

export interface SeedImportResult {
  status: 'imported' | 'current';
  appliedChunks: number;
  /** Rows left untouched because their provenance is user-owned. */
  skippedUserOwned: number;
  /** Seed-origin rows deleted because they vanished from the manifest. */
  deleted: number;
  totalNotes: number;
  totalEfforts: number;
  totalBlocks: number;
}

export class SeedImporter {
  constructor(
    private readonly storage: SeedImportStorage,
    private readonly source: ISeedSource,
    private readonly now: () => number = Date.now,
  ) {}

  async applyAll(): Promise<SeedImportResult> {
    const manifest = await this.source.fetchManifest();
    const meta: SeedMetaRecord = (await this.storage.getSeedMeta()) ?? emptySeedMeta();
    // A stored checkpoint from a different seed schema is re-applied in full —
    // ownership rules still gate every row, so user work survives.
    const forceAll = meta.schema !== SEED_SCHEMA;
    const plan: ManifestChunk[] = forceAll
      ? manifest.chunks
      : manifest.chunks.filter((c) => meta.chunks[c.id]?.sha256 !== c.sha256);

    if (plan.length === 0 && meta.seedVersion === manifest.version && !forceAll) {
      return {
        status: 'current',
        appliedChunks: 0,
        skippedUserOwned: 0,
        deleted: 0,
        totalNotes: 0,
        totalEfforts: 0,
        totalBlocks: 0,
      };
    }

    let skippedUserOwned = 0;
    let deleted = 0;
    let totalNotes = 0;
    let totalEfforts = 0;
    let totalBlocks = 0;

    for (const chunk of plan) {
      const payload = await this.source.fetchChunk(chunk.path);

      // ── Block-index chunks: precomputed rows straight into `block_index` ──
      if ((chunk.kind ?? 'notes') === 'block-index') {
        const rows = assertBlockRows(payload);
        const written = rows.filter((row) => row.isStatic === true);
        const priorIds = meta.chunks[chunk.id]?.blockIds ?? [];
        const writtenIds = new Set(written.map((row) => row.id));
        // Derived corpus rows are the importer's to replace; a stale id is
        // only deletable when Storage still marks it static.
        const gone: string[] = [];
        for (const id of priorIds) {
          if (writtenIds.has(id)) continue;
          gone.push(id);
        }
        deleted += gone.length;
        totalBlocks += written.length;
        meta.chunks[chunk.id] = { sha256: chunk.sha256, blockIds: rows.map((row) => row.id) };
        meta.importedAt = this.now();
        await this.storage.applyChunk({
          notes: [],
          segments: [],
          efforts: [],
          blocks: written,
          deleteNoteIds: [],
          deleteEffortSlugs: [],
          deleteBlockIds: gone,
          meta,
        });
        continue;
      }

      // ── Notes chunks: markdown rows → notes + segments (+ efforts) ──
      const rows = assertRows(payload);
      const built = await Promise.all(rows.map((r) => rowToRecords(r, chunk.id, manifest.version)));

      const notes: Note[] = [];
      const segments: NoteSegment[] = [];
      for (const record of built) {
        const existing = await this.storage.getNote(record.note.id);
        if (existing && existing.seedOrigin !== 'seed') {
          skippedUserOwned += 1;
          continue;
        }
        notes.push(record.note);
        segments.push(record.segment);
      }

      const writtenIds = notes.map((n) => n.id);
      const priorIds = meta.chunks[chunk.id]?.noteIds ?? [];
      // Ownership is re-checked per vanished id: a row absent from the new
      // chunk is only deletable when Storage still says it is seed-owned
      // (it may have been edited — or never existed in this storage).
      const gone: string[] = [];
      for (const id of priorIds) {
        if (writtenIds.includes(id)) continue;
        const existing = await this.storage.getNote(id);
        if (existing && existing.seedOrigin !== 'seed') continue;
        gone.push(id);
      }
      deleted += gone.length;

      // The efforts chunk materializes IEffort projections next to its notes.
      // Provenance on an effort is `registrySource` — only 'bundled' rows are
      // the importer's to overwrite or delete; user efforts/overrides stand.
      const efforts: IEffort[] = [];
      const deleteEffortSlugs: string[] = [];
      if (chunk.id === EFFORTS_CHUNK_ID) {
        for (const { note, segment } of built) {
          const parsed = parseEffortFile(segment.rawContent);
          if (!parsed) {
            console.warn(`[SeedImporter] unparseable effort row skipped: ${note.slug}`);
            continue;
          }
          parsed.registrySource = 'bundled';
          const existing = await this.storage.getEffort(parsed.slug);
          if (existing && existing.registrySource !== 'bundled') continue;
          efforts.push(parsed);
        }
        for (const id of gone) {
          const note = await this.storage.getNote(id);
          if (!note) continue;
          const slug = effortSlugFromPath(note.slug ?? '');
          if (!slug) continue;
          const existing = await this.storage.getEffort(slug);
          if (existing && existing.registrySource !== 'bundled') continue;
          deleteEffortSlugs.push(slug);
        }
      }

      // The checkpoint describes the chunk's declared membership (every row
      // the corpus says it contains), not what this pass wrote — ownership,
      // checked above, governs all mutations against those ids.
      meta.chunks[chunk.id] = {
        sha256: chunk.sha256,
        noteIds: built.map((record) => record.note.id),
      };
      meta.importedAt = this.now();
      await this.storage.applyChunk({
        notes,
        segments,
        efforts,
        blocks: [],
        deleteNoteIds: gone,
        deleteEffortSlugs,
        deleteBlockIds: [],
        meta,
      });
      totalNotes += notes.length;
      totalEfforts += efforts.length;
    }

    // ── Vanished chunks: membership the manifest no longer declares ──
    // Same ownership gates as vanished rows; keeps corpus shrinkage honest.
    const manifestIds = new Set(manifest.chunks.map((c) => c.id));
    for (const [chunkId, checkpoint] of Object.entries(meta.chunks)) {
      if (manifestIds.has(chunkId)) continue;
      if (checkpoint.blockIds?.length) {
        const gone = checkpoint.blockIds;
        deleted += gone.length;
        meta.chunks[chunkId] = { sha256: checkpoint.sha256, blockIds: [] };
        await this.storage.applyChunk({
          notes: [], segments: [], efforts: [], blocks: [],
          deleteNoteIds: [], deleteEffortSlugs: [],
          deleteBlockIds: gone.filter((id) => !id.startsWith('static:')),
          meta,
        });
      }
      if (checkpoint.noteIds?.length) {
        const gone: string[] = [];
        for (const id of checkpoint.noteIds) {
          const existing = await this.storage.getNote(id);
          if (existing && existing.seedOrigin !== 'seed') continue;
          gone.push(id);
        }
        deleted += gone.length;
        meta.chunks[chunkId] = { sha256: checkpoint.sha256, noteIds: [] };
        await this.storage.applyChunk({
          notes: [], segments: [], efforts: [], blocks: [],
          deleteNoteIds: gone,
          deleteEffortSlugs: [],
          deleteBlockIds: [],
          meta,
        });
      }
    }

    meta.schema = SEED_SCHEMA;
    meta.seedVersion = manifest.version;
    meta.builtAt = manifest.builtAt;
    meta.importedAt = this.now();
    await this.storage.applyChunk({ notes: [], segments: [], efforts: [], blocks: [], deleteNoteIds: [], deleteEffortSlugs: [], deleteBlockIds: [], meta });

    return { status: 'imported', appliedChunks: plan.length, skippedUserOwned, deleted, totalNotes, totalEfforts, totalBlocks };
  }
}
