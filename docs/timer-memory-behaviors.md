# Timer Memory Behaviors Reference

This document catalogs all behaviors that interact with the `timer` memory item, including which properties they read, write, and the lifecycle hooks they use.

## TimerState Schema

The `timer` memory item stores a `TimerState` object with the following structure:

```typescript
interface TimerState {
    /** Raw time segments being tracked. Aggregate to calculate elapsed time. */
    readonly spans: readonly TimeSpan[];
    
    /** Target duration in milliseconds (for countdowns or goals) */
    readonly durationMs?: number;
    
    /** Timer direction preference */
    readonly direction: TimerDirection;  // 'up' | 'down'
    
    /** Human-readable label for the timer */
    readonly label: string;
    
    /** Timer role for UI prioritization */
    readonly role?: 'primary' | 'secondary' | 'auto';
}

class TimeSpan {
    started: number;   // Epoch timestamp when span began
    ended?: number;    // Epoch timestamp when span ended (undefined if open)
}
```

---

## Behaviors Summary Table

| Behavior                  | Aspect         | Reads                              | Writes                                              | Lifecycle Hooks                                       |
| ------------------------- | -------------- | ---------------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `TimerInitBehavior`       | Time           | -                                  | `spans`, `direction`, `durationMs`, `label`, `role` | `onMount`                                             |
| `TimerTickBehavior`       | Time           | `spans`                            | `spans` (closes span)                               | `onMount`, `onUnmount`                                |
| `TimerPauseBehavior`      | Time/Controls  | `spans`                            | `spans` (closes/opens spans)                        | `onMount` (subscribes)                                |
| `TimerCompletionBehavior` | Completion     | `direction`, `durationMs`, `spans` | -                                                   | `onMount`, `onMount` (tick subscription)              |
| `TimerOutputBehavior`     | Output         | `durationMs`, `label`, `spans`     | -                                                   | `onMount`, `onUnmount`                                |
| `SoundCueBehavior`        | Output/Audio   | `direction`, `durationMs`, `spans` | -                                                   | `onMount`, `onMount` (tick subscription), `onUnmount` |
| `HistoryRecordBehavior`   | Output/History | `direction`, `durationMs`, `spans` | -                                                   | `onUnmount`                                           |

---

## Detailed Behavior Analysis

### TimerInitBehavior

**Aspect:** Time  
**Purpose:** Initializes timer state in block memory.

#### Configuration
```typescript
interface TimerInitConfig {
    direction: TimerDirection;       // 'up' | 'down'
    durationMs?: number;             // Required for countdown
    label?: string;                  // Human-readable label
    role?: 'primary' | 'secondary' | 'hidden';
}
```

#### Property Interactions

| Hook | Property | Operation | Description |
|------|----------|-----------|-------------|
| `onMount` | `direction` | **WRITE** | Sets from config |
| `onMount` | `durationMs` | **WRITE** | Sets from config |
| `onMount` | `spans` | **WRITE** | Creates initial `TimeSpan(now)` |
| `onMount` | `label` | **WRITE** | Sets from config or block label |
| `onMount` | `role` | **WRITE** | Sets from config, converts 'hidden' to 'auto' |

#### Events Emitted
- `timer:started` with `{ blockKey, direction, durationMs }`

---

### TimerTickBehavior

**Aspect:** Time  
**Purpose:** Updates timer state on unmount by closing the active span.

#### Property Interactions

| Hook | Property | Operation | Description |
|------|----------|-----------|-------------|
| `onMount` | `spans` | **READ** | Subscribes to tick events (no-op, UI computes elapsed) |
| `onUnmount` | `spans` | **READ/WRITE** | Closes the last open span by setting `ended = now` |

#### Notes
- The tick subscription is a no-op because UI computes elapsed time directly from spans
- Span closure on unmount ensures accurate elapsed time calculation

---

### TimerPauseBehavior

**Aspect:** Time (Controls)  
**Purpose:** Handles pause/resume by closing and opening time spans.

#### Property Interactions

