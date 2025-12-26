# Metrics Type System Consolidation Plan

**Status:** Open for Review  
**Priority:** High (Technical Debt)  
**Effort Estimate:** 3-4 sprints  
**Risk Level:** Medium (Breaking API changes)  

---

## Executive Summary

The WOD Wiki codebase contains **six overlapping "Metrics" type systems** that developed from incomplete architectural migration. The system should have unified all metric tracking into the **Fragment-based architecture with runtime collection states**, but instead maintains parallel systems for:

1. **RuntimeMetric** - Primary runtime collection API
2. **CurrentMetrics** - Memory-based live metrics
3. **Metric** - Legacy CollectionSpan format
4. **MetricPoint/SegmentLog** - React Context (possibly unused)
5. **WorkoutMetric** - Markdown Editor format
6. **IDisplayMetric** - Display layer (reasonable separation)

This technical debt creates:
- **Cognitive burden** on developers maintaining multiple metric formats
- **Type safety issues** with conflicting `MetricValue` definitions
- **Integration complexity** in analytics pipeline
- **Inconsistent collection semantics** across the codebase

---

## Root Cause Analysis

### The Intended Architecture

The codebase defines the correct model via **Fragment System with Collection States**:

```typescript
// src/types/MetricBehavior.ts
export enum MetricBehavior {
  Defined = 'defined',       // Static script value: "10 pushups"
  Hint = 'hint',             // Suggested but not enforced: "suggested 8 reps"
  Collected = 'collected',   // User input: "actually did 12 reps"
  Recorded = 'recorded',     // Runtime-generated: "elapsed time"
  Calculated = 'calculated'  // Analytics-derived: "projected 1RM"
}

// src/core/models/CodeFragment.ts
export interface ICodeFragment {
  readonly fragmentType: FragmentType;
  readonly value?: unknown;
  readonly behavior?: MetricBehavior;
  readonly collectionState?: FragmentCollectionState;
  readonly meta?: CodeMetadata;
}
```

### Why Metrics Parallel System Exists

Evidence of failed migration:

1. **Bridge Utility Exists** (`src/runtime/utils/metricsToFragments.ts`)
   ```typescript
   /**
    * Legacy bridge — prefer emitting fragments directly instead of metrics.
    * This utility is used by multiple UI components...
    * By centralizing this logic, we ensure consistent fragment display across all views.
    */
   export function metricsToFragments(metrics: RuntimeMetric[]): ICodeFragment[]
   ```
   
   **Implication:** Developers already identified this consolidation need but didn't complete it.

2. **EmitMetricAction Converts Internally** (`src/runtime/actions/EmitMetricAction.ts`)
   ```typescript
   // Primary: convert to fragments and append to execution tracker
   if (runtime.tracker) {
     const fragments = metricsToFragments([this.metric]);
     runtime.tracker.appendFragments(blockId, fragments);
   }
   ```
   
   **Implication:** Metrics are immediately converted to fragments, suggesting they're transitional.

3. **Multiple MetricValue Definitions**
   - `RuntimeMetric.ts`: Complete type union
   - `CollectionSpan.ts`: String-based type field
   - `MemoryModels.ts`: Generic key-value store
   
   **Implication:** No single source of truth for metric shape.

---

## Current State: Type Inventory

### 1. RuntimeMetric (Primary Collection Type)

**File:** `src/runtime/RuntimeMetric.ts`  
**Scope:** Core runtime API  
**Usage:** 27+ files

```typescript
export interface RuntimeMetric {
  exerciseId: string;
  behavior?: MetricBehavior;           // ✓ Has intended behavior model
  values: MetricValue[];
  timeSpans: TimeSpan[];
}

export type MetricValue = {
  type: "repetitions" | "resistance" | "distance" | "timestamp" | 
        "rounds" | "time" | "calories" | "action" | "effort" | 
        "heart_rate" | "cadence" | "power";
  value: number | undefined;
  unit: string;
};

export interface MetricEntry {
  sourceId: string;
  blockId: string;
  behavior?: MetricBehavior;
  type: MetricValue['type'];
  value: number | undefined;
  unit: string;
}
```

**Critical Usage Paths:**

