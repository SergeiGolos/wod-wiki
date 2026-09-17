# The Workout Data Pipeline: From Execution to Query Facts

This document walks through how workout data is created, transformed, stored, and queried across the codebase, and explains why `factRowsToEventRows` and `projectEventToFacts` exist.

---

## 1. The High-Level Architecture

The workout analytics subsystem operates in four stages:

1. **Execution (`IOutputStatement`)**: The Whiteboard language runtime emits raw output statements into a `Session` (formerly `WorkoutResult`).
2. **Persistence (`EventRecord`)**: The `events` store in IndexedDB persists structured event rows (`grain: 'event'`) and folded summary rows (`grain: 'summary'`).
3. **Query Engine (`AnalyticsDataPoint`)**: WQL `QueryService` flattens stored event rows into tabular `AnalyticsDataPoint` facts in-memory to evaluate filters, groups, and windowed aggregations.
4. **Fixture Inversion (`factRowsToEventRows`)**: An in-memory bridge that converts legacy flat facts into `EventRecord` rows so test fixtures and golden datasets can run through `QueryService` without re-running the workout compiler.

---

## 2. Where Data Is Originally Created

Workout execution begins in the CodeMirror editor or fullscreen timer runtime:

- **Source Code**: `apps/playground/src/components/organisms/editor/NoteEditor.tsx` and `apps/playground/src/components/organisms/review/FullscreenTimer.tsx`.
- **Compiler/Runner**: The Whiteboard language runtime (`@bitcobblers/wod-wiki-engine`) executes a workout block (e.g. `21-15-9 Thrusters / Pull-ups`).
- **Raw Outputs**: As segments, rounds, and movements complete, the runtime emits `IOutputStatement` objects containing metrics (reps, elapsed time, load, heart rate).
- **Archival Session**: When the workout completes, `resultRecorder.record(...)` writes a `Session` object into IndexedDB table `sessions` (`DB_VERSION 20`).
  - `Session.data.logs`: Array of `StoredOutputStatement[]`.
  - This is the immutable source of truth for the raw workout run.

---

## 3. How Data Is Transformed for Storage (`EventRecord`)

Writing raw `StoredOutputStatement[]` alone is insufficient for multi-workout queries (e.g. "sum total volume across all Fran runs in the last 6 weeks"). 

IndexedDB needs a queryable timeline. That is the job of `derivation.ts`:

- **Path**: `packages/wql/src/derivation.ts`.
- **Functions**:
  - `toEventRows(logs, identity)`: Emits detail rows (`grain: 'event'`). Each row represents one statement execution with an ID like `${sessionId}:${seq}`.
  - `toSummaryEventRows(logs, identity)`: Emits folded metric rows (`grain: 'summary'`). Calculates deterministic summary values (such as `totalVolume`, `elapsed`, `reps`) with an ID like `${sessionId}:summary:${metricKey}`.
- **Stored Table**: Table `events` in IndexedDB.
- **Interface**: `EventRecord` (in `packages/core/src/types/storage.ts`):
  ```typescript
  export interface EventRecord {
    id: string;                      // e.g. "res-123:summary:totalVolume"
    resultId: string;                // owning Session UUID
    noteId: string;                  // owning Note UUID
    blockContentId?: string;         // content-stable hash (e.g. "bc-391b8bed")
    timestamp: number;               // canonical workout timestamp
    grain: 'event' | 'summary';
    outputType: string;              // "segment", "analytics", "wellness"
    metrics: StoredMetric[];         // typed array of metric values and units
  }
  ```

---

## 4. How WQL Queries Consume Data (`AnalyticsDataPoint`)

When WQL runs a query like `sum:totalVolume{} last 6w`:

1. `QueryService.ts` fetches `EventRecord[]` rows from `events` by timestamp range or content ID.
2. In-memory, `QueryService` calls `projectEventToFacts(record)` (`packages/wql/src/derivation.ts`).
3. **Why flatten?** An `EventRecord` can hold multiple metrics in its `metrics: []` array. To filter and aggregate cleanly, `projectEventToFacts` unpacks the record into individual, 1-to-1 metric rows called `AnalyticsDataPoint`:
   ```typescript
   export interface AnalyticsDataPoint {
     id: string;             // e.g. "res-123:summary:totalVolume:0"
     resultId: string;
     noteId: string;
     blockContentId?: string;
     timestamp: number;
     metricKey: string;      // e.g. "totalVolume"
     value: number;          // e.g. 4500
     unit?: string;          // e.g. "kg"
   }
   ```
4. `QueryService` buckets, groups, and reduces these `AnalyticsDataPoint` facts into the final scalar, series, or table.

---

## 5. What `factRowsToEventRows` Means and Why It Exists

`factRowsToEventRows` lives in `packages/engine/src/store.ts`.

It is the **exact inverse** of `projectEventToFacts`:

$$\text{EventRecord} \xrightarrow{\text{projectEventToFacts}} \text{AnalyticsDataPoint}$$

$$\text{AnalyticsDataPoint} \xrightarrow{\text{factRowsToEventRows}} \text{EventRecord}$$

```typescript
export function factRowsToEventRows(facts: readonly AnalyticsDataPoint[]): EventRecord[] {
  return facts.map((f, i) => {
    const metricKey = f.metricKey ?? f.type;
    return {
      id: `fact:${f.resultId}:${metricKey}:${i}`,
      resultId: f.resultId,
      noteId: f.noteId,
      blockContentId: f.blockContentId,
      pageId: f.pageId,
      origin: f.origin,
      timestamp: f.timestamp,
      grain: f.grain === 'event' ? 'event' : 'summary',
      outputType: 'analytics',
      effortSlug: f.effortSlug,
      metrics: [{
        type: metricKey,
        value: f.value,
        ...(f.unit ? { unit: f.unit } : {}),
        metadata: {
          canonicalKey: metricKey,
          ...(f.effortSlug ? { effortSlug: f.effortSlug } : {}),
          ...(f.discipline ? { effortDiscipline: f.discipline } : {}),
          ...(f.intensityTier ? { effortIntensityTier: f.intensityTier } : {}),
        },
      }],
      segmentId: f.segmentId,
      segmentVersion: f.segmentVersion,
    };
  });
}
```

### Why was it needed?

Historically, the project wrote and stored flat `AnalyticsDataPoint` rows directly into an `analytics` table. Many legacy test suites, Storybook mocks, and CLI tools defined mock fixtures as flat objects:

```typescript
const sampleFacts: AnalyticsDataPoint[] = [
  { id: 'f1', resultId: 'r1', noteId: 'n1', metricKey: 'totalVolume', value: 5000, timestamp: 1000 },
];
```

When the storage engine migrated to `EventRecord` and table `events` (V16 upgrade), `QueryService` was changed to read exclusively from `EventStore` (`getEventsByTimeRange`, etc.). 

Rather than rewriting hundreds of test fixtures and JSON datasets to conform to the nested `EventRecord` format, `factRowsToEventRows` wraps flat fact fixtures into synthetic `EventRecord` rows on the fly:

```typescript
// Helper used in tests and CLI query evaluation:
export function inMemoryEventStoreFromFacts(facts: readonly AnalyticsDataPoint[]): EventStore {
  return inMemoryEventStore(factRowsToEventRows(facts));
}
```

---

## 6. Pipeline Summary Table

| Stage | Data Type | Primary File / Store | Purpose |
|---|---|---|---|
| 1. Execution | `StoredOutputStatement` | `Session.data.logs` (`sessions` table) | Archival record of raw workout execution outputs. |
| 2. Persistence | `EventRecord` | `events` table (IndexedDB) | Timeline index of event (`event`) and summary (`summary`) metrics. |
| 3. Query Flattening | `AnalyticsDataPoint` | In-memory inside `QueryService.ts` | 1-to-1 metric rows ready for filtering, bucketing, and aggregation. |
| 4. Test Adapter | `factRowsToEventRows` | `packages/engine/src/store.ts` | Inverse bridge: converts mock `AnalyticsDataPoint[]` into `EventRecord[]` for in-memory testing. |
