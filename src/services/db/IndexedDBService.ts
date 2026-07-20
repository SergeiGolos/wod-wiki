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
 *   analytics   — de-normalized metric data points
 *
 * V6 — by-content / by-block indexes for cross-note result aggregation
 *      (cross-note-result-aggregation ADR).
 * V8 — slug field + by-slug index on notes; lazy per-note UUID migration
 *      for legacy route-id-keyed journal notes (note-identity-uuid-canonical ADR).
 */
import { openDB, DBSchema, IDBPDatabase, IDBPTransaction, IndexNames, StoreNames } from 'idb';
import {
    Note,
    NoteSegment,
    NoteTag,
    Page,
    Tag,
    WorkoutResult,
    Attachment,
    AnalyticsDataPoint,
    SegmentDataType,
    Effort,
} from '../../types/storage';

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
    analytics: {
        key: string;
        value: AnalyticsDataPoint;
        indexes: {
            'by-type': string; // the row's metric key (field is `type`)
            'by-segment': string;
            'by-result': string;
            'by-content': string;    // V6 — blockContentId; cross-workout trend queries
            'by-page': string;       // V10 — pageId
            'by-origin': string;     // V10 — origin
            'by-metric': string;     // V10 — metricKey; canonical cross-workout metric join
            'by-effort': string;     // V10 — effortSlug
            'by-grain': string;      // V10 — grain ('segment' | 'summary')
            'by-discipline': string; // V10 — discipline
        };
    };
    efforts: {
        key: string;
        value: Effort;
        indexes: { 'by-discipline': string; 'by-source': Effort['registrySource'] };
    };
}

const DB_NAME = 'wodwiki-db';
const DB_VERSION = 11; // V11 — destructive: results.completedAt→createdAt (+ index rebuild), segments drop level/scriptBlock + gain position, Note slim-down (journalDate/rawContent/segmentIds/clonedIds/createdFrom/updatedAt/targetDate removed, templateId→sourceId), tags[]→note_tags

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

export class IndexedDBService {
    private dbPromise: Promise<IDBPDatabase<WodWikiDB>>;

    constructor() {
        this.dbPromise = openDB<WodWikiDB>(DB_NAME, DB_VERSION, {
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

                // ---- Analytics ----
                if (!db.objectStoreNames.contains('analytics')) {
                    const store = db.createObjectStore('analytics', { keyPath: 'id' });
                    store.createIndex('by-type', 'metricType');
                    store.createIndex('by-segment', 'segmentId');
                    store.createIndex('by-result', 'resultId');
                }
                {
                    // V6 — by-content, idempotent for fresh creation AND upgrades.
                    const analytics = tx.objectStore('analytics');
                    if (!analytics.indexNames.contains('by-content')) {
                        analytics.createIndex('by-content', 'blockContentId');
                    }
                }

                // ---- Efforts ----
                if (!db.objectStoreNames.contains('efforts')) {
                    const store = db.createObjectStore('efforts', { keyPath: 'slug' });
                    store.createIndex('by-discipline', 'baseAttributes.discipline');
                    store.createIndex('by-source', 'registrySource');
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
                    keyPath: string,
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
                ensureIndex('analytics', 'by-page', 'pageId');
                ensureIndex('analytics', 'by-origin', 'origin');
                ensureIndex('analytics', 'by-metric', 'metricKey');
                ensureIndex('analytics', 'by-effort', 'effortSlug');
                ensureIndex('analytics', 'by-grain', 'grain');
                ensureIndex('analytics', 'by-discipline', 'discipline');

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
            },
        });
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
        }
    }

    /**
     * Delete the entire `wodwiki-db` database so the next open recreates it
     * with a fresh schema. Closes this singleton's connection first so the
     * delete request is not blocked, then issues `deleteDatabase`.
     *
     * Used by the "Reset & Clear Cache" action to wipe every object store
     * (notes, segments, results, attachments, analytics, efforts, page, tags,
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

    async getAnalyticsForPage(pageId: string): Promise<AnalyticsDataPoint[]> {
        return (await this.dbPromise).getAllFromIndex('analytics', 'by-page', pageId);
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
            ['notes', 'segments', 'results', 'attachments', 'analytics', 'note_tags'],
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

        const anaStore = tx.objectStore('analytics');
        for (const resultId of deletedResultIds) {
            let anaCursor = await anaStore.index('by-result').openCursor(IDBKeyRange.only(resultId));
            while (anaCursor) {
                await anaCursor.delete();
                anaCursor = await anaCursor.continue();
            }
        }

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
        const tx = db.transaction(['notes', 'segments', 'results', 'attachments', 'analytics'], 'readwrite');
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

        // Re-key analytics: there's no by-note index, so join through results.
        const oldResultIds = new Set<string>();
        let resCursor = await tx.objectStore('results').index('by-note').openCursor(IDBKeyRange.only(oldId));
        while (resCursor) {
            oldResultIds.add(resCursor.value.id);
            resCursor = await resCursor.continue();
        }
        for (const resultId of oldResultIds) {
            let anaCursor = await tx.objectStore('analytics').index('by-result').openCursor(IDBKeyRange.only(resultId));
            while (anaCursor) {
                await anaCursor.update({ ...anaCursor.value, noteId: newId });
                anaCursor = await anaCursor.continue();
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

    /** Latest version of every segment of a note, in document order (V11). */
    async getLatestSegmentsForNote(noteId: string): Promise<NoteSegment[]> {
        const rows = await (await this.dbPromise).getAllFromIndex('segments', 'by-note', noteId);
        const latest = new Map<string, NoteSegment>();
        for (const segment of rows) {
            const current = latest.get(segment.id);
            if (!current || segment.version > current.version) latest.set(segment.id, segment);
        }
        return [...latest.values()].sort(
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
    // Analytics
    // =======================================================================

    async saveAnalyticsPoints(points: AnalyticsDataPoint[]): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction('analytics', 'readwrite');
        const store = tx.objectStore('analytics');
        for (const pt of points) {
            await store.put(pt);
        }
        await tx.done;
    }

    /** V6 — cross-workout trend queries. */
    async getAnalyticsByContentId(blockContentId: string): Promise<AnalyticsDataPoint[]> {
        return (await this.dbPromise).getAllFromIndex('analytics', 'by-content', blockContentId);
    }

    /** Delete all fact rows for one result (replay/re-derivation cascade). */
    async deleteAnalyticsPointsForResult(resultId: string): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction('analytics', 'readwrite');
        const index = tx.store.index('by-result');
        for await (const cursor of index.iterate(resultId)) {
            await cursor.delete();
        }
        await tx.done;
    }

    // =======================================================================
    // Efforts
    // =======================================================================

    async getEffort(slug: string): Promise<Effort | undefined> {
        return (await this.dbPromise).get('efforts', slug);
    }

    async getAllEfforts(): Promise<Effort[]> {
        return (await this.dbPromise).getAll('efforts');
    }

    async saveEffort(effort: Effort): Promise<string> {
        return (await this.dbPromise).put('efforts', effort);
    }

    async deleteEffort(slug: string): Promise<void> {
        return (await this.dbPromise).delete('efforts', slug);
    }
}

export const indexedDBService = new IndexedDBService();
