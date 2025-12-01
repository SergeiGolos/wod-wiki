# Unified Execution & Metrics System

**Date**: December 2025  
**Status**: Design Proposal  
**Consolidates**: `Metrics_Collection.md`, `walkthrough-metrics-collection.md`, `refactor-metrics-memory.md`, `Metrics_Implementation_Plan.md`

---

## Problem Statement

The current codebase has **three overlapping concepts** for tracking workout execution:

| Concept | Purpose | Location | Issues |
|---------|---------|----------|--------|
| **ExecutionRecord** | Tracks block lifecycle (start/end/status) | `RuntimeMemory` as `execution-record` type | Contains `metrics: RuntimeMetric[]` but poorly integrated |
| **ExecutionLogger** | Creates/finalizes ExecutionRecords | `ExecutionLogger.ts` | Separate from metric collection |
| **MetricCollector** | Collects `RuntimeMetric` globally | `runtime.metrics` | Not tied to execution spans |

### Symptoms

1. **Metrics detached from spans**: `EmitMetricAction` writes to global `MetricCollector` but doesn't reliably attach metrics to the active `ExecutionRecord`
2. **Duplicate data models**: `RuntimeMetric` vs `ExecutionRecord.metrics` vs `MetricCollector` storage
3. **UI confusion**: `RuntimeHistoryPanel` shows execution records with empty/stale metrics
4. **Polling vs subscriptions**: `useExecutionLog` polls every 100ms instead of reactive subscriptions
5. **No timestamp grouping**: Cannot correlate metrics to specific time windows within a block's execution

---

## Proposed Architecture: Unified Execution Span

### Core Concept: ExecutionSpan

Merge `ExecutionRecord` and runtime metric collection into a single **ExecutionSpan** that owns all data for a block's execution lifecycle.

```typescript
/**
 * ExecutionSpan - The single source of truth for a block's execution
 * 
 * Replaces: ExecutionRecord, MetricCollector entries for individual blocks
 */
export interface ExecutionSpan {
  // === Identity ===
  id: string;                    // Unique span ID (timestamp-blockId)
  blockId: string;               // Block key as string
  parentSpanId: string | null;   // Links to parent ExecutionSpan.id (not block ID)
  
  // === Classification ===
  type: SpanType;                // 'timer' | 'rounds' | 'effort' | 'group' | 'interval'
  label: string;                 // Human-readable: "21-15-9", "10 Burpees", "5:00"
  
  // === Lifecycle ===
  status: SpanStatus;            // 'active' | 'completed' | 'failed' | 'skipped'
  startTime: number;             // Unix timestamp ms
  endTime?: number;              // Unix timestamp ms (undefined while active)
  
  // === Metrics (NEW: Unified) ===
  metrics: SpanMetrics;          // All metrics for this span
  
  // === Time Segments (NEW: Timestamp groupings) ===
  segments: TimeSegment[];       // Sub-spans for detailed tracking
}

export type SpanType = 'timer' | 'rounds' | 'effort' | 'group' | 'interval' | 'emom' | 'amrap';
export type SpanStatus = 'active' | 'completed' | 'failed' | 'skipped';
```

### SpanMetrics: Unified Metric Container

```typescript
/**
 * SpanMetrics - All metric data for a single ExecutionSpan
 * 
 * Replaces: RuntimeMetric[] scattered across multiple collectors
 */
export interface SpanMetrics {
  // === Exercise Identity ===
  exerciseId?: string;           // Exercise name/ID if this is an effort span
  exerciseImage?: string;        // Thumbnail for UI display
  
  // === Repetition Metrics ===
  reps?: MetricValue<number>;    // { value: 21, unit: 'reps', recorded: timestamp }
  targetReps?: number;           // Goal reps (for progress calculation)
  
  // === Resistance Metrics ===
  weight?: MetricValue<number>;  // { value: 135, unit: 'lb', recorded: timestamp }
  
  // === Distance Metrics ===
  distance?: MetricValue<number>; // { value: 400, unit: 'm', recorded: timestamp }
  
  // === Time Metrics ===
  duration?: MetricValue<number>; // { value: 300000, unit: 'ms', recorded: timestamp }
  elapsed?: MetricValue<number>;  // Running total (for count-up timers)
  
  // === Round Metrics ===
  currentRound?: number;          // Current round number
  totalRounds?: number;           // Total rounds in set
  repScheme?: number[];           // [21, 15, 9] for descending rep workouts
  
  // === Extensible Metrics ===
  custom: Map<string, MetricValue<unknown>>; // For future metrics (HR, power, etc.)
}

/**
 * MetricValue - A single metric with timestamp
 */
export interface MetricValue<T> {
  value: T;
  unit: string;
  recorded: number;              // When this value was recorded
  source?: string;               // Which behavior/action recorded it
}
```

