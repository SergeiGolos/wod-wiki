# IEventHandler

> Interface for handling runtime events and producing actions

## Definition

```typescript
interface IEventHandler {
    /** Unique identifier for this handler */
    readonly id: string;

    /** Name of the handler for logging/debugging */
    readonly name: string;

    /**
     * Handles the event and returns an array of actions to execute.
     * @param event The event to handle
     * @param runtime Runtime context for event processing
     * @returns Array of actions to execute (empty if event not handled)
     */
    handler(event: IEvent, runtime: IScriptRuntime): IRuntimeAction[];
}
```

## Purpose

`IEventHandler` is the low-level interface for event processing. It receives events from the [[IEventBus]] and produces [[IRuntimeAction]] instances for execution.

> **Note**: Most behaviors should use `IBehaviorContext.subscribe()` instead of implementing `IEventHandler` directly. The context provides automatic cleanup and scoped event handling.

## Handler Contract

| Aspect | Behavior |
|--------|----------|
| **Empty array** | Event not handled or no actions needed |
| **Non-empty array** | Actions to execute in order |
| **Exceptions** | Should be caught and converted to `ErrorAction` |

## Usage Pattern

### Direct Registration (Advanced)

```typescript
const handler: IEventHandler = {
    id: 'completion-sweeper',
    name: 'CompletionSweeper',
    handler: (event, runtime) => {
        if (event.name !== 'tick') return [];
        
        const current = runtime.stack.current;
        if (current?.isComplete()) {
            return [new PopBlockAction(current.key)];
        }
        return [];
    }
};

eventBus.register('tick', handler, 'runtime', { 
    scope: 'global', 
    priority: 100 
});
```

### Behavior Subscription (Recommended)

For most use cases, prefer `IBehaviorContext.subscribe()`:

```typescript
class TimerCompletionBehavior implements IRuntimeBehavior {
    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // This internally creates an IEventHandler
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

## Handler Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. Registration                                                    │
│     eventBus.register(eventName, handler, ownerId, options)        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. Event Dispatch                                                  │
│     eventBus.emit(event, runtime)                                  │
│     → Finds matching handlers by event name                         │
│     → Filters by scope (active/bubble/global)                       │
│     → Sorts by priority                                             │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. Handler Invocation                                              │
│     handler.handler(event, runtime)                                │
│     → Returns IRuntimeAction[]                                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. Action Execution                                                │
│     runtime.do(action) for each returned action                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. Cleanup (on owner disposal)                                     │
│     eventBus.unregisterByOwner(ownerId)                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Error Handling

Handlers should not throw exceptions. Use `ErrorAction` instead:

```typescript
handler: (event, runtime) => {
    try {
        // Processing logic
        return [new SomeAction()];
    } catch (error) {
        return [new ErrorAction(error as Error)];
    }
}
```

## Deprecated Types

```typescript
/**
 * @deprecated Use IRuntimeAction[] directly instead
 */
type EventHandlerResponse = {
    handled: boolean;
    abort: boolean;
    actions: IRuntimeAction[];
};
```

## Related Interfaces

- [[IEvent]] - Event structure passed to handler
- [[IEventBus]] - Registration and dispatch
- [[IBehaviorContext]] - Preferred subscription mechanism
- [[IRuntimeAction]] - Actions produced by handlers

## Source Files

- `src/runtime/contracts/events/IEventHandler.ts`
