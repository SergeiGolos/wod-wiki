import { openDB, deleteDB, type IDBPDatabase, type IDBPTransaction } from 'idb';
import type {
  IReadOnlyStore,
  IReadWriteStore,
  IStorage,
  IStorageTransaction,
  StoreName,
  StoreType,
} from './IStorage';
import type { Session } from '@/types/storage';
import { toEventRows, toSummaryEventRows } from '@bitcobblers/wod-wiki-wql';

const DB_NAME = 'wodwiki-db';
const DB_VERSION = 21;

type IDBTransactionMode = 'readonly' | 'readwrite';

class IDBReadOnlyStore<T> implements IReadOnlyStore<T> {
  constructor(
    private readonly dbPromise: Promise<IDBPDatabase>,
    private readonly storeName: StoreName,
    private readonly existingTx?: IDBPTransaction<any, any, any>
  ) {}

  async get(key: IDBValidKey): Promise<T | undefined> {
    if (this.existingTx) {
      return this.existingTx.objectStore(this.storeName).get(key);
    }
    const db = await this.dbPromise;
    return db.get(this.storeName, key);
  }

  async getAll(query?: IDBValidKey | IDBKeyRange, count?: number): Promise<T[]> {
    if (this.existingTx) {
      return this.existingTx.objectStore(this.storeName).getAll(query, count);
    }
    const db = await this.dbPromise;
    return db.getAll(this.storeName, query, count);
  }

  async getAllFromIndex(indexName: string, query?: IDBValidKey | IDBKeyRange, count?: number): Promise<T[]> {
    if (this.existingTx) {
      return this.existingTx.objectStore(this.storeName).index(indexName).getAll(query, count);
    }
    const db = await this.dbPromise;
    return db.getAllFromIndex(this.storeName, indexName, query, count);
  }

  async count(query?: IDBValidKey | IDBKeyRange): Promise<number> {
    if (this.existingTx) {
      return this.existingTx.objectStore(this.storeName).count(query);
    }
    const db = await this.dbPromise;
    return db.count(this.storeName, query);
  }
}

class IDBReadWriteStore<T> extends IDBReadOnlyStore<T> implements IReadWriteStore<T> {
  constructor(
    private readonly dbPromiseRef: Promise<IDBPDatabase>,
    private readonly writeStoreName: StoreName,
    private readonly activeTx?: IDBPTransaction<any, any, any>
  ) {
    super(dbPromiseRef, writeStoreName, activeTx);
  }

  async put(value: T, key?: IDBValidKey): Promise<IDBValidKey> {
    if (this.activeTx) {
      return this.activeTx.objectStore(this.writeStoreName).put(value, key);
    }
    const db = await this.dbPromiseRef;
    return db.put(this.writeStoreName, value, key);
  }

  async delete(key: IDBValidKey | IDBKeyRange): Promise<void> {
    if (this.activeTx) {
      await this.activeTx.objectStore(this.writeStoreName).delete(key);
      return;
    }
    const db = await this.dbPromiseRef;
    await db.delete(this.writeStoreName, key);
  }

  async clear(): Promise<void> {
    if (this.activeTx) {
      await this.activeTx.objectStore(this.writeStoreName).clear();
      return;
    }
    const db = await this.dbPromiseRef;
    await db.clear(this.writeStoreName);
  }
}

export class IndexedDBStorage implements IStorage {
  private _dbPromise: Promise<IDBPDatabase> | null = null;

  private get dbPromise(): Promise<IDBPDatabase> {
    if (!this._dbPromise) {
      const opening = this.open();
      this._dbPromise = opening;
      opening.catch(() => {
        if (this._dbPromise === opening) this._dbPromise = null;
      });
    }
    return this._dbPromise;
  }