| Module | Purpose | Dependency Strength |
|--------|---------|-------------------|
| `MetricCollector` | Storage/retrieval API | **CRITICAL** - Core interface |
| `EmitMetricAction` | Behavior emission | **HIGH** - Converts to fragments |
| `AnalysisService` | Analytics pipeline | **CRITICAL** - Engine contracts depend on type |
| `*ProjectionEngine` | Workout analysis | **HIGH** - Input contract |
| `cast/messages.ts` | Chromecast integration | **MEDIUM** - Serialization format |
| `IdleBehavior.ts` | Imports type | **LOW** - Type-only import |

**Assessment:**
- ✓ Already incorporates intended `MetricBehavior` enum
- ✓ Structured correctly as union type
- ✗ Should be deprecated in favor of fragments
- ✗ Creates parallel collection path alongside block fragments

---

### 2. CurrentMetrics (Memory-Based Live Metrics)

**File:** `src/runtime/models/MemoryModels.ts`  
**Scope:** Memory allocation interface  
**Usage:** 4 files

```typescript
export interface CurrentMetrics {
  [key: string]: MetricValue;  // ⚠️ Different MetricValue than RuntimeMetric!
}

// Memory type enumeration
export enum MemoryTypeEnum {
  // ...
  METRICS_CURRENT = 'METRICS_CURRENT', // Type: CurrentMetrics
}
```

**Usage:**

```typescript
// src/runtime/blocks/EffortBlock.ts
private metricsRef?: TypedMemoryReference<CurrentMetrics>;

private updateMetrics(runtime: IScriptRuntime): void {
  if (!this.metricsRef) {
    this.metricsRef = this.context.allocate<CurrentMetrics>(
      MemoryTypeEnum.METRICS_CURRENT,
      {},
      'public'
    );
  }
  const metrics = this.metricsRef.get() || {};
  metrics['reps'] = {
    value: this.currentReps,
    unit: 'reps',
    sourceId: blockId
  };
  this.metricsRef.set({ ...metrics });
}
```

**Assessment:**
- ✗ Duplicates what block fragments should provide
- ✗ Memory allocation overhead for already-available data
- ✗ Requires explicit updates (error-prone)
- ✓ Used by 2 blocks that could use fragments instead
- **Remediation:** Replace with direct fragment access from block

---

### 3. Metric (CollectionSpan Legacy)

**File:** `src/core/models/CollectionSpan.ts`  
**Scope:** Execution tracking  
**Usage:** 2 files

```typescript
export interface Metric {
  sourceId: number;
  values: MetricValue[];  // ⚠️ Third MetricValue definition!
}

export class CollectionSpan {  
  blockKey?: string;
  duration?: number | undefined;
  timeSpans: TimeSpan[] = [];  
  metrics: Metric[] = [];    // ⚠️ Stores raw metrics
}
```

**Usage:**

```typescript
// src/clock/anchors/MetricAnchor.tsx
const aggregateMetrics = (metrics: Metric[], ...) => {
  let filteredMetrics = metrics;
  if (sourceId) {
    filteredMetrics = filteredMetrics.filter(m => m.sourceId === sourceId);
  }
  const values = filteredMetrics.flatMap(m => 
    m.values.filter(v => !metricType || v.type === metricType).map(v => v.value)
  );
  // ... aggregation logic
};
```

**Assessment:**
- ✗ Legacy format predating fragment consolidation
- ✗ Contains sparse sourceId references (should be fragments)
- ✗ Requires separate aggregation logic
- ✓ Only used by 1 display component
- **Remediation:** Replace with fragments in RuntimeSpan

---

### 4. MetricPoint / SegmentLog (React Context)

**File:** `src/services/MetricsContext.tsx`  
**Scope:** React state management  
**Usage:** 2 files

```typescript
export interface MetricPoint {
  timestamp: number;
  type: string;
  value: number;
  unit?: string;
  segmentId?: string;
}

export interface SegmentLog {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed';
  metrics: MetricPoint[];
}

export const MetricsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [segments, setSegments] = useState<SegmentLog[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  // ... segment/metric lifecycle management
};
```

**Usage Analysis:**

```typescript
// src/components/layout/UnifiedWorkbench.tsx
<MetricsProvider>
  {/* Children never call useMetrics() */}
</MetricsProvider>

// src/components/layout/WodWorkbench.tsx
<MetricsProvider>
  {/* Children never call useMetrics() */}
</MetricsProvider>
```

**Assessment:**
- ⚠️ **POTENTIAL DEAD CODE** - Provider wraps components but `useMetrics()` never called
- ✗ Parallel state management to runtime tracking
- ✗ Manual segment lifecycle tracking
- **Risk:** Removing may expose component dependencies
- **Remediation:** Audit component tree for `useMetrics()` calls, then remove

