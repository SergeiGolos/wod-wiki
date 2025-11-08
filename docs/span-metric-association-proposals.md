# Proposal: Span-Metric Association for Runtime Blocks

**Status**: Draft  
**Author**: System  
**Date**: 2025-11-08  
**Related**: Runtime Architecture, Metric Collection, Time Tracking

## Problem Statement

The current runtime architecture does not guarantee correct association between time spans collected by runtime blocks and the metrics being reported. This creates several issues:

1. **Rest Period Confusion**: When rest periods occur, the timer continues running but effort metrics should not be associated with that running time
2. **Multi-Span Ambiguity**: Pause/resume cycles create multiple time spans - metrics may be incorrectly associated with the wrong span
3. **Hierarchical Span Loss**: Parent blocks (Timer, Rounds) track time spans, but child blocks (Effort) don't know which parent span they're contributing to
4. **Timestamp Granularity**: Metrics lack precise timestamps showing exactly when values were recorded within a span

### Current Architecture Gaps

```typescript
// RuntimeMetric has timeSpans but no way to correlate with block execution state
interface RuntimeMetric {
  exerciseId: string;
  values: MetricValue[];
  timeSpans: TimeSpan[];  // ⚠️ Which spans? From which block? During rest or work?
}

// TimerBehavior tracks spans but doesn't propagate context to children
class TimerBehavior {
  private timeSpansRef?: TypedMemoryReference<TimeSpan[]>;  // ⚠️ No child visibility
}

// EffortBlock emits metrics but doesn't know about parent timer state
class EffortBlock {
  // ⚠️ No awareness of whether timer is in work vs rest phase
  private updateMemoryAndEmit(): void { }
}
```

---

## Proposal 1: Explicit Span Context with Unique Identifiers

### Overview
Add unique identifiers to time spans and propagate span context through the block hierarchy, allowing metrics to explicitly reference the active span during which they were recorded.

### Design

```typescript
// Enhanced TimeSpan with unique identifier and type classification
export interface TimeSpan {
  id: string;                          // Unique identifier (UUID)
  type: 'work' | 'rest' | 'transition'; // Explicit classification
  start: Date;
  stop?: Date;
  blockId: string;                      // Owner block
  parentSpanId?: string;                // Link to parent span for hierarchy
  metadata?: Record<string, any>;       // Exercise name, round number, etc.
}

// Enhanced RuntimeMetric with explicit span references
export interface RuntimeMetric {
  exerciseId: string;
  values: MetricValue[];
  spanIds: string[];                    // References to TimeSpan.id
  recordedAt: Date;                     // Exact recording timestamp
  blockId: string;                      // Source block
}

// New SpanContext service for propagation
export interface ISpanContext {
  getCurrentSpan(): TimeSpan | undefined;
  enterSpan(span: TimeSpan): void;
  exitSpan(spanId: string): void;
  getSpanById(spanId: string): TimeSpan | undefined;
  getActiveSpans(): TimeSpan[];
}
```

### Implementation Strategy

1. **Add SpanContext to IScriptRuntime**:
```typescript
export interface IScriptRuntime {
  // ... existing properties
  spanContext: ISpanContext;
}
```

2. **Update TimerBehavior to register spans**:
```typescript
onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  const span: TimeSpan = {
    id: generateUUID(),
    type: 'work',  // or 'rest' based on context
    start: new Date(),
    blockId: block.key.toString(),
    parentSpanId: runtime.spanContext.getCurrentSpan()?.id
  };
  
  runtime.spanContext.enterSpan(span);
  // ... rest of existing logic
}

onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  const currentSpan = runtime.spanContext.getCurrentSpan();
  if (currentSpan) {
    currentSpan.stop = new Date();
    runtime.spanContext.exitSpan(currentSpan.id);
  }
  // ... rest of existing logic
}
```

3. **Update EffortBlock to reference active spans**:
```typescript
private updateMemoryAndEmit(): void {
  const activeSpans = this._runtime.spanContext.getActiveSpans();
  const metric: RuntimeMetric = {
    exerciseId: this.config.exerciseName,
    values: [{ type: 'repetitions', value: this.currentReps, unit: 'reps' }],
    spanIds: activeSpans.map(s => s.id),
    recordedAt: new Date(),
    blockId: this.key.toString()
  };
  
  this._runtime.metrics.collect(metric);
}
```

