# The Workout Data Pipeline: From Execution to Query Facts

How workout data is created, stored, and read after V21, and what changed from the old dual-store model.

## 1. The Architecture in One Picture

```
Engine execution (IOutputStatement[])
        │
        ▼
EventRecord rows in `events`            ← THE single statement/metric store
        │
        ├── projectEventToFacts(record) → AnalyticsDataPoint  (WQL filters/aggregates)
        └── eventsToStoredLogs(events)  → StoredOutputStatement[]  (display, replay)

Session rows in `sessions`              ← execution metadata only (no statements)
```

`Session` carries identity and totals (id, noteId, block content, start/end, duration, completed). `EventRecord` carries every statement and metric. Nothing stores the statement stream twice.

## 2. Where Data Is Created

Workout execution runs in the CodeMirror editor or fullscreen timer:

- `apps/playground/src/components/organisms/editor/NoteEditor.tsx` and `.../review/FullscreenTimer.tsx` drive the run.
- The Whiteboard runtime (`@bitcobblers/wod-wiki-engine`) emits `IOutputStatement`s (reps, loads, elapsed time, HR).
- On completion, `resultRecorder.record(...)` hands the payload to the persistence seam.

## 3. How Data Is Written

Two writes, both inside `IndexedDBNotePersistence.mutateNote` / `IndexedDBContentProvider.updateEntry`:

1. **Session row** — `saveSession` writes the flattened metadata record (scalars only).
2. **Event rows** — `toEventRows(logs, identity)` converts each statement to an `EventRecord` (`grain: 'event'`, id `${resultId}:${seq}`) and `toSummaryEventRows` folds Tier-2 outputs into `grain: 'summary'` rows; `appendEvents` + `finalizeSummaries` persist them.

The event rows are the archival record. If a later re-derivation runs (`rederiveResultAnalytics`), it purges the result's event rows and re-appends the replayed set, so the store converges to exactly one row set.

## 4. How Data Is Read

### WQL queries (facts)

`QueryService` fetches `EventRecord[]` by time range, result, note, or block content, then flattens each row with `projectEventToFacts(record)` into one `AnalyticsDataPoint` per numeric metric. Filters, buckets, rollups, and cross-workout joins run on those facts. Joins are relational: `resultId` → session, `noteId` → note/page, `blockContentId` → same workout across notes and days.

### Display and replay (statement stream)

`eventsToStoredLogs(events)` is the inverse of `toEventRows`: it rebuilds an ordered `StoredOutputStatement[]` from a session's event rows. Consumers:

- `sessionToPayload(session, events)` reconstructs the `results` payload a `HistoryEntry` exposes, so review grids and analytics views keep working.
- `replayResultAnalytics(block, events)` feeds the headless engine to recompute Tier-1/Tier-2 outputs after edits or RPE capture.

### Reads that kept their old shape

The live runtime still hands `getAnalyticsFromLogs` its in-memory statement stream directly; nothing round-trips through IndexedDB mid-run.

## 5. What V21 Removed

| Removed | Why |
|---|---|
| `Session.data.logs` | The statement stream had two homes; event rows are now the only one. |
| `factRowsToEventRows` / `inMemoryEventStoreFromFacts` | Legacy fixture adapters that faked event rows from flat facts. Fixtures now build `EventRecord` rows directly. |
| Contribution extraction from session rows | Field-catalog contributions are maintained by the event-row write paths and the catalog backfill's events pass. |

The V21 upgrade copies each session's scalar fields onto the row, projects any unprojected legacy logs into event rows (idempotent, deterministic ids), then drops `data`.

## 6. Pipeline Summary

| Stage | Type | Location | Purpose |
|---|---|---|---|
| Execution | `IOutputStatement` | runtime (in memory) | Live workout output. |
| Storage (metadata) | `Session` | `sessions` store | Identity, totals, lifecycle. |
| Storage (statements) | `EventRecord` | `events` store | The archival statement/metric rows. |
| Query | `AnalyticsDataPoint` | in-memory (`projectEventToFacts`) | Filterable/aggregatable facts for WQL. |
| Display/replay | `StoredOutputStatement` | in-memory (`eventsToStoredLogs`) | Reconstructed stream for grids, analytics views, and replay. |
