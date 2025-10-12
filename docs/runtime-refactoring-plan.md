# Runtime Interfaces Refactoring Plan

**Created**: 2025-10-11  
**Status**: Planning Phase  
**Related Documents**: 
- `notes/runtime-interfaces-catalog.md` - Interface catalog with TODO notes
- `notes/research-notes-on-actions.md` - Action architecture analysis

---

## Executive Summary

This document outlines a comprehensive refactoring plan for the WOD Wiki runtime system based on TODO notes in the runtime interfaces catalog. The refactoring aims to:

1. **Simplify lifecycle management** by renaming methods and clarifying responsibilities
2. **Improve memory management** with better subscription handling
3. **Enhance action system** with new declarative action types
4. **Remove unnecessary complexity** by eliminating redundant interfaces and patterns
5. **Create fully declarative event handling** to align with action-based architecture

---

## Table of Contents

1. [TODO Summary](#todo-summary)
2. [Phase 1: IRuntimeBlock Refactoring](#phase-1-iruntimeblock-refactoring)
3. [Phase 2: Memory System Improvements](#phase-2-memory-system-improvements)
4. [Phase 3: New Action Types](#phase-3-new-action-types)
5. [Phase 4: Event System Refactoring](#phase-4-event-system-refactoring)
6. [Phase 5: Cleanup and Removal](#phase-5-cleanup-and-removal)
7. [Impact Analysis](#impact-analysis)
8. [Testing Strategy](#testing-strategy)
9. [Migration Guide](#migration-guide)

---

## TODO Summary

### From runtime-interfaces-catalog.md

1. **IRuntimeBlock.push()** → Rename to `mount()` and update signature
2. **IRuntimeBlock.pop()** → Move existing functionality to `dispose()`
3. **IRuntimeBlock.dispose()** → Create additional actions for disposal logic
4. **IBlockContext.allocate()** → Change `type` parameter to `MemoryTypeEnum`
5. **IBlockContext.isReleased()** → Remove (not needed)
6. **IMemoryReference** → Add `value()` method and `subscription` property
7. **IMemorySubscription** → Make generic at memory level, remove `active` field
8. **SubscriptionOptions** → Remove (not needed)
9. **TypedMemoryReference.hasSubscribers()** → Remove (not needed)
10. **IEventHandler.handler()** → Update signature and response type
11. **EventHandlerResponse** → Remove or refactor to use error actions
12. **IStackValidator** → Remove entire interface (not needed)

### From research-notes-on-actions.md

13. **Create EmitEventAction** → For declarative event emission
14. **Create StartTimerAction** → For declarative timer start
15. **Create StopTimerAction** → For declarative timer stop
16. **Create RegisterEventAction** → For declarative handler registration
17. **Create UnregisterEventAction** → For declarative handler removal
18. **Create ErrorAction** → For pushing errors to runtime error list

---

## Phase 1: IRuntimeBlock Refactoring

### Overview
Rename lifecycle methods to better reflect their purpose and separate concerns between initialization, disposal, and cleanup.

### Changes

#### 1.1 Rename `push()` to `mount()`

**Current Interface:**
```typescript
push(): IRuntimeAction[]
```

**New Interface:**
```typescript
mount(runtime: IScriptRuntime): IRuntimeAction[]
```

**Rationale:**
- "Mount" better reflects React-like lifecycle semantics
- Adding `runtime` parameter allows blocks to access runtime during mounting
- More intuitive for developers familiar with component lifecycles

**Impact:**
- 🔴 **Breaking Change**: All `IRuntimeBlock` implementations must rename method
- Files affected: ~15-20 files
  - `src/runtime/RuntimeBlock.ts`
  - `src/runtime/strategies.ts` (3 strategies)
  - All test files with mock blocks (~10 files)

#### 1.2 Split `pop()` into `unmount()` and `dispose()`

**Current Interface:**
```typescript
pop(): IRuntimeAction[]
dispose(): void
```

**New Interface:**
```typescript
unmount(runtime: IScriptRuntime): IRuntimeAction[]  // Renamed from pop()
dispose(runtime: IScriptRuntime): void              // Enhanced cleanup
```

**Rationale:**
- `unmount()` handles final actions before removal (completion logic, result spans)
- `dispose()` handles resource cleanup (memory, event handlers, intervals)
- Clear separation of concerns

**Impact:**
- 🔴 **Breaking Change**: All implementations must implement both methods
- `PopBlockAction` must be updated to call both methods in sequence
- Files affected: ~20 files

#### 1.3 Update IRuntimeBlock.next() signature

**Current Interface:**
```typescript
next(): IRuntimeAction[]
```

**New Interface:**
```typescript
next(runtime: IScriptRuntime): IRuntimeAction[]
```

**Rationale:**
- Consistency with other lifecycle methods
- Allows direct runtime access without storing reference

**Impact:**
- 🟡 **Moderate Change**: All implementations must update signature
- Files affected: ~15 files

### Implementation Steps

1. ✅ Create new method signatures in `IRuntimeBlock.ts`
2. ✅ Update `RuntimeBlock.ts` base implementation
3. ✅ Update all strategy implementations (Effort, Timer, Rounds)
4. ✅ Update `PushBlockAction` to call `mount()` instead of `push()`
5. ✅ Update `PopBlockAction` to call both `unmount()` and `dispose()`
6. ✅ Update all test mocks and test files
7. ✅ Update behavior implementations
8. ✅ Run test suite to verify changes

### Testing Requirements

- **Unit Tests**: Update all `IRuntimeBlock` test mocks
- **Integration Tests**: Verify lifecycle sequence (mount → next → unmount → dispose)
- **Contract Tests**: Ensure behaviors receive runtime parameter correctly
- **Performance Tests**: Verify 50ms completion requirement still met

---

## Phase 2: Memory System Improvements

### Overview
Enhance memory reference system with better subscription management and type safety.

### Changes

#### 2.1 Add `MemoryTypeEnum`

**New Type:**
```typescript
export enum MemoryTypeEnum {
  TIMER_TIME_SPANS = 'timer-time-spans',
  TIMER_IS_RUNNING = 'timer-is-running',
  ROUNDS_CURRENT = 'rounds-current',
  ROUNDS_TOTAL = 'rounds-total',
  CHILD_INDEX = 'child-index',
  COMPLETION_STATUS = 'completion-status',
  RESULT_SPANS = 'result-spans',
  HANDLER_REGISTRY = 'handler-registry',
  METRIC_VALUES = 'metric-values',
}
```

**Impact:**
- ✅ **Non-Breaking**: Can be added without affecting existing code
- Provides type safety for memory allocation
- Prevents typos in memory type strings

#### 2.2 Update `IBlockContext.allocate()` signature

**Current:**
```typescript
allocate<T>(
  type: string, 
  initialValue?: T, 
  visibility?: 'public' | 'private'
): TypedMemoryReference<T>
```

**New:**
```typescript
allocate<T>(
  type: MemoryTypeEnum, 
  initialValue?: T, 
  visibility?: 'public' | 'private'
): TypedMemoryReference<T>
```

**Impact:**
- 🟡 **Moderate Change**: All allocate() calls must use enum
- Better type safety and IDE autocomplete
- Files affected: ~8 files (strategies and behaviors)

#### 2.3 Add `value()` method to `IMemoryReference`

**New Interface:**
```typescript
export interface IMemoryReference {
  readonly id: string;
  readonly ownerId: string;
  readonly type: string;
  readonly visibility: 'public' | 'private';
  
  // New method
  value(): any | undefined;
}
```

**Implementation in `TypedMemoryReference`:**
```typescript
value(): T | undefined {
  return this.get();
}
```

**Rationale:**
- Provides untyped access for generic operations
- Useful for debugging and inspection
- Maintains type safety through `TypedMemoryReference<T>.get()`

**Impact:**
- ✅ **Non-Breaking**: New optional method
- Files affected: 2 files (`IMemoryReference.ts`)

#### 2.4 Refactor `IMemorySubscription` to be generic

**Current:**
```typescript
export interface IMemorySubscription<T> {
  id: string;
  callback: (newValue: T | undefined, oldValue: T | undefined) => void;
  active: boolean;  // Remove this field
}
```

**New:**
```typescript
export interface IMemorySubscription {
  readonly id: string;
  readonly memoryRefId: string;
  readonly callback: (newValue: any, oldValue: any) => void;
  readonly createdAt: Date;
}
```

**Rationale:**
- Remove `active` flag - subscriptions are either in list or not
- Track creation time for debugging
- Store memory reference ID for tracking

**Impact:**
- 🟡 **Moderate Change**: Subscription management must be updated
- Files affected: 3 files (`IMemoryReference.ts`, `RuntimeMemory.ts`)

#### 2.5 Add subscriptions tracking to `IMemoryReference`

**New Interface:**
```typescript
export interface IMemoryReference {
  readonly id: string;
  readonly ownerId: string;
  readonly type: string;
  readonly visibility: 'public' | 'private';
  readonly subscriptions: ReadonlyArray<IMemorySubscription>;  // New property
  
  value(): any | undefined;
}
```

**Impact:**
- ✅ **Non-Breaking**: New readonly property
- Enables runtime memory inspection
- Files affected: 2 files

#### 2.6 Remove unnecessary methods/types

**Remove:**
- `TypedMemoryReference.hasSubscribers()` - Use `subscriptions.length > 0` instead
- `SubscriptionOptions` type - Simplify to just callback
- `IBlockContext.isReleased()` - Check via try/catch on allocate()

**Impact:**
- 🟡 **Moderate Change**: Some code must be refactored
- Simplifies API surface
- Files affected: ~5 files

### Implementation Steps

1. ✅ Create `MemoryTypeEnum` in new file `src/runtime/MemoryTypeEnum.ts`
2. ✅ Update `IMemoryReference` interface
3. ✅ Update `TypedMemoryReference` implementation
4. ✅ Refactor `IMemorySubscription` interface
5. ✅ Update `RuntimeMemory` subscription management
6. ✅ Update `IBlockContext.allocate()` signature
7. ✅ Update all allocation calls to use enum
8. ✅ Remove deprecated methods and types
9. ✅ Run memory-related tests

### Testing Requirements

- **Unit Tests**: Test subscription management without `active` flag
- **Memory Tests**: Verify `value()` method returns correct untyped data
- **Type Safety Tests**: Ensure enum prevents invalid type strings
- **Subscription Tests**: Test subscription lifecycle without options

---

## Phase 3: New Action Types

### Overview
Create new declarative action types to complete the action-based architecture as outlined in `research-notes-on-actions.md`.

### 3.1 EmitEventAction

**Purpose**: Declarative event emission from behaviors

**Implementation:**
```typescript
export class EmitEventAction implements IRuntimeAction {
  readonly type = 'emit-event';
  
  constructor(
    public readonly eventName: string,
    public readonly eventData?: any,
    public readonly timestamp: Date = new Date()
  ) {}
  
  do(runtime: IScriptRuntime): void {
    runtime.handle({
      name: this.eventName,
      timestamp: this.timestamp,
      data: this.eventData,
    });
  }
}
```

**Impact:**
- ✅ **Non-Breaking**: New action type
- Behaviors can return `EmitEventAction` instead of calling `runtime.handle()` directly
- Files affected: 1 new file, ~8 behavior files can be refactored

**Usage Example:**
```typescript
// Before
onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  runtime.handle({ name: 'timer:started', timestamp: new Date() });
  return [];
}

// After
onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  return [new EmitEventAction('timer:started')];
}
```

### 3.2 StartTimerAction

**Purpose**: Declarative timer start without direct memory manipulation

**Implementation:**
```typescript
export class StartTimerAction implements IRuntimeAction {
  readonly type = 'start-timer';
  
  constructor(
    public readonly memoryRef: TypedMemoryReference<TimeSpan[]>,
    public readonly timestamp: Date = new Date()
  ) {}
  
  do(runtime: IScriptRuntime): void {
    const spans = this.memoryRef.get() || [];
    spans.push({ start: this.timestamp, stop: undefined });
    this.memoryRef.set(spans);
  }
}
```

**Impact:**
- ✅ **Non-Breaking**: New action type
- `TimerBehavior` can use this instead of direct memory manipulation
- Files affected: 1 new file, 1 behavior file

### 3.3 StopTimerAction

**Purpose**: Declarative timer stop

**Implementation:**
```typescript
export class StopTimerAction implements IRuntimeAction {
  readonly type = 'stop-timer';
  
  constructor(
    public readonly memoryRef: TypedMemoryReference<TimeSpan[]>,
    public readonly timestamp: Date = new Date()
  ) {}
  
  do(runtime: IScriptRuntime): void {
    const spans = this.memoryRef.get() || [];
    const lastSpan = spans[spans.length - 1];
    if (lastSpan && !lastSpan.stop) {
      lastSpan.stop = this.timestamp;
      this.memoryRef.set(spans);
    }
  }
}
```

**Impact:**
- ✅ **Non-Breaking**: New action type
- Completes timer action set
- Files affected: 1 new file, 1 behavior file

### 3.4 RegisterEventHandlerAction

**Purpose**: Declarative event handler registration

**Implementation:**
```typescript
export class RegisterEventHandlerAction implements IRuntimeAction {
  readonly type = 'register-event-handler';
  
  constructor(public readonly handler: IEventHandler) {}
  
  do(runtime: IScriptRuntime): void {
    if (runtime.events && typeof runtime.events.register === 'function') {
      runtime.events.register(this.handler);
    }
  }
}
```

**Impact:**
- ✅ **Non-Breaking**: New action type
- Behaviors can register handlers declaratively
- Files affected: 1 new file

### 3.5 UnregisterEventHandlerAction

**Purpose**: Declarative event handler removal

**Implementation:**
```typescript
export class UnregisterEventHandlerAction implements IRuntimeAction {
  readonly type = 'unregister-event-handler';
  
  constructor(public readonly handler: IEventHandler) {}
  
  do(runtime: IScriptRuntime): void {
    if (runtime.events && typeof runtime.events.unregister === 'function') {
      runtime.events.unregister(this.handler);
    }
  }
}
```

**Impact:**
- ✅ **Non-Breaking**: New action type
- Completes handler lifecycle management
- Files affected: 1 new file

### 3.6 ErrorAction

**Purpose**: Push errors to runtime error list for centralized handling

**Implementation:**
```typescript
export class ErrorAction implements IRuntimeAction {
  readonly type = 'error';
  
  constructor(
    public readonly error: Error,
    public readonly context?: string,
    public readonly blockKey?: string
  ) {}
  
  do(runtime: IScriptRuntime): void {
    // Add error to runtime error list
    if (!runtime.errors) {
      runtime.errors = [];
    }
    
    runtime.errors.push({
      error: this.error,
      context: this.context,
      blockKey: this.blockKey,
      timestamp: new Date(),
    });
    
    // Log error
    console.error(`[${this.context}] Error in block ${this.blockKey}:`, this.error);
  }
}
```

**New IScriptRuntime property:**
```typescript
export interface IScriptRuntime {
  // ... existing properties ...
  readonly errors?: RuntimeError[];  // New property
}

export interface RuntimeError {
  error: Error;
  context?: string;
  blockKey?: string;
  timestamp: Date;
}
```

**Impact:**
- 🟡 **Moderate Change**: Adds new runtime property
- Replaces need for `EventHandlerResponse.abort` flag
- Actions can check `runtime.errors.length > 0` to abort processing
- Files affected: 2 new files, 1 interface update

### Implementation Steps

1. ✅ Create action files in `src/runtime/actions/`
2. ✅ Update `IScriptRuntime` with errors property
3. ✅ Export all actions from `src/runtime/index.ts`
4. ✅ Refactor behaviors to use new actions
5. ✅ Add unit tests for each action
6. ✅ Update documentation

### Testing Requirements

- **Unit Tests**: Test each action type independently
- **Integration Tests**: Verify actions work within runtime context
- **Behavior Tests**: Ensure behaviors using new actions work correctly
- **Error Tests**: Verify `ErrorAction` properly adds to runtime error list

---

## Phase 4: Event System Refactoring

### Overview
Refactor event handling to use action-based error handling instead of `EventHandlerResponse.abort`.

### Changes

#### 4.1 Update `IEventHandler.handler()` signature

**Current:**
```typescript
handler(event: IEvent, runtime: IScriptRuntime): EventHandlerResponse;
```

**New:**
```typescript
handler(event: IEvent, runtime: IScriptRuntime): IRuntimeAction[];
```

**Rationale:**
- Simplifies interface - handlers just return actions
- Error handling via `ErrorAction` instead of response flags
- More consistent with behavior lifecycle methods

**Impact:**
- 🔴 **Breaking Change**: All event handlers must be updated
- Files affected: ~5 handler implementations

#### 4.2 Remove or refactor `EventHandlerResponse`

**Option A: Remove Entirely**
- Handlers return `IRuntimeAction[]` directly
- Errors pushed via `ErrorAction`
- Runtime checks `runtime.errors.length` to abort

**Option B: Keep for Internal Use**
- Internal runtime uses response for optimization
- Handlers still return actions
- Runtime wraps in response internally

**Recommendation: Option A (Remove)**

**Impact:**
- 🔴 **Breaking Change**: All handlers must be updated
- Simpler mental model
- Files affected: 1 interface removal, ~5 handler updates

#### 4.3 Update runtime event processing loop

**Current Logic:**
```typescript
for (const handler of handlers) {
  const response = handler.handler(event, runtime);
  if (response.handled) {
    for (const action of response.actions) {
      action.do(runtime);
    }
    if (response.abort) break;
  }
}
```

**New Logic:**
```typescript
for (const handler of handlers) {
  const actions = handler.handler(event, runtime);
  
  for (const action of actions) {
    action.do(runtime);
    
    // Check for errors and abort if any exist
    if (runtime.errors && runtime.errors.length > 0) {
      break;
    }
  }
  
  // Stop processing handlers if errors occurred
  if (runtime.errors && runtime.errors.length > 0) {
    break;
  }
}
```

**Impact:**
- 🔴 **Breaking Change**: Core runtime loop must be updated
- Better error handling semantics
- Files affected: 1 file (ScriptRuntime or EventManager)

### Implementation Steps

1. ✅ Create `ErrorAction` and update `IScriptRuntime`
2. ✅ Update `IEventHandler` interface
3. ✅ Update all handler implementations
4. ✅ Update runtime event processing loop
5. ✅ Remove `EventHandlerResponse` type
6. ✅ Update handler tests
7. ✅ Run integration tests

### Testing Requirements

- **Unit Tests**: Test handlers return correct actions
- **Error Tests**: Verify `ErrorAction` properly aborts processing
- **Integration Tests**: Verify event chain processing with errors
- **Regression Tests**: Ensure existing event flows still work

---

## Phase 5: Cleanup and Removal

### Overview
Remove unnecessary interfaces and code that adds complexity without value.

### 5.1 Remove `IStackValidator` interface

**Rationale:**
- Stack validation is simple enough to be inline in `RuntimeStack`
- Interface adds unnecessary abstraction
- No alternative implementations needed

**Current Usage:**
```typescript
export class RuntimeStack {
  constructor(private validator: IStackValidator) {}
  
  push(block: IRuntimeBlock): void {
    this.validator.validatePush(block, this.blocks.length);
    // ... push logic
  }
}
```

**New Implementation:**
```typescript
export class RuntimeStack {
  push(block: IRuntimeBlock): void {
    // Inline validation
    if (!block) {
      throw new TypeError('Cannot push null/undefined block');
    }
    if (!block.key) {
      throw new TypeError('Block must have a key');
    }
    if (this.blocks.length >= 10) {
      throw new Error('Stack depth limit exceeded (max 10)');
    }
    
    // ... push logic
  }
}
```

**Impact:**
- 🟡 **Moderate Change**: Remove interface and inline validation
- Simplifies code
- Files affected: 3 files (`IStackValidator.ts`, `RuntimeStack.ts`, tests)

### 5.2 Remove `IBlockContext.isReleased()`

**Rationale:**
- Can check release state by trying to allocate and catching error
- Reduces API surface
- Not used frequently enough to warrant method

**Impact:**
- 🟢 **Minor Change**: Remove unused method
- Files affected: 2 files

### 5.3 Remove `TypedMemoryReference.hasSubscribers()`

**Rationale:**
- Can check `subscriptions.length > 0` directly
- Reduces API surface

**Impact:**
- 🟢 **Minor Change**: Remove convenience method
- Files affected: 2 files

### 5.4 Remove `SubscriptionOptions` type

**Rationale:**
- Over-engineered for current needs
- `immediate` and `throttle` options not used
- Simplify to just callback function

**New Subscription API:**
```typescript
subscribe(
  callback: (newValue: T | undefined, oldValue: T | undefined) => void
): () => void
```

**Impact:**
- 🟡 **Moderate Change**: Update subscription calls
- Files affected: ~3 files

### Implementation Steps

1. ✅ Remove `IStackValidator` and inline validation
2. ✅ Remove `isReleased()` method
3. ✅ Remove `hasSubscribers()` method
4. ✅ Remove `SubscriptionOptions` type
5. ✅ Update all affected call sites
6. ✅ Run full test suite

### Testing Requirements

- **Unit Tests**: Verify inline validation works correctly
- **Subscription Tests**: Ensure simplified subscription API works
- **Regression Tests**: Ensure no functionality lost

---

## Impact Analysis

### Files Requiring Changes

#### Critical Path (Must Change)
1. `src/runtime/IRuntimeBlock.ts` - Interface definition
2. `src/runtime/RuntimeBlock.ts` - Base implementation
3. `src/runtime/strategies.ts` - 3 strategy implementations
4. `src/runtime/PushBlockAction.ts` - Update to call `mount()`
5. `src/runtime/PopBlockAction.ts` - Call both `unmount()` and `dispose()`
6. `src/runtime/IBlockContext.ts` - Update `allocate()` signature
7. `src/runtime/IMemoryReference.ts` - Add `value()`, update subscription
8. `src/runtime/IEventHandler.ts` - Update `handler()` signature
9. `src/runtime/IScriptRuntime.ts` - Add `errors` property

#### Behaviors (8 files)
1. `src/runtime/behaviors/TimerBehavior.ts`
2. `src/runtime/behaviors/RoundsBehavior.ts`
3. `src/runtime/behaviors/LazyCompilationBehavior.ts`
4. `src/runtime/behaviors/ChildAdvancementBehavior.ts`
5. `src/runtime/behaviors/CompletionBehavior.ts`
6. `src/runtime/behaviors/CompletionTrackingBehavior.ts`
7. `src/runtime/behaviors/ParentContextBehavior.ts`
8. `src/runtime/behaviors/BlockCompleteEventHandler.ts`

#### New Action Files (6 files)
1. `src/runtime/actions/EmitEventAction.ts`
2. `src/runtime/actions/StartTimerAction.ts`
3. `src/runtime/actions/StopTimerAction.ts`
4. `src/runtime/actions/RegisterEventHandlerAction.ts`
5. `src/runtime/actions/UnregisterEventHandlerAction.ts`
6. `src/runtime/actions/ErrorAction.ts`

#### New Type Files (1 file)
1. `src/runtime/MemoryTypeEnum.ts`

#### Test Files (~20 files)
- All behavior contract tests
- All runtime block tests
- Stack tests
- Memory tests
- Integration tests

#### Removals (3 files)
1. `src/runtime/IStackValidator.ts` - Remove
2. `src/runtime/EventHandler.ts` - Remove `EventHandlerResponse` type
3. Various inline method removals

### Breaking Changes Summary

🔴 **High Impact:**
- `IRuntimeBlock` method renames (`push` → `mount`, `pop` → `unmount`)
- All implementations must update
- Estimated: 30+ files

🟡 **Medium Impact:**
- `IEventHandler.handler()` signature change
- Memory allocation enum requirement
- Subscription API simplification
- Estimated: 15 files

🟢 **Low Impact:**
- New action types (additive)
- Memory interface additions (additive)
- Estimated: 5 files

---

## Testing Strategy

### Test Phases

#### Phase 1: Interface Updates (Unit Tests)
- ✅ Test `mount()` called instead of `push()`
- ✅ Test `unmount()` and `dispose()` called in sequence
- ✅ Test runtime parameter passed to all lifecycle methods
- ✅ Test `MemoryTypeEnum` prevents invalid types
- ✅ Test `value()` method returns correct data
- ✅ Test subscription without `active` flag

#### Phase 2: Action Tests (Unit Tests)
- ✅ Test `EmitEventAction` emits events correctly
- ✅ Test `StartTimerAction` adds time span
- ✅ Test `StopTimerAction` closes time span
- ✅ Test `RegisterEventHandlerAction` registers handler
- ✅ Test `UnregisterEventHandlerAction` removes handler
- ✅ Test `ErrorAction` adds to runtime error list

#### Phase 3: Behavior Tests (Contract Tests)
- ✅ Test behaviors return correct actions
- ✅ Test behaviors use new lifecycle method names
- ✅ Test behaviors use declarative actions instead of imperative calls
- ✅ Test error handling via `ErrorAction`

#### Phase 4: Integration Tests
- ✅ Test full lifecycle: mount → next → unmount → dispose
- ✅ Test memory cleanup after dispose
- ✅ Test event handler registration/unregistration
- ✅ Test error propagation and abort logic
- ✅ Test timer actions in full context

#### Phase 5: Regression Tests
- ✅ Run all existing tests
- ✅ Verify no performance degradation
- ✅ Test Storybook examples still work
- ✅ Verify 50ms lifecycle completion requirement

### Test Modification Strategy

1. **Update Mock Objects First**
   - Update all `IRuntimeBlock` test mocks with new method names
   - Add `runtime` parameter to all lifecycle methods
   - Ensure dispose pattern is tested

2. **Update Contract Tests**
   - Behavior contract tests must verify action returns
   - Test declarative action usage
   - Verify error handling patterns

3. **Update Integration Tests**
   - Test full execution flow with new lifecycle
   - Verify memory cleanup
   - Test error abort logic

4. **Create New Tests**
   - Action unit tests (6 new test files)
   - Memory enum tests
   - Error handling integration tests

### Expected Test Results

**Current Baseline:**
- 45 passed, 1 failed, 4 module errors (known)

**After Refactoring:**
- All new tests passing
- Maintain 45+ passed tests
- No new failures introduced
- Same 1 known failure acceptable

---

## Migration Guide

### For Strategy Authors

#### Before:
```typescript
export class MyStrategy implements IRuntimeBlockStrategy {
  compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
    const behaviors: IRuntimeBehavior[] = [];
    
    // Allocate memory
    const context = new BlockContext(runtime, blockKey);
    const myRef = context.allocate<number>('my-counter', 0, 'private');
    
    return new RuntimeBlock(runtime, sourceIds, behaviors, blockKey);
  }
}
```

#### After:
```typescript
export class MyStrategy implements IRuntimeBlockStrategy {
  compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
    const behaviors: IRuntimeBehavior[] = [];
    
    // Allocate memory with enum
    const context = new BlockContext(runtime, blockKey);
    const myRef = context.allocate<number>(
      MemoryTypeEnum.METRIC_VALUES,  // Use enum instead of string
      0,
      'private'
    );
    
    return new RuntimeBlock(runtime, sourceIds, behaviors, context, blockKey);
  }
}
```

### For Behavior Authors

#### Before:
```typescript
export class MyBehavior implements IRuntimeBehavior {
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    // Emit event imperatively
    runtime.handle({ name: 'my:event', timestamp: new Date() });
    
    // Register handler imperatively
    runtime.events.register(myHandler);
    
    return [];
  }
  
  onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    runtime.events.unregister(myHandler);
    return [];
  }
}
```

#### After:
```typescript
export class MyBehavior implements IRuntimeBehavior {
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    // Emit event declaratively
    return [
      new EmitEventAction('my:event'),
      new RegisterEventHandlerAction(myHandler),
    ];
  }
  
  onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    return [
      new UnregisterEventHandlerAction(myHandler),
    ];
  }
}
```

### For Block Implementers

#### Before:
```typescript
export class MyBlock implements IRuntimeBlock {
  push(): IRuntimeAction[] {
    // Initialization
    return [];
  }
  
  pop(): IRuntimeAction[] {
    // Cleanup AND final actions
    this.cleanup();
    return [];
  }
  
  dispose(): void {
    // Nothing here
  }
}
```

#### After:
```typescript
export class MyBlock implements IRuntimeBlock {
  mount(runtime: IScriptRuntime): IRuntimeAction[] {
    // Initialization with runtime access
    return [];
  }
  
  unmount(runtime: IScriptRuntime): IRuntimeAction[] {
    // Final actions only
    return [];
  }
  
  dispose(runtime: IScriptRuntime): void {
    // Resource cleanup only
    this.cleanup();
    this.context.release();
  }
}
```

### For Event Handler Authors

#### Before:
```typescript
export class MyHandler implements IEventHandler {
  handler(event: IEvent, runtime: IScriptRuntime): EventHandlerResponse {
    if (event.name !== 'my:event') {
      return { handled: false, abort: false, actions: [] };
    }
    
    if (someErrorCondition) {
      return { handled: true, abort: true, actions: [] };
    }
    
    return {
      handled: true,
      abort: false,
      actions: [new PopBlockAction()],
    };
  }
}
```

#### After:
```typescript
export class MyHandler implements IEventHandler {
  handler(event: IEvent, runtime: IScriptRuntime): IRuntimeAction[] {
    if (event.name !== 'my:event') {
      return [];  // Not handled
    }
    
    if (someErrorCondition) {
      return [new ErrorAction(new Error('Something went wrong'), 'MyHandler')];
    }
    
    return [new PopBlockAction()];
  }
}
```

---

## Implementation Timeline

### Week 1: Foundation
- ✅ Create `MemoryTypeEnum`
- ✅ Update `IMemoryReference` interface
- ✅ Create new action types (6 files)
- ✅ Update `IScriptRuntime` with errors property
- ✅ Write unit tests for new actions

### Week 2: Interface Updates
- ✅ Rename `IRuntimeBlock.push()` → `mount()`
- ✅ Split `IRuntimeBlock.pop()` → `unmount()` + `dispose()`
- ✅ Update `IBlockContext.allocate()` signature
- ✅ Update all test mocks
- ✅ Update base `RuntimeBlock` implementation

### Week 3: Strategy & Behavior Updates
- ✅ Update 3 strategy implementations
- ✅ Update 8 behavior implementations
- ✅ Update `PushBlockAction` and `PopBlockAction`
- ✅ Refactor behaviors to use declarative actions
- ✅ Update behavior contract tests

### Week 4: Event System & Cleanup
- ✅ Update `IEventHandler.handler()` signature
- ✅ Remove `EventHandlerResponse` type
- ✅ Update runtime event processing loop
- ✅ Remove `IStackValidator` interface
- ✅ Remove deprecated methods
- ✅ Run full regression test suite

### Week 5: Testing & Documentation
- ✅ Complete integration testing
- ✅ Performance testing
- ✅ Update all documentation
- ✅ Create migration examples
- ✅ Final validation in Storybook

---

## Success Criteria

### Functional Requirements
- ✅ All lifecycle methods renamed and working
- ✅ Memory allocation uses type-safe enum
- ✅ All 6 new action types implemented and tested
- ✅ Event handlers return actions directly
- ✅ Error handling via `ErrorAction` works correctly
- ✅ Resource cleanup via `dispose()` is reliable

### Quality Requirements
- ✅ All existing tests pass (45+ passing maintained)
- ✅ No new TypeScript errors introduced
- ✅ Code coverage maintained or improved
- ✅ Performance: All lifecycle methods complete < 50ms
- ✅ Storybook examples work correctly

### Documentation Requirements
- ✅ Interface catalog updated with final signatures
- ✅ Migration guide complete with examples
- ✅ API documentation updated
- ✅ Contract tests serve as usage examples

---

## Risk Assessment

### High Risk Items
1. **Breaking Changes to IRuntimeBlock**
   - Mitigation: Comprehensive test coverage, gradual rollout
   
2. **Event Handler Signature Changes**
   - Mitigation: Update all handlers atomically, test thoroughly

3. **Memory System Changes**
   - Mitigation: Keep backward compatibility initially, deprecate old API

### Medium Risk Items
1. **New Action Types May Have Bugs**
   - Mitigation: Extensive unit tests, integration tests
   
2. **Performance Regression**
   - Mitigation: Performance tests before/after

### Low Risk Items
1. **Documentation Lag**
   - Mitigation: Update docs in same PR as code
   
2. **Subscription API Simplification**
   - Mitigation: Feature not heavily used

---

## Appendix A: New Action Type Reference

### EmitEventAction
```typescript
new EmitEventAction('event:name', optionalData)
```

### StartTimerAction
```typescript
new StartTimerAction(timeSpansMemoryRef, optionalTimestamp)
```

### StopTimerAction
```typescript
new StopTimerAction(timeSpansMemoryRef, optionalTimestamp)
```

### RegisterEventHandlerAction
```typescript
new RegisterEventHandlerAction(handlerInstance)
```

### UnregisterEventHandlerAction
```typescript
new UnregisterEventHandlerAction(handlerInstance)
```

### ErrorAction
```typescript
new ErrorAction(errorObject, 'context', 'blockKey')
```

---

## Appendix B: MemoryTypeEnum Values

```typescript
enum MemoryTypeEnum {
  // Timer-related
  TIMER_TIME_SPANS = 'timer-time-spans',
  TIMER_IS_RUNNING = 'timer-is-running',
  
  // Rounds-related
  ROUNDS_CURRENT = 'rounds-current',
  ROUNDS_TOTAL = 'rounds-total',
  
  // Child management
  CHILD_INDEX = 'child-index',
  
  // Completion tracking
  COMPLETION_STATUS = 'completion-status',
  
  // Results
  RESULT_SPANS = 'result-spans',
  
  // Event handlers
  HANDLER_REGISTRY = 'handler-registry',
  
  // Metrics
  METRIC_VALUES = 'metric-values',
}
```

---

## Questions & Decisions Log

### Q1: Should we keep `EventHandlerResponse` for backward compatibility?
**Decision**: No, remove entirely. Clean break is better than maintaining dual APIs.

### Q2: Should `mount()` receive runtime parameter?
**Decision**: Yes, for consistency and to avoid storing runtime reference.

### Q3: Should we create actions directory?
**Decision**: Yes, organize actions in `src/runtime/actions/` directory.

### Q4: How to handle errors in action execution?
**Decision**: `ErrorAction` adds to `runtime.errors` list, runtime checks after each action.

### Q5: Should we keep `active` flag in subscriptions?
**Decision**: No, simplify - subscription either exists in list or doesn't.

---

## Approval & Sign-off

- [ ] Architecture Review
- [ ] Technical Lead Approval
- [ ] Test Strategy Approved
- [ ] Documentation Plan Approved
- [ ] Ready for Implementation

---

**End of Refactoring Plan**
