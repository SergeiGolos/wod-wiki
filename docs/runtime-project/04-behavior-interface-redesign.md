# Behavior Interface Redesign - Analysis & Proposal

## 1. Current State Analysis

### Current `IRuntimeBehavior` Interface

```typescript
interface IRuntimeBehavior {
  onPush?(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[];
  onNext?(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[];
  onPop?(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[];
  onDispose?(block: IRuntimeBlock): void;
  onEvent?(event: IEvent, block: IRuntimeBlock): IRuntimeAction[];
}
```

### Current Problems

| Issue | Description | Impact |
|-------|-------------|--------|
| **No Memory Access** | Behaviors receive `block` but must use `block.getMemory()` indirectly | Behaviors can't easily read/write to their block's memory |
| **No Runtime Access** | Only `clock` is passed, not the full runtime | Can't subscribe to events, emit events, or access global state |
| **Passive Event Handling** | `onEvent` only fires for the active block | Can't subscribe to specific events across the lifecycle |
| **No Lifecycle Subscription** | Behaviors can't register for tick/next during mount | Timer behaviors use workarounds with state managers |
| **No Output Emission** | No API to emit output statements from behaviors | Can't record elapsed time, completion metrics, milestones |

### How Events Currently Flow

```
Event (tick, next, timer:complete)
         │
         ▼
┌─────────────────────────────────────────────────┐
│ EventBus.dispatch(event, runtime)               │
│  └─► Filters by scope (active/global)           │
│       └─► Calls registered handlers             │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│ RuntimeBlock.registerEventDispatcher()          │
│  └─► Registered on mount()                      │
│       └─► Delegates to behavior.onEvent()       │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│ Behavior.onEvent(event, block)                  │
│  └─► Returns IRuntimeAction[]                   │
│       └─► Actions queued and executed           │
└─────────────────────────────────────────────────┘
```

**Current limitation:** Behaviors only see events passively via `onEvent`. They cannot:
- Subscribe to specific event types during mount
- Register for tick events explicitly
- Emit output statements to record execution results

---

## 2. Key Design Insight: Output Statements, Not Fragment Collection

### The Distinction

**Fragments** are data pieces (timer value, rep count, action name).  
**Output Statements** are meaningful execution reports that *contain* fragments.

A behavior doesn't "collect fragments" — it **emits output statements** that represent:
- **Segment start** (e.g., "Timer started at 0:00")
- **Milestone** (e.g., "Lap 3 completed in 1:23")  
- **Completion** (e.g., "Timer finished after 5:00")
- **Metric** (e.g., "User recorded 15 reps")
- **Label** (e.g., "Currently executing: Push-ups")

### When Output Can Be Emitted

Output statements can be emitted at **any lifecycle point**:

| Lifecycle | Output Type | Example |
|-----------|-------------|---------|
| **onMount** | `segment` | Timer block emits "segment started" with duration fragment |
| **onNext** | `segment`, `milestone` | Loop block emits "round 2 of 5" with round fragments |
| **onEvent (tick)** | `milestone` | Timer emits "halfway point" at 50% |
| **onUnmount** | `completion` | Timer emits "completed" with elapsed time fragment |

---

## 3. Proposed Interface Changes

### 3.1 New `IBehaviorContext` - The Behavior's View of the World

