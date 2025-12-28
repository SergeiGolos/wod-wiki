# Context Memory Events Refactor Plan

> **Created:** 2025-12-28  
> **Status:** In Progress  
> **Purpose:** Add memory event handling capabilities to BlockContext for scoped event subscriptions

---

## Executive Summary

This refactor adds memory event subscription capabilities directly to `IBlockContext` and `BlockContext`, allowing blocks and behaviors to subscribe to memory changes in a scoped, owner-specific way without using the deprecated `RuntimeMemory.subscribe()` method.

---

## Current State

### Current Architecture

```
RuntimeMemory
    ├── allocate() → dispatches 'memory:allocate' via eventDispatcher
    ├── set() → dispatches 'memory:set' via eventDispatcher  
    ├── release() → dispatches 'memory:release' via eventDispatcher
    └── subscribe() [DEPRECATED] → global callback for all memory changes

ScriptRuntime
    └── setEventDispatcher() → connects memory events to EventBus

BlockContext
    ├── allocate() → delegates to runtime.memory.allocate()
    ├── get() → retrieves memory references
    ├── release() → releases all allocated memory
    └── No event subscription capability
```

### Problem

1. `RuntimeMemory.subscribe()` is deprecated - consumers should use EventBus
2. Behaviors that need to react to memory changes must register global EventBus handlers
3. No scoped way to subscribe only to memory changes for a specific block's references
4. Cleanup of subscriptions is manual and error-prone

---

## Target Architecture

```
BlockContext
    ├── allocate() → delegates + tracks reference
    ├── get() → retrieves memory references
    ├── release() → releases all memory + unsubscribes all listeners
    ├── onAllocate(callback) → subscribe to allocate events for this context
    ├── onSet(callback) → subscribe to set events for this context
    ├── onRelease(callback) → subscribe to release events for this context
    └── onAny(callback) → subscribe to any memory event for this context
```

---

## Interface Changes

### IBlockContext Additions

```typescript
/**
 * Callback type for memory event subscriptions.
 */
export type MemoryEventCallback<T = unknown> = (
    ref: IMemoryReference,
    value: T,
    oldValue?: T
) => void;

export interface IBlockContext {
    // ... existing methods ...
    
    /**
     * Subscribe to allocate events for memory owned by this context.
     * Returns an unsubscribe function.
     */
    onAllocate<T = unknown>(callback: MemoryEventCallback<T>): () => void;
    
    /**
     * Subscribe to set events for memory owned by this context.
     * Returns an unsubscribe function.
     */
    onSet<T = unknown>(callback: MemoryEventCallback<T>): () => void;
    
    /**
     * Subscribe to release events for memory owned by this context.
     * Returns an unsubscribe function.
     */
    onRelease<T = unknown>(callback: MemoryEventCallback<T>): () => void;
    
    /**
     * Subscribe to any memory event for memory owned by this context.
     * Returns an unsubscribe function.
     */
    onAny<T = unknown>(callback: MemoryEventCallback<T>): () => void;
}
```

---

## Implementation Plan

### Phase 1: Add Type Definitions

1. Add `MemoryEventCallback` type to `IBlockContext.ts`
2. Add subscription method signatures to `IBlockContext` interface

### Phase 2: Implement BlockContext Subscriptions

1. Store subscriptions in BlockContext
2. Register EventBus handlers that filter by ownerId
3. Auto-unsubscribe on release()

### Phase 3: Add Tests

1. Test subscription to allocate events
2. Test subscription to set events  
3. Test subscription to release events
4. Test auto-cleanup on context release
5. Test filtering (only receives events for own references)

### Phase 4: Update Documentation

1. Update CLAUDE.md if needed
2. Add JSDoc examples

---

## Usage Examples

### Before (Using deprecated subscribe)

```typescript
class TimerBehavior implements IRuntimeBehavior {
    private unsubscribe?: () => void;
    
    onMount(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        // DEPRECATED: Global subscription
        this.unsubscribe = runtime.memory.subscribe((ref, value, oldValue) => {
            if (ref.ownerId === block.key.toString()) {
                // Handle memory change
            }
        });
        return [];
    }
    
    onUnmount(): void {
        this.unsubscribe?.();
    }
}
```

### After (Using BlockContext)

```typescript
class TimerBehavior implements IRuntimeBehavior {
    constructor(private readonly context: IBlockContext) {}
    
    onMount(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        // Scoped subscription - auto-filters by owner
        // Auto-cleans up when context.release() is called
        this.context.onSet((ref, value, oldValue) => {
            // Handle memory change for this block only
        });
        return [];
    }
    
    // No manual cleanup needed!
}
```

---

## Migration Notes

- Existing code using `RuntimeMemory.subscribe()` should migrate to BlockContext subscriptions
- The deprecated `subscribe()` method remains for backwards compatibility
- BlockContext subscriptions are automatically cleaned up on release()

---

## Success Criteria

1. ✅ BlockContext can subscribe to memory events scoped to its ownerId
2. ✅ Subscriptions are automatically cleaned up on release()
3. ✅ All existing tests pass
4. ✅ New tests cover subscription functionality
