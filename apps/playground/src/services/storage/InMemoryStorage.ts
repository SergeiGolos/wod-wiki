import type {
  IReadOnlyStore,
  IReadWriteStore,
  IStorage,
  IStorageTransaction,
  StoreName,
  StoreType,
} from './IStorage';
import { stampUserOwned } from '@bitcobblers/wod-wiki-storage';

interface IndexDef {
  keyPath: string | string[];
  multiEntry?: boolean;
}

const STORE_CONFIGS: Record<StoreName, { keyPath: string | string[]; indexes: Record<string, IndexDef> }> = {
  notes: {
    keyPath: 'id',
    indexes: {
      'by-date': { keyPath: 'date' },
      'by-created': { keyPath: 'createdAt' },
    },
  },
  page: {
    keyPath: 'id',
    indexes: {
      'by-date': { keyPath: 'date' },
      'by-slug': { keyPath: 'slug' },
    },
  },
  page_notes: {
    keyPath: 'id',
    indexes: {
      'by-page': { keyPath: 'pageId' },
      'by-note': { keyPath: 'noteId' },
      'by-page-note': { keyPath: ['pageId', 'noteId'] },
    },
  },
  tags: {
    keyPath: 'id',
    indexes: {
      'by-label': { keyPath: 'label' },
      'by-type': { keyPath: 'type' },
    },
  },
  tag_types: {
    keyPath: 'id',
    indexes: {
      'by-name': { keyPath: 'name' },
    },
  },
  note_tags: {
    keyPath: 'id',
    indexes: {
      'by-note': { keyPath: 'noteId' },
      'by-tag': { keyPath: 'tagId' },
      'by-note-tag': { keyPath: ['noteId', 'tagId'] },
    },
  },
  segments: {
    keyPath: ['id', 'version'],
    indexes: {
      'by-note': { keyPath: 'noteId' },
      'by-type': { keyPath: 'dataType' },
      'by-page': { keyPath: 'pageId' },
      'by-history': { keyPath: 'isHistory' },
    },
  },
  sessions: {
    keyPath: 'id',
    indexes: {
      'by-segment': { keyPath: 'segmentId' },
      'by-note': { keyPath: 'noteId' },
      'by-completed': { keyPath: 'createdAt' },
      'by-content': { keyPath: 'blockContentId' },
      'by-block': { keyPath: 'blockId' },
      'by-page': { keyPath: 'pageId' },
      'by-origin': { keyPath: 'origin' },
    },
  },
  attachments: {
    keyPath: 'id',
    indexes: {
      'by-note': { keyPath: 'noteId' },
      'by-time': { keyPath: 'createdAt' },
      'by-page': { keyPath: 'pageId' },
      'by-result': { keyPath: 'resultId' },
    },
  },
  events: {
    keyPath: 'id',
    indexes: {
      'by-timestamp': { keyPath: 'timestamp' },
      'by-result-grain': { keyPath: ['resultId', 'grain'] },
      'by-content-grain': { keyPath: ['blockContentId', 'grain'] },
      'by-effort': { keyPath: 'effortSlug' },
      'by-outputType': { keyPath: 'outputType' },
      'by-grain': { keyPath: 'grain' },
      'by-metric-date': { keyPath: 'metricDateKeys', multiEntry: true },
    },
  },
  field_catalog: {
    keyPath: 'id',
    indexes: {
      'by-path': { keyPath: 'path' },
    },
  },
  field_sources: {
    keyPath: 'id',
    indexes: {},
  },
  field_values: {
    keyPath: 'key',
    indexes: {
      'by-field': { keyPath: 'fieldId' },
    },
  },
  field_catalog_meta: {
    keyPath: 'id',
    indexes: {},
  },
  efforts: {
    keyPath: 'slug',
    indexes: {
      'by-discipline': { keyPath: 'baseAttributes.discipline' },
      'by-source': { keyPath: 'registrySource' },
    },
  },
  block_index: {
    keyPath: 'id',
    indexes: {
      'by-note': { keyPath: 'noteId' },
      'by-content': { keyPath: 'blockContentId' },
      'by-type': { keyPath: 'dataType' },
      'by-source': { keyPath: 'sourceId' },
    },
  },
  block_efforts: {
    keyPath: 'id',
    indexes: {
      'by-note': { keyPath: 'noteId' },
      'by-effort': { keyPath: 'effortSlug' },
      'by-block': { keyPath: 'blockContentId' },
    },
  },
  meta: {
    keyPath: 'key',
    indexes: {},
  },
  memberships: {
    keyPath: 'id',
    indexes: {},
  },
};

