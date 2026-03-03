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
    subscribe(
        eventType: BehaviorEventType,
        listener: BehaviorEventListener,
        options?: SubscribeOptions
    ): Unsubscribe;

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
    // List-Based Memory API
    // ═══════════════════════════════════════════════════════════════════

    /** Push a new memory location with fragment data */
    pushMemory(tag: MemoryTag, fragments: ICodeFragment[]): IMemoryLocation;

    /** Get all memory locations matching the given tag */
    getMemoryByTag(tag: MemoryTag): IMemoryLocation[];

    /** Update the first matching memory location with new fragment data */
    updateMemory(tag: MemoryTag, fragments: ICodeFragment[]): void;

    // ═══════════════════════════════════════════════════════════════════
    // Block Control
    // ═══════════════════════════════════════════════════════════════════
    
    /** Mark the block as complete */
    markComplete(reason?: string): void;

    // ═══════════════════════════════════════════════════════════════════
    // Backward-Compatible Memory API (deprecated)
    // ═══════════════════════════════════════════════════════════════════
    
    /** @deprecated Use getMemoryByTag() and read fragment values instead */
    getMemory<T extends MemoryType>(type: T): MemoryValueOf<T> | undefined;
    
    /** @deprecated Use pushMemory() or updateMemory() instead */
    setMemory<T extends MemoryType>(type: T, value: MemoryValueOf<T>): void;
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

/** Options for subscribing to events */
interface SubscribeOptions {
    /**
     * Handler scope for this subscription.
     * - 'active' (default): Only fires when this block is top-of-stack
     * - 'bubble': Fires when this block is anywhere on the stack
     * - 'global': Always fires regardless of stack state
     */
    scope?: HandlerScope;
}

/** Output emission options */
interface OutputOptions {
    /** Human-readable label for the output */
    label?: string;
    /** Reason the block completed (propagated to OutputStatement) */
    completionReason?: string;
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
| `system` | Debug/diagnostic output | Any |
| `event` | External/internal trigger tracking | Any |
| `group` | Identified segment with children | onMount |
| `load` | Initial script state | onMount |
| `compiler` | Behavior configuration/setup | onMount |
| `analytics` | Analytics engine output | onUnmount |

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

The primary memory API uses `MemoryTag`-based locations where all values are `ICodeFragment[]`:

```typescript
pushMemory(tag: MemoryTag, fragments: ICodeFragment[]): IMemoryLocation
getMemoryByTag(tag: MemoryTag): IMemoryLocation[]
updateMemory(tag: MemoryTag, fragments: ICodeFragment[]): void
```

Memory tags are strings from the `MemoryTag` union. Multiple locations with the same tag can coexist on a block.

| Tag | Purpose |
|-----|---------|
| `time` | Time tracking (span fragments) |
| `timer` | Legacy timer state |
| `round` | Iteration counter |
| `children:status` | Child dispatch tracking |
| `completion` | Block completion tracking |
| `display` | UI presentation state |
| `controls` | Button configurations |
| `fragment` | Raw fragment groups |
| `fragment:display` | Display-resolved fragments |
| `fragment:promote` | Inherited by child blocks |
| `fragment:rep-target` | Rep target fragments |
| `fragment:result` | Output collected on pop |
| `fragment:tracked` | Internal tracking state |
| `fragment:label` | Label fragments |
| `fragment:next` | Preview of next child |

```typescript
// Push a display row
ctx.pushMemory('fragment:display', [timerFrag, actionFrag, effortFrag]);

// Read all display memory locations
const displayLocs = ctx.getMemoryByTag('fragment:display');
for (const loc of displayLocs) {
    console.log(loc.fragments);
}

// Update existing memory
ctx.updateMemory('time', [updatedTimerFragment]);
```

#### Deprecated Memory API

The legacy typed memory API is still available but deprecated:

```typescript
// @deprecated — Use pushMemory/getMemoryByTag/updateMemory instead
getMemory<T extends MemoryType>(type: T): MemoryValueOf<T> | undefined
setMemory<T extends MemoryType>(type: T, value: MemoryValueOf<T>): void
```

Legacy `MemoryType` keys (`'timer'`, `'round'`, `'fragment'`, `'completion'`, `'display'`, `'controls'`, `'children:status'`, `'fragment:display'`) map to typed state interfaces like `TimerState`, `RoundState`, etc.

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
        
        // Push timer fragment to memory
        ctx.pushMemory('time', [{
            fragmentType: FragmentType.Duration,
            value: this.durationMs,
            origin: 'runtime',
            type: 'duration',
            image: formatTime(this.durationMs)
        }]);
        
        // Subscribe to tick events for completion check
        ctx.subscribe('tick', (event, tickCtx) => {
            const timerLocs = tickCtx.getMemoryByTag('time');
            if (timerLocs.length === 0) return [];
            
            const elapsed = calculateElapsed(timerLocs[0].fragments, tickCtx.clock.now.getTime());
            if (elapsed >= this.durationMs) {
                tickCtx.markComplete('timer-expired');
            }
            return [];
        });
        
        // Subscribe with bubble scope for parent tracking
        ctx.subscribe('tick', (event, tickCtx) => {
            // Track timer even when child blocks are active
            return [];
        }, { scope: 'bubble' });
        
        // Emit segment started
        ctx.emitOutput('segment', [{
            fragmentType: FragmentType.Duration,
            value: this.durationMs,
            origin: 'runtime',
            type: 'duration',
            image: formatTime(this.durationMs)
        }], { label: 'Timer Started' });
        
        return [];
    }

    onNext(ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        const timerLocs = ctx.getMemoryByTag('time');
        const elapsed = timerLocs.length > 0 
            ? calculateElapsed(timerLocs[0].fragments, ctx.clock.now.getTime())
            : 0;
        
        // Emit segment with completion context
        ctx.emitOutput('segment', [{
            fragmentType: FragmentType.Duration,
            value: elapsed,
            origin: 'runtime',
            type: 'duration',
            image: formatTime(elapsed)
        }], { label: 'Timer Complete', completionReason: 'timer-expired' });
        
        return [];
    }

    onDispose(ctx: IBehaviorContext): void {
        // No external resources to clean up
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
