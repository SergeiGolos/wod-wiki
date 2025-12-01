# Log View Record Types Analysis

## Overview

This document provides a detailed analysis of the record types created by the runtime logging system, how they appear in the log view, and the parent-child event ordering that governs their creation.

---

## UI Consumer Components

The `ExecutionRecord` data is consumed by **three distinct UI components**, each with different transformation and display requirements:

| Component | Purpose | Display Order | Data Transform |
|-----------|---------|---------------|----------------|
| [RuntimeEventLog](../../src/components/workout/RuntimeEventLog.tsx) | Sectioned log view | Chronological | `ExecutionRecord` → `LogSection[]` |
| [RuntimeHistoryPanel](../../src/components/workout/RuntimeHistoryPanel.tsx) | Tree view (Track) | **Newest-first** | `ExecutionRecord` → `MetricItem[]` |
| [AnalyticsLayout](../../src/views/analytics/AnalyticsLayout.tsx) | Timeline/Graphs | Chronological | `ExecutionRecord` → `Segment[]` |

### Component Data Flow

```
                          ┌──────────────────────────────┐
                          │   runtime.memory             │
                          │   (execution-record type)    │
                          └──────────────┬───────────────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
              ▼                          ▼                          ▼
    ┌─────────────────┐      ┌─────────────────────┐     ┌─────────────────┐
    │ RuntimeEventLog │      │ RuntimeHistoryPanel │     │ AnalyticsLayout │
    │                 │      │                     │     │                 │
    │ → LogSection[]  │      │ → MetricItem[]      │     │ → Segment[]     │
    │ → LogEntry[]    │      │ + MetricsTreeView   │     │ + TimelineView  │
    │                 │      │                     │     │ + GitTreeSidebar│
    └─────────────────┘      └─────────────────────┘     └─────────────────┘
              │                          │                          │
              ▼                          ▼                          ▼
    ┌─────────────────┐      ┌─────────────────────┐     ┌─────────────────┐
    │ Sectioned List  │      │ Indented Tree       │     │ Timeline Bars   │
    │ with Fragments  │      │ with Connections    │     │ + Telemetry     │
    └─────────────────┘      └─────────────────────┘     └─────────────────┘
```

---

## Record Types Summary

The log view displays records from two primary sources:

| Source | Description | Status |
|--------|-------------|--------|
| `runtime.executionLog` | Completed ExecutionRecords | `status: 'completed'` |
| `runtime.activeSpans` | Active ExecutionRecords in memory | `status: 'active'` |

---

## Record Types Created by Blocks

### 1. **Section Head Records** (Container Types)

These records create **section headers** in the log view. They group child records underneath.

| Record Type | Created By                        | Label Example           | Visual                        |
| ----------- | --------------------------------- | ----------------------- | ----------------------------- |
| `start`     | RuntimeEventLog                   | "Workout Started"       | Section header with timestamp |
| `rounds`    | RoundsBlock                       | "3 Rounds" or "21-15-9" | Section header                |
| `round`     | LoopCoordinatorBehavior           | "Round 1", "Round 2"    | Sub-section header            |
| `interval`  | LoopCoordinatorBehavior           | "Interval 1"            | Sub-section header (EMOM)     |
| `timer`     | TimerBlock                        | "10:00" or "For Time"   | Section header                |
| `amrap`     | TimerBlock (direction=down)       | "AMRAP"                 | Section header                |
| `emom`      | IntervalStrategy (via Timer+EMOM) | "EMOM"                  | Section header                |
| `root`      | Root wrapper blocks               | "Workout"               | Default section               |
| `warmup`    | Custom blocks                     | "Warmup"                | Section header                |
| `cooldown`  | Custom blocks                     | "Cooldown"              | Section header                |
| `tabata`    | Custom blocks                     | "Tabata"                | Section header                |

