/**
 * IndexedDB Service
 * 
 * Wrapper around 'idb' to manage the 'wodwiki-db' database.
 * Handles schema upgrades and provides typed access to stores.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Note, Script, WorkoutResult, SectionHistory } from '../../types/storage';

interface WodWikiDB extends DBSchema {
    notes: {
        key: string;
        value: Note;
        indexes: { 'by-updated': number, 'by-target-date': number };
    };
    scripts: {
        key: string;
        value: Script;
        indexes: { 'by-note': string, 'by-created': number };
    };
    results: {
        key: string;
        value: WorkoutResult;
        indexes: { 'by-script': string, 'by-note': string, 'by-completed': number };
    };
    'section_history': {
        key: [string, number];
        value: SectionHistory;
        indexes: { 'by-section': string, 'by-note': string };
    };
}

const DB_NAME = 'wodwiki-db';
const DB_VERSION = 3; // Incremented for section_history

class IndexedDBService {
    private dbPromise: Promise<IDBPDatabase<WodWikiDB>>;

    constructor() {
        this.dbPromise = openDB<WodWikiDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Notes Store
                if (!db.objectStoreNames.contains('notes')) {
                    const store = db.createObjectStore('notes', { keyPath: 'id' });
                    store.createIndex('by-updated', 'updatedAt');
                    store.createIndex('by-target-date', 'targetDate');
                } else {
                    const tx = db.transaction('notes', 'versionchange');
                    const store = tx.objectStore('notes');
                    if (!store.indexNames.contains('by-target-date')) {
                        store.createIndex('by-target-date', 'targetDate');
                    }
                }

                // Scripts Store
                if (!db.objectStoreNames.contains('scripts')) {
                    const store = db.createObjectStore('scripts', { keyPath: 'id' });
                    store.createIndex('by-note', 'noteId');
                    store.createIndex('by-created', 'createdAt');
                }

                // Results Store
                if (!db.objectStoreNames.contains('results')) {
                    const store = db.createObjectStore('results', { keyPath: 'id' });
                    store.createIndex('by-script', 'scriptId');
                    store.createIndex('by-note', 'noteId');
                    store.createIndex('by-completed', 'completedAt');
                }

                // Section History Store (V3)
                if (!db.objectStoreNames.contains('section_history')) {
                    const store = db.createObjectStore('section_history', { keyPath: ['sectionId', 'version'] });
                    store.createIndex('by-section', 'sectionId');
                    store.createIndex('by-note', 'noteId');
                }
            },
        });
    }

    async getDB() {
        return this.dbPromise;
    }

    // --- Notes Operations ---

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
        const tx = db.transaction(['notes', 'scripts', 'results', 'section_history'], 'readwrite');

        // Delete Note
        await tx.objectStore('notes').delete(id);

        // Delete associated Scripts
        const scriptsIndex = tx.objectStore('scripts').index('by-note');
        let scriptCursor = await scriptsIndex.openCursor(IDBKeyRange.only(id));
        while (scriptCursor) {
            await scriptCursor.delete();
            scriptCursor = await scriptCursor.continue();
        }

        // Delete associated Results
        const resultsIndex = tx.objectStore('results').index('by-note');
        let resultCursor = await resultsIndex.openCursor(IDBKeyRange.only(id));
        while (resultCursor) {
            await resultCursor.delete();
            resultCursor = await resultCursor.continue();
        }

        // Delete associated Section History (V3)
        const historyIndex = tx.objectStore('section_history').index('by-note');
        let historyCursor = await historyIndex.openCursor(IDBKeyRange.only(id));
        while (historyCursor) {
            await historyCursor.delete();
            historyCursor = await historyCursor.continue();
        }

        await tx.done;
    }

    // --- Scripts Operations ---

    async getScript(id: string): Promise<Script | undefined> {
        return (await this.dbPromise).get('scripts', id);
    }

    async getLatestScriptForNote(noteId: string): Promise<Script | undefined> {
        const db = await this.dbPromise;
        const index = db.transaction('scripts').store.index('by-note');
        // Get all scripts for note, sort by created descending
        // IndexedDB range queries are sorted by key (created is not the key), 
        // but we can use 'by-created' index if we filter manually or use a compound index.
        // Simpler approach for V1: Get all by note, sort in memory (usually small count per note).
        const scripts = await index.getAll(noteId);
        if (scripts.length === 0) return undefined;

        return scripts.sort((a, b) => b.createdAt - a.createdAt)[0];
    }

    async saveScript(script: Script): Promise<string> {
        return (await this.dbPromise).put('scripts', script);
    }

    // --- Results Operations ---

    async saveResult(result: WorkoutResult): Promise<string> {
        return (await this.dbPromise).put('results', result);
    }

    async getResultsForNote(noteId: string): Promise<WorkoutResult[]> {
        return (await this.dbPromise).getAllFromIndex('results', 'by-note', noteId);
    }

    // --- Section History Operations ---

    async saveSectionHistory(history: SectionHistory): Promise<[string, number]> {
        return (await this.dbPromise).put('section_history', history);
    }

    async getSectionHistory(sectionId: string): Promise<SectionHistory[]> {
        return (await this.dbPromise).getAllFromIndex('section_history', 'by-section', sectionId);
    }

    async getLatestSectionVersion(sectionId: string): Promise<SectionHistory | undefined> {
        const history = await this.getSectionHistory(sectionId);
        if (history.length === 0) return undefined;
        return history.sort((a, b) => b.version - a.version)[0];
    }

    /**
     * Get the latest version of multiple segments.
     */
    async getLatestSegments(segmentIds: string[]): Promise<SectionHistory[]> {
        const db = await this.dbPromise;
        const tx = db.transaction('section_history', 'readonly');
        const store = tx.objectStore('section_history');
        const index = store.index('by-section');

        const result: SectionHistory[] = [];
        for (const id of segmentIds) {
            const cursor = await index.openCursor(IDBKeyRange.only(id), 'prev');
            if (cursor) {
                result.push(cursor.value);
            }
        }
        return result;
    }
}

export const indexedDBService = new IndexedDBService();
