# Deepening the Persistence Module: one committed mutation

Status: **Proposed architecture; not implemented or an approved amendment.**

Related work: [ticket 14 — V17 lifecycle](../issues/14-db-v17-lifecycle.md), [ticket 20 — invalidation](../issues/20-invalidation-and-performance.md), [lifecycle contract](../assets/lifecycle-migration-contract.md), [Field Catalog contract](../assets/field-discovery-contract.md).

Read alongside [Metric derivation](03-metric-derivation.md), [query freshness](06-query-freshness.md), and the [deepening index](index.md).

## 1. What improves

The useful change is not splitting a large file into smaller files. It is making a successful Persistence mutation mean that authoritative data, its query projection, and Field Catalog membership agree.

Today callers coordinate several writes. The proposed Module hides transaction ownership, replacement, membership deltas, and commit notification. Its Interface promises a coherent result instead of requiring callers to know which stores to update and in which order.

- **Locality:** the commit invariant has one Implementation.
- **Leverage:** note editing, workout finalization, re-derivation, and import callers no longer reconstruct the write protocol.
- **Deletion test:** deleting this Module would force every writer to reconstruct transaction scope and catalog bookkeeping. Merely extracting each CRUD method into its own file would not provide that Depth.

`IndexedDBService` already contains useful atomic operations. Preserve those guarantees; do not portray the whole existing Module as shallow because of its length.

## 2. Current code and data

### Separate commits in a single logical operation

