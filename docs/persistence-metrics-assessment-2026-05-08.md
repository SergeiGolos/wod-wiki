# Persistence & Metrics — Architecture Re-Assessment

**Date:** 2026-05-08
**Scope:** Note storage, `WorkoutResults` shape, metrics access and processing
**Basis:** Live code exploration against prior assessments
(`docs/architecture-deepening-opportunities-2026-05-07.md`,
`docs/note-persistence-module-plan.md`,
`docs/plans/fragment-first-runtime-storage.md`,
`docs/metric-presentation-implementation-deep-dive-2026-05-07.md`)

---

## Executive Summary

Since the May 7 assessment, the **Note Persistence Module** was fully implemented: the
`INotePersistence` seam exists, `IndexedDBNotePersistence` and
`ContentProviderNotePersistence` are in place, and all major UI callers have been
migrated off direct `indexedDBService` imports. That is significant progress.

However, three clusters of friction survive in the persistence and metrics pipeline:

1. **`WorkoutResults` shape has unresolved ambiguity** — a half-serializable
   `IOutputStatement[]` stored in IndexedDB, a `WorkoutMetricFragment[]` field that
   is written but never read, and two independent analytics paths whose relationship
   is undocumented.

2. **Analytics persistence is split across two mutations** — completing a workout
   triggers a `mutateNote` from `WorkbenchContext` and then a second `mutateNote`
   from `useWorkbenchEffects`. These two writes represent a single logical operation.

3. **Metric display rules are still scattered** — the May 7 Metric Presentation Module
   proposal was not implemented. `MetricVisualizer`, `MetricSourceRow`, and
   `timer-panel` each filter `group` and `lap` independently, and `MetricType` is
   defined twice with no enforced relationship between the two definitions.

---

## 1. What Was Completed Since May 7

### Note Persistence Module — Fully Implemented ✅

The plan in `docs/note-persistence-module-plan.md` has been executed:

| Item | Status |
|------|--------|
| `INotePersistence` interface | ✅ `src/services/persistence/INotePersistence.ts` |
| `IndexedDBNotePersistence` | ✅ 284 lines, full impl |
| `ContentProviderNotePersistence` | ✅ 139 lines, adapter over IContentProvider |
| `types.ts` (NoteLocator, GetNoteOptions, ResultSelection, NoteMutation) | ✅ complete |
| `createNotePersistence()` factory | ✅ `src/services/persistence/index.ts` |
| `WorkbenchContext` migrated | ✅ uses `notePersistence.getNote()` / `mutateNote()` |
| `useWorkbenchEffects` migrated | ✅ uses `notePersistence.mutateNote()` for analytics |
| `NoteEditor` migrated | ✅ uses `INotePersistence` interface |
| `useWodBlockResults` migrated | ✅ uses `workbench.notePersistence.getNote()` |
| Zero direct `indexedDBService` imports in UI components | ✅ confirmed |

**Deletion test on `INotePersistence`:** Deleting it would scatter result linking,
analytics persistence, and attachment management back across
`WorkbenchContext`, `useWodBlockResults`, `useWorkbenchEffects`, and `NoteEditor`.
The seam is **earning its keep**.

---

## 2. Remaining Friction — Note Persistence

### 2.1 `WorkoutResults` Shape Has Dead Weight

**Files:** `src/components/Editor/types/index.ts`, `src/types/storage.ts`

`WorkoutResults` carries three representations of the same execution data:

```typescript
interface WorkoutResults {
  startTime: number;
  endTime: number;
  duration: number;
  completed: boolean;

  metrics: WorkoutMetricFragment[];   // ← written during completion; never read back
  logs?: IOutputStatement[];          // ← the one actually used for replay/analytics
}
```

**`metrics: WorkoutMetricFragment[]`** — wraps `IMetric` objects extracted from
`IOutputStatement` segments. It is set in `RuntimeTimerPanel.tsx` during completion
but is **never read back from storage**. `useWorkbenchEffects`, `FullscreenTimer`,
and `AnalyticsTransformer` all consume `results.logs`, not `results.metrics`.

**Deletion test:** Deleting `WorkoutResults.metrics` would require zero callers to
change. The field is a **shallow pass-through** that earns nothing.

**`logs?: IOutputStatement[]`** — stores full `OutputStatement` class instances in
IndexedDB. The class has:
- `elapsed: number` — computed eagerly in constructor, survives serialization ✅
- `spans: ReadonlyArray<TimeSpan>` — plain data array, survives serialization ✅
- `metrics: MetricContainer` — a class with methods. Survives because
  `MetricContainer.from()` defensively handles deserialized `{ _metrics: [...] }`
  plain objects ✅ (but this is undocumented implicit contract)
