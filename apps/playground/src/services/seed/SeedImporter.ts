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
import { CANVAS_CHUNK_ID, EFFORTS_CHUNK_ID, emptySeedMeta, SEED_SCHEMA, seedSegmentId } from '@/types/seed';
import type { IEffort } from '@bitcobblers/wod-wiki-lang';
import type { BlockEffort, BlockIndexRow, Note, NoteSegment, Page, PageNote } from '@/types/storage';
import { parseEffortFile } from '@/repositories/effort-markdown';
import { extractTypedFrontmatterTags, parseFrontmatter } from '@/lib/frontmatter';
import { DEFAULT_TAG_TYPES } from '@/services/storage/StorageService';
import { assertBlockEffortRows, assertBlockRows, assertRows, type ISeedSource } from './ISeedSource';
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

const KNOWN_TAG_TYPES = DEFAULT_TAG_TYPES.map((t) => t.name);

/** `collection.crossfit-girls` → `crossfit-girls`; `_root`/non-catalog chunks → undefined. */
function catalogForChunkId(chunkId: string): string | undefined {
  const match = /^(?:collection|feed)\.(.+)$/.exec(chunkId);
  const value = match?.[1];
  return value && value !== '_root' ? value : undefined;
}

async function rowToRecords(
  row: SeedRow,
  chunkId: string,
  seedVersion: number,
): Promise<{ note: Note; segment: NoteSegment; tags: Array<string | { label: string; type?: string }>; page?: Page; pageNote?: PageNote }> {
  const id = await seedNoteId(row.path);
  const createdAt = seedVersion; // deterministic: manifest builtAt epoch ms

  const { meta } = parseFrontmatter(row.content);

  let date: number | undefined = undefined;
  let page: Page | undefined = undefined;
  let pageNote: PageNote | undefined = undefined;

  // Parse `date` frontmatter (YYYY-MM-DD) → Note.date (noon UTC)
  if ('date' in meta) {
    const rawDate = meta['date'];
    if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      date = new Date(`${rawDate}T12:00:00Z`).getTime();
    }
  }

  // Parse `slug` frontmatter → create owning Page
  let pageId: string | undefined = undefined;
  if ('slug' in meta) {
    const slug = String(meta['slug']).trim();
    if (slug) {
      pageId = await seedNoteId(`page:${slug}`);
      page = {
        id: pageId,
        slug,
        title: titleFromPath(row.path),
        createdAt,
      };
      pageNote = {
        id: await seedNoteId(`pagenote:${slug}:${row.path}`),
        pageId,
        noteId: id,
        createdAt,
      };
    }
  }

  const tags = extractTypedFrontmatterTags(row.content, KNOWN_TAG_TYPES);
  return {
    note: {
      id,
      title: titleFromPath(row.path),
      date,
      createdAt,
      type: 'note',
      catalog: catalogForChunkId(chunkId),
      seedOrigin: 'seed',
      seedVersion,
      seedChunkId: chunkId,
      sourcePath: row.path,
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
    tags,
    page,
    pageNote,
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

  /**
   * Rewrite a compiled static row onto the imported note UUID through the
   * row's full sourcePath (exact `Note.sourcePath` identity, never a path
   * trim or guess); the compiler's path-stem noteId is preserved as
   * `routeId` route sugar on block rows. A missing or ambiguous parent
   * mapping throws BEFORE the chunk transaction opens — storage keeps its
   * prior rows and the cutover fails loudly instead of half-migrating.
   */
  private mapStaticRow(row: BlockIndexRow, bySourcePath: Map<string, string>): BlockIndexRow;
  private mapStaticRow(row: BlockEffort, bySourcePath: Map<string, string>): BlockEffort;
  private mapStaticRow(
    row: BlockIndexRow | BlockEffort,
    bySourcePath: Map<string, string>,
  ): BlockIndexRow | BlockEffort {
    const noteId = row.sourcePath ? bySourcePath.get(row.sourcePath) : undefined;
    if (!noteId) {
      throw new Error(
        `[SeedImporter] static row ${row.id}: sourcePath "${row.sourcePath ?? ''}" has no imported note — chunk aborted, storage untouched`,
      );
    }
    if ('effortSlug' in row) return { ...row, noteId };
    return { ...row, noteId, routeId: row.noteId };
  }

  /**
   * `onFirstPaintApplied` fires once the first-paint chunk (canvas — the
   * home page + every canvas route) is committed, before the rest of the
   * library is applied: content consumers refresh for first paint while
   * the remaining chunks stream in behind it. Never fires when the plan
   * has no pending canvas chunk (already applied / resuming).
   */
  async applyAll(opts: { forceAll?: boolean; onFirstPaintApplied?: () => void } = {}): Promise<SeedImportResult> {
    const manifest = await this.source.fetchManifest();
    const meta: SeedMetaRecord = (await this.storage.getSeedMeta()) ?? emptySeedMeta();
    // A stored checkpoint from a different seed schema — or a manual
    // Settings re-sync — is re-applied in full: ownership rules still gate
    // every row, so user work survives.
    const forceAll = opts.forceAll === true || meta.schema !== SEED_SCHEMA;
    const plan: ManifestChunk[] = forceAll
      ? manifest.chunks
      : manifest.chunks.filter((c) => meta.chunks[c.id]?.sha256 !== c.sha256);

    // First paint first: the canvas chunk is one small fetch carrying the
    // home page and every canvas route; the multi-megabyte collection/
    // feed/block-index tail is what must never gate first paint
    // (seed-data-unification.md § Version check, first-ever run).
    const firstPaint = plan.filter((c) => c.id === CANVAS_CHUNK_ID);
    const orderedPlan = [...firstPaint, ...plan.filter((c) => c.id !== CANVAS_CHUNK_ID)];
    let firstPaintLeft = firstPaint.length;

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

    for (const chunk of orderedPlan) {
      const payload = await this.source.fetchChunk(chunk.path);

      // ── Block-index chunks: precomputed rows straight into `block_index` ──
      if ((chunk.kind ?? 'notes') === 'block-index') {
        const rows = assertBlockRows(payload);
        const bySourcePath = await this.storage.getSourcePathMap();
        const written = rows
          .filter((row) => row.isStatic === true)
          .map((row) => this.mapStaticRow(row, bySourcePath));
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
          blockEfforts: [],
          deleteNoteIds: [],
          deleteEffortSlugs: [],
          deleteBlockIds: gone,
          deleteBlockEffortIds: [],
          meta,
        });
        continue;
      }

      // ── Block-efforts chunks: precomputed exercise containment rows ──
      if ((chunk.kind ?? 'notes') === 'block-efforts') {
        const rows = assertBlockEffortRows(payload);
        const bySourcePath = await this.storage.getSourcePathMap();
        const written = rows
          .filter((row) => row.isStatic === true)
          .map((row) => this.mapStaticRow(row, bySourcePath));
        const priorIds = meta.chunks[chunk.id]?.blockIds ?? [];
        const writtenIds = new Set(written.map((row) => row.id));
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
          blocks: [],
          blockEfforts: written,
          deleteNoteIds: [],
          deleteEffortSlugs: [],
          deleteBlockIds: [],
          deleteBlockEffortIds: gone,
          meta,
        });
        continue;
      }

      // ── Notes chunks: markdown rows → notes + segments (+ efforts) ──
      const rows = assertRows(payload);
      const built = await Promise.all(rows.map((r) => rowToRecords(r, chunk.id, manifest.version)));
      const rawById = new Map(built.map((record, i) => [record.note.id, rows[i].content]));

      const notes: Note[] = [];
      const segments: NoteSegment[] = [];
      const pages: Page[] = [];
      const pageNotes: PageNote[] = [];
      const noteTags: { noteId: string; tags: Array<string | { label: string; type?: string }> }[] = [];
      for (const record of built) {
        const existing = await this.storage.getNote(record.note.id);
        if (existing && existing.seedOrigin !== 'seed') {
          skippedUserOwned += 1;
          continue;
        }
        notes.push(record.note);
        segments.push(record.segment);
        if (record.page) pages.push(record.page);
        if (record.pageNote) pageNotes.push(record.pageNote);
        if (record.tags.length > 0) {
          noteTags.push({ noteId: record.note.id, tags: record.tags });
        }
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
        for (const { note } of built) {
          const rawContent = rawById.get(note.id);
          if (!rawContent) continue;
          const parsed = parseEffortFile(rawContent);
          if (!parsed) {
            console.warn(`[SeedImporter] unparseable effort row skipped: ${note.title}`);
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
          // Slug convention: filename stem == frontmatter slug (enforced corpus-wide).
          // We recover the path stem from the note's seedChunkId or derive it from the title
          // if the path isn't tracked anymore. Fallback to title stem.
          const slug = note.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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
        pages,
        pageNotes,
        noteTags,
        efforts,
        blocks: [],
        blockEfforts: [],
        deleteNoteIds: gone,
        deleteEffortSlugs,
        deleteBlockIds: [],
        deleteBlockEffortIds: [],
        meta,
      });
      totalNotes += notes.length;
      totalEfforts += efforts.length;
      // The canvas chunk is a notes chunk (compiler chunkIdFor), so the
      // first-paint check lives on this committed path; block-index
      // chunks (the `continue` path) are never first-paint.
      if (firstPaintLeft > 0 && --firstPaintLeft === 0) {
        opts.onFirstPaintApplied?.();
      }
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
          notes: [], segments: [], efforts: [], blocks: [], blockEfforts: [],
          deleteNoteIds: [], deleteEffortSlugs: [],
          deleteBlockIds: gone.filter((id) => !id.startsWith('static:')),
          deleteBlockEffortIds: [],
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
          notes: [], segments: [], efforts: [], blocks: [], blockEfforts: [],
          deleteNoteIds: gone,
          deleteEffortSlugs: [],
          deleteBlockIds: [],
          deleteBlockEffortIds: [],
          meta,
        });
      }
    }

    meta.schema = SEED_SCHEMA;
    meta.seedVersion = manifest.version;
    meta.builtAt = manifest.builtAt;
    meta.importedAt = this.now();
    await this.storage.applyChunk({
      notes: [], segments: [], efforts: [], blocks: [], blockEfforts: [],
      deleteNoteIds: [], deleteEffortSlugs: [], deleteBlockIds: [], deleteBlockEffortIds: [],
      meta,
    });

    return { status: 'imported', appliedChunks: plan.length, skippedUserOwned, deleted, totalNotes, totalEfforts, totalBlocks };
  }
}