```typescript
/**
 * Context object passed to behavior lifecycle hooks.
 * Provides everything a behavior needs to interact with the runtime.
 */
interface IBehaviorContext {
    /** The block this behavior is attached to */
    readonly block: IRuntimeBlock;
    
    /** Current runtime clock */
    readonly clock: IRuntimeClock;
    
    /** Subscribe to specific events (returns unsubscribe function) */
    subscribe(eventType: EventType, listener: BehaviorEventListener): Unsubscribe;
    
    /** Emit an event to the runtime event bus */
    emitEvent(event: IEvent): void;
    
    /**
     * Emit an output statement.
     * 
     * Output statements represent meaningful execution results and can be
     * emitted at any lifecycle point (mount, next, tick, unmount).
     * 
     * @param type The type of output (segment, milestone, completion, metric, label)
     * @param fragments The data fragments that make up this output
     * @param options Optional metadata (parent output, label)
     */
    emitOutput(
        type: OutputStatementType,
        fragments: ICodeFragment[],
        options?: OutputOptions
    ): void;
    
    /** Mark the block as complete */
    markComplete(reason?: string): void;
    
    /** Access to block memory (typed read) */
    getMemory<T extends MemoryType>(type: T): MemoryValueOf<T> | undefined;
    
    /** Access to block memory (typed write) */
    setMemory<T extends MemoryType>(type: T, value: MemoryValueOf<T>): void;
}

interface OutputOptions {
    /** Human-readable label for the output */
    label?: string;
    /** Parent output statement (for hierarchical outputs) */
    parentOutputId?: string;
}

type BehaviorEventListener = (event: IEvent, ctx: IBehaviorContext) => IRuntimeAction[];
type EventType = 'tick' | 'next' | 'timer:complete' | 'pause' | 'resume' | '*';
```

### 3.2 Updated `IRuntimeBehavior` Interface

```typescript
interface IRuntimeBehavior {
    /**
     * Called when the owning block is mounted.
     * Use ctx.subscribe() to register for events like 'tick' and 'next'.
     * Use ctx.emitOutput() to emit a "segment started" output.
     */
    onMount?(ctx: IBehaviorContext): IRuntimeAction[];
    
    /**
     * Called when parent.next() is invoked (child completed or manual advance).
     * Use ctx.emitOutput() to emit round/iteration results.
     */
    onNext?(ctx: IBehaviorContext): IRuntimeAction[];
    
    /**
     * Called when the owning block is about to be unmounted.
     * Use ctx.emitOutput() to emit final completion results.
     */
    onUnmount?(ctx: IBehaviorContext): IRuntimeAction[];
    
    /**
     * Called during dispose for final cleanup.
     */
    onDispose?(ctx: IBehaviorContext): void;
}
```

### 3.3 `emitOutput()` vs Events

| Method | Purpose | Subscribers |
|--------|---------|-------------|
| `ctx.emitEvent()` | Runtime coordination (pause, resume, timer:complete) | Event handlers, other blocks |
| `ctx.emitOutput()` | Execution results (what happened) | UI, history, analytics |

**Events** are about **coordination** — "the timer finished, react to it."  
**Outputs** are about **reporting** — "here's what the timer measured."

---

## 4. How It Solves Each Problem

### Problem: No Memory Access
**Solution:** `ctx.getMemory()` and `ctx.setMemory()` provide typed access.

```typescript
onMount(ctx: IBehaviorContext) {
    ctx.setMemory('timer', { elapsed: 0, isRunning: true });
}

onNext(ctx: IBehaviorContext) {
    const timer = ctx.getMemory('timer');
    console.log(`Elapsed: ${timer?.elapsed}ms`);
}
```

### Problem: No Tick Subscription
**Solution:** `ctx.subscribe('tick', callback)` during mount.

```typescript
onMount(ctx: IBehaviorContext) {
    ctx.subscribe('tick', (event, ctx) => {
        const timer = ctx.getMemory('timer');
        
        // Check for milestone (halfway point)
        if (timer && timer.duration && timer.elapsed >= timer.duration / 2) {
            ctx.emitOutput('milestone', [
                { fragmentType: FragmentType.Timer, value: timer.elapsed, origin: 'runtime' }
            ], { label: 'Halfway' });
        }
        
        // Check for completion
        if (timer?.elapsed >= timer?.duration) {
            ctx.markComplete('timer:complete');
        }
        
        return [];
    });
}
```

### Problem: No Output Emission
**Solution:** `ctx.emitOutput()` at any lifecycle point.