| Hook | Event | Property | Operation | Description |
|------|-------|----------|-----------|-------------|
| `onMount` | `timer:pause` | `spans` | **READ/WRITE** | Closes last span by setting `ended = now` |
| `onMount` | `timer:resume` | `spans` | **READ/WRITE** | Opens new span by appending `TimeSpan(now)` |

#### Internal State
- Tracks `isPaused: boolean` to prevent duplicate pause/resume

#### Events Emitted
- `timer:paused` with `{ blockKey }`
- `timer:resumed` with `{ blockKey }`

---

### TimerCompletionBehavior

**Aspect:** Completion (Time-based)  
**Purpose:** Marks block complete when countdown timer expires.

#### Property Interactions

| Hook | Property | Operation | Description |
|------|----------|-----------|-------------|
| `onMount` | `direction` | **READ** | Checks if countdown (direction === 'down') |
| `onMount` | `durationMs` | **READ** | Checks for zero-duration immediate completion |
| `onMount` (tick) | `spans` | **READ** | Calculates elapsed time from all spans |
| `onMount` (tick) | `durationMs` | **READ** | Compares elapsed to duration |

#### Elapsed Calculation
```typescript
function calculateElapsed(timer: TimerState, now: number): number {
    let total = 0;
    for (const span of timer.spans) {
        const end = span.ended ?? now;
        total += end - span.started;
    }
    return total;
}
```

#### Completion Trigger
- Calls `ctx.markComplete('timer-expired')` when `elapsed >= durationMs`

#### Events Emitted
- `timer:complete` with `{ blockKey, elapsedMs, durationMs }`

---

### TimerOutputBehavior

**Aspect:** Output (Timer)  
**Purpose:** Emits segment/completion output statements with timer data.

#### Property Interactions

| Hook | Property | Operation | Description |
|------|----------|-----------|-------------|
| `onMount` | `durationMs` | **READ** | Creates duration fragment if present |
| `onMount` | `label` | **READ** | Uses for segment output label |
| `onUnmount` | `spans` | **READ** | Calculates final elapsed time |
| `onUnmount` | `label` | **READ** | Uses for completion output label |

#### Outputs Emitted
- `segment` on mount with duration fragment (origin: 'parser')
- `completion` on unmount with elapsed fragment (origin: 'runtime')

---

### SoundCueBehavior

**Aspect:** Output (Audio)  
**Purpose:** Plays audio cues at lifecycle points and countdown thresholds.

#### Configuration
```typescript
interface SoundCue {
    sound: string;
    trigger: 'mount' | 'unmount' | 'countdown' | 'complete';
    atSeconds?: number[];  // For countdown trigger
}
```

#### Property Interactions

| Hook | Event | Property | Operation | Description |
|------|-------|----------|-----------|-------------|
| `onMount` (tick) | tick | `direction` | **READ** | Checks countdown mode |
| `onMount` (tick) | tick | `durationMs` | **READ** | Calculates remaining time |
| `onMount` (tick) | tick | `spans` | **READ** | Computes elapsed for remaining calculation |

#### Remaining Time Calculation
```typescript
const remainingMs = timer.durationMs - elapsed;
const remainingSeconds = Math.ceil(remainingMs / 1000);
```

#### Events Emitted
- `sound:play` with `{ sound, blockKey }` on mount/unmount/complete
- `sound:play` with `{ sound, remainingSeconds, blockKey }` on countdown thresholds

---

### HistoryRecordBehavior

**Aspect:** Output (History)  
**Purpose:** Records block execution to workout history on unmount.

#### Property Interactions

| Hook | Property | Operation | Description |
|------|----------|-----------|-------------|
| `onUnmount` | `spans` | **READ** | Calculates total elapsed time |
| `onUnmount` | `direction` | **READ** | Includes in history record |
| `onUnmount` | `durationMs` | **READ** | Includes in history record |

#### Events Emitted
- `history:record` with `{ blockKey, blockType, label, completedAt, elapsedMs, timerDirection, timerDurationMs }`

---

## Behavior Composition Patterns