---

### 5. WorkoutMetric (Markdown Editor)

**File:** `src/markdown-editor/types/index.ts`  
**Scope:** Editor type definitions  
**Usage:** 2 files

```typescript
export interface WorkoutMetric {
  name: string;
  value: number | string;
  unit?: string;
  timestamp?: number;
}

export interface WorkoutResults {
  startTime: number;
  endTime: number;
  duration: number;
  roundsCompleted?: number;
  totalRounds?: number;
  repsCompleted?: number;
  metrics: WorkoutMetric[];  // ⚠️ Uses custom format
  completed: boolean;
}
```

**Assessment:**
- ✗ Fourth metric format (different from RuntimeMetric!)
- ✗ Conflates metrics with result summaries
- ✓ Only used in editor scope
- **Remediation:** Use fragments from RuntimeSpan, add summary aggregations

---

### 6. IDisplayMetric (Display Abstraction)

**File:** `src/clock/types/DisplayTypes.ts`  
**Scope:** UI display contracts  
**Usage:** 5 files

```typescript
export interface IDisplayMetric {
  type: string;
  value?: unknown;
  unit?: string;
  // ... display properties
}

export interface IDisplayCardEntry {
  id: string;
  ownerId: string;
  type: DisplayCardType;
  metrics?: IDisplayMetric[];      // ✓ For display rendering
  metricGroups?: IDisplayMetric[][]; // ✓ For grouped display
  // ... other card config
}
```

**Assessment:**
- ✓ **REASONABLE SEPARATION** - Display layer abstraction
- ✓ Decouples rendering from data model
- ✓ Minimal cognitive load
- **Recommendation:** Keep but consider making display layer transform from fragments

---

### 7. PerformanceMetrics (Test/Debug - Naming Collision)

**Files:** `src/runtime-test-bench/types/interfaces.ts`, `types.ts`  
**Scope:** Performance benchmarking only  
**Usage:** 2 files

```typescript
export interface PerformanceMetrics {
  pushTime?: number;
  popTime?: number;
  mountTime?: number;
  // ... performance measurements
}
```

**Assessment:**
- ✓ **UNRELATED** - Performance measurements, not workout metrics
- ⚠️ **Naming collision** confuses "metrics"
- **Recommendation:** Rename to `PerformanceMeasurements` or `BenchmarkMetrics` for clarity

---

## Current Integration Points

### Analytics Pipeline (Highest Complexity)

```
RuntimeMetric[]
    ↓
AnalysisService.runAllProjections()
    ├─ groupMetricsByExercise()
    ├─ VolumeProjectionEngine.calculate(metrics, definition)
    ├─ *ProjectionEngine.calculate(metrics, definition)
    ↓
ProjectionResult[]
```

**Issues:**
- All engines depend on `RuntimeMetric` type
- 5+ test files mock `RuntimeMetric` arrays
- No path to gradual migration
- Analytics completely decoupled from rendering (fragments)

### Execution Tracking (Dual Path Problem)

```
Block Behavior
    ├─ Emits: EmitMetricAction → RuntimeMetric → MetricCollector
    ├─ Tracks: runtime.tracker.recordMetric() → RuntimeSpan.fragments[][]
    └─ Displays: IDisplayMetric[] (from fragments)

Result: Same data in 3 different formats!
```

### Memory System (Artificial Coupling)

```
EffortBlock.updateMetrics()
    ├─ Allocates: METRICS_CURRENT memory slot
    ├─ Updates: CurrentMetrics[key] = MetricValue
    ├─ Reads by: UI components via memory subscription
    └─ Duplicates: data already in block.fragments

Result: Out-of-sync metrics if fragments change
```

---

## Migration Strategy

### Phase 1: Foundation (Sprint 1)

**Goal:** Prepare for consolidation without breaking changes  
**Risk:** Low (additive changes only)

#### 1.1 Unify MetricValue Definition

Create single canonical `MetricValue` type:

```typescript
// src/runtime/RuntimeMetric.ts (become canonical definition)
export type MetricValue = {
  type: MetricValueType;
  value: number | undefined;
  unit: string;
};

export enum MetricValueType {
  Repetitions = 'repetitions',
  Resistance = 'resistance',
  Distance = 'distance',
  Timestamp = 'timestamp',
  Rounds = 'rounds',
  Time = 'time',
  Calories = 'calories',
  Action = 'action',
  Effort = 'effort',
  HeartRate = 'heart_rate',
  Cadence = 'cadence',
  Power = 'power',
}
```