function getNestedValue(obj: unknown, path: string): unknown {
  if (obj == null || typeof obj !== 'object') return undefined;
  if (!path.includes('.')) {
    return (obj as Record<string, unknown>)[path];
  }
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function extractKey(obj: unknown, keyPath: string | string[]): IDBValidKey | undefined {
  if (Array.isArray(keyPath)) {
    return keyPath.map((k) => getNestedValue(obj, k)) as unknown as IDBValidKey;
  }
  return getNestedValue(obj, keyPath) as IDBValidKey | undefined;
}

function serializeKey(key: unknown): string {
  if (Array.isArray(key) || (typeof key === 'object' && key !== null)) {
    return JSON.stringify(key);
  }
  return String(key);
}

function matchKeyOrRange(actual: unknown, query: unknown): boolean {
  if (query === undefined) return true;
  if (actual === undefined) return false;

  if (query && typeof query === 'object' && ('lower' in query || 'upper' in query)) {
    const range = query as { lower?: unknown; upper?: unknown; lowerOpen?: boolean; upperOpen?: boolean };
    // IDB key total order (subset): numbers < strings < arrays, compared by
    // value / element-wise. Compound index bounds are arrays, so the range
    // check must compare keys the way IndexedDB does — a numeric coercion
    // would turn every compound bound into NaN comparisons.
    if (range.lower !== undefined) {
      const c = compareKeys(actual, range.lower);
      if (range.lowerOpen ? c <= 0 : c < 0) return false;
    }
    if (range.upper !== undefined) {
      const c = compareKeys(actual, range.upper);
      if (range.upperOpen ? c >= 0 : c > 0) return false;
    }
    return true;
  }

  if (Array.isArray(query)) {
    if (!Array.isArray(actual)) return false;
    if (actual.length < query.length) return false;
    for (let i = 0; i < query.length; i++) {
      if (!matchKeyOrRange(actual[i], query[i])) return false;
    }
    return true;
  }

  return actual === query;
}

function compareKeys(a: unknown, b: unknown): number {
  const typeRank = (v: unknown): number =>
    typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : Array.isArray(v) ? 2 : 3;
  const rankA = typeRank(a);
  const rankB = typeRank(b);
  if (rankA !== rankB) return rankA - rankB;
  if (Array.isArray(a) && Array.isArray(b)) {
    const shared = Math.min(a.length, b.length);
    for (let i = 0; i < shared; i++) {
      const c = compareKeys(a[i], b[i]);
      if (c !== 0) return c;
    }
    return a.length - b.length;
  }
  if (a === b) return 0;
  return (a as number | string) < (b as number | string) ? -1 : 1;
}

export class InMemoryStore<T> implements IReadWriteStore<T> {
  private readonly records = new Map<string, T>();

  constructor(
    private readonly storeName: StoreName,
    private readonly getUserId?: () => string,
    private readonly config = STORE_CONFIGS[storeName]
  ) {}

  async get(key: IDBValidKey): Promise<T | undefined> {
    return this.records.get(serializeKey(key));
  }

  async getAll(query?: IDBValidKey | IDBKeyRange, count?: number): Promise<T[]> {
    const results: T[] = [];
    for (const [serializedKey, val] of this.records.entries()) {
      if (query !== undefined) {
        let key: unknown;
        try {
          key = JSON.parse(serializedKey);
        } catch {
          key = serializedKey;
        }
        if (!matchKeyOrRange(key, query)) continue;
      }
      results.push(val);
      if (count && results.length >= count) break;
    }
    return results;
  }

  async getAllFromIndex(indexName: string, query?: IDBValidKey | IDBKeyRange, count?: number): Promise<T[]> {
    const indexDef = this.config.indexes[indexName];
    if (!indexDef) {
      throw new Error(`Index ${indexName} does not exist on store ${this.storeName}`);
    }

    const results: T[] = [];
    for (const val of this.records.values()) {
      const indexValue = extractKey(val, indexDef.keyPath);
      // Native IDB parity: rows whose keyPath is absent are NOT in the index
      // and never match — not even an undefined-query getAllFromIndex.
      if (indexValue === undefined) continue;
      let matched = false;

      if (indexDef.multiEntry && Array.isArray(indexValue)) {
        matched = indexValue.some((item) => matchKeyOrRange(item, query));
      } else {
        matched = matchKeyOrRange(indexValue, query);
      }

      if (matched) {
        results.push(val);
        if (count && results.length >= count) break;
      }
    }
    return results;
  }

  async count(query?: IDBValidKey | IDBKeyRange): Promise<number> {
    if (query === undefined) {
      return this.records.size;
    }
    const all = await this.getAll(query);
    return all.length;
  }

  /** Index-scoped count without row hydration (index filtering + length).
   *  Mirrors IReadOnlyStore.countFromIndex (contract addition landed by root). */
  async countFromIndex(indexName: string, query?: IDBValidKey | IDBKeyRange): Promise<number> {
    const all = await this.getAllFromIndex(indexName, query);
    return all.length;
  }

  async put(value: T, key?: IDBValidKey): Promise<IDBValidKey> {
    const userId = this.getUserId?.();
    const stored = (userId ? stampUserOwned(this.storeName, value, userId) : value) as T;
    const resolvedKey = key ?? extractKey(stored, this.config.keyPath);
    if (resolvedKey === undefined) {
      throw new Error(`Cannot put record into ${this.storeName} without primary key`);
    }
    this.records.set(serializeKey(resolvedKey), stored);
    return resolvedKey;
  }

  async delete(key: IDBValidKey | IDBKeyRange): Promise<void> {
    if (key && typeof key === 'object' && ('lower' in key || 'upper' in key)) {
      for (const [serializedKey] of Array.from(this.records.entries())) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(serializedKey);
        } catch {
          parsed = serializedKey;
        }
        if (matchKeyOrRange(parsed, key)) {
          this.records.delete(serializedKey);
        }
      }
      return;
    }
    this.records.delete(serializeKey(key));
  }

  async clear(): Promise<void> {
    this.records.clear();
  }

  /** Transaction-rollback seam: an owned (deep) copy of the live rows for
   *  snapshotting. Paired with restoreRows — the two must stay in lockstep.
   *  Rows are cloned so an fn that mutates a stored object in place cannot
   *  leak through the rollback. */
  snapshotRows(): Map<string, T> {
    const copy = new Map<string, T>();
    for (const [key, value] of this.records) copy.set(key, structuredClone(value));
    return copy;
  }

  /** Transaction-rollback seam: swap back to a snapshotRows() copy, cloned
   *  again so the snapshot stays pristine for a future rollback. */
  restoreRows(rows: Map<string, T> | undefined): void {
    this.records.clear();
    if (rows) for (const [key, value] of rows) this.records.set(key, structuredClone(value));
  }
}