### Standard Countdown Timer
```typescript
builder
    .addBehavior(new TimerInitBehavior({ direction: 'down', durationMs: 60000 }))
    .addBehavior(new TimerTickBehavior())
    .addBehavior(new TimerPauseBehavior())
    .addBehavior(new TimerCompletionBehavior())
    .addBehavior(new TimerOutputBehavior())
    .addBehavior(new SoundCueBehavior({
        cues: [
            { sound: 'countdown-beep', trigger: 'countdown', atSeconds: [3, 2, 1] },
            { sound: 'timer-complete', trigger: 'complete' }
        ]
    }));
```

### Countup Timer (For Time)
```typescript
builder
    .addBehavior(new TimerInitBehavior({ direction: 'up' }))
    .addBehavior(new TimerTickBehavior())
    .addBehavior(new TimerPauseBehavior())
    .addBehavior(new PopOnNextBehavior())  // User advances instead of timer expiry
    .addBehavior(new TimerOutputBehavior());
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         MOUNT PHASE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TimerInitBehavior                                               │
│  ────────────────                                                │
│  ctx.setMemory('timer', {                                        │
│      direction: config.direction,                                │
│      durationMs: config.durationMs,                              │
│      spans: [new TimeSpan(now)],  ← Opens first span             │
│      label: config.label,                                        │
│      role: config.role                                           │
│  })                                                              │
│                                                                  │
│  ↓ emits timer:started                                           │
│                                                                  │
│  TimerOutputBehavior.onMount                                     │
│  ─────────────────────────                                       │
│  Reads: durationMs, label                                        │
│  ↓ emits segment output                                          │
│                                                                  │
│  SoundCueBehavior.onMount                                        │
│  ────────────────────────                                        │
│  ↓ emits sound:play (if mount trigger)                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      TICK SUBSCRIPTION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  On each 'tick' event:                                           │
│                                                                  │
│  TimerCompletionBehavior                                         │
│  ──────────────────────                                          │
│  Reads: direction, durationMs, spans                             │
│  Calculates: elapsed = Σ(span.ended ?? now - span.started)       │
│  If elapsed >= durationMs → markComplete('timer-expired')        │
│  ↓ emits timer:complete                                          │
│                                                                  │
│  SoundCueBehavior                                                │
│  ────────────────                                                │
│  Reads: direction, durationMs, spans                             │
│  Calculates: remainingSeconds                                    │
│  If remainingSeconds in atSeconds → emit sound:play              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    PAUSE/RESUME EVENTS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  On 'timer:pause':                                               │
│  ────────────────                                                │
│  TimerPauseBehavior                                              │
│  Reads: spans                                                    │
│  Writes: spans (closes last span: ended = now)                   │
│  ↓ emits timer:paused                                            │
│                                                                  │
│  On 'timer:resume':                                              │
│  ─────────────────                                               │
│  TimerPauseBehavior                                              │
│  Reads: spans                                                    │
│  Writes: spans (appends new TimeSpan(now))                       │
│  ↓ emits timer:resumed                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       UNMOUNT PHASE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TimerTickBehavior.onUnmount                                     │
│  ───────────────────────────                                     │
│  Reads: spans                                                    │
│  Writes: spans (closes last open span)                           │
│                                                                  │
│  TimerOutputBehavior.onUnmount                                   │
│  ─────────────────────────────                                   │
│  Reads: spans, label                                             │
│  Calculates: final elapsed time                                  │
│  ↓ emits completion output                                       │
│                                                                  │
│  HistoryRecordBehavior.onUnmount                                 │
│  ───────────────────────────────                                 │
│  Reads: spans, direction, durationMs                             │
│  ↓ emits history:record                                          │
│                                                                  │
│  SoundCueBehavior.onUnmount                                      │
│  ──────────────────────────                                      │
│  ↓ emits sound:play (if unmount/complete trigger)                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## See Also

- [Runtime API](./runtime-api.md)
- [Block Isolation Testing Guide](./deep-dives/block-isolation-testing-guide.md)
- Source: `src/runtime/behaviors/`
- Memory Types: `src/runtime/memory/MemoryTypes.ts`
