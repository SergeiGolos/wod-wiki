# Analytics Data Contract — Problem, Solution, and Benefits

**Date:** 2026-05-08
**Status:** Design proposal (documentation + light interface clarification)
**Opportunity:** C from `docs/persistence-metrics-assessment-2026-05-08.md`
**Scope:** `WorkoutResult.data.logs`, `AnalyticsDataPoint[]`, and every caller that
derives or persists analytics from runtime output

---

## 1. Problem

### 1.1 Two Stores, No Contract

After a workout completes, the same execution data lives in two separate IndexedDB
stores with no documented relationship between them:

| Store | IDB Object Store | Written by | Contents |
|-------|-----------------|------------|----------|
| **Logs** | `results[].data.logs` | `WorkbenchContext.completeWorkout()` | `StoredOutputStatement[]` — flat, per-block runtime output with metrics, timing, and hierarchy |
| **Analytics points** | `analytics[]` | `IndexedDBNotePersistence.mutateNote()` via `normalizeAnalyticsSegments()` | `AnalyticsDataPoint[]` — de-normalized numeric rows keyed by segment ID, type, and result ID |

Neither store references the other in its data model. A reader who wants "all
repetitions for this workout" must know which store to query — and the answer is
not documented anywhere.

### 1.2 Redundant Derivation Paths

The two stores are populated from two different transformation paths of the same
runtime output:

```
runtime.getOutputStatements()
     │
     ├── → toStoredOutputStatement() → WorkoutResults.logs → WorkoutResult.data.logs
     │                                                               │
     │                                                               ▼
     │                                                   getAnalyticsFromLogs()
     │                                                               │
     │                                                               ▼
     │                                              Segment[] (for live display)
     │
     └── → workbenchSyncStore.analyticsSegments → normalizeAnalyticsSegments()
                  (Segment[], from getAnalyticsFromRuntime())         │
                                                                       ▼
                                                          AnalyticsDataPoint[]
                                                          (in analytics IDB store)
```

`getAnalyticsFromLogs()` (used at review time) and `normalizeAnalyticsSegments()`
(used at write time) both extract numeric metric values from runtime output. They
use different transformation code:

- `getAnalyticsFromLogs()` → `extractMetricsFromGroups()` — iterates `IMetric[]`,
  maps `rep → repetitions`, `resistance → resistance`, etc.
- `normalizeAnalyticsSegments()` — iterates pre-computed `Record<string, unknown>`
  from the Zustand store's `Segment.metric` map.

These two paths can produce different values for the same workout because they
operate at different levels of abstraction (raw `IMetric[]` vs already-summarized
`Segment.metric`).

### 1.3 `AnalyticsDataPoint` Store Is Never Read Back

The `analytics` IndexedDB store is **write-only in practice**. There is no read
path in the current codebase:

```bash
$ grep -rn "objectStore.*analytics\|from.*analytics" src/ | grep -v "saveAnalytics\|delete\|schema\|types"
# Returns: only the cascade-delete call in deleteNote()
```

`AnalyticsDataPoint[]` is written by `normalizeAnalyticsSegments()` but:
- No component reads from the `analytics` IDB store for display
- No review route queries it
- No trend query uses it
- The only code that touches it (besides write) is the cascade delete in
  `IndexedDBService.deleteNote()`

The store was designed for future cross-workout trend queries but has no consumers.
Its presence creates a false signal: readers assume it is load-bearing and are
reluctant to change the write path.

### 1.4 Callers Still Cast Through `as any`

Two callers of `getAnalyticsFromLogs` still use `as any` casts because the
type contract is not stated anywhere:

```typescript
// WodCompanion.tsx
const { segments } = getAnalyticsFromLogs(result.data.logs as any, result.data.startTime);

// (FullscreenTimer.tsx — fixed by Opportunity A, but was the same)
```

The `as any` is a symptom of the undocumented contract: the author knows the
data is right but the type doesn't confirm it.

### 1.5 Deletion Test

**Delete `AnalyticsDataPoint[]` writes:** Nothing observable breaks. No UI reads
from the analytics store. The only effect is losing future capability for
server-side or background trend queries.

**Delete `WorkoutResult.data.logs`:** Review screen loses all analytics
visualization. `getAnalyticsFromLogs()` calls in `WodCompanion`, `FullscreenTimer`,
`NoteEditor`, and `useWorkbenchEffects` all fail silently or return empty data.
`logs` is **the load-bearing store**. `AnalyticsDataPoint` is the shallow one.

---

## 2. Proposed Solution

### 2.1 State the Contract Explicitly

Add a code comment at the persistence boundary and a domain-model document that
defines which store is authoritative, when to use each, and what the relationship
between them is.

**Authoritative contract (to be encoded as comments and a doc):**

> **`WorkoutResult.data.logs: StoredOutputStatement[]`** is the **source of truth**
> for a single completed workout.
>
> It contains the complete structural record of all runtime output blocks — timing,
> metrics, hierarchy, hints, and completion reasons — and is sufficient to
> reconstruct any analytics view for that workout without additional storage reads.
>
> **`AnalyticsDataPoint[]`** in the `analytics` IndexedDB store is a
> **derived denormalization** intended for future cross-workout trend queries
> (e.g., "average reps per session over the last 30 days"). It is not required for
> any current feature. If it is out of sync with `logs` for a given workout, `logs`
> wins.
>
> **Derivation rule:** `getAnalyticsFromLogs(workoutResult.data.logs)` is the
> canonical way to obtain `Segment[]` for display. `getAnalyticsFromRuntime()` is
> the live path during an active session. Both return the same logical shape.

