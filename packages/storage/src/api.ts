/**
 * ApiStorage — fetch-based IStorage backend speaking the pinned /v1 wire
 * protocol (implemented by wod-wiki-api). Reads overlay a per-tx write buffer
 * on top of server reads (buffered put replaces a row, buffered delete removes
 * it, matched by encoded key); writes buffer only and flush as ONE
 * POST /v1/tx on fn success. A thrown fn discards the buffer (no request).
 *
 * Signature extension over IStorage: query/delete args also accept plain
 * RangeDTO literals so non-IDB runtimes (Bun, node, tests) can drive this
 * client without an IDBKeyRange global. Transactional range deletes expand
 * matching primary keys into scalar delete ops on the existing /tx wire.
 */

import type {
  IReadWriteStore,
  IReadOnlyStore,
  IStorage,
  IStorageTransaction,
  StoreName,
  StoreType,
} from './contract';
import { STORE_DEFS, type StoreDef } from './schema';
import { stampUserOwned } from './membership';
import { parseDomainQueryResult, type DomainQuery, type DomainQueryResult } from './domain';
import {
  encodeKey,
  isRange,
  compareKeys,
  extractKeyPart,
  keyFromValue,
  keyInRange,
  rangeFromIDB,
  type KeyDTO,
  type RangeDTO,
  type TxOp,
} from './wire';

/** Query/delete argument: IndexedDB key forms plus the wire RangeDTO. */
type QueryArg = IDBValidKey | IDBKeyRange | RangeDTO;

interface BufferedPut { kind: 'put'; value: unknown }
interface BufferedDelete { kind: 'delete'; key: KeyDTO }
type BufferEntry = BufferedPut | BufferedDelete;

interface Http { baseUrl: string; fetchImpl: typeof fetch }

// Buffer slot key: store + \u0000 + raw JSON of the key (JSON text never
// contains a literal \u0000, so the separator is unambiguous).
const bufferSlot = (store: StoreName, key: KeyDTO): string => `${store}\u0000${JSON.stringify(key)}`;

// ── HTTP layer (module functions; one shared client instance passes `Http`) ──

async function request(
  http: Http,
  method: string,
  path: string,
  init?: { body?: unknown; params?: URLSearchParams },
): Promise<Response> {
  const qs = init?.params?.toString();
  const res = await http.fetchImpl(`${http.baseUrl}/v1${path}${qs ? `?${qs}` : ''}`, {
    method,
    headers: init?.body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) throw new Error(`ApiStorage: ${method} /v1${path} → ${res.status}`);
  return res;
}

async function remoteGet<T>(http: Http, store: StoreName, key: KeyDTO): Promise<T | undefined> {
  const res = await http.fetchImpl(`${http.baseUrl}/v1/${store}/get?key=${encodeKey(key)}`);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`ApiStorage: GET /v1/${store}/get → ${res.status}`);
  return (await res.json()) as T;
}

async function remoteList<T>(
  http: Http,
  store: StoreName,
  path: string,
  range: RangeDTO | undefined,
  count?: number,
): Promise<T[]> {
  const params = new URLSearchParams();
  if (range) params.set('range', JSON.stringify(range));
  if (count !== undefined) params.set('count', String(count));
  const res = await request(http, 'GET', `/${store}/${path}`, { params });
  return (await res.json()) as T[];
}

async function remoteCount(http: Http, store: StoreName, range: RangeDTO | undefined, indexName?: string): Promise<number> {
  const params = new URLSearchParams();
  if (range) params.set('range', JSON.stringify(range));
  if (indexName !== undefined) params.set('index', indexName);
  const res = await request(http, 'GET', `/${store}/count`, { params });
  return ((await res.json()) as { count: number }).count;
}

/** DELETE /v1/:store?key= — key or range as JSON; URLSearchParams owns the percent-encoding (encodeKey would double-encode). */
async function remoteDelete(http: Http, store: StoreName, keyOrRange: KeyDTO | RangeDTO): Promise<void> {
  await request(http, 'DELETE', `/${store}`, { params: new URLSearchParams({ key: JSON.stringify(keyOrRange) }) });
}

export class ApiStorage implements IStorage {
  private readonly http: Http;
  private readonly defs: Record<StoreName, StoreDef>;
  /** Injected identity: user-owned rows are stamped with this on write. */
  private readonly getUserId?: () => string;

  constructor(
    baseUrl: string = '/api',
    fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
    options: { getUserId?: () => string } = {},
  ) {
    this.http = { baseUrl, fetchImpl };
    this.getUserId = options.getUserId;
    // Keys are StoreName by construction (STORE_DEFS[].name is typed so).
    this.defs = Object.fromEntries(STORE_DEFS.map((d) => [d.name, d])) as Record<StoreName, StoreDef>;
  }

  def(store: StoreName): StoreDef {
    const def = this.defs[store];
    if (!def) throw new Error(`ApiStorage: unknown store '${store}'`);
    return def;
  }

  private makeView<K extends StoreName>(
    store: K,
    buffer?: Map<string, BufferEntry>,
    cleared?: Set<StoreName>,
  ): IReadWriteStore<StoreType<K>> {
    return new ApiStore<StoreType<K>>(this.http, this.def(store), store, buffer, cleared, this.getUserId);
  }

