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
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
    Note,
    NoteSegment,
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
            'by-updated': number;
            'by-target-date': number;
            'by-slug': string; // V8 — slug (route) -> UUID; unique
        };
    };
    segments: {
        key: [string, number]; // [id, version]
        value: NoteSegment;
        indexes: { 'by-note': string; 'by-type': SegmentDataType };
    };
    results: {
        key: string;
        value: WorkoutResult;
        indexes: {
            'by-segment': string; // legacy: indexes a nonexistent field; left to preserve schema shape
            'by-note': string;
            'by-completed': number;
            'by-content': string; // V6 — blockContentId; cross-note collection aggregation
            'by-block': string;   // V6 — blockId; efficient per-clone journal queries
        };
    };
    attachments: {
        key: string;
        value: Attachment;
        indexes: { 'by-note': string; 'by-time': number };
    };
    analytics: {
        key: string;
        value: AnalyticsDataPoint;
        indexes: {
            'by-type': string; // legacy: field is `type`, not `metricType`; left as-is
            'by-segment': string;
            'by-result': string;
            'by-content': string; // V6 — blockContentId; cross-workout trend queries
        };
    };
    efforts: {
        key: string;
        value: Effort;
        indexes: { 'by-discipline': string; 'by-source': Effort['registrySource'] };
    };
}

const DB_NAME = 'wodwiki-db';
const DB_VERSION = 9; // V9 — re-fire upgrade to (re)create by-slug + V6 indexes; upgrade mutations now use the upgrade transaction (db.transaction() inside upgrade was unreliable)

export class IndexedDBService {
    private dbPromise: Promise<IDBPDatabase<WodWikiDB>>;

    constructor() {
        this.dbPromise = openDB<WodWikiDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, _newVersion, tx) {
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
                    store.createIndex('by-updated', 'updatedAt');
                    store.createIndex('by-target-date', 'targetDate');
                    store.createIndex('by-slug', 'slug');
                } else {
                    // V8 — add by-slug (idempotent)
                    const notesStore = tx.objectStore('notes');
                    if (!notesStore.indexNames.contains('by-slug')) {
                        notesStore.createIndex('by-slug', 'slug');
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
                    store.createIndex('by-completed', 'completedAt');
                } else {
                    // V6 — add by-content + by-block (idempotent)
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
                } else {
                    // V6 — add by-content (idempotent)
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
            },
        });
    }

    async getDB() {
        return this.dbPromise;
    }

    // =======================================================================
    // Notes
    // =======================================================================

    async getNote(id: string): Promise<Note | undefined> {
        return (await this.dbPromise).get('notes', id);
    }

    async getAllNotes(): Promise<Note[]> {
        return (await this.dbPromise).getAllFromIndex('notes', 'by-target-date');
    }

    async saveNote(note: Note): Promise<string> {
        return (await this.dbPromise).put('notes', note);
    }

    async deleteNote(id: string): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(
            ['notes', 'segments', 'results', 'attachments', 'analytics'],
            'readwrite',
        );

        await tx.objectStore('notes').delete(id);

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
        const migrated: Note = { ...oldNote, id: newId, slug: oldId };

        const db = await this.dbPromise;
        const tx = db.transaction(['notes', 'segments', 'results', 'attachments', 'analytics'], 'readwrite');

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

    async getLatestSegmentVersion(segmentId: string): Promise<NoteSegment | undefined> {
        const db = await this.dbPromise;
        const tx = db.transaction('segments', 'readonly');
        const store = tx.objectStore('segments');
        const range = IDBKeyRange.bound([segmentId, 0], [segmentId, Number.MAX_SAFE_INTEGER]);
        const cursor = await store.openCursor(range, 'prev');
        return cursor?.value;
    }

    async getLatestSegments(segmentIds: string[]): Promise<NoteSegment[]> {
        const db = await this.dbPromise;
        const tx = db.transaction('segments', 'readonly');
        const store = tx.objectStore('segments');
        const result: NoteSegment[] = [];
        for (const id of segmentIds) {
            const range = IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);
            const cursor = await store.openCursor(range, 'prev');
            if (cursor) result.push(cursor.value);
        }
        return result;
    }

    // =======================================================================
    // Results
    // =======================================================================

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
