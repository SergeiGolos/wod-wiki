# Execution Record Categories Design Document

## Overview

This document outlines a categorization system for RuntimeBlock execution results to improve tracking, display, and analytics. All blocks generate one of three high-level record categories, each with distinct purposes and behaviors.

---

## Record Categories

### 1. Timestamp

**Purpose**: Zero-duration point-in-time events

**Characteristics**:
- `startTime === endTime` (same moment)
- Duration is always 0ms
- No child records
- Typically triggered by explicit actions

**Use Cases**:
- Workout started marker
- Workout completed marker
- Exercise progression markers (e.g., "Started Round 2")
- User-triggered events (e.g., "Paused", "Resumed")
- Achievement milestones (e.g., "PR Achieved!")
- Segment transitions

**Schema Extension**:
```typescript
interface TimestampRecord {
  category: 'timestamp';
  
  // Required fields
  id: string;
  timestamp: number;        // Single point in time
  label: string;            // Human-readable label
  
  // Optional context
  blockId?: string;         // Associated block if any
  parentSpanId?: string;    // Parent context
  eventType: TimestampEventType;
  metadata?: Record<string, unknown>;
}

type TimestampEventType =
  | 'workout:start'
  | 'workout:complete'
  | 'round:start'
  | 'round:complete'
  | 'interval:start'
  | 'interval:complete'
  | 'pause'
  | 'resume'
  | 'milestone'
  | 'custom';
```

**Display Behavior**:
- Rendered as markers/pins on timeline views
- Shown as divider rows in log views
- Does not contribute to aggregated duration calculations
- Icon-based presentation (🏁, ⏸️, ▶️, 🎯)

---

### 2. Group

**Purpose**: Container for child runtime blocks with hierarchical metadata

**Characteristics**:
- Has `startTime` and `endTime` (non-zero duration)
- Contains nested child records
- Holds round/index/loop information
- Does NOT generate actionable metrics itself
- Metrics are aggregated FROM children

**Use Cases**:
- Rounds block (e.g., "3 Rounds")
- EMOM parent (e.g., "EMOM 10")
- AMRAP parent (e.g., "12 min AMRAP")
- Rep scheme blocks (e.g., "21-15-9")
- Root workout container

**Key Properties**:
- Round information: `currentRound`, `totalRounds`, `repScheme`
- Index tracking: `position`, `index`
- Loop state: `loopType`, `isComplete`
- Child accumulation: derived duration, total reps across children

**Schema Extension**:
```typescript
interface GroupRecord {
  category: 'group';
  
  // Required fields
  id: string;
  blockId: string;
  startTime: number;
  endTime?: number;
  label: string;
  
  // Group-specific metadata
  groupType: GroupType;
  childIds: string[];       // References to child records
  
  // Loop/Round tracking
  loopState?: {
    index: number;          // Total advancements
    position: number;       // Current position in childGroups
    currentRound: number;   // 1-indexed round number
    totalRounds: number;
    repScheme?: number[];
    loopType: LoopType;
  };
  
  // Aggregated from children (read-only, computed)
  aggregated?: {
    totalDuration: number;
    totalReps: number;
    childCount: number;
    completedChildren: number;
  };
}

type GroupType =
  | 'root'
  | 'rounds'
  | 'interval'
  | 'emom'
  | 'amrap'
  | 'tabata'
  | 'custom';
```

**Display Behavior**:
- Rendered as collapsible containers in log views
- Shown as segments/bands on timeline views
- Header shows round/index info prominently
- Child metrics are summarized but NOT duplicated

---

### 3. Record

**Purpose**: Actionable execution with tracked metrics

**Characteristics**:
- Has `startTime` and `endTime`
- Contains actual metrics from execution
- Always a leaf node (no children)
- Metrics are recorded on pop (automatic)
- Additional metrics can be recorded during execution

