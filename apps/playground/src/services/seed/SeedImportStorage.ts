/**
 * The storage port the Seed Importer writes through — narrow, like
 * `NotePersistenceStorage` (services/persistence/types.ts), so tests run on
 * an in-memory adapter with no IndexedDB globals (CONTEXT.md § Storage).
 *
 * The atomicity unit is ONE CHUNK: upserts + deletions + the checkpoint
 * record commit in a single transaction, so a crash leaves every earlier
 * chunk committed and resumable by sha comparison.
 */
import type { SeedMetaRecord } from '@/types/seed';
import type { IEffort } from '@bitcobblers/wod-wiki-lang';
import type { BlockIndexRow, Note, NoteSegment } from '@/types/storage';
import { storage, type IStorage } from '@/services/storage';
import { SEED_META_KEY, seedSegmentId } from '@/types/seed';

export interface SeedChunkWrite {
  notes: Note[];
  segments: NoteSegment[];
  /** Effort records materialized from the efforts chunk (seed v2). */
  efforts: IEffort[];
  /** Precomputed block-index rows materialized by `block-index.<n>` chunks (seed v3). */
  blocks: BlockIndexRow[];
  /** Seed-origin note ids removed from the corpus. Never includes
   *  user-owned rows — the importer filters before calling. */
  deleteNoteIds: string[];
  /** Seed-origin effort slugs removed from the corpus. */
  deleteEffortSlugs: string[];
  /** Seed-origin block-index row ids removed from the corpus. */
  deleteBlockIds: string[];
  /** Checkpoint state to persist in the same transaction. */
  meta: SeedMetaRecord;
}

export interface SeedImportStorage {
  getSeedMeta(): Promise<SeedMetaRecord | undefined>;
  putSeedMeta(meta: SeedMetaRecord): Promise<void>;
  getNote(id: string): Promise<Note | undefined>;
  getEffort(slug: string): Promise<IEffort | undefined>;
  /** Atomic per-chunk apply: upserts + deletions + checkpoint in one transaction. */
  applyChunk(write: SeedChunkWrite): Promise<void>;
}

/** Production adapter over the shared `wodwiki-db` connection. */
export class IndexedDBSeedImportStorage implements SeedImportStorage {
  constructor(private readonly storageInstance: IStorage = storage) {}

  async getSeedMeta(): Promise<SeedMetaRecord | undefined> {
    return (await this.storageInstance.readonly('meta').get(SEED_META_KEY)) as SeedMetaRecord | undefined;
  }

  async putSeedMeta(meta: SeedMetaRecord): Promise<void> {
    await this.storageInstance.readwrite('meta').put(meta);
  }

  async getNote(id: string): Promise<Note | undefined> {
    return this.storageInstance.readonly('notes').get(id);
  }

  async getEffort(slug: string): Promise<IEffort | undefined> {
    return this.storageInstance.readonly('efforts').get(slug);
  }

  async applyChunk(write: SeedChunkWrite): Promise<void> {
    await this.storageInstance.transaction(
      ['notes', 'segments', 'efforts', 'block_index', 'meta'],
      'readwrite',
      async (tx) => {
        const notes = tx.readwrite('notes');
        for (const note of write.notes) await notes.put(note);
        for (const id of write.deleteNoteIds) await notes.delete(id);

        const segments = tx.readwrite('segments');
        for (const segment of write.segments) await segments.put(segment);
        for (const id of write.deleteNoteIds) await segments.delete([seedSegmentId(id), 1]);

        const efforts = tx.readwrite('efforts');
        for (const effort of write.efforts) await efforts.put(effort);
        for (const slug of write.deleteEffortSlugs) await efforts.delete(slug);

        const blocks = tx.readwrite('block_index');
        for (const row of write.blocks) await blocks.put(row);
        for (const id of write.deleteBlockIds) await blocks.delete(id);

        await tx.readwrite('meta').put(write.meta);
      }
    );
  }
}

/** Test adapter — plain maps, identical semantics, inspectable. */
export class InMemorySeedStorage implements SeedImportStorage {
  private readonly notes = new Map<string, Note>();
  private readonly segments = new Map<string, NoteSegment>();
  private readonly effortsBySlug = new Map<string, IEffort>();
  private readonly blockRows = new Map<string, BlockIndexRow>();
  private meta?: SeedMetaRecord;
  applyCount = 0;

  getSeedMeta(): Promise<SeedMetaRecord | undefined> {
    return Promise.resolve(this.meta);
  }

  async putSeedMeta(meta: SeedMetaRecord): Promise<void> {
    this.meta = structuredClone(meta);
  }

  getNote(id: string): Promise<Note | undefined> {
    return Promise.resolve(this.notes.get(id));
  }

  getEffort(slug: string): Promise<IEffort | undefined> {
    return Promise.resolve(this.effortsBySlug.get(slug));
  }

  async applyChunk(write: SeedChunkWrite): Promise<void> {
    this.applyCount += 1;
    for (const note of write.notes) this.notes.set(note.id, structuredClone(note));
    for (const segment of write.segments) this.segments.set(segment.noteId, structuredClone(segment));
    for (const effort of write.efforts) this.effortsBySlug.set(effort.slug, structuredClone(effort));
    for (const row of write.blocks) this.blockRows.set(row.id, structuredClone(row));
    for (const id of write.deleteNoteIds) {
      this.notes.delete(id);
      this.segments.delete(id);
    }
    for (const slug of write.deleteEffortSlugs) this.effortsBySlug.delete(slug);
    for (const id of write.deleteBlockIds) this.blockRows.delete(id);
    this.meta = structuredClone(write.meta);
  }

  // ── Test inspection ──
  allNotes(): Note[] {
    return [...this.notes.values()];
  }

  allSegments(): NoteSegment[] {
    return [...this.segments.values()];
  }

  allEfforts(): IEffort[] {
    return [...this.effortsBySlug.values()];
  }

  allBlocks(): BlockIndexRow[] {
    return [...this.blockRows.values()];
  }
}