```typescript
// On mount: emit segment started
onMount(ctx: IBehaviorContext) {
    ctx.emitOutput('segment', [
        { fragmentType: FragmentType.Timer, value: this.durationMs, origin: 'parser' }
    ], { label: `Timer: ${formatDuration(this.durationMs)}` });
    
    return [];
}

// On next (for loop blocks): emit round result
onNext(ctx: IBehaviorContext) {
    const round = ctx.getMemory('round');
    ctx.emitOutput('segment', [
        { fragmentType: FragmentType.Rounds, value: round?.current, origin: 'runtime' }
    ], { label: `Round ${round?.current} of ${round?.total}` });
    
    return [];
}

// On unmount: emit completion with final metrics
onUnmount(ctx: IBehaviorContext) {
    const timer = ctx.getMemory('timer');
    ctx.emitOutput('completion', [
        { fragmentType: FragmentType.Timer, value: timer?.elapsed, origin: 'runtime' }
    ], { label: 'Completed' });
    
    return [];
}
```

---

## 5. Output Statement Flow

```
┌─────────────────────────────────────────────────────────┐
│                     mount()                              │
│  behavior.onMount(ctx)                                  │
│    └─► ctx.emitOutput('segment', [...])                 │
│          └─► runtime._outputStatements.push(...)        │
│          └─► notify output subscribers                  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   tick / next                            │
│  behavior event listener or onNext()                    │
│    └─► ctx.emitOutput('milestone', [...])               │
│          └─► runtime._outputStatements.push(...)        │
│          └─► notify output subscribers                  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    unmount()                             │
│  behavior.onUnmount(ctx)                                │
│    └─► ctx.emitOutput('completion', [...])              │
│          └─► runtime._outputStatements.push(...)        │
│          └─► notify output subscribers                  │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Example: Timer Behavior After Redesign

```typescript
class TimerBehavior implements IRuntimeBehavior {
    constructor(
        private direction: 'up' | 'down' = 'up',
        private durationMs?: number
    ) {}
    
    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        const now = ctx.clock.now;
        
        // Initialize timer memory
        ctx.setMemory('timer', {
            direction: this.direction,
            durationMs: this.durationMs,
            elapsed: 0,
            isRunning: true,
            startTime: now.getTime()
        });
        
        // Subscribe to tick events for progress tracking
        ctx.subscribe('tick', (event, ctx) => {
            const timer = ctx.getMemory('timer');
            if (!timer?.isRunning) return [];
            
            const elapsed = ctx.clock.now.getTime() - timer.startTime;
            ctx.setMemory('timer', { ...timer, elapsed });
            
            // Check for completion (countdown timers)
            if (this.durationMs && elapsed >= this.durationMs) {
                ctx.markComplete('timer:complete');
            }
            
            return [];
        });
        
        // Emit segment started output
        ctx.emitOutput('segment', [
            this.createTimerFragment(0)
        ], { label: `Timer: ${this.formatDuration(this.durationMs)}` });
        
        // Emit timer:started event for coordination
        ctx.emitEvent({ 
            name: 'timer:started', 
            timestamp: now,
            data: { direction: this.direction, durationMs: this.durationMs }
        });
        
