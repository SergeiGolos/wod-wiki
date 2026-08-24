/**
 * IndexedDB Service — V4 Multi-Source Data Lens
 *
 * Wrapper around 'idb' to manage the 'wodwiki-db' database.
 * V4 implements a "fresh start" destructive upgrade: if the existing DB is < 4
 * all legacy stores are dropped and recreated with the V4 schema.
 *
 * V4 stores:
 *   notes       — root containers
 *   segments    — versioned content (replaces scripts + section_history)
 *   results     — workout execution logs
 *   attachments — external temporal blobs (HR / GPS)
 *   events      — unified event store (V16; replaces the legacy analytics store)
 *
 * V6 — by-content / by-block indexes for cross-note result aggregation
 *      (cross-note-result-aggregation ADR).
 * V8 — slug field + by-slug index on notes; lazy per-note UUID migration
 *      for legacy route-id-keyed journal notes (note-identity-uuid-canonical ADR).
 */
import { openDB, DBSchema, IDBPDatabase, IDBPTransaction, IndexNames, StoreNames } from 'idb';
import {
    BlockIndexRow,
    Note,
    NoteSegment,
    NoteTag,
    Page,
    Tag,
    WorkoutResult,
    Attachment,
    UnifiedEventRecord,
    SegmentDataType,
} from '../../types/storage';
import { toEventRows, toSummaryEventRows } from '@bitcobblers/wod-wiki-wql';
import type { IEffort } from '@/effort-registry/types';
import type { ScriptBlock } from '@/components/Editor/types';
import { extractFrontmatterTags } from '@/lib/frontmatter';
import { createParser } from '@bitcobblers/wod-wiki-engine';
import {
    normalizeAllMetrics,
    normalizeSummaryFacts,
    replayResultAnalytics,
    type LegacyFactRow,
} from '@/services/analytics/workoutDerivation';

// ---------------------------------------------------------------------------
// UUID helpers (V8 lazy migration) — inline to avoid a dependency edge.
// ---------------------------------------------------------------------------
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(s: string): boolean { return UUID_RE.test(s); }
function uuidV4(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    // Fallback for older environments; collision-resistant enough for a local app.
    const hex = (n: number, len: number) => n.toString(16).padStart(len, '0');
    return `${hex(Math.random() * 0xffffffff, 8)}-${hex(Math.random() * 0xffff, 4)}-4${hex(Math.random() * 0xfff, 3)}-${hex(8 + Math.floor(Math.random() * 4), 1)}${hex(Math.random() * 0xfff, 3)}-${hex(Math.random() * 0xffffffffffff, 12)}`;
}

// ---------------------------------------------------------------------------
// DB Schema type (idb generic)
// ---------------------------------------------------------------------------
export interface WodWikiDB extends DBSchema {
    notes: {
        key: string;
        value: Note;
        indexes: {
            'by-slug': string; // V8 — slug (route) -> UUID; unique
            'by-page': string; // V10 — pageId; page-scoped note queries
        };
    };
    page: {
        key: string;
        value: Page;
        indexes: { 'by-date': string; 'by-slug': string }; // V10 — both unique-when-present
    };
    tags: {
        key: string;
        value: Tag;
        indexes: { 'by-label': string; 'by-type': string };
    };
    note_tags: {
        key: string;
        value: NoteTag;
        indexes: { 'by-note': string; 'by-tag': string };
    };
    segments: {
        key: [string, number]; // [id, version]
        value: NoteSegment;
        indexes: { 'by-note': string; 'by-type': SegmentDataType; 'by-page': string; 'by-history': number };
    };
    results: {
        key: string;
        value: WorkoutResult;
        indexes: {
            'by-segment': string; // segmentId — per-block journal queries (live since identity fix)
            'by-note': string;
            'by-completed': number;
            'by-content': string; // V6 — blockContentId; cross-note collection aggregation
            'by-block': string;   // V6 — blockId; efficient per-clone journal queries
            'by-page': string;    // V10 — pageId
            'by-origin': string;  // V10 — origin; default exclusion of playground rows
        };
    };
    attachments: {
        key: string;
        value: Attachment;
        indexes: { 'by-note': string; 'by-time': number; 'by-page': string; 'by-result': string };
    };
    /**
     * LEGACY — deleted by the V16 upgrade (unified event store, tickets
     * 002–004). The entry stays in the schema type because the V10–V13
     * upgrade backfills still write through it on the way up to V16; no
     * runtime code may touch it after the upgrade completes.
     */
    analytics: {
        key: string;
        value: LegacyFactRow;
        indexes: {
            'by-type': string; // the row's metric key (field is `type`)
            'by-segment': string;
            'by-result': string;
            'by-content': string;    // V6 — blockContentId; cross-workout trend queries
            'by-page': string;       // V10 — pageId
            'by-origin': string;     // V10 — origin
            'by-metric': string;     // V10 — metricKey; canonical cross-workout metric join
            'by-effort': string;     // V10 — effortSlug
            'by-grain': string;      // V10 — grain ('segment' | 'summary' | 'rollup')
            'by-discipline': string; // V10 — discipline
            'by-timestamp': number;  // V12 — canonical workout time; IDBKeyRange time scans
            'by-value': [string, number]; // V13 — compound [type, value]; IDBKeyRange threshold scans
        };
    };
    /**
     * V16 — THE single store for all workout data (unified event store).
     * Event rows (grain 'event') are appended per statement during a run;
     * summary rows (grain 'summary') are finalize-owned (engine-authored)
     * or reconcile-owned (user-authored wellness). Six indexes per ticket
     * 002/003 — `by-metric` deliberately absent (scan beats it, ticket 001).
     */
    events: {
        key: string;
        value: UnifiedEventRecord;
        indexes: {
            'by-timestamp': number;              // the one proven culling index
            'by-result-grain': [string, string]; // finalize clear, per-result fetch, orphan GC
            'by-content-grain': [string, string];// blockContentId join hot path
            'by-effort': string;
            'by-outputType': string;
            'by-grain': string;
        };
    };
    efforts: {
        key: string;
        value: IEffort;
        indexes: { 'by-discipline': string; 'by-source': IEffort['registrySource'] };
    };
    block_index: {
        key: string;
        value: BlockIndexRow;
        indexes: {
            'by-note': string;       // V14 — noteId; per-note rebuilds
            'by-content': string;    // V14 — blockContentId; cross-store joins
            'by-type': string;       // V14 — dataType; filter by block kind
        };
    };
}
const DB_VERSION = 16; // V16 — unified event store: +events, −analytics, re-derive from logs (tickets 002–004)
const DB_NAME = 'wodwiki-db';

type V10Tx = IDBPTransaction<WodWikiDB, StoreNames<WodWikiDB>[], 'versionchange'>;

/**
 * V10 backfill — runs inside the upgrade transaction when oldVersion < 10.
 *
 *  1. One calendar `page` per distinct notes.journalDate; notes.pageId set.
 *  2. pageId propagated to results / segments / attachments via parent note.
 *  3. results.segmentId backfilled from blockId (same positional value — the
 *     R-02 rename); results.origin backfilled from the playground/ + canvas:
 *     noteId prefixes (legacy rows otherwise stay undefined = 'journal').
 *  4. segments.updatedAt defaults to createdAt; isHistory computed per id
 *     (latest version = false, superseded = true).
 *  5. The legacy `analytics` store is PURGED: pre-V10 rows carry garbage
 *     segmentId/segmentVersion (runtime statement ids, always 0) and no
 *     feature reads them. The replay seam (workoutDerivation) regenerates
 *     fact rows from canonical data.logs on demand.
 */
