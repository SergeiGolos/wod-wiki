import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

import type { IEffort } from '@/effort-registry/types';
import type { Note, NoteSegment, WorkoutResult, Attachment, AnalyticsDataPoint } from '@/types/storage';

import type {
    IReadonlyStore,
    IReadWriteStore,
    IStorage,
    IStorageTransaction,
    StoreName,
    StorageKey,
    StorageValue,
} from './IStorage';

interface WodWikiDBSchema extends DBSchema {
    notes: { key: string; value: Note; indexes: { 'by-updated': number; 'by-target-date': number } };
    segments: {
        key: [string, number];
        value: NoteSegment;
        indexes: { 'by-note': string; 'by-type': string };
    };
    results: {
        key: string;
        value: WorkoutResult;
        indexes: { 'by-segment': string; 'by-note': string; 'by-completed': number };
    };
    attachments: { key: string; value: Attachment; indexes: { 'by-note': string; 'by-time': number } };
    analytics: {
        key: string;
        value: AnalyticsDataPoint;
        indexes: { 'by-type': string; 'by-segment': string; 'by-result': string };
    };
    efforts: {
        key: string;
        value: IEffort;
        indexes: { 'by-discipline': string; 'by-source': string };
    };
}

const DB_VERSION = 5;
const DEFAULT_DB_NAME = 'wodwiki-db';

interface IDBStoreLike {
    get: (k: StorageKey) => Promise<StorageValue | undefined>;
    getAll: () => Promise<StorageValue[]>;
    index: (n: string) => { getAll: (q?: IDBKeyRange | StorageKey) => Promise<StorageValue[]> };
    put: (v: StorageValue, k?: StorageKey) => Promise<StorageKey>;
    delete: (k: StorageKey) => Promise<void>;
}

interface IDBTxLike {
    objectStore: (s: StoreName) => IDBStoreLike;
    done: Promise<void>;
}

function readonlyViewFromHandle(handle: IDBStoreLike): IReadonlyStore {
    return {
        get: (key) => handle.get(key),
        getAll: () => handle.getAll(),
        getAllFromIndex: (indexName, query) => handle.index(indexName).getAll(query),
    };
}

function readwriteViewFromHandle(handle: IDBStoreLike): IReadWriteStore {
    return {
        get: (key) => handle.get(key),
        getAll: () => handle.getAll(),
        getAllFromIndex: (indexName, query) => handle.index(indexName).getAll(query),
        // The key is always derived from the value via the store's keyPath.
        // Passing an explicit key would be a spec-level DataError; the IStorage
        // interface documents that put() is keyed by the value.
        put: (value) => handle.put(value),
        delete: (key) => handle.delete(key),
    };
}

class IdbTransaction implements IStorageTransaction {
    private doneFlag = false;

    constructor(private readonly tx: IDBTxLike) {}

    readonly(store: StoreName): IReadonlyStore {
        this.assertLive();
        return readonlyViewFromHandle(this.tx.objectStore(store));
    }

    readwrite(store: StoreName): IReadWriteStore {
        this.assertLive();
        return readwriteViewFromHandle(this.tx.objectStore(store));
    }

    async done(): Promise<void> {
        this.assertLive();
        this.doneFlag = true;
        await this.tx.done;
    }

    private assertLive() {
        if (this.doneFlag) throw new Error('IndexedDBStorage.transaction: done() already called');
    }
}

/**
 * IndexedDBStorage — production IStorage adapter.
 *
 * The schema (stores, indexes, key paths) lives in this file. Adapters
 * that need a different schema fork this class; the IStorage interface
 * is the seam that callers and tests cross.
 *
 * V5 schema:
 *   notes       — root containers
 *   segments    — versioned content (compound key [id, version])
 *   results     — workout execution logs
 *   attachments — external temporal blobs
 *   analytics   — de-normalized metric data points
 *   efforts     — effort registry
 *
 * Migration strategy is "fresh start" below V4 (drop legacy stores).
 *
 * Tests may pass a custom dbName to isolate per-test databases.
 */
export class IndexedDBStorage implements IStorage {
    private dbPromise: Promise<IDBPDatabase<WodWikiDBSchema>> | null = null;
    private cachedDb: IDBPDatabase<WodWikiDBSchema> | null = null;
    private readonly dbName: string;

    constructor(dbName: string = DEFAULT_DB_NAME) {
        this.dbName = dbName;
    }

    async open(): Promise<void> {
        if (!this.dbPromise) this.dbPromise = this.openDb();
        this.cachedDb = await this.dbPromise;
    }

    async close(): Promise<void> {
        this.cachedDb?.close();
        this.cachedDb = null;
        this.dbPromise = null;
    }

    readonly(store: StoreName): IReadonlyStore {
        return readonlyViewFromHandle(this.singleStoreTx(store, 'readonly'));
    }

    readwrite(store: StoreName): IReadWriteStore {
        return readwriteViewFromHandle(this.singleStoreTx(store, 'readwrite'));
    }

    transaction(stores: readonly StoreName[]): IStorageTransaction {
        return new IdbTransaction(this.requireDb().transaction(stores as never, 'readwrite') as IDBTxLike);
    }

    private singleStoreTx(store: StoreName, mode: 'readonly' | 'readwrite'): IDBStoreLike {
        const tx = this.requireDb().transaction([store] as never, mode) as unknown as { store: IDBStoreLike };
        return tx.store;
    }

    private requireDb(): IDBPDatabase<WodWikiDBSchema> {
        if (!this.cachedDb) throw new Error('IndexedDBStorage: open() must be awaited before use');
        return this.cachedDb;
    }

    private openDb(): Promise<IDBPDatabase<WodWikiDBSchema>> {
        return openDB<WodWikiDBSchema>(this.dbName, DB_VERSION, {
            upgrade(db, oldVersion) {
                if (oldVersion < 4) {
                    for (const name of Array.from(db.objectStoreNames)) db.deleteObjectStore(name);
                }
                if (!db.objectStoreNames.contains('notes')) {
                    const store = db.createObjectStore('notes', { keyPath: 'id' });
                    store.createIndex('by-updated', 'updatedAt');
                    store.createIndex('by-target-date', 'targetDate');
                }
                if (!db.objectStoreNames.contains('segments')) {
                    const store = db.createObjectStore('segments', { keyPath: ['id', 'version'] });
                    store.createIndex('by-note', 'noteId');
                    store.createIndex('by-type', 'dataType');
                }
                if (!db.objectStoreNames.contains('results')) {
                    const store = db.createObjectStore('results', { keyPath: 'id' });
                    store.createIndex('by-segment', 'segmentId');
                    store.createIndex('by-note', 'noteId');
                    store.createIndex('by-completed', 'completedAt');
                }
                if (!db.objectStoreNames.contains('attachments')) {
                    const store = db.createObjectStore('attachments', { keyPath: 'id' });
                    store.createIndex('by-note', 'noteId');
                    store.createIndex('by-time', 'createdAt');
                }
                if (!db.objectStoreNames.contains('analytics')) {
                    const store = db.createObjectStore('analytics', { keyPath: 'id' });
                    store.createIndex('by-type', 'metricType');
                    store.createIndex('by-segment', 'segmentId');
                    store.createIndex('by-result', 'resultId');
                }
                if (!db.objectStoreNames.contains('efforts')) {
                    const store = db.createObjectStore('efforts', { keyPath: 'slug' });
                    store.createIndex('by-discipline', 'baseAttributes.discipline');
                    store.createIndex('by-source', 'registrySource');
                }
            },
        });
    }
}
