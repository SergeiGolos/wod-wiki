# Ticket 004 — Migration and backfill story (decided spec)

**Status**: decided 2026-08-24 · grilling session · feeds
[005 write-path lifecycle](../tickets/005-write-path-lifecycle.md)

**Renumber**: this is **V16** — V15 is already taken (fence-tag cutover,
#893, `IndexedDBService.ts:138`).

## Mapping — which source wins per class

Doctrine precedents (V10/V12/V13) are unambiguous: **logs win; fact rows are
a disposable index**. The migration re-derives; it never copies old fact rows.

| Source | → | Rule |
|---|---|---|
| `results.data.logs` (`StoredOutputStatement[]`) | **event rows**, `grain:'event'` | 1:1 per statement; `id = ${resultId}:${seq}`; `timestamp = result.createdAt` (V12 canonical-time doctrine); `outputType` from statement; `effortSlug` = first metric's `metadata.effortSlug`; `noteId`/`pageId`/`origin`/`blockContentId` copied from the result (per-result constants); `metrics`/`timeSpan`/`sourceBlockKey`/`stackLevel`/`completionReason` carried |
| `analytics` rows, `grain:'summary'` | **summary rows**, `grain:'summary'` | NOT copied — re-derived per result via `normalizeSummaryFacts(logs, identity)`; deterministic content keys (002) |
| `analytics` rows, `grain:'segment'` | — dropped | Event rows are the atomic superset; queries fold `metrics[]` in JS |
| `analytics` rows, `grain:'rollup'` | — dropped | 002: rollups are never stored; read-time math |
| Legacy name-derived keys | **re-resolved** | Re-derivation runs current derivation code — carrying old keys forward would preserve garbage |

**Finalize semantics during migration**: `WorkoutResult` has no finalize
marker — presence with logs *is* the finalize signal (today's de-facto rule;
V12 gave partial-save results facts too). Every result with logs gets event
rows + summary rows.

## Mechanics

```
backfillV16(tx)  — inside versionchange, gated: oldVersion > 0 && < 16
  1. if absent: createObjectStore('events', { keyPath: 'id' })
     + six indexes: by-timestamp, ['resultId','grain'],
       ['blockContentId','grain'], by-effort, by-outputType, by-grain
  2. for each result in 'results' with data.logs:
       put event rows (1:1 statements)
       put summary rows (normalizeSummaryFacts)
  3. deleteObjectStore('analytics')   // decided: full store removal
```

- **Failure fallback** (V12 doctrine verbatim): engine replay fails →
  `console.warn` + `normalizeSummaryFacts` from stored logs
  (`renormalized++`); even that fails → skip the result, count it, continue —
  logs remain untouched, future re-derivation can retry.
- **Idempotency**: the `versionchange` tx is atomic — a crash aborts it, the
  DB stays at the old version, the next open retries from scratch.
  Deterministic record ids make re-run writes no-ops regardless.

## Rollback posture — replay doctrine, no dual-write

V16 touches only `+events` (new) and `−analytics` (dead); the results store —
the real source of truth — is untouched. Downgrade = install the previous app
version: old code opens the old schema, finds no `analytics` store, and the
established replay seam regenerates fact rows from `data.logs` on demand
(V10 doctrine, unchanged). Zero ongoing cost; rollback safety is inherited,
not built.

## Code cleanup in the same change

- `getFactsByMetric` / `getFactsByTimeRange` deleted
  (`IndexedDBService.ts:1005-1013`).
- Facts adapter rewired to the `UnifiedEventStore` interface (003);
  `FactQueryStore` / `ResultLogStore` interfaces deleted.
- `AnalyticsDataPoint` retired from the storage schema union
  (`core/types/storage.ts:143`).

## Handed downstream

- **005 (write-path)**: owns `appendEvents` / `finalizeSummaries` — the
  migration's write pattern is the same code path exercised in bulk; build
  the write path first, let `backfillV16` call it per result.