### TimeSegment: Timestamp Groupings

```typescript
/**
 * TimeSegment - A time-bounded subdivision of an ExecutionSpan
 * 
 * Use cases:
 * - EMOM: Each minute is a segment
 * - Rounds: Each round is a segment  
 * - Rest periods: Rest vs work segments
 * - Pauses: Track pause/resume within a span
 */
export interface TimeSegment {
  id: string;
  parentSpanId: string;
  
  // === Time Bounds ===
  startTime: number;
  endTime?: number;
  
  // === Classification ===
  type: SegmentType;             // 'work' | 'rest' | 'round' | 'minute' | 'pause'
  label: string;                 // "Round 1", "Minute 3", "Rest"
  index?: number;                // Position in sequence (0-based)
  
  // === Metrics Recorded During This Segment ===
  metrics: Partial<SpanMetrics>; // Only metrics recorded during this time window
}

export type SegmentType = 'work' | 'rest' | 'round' | 'minute' | 'pause' | 'transition';
```

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RuntimeStack                                  │
│  push(block) ──────────────────────────────────────────────────────►│
│  pop() ◄────────────────────────────────────────────────────────────│
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ExecutionTracker (NEW)                           │
│  - startSpan(block, parentSpanId) → ExecutionSpan                   │
│  - endSpan(blockId, status)                                         │
│  - recordMetric(blockId, metricType, value)                         │
│  - startSegment(blockId, type, label)                               │
│  - endSegment(blockId, segmentId)                                   │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    RuntimeMemory                                     │
│  Type: 'execution-span'                                              │
│  - allocate<ExecutionSpan>('execution-span', blockId, span)         │
│  - set(ref, updatedSpan)                                            │
│  - search({ type: 'execution-span', ... })                          │
│  - subscribe(callback) → reactive updates                           │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  useExecutionSpans (Hook)                           │
│  - Subscribes to memory changes (no polling!)                       │
│  - Returns { active: ExecutionSpan[], completed: ExecutionSpan[] }  │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    UI Components                                     │
│  RuntimeHistoryPanel ── shows spans with metrics                    │
│  AnalyticsLayout ────── timeline visualization                      │
│  MetricsTreeView ────── hierarchical span display                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Core Data Model (Priority: Critical)

#### 1.1 Create ExecutionSpan interfaces
**File**: `src/runtime/models/ExecutionSpan.ts` (NEW)

```typescript
// All interfaces defined above
export interface ExecutionSpan { ... }
export interface SpanMetrics { ... }
export interface TimeSegment { ... }
export interface MetricValue<T> { ... }
```

#### 1.2 Create ExecutionTracker service
**File**: `src/runtime/ExecutionTracker.ts` (NEW)

Replaces `ExecutionLogger` with unified tracking:

