# IRuntimeBehavior

> Composable behavior contract for runtime block lifecycle hooks

## Definition

```typescript
interface IRuntimeBehavior {
    /**
     * Called when the owning block is mounted.
     * Use ctx.subscribe() for events, ctx.emitOutput() for reports,
     * ctx.setMemory() to initialize state.
     */
    onMount?(ctx: IBehaviorContext): IRuntimeAction[];

    /**
     * Called when parent.next() is invoked (child completed or manual advance).
     * Advance internal state (e.g., next round).
     * Call ctx.markComplete() if block is finished.
     */
    onNext?(ctx: IBehaviorContext): IRuntimeAction[];

    /**
     * Called when the block is about to be unmounted.
     * Use ctx.emitOutput() to report final completion.
     * Subscriptions cleaned up automatically after this returns.
     */
    onUnmount?(ctx: IBehaviorContext): IRuntimeAction[];

    /**
     * Called when the block is being disposed.
     * Final cleanup hook.
     */
    onDispose?(ctx: IBehaviorContext): void;
}
```

## Design Philosophy

Behaviors are **composable, single-responsibility units** that attach to runtime blocks. Each behavior handles one aspect of block execution:

| Aspect | Example Behaviors |
|--------|-------------------|
| **Time** | `TimerInitBehavior`, `TimerTickBehavior`, `TimerCompletionBehavior` |
| **Iteration** | `RoundInitBehavior`, `RoundAdvanceBehavior`, `RoundCompletionBehavior` |
| **Display** | `DisplayInitBehavior`, `RoundDisplayBehavior` |
| **Output** | `TimerOutputBehavior`, `RoundOutputBehavior`, `SoundCueBehavior` |
| **Controls** | `ButtonBehavior` |
| **Completion** | `PopOnNextBehavior`, `PopOnEventBehavior` |

## Lifecycle Hooks

### onMount

Called once when the block is pushed onto the stack and mounted.

**Typical Actions:**
- Initialize memory state via `ctx.setMemory()`
- Subscribe to events via `ctx.subscribe()`
- Emit initial outputs via `ctx.emitOutput()`

```typescript
onMount(ctx: IBehaviorContext): IRuntimeAction[] {
    // Initialize timer state
    ctx.setMemory('timer', {
        direction: 'down',
        durationMs: 60000,
        spans: [new TimeSpan(ctx.clock.now.getTime())],
        label: 'Countdown'
    });
    
    // Subscribe to tick events
    ctx.subscribe('tick', this.handleTick.bind(this));
    
    // Emit segment started
    ctx.emitOutput('segment', [timerFragment], { label: 'Timer Started' });
    
    return [];
}
```

### onNext

Called when the block's `next()` method is invoked. This happens when:
- A child block completes
- User clicks "Next" button
- Manual advancement

**Typical Actions:**
- Advance internal state (increment round counter)
- Check completion conditions
- Emit milestone outputs

```typescript
onNext(ctx: IBehaviorContext): IRuntimeAction[] {
    const round = ctx.getMemory('round');
    if (!round) return [];
    
    // Advance round
    ctx.setMemory('round', {
        current: round.current + 1,
        total: round.total
    });
    
    // Check completion
    if (round.total && round.current >= round.total) {
        ctx.markComplete('rounds-complete');
    }
    
    return [];
}
```

### onUnmount

Called when the block is about to be removed from the stack.

**Typical Actions:**
- Emit completion outputs
- Record history
- Close open time spans

```typescript
onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
    const timer = ctx.getMemory('timer');
    const elapsed = calculateElapsed(timer, ctx.clock.now.getTime());
    
    // Emit completion record
    ctx.emitOutput('completion', [
        { fragmentType: FragmentType.Timer, value: elapsed, origin: 'runtime' }
    ], { label: `Completed: ${formatTime(elapsed)}` });
    
    return [];
}
```

### onDispose

Called for final cleanup after unmount. Rarely needed since subscriptions are automatically cleaned up.

```typescript
onDispose(ctx: IBehaviorContext): void {
    // Release any external resources
    this.externalConnection?.close();
}
```

## Behavior Composition

Blocks compose multiple behaviors:

```typescript
const timerBlock = new RuntimeBlock(runtime, statementIds, [
    // Time aspect
    new TimerInitBehavior({ direction: 'down', durationMs: 60000 }),
    new TimerTickBehavior(),
    new TimerCompletionBehavior(),
    
    // Display aspect
    new DisplayInitBehavior({ mode: 'countdown', label: 'Work' }),
    
    // Output aspect
    new TimerOutputBehavior(),
    new SoundCueBehavior({ cues: [{ sound: 'beep', trigger: 'countdown', atSeconds: [3,2,1] }] }),
    
    // Controls aspect
    new ButtonBehavior({ buttons: [...] })
], 'Timer');
```

## Behavior Ordering

Behaviors execute in array order. Order matters for:

1. **Memory initialization** - Init behaviors should come first
2. **State advancement** - Advance before completion check
3. **Output emission** - Output behaviors after state is finalized

```typescript
// CORRECT ORDER
[
    new RoundInitBehavior(),     // 1. Initialize state
    new RoundAdvanceBehavior(),  // 2. Advance on next
    new RoundCompletionBehavior(), // 3. Check completion
    new RoundOutputBehavior()    // 4. Emit outputs
]
```

## Context API Summary

| Method | Purpose | Lifecycle |
|--------|---------|-----------|
| `ctx.setMemory(type, value)` | Initialize/update state | Any |
| `ctx.getMemory(type)` | Read current state | Any |
| `ctx.subscribe(event, listener)` | Listen for events | onMount |
| `ctx.emitOutput(type, fragments)` | Record execution | Any |
| `ctx.markComplete(reason)` | Signal completion | onMount, onNext |

## Testing Behaviors

Use `BehaviorTestHarness` for isolated behavior testing:

```typescript
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';

describe('TimerCompletionBehavior', () => {
    let harness: BehaviorTestHarness;

    beforeEach(() => {
        harness = new BehaviorTestHarness()
            .withClock(new Date('2024-01-01T12:00:00Z'));
    });

    it('should mark complete when timer expires', () => {
        const block = new MockBlock('timer', [
            new TimerInitBehavior({ direction: 'down', durationMs: 5000 }),
            new TimerCompletionBehavior()
        ]);
        
        harness.push(block);
        harness.mount();
        harness.advanceClock(6000);
        harness.simulateTick();
        
        expect(block.isComplete).toBe(true);
    });
});
```

## Related Interfaces

- [[IBehaviorContext]] - Context passed to all hooks
- [[IRuntimeBlock]] - Block that owns behaviors
- [[IRuntimeAction]] - Actions returned by hooks
- [[IOutputStatement]] - Outputs emitted by behaviors

## Source Files

- `src/runtime/contracts/IRuntimeBehavior.ts`
- `src/runtime/behaviors/` - Behavior implementations