### Pros
- Explicit, traceable associations between spans and metrics
- Supports hierarchical span relationships (parent/child)
- Enables filtering metrics by span type (work vs rest)
- Backward compatible via optional fields

### Cons
- Requires significant refactoring across multiple blocks
- Adds memory overhead for span tracking
- Increased complexity in runtime initialization

---

## Proposal 2: Rest-Aware Behavior Pattern

### Overview
Create a specialized `RestBehavior` that manages rest periods as first-class citizens, creating separate "rest spans" distinct from "work spans" and preventing metric emission during rest.

### Design

```typescript
// RestBehavior manages rest periods with explicit span typing
export class RestBehavior implements IRuntimeBehavior {
  private restSpanRef?: TypedMemoryReference<TimeSpan>;
  private isResting = false;
  
  constructor(private restDurationMs: number) {}
  
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    // Create rest span
    const restSpan: TimeSpan = {
      id: generateUUID(),
      type: 'rest',
      start: new Date(),
      blockId: block.key.toString(),
      metadata: { durationMs: this.restDurationMs }
    };
    
    this.restSpanRef = runtime.memory.allocate('rest-span', block.key.toString(), restSpan);
    this.isResting = true;
    
    return [new EmitEventAction({
      name: 'rest:started',
      timestamp: new Date(),
      data: { spanId: restSpan.id, durationMs: this.restDurationMs }
    })];
  }
  
  isInRestPeriod(): boolean {
    return this.isResting;
  }
}

// EffortBlock checks rest state before emitting metrics
class EffortBlock extends RuntimeBlock {
  private updateMemoryAndEmit(): void {
    // Check if parent block has active rest behavior
    const parentBlock = this._runtime.stack.getParent();
    const restBehavior = parentBlock?.getBehavior(RestBehavior);
    
    if (restBehavior?.isInRestPeriod()) {
      console.warn('⚠️ Ignoring metric emission during rest period');
      return;
    }
    
    // Normal metric emission
    this._runtime.handle({
      name: 'reps:updated',
      timestamp: new Date(),
      data: { /* ... */ }
    });
  }
}
```

### Configuration

```typescript
// Example: EMOM with explicit rest configuration
const config: TimerBlockConfig = {
  direction: 'up',
  durationMs: 60000,  // 1 minute
  workDurationMs: 40000,  // 40 seconds work
  restDurationMs: 20000,  // 20 seconds rest
  children: [/* effort blocks */]
};
```

### Pros
- Clear separation of work vs rest periods
- Prevents accidental metric emission during rest
- Can be added incrementally to specific workout types (EMOM, Tabata)
- Explicit in configuration and behavior

### Cons
- Requires changes to block configuration structures
- May not cover all rest scenarios (e.g., athlete-initiated rest)
- Adds another behavior to coordinate

---

## Proposal 3: Metric Capture Events with Span Snapshots

### Overview
Instead of storing span references, capture a snapshot of the active span state at the exact moment a metric is recorded. This creates an immutable, point-in-time association.

### Design

