# IBehaviorContext

> Unified context object passed to behavior lifecycle hooks

## Definition

```typescript
interface IBehaviorContext {
    // ═══════════════════════════════════════════════════════════════════
    // Core References
    // ═══════════════════════════════════════════════════════════════════
    
    /** The block this behavior is attached to */
    readonly block: IRuntimeBlock;
    
    /** Current runtime clock */
    readonly clock: IRuntimeClock;
    
    /** Stack level (depth). 0 = root, 1 = first child, etc. */
    readonly stackLevel: number;

    // ═══════════════════════════════════════════════════════════════════
    // Event Subscription
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * Subscribe to runtime events.
     * Automatically cleaned up on block unmount.
     */
    subscribe(eventType: BehaviorEventType, listener: BehaviorEventListener): Unsubscribe;

    // ═══════════════════════════════════════════════════════════════════
    // Event Emission (Use Sparingly)
    // ═══════════════════════════════════════════════════════════════════
    
    /** Emit an event to the runtime event bus */
    emitEvent(event: IEvent): void;

    // ═══════════════════════════════════════════════════════════════════
    // Output Emission
    // ═══════════════════════════════════════════════════════════════════
    
    /** Emit an output statement for recording/reporting */
    emitOutput(
        type: OutputStatementType,
        fragments: ICodeFragment[],
        options?: OutputOptions
    ): void;

    // ═══════════════════════════════════════════════════════════════════
    // Memory Access
    // ═══════════════════════════════════════════════════════════════════
    
    /** Get memory of the specified type */
    getMemory<T extends MemoryType>(type: T): MemoryValueOf<T> | undefined;
    
    /** Set memory of the specified type */
    setMemory<T extends MemoryType>(type: T, value: MemoryValueOf<T>): void;

    // ═══════════════════════════════════════════════════════════════════
    // Block Control
    // ═══════════════════════════════════════════════════════════════════
    
    /** Mark the block as complete */
    markComplete(reason?: string): void;
}
```

## Supporting Types

```typescript
/** Event types behaviors can subscribe to */
type BehaviorEventType = 'tick' | 'next' | 'timer:complete' | 'pause' | 'resume' | '*';

/** Listener function signature */
type BehaviorEventListener = (event: IEvent, ctx: IBehaviorContext) => IRuntimeAction[];

/** Unsubscribe function */
type Unsubscribe = () => void;

/** Output emission options */
interface OutputOptions {
    label?: string;
}
```

## Design Philosophy

`IBehaviorContext` replaces the old `(block, clock)` tuple pattern with a unified API that:

1. **Enables event subscription** with automatic cleanup
2. **Supports typed memory access** for block state
3. **Provides output emission** for recording
4. **Separates events from outputs** (coordination vs. reporting)

## API Reference

### Core References

| Property | Type | Description |
|----------|------|-------------|
| `block` | `IRuntimeBlock` | The block this behavior is attached to |
| `clock` | `IRuntimeClock` | Current runtime clock for time operations |
| `stackLevel` | `number` | Depth in the block stack (0 = root) |

### Event Subscription

```typescript
subscribe(eventType: BehaviorEventType, listener: BehaviorEventListener): Unsubscribe
```

Subscribe to runtime events. **Subscriptions are automatically cleaned up on unmount.**

```typescript
onMount(ctx: IBehaviorContext): IRuntimeAction[] {
    // Subscribe to tick events
    ctx.subscribe('tick', (event, tickCtx) => {
        const timer = tickCtx.getMemory('timer');
        // Check timer state...
        return [];
    });
    
    // Subscribe to all events (debugging)
    ctx.subscribe('*', (event, ctx) => {
        console.log('Event:', event.name);
        return [];
    });
    
    return [];
}
```

### Event Emission

```typescript
emitEvent(event: IEvent): void
```

> ⚠️ **Use sparingly.** Events should primarily come from external sources. For most internal coordination, use memory or outputs instead.

Valid use cases:
- Sound cues that external audio systems handle (now migrated to outputs)
- UI control notifications (now migrated to memory)

```typescript
// AVOID internal event emission
// ctx.emitEvent({ name: 'timer:started', ... }); // ❌

// Instead, use memory (observable by UI)
ctx.setMemory('timer', timerState); // ✅
```

### Output Emission

```typescript
emitOutput(
    type: OutputStatementType,
    fragments: ICodeFragment[],
    options?: OutputOptions
): void
```

Emit execution records for history/UI/audio systems.

| Output Type | Purpose | Typical Lifecycle |
|-------------|---------|-------------------|
| `segment` | Timed portion started | onMount |
| `milestone` | Notable event (sound cue, round) | onMount, onNext |
| `completion` | Block finished | onUnmount |
| `label` | Display-only marker | Any |
| `metric` | Recorded statistic | onUnmount |