**Files to Update:**
- ✓ `src/runtime/RuntimeMetric.ts` (define)
- ✓ `src/runtime/models/MemoryModels.ts` (import)
- ✓ `src/core/models/CollectionSpan.ts` (import)
- ✓ `src/runtime/FragmentCompilers.ts` (import)

**Test:** 
- Type-check entire codebase passes
- `MetricValue` used consistently across all modules
- No duplicate definitions remain

**Effort:** 2 days

---

#### 1.2 Add Fragment-to-Display Converter

Create explicit transformation in display layer:

```typescript
// src/clock/utils/fragmentsToDisplayMetrics.ts
export function fragmentsToDisplayMetrics(
  fragments: ICodeFragment[][]
): IDisplayMetric[] {
  const flat = fragments.flat();
  return flat
    .filter(f => f.behavior === MetricBehavior.Collected || 
                 f.behavior === MetricBehavior.Recorded)
    .map(f => ({
      type: f.type,
      value: f.value,
      unit: f.fragmentType,
      collectionState: f.collectionState,
    }));
}
```

**Files to Update:**
- ✓ `src/clock/utils/fragmentsToDisplayMetrics.ts` (new)
- ✓ `src/runtime/behaviors/TimerStateManager.ts` (use converter)
- ✓ `src/clock/anchors/MetricAnchor.tsx` (accept fragments)

**Test:**
- Fragment array → IDisplayMetric[] transformations
- Edge cases: empty fragments, undefined values, state transitions
- Display unchanged (same output)

**Effort:** 2 days

**Benefit:** Decouples display from RuntimeMetric type

---

#### 1.3 Audit MetricsContext Usage

Determine if `MetricsContext.tsx` is dead code:

```bash
# Search entire codebase for useMetrics() calls
grep -r "useMetrics(" src/ --include="*.ts" --include="*.tsx"

# Expected result: Only in tests or nowhere
```

**Findings:**
- No active usage found in Phase 1 investigation
- Only provider wrappers in `UnifiedWorkbench` and `WodWorkbench`
- No children call `useMetrics()` hook

**Decision Checkpoint:** 
- If confirmed dead: Schedule removal in Phase 2
- If usage found: Document and preserve

**Effort:** 1 day

---

### Phase 2: Consolidation (Sprints 2-3)

**Goal:** Migrate analytics pipeline to fragments  
**Risk:** Medium (contract changes to projection engines)

#### 2.1 Create Fragment-Based Metric Collection

Deprecate `RuntimeMetric`, replace with fragments:

```typescript
// src/runtime/FragmentMetricCollector.ts (new)
export interface IFragmentMetricCollector {
  collectFragment(
    blockId: string,
    sourceId: number,
    fragment: ICodeFragment
  ): void;
  
  getCollectedFragments(): ICodeFragment[][];
  
  getMetricsWithBehavior(
    behavior: MetricBehavior
  ): ICodeFragment[];
  
  clear(): void;
}

export class FragmentMetricCollector implements IFragmentMetricCollector {
  private fragments: ICodeFragment[][] = [];
  
  collectFragment(blockId: string, sourceId: number, fragment: ICodeFragment): void {
    // Store as [sourceId][blockId] = ICodeFragment
  }
  
  getMetricsWithBehavior(behavior: MetricBehavior): ICodeFragment[] {
    return this.fragments.flat().filter(f => f.behavior === behavior);
  }
}
```

**Files to Create:**
- ✓ `src/runtime/FragmentMetricCollector.ts` (new)
- ✓ `src/runtime/__tests__/FragmentMetricCollector.test.ts` (new)

**Files to Update:**
- ✓ `src/runtime/IScriptRuntime.ts` (add interface)
- ✓ `src/runtime/ScriptRuntime.ts` (implement)
- ✓ `src/runtime/actions/EmitMetricAction.ts` (direct fragment path)

**Test:**
- Fragment collection from behaviors
- Query by behavior type
- Clear/reset operations
- Parity with RuntimeMetric collector

**Effort:** 5 days

---

#### 2.2 Migrate Analytics Pipeline

Update projection engines to accept fragments:

```typescript
// src/timeline/analytics/IProjectionEngine.ts (updated)
export interface IProjectionEngine {
  // Old signature (deprecated)
  calculate(metrics: RuntimeMetric[], definition: Exercise): ProjectionResult[];
  
  // New signature (preferred)
  calculateFromFragments(
    fragments: ICodeFragment[],
    exerciseId: string,
    definition: Exercise
  ): ProjectionResult[];
}

// src/timeline/analytics/AnalysisService.ts (updated)
export class AnalysisService {
  public runAllProjections(fragments: ICodeFragment[]): ProjectionResult[] {
    // Group fragments by exerciseId metadata
    const fragmentsByExercise = this.groupFragmentsByExercise(fragments);
    
    // Run projections
    const results: ProjectionResult[] = [];
    for (const [exerciseId, exerciseFragments] of fragmentsByExercise) {
      const definition = this.exerciseService.findById(exerciseId);
      if (!definition) continue;
      
      for (const engine of this.engines) {
        if (engine.calculateFromFragments) {
          results.push(...engine.calculateFromFragments(
            exerciseFragments,
            exerciseId,
            definition
          ));
        }
      }
    }
    return results;
  }
}
```

**Files to Update:**
- ✓ `src/timeline/analytics/IProjectionEngine.ts` (add new method)
- ✓ `src/timeline/analytics/AnalysisService.ts` (implement routing)
- ✓ `src/timeline/analytics/engines/VolumeProjectionEngine.ts` (implement new method)
- ✓ All engine test files (add fragment-based tests)

**Migration Approach:**
1. Add `calculateFromFragments()` as new method (keep old for compatibility)
2. Update `AnalysisService` to call new method when fragments available
3. Migrate engines one by one (VolumeProjectionEngine first)
4. Add integration tests for full pipeline
5. Deprecate old `RuntimeMetric` path in Phase 3

**Test:**
- Fragment → ProjectionResult pipeline
- All existing projection test cases (fragment-based)
- Volume calculations with different fragment patterns
- Performance benchmarks (should equal or improve)

**Effort:** 8 days

---

#### 2.3 Update Cast Messages

Evolve external messaging format:

```typescript
// src/types/cast/messages.ts (updated)
export interface MetricsUpdateMessage extends CastMessage {
  type: 'metrics-update';
  payload: {
    fragment: ICodeFragment;  // New: use fragments
    metric: RuntimeMetric;    // Deprecated: for compatibility
    userId?: string;
  };
}

export interface MetricsBatchMessage extends CastMessage {
  type: 'metrics-batch';
  payload: {
    fragments: ICodeFragment[];        // New: direct fragments
    metrics: RuntimeMetric[];          // Deprecated: for compatibility
    heartRateData: HeartRateDataPoint[];
    batchStartTime: number;
    batchEndTime: number;
  };
}
```

**Migration Strategy:**
- Send both formats during transition
- Receivers parse fragments if available, fall back to metrics
- Monitor analytics to remove old format once all clients updated

**Effort:** 2 days

---

### Phase 3: Cleanup (Sprint 4)

**Goal:** Remove parallel systems, complete consolidation  
**Risk:** Low (breaking API changes announced, deprecated paths removed)

#### 3.1 Remove MetricsContext (If Confirmed Dead)

```bash
rm src/services/MetricsContext.tsx
grep -r "MetricsContext\|useMetrics" src/ --include="*.ts" --include="*.tsx"
# Should find only imports to remove
```

**Files to Update:**
- ✗ `src/services/MetricsContext.tsx` (delete)
- ✓ `src/components/layout/UnifiedWorkbench.tsx` (remove provider)
- ✓ `src/components/layout/WodWorkbench.tsx` (remove provider)

**Effort:** 1 day

---

#### 3.2 Deprecate RuntimeMetric

Mark for removal, document migration:

```typescript
// src/runtime/RuntimeMetric.ts
/**
 * @deprecated Use ICodeFragment with MetricBehavior.Collected instead.
 * 
 * Migration Path:
 * 1. Replace RuntimeMetric emission with block.fragments updates
 * 2. Use metricsToFragments() for compatibility during transition
 * 3. Remove RuntimeMetric usage entirely in Phase 4 (Q2 2025)
 * 
 * @example
 * // OLD
 * const metric: RuntimeMetric = {
 *   exerciseId: 'bench',
 *   values: [{ type: 'repetitions', value: 10, unit: 'reps' }],
 *   timeSpans: [...]
 * };
 * 
 * // NEW
 * const fragment: ICodeFragment = {
 *   fragmentType: FragmentType.Rep,
 *   value: 10,
 *   behavior: MetricBehavior.Collected,
 *   image: '10 reps'
 * };
 */
export interface RuntimeMetric { ... }
```