```typescript
export class ExecutionTracker {
  constructor(private readonly memory: IRuntimeMemory) {}

  /**
   * Start tracking a block's execution
   */
  startSpan(
    block: IRuntimeBlock,
    parentSpanId: string | null
  ): ExecutionSpan {
    const span: ExecutionSpan = {
      id: `${Date.now()}-${block.key.toString()}`,
      blockId: block.key.toString(),
      parentSpanId,
      type: this.resolveSpanType(block.blockType),
      label: block.label,
      status: 'active',
      startTime: Date.now(),
      metrics: { custom: new Map() },
      segments: []
    };
    
    this.memory.allocate<ExecutionSpan>(
      'execution-span',
      span.blockId,
      span,
      'public'
    );
    
    return span;
  }

  /**
   * Record a metric value for the active span
   */
  recordMetric<T>(
    blockId: string,
    metricKey: keyof SpanMetrics | string,
    value: T,
    unit: string,
    source?: string
  ): void {
    const span = this.getActiveSpan(blockId);
    if (!span) return;
    
    const metricValue: MetricValue<T> = {
      value,
      unit,
      recorded: Date.now(),
      source
    };
    
    // Update span metrics
    if (this.isKnownMetric(metricKey)) {
      (span.metrics as any)[metricKey] = metricValue;
    } else {
      span.metrics.custom.set(metricKey, metricValue);
    }
    
    // Also record to active segment if one exists
    const activeSegment = span.segments.find(s => !s.endTime);
    if (activeSegment) {
      if (!activeSegment.metrics) activeSegment.metrics = {};
      (activeSegment.metrics as any)[metricKey] = metricValue;
    }
    
    this.updateSpan(span);
  }

  /**
   * Start a time segment within a span (for EMOM minutes, rounds, etc.)
   */
  startSegment(
    blockId: string,
    type: SegmentType,
    label: string,
    index?: number
  ): TimeSegment {
    const span = this.getActiveSpan(blockId);
    if (!span) throw new Error(`No active span for block ${blockId}`);
    
    const segment: TimeSegment = {
      id: `${span.id}-seg-${span.segments.length}`,
      parentSpanId: span.id,
      startTime: Date.now(),
      type,
      label,
      index,
      metrics: {}
    };
    
    span.segments.push(segment);
    this.updateSpan(span);
    
    return segment;
  }

  /**
   * End a time segment
   */
  endSegment(blockId: string, segmentId?: string): void {
    const span = this.getActiveSpan(blockId);
    if (!span) return;
    
    const segment = segmentId 
      ? span.segments.find(s => s.id === segmentId)
      : span.segments.find(s => !s.endTime);
      
    if (segment) {
      segment.endTime = Date.now();
      this.updateSpan(span);
    }
  }

  /**
   * Complete a span's execution
   */
  endSpan(blockId: string, status: SpanStatus = 'completed'): void {
    const refs = this.memory.search({
      type: 'execution-span',
      ownerId: blockId,
      id: null,
      visibility: null
    });
    
    if (refs.length > 0) {
      const ref = refs[0] as TypedMemoryReference<ExecutionSpan>;
      const span = this.memory.get(ref);
      
      if (span && span.status === 'active') {
        // End any open segments
        span.segments.forEach(seg => {
          if (!seg.endTime) seg.endTime = Date.now();
        });
        
        span.endTime = Date.now();
        span.status = status;
        
        // Calculate duration metric if not set
        if (!span.metrics.duration) {
          span.metrics.duration = {
            value: span.endTime - span.startTime,
            unit: 'ms',
            recorded: span.endTime
          };
        }
        
        this.memory.set(ref, span);
      }
    }
  }

  // ... helper methods
}
```

### Phase 2: Action Integration (Priority: High)

#### 2.1 Update EmitMetricAction
**File**: `src/runtime/actions/EmitMetricAction.ts`

```typescript
export class EmitMetricAction implements IRuntimeAction {
  constructor(
    private readonly metricKey: string,
    private readonly value: unknown,
    private readonly unit: string,
    private readonly source?: string
  ) {}

  do(runtime: IScriptRuntime): void {
    const currentBlock = runtime.stack.current;
    if (!currentBlock) return;
    
    // Record to ExecutionTracker (unified)
    runtime.executionTracker.recordMetric(
      currentBlock.key.toString(),
      this.metricKey,
      this.value,
      this.unit,
      this.source
    );
    
    // Backward compatibility: also emit to global collector
    if (runtime.metrics) {
      runtime.metrics.collect({
        exerciseId: this.source ?? 'unknown',
        values: [{
          type: this.metricKey,
          value: this.value as number,
          unit: this.unit
        }],
        timeSpans: []
      });
    }
  }
}
```

#### 2.2 New Segment Actions
**File**: `src/runtime/actions/SegmentActions.ts` (NEW)

```typescript
export class StartSegmentAction implements IRuntimeAction {
  constructor(
    private readonly type: SegmentType,
    private readonly label: string,
    private readonly index?: number
  ) {}

  do(runtime: IScriptRuntime): void {
    const currentBlock = runtime.stack.current;
    if (currentBlock) {
      runtime.executionTracker.startSegment(
        currentBlock.key.toString(),
        this.type,
        this.label,
        this.index
      );
    }
  }
}

export class EndSegmentAction implements IRuntimeAction {
  constructor(private readonly segmentId?: string) {}

  do(runtime: IScriptRuntime): void {
    const currentBlock = runtime.stack.current;
    if (currentBlock) {
      runtime.executionTracker.endSegment(
        currentBlock.key.toString(),
        this.segmentId
      );
    }
  }
}
```

### Phase 3: Block Integration (Priority: High)

#### 3.1 RoundsBlock - Emit Round Segments

```typescript
// In RoundsBlock or RoundsBehavior

// When round starts:
actions.push(new StartSegmentAction('round', `Round ${roundNumber}`, roundNumber - 1));

// When round ends:
actions.push(new EndSegmentAction());
actions.push(new EmitMetricAction('currentRound', roundNumber, 'round', 'RoundsBlock'));
```

#### 3.2 IntervalBlock (EMOM) - Emit Minute Segments

```typescript
// In IntervalBlock or IntervalBehavior

// When minute starts:
actions.push(new StartSegmentAction('minute', `Minute ${minuteNumber}`, minuteNumber - 1));

// When minute ends:
actions.push(new EndSegmentAction());
```