```typescript
// Enhanced MetricValue with capture context
export interface CapturedMetric {
  exerciseId: string;
  values: MetricValue[];
  captureContext: {
    timestamp: Date;
    spanSnapshot: {
      blockId: string;
      spanType: 'work' | 'rest' | 'transition';
      elapsedMs: number;           // Elapsed time in current span
      totalElapsedMs: number;       // Total elapsed across all spans
      roundNumber?: number;         // From RoundsBlock context
      parentTimer?: {
        blockId: string;
        elapsedMs: number;
        direction: 'up' | 'down';
      };
    };
  };
}

// Behavior-level capture coordination
export class MetricCaptureBehavior implements IRuntimeBehavior {
  onEvent(event: IEvent, runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    if (event.name === 'reps:updated') {
      // Capture span state at this exact moment
      const timerBehavior = block.getBehavior(TimerBehavior);
      const parentRounds = runtime.stack.getParent() as RoundsBlock | undefined;
      
      const capturedMetric: CapturedMetric = {
        exerciseId: event.data.exerciseName,
        values: [{ type: 'repetitions', value: event.data.currentReps, unit: 'reps' }],
        captureContext: {
          timestamp: new Date(),
          spanSnapshot: {
            blockId: block.key.toString(),
            spanType: this.determineSpanType(runtime, block),
            elapsedMs: timerBehavior?.getElapsedMs() || 0,
            totalElapsedMs: timerBehavior?.getTotalElapsed() || 0,
            roundNumber: parentRounds?.getCurrentRound(),
            parentTimer: this.captureParentTimer(runtime, block)
          }
        }
      };
      
      return [new EmitMetricAction(capturedMetric)];
    }
    return [];
  }
  
  private determineSpanType(runtime: IScriptRuntime, block: IRuntimeBlock): 'work' | 'rest' {
    // Check if RestBehavior is active in hierarchy
    const currentBlock = runtime.stack.current;
    const restBehavior = currentBlock?.getBehavior(RestBehavior);
    return restBehavior?.isInRestPeriod() ? 'rest' : 'work';
  }
}
```

### Pros
- Immutable, point-in-time associations
- Rich context captured with each metric
- No need for span ID lookups later
- Self-contained metric data

### Cons
- Increased storage per metric
- Potential duplication of span data
- Requires hierarchy traversal at capture time

---

## Proposal 4: Span-Scoped Memory References

### Overview
Extend the memory system to support span-scoped allocations, where memory references are automatically associated with the currently active span and are only visible during that span.

### Design

```typescript
// Enhanced memory allocation with span scoping
export interface IRuntimeMemory {
  // ... existing methods
  
  allocateScoped<T>(
    type: string,
    ownerId: string,
    initialValue?: T,
    scope: 'block' | 'span' = 'block'
  ): TypedMemoryReference<T>;
  
  getCurrentSpanId(): string | undefined;
  searchBySpan(spanId: string): IMemoryReference[];
}

// TimerBehavior creates span-scoped metrics
export class TimerBehavior implements IRuntimeBehavior {
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    const spanId = generateUUID();
    
    // Set current span context
    (runtime.memory as RuntimeMemory).setCurrentSpan(spanId);
    
    // Allocate span-scoped memory
    this.timeSpansRef = runtime.memory.allocateScoped(
      TIMER_MEMORY_TYPES.TIME_SPANS,
      block.key.toString(),
      [{ id: spanId, start: new Date(), type: 'work' }],
      'span'  // Scoped to current span
    );
    
    return [];
  }
}

// EffortBlock metrics automatically associated with active span
class EffortBlock extends RuntimeBlock {
  mount(runtime: IScriptRuntime): IRuntimeAction[] {
    // Metrics allocated in span scope inherit current span ID
    this.metricsRef = runtime.memory.allocateScoped(
      'effort-metrics',
      this.key.toString(),
      [],
      'span'  // Automatically tagged with current span
    );
    
    return super.mount(runtime);
  }
}

// Query metrics by span
const metricsInSpan = runtime.memory.searchBySpan(spanId);
```

### Pros
- Automatic span association through memory system
- Leverages existing memory infrastructure
- Clean separation of concerns
- Natural span lifecycle management

### Cons
- Requires significant memory system refactoring
- May complicate memory cleanup
- Potential performance impact on memory searches

---

## Proposal 5: Event-Driven Span Coordination

### Overview
Use the existing event system to broadcast span lifecycle events (start, stop, pause, resume) that child blocks can listen to and use to coordinate metric emission timing.

### Design

