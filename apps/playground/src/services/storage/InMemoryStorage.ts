import type {
  IReadOnlyStore,
  IReadWriteStore,
  IStorage,
  IStorageTransaction,
  StoreName,
  StoreType,
} from './IStorage';

interface IndexDef {
  keyPath: string | string[];
  multiEntry?: boolean;
}

const STORE_CONFIGS: Record<StoreName, { keyPath: string | string[]; indexes: Record<string, IndexDef> }> = {
  notes: {
    keyPath: 'id',
    indexes: {
      'by-slug': { keyPath: 'slug' },
      'by-page': { keyPath: 'pageId' },
    },
  },
  page: {
    keyPath: 'id',
    indexes: {
      'by-date': { keyPath: 'date' },
      'by-slug': { keyPath: 'slug' },
    },
  },
  tags: {
    keyPath: 'id',
    indexes: {
      'by-label': { keyPath: 'label' },
      'by-type': { keyPath: 'type' },
    },
  },
  note_tags: {
    keyPath: 'id',
    indexes: {
      'by-note': { keyPath: 'noteId' },
      'by-tag': { keyPath: 'tagId' },
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
  results: {
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
    },
  },
  meta: {
    keyPath: 'key',
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
    if (range.lower !== undefined) {
      const satisfiesLower = range.lowerOpen ? (actual as number) > (range.lower as number) : (actual as number) >= (range.lower as number);
      if (!satisfiesLower) return false;
    }
    if (range.upper !== undefined) {
      const satisfiesUpper = range.upperOpen ? (actual as number) < (range.upper as number) : (actual as number) <= (range.upper as number);
      if (!satisfiesUpper) return false;
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

export class InMemoryStore<T> implements IReadWriteStore<T> {
  private readonly records = new Map<string, T>();

  constructor(
    private readonly storeName: StoreName,
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

  async put(value: T, key?: IDBValidKey): Promise<IDBValidKey> {
    const resolvedKey = key ?? extractKey(value, this.config.keyPath);
    if (resolvedKey === undefined) {
      throw new Error(`Cannot put record into ${this.storeName} without primary key`);
    }
    this.records.set(serializeKey(resolvedKey), value);
    return resolvedKey;
  }

  async delete(key: IDBValidKey | IDBKeyRange): Promise<void> {
    if (key && typeof key === 'object' && ('lower' in key || 'upper' in key)) {
      for (const [serializedKey] of Array.from(this.records.entries())) {
        let parsed: any;
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
}

export class InMemoryStorage implements IStorage {
  private readonly stores = new Map<StoreName, InMemoryStore<any>>();

  private getStore<K extends StoreName>(name: K): InMemoryStore<StoreType<K>> {
    let store = this.stores.get(name);
    if (!store) {
      store = new InMemoryStore<StoreType<K>>(name);
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
    const tx: IStorageTransaction = {
      readonly: (name) => this.readonly(name),
      readwrite: (name) => this.readwrite(name),
    };
    return fn(tx);
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
