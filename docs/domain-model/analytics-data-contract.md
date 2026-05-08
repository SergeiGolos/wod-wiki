# Analytics Data Contract

**Updated:** 2026-05-08
**Status:** Authoritative

---

## Overview

After a workout completes, the execution data lives in two separate IndexedDB
stores. This document defines which store is authoritative, when to use each,
and how they relate.

---

## The Two Stores

### 1. `WorkoutResult.data.logs` — Source of Truth

**IDB object store:** `results[]`  
**Written by:** `WorkbenchContext.completeWorkout()` via `toStoredOutputStatement()`  
**Type:** `StoredOutputStatement[]`  

This is the **complete structural record** of a single completed workout — every
runtime output block with its timing, metrics, hierarchy, stack level, and
completion reason. It is sufficient to reconstruct any analytics view for that
workout without additional storage reads.

**When to use it:**
- Displaying the review screen for a past workout
- Building the analytics grid, trend chart, or segment summary
- Any query that asks "what happened during this specific workout"

**How to derive analytics from it:**

```typescript
import { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer';

const { segments, groups } = getAnalyticsFromLogs(
  workoutResult.data.logs ?? [],
  workoutResult.data.startTime,
);
```

`getAnalyticsFromLogs()` is the **canonical derivation path** for all analytics
from stored workouts. Do not bypass it to read `logs` directly unless you are
implementing a new transformation.

---

### 2. `AnalyticsDataPoint[]` — Derived Denormalization (Non-Load-Bearing)

**IDB object store:** `analytics[]`  
**Written by:** `IndexedDBNotePersistence.mutateNote()` via `normalizeAnalyticsSegments()`  
**Type:** `AnalyticsDataPoint[]`  

These rows are a **de-normalized snapshot** of the workout's segment metrics,
keyed by `(segmentId, type, resultId)`. They are intended for future
**cross-workout trend queries** (e.g., "average reps per session over the last
30 days") where scanning `WorkoutResult.data.logs` for every result would be
expensive.

**Current status: write-only.** No feature currently reads from the `analytics`
store. The only read access is the cascade delete in `IndexedDBService.deleteNote()`.

**Rules:**
- If the analytics store and `logs` disagree for a workout, **`logs` wins**.
- If the analytics write fails, the workout result is unaffected. The write is
  explicitly best-effort.
- Do not build features that read from the analytics store without first
  implementing and testing a read path.
- Do not add logic to `normalizeAnalyticsSegments()` that is required for
  correctness of any current feature.

---

## Derivation Diagram

```
runtime.getOutputStatements()
     │
     ├── toStoredOutputStatement()
     │        │
     │        ▼
     │   WorkoutResult.data.logs          ← SOURCE OF TRUTH
     │        │
     │        ▼
     │   getAnalyticsFromLogs()           ← CANONICAL READ PATH
     │        │
     │        ▼
     │   Segment[] / AnalyticsGroup[]     ← consumed by review/grid/chart UI
     │
     └── getAnalyticsFromRuntime()        ← LIVE PATH during active session
              │
              ▼
         Segment[] (same logical shape)
              │
              ▼
         normalizeAnalyticsSegments()
              │
              ▼
         AnalyticsDataPoint[]             ← DERIVED DENORMALIZATION (non-load-bearing)
              │
              ▼
         analytics IDB store             ← future cross-workout queries only
```

---

## Equivalence Invariant

`getAnalyticsFromLogs(workoutResult.data.logs)` and
`getAnalyticsFromRuntime(runtime)` (called at the moment of completion) should
produce the same logical segment structure. If they diverge, the `logs`-derived
result is authoritative because it is what was persisted.

A test in `src/services/persistence/__tests__/analytics-contract.test.ts`
verifies the numeric equivalence of both paths for a representative workout.

---

## Common Mistakes

| Mistake | Correct approach |
|---------|-----------------|
| Reading from the `analytics` IDB store to build the review screen | Call `getAnalyticsFromLogs(workoutResult.data.logs)` |
| Casting `result.data.logs as any` | Use `result.data.logs ?? []` — it is typed as `StoredOutputStatement[] \| undefined` |
| Treating `AnalyticsDataPoint[]` writes as load-bearing | They are best-effort. Handle failures gracefully, do not surface to user |
| Adding display logic to `normalizeAnalyticsSegments()` | That function is for persistence only. Display logic belongs in `AnalyticsTransformer` |

---

## Related Files

| File | Role |
|------|------|
| `src/components/Editor/types/index.ts` | `StoredOutputStatement`, `WorkoutResults`, `toStoredOutputStatement()` |
| `src/services/AnalyticsTransformer.ts` | `getAnalyticsFromLogs()`, `getAnalyticsFromRuntime()` |
| `src/services/persistence/IndexedDBNotePersistence.ts` | `normalizeAnalyticsSegments()`, analytics write path |
| `src/types/storage.ts` | `WorkoutResult`, `AnalyticsDataPoint` IDB schemas |
| `src/hooks/useWorkbenchServices.ts` | Public re-export of `getAnalyticsFromLogs` for component use |