### 2.2 Remove the Stale `as any` in `WodCompanion.tsx`

`WodCompanion.tsx` still casts `result.data.logs as any`. Since `WorkoutResult.data`
is typed as `WorkoutResults` (which now has `logs?: StoredOutputStatement[]`), this
cast can be removed:

```typescript
// Before
const { segments } = getAnalyticsFromLogs(result.data.logs as any, result.data.startTime);

// After
const { segments } = getAnalyticsFromLogs(result.data.logs ?? [], result.data.startTime);
```

### 2.3 Mark `AnalyticsDataPoint` Writes as Non-Load-Bearing

In `normalizeAnalyticsSegments()` and the call site in `IndexedDBNotePersistence`,
add a comment that makes the non-critical status explicit:

```typescript
/**
 * Persist analytics rows for future cross-workout trend queries.
 *
 * NOTE: This is a derived denormalization. The canonical data for a single
 * workout is in WorkoutResult.data.logs. If this write fails or is skipped,
 * the workout result remains fully functional. Do not add features that depend
 * on reading from the analytics store without first implementing a read path.
 */
await this.storage.saveAnalyticsPoints(points);
```

### 2.4 Add a Domain Model Document

Add `docs/domain-model/analytics-data-contract.md` that explicitly names the two
stores and their roles. This document is what future engineers — and AI agents —
read when they encounter both stores and wonder which one to use.

### 2.5 Guard the `AnalyticsDataPoint` Write (Future Work)

When a read path is eventually implemented, the write side should be validated
against the read side by comparing `normalizeAnalyticsSegments()` output against
`getAnalyticsFromLogs()` output for the same workout. Until then, the write path
should be treated as best-effort and never surfaced as an error to the user.

---

## 3. Benefits

### 3.1 Locality

The authoritative source for a workout's analytics is no longer implicit. Any
developer adding a feature that reads workout data knows immediately to look at
`WorkoutResult.data.logs` and call `getAnalyticsFromLogs()`.

Before: "Do I query the `analytics` store? The `results` store? Both? What if they
disagree?" (answer requires tracing `IndexedDBService`, `AnalyticsTransformer`,
and `useWorkbenchEffects`)

After: The contract is in one document and two code comments.

### 3.2 Leverage

`getAnalyticsFromLogs()` becomes the stable public API for all analytics
derivation from stored workouts. It already handles the full transformation.
Callers stop second-guessing whether they need the analytics store.

### 3.3 Tests Improve

- Existing tests for `normalizeAnalyticsSegments()` can be narrowed to validate
  the denormalization logic only — they no longer need to assert correctness of
  analytics data because `logs` is authoritative.
- Tests for `getAnalyticsFromLogs()` become the primary regression surface for
  analytics correctness.
- A new test can assert: "for this StoredOutputStatement[], `getAnalyticsFromLogs()`
  produces the same numeric values as `normalizeAnalyticsSegments()` would" — making
  the two paths explicitly contract-tested if/when both matter.

### 3.4 Reduced Cognitive Overhead for Future Work

The `AnalyticsDataPoint` store currently looks identical in weight to `WorkoutResult`
when browsing the codebase — same IDB store, similar schema, no stated priority.
Marking it as a non-load-bearing denormalization unblocks:

- Safe removal if the storage overhead is not worth it
- Safe migration to a different storage format (e.g., server-side) without
  breaking any feature
- Future implementation of trend queries without fear of over-relying on
  incomplete data

---

## 4. Implementation Steps

| Step | What | Where | Effort |
|------|------|--------|--------|
| 1 | Remove `as any` in `WodCompanion.tsx` | `src/components/Editor/overlays/WodCompanion.tsx:323` | Tiny |
| 2 | Add contract comment to `normalizeAnalyticsSegments()` | `src/services/persistence/IndexedDBNotePersistence.ts` | Tiny |
| 3 | Add contract comment to `getAnalyticsFromLogs()` | `src/services/AnalyticsTransformer.ts` | Tiny |
| 4 | Write `docs/domain-model/analytics-data-contract.md` | `docs/domain-model/` | Small |
| 5 | Add test asserting numeric equivalence between both paths | `src/services/persistence/__tests__/` | Small |

Total estimated effort: **half a day**.

---

## 5. What This Does NOT Change

- The `AnalyticsDataPoint` write path is kept as-is. It may be useful later.
- `IndexedDBService.saveAnalyticsPoints()` is kept. It just gets a documentation
  comment.
- The `analytics` IDB store schema is unchanged.
- No new read APIs are added until a consumer exists.

The value of this opportunity is **documentation depth**, not code depth. The seam
already exists (`getAnalyticsFromLogs()` is the correct API). The problem is that
callers don't know this because the contract has never been written down.

---

## 6. References

- **Storage schema:** `src/types/storage.ts`
- **AnalyticsDataPoint write:** `src/services/persistence/IndexedDBNotePersistence.ts:normalizeAnalyticsSegments()`
- **Analytics derivation:** `src/services/AnalyticsTransformer.ts:getAnalyticsFromLogs()`
- **WodCompanion cast:** `src/components/Editor/overlays/WodCompanion.tsx:323`
- **Domain model:** `docs/domain-model/entities.md`