- `hints?: Set<string>` — **does NOT survive JSON serialization**. `Set` becomes
  `{}` in IndexedDB. `Array.from({})` returns `[]`, so hints are silently lost on
  round-trip. This is a latent data-loss bug.
- `metricMeta: Map<IMetric, CodeMetadata>` — also does not survive serialization
  (becomes `{}`). Used only internally, so not currently observable.
- `getDisplayMetrics()`, `getMetric()`, etc. — methods are lost; callers use data
  properties only, so analytics reconstruction still works in practice.

**The core problem:** Storing class instances with survival-by-coincidence is
a fragile contract. The round-trip from live `OutputStatement` to plain JSON object
and back is load-bearing but undocumented and tested only implicitly.

### 2.2 Analytics Persistence Is Split Across Two Mutations

**Files:** `src/components/layout/WorkbenchContext.tsx`,
`src/components/layout/useWorkbenchEffects.ts`

Completing a workout fires two separate `mutateNote` calls for what is logically
one atomic write:

**Mutation 1 — `WorkbenchContext.completeWorkout()`:**
```typescript
notePersistence.mutateNote(targetId, {
  rawContent: ...,
  metadata: { title },
  workoutResult: {
    id: resultId,
    sectionId: selectedBlockId,
    data: result,          // WorkoutResults including logs
    // ← analyticsSegments NOT included here
  },
});
```

**Mutation 2 — `useWorkbenchEffects.ts` (fires separately on status → 'completed'):**
```typescript
notePersistence.mutateNote(noteId, {
  analytics: {
    segments: currentSegments,  // from Zustand analyticsStore
    resultId: routeResultId,    // ← may differ from the resultId above
  },
});
```

**Problems:**

- Two writes can interleave with navigation, disposal, or unmount. If the component
  unmounts between the two, analytics may not persist.
- `routeResultId` in the analytics mutation is the URL-bound result ID at the time
  of the effect, which may not match the `resultId` generated in `completeWorkout`.
  The `WorkoutResult` and its `AnalyticsDataPoint[]` can end up with mismatched IDs.
- `INotePersistence.mutateNote()` accepts `workoutResult.analyticsSegments` as a
  combined path, but `completeWorkout` doesn't use it.

**Deletion test:** If you deleted `useWorkbenchEffects` analytics persistence, the
`AnalyticsDataPoint` store would stop being populated. But `WorkoutResults.logs`
would still persist the full `IOutputStatement[]`, and `AnalyticsTransformer` can
regenerate analytics from `logs`. This reveals that `AnalyticsDataPoint` is a
**derived denormalization** of `logs` — useful for cross-workout trend queries but
not the source of truth.

### 2.3 `IContentProvider` Is Still a Middle Layer

**Files:** `src/services/persistence/IndexedDBNotePersistence.ts`,
`src/services/content/IndexedDBContentProvider.ts`

`IndexedDBNotePersistence` delegates to `IndexedDBContentProvider` for Note/Segment/
Result read-write. The chain is:

```
INotePersistence
  → IndexedDBNotePersistence
    → IndexedDBContentProvider
      → IndexedDBService (raw IDB operations)
```

`IndexedDBContentProvider` still owns the segment versioning and result-linking
business logic. `INotePersistence` calls `contentProvider.getEntry()`,
`contentProvider.updateEntry()`, `contentProvider.deleteEntry()`. This means the
segment version bump, content reconstruction, and result persistence rules live in
`IndexedDBContentProvider`, not in `IndexedDBNotePersistence`.

The original plan called for consolidating all persistence rules into the Note
Persistence Module. Currently it is a delegation chain, not a consolidation.
`IndexedDBContentProvider` is still the real note lifecycle engine; the
`INotePersistence` layer is thinner than intended.

**Consequence:** A bug in segment versioning or result linking is still fixed in
`IndexedDBContentProvider`, not at the persistence seam. Callers who want to test
the full lifecycle must still exercise `IndexedDBContentProvider` behavior.

---

## 3. Remaining Friction — Metrics Storage

### 3.1 Two Analytics Representations Without Documented Relationship

**Files:** `src/types/storage.ts`, `src/services/AnalyticsTransformer.ts`

Two analytics data stores exist with overlapping content:

| Store | Location | Contents | Written by |
|-------|----------|----------|------------|
| `WorkoutResult.data.logs` | `results` IDB store | `IOutputStatement[]` — full structured runtime output with per-block metrics | `WorkbenchContext.completeWorkout()` |
| `AnalyticsDataPoint[]` | `analytics` IDB store | Derived numeric metrics per segment (elapsed, reps, resistance, etc.) | `useWorkbenchEffects` via `normalizeAnalyticsSegments()` |

The `AnalyticsDataPoint` rows are derived from `analyticsSegments` in the Zustand
store, which is itself derived from the runtime. `WorkoutResults.logs` is derived
from `runtime.getOutputStatements()`. Both represent the same workout execution.

`AnalyticsTransformer.fromOutputStatements()` can regenerate everything in
`AnalyticsDataPoint` from `WorkoutResults.logs`, but they go through different
extraction paths (`normalizeAnalyticsSegments` vs `extractMetricsFromGroups`).

Neither store references the other. A consumer wanting "all reps for this workout"
must know which store to query. There is no documented contract for which store is
authoritative, when to use each, or whether they are always in sync.

### 3.2 Fragment-First Storage Plan Not Implemented

**Files:** `docs/plans/fragment-first-runtime-storage.md` (proposal only)

The December 2025 `Fragment-First Runtime Storage Plan` proposed replacing
`SpanMetrics` / `RuntimeMetric` with `ICodeFragment[]` stored directly on
`ExecutionSpan`. This plan **has not been implemented**.

The current state uses `IMetric` (not `ICodeFragment`) throughout the runtime:

- `FragmentState.groups: MetricContainer[]` — in block memory
- `IOutputStatement.metrics: MetricContainer` — on output
- `WorkoutResults.metrics: WorkoutMetricFragment[]` — wraps `IMetric`

`ICodeFragment` and `IMetric` are **different interfaces** with overlapping
semantics. `ICodeFragment` (with `fragmentType: FragmentType`) is used by the
parser and some display components. `IMetric` (with `type: MetricType`) is used
by the runtime, memory, and output pipeline. The metricsToFragments adapter that
the plan proposed to eliminate does not appear to exist in the current codebase
either — instead, `IMetric` reaches the UI directly.

The conversion bottleneck the plan identified (`SpanMetrics → metricsToFragments()
→ ICodeFragment[]`) is absent. The actual bottleneck is `IOutputStatement.metrics`
(a `MetricContainer` of `IMetric`) being used directly in UI components
(`MetricVisualizer`, `MetricSourceRow`). The plan's goal — a single data format
from parse to display — remains unresolved.

### 3.3 `MetricType` Is Defined Twice

**Files:** `src/views/runtime/metricColorMap.ts`, `src/core/models/Metric.ts`

Two independent `MetricType` definitions exist:

```typescript
// src/views/runtime/metricColorMap.ts
export type MetricType =
  | 'time' | 'rep' | 'effort' | 'distance' | 'rounds' | 'action'
  | 'increment' | 'lap' | 'text' | 'resistance' | 'duration'
  | 'spans' | 'elapsed' | 'total' | 'system-time' | 'metric' | 'rest';

// src/core/models/Metric.ts
export enum MetricType {
  Timer = 'timer',   // note: 'timer' not 'time'
  Rep = 'rep',
  Effort = 'effort',
  // ... 20+ values
}
```

These are **not the same type**. `'time'` in the color map does not match
`MetricType.Timer = 'timer'` in the enum. Both are imported in different parts
of the codebase without any enforced relationship. A new metric type added to the
enum will not automatically get color or icon mapping; the author must remember to
update `metricColorMap.ts` and `getMetricIcon()` separately.

The `src/core/types/metrics.ts` file even documents this divergence:
```
// Note: MetricTypeString and FragmentColorMap have been moved to
// src/views/runtime/metricColorMap.ts as the canonical source.
```
...but `metricColorMap.MetricType` uses `'time'` while the canonical
`core/models/Metric.ts` enum uses `'timer'`.

### 3.4 Metric Display Rules Still Scattered

**Files:** `src/views/runtime/MetricVisualizer.tsx`,
`src/components/metrics/MetricSourceRow.tsx`, `src/panels/timer-panel.tsx`

The May 7 Metric Presentation Module proposal has **not been implemented**. The same
display rules are still duplicated across at least three modules:

**`group` + `lap` filtering — present in three places:**

```typescript
// MetricVisualizer.tsx (lines ~145-152)
.filter(metric => {
  const type = (metric.type || '').toLowerCase();
  const image = metric.image || '';
  if (type === 'group' && (image === '+' || image === '-')) return false;
  return type !== 'lap';
})

// MetricSourceRow.tsx (lines ~247-252)
.map(group => group.filter(f => {
  if (type === 'group' && (image === '+' || image === '-')) return false;
  return type !== 'lap';
}))

// timer-panel.tsx — similar inline filter
```