  readonly<K extends StoreName>(store: K): IReadOnlyStore<StoreType<K>> {
    return this.makeView(store);
  }

  readwrite<K extends StoreName>(store: K): IReadWriteStore<StoreType<K>> {
    return this.makeView(store);
  }
  async queryDomain(query: DomainQuery): Promise<DomainQueryResult | undefined> {
    const res = await this.http.fetchImpl(`${this.http.baseUrl}/v1/query`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(query),
    });
    if (res.status === 409) {
      const error: unknown = await res.json();
      if (typeof error === 'object' && error !== null && 'code' in error
        && error.code === 'domain_projection_unavailable') return undefined;
    }
    if (!res.ok) throw new Error(`ApiStorage: POST /v1/query → ${res.status}`);
    return parseDomainQueryResult(await res.json(), query.plan);
  }

  async transaction<K extends StoreName, R>(
    _stores: K[],
    _mode: 'readonly' | 'readwrite',
    fn: (tx: IStorageTransaction) => Promise<R>,
  ): Promise<R> {
    const buffer = new Map<string, BufferEntry>();
    const cleared = new Set<StoreName>();
    const tx: IStorageTransaction = {
      readonly: <S extends StoreName>(store: S) => this.makeView(store, buffer, cleared),
      readwrite: <S extends StoreName>(store: S) => this.makeView(store, buffer, cleared),
    };
    const result = await fn(tx);
    await this.flush(buffer, cleared);
    return result;
  }

  /** Sends buffered ops as one server-side SQL transaction. */
  private async flush(buffer: Map<string, BufferEntry>, cleared: Set<StoreName>): Promise<void> {
    const ops: TxOp[] = [];
    for (const store of cleared) ops.push({ op: 'clear', store });
    for (const [slot, entry] of buffer) {
      const sep = slot.indexOf('\u0000');
      const store = slot.slice(0, sep) as StoreName;
      if (entry.kind === 'put') ops.push({ op: 'put', store, value: entry.value });
      else if (entry.kind === 'delete') ops.push({ op: 'delete', store, key: JSON.parse(slot.slice(sep + 1)) as KeyDTO });
    }
    if (ops.length > 0) await request(this.http, 'POST', '/tx', { body: { ops } });
  }

  async wipe(): Promise<void> {
    await request(this.http, 'POST', '/wipe');
  }

  async close(): Promise<void> {
    // stateless HTTP client — nothing to release
  }
}

/**
 * Store view. Outside a transaction (`buffer` undefined) every write posts
 * immediately; inside one, writes land in the shared buffer and reads overlay
 * it on server responses in op order, matching rows by encoded primary key.
 */
class ApiStore<T> implements IReadWriteStore<T> {
  constructor(
    private readonly http: Http,
    private readonly def: StoreDef,
    private readonly store: StoreName,
    private readonly buffer?: Map<string, BufferEntry>,
    private readonly cleared?: Set<StoreName>,
    private readonly getUserId?: () => string,
  ) {}

  /** True when this tx has buffered writes for this store. */
  private dirty(): boolean {
    if (this.cleared?.has(this.store)) return true;
    if (!this.buffer) return false;
    const prefix = `${this.store}\u0000`;
    for (const slot of this.buffer.keys()) {
      if (slot.startsWith(prefix)) return true;
    }
    return false;
  }

  /**
   * Point lookup against the buffer; undefined means consult the server.
   */
  private bufferedGet(key: KeyDTO): { hit: true; value: T } | { hit: false } | undefined {
    if (!this.buffer) return undefined;
    const entry = this.buffer.get(bufferSlot(this.store, key));
    if (!entry) return undefined;
    return entry.kind === 'put' ? { hit: true, value: entry.value as T } : { hit: false };
  }

  async get(key: IDBValidKey | RangeDTO): Promise<T | undefined> {
    const range = isRange(key) ? key : undefined;
    let k: KeyDTO;
    if (range) {
      if (range.only === undefined) {
        throw new Error('ApiStorage.get: needs a plain key or {only}; bounded ranges match no single row');
      }
      k = range.only;
    } else {
      // IDBValidKey ⊃ KeyDTO (Date/ArrayBuffer keys are outside the wire subset).
      k = key as KeyDTO;
    }
    const state = this.bufferedGet(k);
    if (state) return state.hit ? state.value : undefined;
    if (this.cleared?.has(this.store)) return undefined;
    return remoteGet<T>(this.http, this.store, k);
  }

  async getAll(query?: QueryArg, count?: number): Promise<T[]> {
    const range = rangeFromIDB(query);
    return this.overlay(await this.serverRows('all', range, this.dirty() ? undefined : count), count, range);
  }

  async getAllFromIndex(indexName: string, query?: QueryArg, count?: number): Promise<T[]> {
    const range = rangeFromIDB(query);
    return this.overlay(await this.serverRows(`index/${encodeURIComponent(indexName)}`, range, this.dirty() ? undefined : count), count, range, indexName);
  }