#### 3.3 EffortBlock - Emit Effort Metrics

```typescript
// In EffortBlock or CompletionBehavior

// When rep completed:
actions.push(new EmitMetricAction('reps', currentReps, 'reps', exerciseName));

// When effort completed:
actions.push(new EmitMetricAction('reps', targetReps, 'reps', exerciseName));
```

### Phase 4: UI Integration (Priority: Medium)

#### 4.1 New useExecutionSpans Hook
**File**: `src/clock/hooks/useExecutionSpans.ts` (NEW)

```typescript
export interface ExecutionSpansData {
  active: ExecutionSpan[];
  completed: ExecutionSpan[];
  byId: Map<string, ExecutionSpan>;
}

export function useExecutionSpans(runtime: IScriptRuntime | null): ExecutionSpansData {
  const [data, setData] = useState<ExecutionSpansData>({
    active: [],
    completed: [],
    byId: new Map()
  });

  useEffect(() => {
    if (!runtime?.memory) {
      setData({ active: [], completed: [], byId: new Map() });
      return;
    }

    const updateData = () => {
      const refs = runtime.memory.search({
        type: 'execution-span',
        id: null,
        ownerId: null,
        visibility: null
      });
      
      const spans = refs
        .map(ref => runtime.memory.get(ref as TypedMemoryReference<ExecutionSpan>))
        .filter((s): s is ExecutionSpan => s !== null);
      
      const active = spans.filter(s => s.status === 'active');
      const completed = spans.filter(s => s.status !== 'active');
      const byId = new Map(spans.map(s => [s.id, s]));
      
      setData({ active, completed, byId });
    };

    // Initial load
    updateData();

    // Subscribe to memory changes (reactive, no polling!)
    const unsubscribe = runtime.memory.subscribe((change) => {
      if (change.type === 'execution-span') {
        updateData();
      }
    });

    return unsubscribe;
  }, [runtime]);

  return data;
}
```

#### 4.2 Update RuntimeHistoryPanel
**File**: `src/components/workout/RuntimeHistoryPanel.tsx`

```typescript
// Replace useExecutionLog with useExecutionSpans
const { active, completed, byId } = useExecutionSpans(runtime);

// Convert ExecutionSpan to MetricItem
function spanToItem(span: ExecutionSpan, lane: number): MetricItem {
  const isActive = span.status === 'active';
  
  return {
    id: span.id,
    icon: isActive ? Play : getIconForType(span.type),
    iconClassName: isActive ? 'animate-pulse' : '',
    title: span.label,
    tags: renderSpanMetrics(span.metrics),  // NEW: Rich metric display
    footer: renderSegmentSummary(span.segments), // NEW: Segment info
    lane,
    startTime: span.startTime,
    endTime: span.endTime
  };
}

// NEW: Render metrics as visual fragments
function renderSpanMetrics(metrics: SpanMetrics): React.ReactNode {
  const fragments: ICodeFragment[] = [];
  
  if (metrics.reps) {
    fragments.push({
      type: 'reps',
      fragmentType: FragmentType.Rep,
      value: metrics.reps.value,
      image: `${metrics.reps.value} ${metrics.reps.unit}`
    });
  }
  
  if (metrics.weight) {
    fragments.push({
      type: 'weight',
      fragmentType: FragmentType.Resistance,
      value: metrics.weight.value,
      image: `${metrics.weight.value} ${metrics.weight.unit}`
    });
  }
  
  // ... other metrics
  
  return <FragmentVisualizer fragments={fragments} />;
}

// NEW: Show segment summary (e.g., "3/5 rounds", "Minute 4")
function renderSegmentSummary(segments: TimeSegment[]): string | undefined {
  if (segments.length === 0) return undefined;
  
  const completed = segments.filter(s => s.endTime).length;
  const total = segments.length;
  const lastSegment = segments[segments.length - 1];
  
  if (lastSegment.type === 'round') {
    return `Round ${completed}/${total}`;
  }
  if (lastSegment.type === 'minute') {
    return `Minute ${completed}`;
  }
  
  return undefined;
}
```

### Phase 5: Migration & Cleanup (Priority: Low)

#### 5.1 Deprecate Old Types
- Mark `ExecutionRecord` as `@deprecated`
- Mark `ExecutionLogger` as `@deprecated`
- Update `useExecutionLog` to wrap `useExecutionSpans` for backward compatibility

#### 5.2 Remove Redundant Code
- Remove polling from `useExecutionLog`
- Remove duplicate metric storage in `MetricCollector`
- Consolidate `metricsToFragments.ts` to use `SpanMetrics`