```typescript
// Emit segment on mount
ctx.emitOutput('segment', [
    { fragmentType: FragmentType.Timer, value: durationMs, origin: 'runtime' }
], { label: 'Timer Started' });

// Emit milestone for sound cue
ctx.emitOutput('milestone', [
    new SoundFragment('beep', 'countdown', { atSecond: 3 })
], { label: 'Countdown: 3s' });

// Emit completion on unmount
ctx.emitOutput('completion', [
    { fragmentType: FragmentType.Timer, value: elapsed, origin: 'runtime' }
], { label: 'Completed' });
```

### Memory Access

```typescript
getMemory<T extends MemoryType>(type: T): MemoryValueOf<T> | undefined
setMemory<T extends MemoryType>(type: T, value: MemoryValueOf<T>): void
```

Type-safe memory access for block state.

| Memory Type | Value Type | Purpose |
|-------------|------------|---------|
| `timer` | `TimerState` | Time tracking with spans |
| `round` | `RoundState` | Iteration counter |
| `display` | `DisplayState` | UI presentation state |
| `controls` | `ControlsState` | Button configurations |
| `completion` | `CompletionState` | Completion tracking |
| `fragment` | `FragmentState` | Inherited fragments |

```typescript
// Initialize timer state
ctx.setMemory('timer', {
    direction: 'down',
    durationMs: 60000,
    spans: [new TimeSpan(now)],
    label: 'Work'
});

// Read timer state
const timer = ctx.getMemory('timer');
if (timer && elapsed >= timer.durationMs) {
    ctx.markComplete('timer-expired');
}
```

### Block Control

```typescript
markComplete(reason?: string): void
```

Signal that the block should be popped from the stack.

```typescript
// Timer expired
ctx.markComplete('timer-expired');

// Rounds exhausted
ctx.markComplete('rounds-complete');

// User advanced
ctx.markComplete('user-advance');
```

## Complete Example

```typescript
class CountdownTimerBehavior implements IRuntimeBehavior {
    constructor(private durationMs: number) {}

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        const now = ctx.clock.now.getTime();
        
        // Initialize timer state
        ctx.setMemory('timer', {
            direction: 'down',
            durationMs: this.durationMs,
            spans: [new TimeSpan(now)],
            label: 'Countdown'
        });
        
        // Subscribe to tick events for completion check
        ctx.subscribe('tick', (event, tickCtx) => {
            const timer = tickCtx.getMemory('timer');
            if (!timer) return [];
            
            const elapsed = calculateElapsed(timer, tickCtx.clock.now.getTime());
            if (elapsed >= timer.durationMs) {
                tickCtx.markComplete('timer-expired');
            }
            return [];
        });
        
        // Emit segment started
        ctx.emitOutput('segment', [{
            fragmentType: FragmentType.Timer,
            value: this.durationMs,
            origin: 'runtime',
            image: formatTime(this.durationMs)
        }], { label: 'Timer Started' });
        
        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        const timer = ctx.getMemory('timer');
        const elapsed = timer ? calculateElapsed(timer, ctx.clock.now.getTime()) : 0;
        
        // Emit completion record
        ctx.emitOutput('completion', [{
            fragmentType: FragmentType.Timer,
            value: elapsed,
            origin: 'runtime',
            image: formatTime(elapsed)
        }], { label: 'Timer Complete' });
        
        return [];
    }
}
```

## Anti-Patterns

### ❌ Emitting internal coordination events

```typescript
// BAD - Events for internal coordination
ctx.emitEvent({ name: 'timer:started', ... });
ctx.emitEvent({ name: 'round:advance', ... });
```

### ✅ Use memory for observable state

```typescript
// GOOD - Memory is observable by UI
ctx.setMemory('timer', timerState);
ctx.setMemory('round', { current: 2, total: 5 });
```

### ❌ Forgetting to return empty array

```typescript
// BAD - Implicit undefined return
onMount(ctx: IBehaviorContext) {
    ctx.setMemory('timer', state);
    // Missing return!
}
```

### ✅ Always return IRuntimeAction[]

```typescript
// GOOD - Explicit empty return
onMount(ctx: IBehaviorContext): IRuntimeAction[] {
    ctx.setMemory('timer', state);
    return [];
}
```

## Related Interfaces

- [[IRuntimeBehavior]] - Behavior interface using this context
- [[IRuntimeBlock]] - Block accessed via `ctx.block`
- [[IEvent]] - Events subscribed to and emitted
- [[IOutputStatement]] - Outputs emitted via `emitOutput`

## Source Files

- `src/runtime/contracts/IBehaviorContext.ts`
- `src/runtime/memory/MemoryTypes.ts` - Memory type definitions
