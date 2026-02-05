# TimerState Memory

The `timer` memory type stores time tracking state for countdown and count-up timers.

## Type Definition

```typescript
interface TimerState {
    /** Raw time segments being tracked */
    readonly spans: readonly TimeSpan[];
    
    /** Target duration in milliseconds (for countdowns or goals) */
    readonly durationMs?: number;
    
    /** Timer direction preference */
    readonly direction: 'up' | 'down';
    
    /** Human-readable label for the timer */
    readonly label: string;
    
    /** Timer role for UI prioritization */
    readonly role?: 'primary' | 'secondary' | 'auto';
}
```

## Memory Key

- **Key**: `'timer'`
- **Value Type**: `TimerState`
- **Concrete Class**: `TimerMemory` (extends `BaseMemoryEntry`)

## TimeSpan Model

Timer state tracks time through immutable `TimeSpan` objects representing segments of active time:

```typescript
class TimeSpan {
    readonly started: number;   // Epoch ms when span began
    readonly ended?: number;    // Epoch ms when span closed (undefined = running)
    
    get isOpen(): boolean;      // true if ended is undefined
}
```

Total elapsed time is calculated by summing all span durations.

## Behaviors That Write Timer Memory

### TimerInitBehavior

**Lifecycle**: `onMount`

Initializes timer state when a timer block is mounted. Timer start is signaled implicitly by the presence of timer memory with an open span—no event is emitted.

```typescript
// Initializes with configuration
ctx.setMemory('timer', {
    direction: config.direction,      // 'up' or 'down'
    durationMs: config.durationMs,    // Target duration for countdowns
    spans: [new TimeSpan(now)],       // Starts first span immediately
    label: config.label ?? ctx.block.label,
    role: config.role ?? 'primary'
});
// No event emission - timer start is implicit from memory allocation
```

### TimerTickBehavior

**Lifecycle**: `onUnmount`

Closes the active time span when the block is unmounted.

```typescript
// On unmount, closes the last open span
const updatedSpans = timer.spans.map((span, i) => {
    if (i === timer.spans.length - 1 && span.ended === undefined) {
        return new TimeSpan(span.started, now);
    }
    return span;
});
ctx.setMemory('timer', { ...timer, spans: updatedSpans });
```

### TimerPauseBehavior

**Lifecycle**: Event subscription (`timer:pause`, `timer:resume`)

Manages pause/resume by closing and opening spans. State changes are signaled through timer memory, not events.

| Event | Action |
|-------|--------|
| `timer:pause` | Closes current span (sets `ended` timestamp) |
| `timer:resume` | Opens new span (adds new `TimeSpan(now)`) |

**Note**: No events are emitted. Pause/resume state is observable through timer memory spans.

## Behaviors That Read Timer Memory

### TimerCompletionBehavior

**Lifecycle**: `onMount` (subscribes to `tick` events)

Monitors countdown timers and marks block complete when duration is reached. Completion is signaled through `markComplete()`, not events.

```typescript
// Calculates elapsed from spans
const elapsed = calculateElapsed(timer, now);
if (elapsed >= timer.durationMs) {
    ctx.markComplete('timer-expired');
}
```

**Note**: No events are emitted. Completion reason is stored in CompletionState memory.

### TimerOutputBehavior

**Lifecycle**: `onMount`, `onUnmount`

Emits structured output for workout history tracking.

| Phase | Output Type | Content |
|-------|-------------|---------|
| `onMount` | `segment` | Timer label and target duration |
| `onUnmount` | `completion` | Elapsed time formatted as mm:ss |

### SoundCueBehavior

**Lifecycle**: `onMount` (subscribes to `tick` events)

Plays audio cues at specific countdown thresholds.

```typescript
// For countdown timers, calculates remaining seconds
const remainingMs = timer.durationMs - elapsed;
const remainingSeconds = Math.ceil(remainingMs / 1000);

// Plays configured sounds at threshold seconds
if (cue.atSeconds?.includes(remainingSeconds)) {
    ctx.emitEvent({ name: 'sound:play', ... });
}
```

### HistoryRecordBehavior

**Lifecycle**: `onUnmount`

Records timer execution data to workout history.

```typescript
const timer = ctx.getMemory('timer');
if (timer) {
    record.elapsedMs = calculateElapsed(timer, now);
    record.timerDirection = timer.direction;
    record.timerDurationMs = timer.durationMs;
}
```

**Events Emitted**: `history:record`

## Usage Example

```typescript
// Create a 5-minute countdown timer block
const block = new RuntimeBlock('timer-1', {
    behaviors: [
        new TimerInitBehavior({ 
            direction: 'down', 
            durationMs: 5 * 60 * 1000,
            label: 'Work Interval' 
        }),
        new TimerTickBehavior(),
        new TimerCompletionBehavior(),
        new TimerPauseBehavior(),
        new TimerOutputBehavior(),
        new SoundCueBehavior({ 
            cues: [
                { sound: 'beep', trigger: 'countdown', atSeconds: [3, 2, 1] }
            ] 
        })
    ]
});
```

## Related Memory Types

- [`DisplayState`](./DisplayState.md) - UI presentation derived from timer state
- [`CompletionState`](./CompletionState.md) - Tracks block completion status
