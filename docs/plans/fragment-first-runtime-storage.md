# Fragment-First Runtime Storage Plan

**Date**: December 2025  
**Status**: Design Proposal  
**Objective**: Eliminate the metrics-to-fragments adapter layer by storing runtime data as `ICodeFragment[]` directly

---

## Problem Statement

Currently, the runtime system maintains **two parallel data representations**:

| Stage | Format | Purpose |
|-------|--------|---------|
| Parse Time | `ICodeFragment[]` | Parsed from workout script, used for UI display |
| Runtime | `SpanMetrics` / `RuntimeMetric` / `MetricValue` | Collected during execution, requires conversion for UI |

This creates a conversion layer (`metricsToFragments.ts`) that:
1. Adds complexity and potential for bugs
2. Creates semantic drift between parsed and runtime data
3. Requires adapters for UI binding
4. Fragments (parsed) and metrics (runtime) represent the **same units of data** semantically

### Current Flow (With Adapters)

```
Parse: WodScript → Parser → ICodeFragment[] → UI ✅
                                      ↑
                               (direct binding)

Runtime: Block → SpanMetrics → metricsToFragments() → ICodeFragment[] → UI
                       ↑                    ↑
                  (different format)    (adapter needed)
```

### Goal: Unified Fragment-Based Storage

```
Parse: WodScript → Parser → ICodeFragment[] → UI ✅

Runtime: Block → ICodeFragment[] → UI ✅
                      ↑
                (same format - NO adapter needed)
```

---

## Current Architecture Analysis

### ICodeFragment (src/core/models/CodeFragment.ts)

```typescript
interface ICodeFragment {
  readonly image?: string;      // Display text ("10 reps", "95 lb")
  readonly value?: any;         // Parsed/computed value
  readonly type: string;        // Type string (legacy)
  readonly meta?: CodeMetadata;
  readonly fragmentType: FragmentType;  // Enum type
}

enum FragmentType {
  Timer, Rep, Effort, Distance, Rounds, 
  Action, Increment, Lap, Text, Resistance
}
```

### SpanMetrics (src/runtime/models/ExecutionSpan.ts)

```typescript
interface SpanMetrics {
  exerciseId?: string;
  reps?: MetricValueWithTimestamp<number>;
  weight?: MetricValueWithTimestamp<number>;
  distance?: MetricValueWithTimestamp<number>;
  duration?: MetricValueWithTimestamp<number>;
  currentRound?: number;
  totalRounds?: number;
  // ... 15+ fields
}
```

### MetricValue (src/runtime/RuntimeMetric.ts)

```typescript
type MetricValue = {
  type: "repetitions" | "resistance" | "distance" | ...;
  value: number | undefined;
  unit: string;
};
```

### Key Observation

`FragmentType` enum and `MetricValue.type` have **direct 1:1 mappings** (see `METRIC_TO_FRAGMENT_TYPE` in metricsToFragments.ts):

| MetricValue.type | FragmentType |
|------------------|--------------|
| `repetitions` | `Rep` |
| `resistance` | `Resistance` |
| `distance` | `Distance` |
| `time` / `timestamp` | `Timer` |
| `rounds` | `Rounds` |
| `effort` | `Effort` |
| `action` | `Action` |

This mapping proves they represent the **same semantic units**.

---

## Proposed Architecture: Fragment-First Storage

### Phase 1: Extend ICodeFragment for Runtime

Add optional runtime-specific fields to `ICodeFragment`:

```typescript
// src/core/models/CodeFragment.ts
interface ICodeFragment {
  // Existing fields
  readonly image?: string;
  readonly value?: any;
  readonly type: string;
  readonly fragmentType: FragmentType;
  readonly meta?: CodeMetadata;
  
  // === NEW: Runtime Context (optional) ===
  /** Timestamp when this fragment was recorded (runtime only) */
  readonly recordedAt?: number;
  /** Source block/behavior that produced this fragment */
  readonly source?: string;
  /** Whether this is a target vs actual value */
  readonly isTarget?: boolean;
  /** Original MetricValue unit for analytics compatibility */
  readonly unit?: string;
}
```

### Phase 2: Replace SpanMetrics with Fragment Array

Modify `ExecutionSpan` to use fragments directly:

```typescript
// src/runtime/models/ExecutionSpan.ts
interface ExecutionSpan {
  // Identity, status, timing - unchanged
  id: string;
  blockId: string;
  parentSpanId: string | null;
  type: SpanType;
  label: string;
  status: SpanStatus;
  startTime: number;
  endTime?: number;
  
  // === CHANGED: Fragment-based metrics ===
  /** 
   * All collected data as fragments - ready for UI binding
   * No conversion needed!
   */
  fragments: ICodeFragment[];
  
  // Segments still use fragments
  segments: TimeSegment[];
}

interface TimeSegment {
  id: string;
  parentSpanId: string;
  type: SegmentType;
  label: string;
  startTime: number;
  endTime?: number;
  
  // Segment-specific fragments
  fragments: ICodeFragment[];
}
```

