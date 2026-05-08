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
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
    Note,
    NoteSegment,
    WorkoutResult,
    Attachment,
    AnalyticsDataPoint,
    SegmentDataType,
} from '../../types/storage';

// ---------------------------------------------------------------------------
// DB Schema type (idb generic)
// ---------------------------------------------------------------------------
interface WodWikiDB extends DBSchema {
    notes: {
        key: string;
        value: Note;
        indexes: { 'by-updated': number; 'by-target-date': number };
    };
    segments: {
        key: [string, number]; // [id, version]
        value: NoteSegment;
        indexes: { 'by-note': string; 'by-type': SegmentDataType };
    };
    results: {
        key: string;
        value: WorkoutResult;
        indexes: { 'by-segment': string; 'by-note': string; 'by-completed': number };
    };
    attachments: {
        key: string;
        value: Attachment;
        indexes: { 'by-note': string; 'by-time': number };
    };
    analytics: {
        key: string;
        value: AnalyticsDataPoint;
        indexes: { 'by-type': string; 'by-segment': string; 'by-result': string };
    };
}

const DB_NAME = 'wodwiki-db';
const DB_VERSION = 4; // V4 — Multi-Source Data Lens

class IndexedDBService {
    private dbPromise: Promise<IDBPDatabase<WodWikiDB>>;

    constructor() {
        this.dbPromise = openDB<WodWikiDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                // -------------------------------------------------------
                // Fresh-start strategy: drop everything below V4
                // -------------------------------------------------------
                if (oldVersion < 4) {
                    // Remove all legacy stores
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
                }

                // ---- Segments (replaces scripts + section_history) ----
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
                }

                // ---- Attachments (new in V4) ----
                if (!db.objectStoreNames.contains('attachments')) {
                    const store = db.createObjectStore('attachments', { keyPath: 'id' });
                    store.createIndex('by-note', 'noteId');
                    store.createIndex('by-time', 'createdAt');
                }

                // ---- Analytics (new in V4) ----
                if (!db.objectStoreNames.contains('analytics')) {
                    const store = db.createObjectStore('analytics', { keyPath: 'id' });
                    store.createIndex('by-type', 'metricType');
                    store.createIndex('by-segment', 'segmentId');
                    store.createIndex('by-result', 'resultId');
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

        // Delete Note
        await tx.objectStore('notes').delete(id);

        // Delete associated Segments
        const segIdx = tx.objectStore('segments').index('by-note');
        let segCursor = await segIdx.openCursor(IDBKeyRange.only(id));
        while (segCursor) {
            await segCursor.delete();
            segCursor = await segCursor.continue();
        }

        // Delete associated Results
        const resIdx = tx.objectStore('results').index('by-note');
        let resCursor = await resIdx.openCursor(IDBKeyRange.only(id));
        while (resCursor) {
            await resCursor.delete();
            resCursor = await resCursor.continue();
        }

        // Delete associated Attachments
        const attIdx = tx.objectStore('attachments').index('by-note');
        let attCursor = await attIdx.openCursor(IDBKeyRange.only(id));
        while (attCursor) {
            await attCursor.delete();
            attCursor = await attCursor.continue();
        }

        // Delete associated Analytics (by result IDs we're about to delete)
        const resultIds: string[] = [];
        const resIdx2 = tx.objectStore('results').index('by-note');
        let resCursor2 = await resIdx2.openCursor(IDBKeyRange.only(id));
        while (resCursor2) {
            resultIds.push(resCursor2.value.id);
            resCursor2 = await resCursor2.continue();
        }
        for (const resultId of resultIds) {
            const anaByResult = tx.objectStore('analytics').index('by-result');
            let anaCursor = await anaByResult.openCursor(IDBKeyRange.only(resultId));
            while (anaCursor) {
                await anaCursor.delete();
                anaCursor = await anaCursor.continue();
            }
        }

        await tx.done;
    }

    // =======================================================================
    // Segments (replaces Scripts + SectionHistory)
    // =======================================================================

    async saveSegment(segment: NoteSegment): Promise<[string, number]> {
        return (await this.dbPromise).put('segments', segment);
    }

    async getLatestSegmentVersion(segmentId: string): Promise<NoteSegment | undefined> {
        const db = await this.dbPromise;
        const tx = db.transaction('segments', 'readonly');
        const store = tx.objectStore('segments');
        // Walk backwards through all entries with matching id
        // Since key is [id, version], IDBKeyRange can select by id prefix
        const range = IDBKeyRange.bound([segmentId, 0], [segmentId, Number.MAX_SAFE_INTEGER]);
        const cursor = await store.openCursor(range, 'prev');
        return cursor?.value;
    }

    /**
     * Get the latest version of multiple segments, preserving order.
     */
    async getLatestSegments(segmentIds: string[]): Promise<NoteSegment[]> {
        const db = await this.dbPromise;
        const tx = db.transaction('segments', 'readonly');
        const store = tx.objectStore('segments');

        const result: NoteSegment[] = [];
        for (const id of segmentIds) {
            const range = IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);
            const cursor = await store.openCursor(range, 'prev');
            if (cursor) {
                result.push(cursor.value);
            }
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
        let results = await (await this.dbPromise).getAllFromIndex('results', 'by-note', noteId);

        // Fallback: suffix matching for ID format mismatches (legacy compat)
        if (results.length === 0) {
            const allResults = await (await this.dbPromise).getAll('results');
            results = allResults.filter(r =>
                r.noteId === noteId ||
                r.noteId.endsWith('-' + noteId) ||
                noteId.endsWith('-' + r.noteId)
            );
        }

        return results;
    }

    async getResultsForSection(noteId: string, sectionId: string): Promise<WorkoutResult[]> {
        const noteResults = await this.getResultsForNote(noteId);
        return noteResults.filter(r => r.sectionId === sectionId || r.segmentId === sectionId);
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

    // =======================================================================
    // Attachments (new in V4)
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
    // Analytics (new in V4)
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

}

export const indexedDBService = new IndexedDBService();
