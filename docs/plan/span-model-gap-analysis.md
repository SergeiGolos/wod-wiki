# Span Model Gap Analysis & Migration Plan

> **Created:** 2025-12-26  
> **Updated:** 2025-12-26  
> **Status:** Migration Plan  
> **Purpose:** Define new span model and migration path from ExecutionSpan

---

## Table of Contents

1. [Final Proposed Model](#final-proposed-model)
2. [Gap Resolution Decisions](#gap-resolution-decisions)
3. [Types to Remove](#types-to-remove)
4. [Migration Impact Analysis](#migration-impact-analysis)
5. [Implementation Plan](#implementation-plan)

---

## Final Proposed Model

Based on gap analysis and design decisions, here is the **final model**:

```typescript
/**
 * Represents a single time segment (start/stop pair).
 * Multiple TimerSpans allow tracking pause/resume cycles.
 */
export class TimerSpan {
    started?: Date;
    ended?: Date;

    duration(): number {
        if (!this.started) return 0;
        const end = this.ended ?? new Date();
        return end.getTime() - this.started.getTime();
    }
    
    isRunning(): boolean {
        return this.started !== undefined && this.ended === undefined;
    }
}

/**
 * Status for non-normal span completion.
 * Normal completion has no status (undefined = completed successfully).
 */
export type SpanStatus = 'failed' | 'skipped';

/**
 * Core span for tracking block execution.
 * Replaces ExecutionSpan, TrackedSpan, TimeSegment.
 */
export class RuntimeSpan {
    // === Identity ===
    blockId: string;               // Block key as string
    sourceIds: number[];           // Source statement IDs (array for multi-statement blocks)
    
    // === Time Tracking ===
    spans: TimerSpan[];            // Pause/resume tracking (first = start, last.ended = complete)
    
    // === Display ===
    fragments: ICodeFragment[][];  // Per-statement fragment groups (includes tracked metrics as fragments)
    
    // === Status ===
    status?: SpanStatus;           // Only set on failure/skip (undefined = completed or active)
    
    // === Computed Properties ===
    
    /** Unique ID derived from first span start time and blockId */
    get id(): string {
        const startMs = this.spans[0]?.started?.getTime() ?? 0;
        return `${startMs}-${this.blockId}`;
    }
    
    /** Is the span currently active (last TimerSpan has no end) */
    isActive(): boolean {
        return this.spans.at(-1)?.ended === undefined;
    }
    
    /** Total duration in ms (sum of all TimerSpan durations) */
    total(): number {
        return this.spans.reduce((sum, s) => sum + s.duration(), 0);
    }
    
    /** Elapsed time since first start (wall clock, not accounting for pauses) */
    elapsed(): number {
        const start = this.spans[0]?.started;
        if (!start) return 0;
        const end = this.spans.at(-1)?.ended ?? new Date();
        return end.getTime() - start.getTime();
    }
    
    /** Remaining time in ms, or undefined if span is unbounded */
    remaining(): number | undefined {
        // Find timer fragment in fragments array
        const timerFragment = this.fragments
            .flat()
            .find(f => f.fragmentType === FragmentType.Timer);
        
        if (!timerFragment?.value) return undefined;
        
        const durationMs = timerFragment.value as number;
        return Math.max(0, durationMs - this.total());
    }
    
    /** Start time (first TimerSpan start) */
    get startTime(): Date | undefined {
        return this.spans[0]?.started;
    }
    
    /** End time (last TimerSpan end, if complete) */
    get endTime(): Date | undefined {
        return this.spans.at(-1)?.ended;
    }
}
```

---

## Gap Resolution Decisions

| Gap                                 | Decision                        | Rationale                                                                                                                            |
| ----------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **2. Hierarchy (parentSpanId)**     | ❌ **REMOVE**                    | Can be reconstructed later from `blockId` and `sourceIds` relationships. The runtime stack provides parent context during execution. |
| **3. Classification (type, label)** | ❌ **REMOVE**                    | Push downstream - derive from `fragments` array at display time. Each fragment has `fragmentType` that indicates the span's nature.  |
| **4. Status**                       | ✅ **ADD**                       | Keep as `status?: 'failed' \| 'skipped'`. Active = `isActive()`, completed = `!isActive() && !status`.                               |
| **5. Metrics Collection**           | ❌ **REMOVE as separate object** | Metrics become **fragments pushed onto the array**. New fragment types for tracked/collected data.                                   |
| **6. Time Segments**                | ❌ **REMOVE**                    | Work/rest/round data attached as fragments. Rounds become child spans (separate RuntimeSpan entries).                                |
| **7. Fragments**                    | ✅ **IMPROVED**                  | `ICodeFragment[][]` preserves per-statement grouping.                                                                                |
| **8. Debug Metadata**               | ❌ **REMOVE**                    | Debug needs reference `sourceIds` which is now an array. Dev tooling can use sourceIds for lookup.                                   |
| **9. Source ID Cardinality**        | ✅ **ARRAY**                     | Keep as `sourceIds: number[]` to support multi-statement blocks (Groups).                                                            |

---

## Types to Remove

### Files to Delete/Consolidate

| Current File | Action | Notes |
|--------------|--------|-------|
| `src/runtime/models/TrackedSpan.ts` | **REPLACE** | Contains ExecutionSpan, SpanMetrics, TimeSegment, etc. |
| `src/runtime/models/ExecutionSpan.ts` | **DELETE** | If separate from TrackedSpan |

### Types to Remove

```typescript
// === REMOVE: These interfaces ===
interface ExecutionSpan { ... }        // → RuntimeSpan
interface TrackedSpan { ... }          // → RuntimeSpan  
interface SpanMetrics { ... }          // → fragments array
interface TimeSegment { ... }          // → child RuntimeSpan or fragments
interface DebugMetadata { ... }        // → use sourceIds for lookup
interface MetricValueWithTimestamp { } // → fragment with timestamp
interface RecordedMetricValue { }      // → fragment
interface MetricGroup { }              // → fragment group

// === REMOVE: These types ===
type SpanType = 'timer' | 'rounds' | 'effort' | ...  // → derive from fragments
type SegmentType = 'work' | 'rest' | 'round' | ...   // → fragments or child spans

// === REMOVE: These constants ===
const EXECUTION_SPAN_TYPE = ...        // → new memory type for RuntimeSpan

// === REMOVE: These functions ===
function createExecutionSpan() { }     // → RuntimeSpan constructor
function createEmptyMetrics() { }      // → not needed
function createTimeSegment() { }       // → not needed
function legacyTypeToSpanType() { }    // → not needed
function isActiveSpan() { }            // → span.isActive()
function createDebugMetadata() { }     // → not needed
```

### New Types to Create

```typescript
// === ADD: New file src/runtime/models/RuntimeSpan.ts ===

export class TimerSpan { ... }
export class RuntimeSpan { ... }
export type SpanStatus = 'failed' | 'skipped';

// Memory type constant
export const RUNTIME_SPAN_TYPE = 'runtime:span';

// Factory function (optional)
export function createRuntimeSpan(
    blockId: string,
    sourceIds: number[],
    fragments: ICodeFragment[][]
): RuntimeSpan { ... }
```

---

## Migration Impact Analysis

### Consumer: Before & After

#### 1. `useExecutionSpans` hook (`src/clock/hooks/useExecutionSpans.ts`)

| Aspect | Before | After |
|--------|--------|-------|
| **Status check** | `s.status === 'active'` | `s.isActive()` |
| **Indexing** | `byId.set(span.id, span)` | `byId.set(span.id, span)` (same, id is computed) |
| **Categorization** | Filter by `status` string | Filter by `isActive()` method |

```typescript
// BEFORE
const active = spans.filter(s => s.status === 'active');
const completed = spans.filter(s => s.status !== 'active');

// AFTER
const active = spans.filter(s => s.isActive());
const completed = spans.filter(s => !s.isActive());
```

---

#### 2. `useSpanHierarchy` hook (`src/clock/hooks/useExecutionSpans.ts`)

| Aspect | Before | After |
|--------|--------|-------|
| **Hierarchy** | `span.parentSpanId` lookup | **REMOVE HOOK** - reconstruct from stack/block relationships if needed |
| **Depth** | Build map from parent links | Compute at display time from sourceIds/block structure |

```typescript
// BEFORE
if (span.parentSpanId) {
    const parentDepth = depthMap.get(span.parentSpanId) ?? 0;
    depthMap.set(span.id, parentDepth + 1);
}

// AFTER - Option 1: Remove hierarchy display
// AFTER - Option 2: Compute depth from block sourceIds/indentation
const depth = computeDepthFromSourceIds(span.sourceIds, script);
```

---

#### 3. `RuntimeHistoryLog` (`src/components/history/RuntimeHistoryLog.tsx`)

| Aspect                 | Before                                     | After                                                     |
| ---------------------- | ------------------------------------------ | --------------------------------------------------------- |
| **Label display**      | `span.label`                               | Derive from fragments: `fragmentsToLabel(span.fragments)` |
| **Metrics**            | `span.metrics.reps`, `span.metrics.weight` | Extract from fragments array                              |
| **Parent inheritance** | Lookup by `parentSpanId`                   | Look up by sourceIds relationship or flatten              |

```typescript
// BEFORE
<div>{span.label}</div>
if (pm.reps && !combinedMetrics.reps) combinedMetrics.reps = pm.reps;

// AFTER
<div>{deriveLabel(span.fragments)}</div>
const reps = span.fragments.flat().find(f => f.fragmentType === FragmentType.Rep);
```

---

#### 4. `ExecutionLogPanel` (`src/components/workout/ExecutionLogPanel.tsx`)

| Aspect | Before | After |
|--------|--------|-------|
| **Indentation** | `useSpanHierarchy()` depth map | Remove or compute from script structure |
| **Status display** | `span.status` string | `span.isActive()` + `span.status` for failed/skipped |

```typescript
// BEFORE
const depthMap = useSpanHierarchy(runtime);
const indent = depthMap.get(span.id) ?? 0;

// AFTER
// Option 1: Flat display (no indentation)
// Option 2: Compute indent from sourceIds
const indent = computeIndent(span.sourceIds, script);
```

---

#### 5. `ExecutionLogService` (`src/services/ExecutionLogService.ts`)

| Aspect | Before | After |
|--------|--------|-------|
| **Serialization** | Store ExecutionSpan object | Store RuntimeSpan (needs serialization) |
| **Duration calc** | `endTime - startTime` | `span.total()` |

```typescript
// BEFORE
this.spanMap.set(span.id, span);
this.currentResult.duration = this.latestEnd - this.earliestStart;

// AFTER
this.spanMap.set(span.id, span);
this.currentResult.duration = span.elapsed();
// Note: RuntimeSpan needs toJSON() for localStorage
```

---

#### 6. `AnalyticsTransformer` (`src/services/AnalyticsTransformer.ts`)

| Aspect | Before | After |
|--------|--------|-------|
| **Type filtering** | `spans.filter(s => s.type === 'effort')` | Filter by fragment presence |
| **Metrics aggregation** | Sum `span.metrics.reps.value` | Sum from fragment values |

```typescript
// BEFORE
const effortSpans = spans.filter(s => s.type === 'effort');
const totalReps = spans.reduce((sum, s) => sum + (s.metrics.reps?.value ?? 0), 0);

// AFTER
const effortSpans = spans.filter(s => 
    s.fragments.flat().some(f => f.fragmentType === FragmentType.Effort)
);
const totalReps = spans.reduce((sum, s) => {
    const repFrag = s.fragments.flat().find(f => f.fragmentType === FragmentType.Rep);
    return sum + (repFrag?.value as number ?? 0);
}, 0);
```

---

#### 7. `HistoryBehavior` (`src/runtime/behaviors/HistoryBehavior.ts`)

| Aspect | Before | After |
|--------|--------|-------|
| **Span creation** | `createExecutionSpan()` with many params | `new RuntimeSpan()` with fragments |
| **Metrics extraction** | `extractMetricsFromBlock()` → `span.metrics` | Fragments already contain metrics |
| **On pop** | Set `endTime`, `status: 'completed'` | Close last `TimerSpan` |

```typescript
// BEFORE
const span: TrackedSpan = {
    id: `${this.startTime}-${block.key}`,
    blockId: block.key.toString(),
    parentSpanId: this.parentSpanId,
    type: legacyTypeToSpanType(block.blockType),
    label: this.label,
    startTime: this.startTime,
    status: 'active',
    metrics: initialMetrics,
    segments: [],
    fragments: this.buildFragments(block),
};

// AFTER
const span = new RuntimeSpan();
span.blockId = block.key.toString();
span.sourceIds = block.sourceIds;
span.fragments = block.fragments ?? [];
span.spans = [{ started: new Date() }];
```

---

#### 8. `LoopCoordinatorBehavior` (`src/runtime/behaviors/LoopCoordinatorBehavior.ts`)

| Aspect | Before | After |
|--------|--------|-------|
| **Round span creation** | ExecutionSpan with `parentSpanId` | RuntimeSpan - parent derived from stack |
| **Metrics on round** | `metrics.currentRound`, `metrics.totalRounds` | Add as fragments |

```typescript
// BEFORE
const span: TrackedSpan = {
    id: `${startTime}-${newRoundOwnerId}`,
    blockId: newRoundOwnerId,
    parentSpanId: blockId,  // ← This goes away
    type: spanType as any,
    metrics: metrics,
    // ...
};

// AFTER
const roundSpan = new RuntimeSpan();
roundSpan.blockId = newRoundOwnerId;
roundSpan.sourceIds = block.sourceIds;
roundSpan.fragments = [[
    createRoundFragment(nextRound, totalRounds),  // New fragment type
]];
roundSpan.spans = [{ started: new Date() }];
```

---

#### 9. `ExecutionTracker/RuntimeReporter` (`src/tracker/ExecutionTracker.ts`)

| Aspect | Before | After |
|--------|--------|-------|
| **Start span** | Create ExecutionSpan, allocate to memory | Create RuntimeSpan, allocate |
| **End span** | Set `endTime`, `status` | Close last TimerSpan, optionally set status |
| **Record metric** | Update `span.metrics[key]` | Push fragment to `span.fragments` |
| **Add segment** | Push to `span.segments` | Child RuntimeSpan or push fragment |

```typescript
// BEFORE
recordMetric(blockId, 'reps', 10, 'count') {
    const span = this.getActiveSpan(blockId);
    span.metrics.reps = { value: 10, unit: 'count', recorded: Date.now() };
}

// AFTER
recordMetric(blockId: string, fragment: ICodeFragment) {
    const span = this.getActiveSpan(blockId);
    // Append to last fragment group or create new one
    const lastGroup = span.fragments.at(-1) ?? [];
    lastGroup.push(fragment);
}
```

---

## Implementation Plan

### Phase 1: Create New Types (Non-Breaking)

1. [ ] Create `src/runtime/models/RuntimeSpan.ts` with `TimerSpan` and `RuntimeSpan` classes
2. [ ] Add serialization/deserialization methods (`toJSON()`, `fromJSON()`)
3. [ ] Create `RUNTIME_SPAN_TYPE` constant
4. [ ] Add new fragment types for tracked metrics (if needed)

### Phase 2: Dual Support

1. [ ] Update `HistoryBehavior` to create both `ExecutionSpan` and `RuntimeSpan`
2. [ ] Update `useExecutionSpans` to handle both types
3. [ ] Run tests to verify no regression

### Phase 3: Migrate Consumers

1. [ ] Migrate `RuntimeHistoryLog` to use `RuntimeSpan`
2. [ ] Migrate `ExecutionLogPanel` to use `RuntimeSpan`
3. [ ] Migrate `ExecutionLogService` to persist `RuntimeSpan`
4. [ ] Migrate `AnalyticsTransformer` to use fragments for filtering

### Phase 4: Remove Old Types

1. [ ] Delete `ExecutionSpan`, `TrackedSpan` interfaces
2. [ ] Delete `SpanMetrics`, `TimeSegment`, `DebugMetadata`
3. [ ] Delete unused helper functions
4. [ ] Update all imports

### Phase 5: Cleanup

1. [ ] Remove `useSpanHierarchy` hook (or reimplement with sourceIds)
2. [ ] Simplify `ExecutionTracker` API
3. [ ] Update tests
4. [ ] Update documentation

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| **Metrics on span or separate?** | ✅ Metrics become fragments pushed to array |
| **Label derivation?** | ✅ Derive from fragments at display time |
| **Type derivation?** | ✅ Derive from fragment types present |
| **parentSpanId needed?** | ✅ Remove - can reconstruct from block/sourceIds if needed |
| **Round segments?** | ✅ Child RuntimeSpan entries, not segments |

