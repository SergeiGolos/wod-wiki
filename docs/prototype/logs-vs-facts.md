# Logs vs Facts — Why Two Materializations

**Status**: explainer companion to [`../09-wql-deep-dive.md`](../09-wql-deep-dive.md)
(§6 states the rule; this document explains the reasoning) and to
[`wql-interface-changes.md`](./wql-interface-changes.md) §1.0 ("one logical
stream, two materializations").

**Short version**: logs are the write-once journal; facts are the pre-flattened
index. Every WQL query picks whichever interface answers cheapest — and the type
shapes below are why neither can replace the other.

---

## 1. Two types, two worlds

The input to projection — what lives in `WorkoutResult.data.logs`
(`src/services/analytics/workoutDerivation.ts:156-167`):

```ts
// NESTED — shape varies per processor, string-labeled, metadata bags
interface SummaryFactSourceOutput {
  outputType: string;                  // 'analytics' | 'segment' | ...
  metrics: {                           // find-the-label, find-the-number games
    type: string;                      // MetricType.Label | numeric | ...
    value?: unknown;
    unit?: string;
    metadata?: Record<string, unknown>;// effortSlug, groupTags, canonicalKey…
  }[];
  timeSpan: { started: number; ended?: number };
}
```

What the Analytics Store holds after projection (`AnalyticsDataPoint`, flattened):

```ts
// FLAT — every field a query filters or groups by is a column
interface AnalyticsDataPoint {
  grain?: 'summary' | 'segment' | 'rollup';
  metricKey?: string;        // Canonical Metric Key — frozen join key
  value: unknown;  unit?: string;
  effortSlug?: string;  discipline?: string;  intensityTier?: string;
  resultId: string;  noteId: string;  blockContentId?: string;
  timestamp: number;         // workout time, NOT derivation time
}
```

The projection exists to turn "search a `metrics[]` array for the Label, then
for a number, then read its metadata bag" into "read a column."

## 2. The two interfaces — this is the whole design

From `packages/wql/src/stores.ts`, the Query Service sees exactly two seams:

```ts
// FOLD PATH — pre-projected rows, index-served
interface FactQueryStore {
  getFactsByMetric(metricKey: string): Promise<AnalyticsDataPoint[]>;
  getFactsByTimeRange(start: number, end: number): Promise<AnalyticsDataPoint[]>;
  getNoteTagLabels(noteId: string): Promise<string[]>;
}

// RAW PATH — journals, no projection
interface ResultLogStore {
  getResultsByContentId(blockContentId: string): Promise<WorkoutResult[]>;
  getResultById(resultId: string): Promise<WorkoutResult | undefined>;
  getResultsForNote(noteId: string): Promise<WorkoutResult[]>;
}
```

Who uses which:

| Query kind | Interface | Why |
|---|---|---|
| `sum:` `avg:` `count:` | `FactQueryStore` | needs columns + indexes |
| `rows:<target>` | `ResultLogStore` | needs statements the projection destroyed |
| `where` join | `ResultLogStore` **then** re-project | freshness over speed |

## 3. Why the fold path is a one-liner

```ts
// IndexedDBService.ts:1006-1008
async getFactsByMetric(metricKey: string): Promise<AnalyticsDataPoint[]> {
    return (await this.dbPromise).getAllFromIndex('analytics', 'by-metric', metricKey);
}
```

One line because the store carries twelve indexes
(`IndexedDBService.ts:105-122`): `by-metric`, `by-timestamp`, `by-effort`,
`by-discipline`, `by-grain`, `by-content`, `by-value` (compound, for threshold
scans)… Each WQL filter dimension maps to a pre-built index. Over logs none of
these exist — you would fetch whole `WorkoutResult` blobs and walk `metrics[]`
arrays per query.

## 4. What the projection pays for at write time

```ts
// workoutDerivation.ts:210-220 — per output statement, ONCE per workout
const label = output.metrics.find(m => m.type === MetricType.Label);
const value = output.metrics.find(m => m.type !== Label && typeof m.value === 'number');
if (!label || !value) continue;
// freeze the vocabulary decision NOW, not per query:
const metricKey = metadataString(value.metadata, 'canonicalKey')
                ?? resolveCanonicalMetricKey(projectionName);
```

That `metricKey` line is the second reason: the **Canonical Metric Key** gets
resolved once and frozen into the row. If it were derived per query from display
labels, renaming `'Total Volume'` would silently split every historical trend
into two series.

Also frozen: canonical time. Rows carry `timestamp = workoutTimestamp` (when the
workout happened), explicitly *not* the derivation-time stamp the engine puts on
outputs (`workoutDerivation.ts:147-152`, `:256`) — otherwise re-running
derivation would shuffle history.

And the write site knows its place (`IndexedDBNotePersistence.ts:211`):

```ts
// Non-load-bearing: WorkoutResult.data.logs is the authoritative source.
await this.storage.saveAnalyticsPoints(points);
```

If the fact write fails, the workout remains fully functional — the store is
explicitly allowed to be incomplete (`workoutDerivation.ts:193-195`).

## 5. Why joins take the slow road on purpose

```ts
// join path: raw logs → SAME projection function → fold
deriveMetricFacts(contentIds, metric)
  → resultStore.getResultsByContentId(id)      // ResultLogStore
  → normalizeSummaryFacts(result.data.logs, …) // ← the function that BUILT the store
```

Same function that populated the store ⇒ re-derived result ≡ what the store
would hold. Freshness guaranteed without an invalidation protocol. Cost stays
bounded because only matched content ids are fetched, not the corpus.

One-sentence version: **the store is a cache with a proof attached** — delete it
and you lose nothing but speed; consult logs directly wherever staleness would
be wrong.

## 6. The disposability proof — already cashed three times

| Version | What happened to facts | What happened to logs |
|---|---|---|
| V10 | legacy rows purged ("garbage segmentId"; `IndexedDBService.ts:153-156,225-226`) | untouched |
| V12 | cleared → rebuilt with effort identity + canonical timestamps (:377-426) | pruned of duplicate emissions |
| V13 | cleared → rebuilt including atomic metrics + `by-value` index (:469-517) | untouched |

Every derivation-rule change = drop the projection, rebuild from logs. Even the
failure fallback keeps logs and re-normalizes them
(`IndexedDBService.ts:417-421`). Delete the analytics store tomorrow: queries
get slower, zero data loss.

## 7. What breaks if you collapse either direction

- **`sum:` scanning raw logs always**: loses index-first SELECT (blob scans per
  widget render), re-resolves canonical keys per query from mutable display
  labels, kills `by-value` threshold scans, and drags storage concerns back into
  the Query Service — contradicting the inverted store seam.
- **Serving `rows:` from facts**: impossible — facts are pre-projected; the
  per-statement structure the session table needs (rounds, statement order,
  non-numeric context) does not survive projection. That is exactly why `rows`
  reads `ResultLogStore` and bypasses facts entirely.

## 8. Picture

```text
WRITE (once per workout, human cadence)
  runtime ─▶ data.logs (journal, authoritative)
                 │ normalizeAllMetrics — resolve key, freeze canonical time, flatten
                 ▼
           Analytics Store — 12-index read model (disposable)

READ (per render, machine cadence)
  sum:/avg:/… ──▶ by-metric / by-timestamp index fetches ──▶ fold
  rows:<target> ▶ ResultLogStore ──▶ raw statements, no fold
  where joins ──▶ ResultLogStore ──▶ normalizeSummaryFacts ──▶ fold  (freshness path)
```

For the rows-model language design: the language never exposes *which*
materialization answered. `rows:` is the user-facing escape hatch to the journal
itself; folds silently pick the cheapest truthful adapter.
