import type {
  Attachment,
  BlockIndexRow,
  EventRecord,
  Note,
  NoteSegment,
  NoteTag,
  Page,
  Session,
  Tag,
} from '@/types/storage';
import type {
  CatalogBackfillState,
  FieldCatalogEntry,
  FieldSourceRecord,
  FieldValueRecord,
} from '@bitcobblers/wod-wiki-core';
import type { IEffort } from '@bitcobblers/wod-wiki-lang';

export interface StorageSchema {
  notes: Note;
  page: Page;
  tags: Tag;
  note_tags: NoteTag;
  segments: NoteSegment;
  results: Session;
  sessions: Session;
  attachments: Attachment;
  events: EventRecord;
  field_catalog: FieldCatalogEntry;
  field_sources: FieldSourceRecord;
  field_values: FieldValueRecord;
  field_catalog_meta: CatalogBackfillState;
  efforts: IEffort;
  block_index: BlockIndexRow;
  meta: unknown;
}

export type StoreName = keyof StorageSchema;
export type StoreType<K extends StoreName> = StorageSchema[K];

export interface IReadOnlyStore<T> {
  get(key: IDBValidKey): Promise<T | undefined>;
  getAll(query?: IDBValidKey | IDBKeyRange, count?: number): Promise<T[]>;
  getAllFromIndex(indexName: string, query?: IDBValidKey | IDBKeyRange, count?: number): Promise<T[]>;
  count(query?: IDBValidKey | IDBKeyRange): Promise<number>;
}

export interface IReadWriteStore<T> extends IReadOnlyStore<T> {
  put(value: T, key?: IDBValidKey): Promise<IDBValidKey>;
  delete(key: IDBValidKey | IDBKeyRange): Promise<void>;
  clear(): Promise<void>;
}

export interface IStorageTransaction {
  readonly<K extends StoreName>(store: K): IReadOnlyStore<StoreType<K>>;
  readwrite<K extends StoreName>(store: K): IReadWriteStore<StoreType<K>>;
}

export interface IStorage {
  readonly<K extends StoreName>(store: K): IReadOnlyStore<StoreType<K>>;
  readwrite<K extends StoreName>(store: K): IReadWriteStore<StoreType<K>>;
  transaction<K extends StoreName, R>(
    stores: K[],
    mode: 'readonly' | 'readwrite',
    fn: (tx: IStorageTransaction) => Promise<R>
  ): Promise<R>;
  wipe(): Promise<void>;
  close(): Promise<void>;
}