### Phase 3: Fragment-Based Metric Recording

Update metric emission to create fragments directly:

```typescript
// Before: EmitMetricAction creates RuntimeMetric
const metric: RuntimeMetric = {
  exerciseId: 'pushups',
  values: [{ type: 'repetitions', value: 10, unit: 'reps' }],
  timeSpans: [...]
};
return [new EmitMetricAction(metric)];

// After: EmitFragmentAction creates ICodeFragment[]
const fragments: ICodeFragment[] = [
  {
    fragmentType: FragmentType.Effort,
    type: 'effort',
    value: 'pushups',
    image: 'Pushups'
  },
  {
    fragmentType: FragmentType.Rep,
    type: 'rep',
    value: 10,
    image: '10 reps',
    recordedAt: Date.now(),
    source: 'effort-block'
  }
];
return [new EmitFragmentAction(fragments)];
```

---

## UI Binding Analysis

### Components Currently Using Metrics

| Component | Current Input | After Migration |
|-----------|---------------|-----------------|
| `RuntimeHistoryLog` | `SpanMetrics` → `spanMetricsToFragments()` → `ICodeFragment[]` | `ICodeFragment[]` (direct) |
| `HistoryRow` | `HistoryItem.fragments` | `ICodeFragment[]` (unchanged) |
| `FragmentVisualizer` | `ICodeFragment[]` | `ICodeFragment[]` (unchanged) |
| `WodScriptVisualizer` | `ICodeStatement.fragments` | `ICodeFragment[]` (unchanged) |
| `AnalyticsTransformer` | `SpanMetrics` → extract values | `ICodeFragment[]` (extract values) |

### Analytics Engine Compatibility

The analytics engine needs numeric values for calculations. Fragment-first approach preserves this:

```typescript
// Extract numeric values from fragments for analytics
function fragmentsToAnalyticsData(fragments: ICodeFragment[]): Record<string, number> {
  const data: Record<string, number> = {};
  
  for (const f of fragments) {
    if (typeof f.value === 'number') {
      // Map fragmentType to analytics key
      const key = fragmentTypeToAnalyticsKey(f.fragmentType);
      data[key] = f.value;
    }
  }
  
  return data;
}

function fragmentTypeToAnalyticsKey(type: FragmentType): string {
  const mapping: Record<FragmentType, string> = {
    [FragmentType.Rep]: 'repetitions',
    [FragmentType.Resistance]: 'resistance',
    [FragmentType.Distance]: 'distance',
    [FragmentType.Timer]: 'time',
    [FragmentType.Rounds]: 'rounds',
    // ...
  };
  return mapping[type] || type;
}
```

---

## Internal vs Display Fragments

Some fragments are internal and shouldn't be displayed:

```typescript
// Add filter capability
enum FragmentVisibility {
  Display = 'display',    // Show in UI
  Internal = 'internal',  // Analytics only
  Debug = 'debug'         // Dev tools only
}

interface ICodeFragment {
  // ... existing fields
  readonly visibility?: FragmentVisibility;  // Default: 'display'
}

// UI filtering
const displayFragments = span.fragments.filter(
  f => !f.visibility || f.visibility === 'display'
);
```

---

## Migration Path

### Step 1: Add Runtime Fields to ICodeFragment

```diff
// src/core/models/CodeFragment.ts
export interface ICodeFragment {
  readonly image?: string;
  readonly value?: any;
  readonly type: string;
  readonly fragmentType: FragmentType;
  readonly meta?: CodeMetadata;
+  readonly recordedAt?: number;
+  readonly source?: string;
+  readonly unit?: string;
+  readonly visibility?: 'display' | 'internal' | 'debug';
}
```

### Step 2: Create Fragment Helpers

```typescript
// src/runtime/utils/fragmentHelpers.ts

/**
 * Create a runtime fragment from metric data
 */
export function createRuntimeFragment(
  type: FragmentType,
  value: any,
  unit?: string,
  source?: string
): ICodeFragment {
  return {
    fragmentType: type,
    type: type.toLowerCase(),
    value,
    image: formatFragmentImage(type, value, unit),
    recordedAt: Date.now(),
    source,
    unit
  };
}

/**
 * Create rep fragment
 */
export function createRepFragment(reps: number, source?: string): ICodeFragment {
  return createRuntimeFragment(FragmentType.Rep, reps, 'reps', source);
}

/**
 * Create weight fragment
 */
export function createWeightFragment(weight: number, unit: string, source?: string): ICodeFragment {
  return createRuntimeFragment(FragmentType.Resistance, weight, unit, source);
}

// ... more helpers
```

