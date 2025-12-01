# Log View Record Types Analysis

## Overview

This document provides a detailed analysis of the record types created by the runtime logging system, how they appear in the log view, and the parent-child event ordering that governs their creation.

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
