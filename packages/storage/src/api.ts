/**
 * ApiStorage — fetch-based IStorage backend speaking the pinned /v1 wire
 * protocol (implemented by wod-wiki-api). Reads overlay a per-tx write buffer
 * on top of server reads (buffered put replaces a row, buffered delete removes
 * it, matched by encoded key); writes buffer only and flush as ONE
 * POST /v1/tx on fn success. A thrown fn discards the buffer (no request).
 *
 * Signature extension over IStorage: query/delete args also accept plain
 * RangeDTO literals so non-IDB runtimes (Bun, node, tests) can drive this
 * client without an IDBKeyRange global. Range deletes have no TxOp on the
 * pinned wire — they travel as DELETE /v1/:store?key=<RangeDTO> calls.
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
import {
  encodeKey,
  isRange,
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
interface BufferedRangeDelete { kind: 'deleteRange'; range: RangeDTO }
type BufferEntry = BufferedPut | BufferedDelete | BufferedRangeDelete;

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

async function remoteCount(http: Http, store: StoreName, range: RangeDTO | undefined): Promise<number> {
  const params = new URLSearchParams();
  if (range) params.set('range', JSON.stringify(range));
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

  constructor(baseUrl: string = '/api', fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis)) {
    this.http = { baseUrl, fetchImpl };
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
    return new ApiStore<StoreType<K>>(this.http, this.def(store), store, buffer, cleared);
  }

  readonly<K extends StoreName>(store: K): IReadOnlyStore<StoreType<K>> {
    return this.makeView(store);
  }

  readwrite<K extends StoreName>(store: K): IReadWriteStore<StoreType<K>> {
    return this.makeView(store);
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
    const rangeDeletes: Array<{ store: StoreName; range: RangeDTO }> = [];
    for (const store of cleared) ops.push({ op: 'clear', store });
    for (const [slot, entry] of buffer) {
      const sep = slot.indexOf('\u0000');
      const store = slot.slice(0, sep) as StoreName;
      if (entry.kind === 'put') ops.push({ op: 'put', store, value: entry.value });
      else if (entry.kind === 'delete') ops.push({ op: 'delete', store, key: JSON.parse(slot.slice(sep + 1)) as KeyDTO });
      else rangeDeletes.push({ store, range: entry.range });
    }
    // ponytail: the pinned TxOp has no range-delete variant, so range deletes
    // flush as DELETE calls ahead of the tx POST; add a wire op if tx-atomic
    // range deletes are ever needed.
    for (const { store, range } of rangeDeletes) await remoteDelete(this.http, store, range);
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
   * Point lookup against the buffer, replaying entries in op order: an exact
   * put/delete or a covering range delete wins; undefined = consult server.
   */
  private bufferedGet(key: KeyDTO): { hit: true; value: T } | { hit: false } | undefined {
    if (!this.buffer) return undefined;
    const slotFor = bufferSlot(this.store, key);
    const prefix = `${this.store}\u0000`;
    let state: { hit: true; value: T } | { hit: false } | undefined;
    for (const [slot, entry] of this.buffer) {
      if (!slot.startsWith(prefix)) continue;
      if (entry.kind === 'deleteRange') {
        if (keyInRange(key, entry.range)) state = { hit: false };
      } else if (slot === slotFor) {
        state = entry.kind === 'put' ? { hit: true, value: entry.value as T } : { hit: false };
      }
    }
    return state;
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
    return this.overlay(await this.serverRows('all', rangeFromIDB(query)), count);
  }

  async getAllFromIndex(indexName: string, query?: QueryArg, count?: number): Promise<T[]> {
    return this.overlay(await this.serverRows(`index/${encodeURIComponent(indexName)}`, rangeFromIDB(query)), count);
  }

  async count(query?: QueryArg): Promise<number> {
    const range = rangeFromIDB(query);
    if (!this.dirty()) return remoteCount(this.http, this.store, range);
    return this.overlay(await this.serverRows('all', range)).length;
  }

  /** Server rows for a list path, or none when this tx cleared the store. */
  private serverRows(path: string, range: RangeDTO | undefined, count?: number): Promise<T[]> {
    if (this.cleared?.has(this.store)) return Promise.resolve([]);
    return remoteList<T>(this.http, this.store, path, range, count);
  }

  /** Applies the write buffer to server rows in op order: put upsert, delete removes, range delete wipes. */
  private overlay(rows: T[], count?: number): T[] {
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
      else if (entry.kind === 'delete') out.delete(slot.slice(prefix.length));
      else for (const keyJson of [...out.keys()]) {
        const parsed = JSON.parse(keyJson) as KeyDTO; // our own encodeKey output
        if (keyInRange(parsed, entry.range)) out.delete(keyJson);
      }
    }
    const merged = [...out.values()];
    return count !== undefined ? merged.slice(0, count) : merged;
  }

  async put(value: T, _key?: IDBValidKey): Promise<IDBValidKey> {
    const key = keyFromValue(this.def, value);
    if (this.buffer) {
      this.buffer.set(bufferSlot(this.store, key), { kind: 'put', value });
      return key;
    }
    await request(this.http, 'POST', '/tx', { body: { ops: [{ op: 'put', store: this.store, value }] } });
    return key;
  }

  async delete(key: IDBValidKey | IDBKeyRange | RangeDTO): Promise<void> {
    const range = isRange(key) ? key : undefined;
    if (range) {
      if (this.buffer) {
        this.buffer.set(`${this.store}\u0000${JSON.stringify(range)}`, { kind: 'deleteRange', range });
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