```typescript
// Span lifecycle events
export type SpanEvent = 
  | { name: 'span:started'; spanId: string; type: 'work' | 'rest'; blockId: string }
  | { name: 'span:stopped'; spanId: string; blockId: string }
  | { name: 'span:paused'; spanId: string; blockId: string }
  | { name: 'span:resumed'; spanId: string; blockId: string };

// TimerBehavior emits span events
export class TimerBehavior implements IRuntimeBehavior {
  private currentSpanId?: string;
  
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    this.currentSpanId = generateUUID();
    
    return [
      new EmitEventAction({
        name: 'span:started',
        timestamp: new Date(),
        data: {
          spanId: this.currentSpanId,
          type: 'work',
          blockId: block.key.toString()
        }
      })
    ];
  }
  
  pause(): void {
    if (this.currentSpanId && this._runtime) {
      this._runtime.handle({
        name: 'span:paused',
        timestamp: new Date(),
        data: { spanId: this.currentSpanId }
      });
    }
  }
}

// EffortBlock listens for span events and tracks active span
class EffortBlock extends RuntimeBlock {
  private activeSpanId?: string;
  
  mount(runtime: IScriptRuntime): IRuntimeAction[] {
    // Register span event handlers
    runtime.registerHandler({
      id: `effort-span-tracker-${this.key.toString()}`,
      name: 'span:started',
      handler: (event) => {
        this.activeSpanId = event.data.spanId;
        return [];
      }
    });
    
    runtime.registerHandler({
      id: `effort-span-stopped-${this.key.toString()}`,
      name: 'span:stopped',
      handler: (event) => {
        if (event.data.spanId === this.activeSpanId) {
          this.activeSpanId = undefined;
        }
        return [];
      }
    });
    
    return super.mount(runtime);
  }
  
  private updateMemoryAndEmit(): void {
    const metric: RuntimeMetric = {
      exerciseId: this.config.exerciseName,
      values: [{ type: 'repetitions', value: this.currentReps, unit: 'reps' }],
      spanIds: this.activeSpanId ? [this.activeSpanId] : [],
      recordedAt: new Date(),
      blockId: this.key.toString()
    };
    
    this._runtime.metrics.collect(metric);
  }
}
```

### Pros
- Uses existing event infrastructure
- Decoupled coordination between blocks
- Easy to add to existing blocks incrementally
- Supports multiple subscribers to span events

### Cons
- Event timing may not be perfectly synchronous
- Potential for missed events if handlers register late
- Debugging span state transitions may be complex

---

## Recommendation Matrix

| Proposal                     | Implementation Effort | Performance Impact | Backward Compatibility | Flexibility | Clarity   |
| ---------------------------- | --------------------- | ------------------ | ---------------------- | ----------- | --------- |
| 1. Explicit Span Context     | High                  | Medium             | Good                   | Excellent   | Excellent |
| 2. Rest-Aware Behavior       | Medium                | Low                | Excellent              | Good        | Excellent |
| 3. Metric Capture Snapshots  | Medium                | Medium             | Good                   | Good        | Good      |
| 4. Span-Scoped Memory        | High                  | Medium             | Medium                 | Excellent   | Medium    |
| 5. Event-Driven Coordination | Low                   | Low                | Excellent              | Good        | Good      |

## Recommended Approach: Hybrid Solution

Implement a combination of proposals for optimal results:

### Phase 1: Foundation (Proposals 1 + 5)
1. Add `ISpanContext` to runtime with unique span IDs
2. Emit span lifecycle events from TimerBehavior
3. Update `RuntimeMetric` to include `spanIds` and `recordedAt`

### Phase 2: Rest Support (Proposal 2)
1. Create `RestBehavior` for explicit rest period management
2. Add `type: 'work' | 'rest'` to TimeSpan
3. Update EffortBlock to check rest state before emitting metrics

### Phase 3: Rich Context (Proposal 3)
1. Add optional `captureContext` to metrics for detailed snapshot data
2. Implement `MetricCaptureBehavior` for automatic context capture
3. Provide opt-in rich context for debugging and analysis

This phased approach provides:
- Immediate value with minimal disruption (Phase 1)
- Clear rest period handling (Phase 2)
- Advanced debugging capabilities (Phase 3)

---

## Migration Path

### Backward Compatibility
- All new fields are optional
- Existing metrics continue to work without span associations
- Gradual migration block-by-block

### Testing Strategy
1. Add integration tests for each workout type (AMRAP, EMOM, For Time)
2. Verify span associations in pause/resume scenarios
3. Validate rest period behavior
4. Test hierarchical span tracking (Timer → Rounds → Effort)

### Documentation Requirements
- Update runtime architecture diagram
- Add span-metric association guide
- Create troubleshooting guide for span debugging
- Update block API contracts

