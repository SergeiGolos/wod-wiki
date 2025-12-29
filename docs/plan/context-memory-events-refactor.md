# Context-Based Memory Events Refactor

> **Status**: ✅ ALL PHASES COMPLETE  
> **Created**: 2025-12-28  
> **Updated**: 2025-12-28  
> **Goal**: Move memory event dispatching responsibility from centralized `RuntimeMemory` bridge to `BlockContext`, and refactor `RuntimeReporter` to be an event subscriber rather than a memory allocator.

---

## Executive Summary

The current architecture uses a centralized "dispatcher bridge" pattern where `ScriptRuntime` injects a callback into `RuntimeMemory` to translate low-level memory operations into `EventBus` events. This creates an implicit coupling and requires special handling in test utilities.

This refactor moves memory event dispatching responsibility to `BlockContext`, making it the single point of control for block-owned memory operations. Additionally, `RuntimeReporter` will be refactored to implement `IEventHandler` and subscribe to memory/stack events rather than directly allocating memory.

---

## Current Architecture

### Memory Event Flow (Before)

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  BlockContext   │─────────│  RuntimeMemory  │─────────│   EventBus      │
│  .allocate()    │         │  ._dispatcher() │         │  .dispatch()    │
└─────────────────┘         └────────┬────────┘         └─────────────────┘
                                     │
                            set by ScriptRuntime
                            in constructor
```

### Key Files Involved

| File | Current Role |
|------|--------------|
| `IRuntimeMemory.ts` | Defines `MemoryEventDispatcher` callback type |
| `RuntimeMemory.ts` | Stores and invokes `_eventDispatcher` on allocate/set/release |
| `ScriptRuntime.ts` | Wires memory → EventBus bridge in constructor |
| `BlockContext.ts` | Wraps memory operations but delegates entirely to `RuntimeMemory` |
| `TestableRuntime.ts` | Must also implement `setEventDispatcher` passthrough |
| `ExecutionTracker.ts` | `RuntimeReporter` directly allocates memory for spans |

---

## Target Architecture

### Memory Event Flow (After)

```
┌─────────────────┐         ┌─────────────────┐
│  BlockContext   │─────────│   EventBus      │
│  .allocate()    │         │  .dispatch()    │
│  .set()         │         │                 │
│  .release()     │         │  ┌────────────┐ │
└─────────────────┘         │  │ Tracker    │ │
         │                  │  │ (Handler)  │ │
         ▼                  │  └────────────┘ │
┌─────────────────┐         └─────────────────┘
│  RuntimeMemory  │
│  (Pure Storage) │
└─────────────────┘
```

### Design Principles

1. **BlockContext as Gatekeeper**: All block memory operations go through BlockContext, which dispatches events.
2. **RuntimeMemory is Pure**: No callback hooks, no event awareness—just storage.
3. **RuntimeReporter as Subscriber**: Implements `IEventHandler`, listens to `memory:*` and `stack:*` events.
4. **Only Blocks Allocate Memory**: Non-block components observe state changes via events.

---

## Phase 1: BlockContext Event Dispatching

### 1.1 Add EventBus Reference to BlockContext

```typescript
// BlockContext.ts
export class BlockContext implements IBlockContext {
    constructor(
        private readonly runtime: IScriptRuntime,
        public readonly ownerId: string,
        public readonly exerciseId: string = '',
        initialReferences: IMemoryReference[] = []
    ) {
        // runtime.eventBus is already accessible
    }
}
```

### 1.2 Dispatch Events from BlockContext Methods

Update `allocate()`:
```typescript
allocate<T>(type, initialValue?, visibility?): TypedMemoryReference<T> {
    // ... validation ...
    const ref = this.runtime.memory.allocate<T>(typeStr, this.ownerId, initialValue, visibility);
    this._references.push(ref);
    
    // NEW: Dispatch event
    this.runtime.eventBus.dispatch(
        new MemoryAllocateEvent(ref, initialValue),
        this.runtime
    );
    
    return ref;
}
```

Update `release()`:
```typescript
release(): void {
    if (this._released) return;
    
    for (const ref of this._references) {
        const lastValue = ref.value();
        this.runtime.memory.release(ref);
        
        // NEW: Dispatch event
        this.runtime.eventBus.dispatch(
            new MemoryReleaseEvent(ref, lastValue),
            this.runtime
        );
    }
    
    this._references = [];
    this._released = true;
}
```

### 1.3 Add `set()` Method to BlockContext

Currently, behaviors call `ref.set(value)` directly. We need a context-aware alternative:

```typescript
// IBlockContext.ts
set<T>(reference: TypedMemoryReference<T>, value: T): void;