**Use Cases**:
- Individual exercises (e.g., "10 Pushups")
- Timed segments (e.g., "30s rest")
- Effort blocks with tracked reps/weight/distance
- Any block with measurable outputs

**Key Properties**:
- Exercise identity: `exerciseId`, `exerciseImage`
- Completed metrics: `reps`, `weight`, `distance`, `calories`
- Time metrics: `duration`, `elapsed`, `remaining`
- Source tracking: `blockId`, `sourceIds`

**Schema Extension**:
```typescript
interface MetricRecord {
  category: 'record';
  
  // Required fields
  id: string;
  blockId: string;
  startTime: number;
  endTime: number;          // Required for records
  label: string;
  
  // Record-specific metadata
  recordType: RecordType;
  
  // Metrics (fully populated on pop)
  metrics: {
    exerciseId?: string;
    reps?: MetricValueWithTimestamp<number>;
    targetReps?: number;
    weight?: MetricValueWithTimestamp<number>;
    distance?: MetricValueWithTimestamp<number>;
    duration?: MetricValueWithTimestamp<number>;
    calories?: MetricValueWithTimestamp<number>;
    // Biometrics (optional, from sensors)
    heartRate?: MetricValueWithTimestamp<number>;
    power?: MetricValueWithTimestamp<number>;
    cadence?: MetricValueWithTimestamp<number>;
    // Extensibility
    custom?: Map<string, MetricValueWithTimestamp<unknown>>;
  };
  
  // Source reference for highlighting
  sourceIds: number[];
  
  // Fragment visualization data
  fragments?: ICodeFragment[];
  compiledMetrics?: RuntimeMetric;
}

type RecordType =
  | 'effort'
  | 'timer'
  | 'rest'
  | 'transition'
  | 'custom';
```

**Display Behavior**:
- Full metric card in log views
- Colored segment on timeline views
- Individual row in analytics tables
- Highlights corresponding source code

---

## Unified ExecutionEntry Interface

To support all three categories while maintaining type safety:

```typescript
/**
 * Discriminated union for all execution entry types
 */
type ExecutionEntry = 
  | TimestampRecord 
  | GroupRecord 
  | MetricRecord;

/**
 * Type guard functions
 */
function isTimestamp(entry: ExecutionEntry): entry is TimestampRecord {
  return entry.category === 'timestamp';
}

function isGroup(entry: ExecutionEntry): entry is GroupRecord {
  return entry.category === 'group';
}

function isRecord(entry: ExecutionEntry): entry is MetricRecord {
  return entry.category === 'record';
}

/**
 * Check if an entry has actionable metrics
 */
function hasMetrics(entry: ExecutionEntry): entry is MetricRecord {
  return entry.category === 'record';
}
```

---

## Automatic vs Manual Recording

### Automatic (On Pop)

All leaf blocks automatically record their metrics when popped from the stack:

```typescript
// In RuntimeStack.pop()
if (isLeafBlock(currentBlock)) {
  const record = createMetricRecord(currentBlock, completedAt);
  tracker.recordEntry(record);
}

// In HistoryBehavior.onPop()
onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  // Metrics automatically captured from block.compiledMetrics
  // Duration calculated from startTime to now
  // Entry category determined by block type
  
  const entry = this.buildExecutionEntry(block);
  this.updateSpanFromEntry(runtime, entry);
  
  return [];
}
```

### Manual (Actions)

Timestamps and additional records can be created at any point via actions:

```typescript
/**
 * Action to create a timestamp entry
 */
export class CreateTimestampAction implements IRuntimeAction {
  constructor(
    private readonly eventType: TimestampEventType,
    private readonly label: string,
    private readonly metadata?: Record<string, unknown>
  ) {}

  do(runtime: IScriptRuntime): void {
    const timestamp: TimestampRecord = {
      category: 'timestamp',
      id: `ts-${Date.now()}-${crypto.randomUUID()}`,
      timestamp: Date.now(),
      label: this.label,
      eventType: this.eventType,
      blockId: runtime.stack.current?.key.toString(),
      parentSpanId: this.getParentSpanId(runtime),
      metadata: this.metadata
    };
    
    runtime.tracker.recordEntry(timestamp);
  }
}

// Usage examples
new CreateTimestampAction('round:start', 'Round 2 Started');
new CreateTimestampAction('milestone', 'Personal Record!', { previousBest: 10, newRecord: 12 });
new CreateTimestampAction('pause', 'Workout Paused');
```