---

## Open Questions

1. **Should rest spans be included in total workout time?**
   - Impacts duration calculations and completion detection

2. **How should metrics from incomplete spans be handled?**
   - If a block is popped before span completion

3. **Should span context be persisted for workout history?**
   - Impacts storage requirements and query capabilities

4. **How to handle concurrent spans?**
   - E.g., EMOM with overlapping work/rest phases

5. **Should there be a maximum span depth?**
   - Prevent memory issues with deeply nested blocks

---

## Appendix: Example Scenarios

### Scenario 1: AMRAP with Pause/Resume
```typescript
// Timer creates span 1 (work)
timer.onPush() → span1 { id: 'abc', type: 'work', start: 0s }

// Effort emits metrics during span 1
effort.incrementRep() → metric { spanIds: ['abc'], recordedAt: 15s }

// User pauses at 20s
timer.pause() → span1.stop = 20s, emit 'span:stopped'

// User resumes at 45s
timer.resume() → span2 { id: 'def', type: 'work', start: 45s }

// Effort emits more metrics during span 2
effort.incrementRep() → metric { spanIds: ['def'], recordedAt: 50s }

// Result: Metrics correctly separated by pause period
```

### Scenario 2: EMOM with Rest Periods
```typescript
// Timer with RestBehavior
timer.onPush() → workSpan { id: 'abc', type: 'work', start: 0s }
rest.onPush() → restSpan { id: 'def', type: 'rest', start: 40s }

// Metrics only during work span
effort.incrementRep() @ 15s → metric { spanIds: ['abc'], type: 'work' }
effort.incrementRep() @ 45s → REJECTED (rest period active)

// Next round starts new work span
timer.next() → workSpan2 { id: 'ghi', type: 'work', start: 60s }
```

### Scenario 3: Nested Rounds with Timer
```typescript
// Timer → Rounds → Effort hierarchy
timer.onPush() → timerSpan { id: 'timer-1', type: 'work', start: 0s }
rounds.onPush() → roundSpan { id: 'round-1', parentSpanId: 'timer-1', start: 0s }
effort.mount() → effort tracks activeSpanId = 'round-1'

// Metric includes full span hierarchy
effort.incrementRep() → metric {
  spanIds: ['timer-1', 'round-1'],
  captureContext: {
    spanSnapshot: {
      roundNumber: 1,
      parentTimer: { elapsedMs: 15000 }
    }
  }
}
```

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create `ISpanContext` interface in `src/runtime/ISpanContext.ts`
- [ ] Implement `SpanContext` class in `src/runtime/SpanContext.ts`
- [ ] Add `spanContext: ISpanContext` to `IScriptRuntime`
- [ ] Update `ScriptRuntime` constructor to initialize span context
- [ ] Add `id: string` and `type: 'work' | 'rest' | 'transition'` to `TimeSpan`
- [ ] Update `RuntimeMetric` to include `spanIds: string[]` and `recordedAt: Date`
- [ ] Update `TimerBehavior.onPush()` to emit `span:started` event
- [ ] Update `TimerBehavior.onPop()` to emit `span:stopped` event
- [ ] Update `EffortBlock.mount()` to register span event handlers
- [ ] Add unit tests for span context management
- [ ] Add integration tests for span-metric association

### Phase 2: Rest Support
- [ ] Create `RestBehavior` class in `src/runtime/behaviors/RestBehavior.ts`
- [ ] Add `isInRestPeriod()` method to RestBehavior
- [ ] Update block configurations to support rest duration
- [ ] Update `EffortBlock.updateMemoryAndEmit()` to check rest state
- [ ] Add `rest:started` and `rest:stopped` events
- [ ] Add unit tests for rest behavior
- [ ] Add integration tests for EMOM with rest periods

### Phase 3: Rich Context
- [ ] Create `CapturedMetric` interface extending `RuntimeMetric`
- [ ] Create `MetricCaptureBehavior` class
- [ ] Add `captureContext` to metric emission
- [ ] Update visualization components to display span context
- [ ] Add debugging utilities for span inspection
- [ ] Update documentation with span context examples
