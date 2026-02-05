# IEvent

> Base interface for runtime events in the WOD Wiki system

## Definition

```typescript
interface IEvent {
    /** Name/type of the event */
    name: string;
    
    /** Timestamp when the event occurred */
    timestamp: Date;
    
    /** Additional event data */
    data?: unknown;
}
```

## Design Principle

**Events are for external input only.** Internal behaviors should:
- **Subscribe** to events (via `ctx.subscribe()`)
- **Not emit** events for internal coordination
- Use **memory** for state changes
- Use **outputs** for recording/reporting

### Event Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        External Sources                              │
│  ┌─────────┐  ┌─────────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │  Clock  │  │  UI Buttons │  │  User Actions │  │  Sensors     │  │
│  └────┬────┘  └──────┬──────┘  └───────┬───────┘  └──────┬───────┘  │
└───────┼──────────────┼─────────────────┼─────────────────┼──────────┘
        │              │                 │                 │
        ▼              ▼                 ▼                 ▼
     ┌──────────────────────────────────────────────────────────┐
     │                      EventBus                             │
     │   emit({ name: 'tick', timestamp, data })                │
     └──────────────────────────────────────────────────────────┘
                              │
                              ▼
     ┌──────────────────────────────────────────────────────────┐
     │                     Behaviors                             │
     │   ctx.subscribe('tick', (event, ctx) => { ... })        │
     └──────────────────────────────────────────────────────────┘
```

## Standard Event Types

### External Events (Emitted by Runtime/UI)

| Event | Source | Purpose |
|-------|--------|---------|
| `tick` | Clock | Periodic timer update |
| `timer:pause` | UI Button | User pauses timer |
| `timer:resume` | UI Button | User resumes timer |
| `block:next` | UI Button | User advances block |
| `workout:stop` | UI Button | User stops workout |
| `user:skip` | UI Button | User skips exercise |

### Behavior Event Types

```typescript
type BehaviorEventType = 'tick' | 'next' | 'timer:complete' | 'pause' | 'resume' | '*';
```

## Event Subscription

Behaviors subscribe to events through `IBehaviorContext`:

```typescript
class TimerCompletionBehavior implements IRuntimeBehavior {
    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        ctx.subscribe('tick', (event, tickCtx) => {
            const timer = tickCtx.getMemory('timer');
            if (timer && elapsed >= timer.durationMs) {
                tickCtx.markComplete('timer-expired');
            }
            return [];
        });
        return [];
    }
}
```

## Event Data Examples

```typescript
// Clock tick
{
    name: 'tick',
    timestamp: new Date(),
    data: { source: 'clock' }
}

// Pause button
{
    name: 'timer:pause',
    timestamp: new Date(),
    data: { buttonId: 'pause' }
}

// User advance
{
    name: 'block:next',
    timestamp: new Date(),
    data: { reason: 'user-click' }
}
```

## Anti-Patterns

❌ **Don't emit events from behaviors for internal coordination:**

```typescript
// BAD - Internal event emission
ctx.emitEvent({ name: 'timer:complete', ... });
```

✅ **Do use memory and markComplete:**

```typescript
// GOOD - Use completion mechanism
ctx.markComplete('timer-expired');
```

❌ **Don't emit events for state changes:**

```typescript
// BAD - Event for state notification
ctx.emitEvent({ name: 'round:advance', ... });
```

✅ **Do update memory (observable by UI):**

```typescript
// GOOD - Memory update
ctx.setMemory('round', { current: round.current + 1, total: round.total });
```

## Related Interfaces

- [[IEventBus]] - Event dispatch and registration
- [[IEventHandler]] - Handler interface for event processing
- [[IOutputStatement]] - For recording (not coordinating)

## Source Files

- `src/runtime/contracts/events/IEvent.ts`
- `src/runtime/contracts/events/IEventBus.ts`
- `src/runtime/contracts/events/IEventHandler.ts`