**Deprecation Timeline:**
- Now (v1.5): Mark deprecated, add migration guide
- Q1 2025: RuntimeMetric still works, warnings in console
- Q2 2025: Remove entirely

**Files to Update:**
- ✓ `src/runtime/RuntimeMetric.ts` (add deprecation marker)
- ✓ `src/runtime/MetricCollector.ts` (deprecation notice)
- ✓ Docs: `MIGRATION_GUIDE.md` (new file)

**Effort:** 2 days

---

#### 3.3 Remove CurrentMetrics Memory Type

Replace with direct fragment access:

```typescript
// BEFORE: EffortBlock.ts
private metricsRef?: TypedMemoryReference<CurrentMetrics>;
private updateMetrics(runtime: IScriptRuntime): void {
  if (!this.metricsRef) {
    this.metricsRef = this.context.allocate<CurrentMetrics>(
      MemoryTypeEnum.METRICS_CURRENT,
      {},
      'public'
    );
  }
  const metrics = this.metricsRef.get() || {};
  metrics['reps'] = { value: this.currentReps, unit: 'reps', sourceId: blockId };
  this.metricsRef.set({ ...metrics });
}

// AFTER: EffortBlock.ts
private updateFragments(runtime: IScriptRuntime): void {
  // Fragments already updated in behavior - no separate step needed
  this.context.updateBlockFragments(this.key, this.fragments);
  
  // Emit event for reactive updates
  runtime.handle({
    name: 'effort:updated',
    timestamp: new Date(),
    data: { blockId: this.key.toString(), currentReps: this.currentReps }
  });
}
```

**Files to Update:**
- ✓ `src/runtime/models/MemoryModels.ts` (remove CurrentMetrics)
- ✓ `src/runtime/MemoryTypeEnum.ts` (remove METRICS_CURRENT entry)
- ✓ `src/runtime/blocks/EffortBlock.ts` (remove memory updates)
- ✓ `src/runtime/blocks/RoundsBlock.ts` (remove memory updates)

**Test:**
- Live UI updates still work
- Block events still emit
- Memory pressure reduced

**Effort:** 4 days

---

#### 3.4 Replace CollectionSpan.Metric

Use fragments throughout:

```typescript
// BEFORE
export class CollectionSpan {  
  metrics: Metric[] = [];
}

// AFTER
export class CollectionSpan {
  fragments: ICodeFragment[][] = [];  // Already exists
  // Remove metrics field entirely
}
```

**Files to Update:**
- ✓ `src/core/models/CollectionSpan.ts` (remove Metric field)
- ✓ `src/core/models/Metric` (type itself stays for backward compat)
- ✓ `src/clock/anchors/MetricAnchor.tsx` (update to accept fragments)

**Effort:** 2 days

---

#### 3.5 Update Markdown Editor

Replace WorkoutMetric with fragments:

```typescript
// BEFORE
export interface WorkoutResults {
  metrics: WorkoutMetric[];
}

// AFTER
export interface WorkoutResults {
  collectedFragments: ICodeFragment[];
  summary: {
    totalReps?: number;
    totalDistance?: number;
    // ... calculated from fragments
  };
}
```

**Effort:** 2 days

---

#### 3.6 Rename PerformanceMetrics

Disambiguate from workout metrics:

```typescript
// Rename throughout test-bench
export interface BenchmarkMetrics {
  pushTime?: number;
  popTime?: number;
  // ...
}
```

**Effort:** 1 day

---

## Migration Dependency Graph

```
Phase 1 (Week 1)
├─ 1.1 Unify MetricValue ────────┐
├─ 1.2 Fragment Display Converter ├─→ (no breaking changes, parallel path)
├─ 1.3 Audit MetricsContext ─────┘

Phase 2 (Weeks 2-3)
├─ 2.1 FragmentMetricCollector ────┐
├─ 2.2 Analytics Pipeline Migration ├─→ (both old & new paths active)
├─ 2.3 Cast Messages Evolution ────┘

Phase 3 (Week 4)
├─ 3.1 Remove MetricsContext ─────┐
├─ 3.2 Deprecate RuntimeMetric    ├─→ (old path still works with warnings)
├─ 3.3 Remove CurrentMetrics ─────┤
├─ 3.4 Replace CollectionSpan    ├─→ (breaking, but coordinated)
├─ 3.5 Update Markdown Editor ────┤
└─ 3.6 Rename PerformanceMetrics─┘
```

