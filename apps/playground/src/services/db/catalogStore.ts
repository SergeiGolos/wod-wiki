/**
 * Catalog store — transactional reference-count maintenance for the V17
 * field catalog stores (wayfinder datadog-analytics ticket 14, incremental
 * write contract §§ 2–5).
 *
 * Every helper runs on a caller-owned transaction that ALSO mutates the
 * source store: source row, source reference record, and catalog deltas
 * commit or abort together — a failed persistence leaves no phantom
 * catalog field, a failed catalog update leaves the source unchanged.
 *
 * Contributions are attributed to their owning row id: streaming appends,
 * finalize replacement, and cascade deletes reverse exactly the affected
 * rows. An identical re-save applies an empty delta (never double-counts).
 */

import type { IDBPDatabase, IDBPTransaction } from 'idb';
import type {
    CatalogBackfillState,
    FieldCatalogEntry,
    FieldContribution,
    FieldSourceRecord,
} from '@bitcobblers/wod-wiki-core';
import type { WodWikiDB } from './IndexedDBService';
import { computeCatalogDeltas, extractContributionsFromNote, extractContributionsFromResult, fieldSourceId } from '../catalog/fieldCatalog';

type RW = 'readwrite';
type CatalogStores = ('field_catalog' | 'field_sources' | 'field_values')[];
type CatalogTx = IDBPTransaction<WodWikiDB, CatalogStores, RW>;

function bump(counts: Record<string, number>, key: string): Record<string, number> {
    const next = { ...counts };
    next[key] = (next[key] ?? 0) + 1;
    return next;
}

function unbump(counts: Record<string, number>, key: string): Record<string, number> {
    const next = { ...counts };
    const left = (next[key] ?? 0) - 1;
    if (left <= 0) delete next[key];
    else next[key] = left;
    return next;
}

async function addContribution(tx: CatalogTx, c: FieldContribution, now: number): Promise<void> {
    const catalog = tx.objectStore('field_catalog');
    const existing = await catalog.get(c.fieldId);
    const base: FieldCatalogEntry = existing ?? {
        id: c.fieldId,
        path: c.path,
        kind: c.kind,
        spellings: {},
        units: {},
        sourceCount: 0,
        firstSeen: now,
        lastSeen: now,
    };
    await catalog.put({
        ...base,
        sourceCount: base.sourceCount + 1,
        lastSeen: now,
        spellings: c.spelling ? bump(base.spellings, c.spelling) : base.spellings,
        units: c.unit ? bump(base.units, c.unit) : base.units,
    });
    if (c.value !== undefined) {
        const values = tx.objectStore('field_values');
        const valueRecord = await values.get([c.fieldId, c.value]);
        await values.put({
            key: [c.fieldId, c.value],
            fieldId: c.fieldId,
            value: c.value,
            sourceCount: (valueRecord?.sourceCount ?? 0) + 1,
        });
    }
}

async function removeContribution(tx: CatalogTx, c: FieldContribution): Promise<void> {
    const catalog = tx.objectStore('field_catalog');
    const entry = await catalog.get(c.fieldId);
    if (!entry) return;
    const sourceCount = entry.sourceCount - 1;
    if (sourceCount <= 0) {
        await catalog.delete(c.fieldId);
        // Categorical values prune with their field's final support.
        for await (const cursor of tx.objectStore('field_values').index('by-field').iterate(c.fieldId)) {
            await cursor.delete();
        }
        return;
    }
    await catalog.put({
        ...entry,
        sourceCount,
        spellings: c.spelling ? unbump(entry.spellings, c.spelling) : entry.spellings,
        units: c.unit ? unbump(entry.units, c.unit) : entry.units,
    });
    if (c.value !== undefined) {
        const values = tx.objectStore('field_values');
        const valueRecord = await values.get([c.fieldId, c.value]);
        if (valueRecord) {
            if (valueRecord.sourceCount <= 1) await values.delete([c.fieldId, c.value]);
            else await values.put({ ...valueRecord, sourceCount: valueRecord.sourceCount - 1 });
        }
    }
}

