/**
 * IStorage — the raw-store seam below Persistence.
 *
 * Every Storage adapter (IndexedDBStorage, InMemoryStorage) implements this
 * interface. Adapters own the schema (stores, indexes, key paths) — the
 * interface is store-name-parameterized so callers do not need to know which
 * underlying engine is in use.
 *
 * Three principles:
 *  1. Per-store reads/writes are the unit of work; transactions are an
 *     optional cross-store affordance for domain operations like cascade
 *     delete.
 *  2. The interface is what callers and unit tests cross. The InMemoryStorage
 *     adapter is the unit-test default; IndexedDBStorage is the production
 *     adapter.
 *  3. Adapters are responsible for opening/closing the underlying engine.
 *     A typical use is:
 *
 *         const storage = new IndexedDBStorage();
 *         await storage.open();
 *         const notes = await storage.readonly('notes').getAll();
 *         await storage.readwrite('notes').put(note);
 *         await storage.close();
 *
 * Domain-shaped operations (cascade delete, latest-version lookup) live in
 * the Persistence layer (services/persistence) and are composed on top of
 * IStorage; they are NOT part of this seam.
 */

export type StoreName =
    | 'notes'
    | 'segments'
    | 'results'
    | 'attachments'
    | 'analytics'
    | 'efforts';

export type StorageKey = IDBValidKey;

export type StorageValue = unknown;

/** Read-only per-store view. Returned from {@link IStorage.readonly}. */
export interface IReadonlyStore {
    get(key: StorageKey): Promise<StorageValue | undefined>;
    getAll(): Promise<StorageValue[]>;
    getAllFromIndex(indexName: string, query?: IDBKeyRange | StorageKey): Promise<StorageValue[]>;
}

/** Read-write per-store view. Returned from {@link IStorage.readwrite}. */
export interface IReadWriteStore extends IReadonlyStore {
    /**
     * Put a value into the store. The key is derived from the value (each
     * store's keyPath is part of the adapter's schema, not the interface).
     * Callers that need to override the key can {@link IReadonlyStore.get} by
     * the derived key value.
     */
    put(value: StorageValue): Promise<StorageKey>;
    delete(key: StorageKey): Promise<void>;
}

export interface IStorageTransaction {
    readonly(store: StoreName): IReadonlyStore;
    readwrite(store: StoreName): IReadWriteStore;
    done(): Promise<void>;
}

export interface IStorage {
    /** Open the underlying engine. Idempotent; safe to call multiple times. */
    open(): Promise<void>;

    /** Close the underlying engine. After close(), all views are invalid. */
    close(): Promise<void>;

    /** Acquire a per-store read view. */
    readonly(store: StoreName): IReadonlyStore;

    /** Acquire a per-store read-write view. */
    readwrite(store: StoreName): IReadWriteStore;

    /**
     * Open a cross-store transaction.
     *
     * Implementations may scope the transaction by index access (IndexedDB)
     * or by batched put/delete (InMemory). Callers must call done() to commit.
     */
    transaction(stores: readonly StoreName[]): IStorageTransaction;
}