async function backfillV10(tx: V10Tx): Promise<void> {
    const now = Date.now();
    const notesStore = tx.objectStore('notes');
    const pageStore = tx.objectStore('page');

    // Rows predate the V11 slim Note — journalDate exists only on legacy rows.
    const notes = await notesStore.getAll() as Array<Note & { journalDate?: string }>;
    const notesById = new Map(notes.map(n => [n.id, n]));

    // 1. Calendar pages from journalDate.
    const pageIdByDate = new Map<string, string>();
    for (const note of notes) {
        if (!note.journalDate || note.pageId) continue;
        let pageId = pageIdByDate.get(note.journalDate);
        if (!pageId) {
            const existing = await pageStore.index('by-date').get(note.journalDate);
            pageId = existing?.id ?? uuidV4();
            if (!existing) {
                await pageStore.put({ id: pageId, date: note.journalDate, title: note.journalDate, createdAt: now });
            }
            pageIdByDate.set(note.journalDate, pageId);
        }
        note.pageId = pageId;
        await notesStore.put(note);
    }

    // 2 + 3. Results: pageId from parent note, segmentId from blockId, origin from prefix.
    const resultsStore = tx.objectStore('results');
    for await (const cursor of resultsStore) {
        const result = cursor.value;
        const note = notesById.get(result.noteId);
        let dirty = false;
        if (!result.pageId && note?.pageId) { result.pageId = note.pageId; dirty = true; }
        if (!result.segmentId && result.blockId) { result.segmentId = result.blockId; dirty = true; }
        if (!result.origin && (result.noteId.startsWith('playground/') || result.noteId.startsWith('canvas:'))) {
            result.origin = 'playground';
            dirty = true;
        }
        if (dirty) await cursor.update(result);
    }

    // 4. Segments: pageId, updatedAt, isHistory.
    const segmentsStore = tx.objectStore('segments');
    const allSegments = await segmentsStore.getAll();
    const maxVersionById = new Map<string, number>();
    for (const segment of allSegments) {
        maxVersionById.set(segment.id, Math.max(maxVersionById.get(segment.id) ?? 0, segment.version));
    }
    for (const segment of allSegments) {
        const note = notesById.get(segment.noteId);
        if (!segment.pageId && note?.pageId) segment.pageId = note.pageId;
        segment.updatedAt ??= segment.createdAt;
        segment.isHistory = segment.version !== maxVersionById.get(segment.id);
        await segmentsStore.put(segment);
    }

    // Attachments: pageId from parent note.
    const attachmentsStore = tx.objectStore('attachments');
    for await (const cursor of attachmentsStore) {
        const attachment = cursor.value;
        const note = notesById.get(attachment.noteId);
        if (!attachment.pageId && note?.pageId) {
            attachment.pageId = note.pageId;
            await cursor.update(attachment);
        }
    }

    // 5. Purge legacy analytics rows (garbage identity; replay regenerates).
    await tx.objectStore('analytics').clear();
}

/**
 * V11 backfill — destructive field migrations inside the upgrade transaction.
 *  1. R-06 — results: createdAt <?= completedAt (field renamed in code).
 *  2. Segments — position from the parent note's segmentIds order (before
 *     N-04 removes it); dataType 'title' → h1 (h<level> when level present);
 *     drop the level/scriptBlock fields (the block lives in `data`).
 *  3. Notes — templateId→sourceId (createdFrom.ref as fallback); drop
 *     journalDate (page linkage since V10), rawContent, segmentIds,
 *     clonedIds, createdFrom, updatedAt, targetDate.
 *  4. N-06 — notes.tags[] → shared tags + note_tags rows.
 */
async function backfillV11(tx: V10Tx): Promise<void> {
    const now = Date.now();

    // 1. Results: createdAt rename.
    const resultsStore = tx.objectStore('results');
    for await (const cursor of resultsStore) {
        const row = cursor.value as WorkoutResult & { completedAt?: number };
        if (row.completedAt != null && row.createdAt == null) {
            row.createdAt = row.completedAt;
        }
        delete row.completedAt;
        await cursor.update(row);
    }

    // 2. Segments: position + h1–h6 dataType + field drops.
    const notesStore = tx.objectStore('notes');
    const legacyNotes = await notesStore.getAll() as Array<Note & {
        segmentIds?: string[];
        journalDate?: string;
        rawContent?: string;
        clonedIds?: string[];
        createdFrom?: { ref?: string };
        updatedAt?: number;
        targetDate?: number;
        templateId?: string;
        tags?: string[];
    }>;
    const orderByNote = new Map<string, string[]>();
    for (const note of legacyNotes) {
        if (note.segmentIds) orderByNote.set(note.id, note.segmentIds);
    }

    const segmentsStore = tx.objectStore('segments');
    const allSegments = await segmentsStore.getAll();
    for (const segment of allSegments) {
        const row = segment as NoteSegment & { level?: number; scriptBlock?: unknown };
        const order = orderByNote.get(segment.noteId);
        if (row.position == null && order) {
            const index = order.indexOf(segment.id);
            if (index >= 0) row.position = index;
        }
        if (segment.dataType === 'title' || segment.dataType === 'header') {
            const level = Math.min(6, Math.max(1, row.level ?? 1));
            row.dataType = `h${level}` as SegmentDataType;
        }
        delete row.level;
        delete row.scriptBlock;
        await segmentsStore.put(row);
    }

    // 3 + 4. Notes: sourceId rename, field drops, tags migration.
    const tagsStore = tx.objectStore('tags');
    const noteTagsStore = tx.objectStore('note_tags');
    const pageStore = tx.objectStore('page');
    const tagIdByLabel = new Map<string, string>();
    for (const note of legacyNotes) {
        // Page linkage for any journal-dated note that missed V10.
        if (note.journalDate && !note.pageId) {
            const existing = await pageStore.index('by-date').get(note.journalDate);
            const pageId = existing?.id ?? uuidV4();
            if (!existing) {
                await pageStore.put({ id: pageId, date: note.journalDate, title: note.journalDate, createdAt: now });
            }
            note.pageId = pageId;
        }

        if (note.templateId && !note.sourceId) note.sourceId = note.templateId;
        if (note.createdFrom?.ref && !note.sourceId) note.sourceId = note.createdFrom.ref;

        if (note.tags && note.tags.length > 0) {
            for (const label of note.tags) {
                let tagId = tagIdByLabel.get(label);
                if (!tagId) {
                    const existing = await tagsStore.index('by-label').get(label);
                    tagId = existing?.id ?? uuidV4();
                    if (!existing) {
                        await tagsStore.put({ id: tagId, label, createdAt: now });
                    }
                    tagIdByLabel.set(label, tagId);
                }
                await noteTagsStore.put({ id: uuidV4(), noteId: note.id, tagId });
            }
        }

        delete note.journalDate;
        delete note.rawContent;
        delete note.segmentIds;
        delete note.clonedIds;
        delete note.createdFrom;
        delete note.updatedAt;
        delete note.targetDate;
        delete note.templateId;
        delete note.tags;
        await notesStore.put(note);
    }
}

/**
 * V12 backfill — runs inside the upgrade transaction when 0 < oldVersion < 12.
 *
 *  1. Analytics purge + re-derive (V10 doctrine: fact rows are disposable;
 *     data.logs wins). Every result with logs is replayed through the
 *     headless engine via the replay seam, so regenerated Tier-2 outputs
 *     carry the summary processors' effort metadata; rows whose segment
 *     context is unrecoverable fall back to re-normalizing their stored logs
 *     (still fixes the timestamp and any metadata already present). Results
 *     that reached execution but never got facts (the pre-V12 partial-save
 *     path) gain them here.
 *  2. Fact rows are written with the canonical workout time
 *     (WorkoutResult.createdAt) as `timestamp` — the new by-timestamp index
 *     makes time-range queries IDBKeyRange scans.
 *  3. Frontmatter `tags:` sweep: every note's latest frontmatter segments
 *     contribute their tags to note_tags (additive — existing links kept).
 *
 * Exported for integration tests; production callers should only ever be the
 * upgrade callback below.
 */
