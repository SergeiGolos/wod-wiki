import type {
    IReadonlyStore,
    IReadWriteStore,
    IStorage,
    IStorageTransaction,
    StoreName,
    StorageKey,
    StorageValue,
} from './IStorage';

type RowMap = Map<StorageKey, StorageValue>;

/**
 * Per-store view backed by a shared RowMap. Whether a view is read-only
 * or read-write is decided at construction time; both views point at the
 * same underlying map so writes through one are visible to reads through
 * the other without any cross-instance coordination.
 */
function makeReadonlyView(rows: RowMap): IReadonlyStore {
    return {
        async get(key) {
            return rows.get(key);
        },
        async getAll() {
            return Array.from(rows.values());
        },
        async getAllFromIndex(indexName, query) {
            if (query === undefined) return Array.from(rows.values());
            const all = Array.from(rows.values());
            return all.filter((row) => matchKey(row, indexName, query));
        },
    };
}

function makeReadWriteView(rows: RowMap): IReadWriteStore {
    const read = makeReadonlyView(rows);
    return {
        ...read,
        async put(value) {
            const key = (value as { id?: StorageKey })?.id ?? (value as { slug?: StorageKey })?.slug;
            if (key === undefined) {
                throw new Error('InMemoryStorage.put: value must have an "id" or "slug" field for keying');
            }
            rows.set(key, value);
            return key;
        },
        async delete(key) {
            rows.delete(key);
        },
    };
}

class MemTransaction implements IStorageTransaction {
    private doneFlag = false;

    constructor(private readonly stores: ReadonlyMap<StoreName, RowMap>) {}

    readonly(store: StoreName): IReadonlyStore {
        this.assertLive();
        return makeReadonlyView(this.requireStore(store));
    }

    readwrite(store: StoreName): IReadWriteStore {
        this.assertLive();
        return makeReadWriteView(this.requireStore(store));
    }

    async done(): Promise<void> {
        this.assertLive();
        this.doneFlag = true;
    }

    private requireStore(store: StoreName): RowMap {
        const rows = this.stores.get(store);
        if (!rows) throw new Error(`InMemoryStorage.transaction: store "${store}" not in transaction`);
        return rows;
    }

    private assertLive() {
        if (this.doneFlag) throw new Error('InMemoryStorage.transaction: done() already called');
    }
}

/**
 * InMemoryStorage — pure Map-backed IStorage adapter.
 *
 * Use this as the test default. Stores are lazily created on first access
 * and live for the lifetime of the adapter instance. Each test gets a fresh
 * InMemoryStorage, so tests do not bleed state across cases.
 *
 * The transaction implementation is intentionally simple: writes applied
 * through a transaction view are visible immediately to subsequent reads in
 * the same transaction, and committed (i.e. made durable to the underlying
 * Map) on done(). For the in-memory adapter this distinction is cosmetic;
 * it exists so that callers using the cross-store pattern (cascade delete)
 * exercise the same shape as the IndexedDB adapter.
 */
export class InMemoryStorage implements IStorage {
    private readonly stores = new Map<StoreName, RowMap>();

    async open(): Promise<void> {
        /* no-op */
    }

    async close(): Promise<void> {
        this.stores.clear();
    }

    readonly(store: StoreName): IReadonlyStore {
        return makeReadonlyView(this.getOrCreate(store));
    }

    readwrite(store: StoreName): IReadWriteStore {
        return makeReadWriteView(this.getOrCreate(store));
    }

    transaction(stores: readonly StoreName[]): IStorageTransaction {
        const scoped = new Map<StoreName, RowMap>();
        for (const s of stores) scoped.set(s, this.getOrCreate(s));
        return new MemTransaction(scoped);
    }

    private getOrCreate(store: StoreName): RowMap {
        let rows = this.stores.get(store);
        if (!rows) {
            rows = new Map();
            this.stores.set(store, rows);
        }
        return rows;
    }
}

function matchKey(row: StorageValue, indexName: string, query: IDBKeyRange | StorageKey): boolean {
    const value = (row as Record<string, unknown>)[indexName];
    if (typeof query === 'object' && query !== null && 'lower' in query) {
        const r = query as unknown as { lower: unknown; upper: unknown; lowerOpen?: boolean; upperOpen?: boolean };
        const lowerOk = r.lowerOpen ? value > r.lower : value >= r.lower;
        const upperOk = r.upperOpen ? value < r.upper : value <= r.upper;
        return lowerOk && upperOk;
    }
    return value === query;
}