### Step 3: Update ExecutionSpan Model

```diff
// src/runtime/models/ExecutionSpan.ts
export interface ExecutionSpan {
  id: string;
  blockId: string;
  parentSpanId: string | null;
  type: SpanType;
  label: string;
  status: SpanStatus;
  startTime: number;
  endTime?: number;
  
-  metrics: SpanMetrics;
+  fragments: ICodeFragment[];
  
+  // Legacy support during migration
+  /** @deprecated Use fragments instead */
+  metrics?: SpanMetrics;
  
  segments: TimeSegment[];
}
```

### Step 4: Create EmitFragmentAction

```typescript
// src/runtime/actions/EmitFragmentAction.ts

export class EmitFragmentAction implements IRuntimeAction {
  readonly type = 'emit-fragment';
  
  constructor(
    public readonly fragments: ICodeFragment[]
  ) {}

  do(runtime: IScriptRuntime): void {
    const currentBlock = runtime.stack.current;
    if (!currentBlock) return;
    
    const blockId = currentBlock.key.toString();
    
    // Record fragments to ExecutionSpan
    if (runtime.tracker) {
      runtime.tracker.recordFragments(blockId, this.fragments);
    }
  }
}
```

### Step 5: Update ExecutionTracker

```typescript
// src/runtime/ExecutionTracker.ts

class ExecutionTracker {
  /**
   * Record fragments to the active span
   */
  recordFragments(blockId: string, fragments: ICodeFragment[]): void {
    const span = this.activeSpans.get(blockId);
    if (!span) return;
    
    // Append to existing fragments
    span.fragments = [...span.fragments, ...fragments];
    
    // Notify subscribers
    this.notifyUpdate(span);
  }
}
```

### Step 6: Remove Adapter Layer (Final)

Once all components use fragments directly:

```diff
// src/components/history/RuntimeHistoryLog.tsx
const fragments = useMemo(() => {
-  return spanMetricsToFragments(span.metrics, span.label, span.type);
+  return span.fragments;  // Direct binding - no adapter!
}, [span]);
```

---

## Files to Modify

### Core Model Changes
- `src/core/models/CodeFragment.ts` - Add runtime fields
- `src/runtime/models/ExecutionSpan.ts` - Replace metrics with fragments

### New Files
- `src/runtime/utils/fragmentHelpers.ts` - Fragment creation utilities
- `src/runtime/actions/EmitFragmentAction.ts` - New action type

### Updated Runtime Files
- `src/runtime/ExecutionTracker.ts` - Fragment recording
- `src/runtime/behaviors/HistoryBehavior.ts` - Use fragment emission
- `src/runtime/blocks/EffortBlock.ts` - Use fragment emission
- `src/runtime/strategies/*.ts` - Update compiled metrics to fragments

### UI Components (Simplify)
- `src/components/history/RuntimeHistoryLog.tsx` - Remove adapter
- `src/services/AnalyticsTransformer.ts` - Read from fragments

### Deprecate/Remove
- `src/runtime/utils/metricsToFragments.ts` - No longer needed
- `src/runtime/RuntimeMetric.ts` - Mark as legacy

---

## Benefits

1. **No Adapter Needed**: UI binds directly to `ICodeFragment[]` everywhere
2. **Single Data Model**: Parsed and runtime data use same format
3. **Type Safety**: `FragmentType` enum ensures valid types
4. **Analytics Compatible**: Numeric values preserved for calculations
5. **Simpler Codebase**: Remove ~300 lines of conversion code
6. **Consistent Visualization**: Same styling/colors for parsed and runtime data

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Analytics needs numeric extraction | `fragmentsToAnalyticsData()` helper |
| Legacy RuntimeMetric consumers | Keep optional `metrics` field during migration |
| Internal fragments shown in UI | `visibility` field to filter |
| Breaking existing tests | Gradual migration with dual support |

---

## Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| 1. Model Extension | 1 day | Extended `ICodeFragment`, helpers |
| 2. ExecutionSpan Migration | 2 days | Fragment-based spans |
| 3. Behavior Updates | 2 days | Blocks emit fragments |
| 4. UI Simplification | 1 day | Remove adapter calls |
| 5. Cleanup | 1 day | Remove deprecated code |

**Total**: ~7 days

---

## Success Criteria

1. ✅ `RuntimeHistoryLog` binds to `span.fragments` directly
2. ✅ `FragmentVisualizer` works unchanged
3. ✅ Analytics engine extracts data from fragments
4. ✅ `metricsToFragments.ts` marked deprecated/removed
5. ✅ All existing tests pass
6. ✅ UI renders identically before/after migration