export async function backfillV12(tx: V10Tx): Promise<void> {
    const now = Date.now();
    const resultsStore = tx.objectStore('results');
    const segmentsStore = tx.objectStore('segments');
    const analyticsStore = tx.objectStore('analytics');

    const results = await resultsStore.getAll();
    const allSegments = await segmentsStore.getAll();

    // Segment lookup mirrors rederiveResultAnalytics: pinned incarnation
    // first, latest version as fallback for rows recorded before
    // segmentVersion was stamped.
    const segmentByKey = new Map<string, NoteSegment>();
    const latestSegmentById = new Map<string, NoteSegment>();
    for (const segment of allSegments) {
        segmentByKey.set(`${segment.id}:${segment.version}`, segment);
        const current = latestSegmentById.get(segment.id);
        if (!current || segment.version > current.version) latestSegmentById.set(segment.id, segment);
    }

    // 1 + 2. Purge, then re-derive facts for every result with logs.
    await analyticsStore.clear();
    let replayed = 0;
    let renormalized = 0;
    let withoutLogs = 0;
    let factRows = 0;
    for (const result of results) {
        const logs = result.data?.logs ?? [];
        if (logs.length === 0) {
            withoutLogs++;
            continue;
        }
        const identity = {
            noteId: result.noteId,
            resultId: result.id,
            segmentId: result.segmentId,
            segmentVersion: result.segmentVersion,
            blockContentId: result.blockContentId,
            origin: result.origin,
            pageId: result.pageId,
            workoutTimestamp: result.createdAt,
        };

        let points;
        try {
            const segment = result.segmentId
                ? (result.segmentVersion != null
                    ? segmentByKey.get(`${result.segmentId}:${result.segmentVersion}`)
                    : undefined) ?? latestSegmentById.get(result.segmentId)
                : undefined;
            const scriptBlock = segment?.data as ScriptBlock | null | undefined;
            if (!scriptBlock) throw new Error('no recoverable segment context');
            const block = scriptBlock.statements?.length
                ? scriptBlock
                : { ...scriptBlock, statements: createParser().read(scriptBlock.content, scriptBlock.sport).statements };

            const derivedLogs = replayResultAnalytics(result, block);
            await resultsStore.put({ ...result, data: { ...result.data, logs: derivedLogs } });
            points = normalizeSummaryFacts(derivedLogs, identity);
            replayed++;
        } catch (err) {
            // Fallback: keep the stored logs, re-normalize facts from them.
            console.warn(`[IndexedDBService] V12 replay failed for result ${result.id}; re-normalizing stored logs`, err);
            points = normalizeSummaryFacts(logs, identity);
            renormalized++;
        }
        for (const point of points) {
            await analyticsStore.put(point);
        }
        factRows += points.length;
    }

    // 3. Frontmatter tags sweep — additive into note_tags.
    const frontmatterTagsByNote = new Map<string, Set<string>>();
    for (const segment of latestSegmentById.values()) {
        if (segment.dataType !== 'frontmatter' || segment.isHistory) continue;
        const tags = extractFrontmatterTags(segment.rawContent);
        if (tags.length === 0) continue;
        let bucket = frontmatterTagsByNote.get(segment.noteId);
        if (!bucket) {
            bucket = new Set<string>();
            frontmatterTagsByNote.set(segment.noteId, bucket);
        }
        for (const tag of tags) bucket.add(tag);
    }
    let tagLinks = 0;
    if (frontmatterTagsByNote.size > 0) {
        const tagsStore = tx.objectStore('tags');
        const noteTagsStore = tx.objectStore('note_tags');
        const tagIdByLabel = new Map((await tagsStore.getAll()).map(tag => [tag.label, tag.id]));
        const linked = new Set((await noteTagsStore.getAll()).map(link => `${link.noteId}:${link.tagId}`));
        for (const [noteId, labels] of frontmatterTagsByNote) {
            for (const label of labels) {
                let tagId = tagIdByLabel.get(label);
                if (!tagId) {
                    tagId = uuidV4();
                    await tagsStore.put({ id: tagId, label, createdAt: now });
                    tagIdByLabel.set(label, tagId);
                }
                if (linked.has(`${noteId}:${tagId}`)) continue;
                await noteTagsStore.put({ id: uuidV4(), noteId, tagId });
                tagLinks++;
            }
        }
    }

    console.info(
        `[IndexedDBService] V12 backfill: ${replayed} results replayed, ${renormalized} re-normalized from stored logs, ` +
        `${withoutLogs} without logs, ${factRows} fact rows written, ${tagLinks} frontmatter tag links added`,
    );
}

/**
 * V13 backfill — expands the analytics store to include ALL atomic metrics.
 *
 * V12 only persisted summary facts (Tier 2, grain 'summary'). V13 re-derives
 * every result's logs through `normalizeAllMetrics()`, which additionally
 * emits atomic segment metrics (Tier 0/1, grain 'segment') — reps, resistance,
 * elapsed time, etc. — alongside the existing summary facts.
 *
 * This does NOT replay logs (V12 already did that if upgrading from < 12);
 * it reads whatever logs are in the store and re-normalizes with the expanded
 * function. The new `by-value` compound index makes threshold queries
 * (`value > 5000`) executable as native IDBKeyRange scans.
 */
export async function backfillV13(tx: V10Tx): Promise<void> {
    const resultsStore = tx.objectStore('results');
    const analyticsStore = tx.objectStore('analytics');

    const results = await resultsStore.getAll();
    await analyticsStore.clear();

    let factRows = 0;
    let resultsWithLogs = 0;
    let withoutLogs = 0;

    for (const result of results) {
        const logs = result.data?.logs ?? [];
        if (logs.length === 0) {
            withoutLogs++;
            continue;
        }
        resultsWithLogs++;

        const identity = {
            noteId: result.noteId,
            resultId: result.id,
            segmentId: result.segmentId,
            segmentVersion: result.segmentVersion,
            blockContentId: result.blockContentId,
            origin: result.origin,
            pageId: result.pageId,
            workoutTimestamp: result.createdAt,
        };

        const points = normalizeAllMetrics(logs, identity);
        for (const point of points) {
            await analyticsStore.put(point);
        }
        factRows += points.length;
    }

    console.info(
        `[IndexedDBService] V13 backfill: ${resultsWithLogs} results re-normalized, ` +
        `${withoutLogs} without logs, ${factRows} fact rows written (summary + segment)`,
    );
}

/**
 * V14 backfill — builds the block_index derived store from segments.
 *
 * Reads all non-history NoteSegment rows, projects them into BlockIndexRow
 * objects with the parent note's title, and writes them to the block_index
 * store. The store is disposable: clear + rebuild on every upgrade from < 14.
 */
export async function backfillV14(tx: V10Tx): Promise<void> {
    const segmentsStore = tx.objectStore('segments');
    const notesStore = tx.objectStore('notes');
    const blockIndexStore = tx.objectStore('block_index');

    await blockIndexStore.clear();

    // Build noteId → title map for denormalization.
    const notes = await notesStore.getAll();
    const noteTitles = new Map<string, string>();
    for (const note of notes) {
        noteTitles.set(note.id, note.title);
    }

    const allSegments = await segmentsStore.getAll();
    let rows = 0;
    let skipped = 0;

    for (const segment of allSegments) {
        if (segment.isHistory) {
            skipped++;
            continue;
        }

        // Extract blockContentId from wod segment data.
        const blockContentId = segment.data?.contentId ?? undefined;

        const row: BlockIndexRow = {
            id: `${segment.noteId}:${segment.id}:${segment.version}`,
            noteId: segment.noteId,
            segmentId: segment.id,
            segmentVersion: segment.version,
            position: segment.position,
            dataType: segment.dataType,
            blockContentId,
            rawContent: segment.rawContent,
            noteTitle: noteTitles.get(segment.noteId) ?? '',
            createdAt: segment.createdAt,
        };
        await blockIndexStore.put(row);
        rows++;
    }

    console.info(
        `[IndexedDBService] V14 backfill: ${rows} block_index rows written, ${skipped} history segments skipped`,
    );
}