  private open(): Promise<IDBPDatabase> {
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('IndexedDB is unavailable in this environment'));
    }

    return openDB(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        // Fresh-start: if oldVersion < 20, drop all obsolete stores and recreate baseline V21
        if (oldVersion < 20) {
          const names = Array.from(db.objectStoreNames);
          for (const name of names) {
            db.deleteObjectStore(name);
          }
        }

        // 1. notes
        if (!db.objectStoreNames.contains('notes')) {
          const store = db.createObjectStore('notes', { keyPath: 'id' });
          store.createIndex('by-slug', 'slug', { unique: true });
          store.createIndex('by-page', 'pageId');
        }

        // 2. page
        if (!db.objectStoreNames.contains('page')) {
          const store = db.createObjectStore('page', { keyPath: 'id' });
          store.createIndex('by-date', 'date', { unique: true });
          store.createIndex('by-slug', 'slug', { unique: true });
        }

        // 3. tags
        if (!db.objectStoreNames.contains('tags')) {
          const store = db.createObjectStore('tags', { keyPath: 'id' });
          store.createIndex('by-label', 'label', { unique: true });
          store.createIndex('by-type', 'type');
        }

        // 4. note_tags
        if (!db.objectStoreNames.contains('note_tags')) {
          const store = db.createObjectStore('note_tags', { keyPath: 'id' });
          store.createIndex('by-note', 'noteId');
          store.createIndex('by-tag', 'tagId');
        }

        // 5. segments
        if (!db.objectStoreNames.contains('segments')) {
          const store = db.createObjectStore('segments', { keyPath: ['id', 'version'] });
          store.createIndex('by-note', 'noteId');
          store.createIndex('by-type', 'dataType');
          store.createIndex('by-page', 'pageId');
          store.createIndex('by-history', 'isHistory');
        }

        // 6. sessions
        if (!db.objectStoreNames.contains('sessions')) {
          const store = db.createObjectStore('sessions', { keyPath: 'id' });
          store.createIndex('by-segment', 'segmentId');
          store.createIndex('by-note', 'noteId');
          store.createIndex('by-completed', 'createdAt');
          store.createIndex('by-content', 'blockContentId');
          store.createIndex('by-block', 'blockId');
          store.createIndex('by-page', 'pageId');
          store.createIndex('by-origin', 'origin');
        }

        // 7. results (legacy alias)
        if (!db.objectStoreNames.contains('results')) {
          const store = db.createObjectStore('results', { keyPath: 'id' });
          store.createIndex('by-segment', 'segmentId');
          store.createIndex('by-note', 'noteId');
          store.createIndex('by-completed', 'createdAt');
          store.createIndex('by-content', 'blockContentId');
          store.createIndex('by-block', 'blockId');
          store.createIndex('by-page', 'pageId');
          store.createIndex('by-origin', 'origin');
        }

        // 8. attachments
        if (!db.objectStoreNames.contains('attachments')) {
          const store = db.createObjectStore('attachments', { keyPath: 'id' });
          store.createIndex('by-note', 'noteId');
          store.createIndex('by-time', 'createdAt');
          store.createIndex('by-page', 'pageId');
          store.createIndex('by-result', 'resultId');
        }

        // 9. events
        if (!db.objectStoreNames.contains('events')) {
          const store = db.createObjectStore('events', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
          store.createIndex('by-result-grain', ['resultId', 'grain']);
          store.createIndex('by-content-grain', ['blockContentId', 'grain']);
          store.createIndex('by-effort', 'effortSlug');
          store.createIndex('by-outputType', 'outputType');
          store.createIndex('by-grain', 'grain');
          store.createIndex('by-metric-date', 'metricDateKeys', { multiEntry: true });
        }

        // 10. field_catalog
        if (!db.objectStoreNames.contains('field_catalog')) {
          const store = db.createObjectStore('field_catalog', { keyPath: 'id' });
          store.createIndex('by-path', 'path');
        }
        if (!db.objectStoreNames.contains('field_sources')) {
          db.createObjectStore('field_sources', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('field_values')) {
          const store = db.createObjectStore('field_values', { keyPath: 'key' });
          store.createIndex('by-field', 'fieldId');
        }
        if (!db.objectStoreNames.contains('field_catalog_meta')) {
          db.createObjectStore('field_catalog_meta', { keyPath: 'id' });
        }

        // 11. efforts
        if (!db.objectStoreNames.contains('efforts')) {
          const store = db.createObjectStore('efforts', { keyPath: 'slug' });
          store.createIndex('by-discipline', 'baseAttributes.discipline');
          store.createIndex('by-source', 'registrySource');
        }

        // 12. block_index
        if (!db.objectStoreNames.contains('block_index')) {
          const store = db.createObjectStore('block_index', { keyPath: 'id' });
          store.createIndex('by-note', 'noteId');
          store.createIndex('by-content', 'blockContentId');
          store.createIndex('by-type', 'dataType');
        }

        // 13. meta
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }

        // V20 -> V21 upgrade: flatten sessions, drop data.logs, project legacy logs idempotently
        if (oldVersion === 20 && db.objectStoreNames.contains('sessions')) {
          const sessionsStore = tx.objectStore('sessions');
          const eventsStore = tx.objectStore('events');
          for await (const cursor of sessionsStore) {
            const legacy = cursor.value as Session & {
              data?: {
                logs?: unknown[];
                startTime?: number;
                endTime?: number;
                duration?: number;
                completed?: boolean;
                roundsCompleted?: number;
                totalRounds?: number;
                repsCompleted?: number;
              };
            };
            const logs = legacy.data?.logs ?? [];
            let alreadyProjected = false;
            for await (const _ev of eventsStore.index('by-result-grain').iterate(IDBKeyRange.bound([legacy.id, ''], [legacy.id, []]))) {
              alreadyProjected = true;
              break;
            }
            if (!alreadyProjected && logs.length > 0) {
              const identity = {
                noteId: legacy.noteId,
                resultId: legacy.id,
                segmentId: legacy.segmentId,
                segmentVersion: legacy.segmentVersion,
                blockContentId: legacy.blockContentId,
                origin: legacy.origin,
                pageId: legacy.pageId,
                workoutTimestamp: legacy.data?.endTime ?? legacy.createdAt,
              };
              const eventRows = toEventRows(logs as never, identity);
              const summaryRows = toSummaryEventRows(logs as never, identity);
              for (const row of eventRows) await eventsStore.put(row);
              for (const row of summaryRows) await eventsStore.put(row);
            }
            const flat: Session = {
              ...legacy,
              startTime: legacy.data?.startTime ?? legacy.createdAt,
              endTime: legacy.data?.endTime ?? legacy.createdAt,
              duration: legacy.data?.duration ?? 0,
              completed: legacy.data?.completed ?? true,
              roundsCompleted: legacy.data?.roundsCompleted,
              totalRounds: legacy.data?.totalRounds,
              repsCompleted: legacy.data?.repsCompleted,
            };
            delete (flat as unknown as Record<string, unknown>).data;
            await cursor.update(flat);
          }
        }
      },
      blocked: (currentVersion, blockedVersion) => {
        console.warn(
          `[IndexedDBStorage] open of ${DB_NAME} v${blockedVersion ?? DB_VERSION} blocked by v${currentVersion} in another tab`
        );
      },
      blocking: (currentVersion, blockedVersion) => {
        console.warn(
          `[IndexedDBStorage] yielding ${DB_NAME} v${currentVersion} to v${blockedVersion} upgrade from another tab`
        );
        if (this._dbPromise) {
          this._dbPromise.then((db) => db.close()).catch(() => {});
          this._dbPromise = null;
        }
      },
    });
  }

  readonly<K extends StoreName>(store: K): IReadOnlyStore<StoreType<K>> {
    return new IDBReadOnlyStore<StoreType<K>>(this.dbPromise, store);
  }

  readwrite<K extends StoreName>(store: K): IReadWriteStore<StoreType<K>> {
    return new IDBReadWriteStore<StoreType<K>>(this.dbPromise, store);
  }

  async transaction<K extends StoreName, R>(
    stores: K[],
    mode: IDBTransactionMode,
    fn: (tx: IStorageTransaction) => Promise<R>
  ): Promise<R> {
    const db = await this.dbPromise;
    const idbTx = db.transaction(stores, mode);
    const txAdapter: IStorageTransaction = {
      readonly: (name) => new IDBReadOnlyStore(this.dbPromise, name, idbTx),
      readwrite: (name) => new IDBReadWriteStore(this.dbPromise, name, idbTx),
    };
    const result = await fn(txAdapter);
    await idbTx.done;
    return result;
  }

  async wipe(): Promise<void> {
    await this.close();
    if (typeof indexedDB !== 'undefined') {
      await deleteDB(DB_NAME);
    }
  }

  async close(): Promise<void> {
    if (this._dbPromise) {
      const db = await this._dbPromise.catch(() => null);
      db?.close();
      this._dbPromise = null;
    }
  }
}
