/**
 * App adapter — IFieldCatalog over the V17 IndexedDB catalog stores
 * (wayfinder datadog-analytics ticket 15). Every lookup is a bounded index
 * read; no events/results store is ever touched. Change notification is a
 * simple listener registry that the catalog-mutating seams signal after
 * commit (typeahead re-queries without reload).
 */

import type { IDBPDatabase } from 'idb';
import type {
    CatalogFieldSuggestion,
    CatalogValueSuggestion,
    IFieldCatalog,
} from '@bitcobblers/wod-wiki-wql';
import type { FieldCatalogEntry, WodWikiDB } from '@/types/storage';
import { IndexedDBService, indexedDBService } from '@/services/db/IndexedDBService';
import type { FieldValueRecord } from '@bitcobblers/wod-wiki-core';

type FieldCatalogValueRecord = FieldValueRecord;

function entryToSuggestion(entry: FieldCatalogEntry): CatalogFieldSuggestion {
    return {
        id: entry.id,
        path: entry.path,
        kind: entry.kind,
        ...(entry.dimension ? { dimension: entry.dimension } : {}),
        units: Object.keys(entry.units ?? {}),
        spellings: Object.keys(entry.spellings ?? {}),
    };
}

export class IndexedDbFieldCatalog implements IFieldCatalog {
    private readonly listeners = new Set<() => void>();

    constructor(private readonly store: IndexedDBService) {}

    private async database(): Promise<IDBPDatabase<WodWikiDB>> {
        return (this.store as unknown as { dbPromise: Promise<IDBPDatabase<WodWikiDB>> }).dbPromise;
    }

    async listByPrefix(prefix: string, limit = 20): Promise<CatalogFieldSuggestion[]> {
        const db = await this.database();
        const upper = `${prefix}\uFFFF`;
        const range = prefix
            ? IDBKeyRange.bound(prefix, upper, false, true)
            : undefined;
        const entries: FieldCatalogEntry[] = [];
        let cursor = await db.transaction('field_catalog').store.index('by-path').openCursor(range);
        while (cursor && entries.length < limit) {
            entries.push(cursor.value);
            cursor = await cursor.continue();
        }
        return entries.map(entryToSuggestion);
    }

    async lookup(path: string): Promise<CatalogFieldSuggestion[]> {
        const db = await this.database();
        const entries: FieldCatalogEntry[] = [];
        let cursor = await db.transaction('field_catalog').store.index('by-path').openCursor(IDBKeyRange.only(path));
        while (cursor) {
            entries.push(cursor.value);
            cursor = await cursor.continue();
        }
        return entries.map(entryToSuggestion);
    }

    async listValues(path: string, valuePrefix: string, limit = 20): Promise<CatalogValueSuggestion[]> {
        const db = await this.database();
        const variants = await this.lookup(path);
        const out: CatalogValueSuggestion[] = [];
        for (const variant of variants) {
            if (out.length >= limit) break;
            const range = valuePrefix
                ? IDBKeyRange.bound([variant.id, valuePrefix], [variant.id, `${valuePrefix}\uFFFF`], false, true)
                : IDBKeyRange.bound([variant.id, ''], [variant.id, '\uFFFF']);
            const page: FieldCatalogValueRecord[] = await db.getAllFromIndex('field_values', 'by-field', range, limit - out.length);
            for (const record of page) {
                out.push({ fieldId: record.fieldId, value: record.value });
            }
        }
        return out;
    }
    /** Signal listeners after a catalog commit (called by the app seams). */
    notifyChanged(): void {
        for (const listener of this.listeners) listener();
    }

    /** Wire the store's post-commit signal to the change listeners. */
    observeStore(store: IndexedDBService): void {
        store.onCatalogChanged(() => this.notifyChanged());
    }
}

/** App singleton — the injected catalog for every authoring surface. */
export const fieldCatalog = new IndexedDbFieldCatalog(indexedDBService);
fieldCatalog.observeStore(indexedDBService);
/**
 * Ticket 14 — resumable initial population, invoked by app bootstrap (NOT
 * at module scope: test environments have no IndexedDB). Safe to call
 * repeatedly: a completed backfill is a no-op and concurrent live saves
 * never double-count (per-source re-check inside each batch).
 */
export function startFieldCatalogBackfill(): void {
    indexedDBService.ensureFieldCatalogBackfill().catch(() => {});
}