/** Legacy fence tags cut over to ```time by V15 (#893, part of #887). */
const LEGACY_FENCE_RE = /(`{3,})[ \t]*(wod|plan|whiteboard)(?!\w)/g;

/**
 * Rewrite legacy fence tags (```wod / ```plan / ```whiteboard) to ```time in
 * raw markdown text. Pure — no DB access. Four-backtick fences and
 * trailing-whitespace variants are preserved; the word "wod" outside a fence
 * tag is untouched.
 */
export function rewriteLegacyFences(text: string): string {
    return text.replace(LEGACY_FENCE_RE, '$1time');
}

/** Stored ScriptBlock dialects cut over to 'time' by V15 (pre-cutover
 *  FenceDialect was 'wod'|'log'|'plan'). */
const LEGACY_BLOCK_DIALECTS = new Set(['wod', 'plan']);

/**
 * V15 backfill — one-time fence-tag cutover in stored content (#893).
 *
 * Rewrites legacy fence tags in every segment's rawContent (history versions
 * included — no read alias remains, so any surfaced row must carry the new
 * tag), migrates persisted ScriptBlock payloads (`data.dialect` 'wod'/'plan'
 * → 'time' — the load path re-synthesizes the fence from this field), then
 * rebuilds the block_index derived store from the rewritten segments. The
 * `wod` SegmentDataType is deliberately untouched — the provider boundary
 * maps it at load (#888).
 */
export async function backfillV15(tx: V10Tx): Promise<void> {
    const segmentsStore = tx.objectStore('segments');
    const allSegments = await segmentsStore.getAll();
    let rewritten = 0;

    for (const segment of allSegments) {
        let next = segment;
        if (typeof next.rawContent === 'string') {
            const raw = rewriteLegacyFences(next.rawContent);
            if (raw !== next.rawContent) next = { ...next, rawContent: raw };
        }
        const block = next.data as ScriptBlock | null;
        const dialect = block?.dialect as string | undefined;
        if (block && dialect && LEGACY_BLOCK_DIALECTS.has(dialect)) {
            next = { ...next, data: { ...block, dialect: 'time' } };
        }
        if (next !== segment) {
            await segmentsStore.put(next);
            rewritten++;
        }
    }

    // block_index rows carry denormalized rawContent — rebuild from the
    // rewritten segments (store is disposable by design, see backfillV14).
    await backfillV14(tx);

    console.info(
        `[IndexedDBService] V15 backfill: ${rewritten}/${allSegments.length} segment rows rewritten to \`\`\`time fences`,
    );
}
/**
 * V16 backfill — unified event store (tickets 002–004). Runs inside the
 * upgrade transaction when 0 < oldVersion < 16.
 *
 * Doctrine (V10/V12/V13): logs win; fact rows were a disposable index. The
 * old `analytics` rows are NEVER copied — event rows are re-derived 1:1
 * from `results.data.logs` (engine `toEventRows`), summary rows re-derived
 * once via `toSummaryEventRows` (deterministic content keys; legacy
 * name-derived keys re-resolved, not carried forward). Segment/rollup-grain
 * fact rows die with the old store.
 *
 * Replay seam (V12 doctrine verbatim): results whose Tier-2 logs predate the
 * summary processors are replayed headlessly so re-derived rows carry effort
 * metadata; failure falls back to the stored logs, then to skipping the
 * result — logs remain untouched either way.
 *
 * `deleteObjectStore('analytics')` runs in the upgrade callback after this
 * returns. The versionchange tx is atomic — a crash aborts everything and
 * the next open retries from scratch.
 *
 * Exported for integration tests; production callers should only ever be the
 * upgrade callback below.
 */
export async function backfillV16(tx: V10Tx): Promise<void> {
    const resultsStore = tx.objectStore('results');
    const segmentsStore = tx.objectStore('segments');
    const eventsStore = tx.objectStore('events');

    const results = await resultsStore.getAll();
    const allSegments = await segmentsStore.getAll();

    // Segment lookup mirrors backfillV12: pinned incarnation first, latest
    // version as fallback for rows recorded before segmentVersion was stamped.
    const segmentByKey = new Map<string, NoteSegment>();
    const latestSegmentById = new Map<string, NoteSegment>();
    for (const segment of allSegments) {
        segmentByKey.set(`${segment.id}:${segment.version}`, segment);
        const current = latestSegmentById.get(segment.id);
        if (!current || segment.version > current.version) latestSegmentById.set(segment.id, segment);
    }

    let replayed = 0;
    let fromStoredLogs = 0;
    let withoutLogs = 0;
    let eventRows = 0;
    let summaryRows = 0;
    for (const result of results) {
        const storedLogs = result.data?.logs ?? [];
        if (storedLogs.length === 0) {
            withoutLogs++;
            continue;
        }
        const identity = {
            noteId: result.noteId,
            resultId: result.id,
            segmentId: result.segmentId,
            segmentVersion: result.segmentVersion,
            blockContentId: result.blockContentId,
            origin: result.origin,
            pageId: result.pageId,
            workoutTimestamp: result.createdAt,
        };

        let logs = storedLogs;
        try {
            const segment = result.segmentId
                ? (result.segmentVersion != null
                    ? segmentByKey.get(`${result.segmentId}:${result.segmentVersion}`)
                    : undefined) ?? latestSegmentById.get(result.segmentId)
                : undefined;
            const scriptBlock = segment?.data as ScriptBlock | null | undefined;
            if (!scriptBlock) throw new Error('no recoverable segment context');
            const block = scriptBlock.statements?.length
                ? scriptBlock
                : { ...scriptBlock, statements: createParser().read(scriptBlock.content, scriptBlock.sport).statements };
            logs = replayResultAnalytics(result, block);
            if (logs !== storedLogs) {
                await resultsStore.put({ ...result, data: { ...result.data, logs } });
            }
            replayed++;
        } catch (err) {
            console.warn(`[IndexedDBService] V16 replay failed for result ${result.id}; deriving from stored logs`, err);
            fromStoredLogs++;
        }

        const events = toEventRows(logs, identity);
        const summaries = toSummaryEventRows(logs, identity);
        for (const row of events) await eventsStore.put(row);
        for (const row of summaries) await eventsStore.put(row);
        eventRows += events.length;
        summaryRows += summaries.length;
    }

    console.info(
        `[IndexedDBService] V16 backfill: ${replayed} results replayed, ${fromStoredLogs} derived from stored logs, ` +
        `${withoutLogs} without logs, ${eventRows} event rows + ${summaryRows} summary rows written`,
    );
}

export class IndexedDBService {
    private _dbPromise: Promise<IDBPDatabase<WodWikiDB>> | null = null;

    /**
     * Lazily-opened connection. Deferred to first use so a hostile environment
     * (locked-down webview / disabled storage) can never throw at module scope
     * when the singleton is constructed, white-screening the app before React
     * mounts — callers awaiting a method get a rejected promise they can
     * handle instead. (#703)
     *
     * Self-healing: a rejected or force-closed open is uncached so the next
     * access retries. This is what keeps a cross-tab schema upgrade from
     * becoming a permanent hang — see `blocking` in {@link open}.
     */
    private get dbPromise(): Promise<IDBPDatabase<WodWikiDB>> {
        if (!this._dbPromise) {
            const opening = this.open();
            this._dbPromise = opening;
            // On failure, uncache so the next access retries the open rather
            // than replaying a dead rejection forever.
            opening.catch(() => {
                if (this._dbPromise === opening) this._dbPromise = null;
            });
        }
        return this._dbPromise;
    }

