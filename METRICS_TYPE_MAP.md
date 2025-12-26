# Metrics Type System - Visual Map & Cross-Reference

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INTENDED ARCHITECTURE                            │
│                                                                     │
│  ICodeFragment + MetricBehavior + FragmentCollectionState           │
│  (Already defined in codebase - just not used consistently)         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    ACTUAL PARALLEL SYSTEMS                          │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ RuntimeMetric│  │CurrentMetrics│  │    Metric    │               │
│  │ (27 files)   │  │ (4 files)    │  │  (2 files)   │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ WorkoutMetric│  │MetricPoint/  │  │IDisplayMetric│               │
│  │ (2 files)    │  │SegmentLog    │  │  (5 files)   │               │
│  │              │  │  (2 files)   │  │   ✓ OK       │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Type Hierarchy & Relationships

### 1. RuntimeMetric (Source of Truth, Needs Deprecation)

```
RuntimeMetric (src/runtime/RuntimeMetric.ts)
│
├─ exerciseId: string
├─ behavior?: MetricBehavior  ← ✓ Has correct enum!
├─ values: MetricValue[]
│  │
│  └─ MetricValue (3RD DEFINITION)
│     ├─ type: "repetitions" | "resistance" | "distance" | ...
│     ├─ value: number | undefined
│     └─ unit: string
│
└─ timeSpans: TimeSpan[]
   ├─ start: Date
   └─ stop: Date

↓ Immediately converted by EmitMetricAction:
  
  metricsToFragments(metrics)
  ↓
  ICodeFragment[]  (fragments with behavior)
```

**Export Chain:**
```
src/runtime/RuntimeMetric.ts
  ↓ (exported from)
src/core-entry.ts
  ↓ (used by)
MetricCollector, AnalysisService, ProjectionEngines, 
CastMessages, EffortBlock, RoundsBlock, ...
```

---

### 2. CurrentMetrics (Memory Slot, Should Remove)

```
CurrentMetrics (src/runtime/models/MemoryModels.ts)
│
└─ [key: string]: MetricValue  ← ⚠️ DIFFERENT MetricValue!
   ├─ value: number
   ├─ unit: string
   └─ sourceId: string

Allocated via:
MemoryTypeEnum.METRICS_CURRENT
↓
TypedMemoryReference<CurrentMetrics>
↓
Used by: EffortBlock, RoundsBlock (for live UI updates)
↓
Duplicates: Block.fragments (already has this data!)
```

**Data Flow:**
```
Block internal state (e.g., this.currentReps)
  ↓
Block.updateMetrics()
  ↓
this.metricsRef.set({ 'reps': { value, unit, sourceId } })
  ↓
Memory storage
  ↓
UI subscription (real-time updates)

Problem: Same data in two places!
```

---

### 3. Metric (Legacy CollectionSpan Format)

```
Metric (src/core/models/CollectionSpan.ts)
│
├─ sourceId: number
└─ values: MetricValue[]  ← ⚠️ ANOTHER MetricValue!
   ├─ type: string
   ├─ value: number
   └─ unit: string

Part of:
CollectionSpan
  ├─ blockKey?: string
  ├─ duration?: number
  ├─ timeSpans: TimeSpan[]
  └─ metrics: Metric[]  ← Legacy field

Used by:
MetricAnchor (for aggregation)
```

**Data Model:**
```
CollectionSpan
  metrics: [
    {
      sourceId: 42,
      values: [
        { type: 'repetitions', value: 10, unit: 'reps' },
        { type: 'resistance', value: 100, unit: 'kg' }
      ]
    }
  ]

Should be: fragments: ICodeFragment[][]
```

---

### 4. MetricPoint / SegmentLog (React Context, Possibly Dead)

```
SegmentLog (src/services/MetricsContext.tsx)
│
├─ id: string
├─ name: string
├─ startTime: number
├─ endTime?: number
├─ status: 'running' | 'completed' | 'failed'
└─ metrics: MetricPoint[]
   │
   └─ MetricPoint
      ├─ timestamp: number
      ├─ type: string
      ├─ value: number
      ├─ unit?: string
      └─ segmentId?: string

Lifecycle:
MetricsProvider
  ├─ startSegment(id, name)
  │  └─ Creates: SegmentLog
  ├─ logMetric(metric)
  │  └─ Appends: MetricPoint to active SegmentLog
  ├─ endSegment(id)
  │  └─ Closes: SegmentLog
  └─ useMetrics() hook
     └─ Consumed by: ??? (NOT FOUND IN CODEBASE)

Issue: Provider wraps components in UnifiedWorkbench & WodWorkbench,
       but no children call useMetrics(). Likely DEAD CODE.
```

---

### 5. WorkoutMetric (Markdown Editor)

```
WorkoutMetric (src/markdown-editor/types/index.ts)
│
├─ name: string
├─ value: number | string
├─ unit?: string
└─ timestamp?: number

Used by:
WorkoutResults
  ├─ startTime: number
  ├─ endTime: number
  ├─ duration: number
  ├─ roundsCompleted?: number
  ├─ totalRounds?: number
  ├─ repsCompleted?: number
  ├─ metrics: WorkoutMetric[]  ← Custom format
  └─ completed: boolean

Scope: Markdown editor only
Export: src/markdown-editor/index.ts
```

