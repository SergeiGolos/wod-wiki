# Invalidation, query reuse, and performance budgets

Status: resolved decision contract; planning only.

Owned by [Invalidation, query reuse, and performance budgets](../issues/09-invalidation-and-query-performance.md). Composes with [Field discovery and catalog contract](field-discovery-contract.md), [Automatic grain selection and contribution ownership](automatic-grain-contract.md), [Time buckets, group keys, and alignment](time-alignment-contract.md), [Missing values, units, and numerical correctness](arithmetic-contract.md), [Query documents and shared-key formulas](query-documents-contract.md), [Cross-workout analytical tables and drill-down](analytical-tables-contract.md), [Shared query execution across dashboards and notes](shared-execution-contract.md), and [Projection lifecycle and existing-data migration](lifecycle-migration-contract.md). This asset specifies required behavior; it is not production code.

## 1. Workload baseline and performance budgets

Target scale: personal athletic journal (~500–1,000 workouts, ~5,000–10,000 segments, multi-year history).

| Operation | Performance budget | Constraint |
|---|---|---|
| Dashboard load (12+ widgets) | **< 250 ms** total query execution | **0 duplicate store scans** across widgets sharing time ranges |
| Field / categorical typeahead | **< 16 ms** (1 frame) | Reads catalog prefix index only; **0 event/result scans** |
| Cross-workout tabular paging | **< 50 ms** per 50-row page | Uses indexed cursor and bounded limits |
| Single widget refresh | **< 50 ms** | Reuses cached range data where applicable |

## 2. In-flight subquery scan coalescing

To eliminate redundant IndexedDB range scans across dashboard widgets sharing time windows:

- `QueryDocumentRunner` maintains an in-flight range request map during execution:
  ```typescript
  Map<string, Promise<UnifiedEventRecord[]>>
  ```
  keyed by `${rangeStart}:${rangeEnd}`.
- When 12 widgets execute concurrently requesting `last 12w`, exactly **one** `getEventsByTimeRange` call is issued to IndexedDB. All 12 widget query planners process their respective metrics in memory from that single fetched event dataset.

## 3. Deterministic query cache equivalence keys

Query results are cached in memory using a deterministic structural key:

```typescript
interface QueryCacheKey {
  ast: string;              // Canonical normalized WQL AST
  rangeStart: number;       // Resolved start instant
  rangeEnd: number;         // Resolved end instant
  timeZone: string;         // Effective system timezone
  evaluationInstant: number;// Context evaluation anchor
  generationId: number;     // Database mutation generation
  systemDefaults: string;   // Active system default units
}
```

- **Full precision caching:** cached results retain unrounded floating-point numbers, true observation counts, and detailed lineage descriptors. Render-time formatting or rounding never pollutes the cache.
- **No stale calculations:** formula results cache their underlying inputs' dependency generation; an update to an input invalidates the formula.

## 4. Reactive invalidation and multi-tab synchronization

### 4.1 Mutation generation counter

- An in-memory store generation counter (`generationId`) increments on any commit to `results`, `notes`, `efforts`, or `field_catalog`.
- A changed generation immediately invalidates cached query results on the next check.

### 4.2 Cross-tab synchronization via `BroadcastChannel`

- Mutations broadcast a lightweight event:
  ```typescript
  broadcastChannel.postMessage({
    type: 'ANALYTICS_MUTATION',
    generationId: nextGeneration,
    source: 'results' | 'notes' | 'efforts',
  });
  ```
- Other open tabs receive the message and invalidate their in-memory query caches, ensuring dashboards update reactively without polling IndexedDB.

### 4.3 Cancellation and race-condition prevention

- Each query execution observes the active `generationId` at start and completion.
- If a newer mutation occurred while a long-running query was executing, the result is discarded rather than overwriting fresh data with stale results.

## 5. Verification benchmarks for implementation tickets

Implementation tickets must verify:

1. **Scan coalescing:** a synthetic test running 12 aggregate queries with identical ranges confirms `getEventsByTimeRange` is called exactly once.
2. **Typeahead latency:** querying field prefixes with 500 catalog entries finishes in < 16 ms without touching the `events` or `results` stores.
3. **Reactive invalidation:** saving a workout result produces a `BroadcastChannel` message that invalidates open dashboard query caches.
