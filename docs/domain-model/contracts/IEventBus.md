# IEventBus

> Central event dispatch and registration system

## Definition

```typescript
interface IEventBus {
    /**
     * Register a full event handler that can produce runtime actions.
     * Used for runtime-internal event processing.
     */
    register(
        eventName: string,
        handler: IEventHandler,
        ownerId: string,
        options?: EventHandlerOptions
    ): () => void;

    /**
     * Register a simple callback for event notifications.
     * Used for UI components that need to react without producing actions.
     */
    on(eventName: string, callback: EventCallback, ownerId: string): () => void;

    /** Unregister a specific handler by ID */
    unregisterById(handlerId: string): void;
    
    /** Unregister all handlers owned by a specific block */
    unregisterByOwner(ownerId: string): void;
    
    /**
     * Dispatch an event and return resulting actions without executing.
     */
    dispatch(event: IEvent, runtime: IScriptRuntime): IRuntimeAction[];
    
    /**
     * Dispatch an event and execute all resulting actions immediately.
     * Primary entry point for event handling.
     */
    emit(event: IEvent, runtime: IScriptRuntime): void;
}
```

## Handler Scope

```typescript
type HandlerScope = 'active' | 'bubble' | 'global';
```

| Scope | When Handler Fires |
|-------|-------------------|
| `active` | Only when owner block is current/active on stack |
| `bubble` | When owner block is anywhere on the stack (parent listening) |
| `global` | Always fires regardless of stack state |

## Handler Options

```typescript
interface EventHandlerOptions {
    /** Handler priority (higher = executes first). Default: 0 */
    priority?: number;
    
    /** Handler scope. Default: 'active' */
    scope?: HandlerScope;
}
```

## Event Handler Interface

```typescript
interface IEventHandler {
    /** Unique identifier for this handler */
    readonly id: string;
    
    /** Name for logging/debugging */
    readonly name: string;
    
    /**
     * Handles event and returns actions to execute.
     * Empty array = event not handled or no actions.
     */
    handler(event: IEvent, runtime: IScriptRuntime): IRuntimeAction[];
}
```

## Usage Patterns

### Behavior Subscription (Recommended)

Behaviors should use `IBehaviorContext.subscribe()` which automatically:
- Registers with appropriate scope
- Cleans up on block unmount
- Provides context for memory access

```typescript
class TimerTickBehavior implements IRuntimeBehavior {
    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        ctx.subscribe('tick', (event, tickCtx) => {
            // Handle tick
            return [];
        });
        return [];
    }
}
```

### Direct Registration (Advanced)

For runtime-level handlers or UI components:

```typescript
// UI component listening for outputs
const unsubscribe = eventBus.on('output:emitted', (event, runtime) => {
    updateUI(event.data);
}, 'ui-component-id');

// Cleanup
unsubscribe();
```

### Full Handler Registration

For handlers that produce actions:

```typescript
eventBus.register('tick', {
    id: 'completion-checker',
    name: 'CompletionChecker',
    handler: (event, runtime) => {
        const current = runtime.stack.current;
        if (current?.isComplete()) {
            return [new PopBlockAction()];
        }
        return [];
    }
}, 'runtime', { scope: 'global', priority: 100 });
```

## Event Dispatch Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. Event Created                                                   │
│     { name: 'tick', timestamp: Date.now(), data: {} }              │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. EventBus.emit(event, runtime)                                   │
│     - Finds all matching handlers                                   │
│     - Filters by scope (active/bubble/global)                       │
│     - Sorts by priority (descending)                                │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. Handler Execution                                               │
│     - Each handler.handler(event, runtime) called                   │
│     - Actions collected                                             │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. Action Execution                                                │
│     - runtime.do(action) for each returned action                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Wildcard Subscription

Subscribe to all events using `'*'`:

```typescript
eventBus.on('*', (event, runtime) => {
    console.log(`Event: ${event.name}`, event.data);
}, 'logger');
```

## Cleanup Patterns

### Automatic (Behavior Subscription)

```typescript
// Cleanup happens automatically on block unmount
ctx.subscribe('tick', handler);
```

### Manual (Direct Registration)

```typescript
const unsubscribe = eventBus.on('tick', callback, 'owner-id');
// Later...
unsubscribe();
```

### Owner-based Cleanup

```typescript
// Clean up all handlers for a block
eventBus.unregisterByOwner('block-key');
```

## Related Interfaces

- [[IEvent]] - Event structure
- [[IEventHandler]] - Handler interface
- [[IRuntimeBlock]] - Event sources/sinks
- [[03-runtime-layer|Runtime Layer]] - EventBus owner

## Source Files

- `src/runtime/contracts/events/IEventBus.ts`
- `src/runtime/contracts/events/IEventHandler.ts`
- `src/runtime/events/EventBus.ts` (implementation)