    private open(): Promise<IDBPDatabase<WodWikiDB>> {
        if (typeof indexedDB === 'undefined') {
            return Promise.reject(
                new Error('IndexedDB is unavailable in this environment'),
            );
        }
        const opening = openDB<WodWikiDB>(DB_NAME, DB_VERSION, {
            async upgrade(db, oldVersion, _newVersion, tx) {
                // -------------------------------------------------------
                // Fresh-start strategy: drop everything below V4
                // -------------------------------------------------------
                if (oldVersion < 4) {
                    const names = Array.from(db.objectStoreNames);
                    for (const name of names) {
                        db.deleteObjectStore(name);
                    }
                }

                // ---- Notes ----
                if (!db.objectStoreNames.contains('notes')) {
                    const store = db.createObjectStore('notes', { keyPath: 'id' });
                    store.createIndex('by-slug', 'slug', { unique: true });
                } else {
                    // V8 — add by-slug (idempotent)
                    const notesStore = tx.objectStore('notes');
                    if (!notesStore.indexNames.contains('by-slug')) {
                        notesStore.createIndex('by-slug', 'slug', { unique: true });
                    }
                }

                // ---- Segments ----
                if (!db.objectStoreNames.contains('segments')) {
                    const store = db.createObjectStore('segments', { keyPath: ['id', 'version'] });
                    store.createIndex('by-note', 'noteId');
                    store.createIndex('by-type', 'dataType');
                }

                // ---- Results ----
                if (!db.objectStoreNames.contains('results')) {
                    const store = db.createObjectStore('results', { keyPath: 'id' });
                    store.createIndex('by-segment', 'segmentId');
                    store.createIndex('by-note', 'noteId');
                    store.createIndex('by-completed', 'createdAt');
                }
                {
                    // V6 — by-content + by-block, idempotent for BOTH fresh
                    // creation and upgrades (the create branch above must not
                    // skip these, or fresh installs never get them).
                    const results = tx.objectStore('results');
                    if (!results.indexNames.contains('by-content')) {
                        results.createIndex('by-content', 'blockContentId');
                    }
                    if (!results.indexNames.contains('by-block')) {
                        results.createIndex('by-block', 'blockId');
                    }
                }

                // ---- Attachments ----
                if (!db.objectStoreNames.contains('attachments')) {
                    const store = db.createObjectStore('attachments', { keyPath: 'id' });
                    store.createIndex('by-note', 'noteId');
                    store.createIndex('by-time', 'createdAt');
                }

                // ---- Analytics (LEGACY — V16 deletes this store; created only
                // so the V10–V13 upgrade backfills have somewhere to write on
                // the way up. Never created for V16+ installs.) ----
                if (oldVersion < 16 && !db.objectStoreNames.contains('analytics')) {
                    const store = db.createObjectStore('analytics', { keyPath: 'id' });
                    store.createIndex('by-type', 'metricType');
                    store.createIndex('by-segment', 'segmentId');
                    store.createIndex('by-result', 'resultId');
                }
                if (db.objectStoreNames.contains('analytics')) {
                    // V6 — by-content, idempotent for fresh creation AND upgrades.
                    const analytics = tx.objectStore('analytics');
                    if (!analytics.indexNames.contains('by-content')) {
                        analytics.createIndex('by-content', 'blockContentId');
                    }
                }

                // ---- Events (V16 — unified event store) ----
                if (!db.objectStoreNames.contains('events')) {
                    const store = db.createObjectStore('events', { keyPath: 'id' });
                    store.createIndex('by-timestamp', 'timestamp');
                    store.createIndex('by-result-grain', ['resultId', 'grain']);
                    store.createIndex('by-content-grain', ['blockContentId', 'grain']);
                    store.createIndex('by-effort', 'effortSlug');
                    store.createIndex('by-outputType', 'outputType');
                    store.createIndex('by-grain', 'grain');
                }

                // ---- Efforts ----
                if (!db.objectStoreNames.contains('efforts')) {
                    const store = db.createObjectStore('efforts', { keyPath: 'slug' });
                    store.createIndex('by-discipline', 'baseAttributes.discipline');
                    store.createIndex('by-source', 'registrySource');
                }

                // ---- Block Index (V14 — derived store for find:block queries) ----
                if (!db.objectStoreNames.contains('block_index')) {
                    const store = db.createObjectStore('block_index', { keyPath: 'id' });
                    store.createIndex('by-note', 'noteId');
                    store.createIndex('by-content', 'blockContentId');
                    store.createIndex('by-type', 'dataType');
                }

                // ---- Page / Tags / NoteTags (V10 — additive) ----
                if (!db.objectStoreNames.contains('page')) {
                    const store = db.createObjectStore('page', { keyPath: 'id' });
                    store.createIndex('by-date', 'date', { unique: true });
                    store.createIndex('by-slug', 'slug', { unique: true });
                }
                if (!db.objectStoreNames.contains('tags')) {
                    const store = db.createObjectStore('tags', { keyPath: 'id' });
                    store.createIndex('by-label', 'label', { unique: true });
                    store.createIndex('by-type', 'type');
                }
                if (!db.objectStoreNames.contains('note_tags')) {
                    const store = db.createObjectStore('note_tags', { keyPath: 'id' });
                    store.createIndex('by-note', 'noteId');
                    store.createIndex('by-tag', 'tagId');
                }

                // ---- V10 indexes on existing stores (idempotent) ----
                const ensureIndex = <S extends 'notes' | 'segments' | 'results' | 'attachments' | 'analytics'>(
                    storeName: S,
                    indexName: IndexNames<WodWikiDB, S>,
                    keyPath: string | string[],
                ) => {
                    const store = tx.objectStore(storeName);
                    if (!store.indexNames.contains(indexName)) {
                        store.createIndex(indexName, keyPath);
                    }
                };
                ensureIndex('notes', 'by-page', 'pageId');
                ensureIndex('segments', 'by-page', 'pageId');
                ensureIndex('segments', 'by-history', 'isHistory');
                ensureIndex('results', 'by-page', 'pageId');
                ensureIndex('results', 'by-origin', 'origin');
                ensureIndex('attachments', 'by-page', 'pageId');
                ensureIndex('attachments', 'by-result', 'resultId');
                // Legacy analytics indexes — only while the store still exists
                // (pre-V16 upgrade paths); V16 deletes the store below.
                if (db.objectStoreNames.contains('analytics')) {
                    ensureIndex('analytics', 'by-page', 'pageId');
                    ensureIndex('analytics', 'by-origin', 'origin');
                    ensureIndex('analytics', 'by-metric', 'metricKey');
                    ensureIndex('analytics', 'by-effort', 'effortSlug');
                    ensureIndex('analytics', 'by-grain', 'grain');
                    ensureIndex('analytics', 'by-discipline', 'discipline');
                    // V12 — canonical workout time range scans.
                    ensureIndex('analytics', 'by-timestamp', 'timestamp');
                    // V13 — compound [type, value] for IDBKeyRange threshold scans.
                    ensureIndex('analytics', 'by-value', ['type', 'value']);
                }

                // ---- V10 backfills (upgrade from < 10 only) ----
                if (oldVersion < 10) {
                    await backfillV10(tx);
                }

                // ---- V11 (destructive) ----
                if (oldVersion < 11) {
                    // R-07 — rebuild by-completed on the renamed field.
                    const resultsStore = tx.objectStore('results');
                    if (resultsStore.indexNames.contains('by-completed')) {
                        resultsStore.deleteIndex('by-completed');
                    }
                    resultsStore.createIndex('by-completed', 'createdAt');
                    // N-08/N-09 — drop the retired note indexes. Loosened
                    // store type: the legacy names are intentionally absent
                    // from the V11 schema union.
                    const legacyNotesStore = tx.objectStore('notes') as unknown as {
                        indexNames: DOMStringList;
                        deleteIndex(name: string): void;
                    };
                    if (legacyNotesStore.indexNames.contains('by-updated')) {
                        legacyNotesStore.deleteIndex('by-updated');
                    }
                    if (legacyNotesStore.indexNames.contains('by-target-date')) {
                        legacyNotesStore.deleteIndex('by-target-date');
                    }
                    await backfillV11(tx);
                }

                // ---- V12: re-derive facts + sweep frontmatter tags ----
                if (oldVersion > 0 && oldVersion < 12) {
                    await backfillV12(tx);
                }
                // ---- V13: expand analytics to atomic metrics + by-value index ----
                if (oldVersion > 0 && oldVersion < 13) {
                    await backfillV13(tx);
                }
                // ---- V14: build block index from segments ----
                if (oldVersion > 0 && oldVersion < 14) {
                    await backfillV14(tx);
                }
                // ---- V15: fence-tag cutover in stored segments (#893) ----
                if (oldVersion > 0 && oldVersion < 15) {
                    await backfillV15(tx);
                }
                // ---- V16: unified event store — re-derive from logs, drop analytics ----
                if (oldVersion > 0 && oldVersion < 16) {
                    await backfillV16(tx);
                }
                if (db.objectStoreNames.contains('analytics')) {
                    db.deleteObjectStore('analytics');
                }
            },
            // Another tab is waiting on a schema upgrade this connection
            // blocks. Surface it — without a `blocked` handler this is
            // indistinguishable from a slow open and pages spin "Loading…"
            // forever.
            blocked: (currentVersion, blockedVersion) => {
                console.warn(
                    `[IndexedDBService] open of ${DB_NAME} v${blockedVersion ?? DB_VERSION} blocked by a v${currentVersion} connection in another tab`,
                );
            },
            // Another tab requested a NEWER schema. Yield: close this
            // connection so the upgrade is not deadlocked behind us, then
            // uncache so the next access reopens against the migrated DB.
            blocking: (currentVersion, blockedVersion) => {
                console.warn(
                    `[IndexedDBService] yielding ${DB_NAME} v${currentVersion} connection to a v${blockedVersion} upgrade from another tab`,
                );
                opening.then((db) => db.close()).catch(() => {});
                if (this._dbPromise === opening) this._dbPromise = null;
            },
            // The browser force-closed the connection (e.g. another tab wiped
            // the DB). Uncache so the next access reopens instead of throwing
            // InvalidStateError on a dead handle forever.
            terminated: () => {
                console.warn(`[IndexedDBService] ${DB_NAME} connection terminated`);
                if (this._dbPromise === opening) this._dbPromise = null;
            },
        });
        opening.then(
          () => {
            console.info(`[IndexedDBService] ${DB_NAME} v${DB_VERSION} open`);
            // Daily GC (ticket 005): sweep in-progress results older than 30
            // days. Fire-and-forget — GC failure must never block the open.
            const GC_KEY = 'wodwiki.gc.inProgress.lastRun';
            const today = new Date().toISOString().slice(0, 10);
            if (typeof localStorage !== 'undefined' && localStorage.getItem(GC_KEY) !== today) {
                localStorage.setItem(GC_KEY, today);
                this.sweepStaleInProgressResults().catch((err) =>
                    console.warn('[IndexedDBService] in-progress GC failed', err),
                );
            }
          },
          (err) => console.warn(`[IndexedDBService] ${DB_NAME} open failed`, err),
        );
        return opening;
    }