---

## Risk Assessment

### Risk: Dual-Path State Drift

**Scenario:** Fragment collection and RuntimeMetric collection diverge  
**Impact:** Analytics produces incorrect results  
**Mitigation:**
- During Phase 2: Both paths collect identical data
- Add equivalence tests: `assertFragmentsEquivalentToMetrics()`
- Monitor metrics count in CI

**Effort:** 2 days (testing)

---

### Risk: External API Breaking Change

**Scenario:** Cast receiver apps expect RuntimeMetric in messages  
**Impact:** Chromecast integration breaks  
**Mitigation:**
- Dual-format messages during Phase 2
- Coordinate with clients before removal
- Provide migration guide

**Effort:** 3 days (client coordination)

---

### Risk: Performance Regression

**Scenario:** Fragment collection slower than RuntimeMetric  
**Impact:** Live UI updates lag  
**Mitigation:**
- Benchmark both paths in Phase 2
- Profile hot paths (emit, update, query)
- Optimize fragment storage structure if needed

**Effort:** 2 days (benchmarking)

---

### Risk: Incomplete Migration Path

**Scenario:** Developer misses metric collection point  
**Impact:** Analytics missing data  
**Mitigation:**
- Add lint rule: no direct MetricCollector.collect() calls
- Require `EmitMetricAction` or fragment update
- Code review checklist for new metrics

**Effort:** 1 day (tooling)

---

## Success Criteria

### Phase 1 Completion
- [ ] Single `MetricValue` type definition, used everywhere
- [ ] Fragment-to-display converter created & tested
- [ ] MetricsContext usage audited & decision documented
- [ ] Type-check passes, no broken imports

### Phase 2 Completion
- [ ] `FragmentMetricCollector` implemented & tested
- [ ] Analytics pipeline supports both fragment & RuntimeMetric paths
- [ ] All projection engines have fragment-based implementations
- [ ] Cast messages dual-format with graceful fallback
- [ ] Equivalence tests confirm feature parity

### Phase 3 Completion
- [ ] MetricsContext removed (if confirmed dead)
- [ ] RuntimeMetric deprecated with clear migration guide
- [ ] CurrentMetrics memory type eliminated
- [ ] CollectionSpan uses fragments exclusively
- [ ] Markdown editor uses fragments
- [ ] PerformanceMetrics renamed
- [ ] All tests pass, zero deprecation warnings in CI

---

## Post-Migration (Phase 4 - Q2 2025)

Once all clients migrated and dual-paths stable for 6+ weeks:

1. **Remove RuntimeMetric type** entirely
2. **Remove EmitMetricAction** (behaviors use fragments directly)
3. **Remove metricsToFragments() bridge**
4. **Simplify cast messages** (fragment-only format)
5. **Update analytics** to remove legacy path

---

## Implementation Guidelines

### Code Review Checklist

For PRs during migration phases:

- [ ] Are new metrics using fragments or RuntimeMetric?
  - **Should be:** Fragments with MetricBehavior enum
- [ ] Is MetricsContext used?
  - **Should be:** No (unless explicitly keeping for backward compat)
- [ ] Are multiple MetricValue types defined?
  - **Should be:** Only canonical import from RuntimeMetric.ts
- [ ] Does test mock RuntimeMetric or fragments?
  - **Should be:** Fragments during Phase 2+, both during Phase 1-2

---

### Testing Strategy

```typescript
// tests/metrics-consolidation/fragment-equivalence.test.ts
describe('Metrics ↔ Fragments Equivalence', () => {
  it('should convert RuntimeMetric to ICodeFragment and back', () => {
    const metric = createMockRuntimeMetric();
    const fragments = metricsToFragments([metric]);
    const reconstructed = fragmentsToMetric(fragments);
    
    expect(reconstructed).toDeepEqual(metric);
  });
  
  it('should preserve MetricBehavior through conversion', () => {
    const behaviors = [
      MetricBehavior.Collected,
      MetricBehavior.Recorded,
      MetricBehavior.Calculated
    ];
    
    for (const behavior of behaviors) {
      const fragment = createFragment(behavior);
      expect(fragment.behavior).toBe(behavior);
    }
  });
  
  it('should not lose data in fragment collection', () => {
    const collector = new FragmentMetricCollector();
    const sourceId = 42;
    const blockId = 'block-1';
    
    const fragment = createRepFragment(10, MetricBehavior.Collected);
    collector.collectFragment(blockId, sourceId, fragment);
    
    const collected = collector.getMetricsWithBehavior(MetricBehavior.Collected);
    expect(collected).toContainEqual(fragment);
  });
});
```