        return [];
    }
    
    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        const timer = ctx.getMemory('timer');
        const elapsed = timer?.elapsed ?? 0;
        
        // Emit completion output with final elapsed time
        ctx.emitOutput('completion', [
            this.createTimerFragment(elapsed)
        ], { label: 'Timer Complete' });
        
        // Emit timer:complete event for coordination
        ctx.emitEvent({
            name: 'timer:complete',
            timestamp: ctx.clock.now,
            data: { elapsedMs: elapsed, durationMs: this.durationMs }
        });
        
        return [];
    }
    
    private createTimerFragment(elapsed: number): ICodeFragment {
        return {
            type: 'duration',
            fragmentType: FragmentType.Timer,
            value: elapsed,
            image: this.formatDuration(elapsed),
            origin: 'runtime',
            sourceBlockKey: undefined, // Set by context
            timestamp: new Date()
        };
    }
    
    private formatDuration(ms?: number): string {
        if (!ms) return '0:00';
        const seconds = Math.floor(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}
```

---

## 7. Example: Loop Behavior After Redesign

```typescript
class RoundPerLoopBehavior implements IRuntimeBehavior {
    constructor(private totalRounds: number) {}
    
    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Initialize round tracking
        ctx.setMemory('round', { current: 0, total: this.totalRounds });
        
        // Emit segment for round 1
        ctx.emitOutput('segment', [
            { fragmentType: FragmentType.Rounds, value: 1, origin: 'runtime' }
        ], { label: `Round 1 of ${this.totalRounds}` });
        
        return [];
    }
    
    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        const round = ctx.getMemory('round');
        if (!round) return [];
        
        const nextRound = round.current + 1;
          
        if (nextRound > round.total) {
            // All rounds complete
            ctx.markComplete('all-rounds-complete');
            return [];
        }
        
        // Update memory
        ctx.setMemory('round', { ...round, current: nextRound });
        
        // Emit output for the new round
        ctx.emitOutput('segment', [
            { fragmentType: FragmentType.Rounds, value: nextRound, origin: 'runtime' }
        ], { label: `Round ${nextRound} of ${round.total}` });
        
        return [];
    }
    
    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        const round = ctx.getMemory('round');
        
        // Emit completion output
        ctx.emitOutput('completion', [
            { fragmentType: FragmentType.Rounds, value: round?.current, origin: 'runtime' },
            { fragmentType: FragmentType.Rounds, value: round?.total, origin: 'parser' }
        ], { label: `Completed ${round?.current} of ${round?.total} rounds` });
        
        return [];
    }
}
```

---

## 8. BehaviorContext Implementation

```typescript
class BehaviorContext implements IBehaviorContext {
    private subscriptions: Array<{ eventType: string; unsubscribe: () => void }> = [];
    
    constructor(
        readonly block: IRuntimeBlock,
        readonly clock: IRuntimeClock,
        private runtime: IScriptRuntime
    ) {}
    
    subscribe(eventType: EventType, listener: BehaviorEventListener): Unsubscribe {
        const handler: IEventHandler = {
            id: `behavior-${this.block.key}-${eventType}-${Date.now()}`,
            name: `BehaviorHandler-${eventType}`,
            handler: (event, runtime) => listener(event, this)
        };
        
        const unsub = this.runtime.eventBus.register(
            eventType, 
            handler, 
            this.block.key.toString()
        );
        
        this.subscriptions.push({ eventType, unsubscribe: unsub });
        return unsub;
    }
    
    emitEvent(event: IEvent): void {
        this.runtime.eventBus.dispatch(event, this.runtime);
    }
    
    emitOutput(
        type: OutputStatementType,
        fragments: ICodeFragment[],
        options?: OutputOptions
    ): void {
        // Tag fragments with source block
        const taggedFragments = fragments.map(f => ({
            ...f,
            sourceBlockKey: f.sourceBlockKey ?? this.block.key.toString(),
            timestamp: f.timestamp ?? this.clock.now
        }));
        
        const output = new OutputStatement({
            outputType: type,
            timeSpan: new TimeSpan(this.clock.now.getTime(), this.clock.now.getTime()),
            sourceBlockKey: this.block.key.toString(),
            sourceStatementId: this.block.sourceIds?.[0],
            fragments: taggedFragments,
            parent: undefined,
            children: []
        });
        
        // Add to runtime's output collection and notify subscribers
        (this.runtime as any)._outputStatements.push(output);
        for (const listener of (this.runtime as any)._outputListeners) {
            try {
                listener(output);
            } catch (err) {
                console.error('[BehaviorContext] Output listener error:', err);
            }
        }
    }
    
    markComplete(reason?: string): void {
        this.block.markComplete(reason);
    }
    
    getMemory<T extends MemoryType>(type: T): MemoryValueOf<T> | undefined {
        return this.block.getMemory(type)?.value;
    }
    