**Current excerpt**, [IndexedDBNotePersistence.ts:211–216](../../../../apps/playground/src/services/persistence/IndexedDBNotePersistence.ts#L211):

```ts
      try {
        await this.storage.appendEvents(toEventRows(resultLogs, identity));
        await this.storage.finalizeSummaries(resultId, toSummaryEventRows(resultLogs, identity));
      } catch (err) {
        console.warn(`[IndexedDBNotePersistence] event projection failed for result ${resultId}`, err);
      }
```

This follows `contentProvider.updateEntry(...)`, called at lines 169–171. The [content provider](../../../../apps/playground/src/services/content/IndexedDBContentProvider.ts#L523) saves the result independently. Re-derivation repeats the pattern: `saveResult(updated)` at [line 301](../../../../apps/playground/src/services/persistence/IndexedDBNotePersistence.ts#L301), followed by separate event writes.

Projection failure is currently nonfatal by explicit policy. Requiring an atomic source/catalog/projection commit changes that policy; it is not merely an extraction refactor.

**Current excerpt**, [IndexedDBService.ts:1207–1215](../../../../apps/playground/src/services/db/IndexedDBService.ts#L1207):

```ts
    async appendEvents(rows: UnifiedEventRecord[]): Promise<void> {
        if (rows.length === 0) return;
        const db = await this.dbPromise;
        const tx = db.transaction('events', 'readwrite');
        for (const row of rows) {
            await tx.store.put(row);
        }
        await tx.done;
    }
```

`finalizeSummaries` opens another `events` transaction at lines 1224–1237. Each method is atomic internally, but awaiting both does not create an atomic operation with the preceding result save.

Existing counterexamples worth keeping:

- `deleteNote` already owns a multi-store cascade transaction at lines 1364–1411.
- `sweepStaleInProgressResults` deletes results and their event rows in one transaction at lines 1266–1284.
- `finalizeSummaries` preserves user-authored summary rows while replacing engine-authored rows. A new commit Module must preserve this ownership distinction.

### The current Interface permits missing projections

**Current excerpt**, [persistence/types.ts:161–167](../../../../apps/playground/src/services/persistence/types.ts#L161):

```ts
  appendEvents?(rows: UnifiedEventRecord[]): Promise<void>;
  /** Atomic finalize: clear the result's engine-authored summaries, write finals. */
  finalizeSummaries?(resultId: string, rows: UnifiedEventRecord[]): Promise<void>;
  /** Reconcile deletes (wellness note-save) + GC sweeps. */
  deleteEvents?(ids: string[]): Promise<void>;
  /** Note-scoped event reads for wellness reconcile. */
  getEventsForNote?(noteId: string): Promise<UnifiedEventRecord[]>;
```

These optional methods let narrow fakes omit capture. Such fakes cannot verify the proposed atomic analytics contract. They need not be removed from unrelated note-only tests, but analytics mutation tests must cross a Seam that requires the complete commit behavior.

### Current record shape

**Current excerpt**, [core storage.ts:212–221](../../../../packages/core/src/types/storage.ts#L212):

```ts
  /** Canonical time — when the workout happened, never when derived. */
  timestamp: number;
  grain: EventGrain;
  /** Open vocabulary — see KNOWN_OUTPUT_TYPES. */
  outputType: string;
  effortSlug?: string;
  /** Typed metric array; EXACTLY ONE entry when grain:'summary'. Summary
   *  fold identity (canonicalKey, groupTags, effort metadata) lives in
   *  metrics[0].metadata — shape-uniform with events. */
  metrics: StoredOutputStatement['metrics'];
```

An event contains an array of Metrics but only one top-level timestamp. This matters when designing complete Metric Date selection; adding a scalar index named `by-metricDate` is not by itself a solution for Metrics with different dates inside one event.

## 3. Proposed Interface and caller change

**Proposed sketch — names and types below do not exist.** This illustrates a domain mutation, not a generic public transaction builder:

```ts
type SaveWorkout = {
  kind: 'save-workout';
  result: WorkoutResult;
  expectedRevision: string | null;
};

type CommitResult =
  | { kind: 'committed'; sourceRevision: string; mutationId: string }
  | { kind: 'conflict'; currentRevision: string | null };

interface WorkoutPersistence {
  commit(change: SaveWorkout): Promise<CommitResult>;
}
```

This fragment intentionally covers one operation. Note edits, effort edits, import, and deletion need their own concrete command payloads before implementation; they must not be hidden in an `unknown` payload or a public bag of arbitrary store operations.

**Proposed caller sketch:**

```ts
const committed = await workouts.commit({
  kind: 'save-workout',
  result,
  expectedRevision: loadedRevision,
});
if (committed.kind === 'conflict') {
  return presentConflict(committed);
}
// The fulfilled commit now covers logs, event projection, and catalog support.
return queryRunner.run(document);
```

The caller does not call `appendEvents`, `finalizeSummaries`, or a catalog counter helper. The underlying event-write Interface can still serve legitimate streaming writers, but those writers must participate in the same catalog/source invariants; it cannot remain an untracked escape hatch.

Revision checks are a **recommended mechanism**, not a newly agreed conflict-resolution policy. Rejecting a stale prepared mutation is preferable to silently projecting it over a newer source. User-facing conflict handling remains a decision to settle.

## 4. Same data, before and after

**Illustrative logical state, not current persisted JSON:**

| Store/state | Before save | Current split-write failure can leave | Proposed successful commit |
|---|---|---|---|
| `results[r1]` | logs with `hrv: 48` | new logs with `hrv: 52` | new logs with `hrv: 52` |
| `events` for `r1` | projection of 48 | old projection, or incomplete replacement | projection of 52 at the same revision |
| Field Catalog support | future V17 concern | independently updated support would be unsafe | same-transaction support for the new source |
| Visible completion | previous save complete | caller can return after warned projection failure | completion occurs after transaction completion |

Catalog counts represent source membership, not Metric Observation weighting. Suppose two results support numeric `heartRate`:

```text
sources r1, r2 -> [heartRate, number, recorded dimension] (logical identity only)
catalog support = 2
resave r1 unchanged -> 2
remove heartRate from r1 -> 1
remove final support r2 -> descriptor pruned
```

Do not persist the colon-delimited notation as an unchecked composite key. Use a collision-safe encoding. Distinct units, original spellings, and categorical suggestions need reversible support too; a single field-level `refCount` cannot remove the last alias or unit correctly.

## 5. What the Implementation hides

1. Resolve the authoritative source and the expected revision.
2. Prepare pure derivation and field extraction against a specific source snapshot, using [canonical derivation](03-metric-derivation.md) and [unit policy](02-unit-policy.md).
3. Open one readwrite transaction covering every affected authoritative and derived store. Recheck revisions inside it if preparation happened outside it.
4. Read previous source memberships; compute deltas; replace owned event representations and source memberships; prune zero-supported descriptors/categories.
5. Await the transaction's completion. A failure aborts the whole mutation, rather than logging a warning and claiming coherent analytics.
6. Publish invalidation after commit. The [freshness Module](06-query-freshness.md) consumes the signal but does not manufacture atomicity.

Do not open independent transactions inside helpers called by this operation. Internal helpers take transaction-bound access; they cannot silently fall back to the singleton.

Avoid unrelated asynchronous work inside an IndexedDB transaction: parsing, file acquisition, and network work belong outside its active request sequence. Preparing outside the transaction requires a revision check to prevent stale preparation from winning.

## 6. Module layout and dependency strategy

| Module | Responsibility | Caller knowledge removed |
|---|---|---|
| Persistence mutation Module | Transaction scope, replacement ownership, catalog consistency | Store ordering and rollback choreography |
| Storage Adapter | IndexedDB requests, indexes, transaction lifetime | Browser storage mechanics |
| Projection Implementation | Pure records from authoritative source snapshots | Identity/date extraction details |
| Migration Implementation | Schema upgrade and resumable population | Upgrade sequencing in ordinary writes |

Keep these as internal organization where possible, not four new public Interfaces every caller must assemble.

The current [`UnifiedEventStore`](../../../../packages/wql/src/stores.ts#L17) already has production and in-memory uses. Preserve that real Seam. Browser transactions are local-substitutable dependencies, but the existing event-only memory Adapter does **not** prove multi-store rollback semantics.

A transaction-capable test Adapter would need staged writes and an atomic commit/abort, not separate mutable Maps disguised as a transaction. Test the actual IndexedDB Adapter as well for upgrade lifetime and key behavior. Pure field extraction needs no Adapter.

## 7. Migration design that still needs reconciliation

The existing handoff overstates readiness here. The [lifecycle contract](../assets/lifecycle-migration-contract.md) fixes invariants but its compact schema examples are not a complete physical plan:

- **Boolean categories:** booleans are not valid IndexedDB keys. The `field_values` key sketch containing raw boolean values needs a typed, key-safe encoding that also distinguishes `false` from the string `"false"`.
- **Per-Metric dates:** a scalar event index cannot represent every date in an array of Metrics. Select a complete candidate strategy, keeping civil dates distinct from instants and retaining summary temporal coverage. Do not manufacture midnight instants.
- **Progress markers:** a `localStorage` marker cannot participate in the IndexedDB transaction. It may be a UI hint, not sufficient proof that the catalog and the source revisions are coherent. Reconcile durable completion/revision evidence with the lifecycle contract before implementation.
- **Upgrade versus backfill:** allocating stores in a versionchange transaction and populating them in resumable post-open batches are different lifecycles. Do not describe an interrupted versionchange as an independently committed halfway upgrade.
- **Concurrent saves:** stable source IDs prevent duplicate counts but do not prevent an old backfill snapshot overwriting a new save. Recheck source revisions within each batch commit.
- **Mutation inventory:** results and notes alone are insufficient. Include explicit effort definitions, retained segment versions, wellness edits, imports, note tags, deletion cascades, streaming writes, and stale in-progress-result sweeps.
- **Source truth:** current notes are editable, and re-derivation explicitly replaces analyzed logs. Preserve physical Metric meaning and retained archival evidence; do not invent a literal immutable `notes.body` store field.

These are design gates for ticket 14, not permission to relax its consistency requirements. If their resolution changes agreed behavior, graduate a decision ticket rather than bury the change in an implementation task.

## 8. Cutover and verification

1. Preserve current `finalizeSummaries`, cascade-delete, and GC ownership behavior with observable tests before reorganizing it.
2. Introduce the coherent mutation Implementation behind the existing Persistence entry point. Migrate `IndexedDBContentProvider.updateEntry` and re-derivation; two separately injected dependencies must not commit different halves independently.
3. Add catalog-aware mutation operations to every analytics-affecting writer. Remove optional projection skipping from tests claiming to cover these operations.
4. Add V17 schema/population only after the physical-plan gates above are resolved. Preserve reachable V12/V13 upgrade writers until an explicitly supported replacement exists.
5. Replace sleep-and-retry reads only once post-commit visibility is proven. Moving retries into a runner is not a fix.

Behavioral acceptance examples:

- Inject failure after preparing new event rows: old source, old events, and old memberships remain visible together; no commit signal is emitted.
- Save twice with identical fields: support counts remain unchanged.
- Re-finalize: engine-owned obsolete summaries disappear; user-owned wellness rows survive.
- Resume a batch after a concurrent edit: the newer source wins and support reflects it once.
- Delete the last supporting source: field/category suggestions disappear, without a full-history typeahead scan.
- Save completes, then query: the query sees the committed revision without timer delays.
- Two result reads in one coherent query cannot mix source and projection revisions silently.

**Tradeoff:** a coherent mutation may touch more stores and hold write contention longer than today's independent writes. Bounded transactions and pure preparation outside them limit that cost. The improvement is a reliable Interface, not a promise that a file split alone makes persistence faster.