---

## Documentation

### Developer Guide Update

Add to codebase documentation:

```markdown
## Metrics Architecture

WOD Wiki uses a **Fragment-based metric system** with runtime collection states.

### Core Concepts

1. **ICodeFragment**: Fundamental data model for all metrics
2. **MetricBehavior**: Classifies metric intent (Defined, Collected, Recorded, etc.)
3. **FragmentCollectionState**: Tracks whether value is specified, collected, or generated

### Emitting Metrics from Behaviors

Do NOT use RuntimeMetric. Instead:

```typescript
// ✓ CORRECT
this.context.updateBlockFragments(
  this.key,
  [
    { 
      fragmentType: FragmentType.Rep,
      value: 10,
      behavior: MetricBehavior.Collected,
      image: '10 reps'
    }
  ]
);

// ✗ WRONG (legacy, will be removed Q2 2025)
return [new EmitMetricAction({
  exerciseId: 'bench',
  values: [{ type: 'repetitions', value: 10, unit: 'reps' }],
  timeSpans: [...]
})];
```

### Querying Metrics

```typescript
// Get all collected metrics
const collected = runtime.fragmentCollector.getMetricsWithBehavior(
  MetricBehavior.Collected
);

// Get recorded (runtime-generated) metrics
const recorded = runtime.fragmentCollector.getMetricsWithBehavior(
  MetricBehavior.Recorded
);
```

### Adding Projection Engines

New engines must support fragments:

```typescript
export class MyProjectionEngine implements IProjectionEngine {
  calculateFromFragments(
    fragments: ICodeFragment[],
    exerciseId: string,
    definition: Exercise
  ): ProjectionResult[] {
    // Filter fragments relevant to this engine
    const relevantFragments = fragments.filter(
      f => f.behavior === MetricBehavior.Collected
    );
    
    // Calculate projection
    return [/* ... */];
  }
}
```
```

---

## Timeline & Resource Allocation

| Phase | Duration | Team Size | Risk | Dependencies |
|-------|----------|-----------|------|--------------|
| 1 | 1 week | 1 engineer | Low | None |
| 2 | 2 weeks | 2 engineers | Medium | Phase 1 complete |
| 3 | 1 week | 1 engineer | Low | Phase 2 complete |
| **Total** | **4 weeks** | **1-2 eng** | **Medium** | - |

---

## Open Questions & Decisions Needed

1. **MetricsContext Confirmation**
   - Is `useMetrics()` hook used anywhere in the app?
   - If used, preserve it; if not, remove it
   - Decision deadline: End of Phase 1

2. **Backward Compatibility Window**
   - How long should RuntimeMetric be supported?
   - Proposal: 6 weeks (Phase 2 + 2 additional weeks)
   - Affects external clients (Chromecast, analytics receivers)

3. **Display Layer Scope**
   - Should IDisplayMetric remain as abstraction?
   - Recommendation: Yes - decouples display from data model
   - Alternative: Direct fragment rendering in components

4. **Analytics Validation**
   - Need to validate projection results unchanged after migration?
   - Recommendation: Yes - add golden-file tests for known workouts

5. **Performance Benchmarks**
   - What are acceptable performance targets?
   - Fragment collection vs RuntimeMetric collection
   - Proposal: Same or better within 10%

---

## References

### Architecture Documents
- `docs/runtime-api.md` - Runtime stack patterns
- `ARCHITECTURE.md` - System design (if exists)

### Related Issues
- *(To be created)* #GH-ISSUE-CONSOLIDATE-METRICS - Epic tracking this plan
- *(To be created)* #GH-ISSUE-DEAD-CODE-METRICS-CONTEXT - MetricsContext audit

### Files Mentioned in This Plan
- `src/runtime/RuntimeMetric.ts` - Primary type
- `src/runtime/MetricCollector.ts` - Collection interface
- `src/timeline/analytics/AnalysisService.ts` - Analytics pipeline
- `src/services/MetricsContext.tsx` - React context (possibly dead)
- `src/core/models/CodeFragment.ts` - Target architecture

---

## Approval

- [ ] Architect Review
- [ ] Team Lead Review  
- [ ] Analytics Owner Review
- [ ] Infrastructure/CI Owner Review

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-26  
**Status:** Proposed - Awaiting Review