    setMemory<T extends MemoryType>(type: T, value: MemoryValueOf<T>): void {
        // TODO: Implement memory mutation
        // This may require adding a setMemory method to IRuntimeBlock
    }
    
    /** Called during block unmount to clean up subscriptions */
    dispose(): void {
        for (const { unsubscribe } of this.subscriptions) {
            unsubscribe();
        }
        this.subscriptions = [];
    }
}
```

---

## 9. Open Questions

1. **Memory Mutation:** Should `setMemory()` create new entries or update existing? 
   - **Decision:** Currently not implemented. Memory should be pre-allocated by strategies.
   - `setMemory()` logs a warning. Future work needed to add mutation support.

2. **Output Hierarchy:** How to link child outputs to parent outputs?
   - **Decision:** Use `stackLevel` (0 = root, 1 = first child, etc.) to track depth.
   - Outputs can be grouped post-hoc by stackLevel for visualization.

3. **TimeSpan Construction:** Should outputs have a start time and end time, or just a timestamp?
   - For `segment`: start = mount time, end = undefined (ongoing)
   - For `completion`: start = mount time, end = unmount time
   - For `milestone`: single timestamp

4. **Fragment Ownership:** Who tags the `sourceBlockKey` — caller or context?
   - **Decision:** Context tags automatically if not provided.

---

## 10. Migration Strategy

### Phase 1: Create New Interfaces ✅ COMPLETE
- [x] Create `IBehaviorContext` interface (`src/runtime/contracts/IBehaviorContext.ts`)
- [x] Create `BehaviorContext` class (`src/runtime/BehaviorContext.ts`)
- [x] Add `emitOutput()` method that forwards to runtime
- [x] Add `stackLevel` to `IOutputStatement` and `OutputStatement`
- [x] Add `addOutput()` method to `ScriptRuntime`
- [x] Write tests for `BehaviorContext`

### Phase 2: Integrate with RuntimeBlock ✅ COMPLETE
- [x] Update `RuntimeBlock` to create `BehaviorContext` on mount
- [x] Store context and pass to behavior lifecycle methods
- [x] Dispose context during unmount
- [x] Support legacy behaviors alongside new ones in `IRuntimeBehavior`

### Phase 3: Migrate Behaviors (Pending Reimplementation)
- [ ] Reimplement core behaviors using IBehaviorContext
- [ ] Reimplement reporting behaviors
- [ ] Reimplement timer behaviors

### Phase 4: Remove Legacy Pattern ✅ COMPLETE
- [x] Remove `onPush`, `onPop`, `onEvent` from `IRuntimeBehavior` interface
- [x] Remove backward compatibility code in `RuntimeBlock`
- [x] Delete legacy behavior implementations (`src/runtime/behaviors/*.ts`)
- [x] Update documentation (snapshot created)

---

## 11. Implementation Summary

### Files Created
| File | Description |
|------|-------------|
| `src/runtime/contracts/IBehaviorContext.ts` | Interface defining behavior context API |
| `src/runtime/BehaviorContext.ts` | Concrete implementation of IBehaviorContext |
| `src/runtime/__tests__/BehaviorContext.test.ts` | Test suite for BehaviorContext |

### Files Modified
| File | Change |
|------|--------|
| `src/core/models/OutputStatement.ts` | Added `stackLevel` field to track block depth |
| `src/runtime/ScriptRuntime.ts` | Added `addOutput()` method, updated `emitOutputStatement()` to include stackLevel |

### Key Design Decisions
1. **stackLevel instead of parent-child IDs**: Simpler to track and visualize depth
2. **setMemory deferred**: Memory mutation requires further design work
3. **addOutput public method**: Allows BehaviorContext to emit outputs without accessing private fields

### Next Steps
1. [ ] Integrate BehaviorContext into RuntimeBlock lifecycle
2. [ ] Create one new-pattern behavior as proof of concept
3. [ ] Document migration guide for existing behaviors