// BlockContext.ts
set<T>(reference: TypedMemoryReference<T>, value: T): void {
    if (this._released) {
        throw new Error(`Cannot set on released context (ownerId: ${this.ownerId})`);
    }
    
    const oldValue = reference.get();
    this.runtime.memory.set(reference, value);
    
    // Dispatch event
    this.runtime.eventBus.dispatch(
        new MemorySetEvent(reference, value, oldValue),
        this.runtime
    );
}
```

### 1.4 Migration Strategy for `ref.set()`

**Option A: Gradual Deprecation**
- Keep `ref.set()` working but log deprecation warnings.
- Behaviors migrate to `context.set(ref, value)` over time.

**Option B: Remove Direct Set (Breaking)**
- `TypedMemoryReference.set()` becomes internal-only.
- All behaviors must use context.

**Recommended**: Option A for backward compatibility.

---

## Phase 2: Remove Centralized Dispatcher

### 2.1 Remove from IRuntimeMemory

```typescript
// IRuntimeMemory.ts - REMOVE
// export type MemoryEventDispatcher = ...
// setEventDispatcher(dispatcher: MemoryEventDispatcher | null): void;
```

### 2.2 Remove from RuntimeMemory

```typescript
// RuntimeMemory.ts - REMOVE
// private _eventDispatcher: MemoryEventDispatcher | null = null;
// setEventDispatcher(dispatcher: MemoryEventDispatcher | null): void { ... }
// this._eventDispatcher?.('allocate', ref, initialValue);
// this._eventDispatcher?.('set', reference, value, oldValue);
// this._eventDispatcher?.('release', reference, lastValue);
```

### 2.3 Remove from ScriptRuntime

```typescript
// ScriptRuntime.ts - REMOVE
// this.memory.setEventDispatcher((eventType, ref, value, oldValue) => { ... });

// dispose() - REMOVE
// this.memory.setEventDispatcher(null);
```

### 2.4 Remove from TestableRuntime

```typescript
// TestableRuntime.ts - REMOVE from _createWrappedMemory()
// setEventDispatcher(dispatcher) { original.setEventDispatcher(dispatcher); }
```

---

## Phase 3: RuntimeReporter as Event Handler

### 3.1 Create SpanTrackingHandler

```typescript
// src/tracker/SpanTrackingHandler.ts
import { IEventHandler } from '../runtime/contracts/events/IEventHandler';
import { IEvent } from '../runtime/contracts/events/IEvent';
import { IScriptRuntime } from '../runtime/contracts/IScriptRuntime';
import { IRuntimeAction } from '../runtime/contracts/IRuntimeAction';
import { StackPushEvent, StackPopEvent } from '../runtime/events/StackEvents';

export class SpanTrackingHandler implements IEventHandler {
    readonly id = crypto.randomUUID();
    readonly name = 'span-tracking-handler';
    
    // In-memory span storage (no longer in RuntimeMemory)
    private _activeSpans = new Map<string, RuntimeSpan>();
    private _completedSpans: RuntimeSpan[] = [];
    
    handler(event: IEvent, runtime: IScriptRuntime): IRuntimeAction[] {
        switch (event.name) {
            case 'stack:push':
                return this.handleStackPush(event as StackPushEvent, runtime);
            case 'stack:pop':
                return this.handleStackPop(event as StackPopEvent, runtime);
            case 'memory:set':
                return this.handleMemorySet(event, runtime);
            default:
                return [];
        }
    }
    
    private handleStackPush(event: StackPushEvent, _runtime: IScriptRuntime): IRuntimeAction[] {
        const block = event.data.blocks[event.data.blocks.length - 1];
        if (block) {
            const span = new RuntimeSpan(block.key.toString(), block.sourceIds || []);
            this._activeSpans.set(block.key.toString(), span);
        }
        return [];
    }
    
    private handleStackPop(event: StackPopEvent, _runtime: IScriptRuntime): IRuntimeAction[] {
        // Find which block was popped by comparing before/after
        // Move from active to completed
        return [];
    }
    
    // Query API
    getActiveSpan(blockId: string): RuntimeSpan | null {
        return this._activeSpans.get(blockId) ?? null;
    }
    