---

### 6. IDisplayMetric (Display Abstraction, Acceptable)

```
IDisplayMetric (src/clock/types/DisplayTypes.ts)
│
├─ type: string
├─ value?: unknown
├─ unit?: string
└─ [display properties]

Used by:
IDisplayCardEntry
  ├─ id: string
  ├─ ownerId: string
  ├─ type: DisplayCardType
  ├─ metrics?: IDisplayMetric[]
  └─ metricGroups?: IDisplayMetric[][]

Used by:
✓ DefaultCards.tsx
✓ DigitalClock.tsx
✓ TimerStateManager.ts (creates display metrics from fragments)

Status: ✓ REASONABLE ABSTRACTION
        Decouples display rendering from data model
        OK to keep, just transform from fragments
```

---

## MetricValue - The Naming Collision Problem

```
THREE DIFFERENT "MetricValue" DEFINITIONS:

1. src/runtime/RuntimeMetric.ts (Canonical - should be)
   type MetricValue = {
     type: "repetitions" | "resistance" | ... (12 specific types)
     value: number | undefined
     unit: string
   }

2. src/runtime/models/MemoryModels.ts (Memory version)
   interface MetricValue {
     value: number
     unit: string
     sourceId: string
   }

3. src/core/models/CollectionSpan.ts (Legacy version)
   type MetricValue = {
     type: string  (generic - not union)
     value: number
     unit: string
   }

Problem: Which import goes where?
         - EffortBlock imports from MemoryModels
         - MetricAnchor uses from CollectionSpan
         - RuntimeMetric uses from RuntimeMetric
         
Result: Developers must know which version to use per file!
```

**Solution: Unify to single definition (Phase 1)**

---

## Flow Diagrams

### Current Metrics Collection Path (Dual Track)

```
Block Behavior
  │
  ├─ PATH 1: RuntimeMetric (Legacy)
  │  ├─ Emits: EmitMetricAction
  │  │  └─ metric: RuntimeMetric
  │  ├─ Converts: metricsToFragments()
  │  │  └─ ICodeFragment[]
  │  └─ Appends: runtime.tracker.appendFragments()
  │
  └─ PATH 2: Fragments (Intended)
     └─ block.fragments (already there!)

Result: SAME DATA IN TWO DIFFERENT FORMATS!
```

### Analytics Pipeline (RuntimeMetric Dependent)

```
RuntimeMetric[] 
  ↓
AnalysisService.runAllProjections()
  ├─ groupMetricsByExercise()
  ├─ For each exercise:
  │  └─ For each engine:
  │     └─ engine.calculate(RuntimeMetric[], definition)
  │        ├─ VolumeProjectionEngine
  │        ├─ (other engines...)
  │        └─ Returns: ProjectionResult[]
  ↓
ProjectionResult[] (for UI)

Problem: Tightly coupled to RuntimeMetric type
         All engines must accept RuntimeMetric
         No fragment-based path
         5+ test files mock RuntimeMetric arrays
```

---

## Consolidation Path (Proposed)

### Before (6 systems):
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│RuntimeMetric│ │CurrentMetrics│ │   Metric    │
└─────────────┘ └─────────────┘ └─────────────┘
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│WorkoutMetric│ │MetricPoint  │ │IDisplayMetric
└─────────────┘ └─────────────┘ └─────────────┘

    ↓ (during Phase 2)

┌─────────────────────────────────────┐
│    ICodeFragment + MetricBehavior   │
│          (canonical path)           │
└─────────────────────────────────────┘
    ↓
┌─────────────┐
│IDisplayMetric│ ✓ (transformed from fragments)
└─────────────┘
```

### After (2 systems):
```
┌─────────────────────────────────────┐
│    ICodeFragment + MetricBehavior   │
│          (single source)            │
└─────────────────────────────────────┘
         ↓              ↓
    ┌─────────┐   ┌──────────────┐
    │Analytics│   │IDisplayMetric│
    └─────────┘   └──────────────┘
```

---

## Import Dependencies Map

### Files That Import RuntimeMetric
```
src/runtime/
  ├─ MetricCollector.ts (primary consumer)
  ├─ IRuntimeBlock.ts (interface uses it)
  ├─ FragmentCompilationManager.ts
  ├─ FragmentCompilers.ts
  ├─ actions/EmitMetricAction.ts
  ├─ behaviors/IdleBehavior.ts
  └─ utils/metricsToFragments.ts

