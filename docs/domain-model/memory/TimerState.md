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

### CountdownTimerBehavior

**Lifecycle**: `onMount`, `onUnmount`

Opens a span on mount and subscribes to tick/pause/resume events. Closes the span on unmount. Also handles rest injection on `onNext`.

```typescript
// On mount: opens span and subscribes to events
ctx.pushMemory('time', [spanFragment]);
ctx.subscribe('tick', ...);
ctx.subscribe('pause', ...);
ctx.subscribe('resume', ...);
```

### CountupTimerBehavior

**Lifecycle**: `onMount`, `onUnmount`

Opens a span on mount with pause/resume subscriptions. Closes span on unmount.

### SpanTrackingBehavior

**Lifecycle**: `onMount` (opens span), `onUnmount` (closes span)

Lightweight span-only tracking without tick subscriptions.

### Pause/Resume (via timer behaviors)

Timer behaviors manage pause/resume by closing and opening spans. State changes are signaled through timer memory, not events.

| Event | Action |
|-------|--------|
| `pause` | Closes current span (sets `ended` timestamp) |
| `resume` | Opens new span (adds new TimeSpan) |

## Behaviors That Read Timer Memory

### CountdownTimerBehavior

**Lifecycle**: `onMount` (subscribes to `tick` events)

Monitors countdown timers and marks block complete when duration is reached. Completion is signaled through `markComplete()`.

```typescript
const elapsed = calculateElapsed(timer, now);
if (elapsed >= timer.durationMs) {
    ctx.markComplete('timer-expired');
}
```

### ReportOutputBehavior

**Lifecycle**: `onMount`, `onUnmount`

Emits structured output for workout history tracking.

| Phase | Output Type | Content |
|-------|-------------|---------|
| `onMount` | `segment` | Timer label and target duration |
| `onUnmount` | `segment` | Elapsed time and completion context |

### SoundCueBehavior

**Lifecycle**: `onMount` (subscribes to `tick` events)

Plays audio cues at specific countdown thresholds by emitting milestone outputs
with SoundFragment data.

## Usage Example

```typescript
// Behaviors compose to create a countdown timer block
const block = new RuntimeBlock('timer-1', {
    behaviors: [
        new CountdownTimerBehavior(),     // Opens span, tick/pause/resume subs, completion check
        new CompletionTimestampBehavior(), // Records completion timestamp
        new ExitBehavior(),               // Pops block when complete
        new LabelingBehavior(),           // Display state
        new ReportOutputBehavior(),       // Emits segment outputs
        new SoundCueBehavior({            // Audio cues
            cues: [
                { sound: 'beep', trigger: 'countdown', atSeconds: [3, 2, 1] }
            ] 
        })
    ]
});
```

## Related Memory Types

- [`DisplayState`](DisplayState.md) - UI presentation derived from timer state
- [`CompletionState`](CompletionState.md) - Tracks block completion status