    getAllSpans(): RuntimeSpan[] {
        return [...this._activeSpans.values(), ...this._completedSpans];
    }
}
```

### 3.2 Register Handler in ScriptRuntime

```typescript
// ScriptRuntime.ts
constructor(...) {
    // ...existing setup...
    
    // Register span tracking handler
    this._spanTracker = new SpanTrackingHandler();
    this.eventBus.register('stack:push', this._spanTracker, 'runtime');
    this.eventBus.register('stack:pop', this._spanTracker, 'runtime');
    this.eventBus.register('memory:set', this._spanTracker, 'runtime');
}

get tracker(): SpanTrackingHandler {
    return this._spanTracker;
}
```

### 3.3 Deprecate RuntimeReporter Memory Access

```typescript
// ExecutionTracker.ts
/**
 * @deprecated Use SpanTrackingHandler instead.
 * This class will be removed after migration.
 */
export class RuntimeReporter { ... }
```

---

## Phase 4: Testing Updates

### 4.1 Update Test Harness

The `TestableRuntime` and `MockBlock` utilities need updates to work with the new architecture:

```typescript
// TestableRuntime.ts
// No longer needs setEventDispatcher passthrough
// Memory operations are tracked via BlockContext event dispatch
```

### 4.2 Test Cases to Add

| Test | Description |
|------|-------------|
| `context-memory-events.test.ts` | Verify BlockContext dispatches events on allocate/set/release |
| `span-tracking-handler.test.ts` | Verify handler receives and processes stack/memory events |
| `no-direct-memory-events.test.ts` | Verify RuntimeMemory no longer dispatches events |

### 4.3 Test Cases to Update

| Test | Change Needed |
|------|---------------|
| `runtime-hooks.test.ts` | May rely on centralized dispatcher |
| `stack-disposal.test.ts` | Check event verification approach |
| Block behavior tests | If they verify memory events |

---

## Migration Checklist

### Phase 1: BlockContext Event Dispatching ✅ COMPLETE
- [x] Add `set<T>()` method to `IBlockContext`
- [x] Implement event dispatch in `BlockContext.allocate()`
- [x] Implement event dispatch in `BlockContext.release()`
- [x] Implement event dispatch in `BlockContext.set()`
- [ ] Add deprecation warning to `TypedMemoryReference.set()` (optional - deferred)

### Phase 2: Remove Centralized Dispatcher ✅ COMPLETE
- [x] Remove `MemoryEventDispatcher` type from `IRuntimeMemory.ts`
- [x] Remove `setEventDispatcher()` from `IRuntimeMemory.ts`
- [x] Remove `_eventDispatcher` from `RuntimeMemory.ts`
- [x] Remove dispatcher calls from `RuntimeMemory.allocate/set/release`
- [x] Remove bridge wiring from `ScriptRuntime` constructor
- [x] Remove `setEventDispatcher(null)` from `ScriptRuntime.dispose()`
- [x] Remove passthrough from `TestableRuntime._createWrappedMemory()`

### Phase 3: RuntimeReporter as Event Handler ✅ COMPLETE
- [x] Create `SpanTrackingHandler` implementing `IEventHandler`
- [x] Implement `handler()` for `stack:push`, `stack:pop`
- [x] Add query methods (`getActiveSpan`, `getAllSpans`, etc.)
- [x] Register handler in `ScriptRuntime` constructor
- [x] Expose tracker via `runtime.tracker` property
- [x] ~~Deprecate~~ **Removed** `RuntimeReporter` class entirely
- [x] UI components using `activeSpans` already compatible (no changes needed)

### Phase 4: Testing & Cleanup ✅ COMPLETE
- [x] Removed deprecated `RuntimeReporter` from `ScriptRuntime`
- [x] Removed `ExecutionTracker.ts` (contained deprecated `RuntimeReporter`)
- [x] Removed `ITrackerCommand.ts` and `commands/` folder (only used by RuntimeReporter)
- [x] Removed `ExecutionTracker.test.ts`
- [x] Removed `MemoryEventDispatcher` from contracts index exports
- [x] Updated documentation comments

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Behaviors using `ref.set()` break silently | Add deprecation logging; keep working during transition |
| Performance regression from extra event dispatch | Profile; events are already being dispatched, just from different location |
| UI components expecting memory-based spans | `SpanTrackingHandler` exposes same query API |
| Test utilities relying on dispatcher | Update `TestableRuntime` first |

---

## Future Considerations

1. **Event Batching**: If many memory sets happen in a tick, consider batching events.
2. **Selective Subscription**: Allow handlers to subscribe to specific memory types.
3. **Span Persistence**: `SpanTrackingHandler` could optionally persist to storage for analytics.
