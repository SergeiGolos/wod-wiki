/**
 * TelemetryService — the product-funnel seam (CONTEXT.md: service pattern).
 *
 * Records named events (e.g. the `home:*` funnel) to a dedicated
 * `wodwiki-telemetry` IndexedDB database — deliberately separate from the
 * workout fact store so funnel events never reach WQL queries or rollups.
 *
 * Local-always: `record()` persists regardless of consent. External
 * forwarding (gtag) happens only through the injected forwarder and only
 * after `setConsent(true)`. Consent persists in Storage.
 */
import { SimpleEventBus } from '@/services/events/SimpleEventBus';

export interface TelemetryEvent {
  name: string;
  payload?: Record<string, unknown>;
  at: number;
}

export type TelemetryForwarder = (event: TelemetryEvent) => void;

export interface TelemetryServiceOptions {
  /** Consent persistence; defaults to globalThis.localStorage when present. */
  storage?: Storage;
  /** External sink (gtag wiring lives in the playground shell). */
  forwarder?: TelemetryForwarder;
  /** Injectable for tests; defaults to globalThis.indexedDB. */
  idb?: IDBFactory;
}

const DB_NAME = 'wodwiki-telemetry';
const DB_VERSION = 1;
const STORE = 'events';
const CONSENT_KEY = 'wodwiki.telemetry.consent';

export class TelemetryService {
  readonly events = new SimpleEventBus<TelemetryEvent>();
  private consentListeners = new Set<(consent: boolean) => void>();
  private storage?: Storage;
  private forwarder?: TelemetryForwarder;
  private idb?: IDBFactory;
  private dbPromise?: Promise<IDBDatabase | null>;
  private _consent: boolean;

  /** Wire/replace the external sink (playground shell injects gtag). */
  setForwarder(forwarder: TelemetryForwarder | undefined): void {
    this.forwarder = forwarder;
  }

  constructor(options: TelemetryServiceOptions = {}) {
    this.storage =
      options.storage ??
      (typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage : undefined);
    this.forwarder = options.forwarder;
    this.idb = options.idb ?? (typeof indexedDB !== 'undefined' ? indexedDB : undefined);
    this._consent = this.storage?.getItem(CONSENT_KEY) === 'granted';
  }

  get consent(): boolean {
    return this._consent;
  }

  setConsent(granted: boolean): void {
    if (this._consent === granted) return;
    this._consent = granted;
    try {
      this.storage?.setItem(CONSENT_KEY, granted ? 'granted' : 'denied');
    } catch {
      /* storage unavailable — consent stays session-local */
    }
    this.consentListeners.forEach((fn) => fn(granted));
  }

  subscribeConsent(fn: (consent: boolean) => void): () => void {
    this.consentListeners.add(fn);
    return () => this.consentListeners.delete(fn);
  }

  /** Local-always record; forwards only when consent is granted. */
  record(name: string, payload?: Record<string, unknown>): void {
    const event: TelemetryEvent = { name, payload, at: Date.now() };
    void this.persist(event);
    this.events.emit(event);
    if (this._consent && this.forwarder) {
      try {
        this.forwarder(event);
      } catch (err) {
        console.error('[TelemetryService] forwarder error:', err);
      }
    }
  }

  /** Read back locally recorded events (debug views, tests). */
  async list(): Promise<TelemetryEvent[]> {
    const db = await this.open();
    if (!db) return [];
    const { promise, resolve, reject } = Promise.withResolvers<TelemetryEvent[]>();
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () =>
      resolve(
        (req.result as TelemetryEvent[]).map(({ name, payload, at }) => ({ name, payload, at })),
      );
    req.onerror = () => reject(req.error);
    return promise;
  }

  private async persist(event: TelemetryEvent): Promise<void> {
    const db = await this.open();
    if (!db) return;
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(event);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    return promise;
  }

  private open(): Promise<IDBDatabase | null> {
    if (!this.idb) return Promise.resolve(null);
    this.dbPromise ??= this.openDatabase();
    return this.dbPromise;
  }

  private async openDatabase(): Promise<IDBDatabase | null> {
    const { promise, resolve, reject } = Promise.withResolvers<IDBDatabase>();
    const req = this.idb!.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('by-name', 'name');
        store.createIndex('by-at', 'at');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    return promise.catch((err) => {
      console.error('[TelemetryService] open failed:', err);
      return null;
    });
  }
}
/** App-wide telemetry singleton. The forwarder is wired by the playground shell (lib/telemetry-gtag). */
export const telemetry = new TelemetryService();