---

## Benefits

| Before | After |
|--------|-------|
| `ExecutionRecord` + `MetricCollector` + `RuntimeMetric` | Single `ExecutionSpan` |
| Metrics detached from execution spans | Metrics always tied to spans |
| Polling every 100ms | Reactive memory subscriptions |
| No timestamp grouping | `TimeSegment` for rounds/minutes/etc |
| Flat execution history | Hierarchical via `parentSpanId` |
| Type field as string | `SpanType` enum |
| Status field as string | `SpanStatus` enum |

---

## UI Display Mapping

### RuntimeHistoryPanel Display Logic

| SpanType | Icon | Display Format | Metrics Shown |
|----------|------|----------------|---------------|
| `timer` | Clock | "20:00" or "For Time" | duration, elapsed |
| `rounds` | RotateCw | "3 Rounds" or "21-15-9" | currentRound, totalRounds |
| `effort` | Activity | "10 Burpees" | reps, weight, distance |
| `interval` | Timer | "EMOM 12" | segment count |
| `amrap` | Zap | "AMRAP 20" | duration, reps |

### Segment Display

| SegmentType | When Created | Example Label |
|-------------|--------------|---------------|
| `round` | RoundsBlock increments round | "Round 1", "Round 2" |
| `minute` | EMOM minute boundary | "Minute 1", "Minute 5" |
| `work` | Work period starts | "Work" |
| `rest` | Rest period starts | "Rest 1:00" |
| `pause` | User pauses workout | "Paused" |

---

## Testing Strategy

### Unit Tests

```typescript
describe('ExecutionTracker', () => {
  it('should create span on startSpan', () => {
    tracker.startSpan(mockBlock, null);
    const spans = memory.search({ type: 'execution-span' });
    expect(spans.length).toBe(1);
  });

  it('should record metrics to active span', () => {
    tracker.startSpan(mockBlock, null);
    tracker.recordMetric('block-1', 'reps', 10, 'reps', 'test');
    
    const span = tracker.getActiveSpan('block-1');
    expect(span?.metrics.reps?.value).toBe(10);
  });

  it('should track segments within span', () => {
    tracker.startSpan(mockBlock, null);
    tracker.startSegment('block-1', 'round', 'Round 1', 0);
    tracker.recordMetric('block-1', 'reps', 5, 'reps');
    tracker.endSegment('block-1');
    
    const span = tracker.getActiveSpan('block-1');
    expect(span?.segments.length).toBe(1);
    expect(span?.segments[0].metrics?.reps?.value).toBe(5);
  });

  it('should maintain parent-child hierarchy', () => {
    const parentSpan = tracker.startSpan(parentBlock, null);
    const childSpan = tracker.startSpan(childBlock, parentSpan.id);
    
    expect(childSpan.parentSpanId).toBe(parentSpan.id);
  });
});
```

### Storybook Stories

Create stories demonstrating:
1. Basic span lifecycle (start → metrics → end)
2. Round tracking with segments
3. EMOM with minute segments
4. Nested spans (Timer > Rounds > Effort)
5. Real-time metric updates in UI

---

## Migration Path

### Step 1: Add New Types (Non-breaking)
- Create `ExecutionSpan`, `SpanMetrics`, `TimeSegment` interfaces
- Create `ExecutionTracker` service
- Add `executionTracker` to `ScriptRuntime`

### Step 2: Dual-Write (Transitional)
- `ExecutionTracker.startSpan()` also calls `ExecutionLogger.startExecution()`
- Both systems receive same data
- UI can use either hook

### Step 3: Migrate UI (Incremental)
- Update `RuntimeHistoryPanel` to use `useExecutionSpans`
- Update `AnalyticsLayout` to use `ExecutionSpan`
- Verify visual parity

### Step 4: Remove Old Code (Cleanup)
- Remove `ExecutionLogger`
- Remove `ExecutionRecord` (or alias to `ExecutionSpan`)
- Remove polling from hooks

---

## Open Questions

1. **Segment Granularity**: Should every rep be a segment, or only meaningful boundaries (rounds, minutes)?
   - **Recommendation**: Segments for rounds/minutes only; reps as metrics

2. **Memory Pressure**: How to handle very long workouts (1000+ spans)?
   - **Recommendation**: Implement configurable max span count, archive completed spans

3. **Backward Compatibility**: How long to maintain dual-write?
   - **Recommendation**: 2 releases, then remove old code

4. **Persistence**: Should spans be persisted to localStorage?
   - **Recommendation**: Yes, with opt-in flag for analytics features