src/timeline/analytics/
  ├─ AnalysisService.ts (critical)
  ├─ IProjectionEngine.ts (critical)
  ├─ analytics/engines/VolumeProjectionEngine.ts
  └─ analytics/engines/*.ts (all engines)

src/types/
  └─ cast/messages.ts (external API)

tests/
  ├─ **/AnalysisService.test.ts
  ├─ **/VolumeProjectionEngine.test.ts
  └─ **/*.test.ts (5+ files mock it)

Total: 27 files directly depend on RuntimeMetric
```

### Files That Import CurrentMetrics
```
src/runtime/
  ├─ MemoryTypeEnum.ts (defines)
  ├─ models/MemoryModels.ts (defines)
  ├─ blocks/EffortBlock.ts (uses)
  └─ blocks/RoundsBlock.ts (uses)

Total: 4 files
Risk: LOW - only 2 blocks affected
```

### Files That Use Metric (CollectionSpan)
```
src/
  ├─ core/models/CollectionSpan.ts (defines)
  └─ clock/anchors/MetricAnchor.tsx (uses)

Total: 2 files
Risk: VERY LOW - single anchor component
```

---

## Decision Tree: What To Do With Each Type

```
RuntimeMetric
├─ Decision: DEPRECATE
├─ Timeline: Phase 3 (mark deprecated)
│             Q2 2025 (remove)
├─ Replacement: ICodeFragment + MetricBehavior
└─ Impact: HIGH (27 files affected)

CurrentMetrics
├─ Decision: REMOVE
├─ Timeline: Phase 3 (remove from memory model)
├─ Replacement: Direct fragment access from block
└─ Impact: LOW (only 2 blocks)

Metric
├─ Decision: REPLACE in CollectionSpan
├─ Timeline: Phase 3 (use ICodeFragment[][])
├─ Replacement: ICodeFragment[] in RuntimeSpan
└─ Impact: LOW (affects 1 display component)

MetricPoint/SegmentLog
├─ Decision: REMOVE IF DEAD
├─ Timeline: Phase 1 (audit), Phase 2 (remove)
├─ Replacement: None (was unused)
└─ Impact: NONE (if dead) / CRITICAL (if used!)

WorkoutMetric
├─ Decision: UNIFY with ICodeFragment
├─ Timeline: Phase 3 (update editor)
├─ Replacement: ICodeFragment[] + summary aggregations
└─ Impact: LOW (editor scope only)

IDisplayMetric
├─ Decision: KEEP (reasonable layer)
├─ Timeline: Phase 2 (add converter from fragments)
├─ Replacement: Keep, but transform from fragments
└─ Impact: POSITIVE (clarifies display contract)
```

---

## Metric Type Evolution Timeline

```
TODAY (Sprint N)
├─ All 6 systems coexist
├─ Bridge code (metricsToFragments) exists
└─ Documentation mentions consolidation needed

PHASE 1: WEEK 1
├─ Unify MetricValue definition
├─ Audit MetricsContext usage
├─ Create fragment→display converter
└─ Still: All systems coexist

PHASE 2: WEEKS 2-3
├─ Fragment-based metric collection API
├─ Analytics engines support fragments
├─ Dual-path validation (equivalence tests)
├─ Cast messages dual-format
└─ Still: Both RuntimeMetric AND fragments work

PHASE 3: WEEK 4
├─ Remove MetricsContext (if confirmed dead)
├─ Remove CurrentMetrics memory type
├─ Replace CollectionSpan.Metric with fragments
├─ Update WorkoutMetric to fragments
├─ Deprecate RuntimeMetric (with warning)
└─ Still: RuntimeMetric works but deprecated

Q2 2025 (Post-Buffer Period)
├─ REMOVE RuntimeMetric entirely
├─ REMOVE EmitMetricAction (deprecated)
├─ REMOVE metricsToFragments bridge
├─ Simplify analytics (fragment-only path)
└─ Result: Single metric system ✓
```

---

## Complexity Heatmap

```
                    Difficulty  Dependencies  Risk   Testing
RuntimeMetric         🔴HIGH      🔴MANY       🟡MED  🟡MED
CurrentMetrics        🟢LOW       🟢FEW        🟢LOW  ��LOW
Metric                🟢LOW       🟢FEW        🟢LOW  🟢LOW
MetricPoint/SegmentLog🟡MED      ❓UNKNOWN    🟡MED  🟡MED
WorkoutMetric         🟢LOW       🟢FEW        🟢LOW  🟢LOW
AnalyticsPipeline     🔴HIGH      🔴MANY       🟡MED  🔴HIGH
```

---

## Summary Table

| Type | Location | Files | Risk | Action | When |
|------|----------|-------|------|--------|------|
| RuntimeMetric | `runtime/` | 27 | 🟡 HIGH | Deprecate→Remove | P3→Q2 |
| CurrentMetrics | `models/` | 4 | 🟢 LOW | Remove | P3 |
| Metric | `CollectionSpan` | 2 | 🟢 LOW | Replace | P3 |
| MetricPoint | `services/` | 2 | ❓ UNK | Remove (if dead) | P1→P2 |
| WorkoutMetric | `markdown-editor/` | 2 | 🟢 LOW | Unify | P3 |
| IDisplayMetric | `clock/types/` | 5 | 🟢 OK | Keep+Transform | P2 |

**Legend:**
- 🟢 LOW: <1 day to change
- 🟡 MEDIUM: 1-3 days
- 🔴 HIGH: 3+ days
- P1, P2, P3 = Phase
- Q2 = Q2 2025