export class InMemoryStorage implements IStorage {
  private readonly stores = new Map<StoreName, InMemoryStore<unknown>>();

  constructor(private readonly options: { getUserId?: () => string } = {}) {}

  private getStore<K extends StoreName>(name: K): InMemoryStore<StoreType<K>> {
    let store = this.stores.get(name) as InMemoryStore<StoreType<K>> | undefined;
    if (!store) {
      store = new InMemoryStore<StoreType<K>>(name, this.options.getUserId);
      this.stores.set(name, store);
    }
    return store;
  }

  readonly<K extends StoreName>(store: K): IReadOnlyStore<StoreType<K>> {
    return this.getStore(store);
  }

  readwrite<K extends StoreName>(store: K): IReadWriteStore<StoreType<K>> {
    return this.getStore(store);
  }

  async transaction<K extends StoreName, R>(
    _stores: K[],
    _mode: 'readonly' | 'readwrite',
    fn: (tx: IStorageTransaction) => Promise<R>
  ): Promise<R> {
    // Snapshot every live store before fn: on rejection the pre-tx maps are
    // restored, so a failed transaction rolls back instead of half-committing.
    // Stores never mutate row objects in place (put stores the reference it
    // is given), so restoring the maps returns byte-identical rows.
    const snapshots = new Map<StoreName, Map<string, unknown>>();
    for (const [name, store] of this.stores) {
      snapshots.set(name, store.snapshotRows());
    }
    const tx: IStorageTransaction = {
      readonly: (name) => this.readonly(name),
      readwrite: (name) => this.readwrite(name),
    };
    try {
      return await fn(tx);
    } catch (err) {
      for (const [name, store] of this.stores) {
        store.restoreRows(snapshots.get(name));
      }
      throw err;
    }
  }

  async wipe(): Promise<void> {
    for (const store of this.stores.values()) {
      await store.clear();
    }
    this.stores.clear();
  }

  async close(): Promise<void> {
    // No-op for in-memory storage
  }
}