  async count(query?: QueryArg): Promise<number> {
    const range = rangeFromIDB(query);
    if (!this.dirty()) return remoteCount(this.http, this.store, range);
    return this.overlay(await this.serverRows('all', range), undefined, range).length;
  }

  async countFromIndex(indexName: string, query?: QueryArg): Promise<number> {
    const range = rangeFromIDB(query);
    if (!this.dirty()) return remoteCount(this.http, this.store, range, indexName);
    return this.overlay(await this.serverRows(`index/${encodeURIComponent(indexName)}`, range), undefined, range, indexName).length;
  }

  /** Server rows for a list path, or none when this tx cleared the store. */
  private serverRows(path: string, range: RangeDTO | undefined, count?: number): Promise<T[]> {
    if (this.cleared?.has(this.store)) return Promise.resolve([]);
    return remoteList<T>(this.http, this.store, path, range, count);
  }

  /** Applies buffered puts and deletes before range filtering, ordering and paging. */
  private overlay(rows: T[], count?: number, range?: RangeDTO, indexName?: string): T[] {
    if (!this.buffer || !this.dirty()) return count !== undefined ? rows.slice(0, count) : rows;
    const out = new Map<string, T>();
    if (!this.cleared?.has(this.store)) {
      // Out-map keys are raw JSON key text — same form as buffer slot suffixes.
      for (const row of rows) out.set(JSON.stringify(keyFromValue(this.def, row)), row);
    }
    const prefix = `${this.store}\u0000`;
    for (const [slot, entry] of this.buffer) {
      if (!slot.startsWith(prefix)) continue;
      if (entry.kind === 'put') out.set(slot.slice(prefix.length), entry.value as T);
      else out.delete(slot.slice(prefix.length));
    }
    // Dirty reads fetch the complete candidate range: buffered deletes can
    // remove the remote head, and puts can change index membership or order.
    const index = indexName ? this.def.indexes.find(i => i.name === indexName) : undefined;
    if (indexName && !index) throw new Error(`ApiStorage: unknown index '${indexName}'`);
    const keyOf = (row: T): KeyDTO | undefined => {
      if (!index) return keyFromValue(this.def, row);
      const parts = index.keyPath.map(path => extractKeyPart(row, path));
      if (parts.some(part => part === undefined)) return undefined;
      const keys = parts.filter((part): part is string | number => part !== undefined);
      return keys.length === 1 ? keys[0] : keys;
    };
    const matches = (row: T): boolean => {
      if (index?.multiEntry) {
        let values: unknown = row;
        for (const part of index.keyPath[0].split('.')) {
          if (values === null || typeof values !== 'object' || !(part in values)) return false;
          values = Reflect.get(values, part);
        }
        return Array.isArray(values) && values.some(value =>
          (typeof value === 'string' || typeof value === 'number') && (!range || keyInRange(value, range)));
      }
      const key = keyOf(row);
      return key !== undefined && (!range || keyInRange(key, range));
    };
    const merged = [...out.values()].filter(matches);
    merged.sort((a, b) => {
      const primary = compareKeys(keyFromValue(this.def, a), keyFromValue(this.def, b));
      if (index?.multiEntry) return primary;
      const ak = keyOf(a), bk = keyOf(b);
      return ak !== undefined && bk !== undefined ? compareKeys(ak, bk) || primary : primary;
    });
    return count !== undefined ? merged.slice(0, count) : merged;
  }

  async put(value: T, _key?: IDBValidKey): Promise<IDBValidKey> {
    const userId = this.getUserId?.();
    const stored = userId ? (stampUserOwned(this.store, value, userId) as T) : value;
    const key = keyFromValue(this.def, stored);
    if (this.buffer) {
      this.buffer.set(bufferSlot(this.store, key), { kind: 'put', value: stored });
      return key;
    }
    await request(this.http, 'POST', '/tx', { body: { ops: [{ op: 'put', store: this.store, value: stored }] } });
    return key;
  }

  async delete(key: IDBValidKey | IDBKeyRange | RangeDTO): Promise<void> {
    const range = isRange(key) ? key : undefined;
    if (range) {
      if (this.buffer) {
        const rows = await this.getAll(range);
        for (const row of rows) {
          const key = keyFromValue(this.def, row);
          this.buffer.set(bufferSlot(this.store, key), { kind: 'delete', key });
        }
        return;
      }
      await remoteDelete(this.http, this.store, range);
      return;
    }
    // IDBValidKey ⊃ KeyDTO (exotic keys pass through lossy).
    const k = key as KeyDTO;
    if (this.buffer) {
      this.buffer.set(bufferSlot(this.store, k), { kind: 'delete', key: k });
      return;
    }
    await remoteDelete(this.http, this.store, k);
  }

  async clear(): Promise<void> {
    if (this.buffer) {
      this.cleared?.add(this.store);
      const prefix = `${this.store}\u0000`;
      for (const slot of [...this.buffer.keys()]) {
        if (slot.startsWith(prefix)) this.buffer.delete(slot);
      }
      return;
    }
    await request(this.http, 'POST', '/tx', { body: { ops: [{ op: 'clear', store: this.store }] } });
  }
}
