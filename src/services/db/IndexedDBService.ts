/**
 * IndexedDB Service
 * 
 * Wrapper around 'idb' to manage the 'wodwiki-db' database.
 * Handles schema upgrades and provides typed access to stores.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Note, Script, WorkoutResult } from '../../types/storage';

interface WodWikiDB extends DBSchema {
    notes: {
        key: string;
        value: Note;
        indexes: { 'by-updated': number };
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
}

const DB_NAME = 'wodwiki-db';
const DB_VERSION = 1;

class IndexedDBService {
    private dbPromise: Promise<IDBPDatabase<WodWikiDB>>;

    constructor() {
        this.dbPromise = openDB<WodWikiDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Notes Store
                if (!db.objectStoreNames.contains('notes')) {
                    const store = db.createObjectStore('notes', { keyPath: 'id' });
                    store.createIndex('by-updated', 'updatedAt');
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
        return (await this.dbPromise).getAllFromIndex('notes', 'by-updated');
    }

    async saveNote(note: Note): Promise<string> {
        return (await this.dbPromise).put('notes', note);
    }

    async deleteNote(id: string): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(['notes', 'scripts', 'results'], 'readwrite');

        // Delete Note
        await tx.objectStore('notes').delete(id);

        // Delete associated Scripts
        const scriptsIndex = tx.objectStore('scripts').index('by-note');
        let scriptCursor = await scriptsIndex.openKeyCursor(id);
        while (scriptCursor) {
            await scriptCursor.delete();
            scriptCursor = await scriptCursor.continue();
        }

        // Delete associated Results
        const resultsIndex = tx.objectStore('results').index('by-note');
        let resultCursor = await resultsIndex.openKeyCursor(id);
        while (resultCursor) {
            await resultCursor.delete();
            resultCursor = await resultCursor.continue();
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
}

export const indexedDBService = new IndexedDBService();