/** Reverse one row's contributions (delta to empty) and drop them from the
 *  source's reversal record. */
export async function removeRowContributionsTx(
    tx: CatalogTx,
    entityKind: 'result' | 'note',
    recordId: string,
    rowId: string,
): Promise<void> {
    const sources = tx.objectStore('field_sources');
    const sourceId = fieldSourceId(entityKind, recordId);
    const record = await sources.get(sourceId);
    if (!record) return;
    const rowScoped = record.contributions.filter((c) => c.rowId === rowId);
    for (const c of rowScoped) await removeContribution(tx, c);
    if (record.contributions.length !== rowScoped.length) {
        const rest = record.contributions.filter((c) => c.rowId !== rowId);
        const updated: FieldSourceRecord = { id: sourceId, contributions: rest };
        await sources.put(updated);
    } else {
        await sources.delete(sourceId);
    }
}

/** Set one row's contributions (streaming append / finalize finals): the
 *  row's previous contributions are reversed, the new ones applied. */
export async function replaceRowContributionsTx(
    tx: CatalogTx,
    entityKind: 'result' | 'note',
    recordId: string,
    rowId: string,
    next: readonly FieldContribution[],
    now: number,
): Promise<void> {
    const sources = tx.objectStore('field_sources');
    const sourceId = fieldSourceId(entityKind, recordId);
    const record = await sources.get(sourceId);
    const rowScoped = record?.contributions.filter((c) => c.rowId === rowId) ?? [];
    const { added, removed } = computeCatalogDeltas(rowScoped, next);
    for (const c of added) await addContribution(tx, c, now);
    for (const c of removed) await removeContribution(tx, c);
    const rest = (record?.contributions ?? []).filter((c) => c.rowId !== rowId);
    const updated: FieldSourceRecord = {
        id: sourceId,
        contributions: [...rest, ...next.map((c) => ({ ...c, rowId }))],
    };
    await sources.put(updated);
}

/** Reverse the contributions of a set of rows (a save that dropped log
 *  statements), keeping the source's reversal record for the survivors. */
export async function removeRowSetContributionsTx(
    tx: CatalogTx,
    entityKind: 'result' | 'note',
    recordId: string,
    rowIds: readonly string[],
): Promise<void> {
    if (rowIds.length === 0) return;
    const sources = tx.objectStore('field_sources');
    const sourceId = fieldSourceId(entityKind, recordId);
    const record = await sources.get(sourceId);
    if (!record) return;
    const rowSet = new Set(rowIds);
    const scoped = record.contributions.filter((c) => rowSet.has(c.rowId));
    for (const c of scoped) await removeContribution(tx, c);
    const rest = record.contributions.filter((c) => !rowSet.has(c.rowId));
    if (rest.length > 0) {
        const updated: FieldSourceRecord = { id: sourceId, contributions: rest };
        await sources.put(updated);
    } else {
        await sources.delete(sourceId);
    }
}

/** Remove a whole source (result-delete cascade): every listed row's
 *  contributions are reversed and the reversal record is dropped. */
export async function removeSourceTx(
    tx: CatalogTx,
    entityKind: 'result' | 'note',
    recordId: string,
    rowIds: readonly string[],
): Promise<void> {
    const sources = tx.objectStore('field_sources');
    const sourceId = fieldSourceId(entityKind, recordId);
    const record = await sources.get(sourceId);
    if (!record) return;
    const rowSet = new Set(rowIds);
    // Empty rowIds = the whole source (note-delete of its own fields);
    // otherwise only the listed rows cascade.
    const scoped = rowIds.length === 0
        ? record.contributions
        : record.contributions.filter((c) => rowSet.has(c.rowId));
    for (const c of scoped) await removeContribution(tx, c);
    const rest = record.contributions.filter((c) => !scoped.includes(c));
    if (rest.length > 0) {
        const updated: FieldSourceRecord = { id: sourceId, contributions: rest };
        await sources.put(updated);
    } else {
        await sources.delete(sourceId);
    }
}