**Comment detection** (`parser`-origin `text` → muted italic) — in `MetricVisualizer`
only. `MetricSourceRow` and `timer-panel` do not apply this rule.

**Rounds label formatting** (`'3'` → `'3 Rounds'`) — in `MetricVisualizer` only via
`formatTokenValue()`.

**Deletion test:** Deleting the inline filter in `MetricVisualizer` would expose
structural `group` markers and `lap` metrics in the runtime badge view. A bug fix
to the hiding rule requires three separate changes. The rules are **not earning
locality**.

---

## 4. Summary of Findings

### Note Storage

| Area | Status | Friction |
|------|--------|---------|
| `INotePersistence` seam | ✅ Implemented | — |
| Callers migrated off `indexedDBService` | ✅ Complete | — |
| `WorkoutResults.metrics` field | ⚠️ Dead code | Written, never read back; creates confusion |
| `WorkoutResults.logs` serialization | ⚠️ Partial | `Set<string>` hints lost on round-trip; `MetricContainer` recovered via private `_metrics` field (implicit contract) |
| Analytics dual-write | ⚠️ Split | Two `mutateNote` calls per workout completion; `resultId` linkage may diverge |
| Segment versioning locality | ⚠️ Delegated | Business logic still in `IndexedDBContentProvider`, not in the `INotePersistence` impl |

### Metrics Storage & Processing

| Area | Status | Friction |
|------|--------|---------|
| Fragment-first storage plan | ❌ Not started | `IMetric` and `ICodeFragment` still separate representations |
| `WorkoutResults.logs` vs `AnalyticsDataPoint[]` | ⚠️ Undocumented | Same data in two stores, different paths, no contract for which is authoritative |
| `MetricType` duplication | ⚠️ Active | String union in `metricColorMap.ts` vs enum in `core/models/Metric.ts`; `'time'` ≠ `'timer'` |
| Metric Presentation Module | ❌ Not started | `group`/`lap` filters in 3 places; comment detection in 1; rounds formatting in 1 |

---

## 5. Deepening Opportunities

### Opportunity A — Consolidate `WorkoutResults` (Note Persistence)

**Problem:** `WorkoutResults.metrics` is dead code; `logs: IOutputStatement[]`
stores class instances with an implicit survival contract through IndexedDB;
`hints: Set<string>` is silently lost.

**Solution:** Define a plain-data storage type for runtime output:

```typescript
// Plain-data snapshot — safe for JSON round-trip
interface StoredOutputStatement {
  id: number;
  outputType: OutputStatementType;
  timeSpan: { started: number; ended?: number };
  spans: Array<{ started: number; ended?: number }>;
  elapsed: number;
  total: number;
  metrics: IMetric[];       // plain array, not MetricContainer
  hints?: string[];         // plain array, not Set
  sourceBlockKey: string;
  stackLevel: number;
  parent?: number;
  children: number[][];
  // ... other plain-data fields
}

interface WorkoutResults {
  startTime: number;
  endTime: number;
  duration: number;
  completed: boolean;
  logs?: StoredOutputStatement[];   // replaces IOutputStatement[]
  // Remove: metrics: WorkoutMetricFragment[]
}
```

**Benefits (locality + leverage):**
- `WorkoutResults` is reliably serializable. No class survival contract.
- `AnalyticsTransformer.fromOutputStatements()` accepts both live and stored shape via
  a shared interface.
- `hints` are no longer silently dropped.
- `WorkoutMetricFragment[]` dead code is removed, reducing cognitive surface.

### Opportunity B — Unify the Analytics Write (Note Persistence)

**Problem:** One logical event (workout completion) triggers two `mutateNote` calls
with potentially mismatched `resultId` values.

**Solution:** Include analytics segments in the `completeWorkout` mutation:

```typescript
// WorkbenchContext.completeWorkout()
notePersistence.mutateNote(targetId, {
  rawContent: ...,
  metadata: { title },
  workoutResult: {
    id: resultId,
    sectionId: selectedBlockId,
    data: result,
    analyticsSegments: store.getState().analyticsSegments,  // ← add this
  },
});
```

Remove the analytics persistence from `useWorkbenchEffects`. The
`INotePersistence.mutateNote()` signature already accepts
`workoutResult.analyticsSegments` — this is a wiring fix, not an interface change.

**Benefits:**
- One mutation per completion event. Atomicity guaranteed where the backend
  supports transactions.