**Container Detection Logic** (from [RuntimeEventLog.tsx](../../src/components/workout/RuntimeEventLog.tsx#L298)):
```typescript
const isContainer = ['root', 'round', 'interval', 'warmup', 'cooldown', 'amrap', 'emom', 'tabata'].includes(entry.type.toLowerCase());
```

### 2. **Record Rows** (Leaf Types)

These records appear as **individual entries** within sections.

| Record Type | Created By | Label Example | Visual |
|-------------|------------|---------------|--------|
| `effort` | EffortBlock | "10 Pushups" | Exercise with reps fragment |
| `block` | Generic RuntimeBlock | "Block" | Default type |

---

## ExecutionRecord Structure

Every record follows this interface (from [ExecutionRecord.ts](../../src/runtime/models/ExecutionRecord.ts)):

```typescript
interface ExecutionRecord {
    id: string;              // Unique ID (e.g., "1234567890-blockKey")
    blockId: string;         // Block key string
    parentId: string | null; // Parent span ID (links to parent record)
    type: string;            // 'timer' | 'rounds' | 'effort' | 'round' etc.
    label: string;           // Display label
    startTime: number;       // Timestamp when pushed
    endTime?: number;        // Timestamp when popped (undefined while active)
    status: 'active' | 'completed' | 'failed';
    metrics: RuntimeMetric[]; // Associated metrics
}
```

---

## Record Creation Order of Operations

### Stack Push Flow (Parent → Child)

```
1. User starts workout
   └─► ScriptRuntime.compile() creates root block

2. Root block pushed
   └─► ScriptRuntime._setupMemoryAwareStack.push():
       ├─► Determines parentId from stack[length-2]
       ├─► Creates ExecutionRecord with status: 'active'
       ├─► Stores in memory: allocate('execution-record', blockId, record)
       └─► Calls block.mount()

3. Root block's mount() returns actions
   └─► LoopCoordinatorBehavior.onPush() called
       └─► Triggers first onNext()
           ├─► Increments index (0 → 1)
           ├─► Emits "Round 1" record via emitRoundChanged()
           └─► Returns PushBlockAction(childBlock)

4. Child block pushed (same flow as step 2)
   └─► parentId set to root's record ID
```

### Stack Pop Flow (Child → Parent)

```
1. Child block completes
   └─► CompletionBehavior.onNext() returns PopBlockAction

2. PopBlockAction.do():
   ├─► Calls block.unmount() - gets final actions
   ├─► Calls runtime.stack.pop()
   │   └─► ScriptRuntime._setupMemoryAwareStack.pop():
   │       ├─► Searches memory for execution-record
   │       ├─► Updates: endTime = Date.now()
   │       └─► Updates: status = 'completed'
   ├─► Calls poppedBlock.dispose(runtime)
   ├─► Calls poppedBlock.context.release()
   └─► Calls parentBlock.next() ← CRITICAL: Parent advances

3. Parent's next() triggers behaviors
   └─► LoopCoordinatorBehavior.onNext():
       ├─► If more children: Returns PushBlockAction
       └─► If complete: CompletionBehavior returns PopBlockAction
```

---

## Round/Interval Record Management

### Round Records Created by LoopCoordinatorBehavior

From [LoopCoordinatorBehavior.ts](../../src/runtime/behaviors/LoopCoordinatorBehavior.ts#L252-L289):

```typescript
private emitRoundChanged(runtime: IScriptRuntime, rounds: number, block: IRuntimeBlock): void {
    const blockId = block.key.toString();
    const prevRound = rounds;      // Round that just finished (0-indexed)
    const nextRound = rounds + 1;  // New round (1-indexed for display)

    // 1. Close previous round record
    if (prevRound > 0) {
        const prevRoundId = `${blockId}-round-${prevRound}`;
        // Find and update: endTime = Date.now(), status = 'completed'
    }

    // 2. Create new round record
    const newRoundId = `${blockId}-round-${nextRound}`;
    const record = {
        id: newRoundId,
        blockId: blockId,              // Block that owns this round
        parentId: blockId,             // Parent is the same block
        type: loopType === INTERVAL ? 'interval' : 'round',
        label: `Round ${nextRound}` or `Interval ${nextRound}`,
        startTime: Date.now(),
        status: 'active',
        metrics: []
    };
    runtime.memory.allocate('execution-record', blockId, record, 'public');
}
```

### Round ID Scheme

| ID Pattern | Type | Example |
|------------|------|---------|
| `{blockId}` | Main block | `abc123` |
| `{blockId}-round-{N}` | Round sub-record | `abc123-round-1` |
| `{blockId}-interval-{N}` | Interval sub-record | `abc123-interval-1` |

---

## Log View Section Building

### Section Detection Flow ([RuntimeEventLog.tsx](../../src/components/workout/RuntimeEventLog.tsx#L247-L350))

```
1. Collect all entries (completed + active)
   └─► Sort by startTime

2. For each entry:
   ├─► If isContainer OR type === 'start':
   │   └─► Create LogSection, add to sections array
   │       └─► Map parentId → sections for child lookup
   │
   └─► If leaf (effort, block):
       └─► Find target section:
           ├─► Check sectionsByBlockId.get(entry.parentId)
           ├─► Find section with startTime <= entry.startTime + 100ms
           └─► Fallback: use last section or create default
```

### Section Structure

```typescript
interface LogSection {
  id: string;         // Record ID
  title: string;      // Display label
  startTime: number;
  endTime?: number;
  entries: LogEntry[];  // Child records
  isActive: boolean;
  type: string;
}
```

---

## Timing and Ordering Issues

### Potential Off-by-One Scenarios

1. **Round Boundary Detection**
   - `position === 0` triggers `emitRoundChanged()`
   - Issue: First child push happens AFTER round record creation
   - The child's `parentId` references the block, not the round sub-record

2. **100ms Tolerance Window**
   ```typescript
   if (candidates[i].startTime <= entry.startTime + 100) {
       targetSection = candidates[i];
   }
   ```
   - If child starts within 100ms of section, it's associated
   - Edge case: Fast execution may associate child with wrong round

3. **Parent next() Ordering**
   ```typescript
   // PopBlockAction.do():
   // 6. Call parent block's next() if there's a parent
   const parentBlock = runtime.stack.current;
   if (parentBlock) {
       const nextActions = parentBlock.next(runtime);
   }
   ```
   - Parent's `next()` is called AFTER child is fully disposed
   - This is correct order: child cleanup → parent advance

### Critical Timing Guarantees

| Event | Timing Guarantee |
|-------|------------------|
| Parent record created | BEFORE child push |
| Round N record created | BEFORE first child of Round N |
| Child record created | AFTER parent record exists |
| Round N-1 record closed | WHEN Round N starts (index wraps) |
| Child record closed | WHEN child pops from stack |
| Parent record closed | AFTER all children complete |

---

## Metrics Binding During Live Execution

### Effort Block Metrics Flow

From [EffortBlock.ts](../../src/runtime/blocks/EffortBlock.ts#L139-L173):

```typescript
private updateMetrics(runtime: IScriptRuntime): void {
    // 1. Update global metrics memory
    const metricsRef = runtime.memory.allocate<CurrentMetrics>(
        MemoryTypeEnum.METRICS_CURRENT,
        'runtime',
        {},
        'public'
    );
    metrics['reps'] = { value: this.currentReps, unit: 'reps', sourceId: blockKey };
    
    // 2. Emit reps:updated event
    runtime.handle({
        name: 'reps:updated',
        timestamp: new Date(),
        data: { blockId, exerciseName, currentReps, targetReps }
    });
}
```

### ExecutionRecord Metrics Population

When block is pushed ([ScriptRuntime.ts](../../src/runtime/ScriptRuntime.ts#L112-L140)):

```typescript
// For effort blocks, extract exercise name from label
if (block.blockType === 'Effort' && block.label) {
    const match = label.match(/^(\d+)\s+(.+)$/);
    if (match) {
        initialMetrics.push({
            exerciseId: exerciseName,
            values: [{ type: 'repetitions', value: reps, unit: 'reps' }],
            timeSpans: []
        });
    }
}

const record: ExecutionRecord = {
    ...
    metrics: initialMetrics  // Set at push time
};
```

---

## Fragment Visualization

### Metrics → Fragments Conversion ([RuntimeEventLog.tsx](../../src/components/workout/RuntimeEventLog.tsx#L60-L101))

```typescript
function metricsToFragments(metrics: RuntimeMetric[]): ICodeFragment[] {
    const fragments: ICodeFragment[] = [];
    for (const metric of metrics) {
        // 1. Add exercise name as Effort fragment
        if (metric.exerciseId) {
            fragments.push({
                type: 'effort',
                fragmentType: FragmentType.Effort,
                value: metric.exerciseId,
                image: metric.exerciseId,
            });
        }
        // 2. Add each metric value (reps, distance, etc.)
        for (const value of metric.values) {
            fragments.push(metricToFragment(value));
        }
    }
    return fragments;
}
```

### Fragment Type Mapping

| Metric Type | FragmentType | Visual |
|-------------|--------------|--------|
| `repetitions` | `FragmentType.Rep` | Rep badge |
| `resistance` | `FragmentType.Resistance` | Weight badge |
| `distance` | `FragmentType.Distance` | Distance badge |
| `time` | `FragmentType.Timer` | Timer badge |
| `rounds` | `FragmentType.Rounds` | Rounds badge |
| `action` | `FragmentType.Action` | Action badge |
| `effort` | `FragmentType.Effort` | Exercise name |

---

## Event Subscription for Live Updates

### Memory Subscription Pattern ([RuntimeEventLog.tsx](../../src/components/workout/RuntimeEventLog.tsx#L131-L141))

```typescript
useEffect(() => {
    if (!runtime) return;
    
    // Subscribe to ALL memory changes
    const unsubscribe = runtime.memory.subscribe(() => setUpdateVersion(v => v + 1));
    
    // Also poll every 100ms for duration updates
    const intervalId = setInterval(() => setUpdateVersion(v => v + 1), 100);
    
    return () => {
        unsubscribe();
        clearInterval(intervalId);
    };
}, [runtime]);
```

### Why 100ms Polling?

- Memory subscription fires on allocation/set operations
- Duration display needs continuous update (live elapsed time)
- 100ms provides smooth visual updates without excessive re-renders

---

## Known Issues & Recommendations

### Issue 1: Round Records Use Same ownerId as Parent Block

**Problem**: Round sub-records use `blockId` as both their ID prefix AND ownerId:
```typescript
runtime.memory.allocate('execution-record', blockId, record, 'public');
```

**Impact**: Memory search by ownerId returns multiple records (block + all its rounds).

**Recommendation**: Use unique ownerId for round records:
```typescript
runtime.memory.allocate('execution-record', newRoundId, record, 'public');
```

### Issue 2: parentId Points to Block, Not Round

**Problem**: Child effort blocks have `parentId = blockId`, not `roundId`:
```typescript
// In ScriptRuntime._setupMemoryAwareStack.push():
parentId = parentBlock.key.toString();  // Gets block ID, not round ID
```

**Impact**: UI cannot directly determine which round a child belongs to. Must use timing heuristics.

**Recommendation**: When inside a loop, set parentId to current round's record ID:
```typescript
// Check if parent has active round record
const roundRefs = memory.search({ type: 'execution-record', ownerId: parentId, ... });
const activeRound = roundRefs.find(r => r.type === 'round' && r.status === 'active');
if (activeRound) parentId = activeRound.id;
```

### Issue 3: 100ms Tolerance May Cause Mis-association

**Problem**: Fast workout execution may cause children to associate with wrong section:
```typescript
if (candidates[i].startTime <= entry.startTime + 100) { // +100ms tolerance
```

**Recommendation**: Use explicit parentId relationships instead of timing heuristics.

---

## Summary: Record Flow Diagram

```
Workout Start
    │
    ▼
┌────────────────────────────────────────┐
│ RoundsBlock pushed                      │
│ ├─► ExecutionRecord(type='rounds')     │
│ │   status='active'                    │
│ │                                      │
│ ├─► LoopCoordinator.onPush()           │
│ │   └─► emitRoundChanged(round=0)      │
│ │       └─► ExecutionRecord(type='round')
│ │           id='blockId-round-1'       │
│ │           parentId='blockId'         │
│ │                                      │
│ └─► PushBlockAction(EffortBlock)       │
└────────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────┐
│ EffortBlock pushed                      │
│ ├─► ExecutionRecord(type='effort')     │
│ │   parentId='blockId' (not round!)    │
│ │   metrics=[{exerciseId, values}]     │
│ │                                      │
│ └─► (user completes exercise)          │
└────────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────┐
│ EffortBlock pops                        │
│ ├─► ExecutionRecord updated            │
│ │   endTime=now, status='completed'    │
│ │                                      │
│ └─► Parent.next() called               │
│     └─► Loop continues or completes    │
└────────────────────────────────────────┘
```

---

## Files Referenced

- [ExecutionRecord.ts](../../src/runtime/models/ExecutionRecord.ts) - Record interface
- [ScriptRuntime.ts](../../src/runtime/ScriptRuntime.ts#L45-L170) - Record creation in stack hooks
- [LoopCoordinatorBehavior.ts](../../src/runtime/behaviors/LoopCoordinatorBehavior.ts) - Round/interval records
- [RuntimeEventLog.tsx](../../src/components/workout/RuntimeEventLog.tsx) - Log view component
- [EffortBlock.ts](../../src/runtime/blocks/EffortBlock.ts) - Metrics emission
- [RoundsBlock.ts](../../src/runtime/blocks/RoundsBlock.ts) - Loop management
- [PopBlockAction.ts](../../src/runtime/PopBlockAction.ts) - Stack pop flow
- [PushBlockAction.ts](../../src/runtime/PushBlockAction.ts) - Stack push flow

---

## UI Consumer Details

### 1. RuntimeHistoryPanel (Track View)

**Purpose**: Live execution history tree for the Track screen during active workouts.

**Location**: [RuntimeHistoryPanel.tsx](../../src/components/workout/RuntimeHistoryPanel.tsx)

**Display Requirements**:
- **Newest-first ordering** (grows downward as workout progresses)
- Cards written AFTER blocks report themselves (lazy rendering)
- Shows which blocks are currently on the stack (active vs completed)
- Displays metrics as fragments using `FragmentVisualizer`
- Tree indentation based on parent-child relationships

**Data Transformation** (`ExecutionRecord` → `MetricItem`):

```typescript
interface MetricItem {
  id: string;           // hashCode(record.blockId)
  parentId: string | null; // hashCode(record.parentId)
  lane: number;         // Calculated depth for indentation
  title: string;        // record.label
  icon: ReactNode;      // Play/Clock/Activity based on status
  tags: ReactNode;      // FragmentVisualizer output
  footer: ReactNode;    // Duration display
  status: 'active' | 'completed' | 'pending';
  startTime: number;    // For sorting
}
```

**Conversion Flow**:
```typescript
function recordToItem(record: ExecutionRecord): MetricItem {
    // 1. Calculate duration
    const duration = ((record.endTime ?? Date.now()) - record.startTime) / 1000;
    
    // 2. Convert metrics to fragments (or use label fallback)
    const fragments = record.metrics.length > 0 
        ? metricsToFragments(record.metrics)
        : [createLabelFragment(record.label, record.type)];
    
    // 3. Create display item
    return {
        id: hashCode(record.blockId).toString(),
        parentId: record.parentId ? hashCode(record.parentId).toString() : null,
        lane: 0, // Calculated later based on tree traversal
        title: record.label,
        tags: createTags(fragments, duration),
        status: record.status === 'active' ? 'active' : 'completed',
        ...
    };
}
```

**Lane/Depth Calculation** (post-processing):
```typescript
// Process chronologically to establish parent depths
const chronological = [...allItems].reverse();
chronological.forEach(item => {
    let depth = 0;
    if (item.parentId && idToDepth.has(item.parentId)) {
        depth = (idToDepth.get(item.parentId) || 0) + 1;
    }
    idToDepth.set(item.id, depth);
    item.lane = depth;
});
```

**Tree Rendering**: Uses [MetricsTreeView](../../src/components/metrics/MetricsTreeView.tsx) with:
- SVG connection lines between parent/child nodes
- Visual dot indicators for each item
- Indentation based on `lane` property

---

### 2. AnalyticsLayout (Analyze View)

**Purpose**: Post-workout analytics with timeline visualization and telemetry graphs.

**Location**: [AnalyticsLayout.tsx](../../src/views/analytics/AnalyticsLayout.tsx)

**Display Requirements**:
- Timeline bar visualization of workout segments
- Hierarchical segment tree in sidebar
- Telemetry graphs (power, HR, cadence) overlaid with segments
- Selection/highlight of segments affects graph view

**Data Transformation** (`ExecutionRecord` → `Segment`):

```typescript
interface Segment {
  id: number;           // hashCode(record.id)
  name: string;         // record.label
  type: string;         // record.type.toLowerCase()
  startTime: number;    // Math.floor(record.startTime / 1000) - SECONDS!
  endTime: number;      // Math.floor(record.endTime / 1000) or now
  duration: number;     // (endTime - startTime) in seconds
  parentId: number | null; // hashCode(record.parentId)
  depth: number;        // Calculated hierarchy depth
  metrics: Record<string, number>; // Dynamic metrics map
  lane: number;         // Visual lane for timeline bars
}
```

**Key Differences from RuntimeHistoryPanel**:
1. **Time units**: Converts ms → seconds for timeline display
2. **ID type**: Uses numeric IDs (via hashCode) vs string IDs
3. **Metrics format**: Expects `Record<string, number>` not `RuntimeMetric[]`

**Data Source**: Uses `useExecutionLog` hook:
```typescript
const { history, active } = useExecutionLog(runtime);
const segments = useMemo(() => {
    const allRecords = [...history, ...active];
    return allRecords.map((record: ExecutionRecord) => ({
        id: hashCode(record.id),
        name: record.label,
        type: record.type.toLowerCase(),
        startTime: Math.floor(record.startTime / 1000),
        // ... conversion
    }));
}, [history, active]);
```

**Issue: Metrics Field Mismatch**

The `Segment.metrics` expects `Record<string, number>` but `ExecutionRecord.metrics` provides `RuntimeMetric[]`. Current implementation sets empty objects:
```typescript
metrics: Record<string, number>; // Expected by Segment interface
// But conversion doesn't populate this - sets avgPower: 0, avgHr: 0
```

---

### 3. RuntimeEventLog (Legacy Sectioned View)

**Purpose**: Sectioned log view grouping records by container type.

**Location**: [RuntimeEventLog.tsx](../../src/components/workout/RuntimeEventLog.tsx)

**Data Transformation**: Groups entries into `LogSection[]` based on container types.

*(Already documented above in "Log View Section Building")*

---

## Shared Hooks and Utilities

### useExecutionLog Hook

**Location**: [useExecutionLog.ts](../../src/clock/hooks/useExecutionLog.ts)

Provides reactive access to execution records:

```typescript
export function useExecutionLog(runtime: ScriptRuntime | null): ExecutionLogData {
    const [logData, setLogData] = useState<ExecutionLogData>({
        history: [],  // status === 'completed'
        active: []    // status === 'active'
    });

    useEffect(() => {
        // Subscribe to memory changes for 'execution-record' type
        const unsubscribe = runtime.memory.subscribe((ref, value, oldValue) => {
            if (ref.type === 'execution-record') {
                updateLogData();
            }
        });
        // ...
    }, [runtime]);
}
```

### metricsToFragments Utility

Duplicated in both [RuntimeEventLog.tsx](../../src/components/workout/RuntimeEventLog.tsx#L55-L101) and [RuntimeHistoryPanel.tsx](../../src/components/workout/RuntimeHistoryPanel.tsx#L40-L110):

```typescript
function metricsToFragments(metrics: RuntimeMetric[]): ICodeFragment[] {
    const fragments: ICodeFragment[] = [];
    for (const metric of metrics) {
        if (metric.exerciseId) {
            fragments.push({
                type: 'effort',
                fragmentType: FragmentType.Effort,
                value: metric.exerciseId,
                image: metric.exerciseId,
            });
        }
        for (const value of metric.values) {
            fragments.push(metricToFragment(value));
        }
    }
    return fragments;
}
```

**Recommendation**: Extract to shared utility in `src/runtime/` or `src/lib/`.

---

## Display Requirements Summary

| Requirement | RuntimeEventLog | RuntimeHistoryPanel | AnalyticsLayout |
|-------------|-----------------|---------------------|-----------------|
| **Ordering** | Chronological | Newest-first | Chronological |
| **Hierarchy** | Sections | Tree with lines | Timeline lanes |
| **Metrics Display** | Fragment badges | Fragment badges | Aggregate stats |
| **Live Updates** | 100ms poll + subscription | subscription | subscription |
| **ID Format** | String | String (hashed) | Number (hashed) |
| **Time Units** | Milliseconds | Seconds (display) | Seconds |
| **Depth Calculation** | Section nesting | Parent lookup | Parent lookup |

---

## Impact on Record Structure

The current `ExecutionRecord` structure serves all three views, but with friction:

### Current Structure
```typescript
interface ExecutionRecord {
    id: string;
    blockId: string;
    parentId: string | null;
    type: string;
    label: string;
    startTime: number;
    endTime?: number;
    status: 'active' | 'completed' | 'failed';
    metrics: RuntimeMetric[];  // Complex nested structure
}
```

### Issues Identified

1. **Metrics Format Mismatch**
   - `RuntimeMetric[]` works for fragment display
   - `AnalyticsLayout` needs `Record<string, number>` for graphs
   - Two different consumers, incompatible formats

2. **ID Type Inconsistency**
   - Records use string IDs
   - Analytics/Timeline expect numeric IDs
   - Requires hashCode conversion with collision risk

3. **Time Unit Confusion**
   - Records store milliseconds
   - Timeline displays seconds
   - Each consumer converts differently

4. **Missing Fields for Analytics**
   - No `depth` field (must calculate)
   - No `lane` field (must calculate)
   - No aggregate metrics (avgPower, avgHr)

### Recommendation: Extended ExecutionRecord

Consider adding computed/aggregate fields:

```typescript
interface ExecutionRecord {
    // Existing fields...
    
    // Display hints (computed once, used by all views)
    depth?: number;           // Hierarchy depth from root
    
    // Aggregate metrics (for analytics view)
    aggregates?: {
        avgPower?: number;
        avgHr?: number;
        totalReps?: number;
        // ...
    };
}
```

Or create a derived type for analytics:

```typescript
interface AnalyticsRecord extends ExecutionRecord {
    depth: number;
    lane: number;
    durationSeconds: number;
    aggregateMetrics: Record<string, number>;
}
```

---

## Competing Metrics Mechanisms

The codebase has **three parallel systems** for metric creation and recording, which creates confusion and data inconsistency:

### Mechanism 1: Fragment Compilation (JIT Time)

**When**: During block compilation (strategy execution)

**Path**: `ICodeFragment[]` → `FragmentCompilationManager` → `MetricValue[]`

**Location**: [FragmentCompilationManager.ts](../../src/runtime/FragmentCompilationManager.ts), [FragmentCompilers.ts](../../src/runtime/FragmentCompilers.ts)

```typescript
// 10 fragment compilers transform parsed fragments into metrics
class RepFragmentCompiler implements IFragmentCompiler {
    compile(fragment: RepFragment): MetricValue[] {
        return [{ type: 'repetitions', value: fragment.value, unit: '' }];
    }
}

// Manager coordinates compilation
manager.compileStatementFragments(statement, runtime) → RuntimeMetric
```

**Issue**: Strategies **don't use this system consistently**. Most strategies extract fragment values manually:
```typescript
// In RoundsStrategy.compile():
const roundsFragment = fragments.find(f => f.fragmentType === FragmentType.Rounds);
// Manual extraction instead of: manager.compileStatementFragments(...)
```

---

### Mechanism 2: Label Parsing (Stack Push Time)

**When**: When block is pushed onto stack

**Path**: `block.label` → regex parsing → `ExecutionRecord.metrics`

**Location**: [ScriptRuntime.ts](../../src/runtime/ScriptRuntime.ts#L112-L140)

```typescript
// In _setupMemoryAwareStack.push():
if (block.blockType === 'Effort' && block.label) {
    const match = label.match(/^(\d+)\s+(.+)$/);  // Parse "10 Pushups"
    if (match) {
        initialMetrics.push({
            exerciseId: exerciseName,
            values: [{ type: 'repetitions', value: reps, unit: 'reps' }],
            timeSpans: []
        });
    }
}
```

**Issue**: This re-parses information that was already parsed by the Chevrotain parser and (theoretically) compiled by fragment compilers. The data flows:
```
Script → Parser → Fragments → Strategy → Block → Label → Regex → Metrics
                      ↑                              ↓
                      └──── Lost data ──────────────┘
```

---

### Mechanism 3: Live Metric Updates (Execution Time)

**When**: During workout execution (user interactions)

**Path**: `EffortBlock.updateMetrics()` → Memory allocation + Event emission

**Location**: [EffortBlock.ts](../../src/runtime/blocks/EffortBlock.ts#L139-L173)

```typescript
private updateMetrics(runtime: IScriptRuntime): void {
    // Writes to shared METRICS_CURRENT memory slot
    const metricsRef = runtime.memory.allocate<CurrentMetrics>(
        MemoryTypeEnum.METRICS_CURRENT, 'runtime', {}, 'public'
    );
    metrics['reps'] = { value: this.currentReps, unit: 'reps', sourceId: blockKey };
    
    // Emits event for UI
    runtime.handle({ name: 'reps:updated', ... });
}
```

**Issue**: These updates go to a **different memory slot** than `ExecutionRecord.metrics`. The UI must query both:
- `execution-record` type for historical metrics
- `METRICS_CURRENT` type for live progress

---

### Mechanism Comparison

| Aspect | Fragment Compilation | Label Parsing | Live Updates |
|--------|---------------------|---------------|--------------|
| **When** | JIT compile | Stack push | Execution |
| **Input** | `ICodeFragment[]` | `block.label` | User action |
| **Output** | `MetricValue[]` | `RuntimeMetric[]` | Memory + Event |
| **Stored In** | Discarded | `ExecutionRecord` | `METRICS_CURRENT` |
| **Used By** | Strategies (partial) | Log views | Live UI |

---

### Data Flow Gap Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Parser Output                                                               │
│                                                                             │
│   CodeStatement {                                                           │
│     fragments: [                                                            │
│       RepFragment(10),                                                      │
│       EffortFragment("Pushups")                                             │
│     ]                                                                       │
│   }                                                                         │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Strategy Compilation (EffortStrategy)                                       │
│                                                                             │
│   ❌ Does NOT call FragmentCompilationManager                               │
│   ✓ Extracts values manually from fragments                                 │
│   ✓ Creates EffortBlock with config: { exerciseName, targetReps }           │
│   ✓ Block.label = "10 Pushups"                                              │
│                                                                             │
│   GAP: Compiled MetricValue[] never created or passed to block              │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Stack Push (ScriptRuntime._setupMemoryAwareStack)                           │
│                                                                             │
│   ⚠️ Re-parses block.label with regex                                       │
│   ✓ Creates ExecutionRecord.metrics from parsed label                       │
│   ✓ Stores in memory as 'execution-record'                                  │
│                                                                             │
│   GAP: Could receive pre-compiled metrics from strategy instead             │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Execution Time (EffortBlock.updateMetrics)                                  │
│                                                                             │
│   ✓ Updates METRICS_CURRENT in memory                                       │
│   ✓ Emits reps:updated events                                               │
│   ❌ Does NOT update ExecutionRecord.metrics                                │
│                                                                             │
│   GAP: Live updates don't flow to execution log                             │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ UI Display (RuntimeHistoryPanel, AnalyticsLayout)                           │
│                                                                             │
│   ✓ Reads ExecutionRecord.metrics                                           │
│   ✓ Converts to ICodeFragment[] for display                                 │
│   ❌ Shows initial metrics, not live progress                               │
│   ❌ Analytics can't aggregate (wrong format)                               │
│                                                                             │
│   GAP: Sees stale data; format doesn't match analytics needs                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Recommended Unified Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Parse                                                              │
│   Script → Chevrotain → CodeStatement[fragments]                            │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Phase 2: Compile Fragments                                                  │
│   FragmentCompilationManager.compileStatementFragments(stmt, runtime)       │
│   → RuntimeMetric { exerciseId, values[], timeSpans }                       │
│                                                                             │
│   CHANGE: Strategies MUST use this, not manual extraction                   │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Phase 3: Create Block with Pre-compiled Metrics                             │
│   strategy.compile(statements, runtime)                                     │
│   → Block with block.compiledMetrics = compiledMetric                       │
│                                                                             │
│   CHANGE: Pass compiled metrics to block constructor                        │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Phase 4: Stack Push Uses Block Metrics                                      │
│   stack.push(block)                                                         │
│   → ExecutionRecord.metrics = block.compiledMetrics                         │
│                                                                             │
│   CHANGE: No regex parsing; use block's pre-compiled metrics                │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Phase 5: Live Updates Sync to ExecutionRecord                               │
│   block.updateMetrics()                                                     │
│   → Updates ExecutionRecord.metrics in memory                               │
│   → MetricCollector.collect() for analytics                                 │
│                                                                             │
│   CHANGE: Live updates reflected in execution log                           │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Phase 6: UI Display                                                         │
│   RuntimeHistoryPanel: metricsToFragments() for badges                      │
│   AnalyticsLayout: aggregateMetrics() for graphs                            │
│                                                                             │
│   RESULT: Consistent data, live updates, proper aggregation                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Action Items

### High Priority

1. **Unify Fragment Compilation**
   - Strategies should use `FragmentCompilationManager.compileStatementFragments()`
   - Remove manual fragment extraction from strategies
   - Pass compiled metrics to block constructors

2. **Remove Label Re-parsing**
   - Stack push should use `block.compiledMetrics` instead of regex
   - Add `compiledMetrics: RuntimeMetric` to block interface

3. **Sync Live Updates to ExecutionRecord**
   - `EffortBlock.updateMetrics()` should update its ExecutionRecord
   - Or: UI queries both ExecutionRecord and METRICS_CURRENT

### Medium Priority

4. **Extract Shared Utilities**
   - Move `metricsToFragments()` to shared module
   - Create `aggregateMetrics()` utility for analytics

5. **Add Depth/Lane to ExecutionRecord**
   - Compute hierarchy depth at creation time
   - Eliminates per-view recalculation

### Low Priority

6. **Integrate MetricCollector**
   - Wire into execution flow
   - Use for post-workout analytics aggregation

7. **Unify ID Types**
   - Decide on string vs numeric IDs
   - Remove hashCode conversions