/**
 * Backfill state helpers — a persisted marker distinguishes an incomplete
 * population from a genuinely empty catalog (field discovery contract,
 * Initial population and recovery). Resumable: `cursor` records the last
 * processed source key per source store.
 */
export async function getBackfillState(db: IDBPDatabase<WodWikiDB>): Promise<CatalogBackfillState | undefined> {
    return db.get('field_catalog_meta', 'backfill');
}

export async function markBackfillComplete(db: IDBPDatabase<WodWikiDB>): Promise<void> {
    const previous = await getBackfillState(db);
    const state: CatalogBackfillState = {
        id: 'backfill',
        status: 'complete',
        revision: (previous?.revision ?? 0) + 1,
        updatedAt: Date.now(),
    };
    await db.put('field_catalog_meta', state);
}

async function persistCursor(db: IDBPDatabase<WodWikiDB>, started: CatalogBackfillState, cursor: NonNullable<CatalogBackfillState['cursor']>, processed: number, batchSize: number): Promise<void> {
    if (processed % batchSize !== 0) return;
    const state: CatalogBackfillState = { ...started, cursor: { ...cursor }, updatedAt: Date.now() };
    await db.put('field_catalog_meta', state);
}

/**
 * Resumable initial population: walks `results` and `notes` once, applying
 * each source's contribution set through the row-attributed helpers in
 * small batched transactions. Each batch re-checks the source's current
 * field_sources record inside its write transaction, so a concurrent live
 * save is never double-counted; an interrupted run resumes from its cursor
 * without duplicate support.
 */
export async function runCatalogBackfill(db: IDBPDatabase<WodWikiDB>, batchSize = 50): Promise<{ done: boolean }> {
    const existing = await getBackfillState(db);
    if (existing?.status === 'complete') return { done: true };
    const started: CatalogBackfillState = existing ?? {
        id: 'backfill',
        status: 'initializing',
        cursor: {},
        revision: 0,
        updatedAt: Date.now(),
    };
    const cursor: NonNullable<CatalogBackfillState['cursor']> = { ...started.cursor };
    let processed = 0;
    const now = Date.now();

    // Batched read-then-write passes: each pass reads one batch of sources
    // in a single readonly transaction, closes it, then applies the batch's
    // catalog deltas in per-source write transactions — no transaction is
    // held open across an interleaved write.
    const readBatch = async (
        store: 'results' | 'notes',
        afterKey: string,
    ): Promise<Array<{ id: string }>> => {
        const readTx = db.transaction(store, 'readonly');
        const out: Array<{ id: string }> = [];
        let cursor_ = await readTx.store.openCursor(IDBKeyRange.lowerBound(afterKey, true));
        while (cursor_ && out.length < batchSize) {
            out.push(cursor_.value as { id: string });
            cursor_ = await cursor_.continue();
        }
        await readTx.done;
        return out;
    };

    const extractors = {
        results: (record: { id: string }) => extractContributionsFromResult(record as never),
        notes: (record: { id: string }) => extractContributionsFromNote(record as never),
    } as const;

    for (const store of ['results', 'notes'] as const) {
        let afterKey = cursor[store] ?? '';
        for (;;) {
            const batch = await readBatch(store, afterKey);
            if (batch.length === 0) break;
            for (const record of batch) {
                const writeTx = db.transaction(['field_catalog', 'field_sources', 'field_values'] as const, 'readwrite');
                // Re-check inside the write transaction: a concurrent live
                // save may have replaced this source's contributions after
                // our read — skip it (no double-counted support).
                const current = await writeTx.objectStore('field_sources').get(fieldSourceId(store === 'results' ? 'result' : 'note', record.id));
                if (!current) {
                    for (const c of extractors[store](record)) {
                        await replaceRowContributionsTx(writeTx, store === 'results' ? 'result' : 'note', record.id, c.rowId, [c], now);
                    }
                }
                await writeTx.done;
                afterKey = record.id;
                processed += 1;
            }
            cursor[store] = afterKey;
            await persistCursor(db, started, cursor, processed, batchSize);
        }
    }

    await markBackfillComplete(db);
    return { done: true };
}