- `resultId` linkage between `WorkoutResult` and `AnalyticsDataPoint[]` is
  always consistent — both come from the same `mutateNote` call.
- `useWorkbenchEffects` analytics persistence block can be deleted.

### Opportunity C — Document and Clarify Analytics Data Contract (Metrics)

**Problem:** Two stores (`WorkoutResult.data.logs` and `AnalyticsDataPoint[]`)
represent overlapping data without a documented contract for which is authoritative.

**Solution:** Add an explicit contract to `docs/domain-model/` and code comments:

> **`WorkoutResult.data.logs`** is the **source of truth** for a single completed
> workout. `AnalyticsTransformer` can always regenerate analytics from it.
>
> **`AnalyticsDataPoint[]`** is a **derived denormalization** for cross-workout
> trend queries. It is populated by `normalizeAnalyticsSegments()` at completion.
> Consumers that need per-workout visualization should prefer `logs`; consumers that
> need trend data across many workouts should prefer `AnalyticsDataPoint[]`.

This does not require code changes — it is a documentation seam that makes
future exploration faster and prevents re-implementing the ad-hoc query path.

### Opportunity D — Deepen the Metric Presentation Module (Metrics)

This was Candidate 6 in the May 7 assessment and remains unimplemented.

**Problem:** `group`/`lap` filtering is in three files; comment detection and
rounds formatting are each in one file with no stable test surface.

**Solution:** Implement `src/core/metrics/presentation/MetricPresentationPolicy.ts`
as proposed in `docs/metric-presentation-implementation-deep-dive-2026-05-07.md`.

Key leverage: once the policy exists, `MetricVisualizer`, `MetricSourceRow`, and
`timer-panel` each call `policy.presentGroup(metrics, { surface })` and render
the resulting tokens — they stop reimplementing the hiding rules.

**First slice (low-risk):** Create the policy module + characterization tests only.
Do not migrate any call sites yet. This locks current behavior before moving code.

### Opportunity E — Unify `MetricType` (Metrics)

**Problem:** `metricColorMap.MetricType` uses `'time'` but `Metric.MetricType`
enum uses `'timer'`. New metric types require two manual updates with no
compiler enforcement.

**Solution:** Remove `type MetricType` from `metricColorMap.ts`. Replace the
color/icon maps to key on `import { MetricType } from '@/core/models/Metric'`:

```typescript
// Before
export const metricColorMap: FragmentColorMap = {
  time: '...',  // string literal
};

// After
export const metricColorMap: Record<MetricType | 'rest', string> = {
  [MetricType.Timer]: '...',  // enum member — compiler enforces completeness
};
```

This is a **low-risk, high-clarity** change. A new entry in `MetricType` becomes
a TypeScript compile error in `metricColorMap.ts` until the map is updated.

---

## 6. Recommended Priorities

| Priority | Opportunity | Effort | Impact |
|----------|-------------|--------|--------|
| 1 | **B — Unify analytics write** | Small (wiring change) | Eliminates split mutation, fixes resultId mislink |
| 2 | **E — Unify MetricType** | Small (type change) | Eliminates silent drift between color map and enum |
| 3 | **A — Consolidate WorkoutResults** | Medium | Removes dead field, fixes Set serialization, stabilizes round-trip |
| 4 | **C — Document analytics contract** | Small (docs) | Makes two-store architecture intentional and navigable |
| 5 | **D — Metric Presentation Module** | Large | High leverage; enables single-place UX changes |

Opportunities B and E can be executed independently and safely. A depends on
defining `StoredOutputStatement` and migrating `AnalyticsTransformer`. D is the
largest and should follow E (since a unified `MetricType` is a prerequisite for
a clean presentation policy interface).

---

## References

- **Prior assessment:** `docs/architecture-deepening-opportunities-2026-05-07.md`
- **Note persistence plan:** `docs/note-persistence-module-plan.md`
- **Fragment-first storage plan:** `docs/plans/fragment-first-runtime-storage.md`
- **Metric presentation deep dive:** `docs/metric-presentation-implementation-deep-dive-2026-05-07.md`
- **Domain entities:** `docs/domain-model/entities.md`
- **Storage schema:** `src/types/storage.ts`
- **INotePersistence:** `src/services/persistence/INotePersistence.ts`
- **IndexedDBNotePersistence:** `src/services/persistence/IndexedDBNotePersistence.ts`
- **WorkoutResults:** `src/components/Editor/types/index.ts`
- **MetricType (core):** `src/core/models/Metric.ts`
- **metricColorMap:** `src/views/runtime/metricColorMap.ts`