---

## Block Type → Category Mapping

| Block Type / Behavior | Default Category | Can Create Timestamps? |
|----------------------|------------------|------------------------|
| EffortBlock          | `record`         | Yes                    |
| TimerBlock (leaf)     | `record`         | Yes                    |
| RoundsBlock          | `group`          | Yes (round transitions)|
| IntervalBlock (EMOM) | `group`          | Yes (interval markers) |
| IdleBlock            | `record` or skip | Yes (start/finish)     |
| RootBlock            | `group`          | Yes (workout lifecycle)|

---

## Determining Category at Runtime

The category is determined by examining block structure and behaviors:

```typescript
function determineCategory(block: IRuntimeBlock): 'timestamp' | 'group' | 'record' {
  // Special case: explicit timestamp events
  // (handled via CreateTimestampAction, not block categorization)
  
  // Groups: blocks with LoopCoordinatorBehavior and children
  const hasLoopCoordinator = block.getBehavior(LoopCoordinatorBehavior);
  if (hasLoopCoordinator) {
    return 'group';
  }
  
  // Groups: root blocks
  const hasRootLifecycle = block.getBehavior(RootLifecycleBehavior);
  if (hasRootLifecycle) {
    return 'group';
  }
  
  // Records: everything else (leaf blocks with metrics)
  return 'record';
}
```

---

## UI Display Matrix

| Category    | Log View            | Timeline View       | Analytics Table     |
|-------------|---------------------|---------------------|---------------------|
| `timestamp` | Divider/marker row  | Pin/marker          | Event row (minimal) |
| `group`     | Collapsible section | Band/segment        | Summary row only    |
| `record`    | Full metric card    | Colored segment     | Full data row       |

### Visual Examples

**Log View**:
```
🏁 Workout Started                          [timestamp]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▼ 21-15-9 (3 Rounds)                        [group]
  │  
  ├─▶ Round 1 Started                       [timestamp]
  │   ┌────────────────────────────────┐
  │   │ 21 Thrusters @ 95lb            │    [record]
  │   │ Duration: 1:23  |  Reps: 21    │
  │   └────────────────────────────────┘
  │   ┌────────────────────────────────┐
  │   │ 21 Pullups                     │    [record]
  │   │ Duration: 0:58  |  Reps: 21    │
  │   └────────────────────────────────┘
  │
  ├─▶ Round 2 Started                       [timestamp]
  │   ...
```

**Timeline View**:
```
Time:  0:00    1:00    2:00    3:00    4:00    5:00
       |       |       |       |       |       |
       ┌───────────────────────────────────────┐
       │          21-15-9 (group)               │
       │ ┌─────┬─────┬─────┬─────┬─────┬─────┐ │
       │ │Trus │Pulls│Trus │Pulls│Trus │Pulls│ │
       │ └─────┴─────┴─────┴─────┴─────┴─────┘ │
       └───────────────────────────────────────┘
       🏁                 📍     📍     📍    🏆
       start         r2-start r3-start  complete
```

---

## Integration with ExecutionSpan

The new categories extend the existing `ExecutionSpan` model:

```typescript
interface ExecutionSpan {
  // Existing fields...
  id: string;
  blockId: string;
  parentSpanId: string | null;
  type: SpanType;
  label: string;
  status: SpanStatus;
  startTime: number;
  endTime?: number;
  metrics: SpanMetrics;
  segments: TimeSegment[];
  sourceIds?: number[];
  debugMetadata?: DebugMetadata;
  
  // NEW: Category discriminator
  category: 'timestamp' | 'group' | 'record';
  
  // NEW: Group-specific data (only for category === 'group')
  groupData?: {
    childIds: string[];
    loopState?: LoopState;
    aggregated?: AggregatedMetrics;
  };
  
  // NEW: Timestamp-specific data (only for category === 'timestamp')
  timestampData?: {
    eventType: TimestampEventType;
    isSinglePoint: true;
  };
}
```

---

## Migration Path

### Phase 1: Add Category Field
- Add `category` field to `ExecutionSpan` with default 'record'
- Update `createExecutionSpan` to accept category parameter
- Add type guards for runtime category checks

### Phase 2: Categorization Logic
- Update `HistoryBehavior` to determine category on span creation
- Update `LoopCoordinatorBehavior` to use 'group' category
- Add `CreateTimestampAction` for manual timestamp creation

### Phase 3: Automatic Recording
- Update `RuntimeStack.pop()` to ensure leaf blocks record metrics
- Add validation that 'record' entries have populated metrics
- Add aggregation logic for 'group' entries

### Phase 4: UI Updates
- Update `RuntimeEventLog` to render based on category
- Add collapsible groups in log view
- Add timestamp markers in timeline view
- Update analytics to filter by category

---

## Behavior Responsibilities

### HistoryBehavior Updates

```typescript
export class HistoryBehavior implements IRuntimeBehavior {
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    const category = this.determineCategory(block);
    
    const span: ExecutionSpan = {
      ...existingSpanCreation,
      category,
      ...(category === 'group' && {
        groupData: {
          childIds: [],
          loopState: this.getInitialLoopState(block),
        }
      }),
    };
    
    // Allocate span in memory
    runtime.memory.allocate(EXECUTION_SPAN_TYPE, block.key.toString(), span, 'public');
    
    return [];
  }
  
  onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    // Auto-record metrics for 'record' category
    const span = this.getSpan(runtime, block);
    if (span?.category === 'record') {
      this.recordFinalMetrics(runtime, block, span);
    }
    
    // For 'group', compute aggregations from children
    if (span?.category === 'group') {
      this.computeAggregations(runtime, span);
    }
    
    // Update span status to completed
    this.completeSpan(runtime, block);
    
    return [];
  }
  
  private determineCategory(block: IRuntimeBlock): 'group' | 'record' {
    if (block.getBehavior(LoopCoordinatorBehavior)) return 'group';
    if (block.getBehavior(RootLifecycleBehavior)) return 'group';
    return 'record';
  }
}
```

### LoopCoordinatorBehavior Updates

```typescript
export class LoopCoordinatorBehavior implements IRuntimeBehavior {
  private emitRoundChanged(runtime: IScriptRuntime, rounds: number, block: IRuntimeBlock): void {
    // Create timestamp for round transition
    const timestampAction = new CreateTimestampAction(
      'round:start',
      `Round ${rounds + 1} Started`,
      { roundIndex: rounds, totalRounds: this.config.totalRounds }
    );
    timestampAction.do(runtime);
    
    // Update parent group's loopState
    this.updateGroupLoopState(runtime, block, rounds);
    
    // Existing round logic...
  }
}
```

---

## Summary

| Category    | Duration | Children | Metrics | Auto-Record | Manual Create |
|-------------|----------|----------|---------|-------------|---------------|
| `timestamp` | 0ms      | No       | Minimal | No          | Yes (Action)  |
| `group`     | >0ms     | Yes      | Aggregated | No (container) | No        |
| `record`    | >0ms     | No       | Full    | Yes (on pop)| Yes (Action)  |

This categorization provides:
1. **Clear semantic separation** between point events, containers, and tracked executions
2. **Automatic metric recording** for leaf blocks without manual intervention
3. **Flexible timestamp creation** for marking important moments
4. **Proper aggregation** of group metrics from children
5. **Distinct UI rendering** appropriate to each category's nature
