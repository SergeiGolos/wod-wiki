# CompletionState Memory

The `completion` memory type tracks whether a block has completed and the reason for completion.

## Type Definition

```typescript
interface CompletionState {
    /** Whether block is marked complete */
    readonly isComplete: boolean;
    
    /** Reason for completion */
    readonly reason?: 'timer-expired' | 'rounds-complete' | 'user-advance' | 'manual' | string;
    
    /** Timestamp of completion (epoch ms) */
    readonly completedAt?: number;
}
```

## Memory Key

- **Key**: `'completion'`
- **Value Type**: `CompletionState`

## Completion Reasons

| Reason            | Description                  | Trigger                   |
| ----------------- | ---------------------------- | ------------------------- |
| `timer-expired`   | Countdown timer reached zero | `CountdownTimerBehavior`  |
| `rounds-complete` | All rounds exhausted         | `ExitBehavior`            |
| `user-advance`    | User manually advanced       | User action               |
| `manual`          | Programmatically completed   | API call                  |

## Behaviors That Trigger Completion

### CountdownTimerBehavior

**Lifecycle**: `onMount` (subscribes to `tick` events)

Marks block complete when countdown timer expires.

```typescript
// Monitors timer on each tick
const elapsed = calculateElapsed(timer, now);
if (elapsed >= timer.durationMs) {
    ctx.markComplete('timer-expired');
}
```

### ExitBehavior (unified completion)

**Lifecycle**: `onMount` (subscribes to events for immediate mode), `onNext` (pop logic)

Unified completion behavior that handles block popping. Replaces the deprecated
`LeafExitBehavior`, `CompletedBlockPopBehavior`, and `RoundsEndBehavior`.

```typescript
// On next, checks if block is complete and produces pop action
if (ctx.block.isComplete) {
    return [new PopBlockAction(ctx.block.key)];
}
```

### CompletionTimestampBehavior

**Lifecycle**: `onNext` (records completion timestamp)

Universal invariant behavior that records the timestamp when a block completes.
Ensures `completedAt` is populated for analytics/history.

## BehaviorContext API

The `markComplete` method on `IBehaviorContext` sets completion state:

```typescript
interface IBehaviorContext {
    /** Mark the current block as complete */
    markComplete(reason: string): void;
}
```

This typically:
1. Sets `completion` memory with `isComplete: true`
2. Records the `reason` and `completedAt` timestamp
3. Triggers block transition in the runtime stack

## Completion Flow

```
┌──────────────────┐
│  Block Running   │
│  isComplete: false│
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Completion Trigger                  │
│  - Timer expires (TimerCompletion)   │
│  - Rounds exhausted (RoundCompletion)│
│  - User action                       │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  Block Complete  │
│  isComplete: true│
│  reason: '...'   │
│  completedAt: ...│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Runtime Stack   │
│  pops block      │
│  pushes next     │
└──────────────────┘
```

## Usage Example

```typescript
// Check if block is complete
const completion = ctx.getMemory('completion');
if (completion?.isComplete) {
    console.log(`Block completed: ${completion.reason}`);
    console.log(`At: ${new Date(completion.completedAt!)}`);
}
```

## Zero-Duration Timer Handling

`CountdownTimerBehavior` handles edge case of zero-duration timers:

```typescript
// On mount, check for immediate completion
if (timer.durationMs !== undefined && timer.durationMs <= 0) {
    ctx.markComplete('timer-expired');
    return [];
}
```

## Related Memory Types

- [`TimerState`](TimerState.md) - Source for timer-based completion
- [`RoundState`](RoundState.md) - Source for round-based completion
