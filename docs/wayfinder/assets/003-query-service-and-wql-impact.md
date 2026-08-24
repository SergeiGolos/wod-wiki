# Ticket 003 — Query service and WQL impact (decided spec)

**Status**: decided 2026-08-24 · grilling session · feeds
[004 migration & backfill](../tickets/004-migration-and-backfill-story.md),
[005 write-path lifecycle](../tickets/005-write-path-lifecycle.md)

## The seam after unification

QueryService injects **four** stores (was five):

```ts
interface UnifiedEventStore {
  // reads (all return UnifiedEventRecord[])
  getEventsByTimeRange(start: number, end: number): Promise<...>;
  getEventsByResult(resultId: string): Promise<...>;
  getEventsForNote(noteId: string): Promise<...>;
  getEventsByContent(blockContentId: string): Promise<...>;  // join hot path
  scanAll(): AsyncIterable<UnifiedEventRecord>;

  // write side — contract owned by ticket 005
  appendEvents(rows: UnifiedEventRecord[]): Promise<void>;
  finalizeSummaries(resultId: string, rows: UnifiedEventRecord[]): Promise<void>;
}

// unchanged content plane:
NoteQueryStore   // + getNoteTagLabels (moved here from FactQueryStore)
BlockQueryStore  // (+ static variants)
EffortQueryStore
```

`FactQueryStore` and `ResultLogStore` are **deleted** — two names for one
data source. Zero-storage-imports principle preserved unchanged.

## 002 amendment (grilled here, recorded in both specs)

Joins and `rows:{note:…}` need lookups 002's promotion list omitted:

- **Promote** `noteId` and `blockContentId` as columns (per-result constants,
  same status as `resultId`).
- **One more index**: `['blockContentId','grain']` — join fetches become
  IDBKeyRange lookups (~10 ms) instead of full scans (1150 ms @ 5k, S4).
- Index count: five → **six**; write amp ~7× — still trivial at human cadence.

## Decisions

1. **Four-store seam** (events + content plane) — see interface above.
2. **Promote noteId + blockContentId, +join index** — amendment above.
3. **Window-first hybrid SELECT**: query has a time window → `by-timestamp`
   range fetch + JS metric/grain filter (90–254 ms @ 5k); no window → full
   scan (380 ms flat). **`by-metric` is never used by SELECT** — 001 measured
   it non-selective and 3× slower than scanning. The four-stage plan
   (SELECT → BUCKET → GROUP → AGGREGATE) is unchanged; only the SELECT leg's
   data source swaps.
4. **Grain vocabulary**: WQL grain tags become `summary | event`
   (002's rename); **`grain:rollup` tag retired** — parse-time error pointing
   at the `.rollup` suffix, the one rollup mechanism. No tag that matches zero
   stored rows.
5. **Join freshness rule: moot.** "Re-derive because the store may lag the
   logs" assumed the dual model's lag; finalize-owns makes the store always
   authoritative. What survives is *shape* derivation — folding event rows
   into summary-grain view at join time — pure view math;
   `normalizeSummaryFacts` keeps exactly two callers (finalize write, join
   view). Rollups likewise: computed at read, nothing to invalidate (#877's
   eager-recompute problem evaporates).
6. **C1–C7 language plan deltas**
   (`docs/prototype/wql-interface-changes.md`):
   - **C4 (rows-in-grammar): simpler** — `rows:{result:…}` reads event rows
     directly (no WorkoutResult blob parsing); `rows:{outputType}` hits a
     promoted column.
   - **C5 (discriminated union): simpler** — one record + `grain`.
   - **C6 (one structured interface): trivially satisfied** — the AST
     serializes the one record shape.
   - **C1 (window module), C2 (de-overload `in`), C3 (suffix validation),
     C7 (target validation): unchanged** — C7's targets are now promoted
     columns, which it validates against naturally.

## Handed downstream

- **005 (write-path)**: owns the `UnifiedEventStore` write contract —
  `appendEvents` flush points during a run, `finalizeSummaries` atomic tx,
  failure fallback (events survive; summaries absent and re-derivable).
- **004 (migration)**: builds the unified store + adapter implementing the
  four-store seam; backfill maps logs + fact rows → event rows; summaries
  re-derived once; old stores dropped after version-bump swap.