    async getDB() {
        return this.dbPromise;
    }

    /**
     * Close the underlying connection. Must run before {@link wipe}: an open
     * connection blocks `indexedDB.deleteDatabase` (it fires `blocked` and
     * never completes until every connection closes). Safe to call when the
     * connection never opened (openDB rejected) — the await is guarded.
     */
    async close(): Promise<void> {
        try {
            const db = await this.dbPromise;
            db.close();
        } catch {
            // openDB rejected (e.g. blocked upgrade) — no live connection.
        } finally {
            // Uncache so the next access reopens instead of throwing
            // InvalidStateError on the closed handle.
            this._dbPromise = null;
        }
    }

    /**
     * Delete the entire `wodwiki-db` database so the next open recreates it
     * with a fresh schema. Closes this singleton's connection first so the
     * delete request is not blocked, then issues `deleteDatabase`.
     *
     * Used by the "Reset & Clear Cache" action to wipe every object store
     * (notes, segments, results, attachments, events, efforts, page, tags,
     * note_tags) in one shot rather than clearing stores piecemeal.
     *
     * After this resolves the singleton's cached connection is closed and the
     * database no longer exists — a full page load (which re-runs the
     * constructor's `openDB` and the `upgrade` callback from version 0) is the
     * expected recovery path.
     *
     * Rejects on `onerror`/`onblocked`; with a single connection that we just
     * closed, neither should fire, so a rejection is a real signal the caller
     * should surface rather than swallow silently.
     */
    async wipe(): Promise<void> {
        await this.close();
        const { promise, resolve, reject } = Promise.withResolvers<void>();
        const req = indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error ?? new Error(`Failed to delete database ${DB_NAME}`));
        req.onblocked = () => reject(new Error(`deleteDatabase(${DB_NAME}) blocked — an open connection remains`));
        await promise;
    }

    // =======================================================================
    // Notes
    // =======================================================================

    async getNote(id: string): Promise<Note | undefined> {
        return (await this.dbPromise).get('notes', id);
    }

    async getAllNotes(): Promise<Note[]> {
        // V11 — by-target-date index dropped; callers sort client-side.
        return (await this.dbPromise).getAll('notes');
    }

    async saveNote(note: Note): Promise<string> {
        return (await this.dbPromise).put('notes', note);
    }

    // ======================================================================
    // Page (V10)
    // ======================================================================

    async getPage(id: string): Promise<Page | undefined> {
        return (await this.dbPromise).get('page', id);
    }

    async getPageBySlug(slug: string): Promise<Page | undefined> {
        return (await this.dbPromise).getFromIndex('page', 'by-slug', slug);
    }

    async getPageByDate(date: string): Promise<Page | undefined> {
        return (await this.dbPromise).getFromIndex('page', 'by-date', date);
    }

    async savePage(page: Page): Promise<string> {
        return (await this.dbPromise).put('page', page);
    }

    /** Resolve the calendar page for a journal date, creating it on first use. */
    async getOrCreatePageForDate(date: string): Promise<Page> {
        const existing = await this.getPageByDate(date);
        if (existing) return existing;
        const page: Page = { id: uuidV4(), date, title: date, createdAt: Date.now() };
        try {
            await this.savePage(page);
            return page;
        } catch (err) {
            // Concurrent creation for the same date — the other writer won the
            // race against the unique by-date index; use their row.
            if (err instanceof DOMException && err.name === 'ConstraintError') {
                const winner = await this.getPageByDate(date);
                if (winner) return winner;
            }
            throw err;
        }
    }

    async getNotesForPage(pageId: string): Promise<Note[]> {
        return (await this.dbPromise).getAllFromIndex('notes', 'by-page', pageId);
    }

    async getResultsForPage(pageId: string): Promise<WorkoutResult[]> {
        return (await this.dbPromise).getAllFromIndex('results', 'by-page', pageId);
    }

    // =======================================================================
    // Events (V16 — unified event store; implements the engine's
    // UnifiedEventStore contract, tickets 003/005)
    // =======================================================================

    /** Windowed fetch — the one proven culling index (ticket 001/003). */
    async getEventsByTimeRange(start: number, end: number): Promise<UnifiedEventRecord[]> {
        return (await this.dbPromise).getAllFromIndex('events', 'by-timestamp', IDBKeyRange.bound(start, end));
    }

    /** Per-result fetch (rows:{result:…}, re-finalize, orphan inspection). */
    async getEventsByResult(resultId: string): Promise<UnifiedEventRecord[]> {
        return (await this.dbPromise).getAllFromIndex(
            'events', 'by-result-grain', IDBKeyRange.bound([resultId, ''], [resultId, []]),
        );
    }

    /** Note-scoped fetch (rows:{note:…}) — join through the results store;
     *  the events schema has no by-note index (ticket 002: six indexes only). */
    async getEventsForNote(noteId: string): Promise<UnifiedEventRecord[]> {
        const resultIds = (await this.getResultsForNote(noteId)).map((r) => r.id);
        // Wellness rows live under the synthetic per-note resultId (ticket 005).
        resultIds.push(`wellness:${noteId}`);
        const batches = await Promise.all(resultIds.map((id) => this.getEventsByResult(id)));
        return batches.flat();
    }

    /** Content-scoped fetch — the cross-store join hot path (indexed). */
    async getEventsByContent(blockContentId: string): Promise<UnifiedEventRecord[]> {
        return (await this.dbPromise).getAllFromIndex(
            'events', 'by-content-grain', IDBKeyRange.bound([blockContentId, ''], [blockContentId, []]),
        );
    }

    /** Full scan — all-time SELECT leg (ticket 001: scan beats non-selective indexes). */
    async scanAll(): Promise<UnifiedEventRecord[]> {
        return (await this.dbPromise).getAll('events');
    }

    /** Append event rows (per-statement flush; wellness reconcile upserts). */
    async appendEvents(rows: UnifiedEventRecord[]): Promise<void> {
        if (rows.length === 0) return;
        const db = await this.dbPromise;
        const tx = db.transaction('events', 'readwrite');
        for (const row of rows) {
            await tx.store.put(row);
        }
        await tx.done;
    }

    /**
     * Atomic finalize (tickets 002/005): clear the result's ENGINE-AUTHORED
     * summaries and write the finals in one transaction. User-authored rows
     * (origin 'user' — wellness) are reconcile-owned and survive; matches the
     * engine's inMemoryEventStore semantics. Deterministic summary ids make
     * re-finalize idempotent.
     */
    async finalizeSummaries(resultId: string, rows: UnifiedEventRecord[]): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction('events', 'readwrite');
        const index = tx.store.index('by-result-grain');
        for await (const cursor of index.iterate(IDBKeyRange.only([resultId, 'summary']))) {
            if (cursor.value.origin !== 'user') {
                await cursor.delete();
            }
        }
        for (const row of rows) {
            await tx.store.put(row);
        }
        await tx.done;
    }

    /** Reconcile deletes (wellness note-save) + GC sweeps. */
    async deleteEvents(ids: string[]): Promise<void> {
        if (ids.length === 0) return;
        const db = await this.dbPromise;
        const tx = db.transaction('events', 'readwrite');
        for (const id of ids) {
            await tx.store.delete(id);
        }
        await tx.done;
    }

    /** Delete every event row of one result (note-delete cascade). */
    private async deleteEventsForResultTx(
        tx: IDBPTransaction<WodWikiDB, StoreNames<WodWikiDB>[], 'readwrite'>,
        resultId: string,
    ): Promise<void> {
        const index = tx.objectStore('events').index('by-result-grain');
        for await (const cursor of index.iterate(IDBKeyRange.bound([resultId, ''], [resultId, []]))) {
            await cursor.delete();
        }
    }

    /**
     * GC (ticket 005, decision 5): sweep in-progress results older than 30
     * days — crash orphans from the streaming write path — together with
     * their event rows. Completed results are never touched.
     */
    async sweepStaleInProgressResults(now: number = Date.now()): Promise<number> {
        const cutoff = now - 30 * 86_400_000;
        const db = await this.dbPromise;
        const tx = db.transaction(['results', 'events'], 'readwrite');
        let swept = 0;
        for await (const cursor of tx.objectStore('results')) {
            const result = cursor.value;
            if (result.status === 'in-progress' && result.createdAt < cutoff) {
                await this.deleteEventsForResultTx(tx, result.id);
                await cursor.delete();
                swept++;
            }
        }
        await tx.done;
        if (swept > 0) {
            console.info(`[IndexedDBService] GC: swept ${swept} stale in-progress result(s)`);
        }
        return swept;
    }

    // ======================================================================
    // Tags (V11 — note.tags[] replaced by tags + note_tags)
    // ======================================================================

    async getTag(id: string): Promise<Tag | undefined> {
        return (await this.dbPromise).get('tags', id);
    }

    async getTagByLabel(label: string): Promise<Tag | undefined> {
        return (await this.dbPromise).getFromIndex('tags', 'by-label', label);
    }

    /** Resolve a tag by label, creating it on first use (race-tolerant). */
    async getOrCreateTag(label: string, type?: Tag['type']): Promise<Tag> {
        const existing = await this.getTagByLabel(label);
        if (existing) return existing;
        const tag: Tag = { id: uuidV4(), label, type, createdAt: Date.now() };
        try {
            await (await this.dbPromise).put('tags', tag);
            return tag;
        } catch (err) {
            if (err instanceof DOMException && err.name === 'ConstraintError') {
                const winner = await this.getTagByLabel(label);
                if (winner) return winner;
            }
            throw err;
        }
    }

    async getTagsForNote(noteId: string): Promise<Tag[]> {
        const db = await this.dbPromise;
        const links = await db.getAllFromIndex('note_tags', 'by-note', noteId);
        const tags = await Promise.all(links.map(link => db.get('tags', link.tagId)));
        return tags.filter((tag): tag is Tag => tag !== undefined);
    }

    /** Every tag label in the store — the user-created typeahead vocabulary. */
    async getAllTags(): Promise<Tag[]> {
        return (await this.dbPromise).getAll('tags');
    }

    /** Resolve every note tagged with a given label. */
    async getNotesForTag(label: string): Promise<Note[]> {
        const db = await this.dbPromise;
        const tag = await db.getFromIndex('tags', 'by-label', label);
        if (!tag) return [];
        const links = await db.getAllFromIndex('note_tags', 'by-tag', tag.id);
        const noteIds = [...new Set(links.map(link => link.noteId))];
        const notes = await Promise.all(noteIds.map(noteId => db.get('notes', noteId)));
        return notes.filter((note): note is Note => note !== undefined);
    }

    async deleteTag(id: string): Promise<void> {
        await (await this.dbPromise).delete('tags', id);
    }

    /** Replace a note's tag set (labels are shared, deduped by by-label). */
    async setNoteTags(noteId: string, labels: string[]): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['note_tags', 'tags'], 'readwrite');
        const tagsStore = tx.objectStore('tags');
        const linksStore = tx.objectStore('note_tags');
        const byNote = linksStore.index('by-note');
        for await (const cursor of byNote.iterate(noteId)) {
            await cursor.delete();
        }
        const now = Date.now();
        for (const label of Array.from(new Set(labels))) {
            let tag = await tagsStore.index('by-label').get(label);
            if (!tag) {
                tag = { id: uuidV4(), label, createdAt: now };
                await tagsStore.put(tag);
            }
            await linksStore.put({ id: uuidV4(), noteId, tagId: tag.id });
        }
        await tx.done;
    }

    async deleteNote(id: string): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(
            ['notes', 'segments', 'results', 'attachments', 'events', 'note_tags'],
            'readwrite',
        );

        await tx.objectStore('notes').delete(id);

        // V11 — drop the note's tag links (shared tags themselves stay).
        const linkIdx = tx.objectStore('note_tags').index('by-note');
        let linkCursor = await linkIdx.openCursor(IDBKeyRange.only(id));
        while (linkCursor) {
            await linkCursor.delete();
            linkCursor = await linkCursor.continue();
        }

        const segIdx = tx.objectStore('segments').index('by-note');
        let segCursor = await segIdx.openCursor(IDBKeyRange.only(id));
        while (segCursor) {
            await segCursor.delete();
            segCursor = await segCursor.continue();
        }

        const resIdx = tx.objectStore('results').index('by-note');
        let resCursor = await resIdx.openCursor(IDBKeyRange.only(id));
        const deletedResultIds: string[] = [];
        while (resCursor) {
            deletedResultIds.push(resCursor.value.id);
            await resCursor.delete();
            resCursor = await resCursor.continue();
        }

        const attIdx = tx.objectStore('attachments').index('by-note');
        let attCursor = await attIdx.openCursor(IDBKeyRange.only(id));
        while (attCursor) {
            await attCursor.delete();
            attCursor = await attCursor.continue();
        }

        const eventsTx = tx as IDBPTransaction<WodWikiDB, StoreNames<WodWikiDB>[], 'readwrite'>;
        for (const resultId of deletedResultIds) {
            await this.deleteEventsForResultTx(eventsTx, resultId);
        }
        // Wellness rows live under the synthetic per-note resultId (ticket 005).
        await this.deleteEventsForResultTx(eventsTx, `wellness:${id}`);
        await tx.done;
    }

    // V8 — resolve a route string (slug) to the note's UUID row.
    async getNoteBySlug(slug: string): Promise<Note | undefined> {
        return (await this.dbPromise).getFromIndex('notes', 'by-slug', slug);
    }

    /**
     * V8 — lazy per-note migration helper. Routes call this instead of `getNote`
     * when they have a slug or possibly-legacy id; if the row is still keyed by
     * a route string (non-UUID), it's re-keyed to a UUID atomically and the
     * migrated row is returned. Idempotent — a UUID row is returned untouched.
     */
    async findOrMigrate(idOrSlug: string): Promise<Note | undefined> {
        const byId = await this.getNote(idOrSlug);
        if (byId) {
            if (!isUuid(byId.id)) {
                const newId = await this.migrateNoteToUuid(byId);
                return this.getNote(newId);
            }
            return byId;
        }
        const bySlug = await this.getNoteBySlug(idOrSlug);
        if (bySlug && !isUuid(bySlug.id)) {
            const newId = await this.migrateNoteToUuid(bySlug);
            return this.getNote(newId);
        }
        return bySlug;
    }

    /**
     * V8 — re-key one legacy note (route-id key) into a UUID row with
     * `slug = old id`, and re-key every `noteId`-indexed dependent.
     * Idempotent (skips UUID rows). The put-new + delete-old contract is the
     * only way to re-key a note in IndexedDB (keyPaths can't be mutated).
     */
    private async migrateNoteToUuid(oldNote: Note): Promise<string> {
        const oldId = oldNote.id;
        const newId = uuidV4();
        const journalDate = oldId.match(/^journal\/(\d{4}-\d{2}-\d{2})$/)?.[1];
        const migrated: Note = {
            ...oldNote,
            id: newId,
            slug: oldId,
            ...(journalDate && { journalDate, type: 'journal' as const, targetDate: new Date(`${journalDate}T00:00:00`).getTime() }),
        };

        const db = await this.dbPromise;
        const tx = db.transaction(['notes', 'segments', 'results', 'attachments', 'events'], 'readwrite');
        const migratedExisting = await tx.objectStore('notes').index('by-slug').get(oldId);
        if (migratedExisting) {
            await tx.done;
            return migratedExisting.id;
        }

        await tx.objectStore('notes').put(migrated);

        // Re-key noteId-keyed dependents via by-note cursors.
        for (const storeName of ['segments', 'results', 'attachments'] as const) {
            const store = tx.objectStore(storeName);
            let cursor = await store.index('by-note').openCursor(IDBKeyRange.only(oldId));
            while (cursor) {
                await cursor.update({ ...cursor.value, noteId: newId });
                cursor = await cursor.continue();
            }
        }

        // Re-key events: no by-note index (six-index schema), so join through results.
        const oldResultIds = new Set<string>();
        let resCursor = await tx.objectStore('results').index('by-note').openCursor(IDBKeyRange.only(oldId));
        while (resCursor) {
            oldResultIds.add(resCursor.value.id);
            resCursor = await resCursor.continue();
        }
        oldResultIds.add(`wellness:${oldId}`); // synthetic wellness resultId (ticket 005)
        for (const resultId of oldResultIds) {
            const idx = tx.objectStore('events').index('by-result-grain');
            let evCursor = await idx.openCursor(IDBKeyRange.bound([resultId, ''], [resultId, []]));
            while (evCursor) {
                const row = evCursor.value;
                await evCursor.delete();
                // Re-key: noteId changes; wellness ids embed the noteId too.
                await tx.objectStore('events').put({
                    ...row,
                    id: row.id.split(`wellness:${oldId}`).join(`wellness:${newId}`),
                    noteId: newId,
                    ...(row.resultId === `wellness:${oldId}` ? { resultId: `wellness:${newId}` } : {}),
                });
                evCursor = await evCursor.continue();
            }
        }
        await tx.objectStore('notes').delete(oldId);
        await tx.done;
        return newId;
    }

    // =======================================================================
    // Segments
    // =======================================================================

    async saveSegment(segment: NoteSegment): Promise<[string, number]> {
        return (await this.dbPromise).put('segments', segment);
    }

    /** Compound-key read: the exact segment incarnation recorded for a result. */
    async getSegment(segmentId: string, version: number): Promise<NoteSegment | undefined> {
        return (await this.dbPromise).get('segments', [segmentId, version]);
    }

    async getLatestSegmentVersion(segmentId: string): Promise<NoteSegment | undefined> {
        const db = await this.dbPromise;
        const tx = db.transaction('segments', 'readonly');
        const store = tx.objectStore('segments');        const range = IDBKeyRange.bound([segmentId, 0], [segmentId, Number.MAX_SAFE_INTEGER]);
        const cursor = await store.openCursor(range, 'prev');
        return cursor?.value;
    }

    /** Full segments scan — batched list-view reconstruction (V11). */
    async getAllSegments(): Promise<NoteSegment[]> {
        return (await this.dbPromise).getAll('segments');
    }

    /**
     * Latest version of every segment of a note, in document order (V11).
     * Live rows only by default — retired (`isHistory`) incarnations are
     * excluded so reconstruction never joins superseded content into the
     * document. `updateEntry` passes `includeHistory` to see the full
     * lineage (resurrect / retire-sweep semantics).
     */
    async getLatestSegmentsForNote(noteId: string, opts?: { includeHistory?: boolean }): Promise<NoteSegment[]> {
        const rows = await (await this.dbPromise).getAllFromIndex('segments', 'by-note', noteId);
        const latest = new Map<string, NoteSegment>();
        for (const segment of rows) {
            const current = latest.get(segment.id);
            if (!current || segment.version > current.version) latest.set(segment.id, segment);
        }
        return [...latest.values()]
            .filter((segment) => opts?.includeHistory || !segment.isHistory)
            .sort(
                (a, b) => (a.position ?? a.createdAt) - (b.position ?? b.createdAt),
            );
    }

    // ======================================================================
    // Results
    // ======================================================================

    async saveResult(result: WorkoutResult): Promise<string> {
        return (await this.dbPromise).put('results', result);
    }

    async getResultsForNote(noteId: string): Promise<WorkoutResult[]> {
        return (await this.dbPromise).getAllFromIndex('results', 'by-note', noteId);
    }

    async getResultsForSection(noteId: string, sectionId: string): Promise<WorkoutResult[]> {
        const noteResults = await this.getResultsForNote(noteId);
        return noteResults.filter(r => r.blockContentId === sectionId);
    }

    async getResultById(resultId: string): Promise<WorkoutResult | undefined> {
        return (await this.dbPromise).get('results', resultId);
    }

    async getRecentResults(limit = 20): Promise<WorkoutResult[]> {
        const db = await this.dbPromise;
        const tx = db.transaction('results', 'readonly');
        const idx = tx.objectStore('results').index('by-completed');
        const results: WorkoutResult[] = [];
        let cursor = await idx.openCursor(null, 'prev');
        while (cursor && results.length < limit) {
            results.push(cursor.value);
            cursor = await cursor.continue();
        }
        return results;
    }

    /** V6 — cross-note collection aggregation. */
    async getResultsByContentId(blockContentId: string): Promise<WorkoutResult[]> {
        return (await this.dbPromise).getAllFromIndex('results', 'by-content', blockContentId);
    }

    /** V6 — per-clone journal history. */
    async getResultsForBlock(blockId: string): Promise<WorkoutResult[]> {
        return (await this.dbPromise).getAllFromIndex('results', 'by-block', blockId);
    }

    // =======================================================================
    // Attachments
    // =======================================================================

    async saveAttachment(attachment: Attachment): Promise<string> {
        return (await this.dbPromise).put('attachments', attachment);
    }

    async getAttachmentsForNote(noteId: string): Promise<Attachment[]> {
        return (await this.dbPromise).getAllFromIndex('attachments', 'by-note', noteId);
    }

    async deleteAttachment(id: string): Promise<void> {
        return (await this.dbPromise).delete('attachments', id);
    }

    // =======================================================================
    // Efforts
    // =======================================================================

    async getEffort(slug: string): Promise<IEffort | undefined> {
        return (await this.dbPromise).get('efforts', slug);
    }

    async getAllEfforts(): Promise<IEffort[]> {
        return (await this.dbPromise).getAll('efforts');
    }

    async saveEffort(effort: IEffort): Promise<string> {
        return (await this.dbPromise).put('efforts', effort);
    }

    async deleteEffort(slug: string): Promise<void> {
        return (await this.dbPromise).delete('efforts', slug);
    }

    // ── Block Index (V14) ──────────────────────────────────────────

    /** Rebuild block_index rows for a single note from its latest segments.
     *  Called after segment writes in the content provider. */
    async rebuildBlockIndexForNote(noteId: string): Promise<void> {
        const db = await this.dbPromise;

        // Fetch all required data BEFORE opening the write transaction,
        // to avoid IDB auto-commit (TransactionInactiveError) on yield.
        const existing = await db.getAllFromIndex('block_index', 'by-note', noteId);
        const note = await db.get('notes', noteId);
        const noteTitle = note?.title ?? '';
        const segments = await this.getLatestSegmentsForNote(noteId);

        const tx = db.transaction('block_index', 'readwrite');
        for (const row of existing) {
            await tx.store.delete(row.id);
        }

        for (const segment of segments) {
            if (segment.isHistory) continue;
            const blockContentId = segment.data?.contentId ?? undefined;
            await tx.store.put({
                id: `${noteId}:${segment.id}:${segment.version}`,
                noteId,
                segmentId: segment.id,
                segmentVersion: segment.version,
                position: segment.position,
                dataType: segment.dataType,
                blockContentId,
                rawContent: segment.rawContent,
                noteTitle,
                createdAt: segment.createdAt,
            });
        }
        await tx.done;
    }

    /** Load all block_index rows (for naive in-memory find:block queries). */
    async getAllBlockIndex(): Promise<BlockIndexRow[]> {
        return (await this.dbPromise).getAll('block_index');
    }
}

export const indexedDBService = new IndexedDBService();
