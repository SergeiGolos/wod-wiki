/**
 * App adapter — IFieldCatalog over the V17 IndexedDB catalog stores
 * (wayfinder datadog-analytics ticket 15). Every lookup is a bounded index
 * read; no events/results store is ever touched. Change notification is a
 * simple listener registry that the catalog-mutating seams signal after
 * commit (typeahead re-queries without reload).
 */

import type {
    CatalogFieldSuggestion,
    CatalogValueSuggestion,
    IFieldCatalog,
} from '@bitcobblers/wod-wiki-wql';
import type { FieldCatalogEntry } from '@/types/storage';
import { storage, type IStorage } from '@/services/storage';
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

    constructor(private readonly storageInstance: IStorage = storage) {}

    async listByPrefix(prefix: string, limit = 20): Promise<CatalogFieldSuggestion[]> {
        const range = prefix && typeof IDBKeyRange !== 'undefined'
            ? IDBKeyRange.bound(prefix, `${prefix}\uFFFF`, false, true)
            : undefined;
        const entries = await this.storageInstance.readonly('field_catalog').getAllFromIndex('by-path', range, limit);
        return entries.map(entryToSuggestion);
    }

    async lookup(path: string): Promise<CatalogFieldSuggestion[]> {
        const entries = await this.storageInstance.readonly('field_catalog').getAllFromIndex('by-path', path);
        return entries.map(entryToSuggestion);
    }

    async listValues(path: string, valuePrefix: string, limit = 20): Promise<CatalogValueSuggestion[]> {
        const variants = await this.lookup(path);
        const out: CatalogValueSuggestion[] = [];
        for (const variant of variants) {
            if (out.length >= limit) break;
            const range = valuePrefix && typeof IDBKeyRange !== 'undefined'
                ? IDBKeyRange.bound([variant.id, valuePrefix], [variant.id, `${valuePrefix}\uFFFF`], false, true)
                : undefined;
            const page = await this.storageInstance.readonly('field_values').getAllFromIndex('by-field', range, limit - out.length);
            for (const record of page) {
                out.push({ fieldId: record.fieldId, value: record.value });
            }
        }
        return out;
    }

    notifyChanged(): void {
        for (const listener of this.listeners) listener();
    }

    observeStore(_store?: unknown): void {
        // Post-commit notification hook
    }
}

export const fieldCatalog = new IndexedDbFieldCatalog(storage);

export function startFieldCatalogBackfill(): void {}
