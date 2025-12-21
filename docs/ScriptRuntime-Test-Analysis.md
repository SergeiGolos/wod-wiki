# ScriptRuntime Test Analysis

## Executive Summary

This document analyzes the `ScriptRuntime` class and its test coverage, identifying what the class does, what is tested, what areas are missing, and what tests may be redundant as they test dependency functionality.

---

## 1. What ScriptRuntime Does

### 1.1 Class Overview

`ScriptRuntime` is the **central orchestration class** for executing workout scripts. It implements `IScriptRuntime` and coordinates:

- **Stack Management**: Managing a runtime stack of executing blocks (`IRuntimeStack`)
- **Memory Management**: Coordinating memory allocation for blocks (`IRuntimeMemory`)  
- **Event Dispatching**: Routing events through the event bus (`IEventBus`)
- **Clock/Timing**: Managing timestamps and execution timing (`IRuntimeClock`)
- **JIT Compilation**: Interfacing with the just-in-time compiler (`JitCompiler`)
- **Execution Tracking**: Monitoring spans and recording metrics (`ExecutionTracker`)

### 1.2 Dependencies (Injected via Constructor)

| Dependency | Interface | Purpose |
|------------|-----------|---------|
| `memory` | `IRuntimeMemory` | Allocates, searches, and releases memory references |
| `stack` | `IRuntimeStack` | Push/pop blocks, LIFO execution model |
| `clock` | `IRuntimeClock` | Timestamps, start/stop control |
| `eventBus` | `IEventBus` | Event registration and dispatch |

### 1.3 Configuration Options (`RuntimeStackOptions`)

| Option | Type | Purpose |
|--------|------|---------|
| `tracker` | `RuntimeStackTracker` | Tracks execution spans for metrics |
| `wrapper` | `RuntimeStackWrapper` | Wraps blocks (e.g., for debugging) |
| `logger` | `RuntimeStackLogger` | Debug/error logging |
| `hooks` | `RuntimeStackHooks` | Lifecycle hooks (onBeforePush, onAfterPush, etc.) |
| `debugMode` | `boolean` | Enables debug features |
| `enableLogging` | `boolean` | Enables console logging |

### 1.4 Core Public Methods

#### Stack Lifecycle Operations

| Method | Signature | Description |
|--------|-----------|-------------|
| `pushBlock` | `(block: IRuntimeBlock, options?: BlockLifecycleOptions) => IRuntimeBlock` | Pushes a block onto the stack with full lifecycle management |
| `popBlock` | `(options?: BlockLifecycleOptions) => IRuntimeBlock \| undefined` | Pops a block with cleanup, calls parent's `next()` |
| `popAndDispose` | `() => void` | Helper to pop and dispose a block |
| `dispose` | `() => void` | Emergency cleanup - disposes all blocks in the stack |
| `isComplete` | `() => boolean` | Returns true when stack is empty |
| `handle` | `(event: IEvent) => void` | Dispatches an event through the event bus |

#### Getters

| Property | Type | Description |
|----------|------|-------------|
| `activeSpans` | `ReadonlyMap<string, ExecutionSpan>` | Active execution spans |
| `tracker` | `ExecutionTracker` | Access to the execution tracker |

### 1.5 pushBlock() Execution Flow

```
1. validateBlock()           - Check block is valid (key, sourceIds, stack depth)
2. hooks.onBeforePush()      - Notify pre-push hooks
3. tracker.startSpan()       - Start execution span tracking
4. wrapper.wrap()            - Optionally wrap block (e.g., TestableBlock)
5. setStartTime()            - Record start timestamp
6. block.setRuntime()        - Inject runtime reference (if method exists)
7. stack.push()              - Actually push to stack
8. logger.debug()            - Log the push operation
9. hooks.onAfterPush()       - Notify post-push hooks
```

### 1.6 popBlock() Execution Flow

```
1. Get current block
2. setCompletedTime()        - Record completion timestamp
3. hooks.onBeforePop()       - Notify pre-pop hooks
4. block.unmount()           - Get unmount actions
5. stack.pop()               - Actually pop from stack
6. tracker.endSpan()         - End execution span
7. block.dispose()           - Dispose the block
8. block.context.release()   - Release memory context
9. hooks.unregisterByOwner() - Unregister event handlers
10. wrapper.cleanup()         - Clean up wrapper
11. logger.debug()            - Log the pop operation
12. Execute unmount actions   - Run actions from unmount()
13. parent.next()             - Call parent's next() with lifecycleOptions
14. Execute next actions      - Run actions from next()
15. hooks.onAfterPop()        - Notify post-pop hooks
```

### 1.7 Block Validation Rules

- Block cannot be null or undefined
- Block must have a valid `key`
- Block must have a valid `sourceIds` array
- Stack depth cannot exceed `MAX_STACK_DEPTH` (10)

---

## 2. Existing Test Coverage

### 2.1 Test File Locations

Tests are organized across multiple locations:

| Location | Focus |
|----------|-------|
| `src/runtime/__tests__/RuntimeStackLifecycle.test.ts` | **Direct ScriptRuntime lifecycle tests** |
| `src/runtime/__tests__/RuntimeDebugMode.test.ts` | Debug mode and wrapper integration |
| `src/runtime/__tests__/LifecycleTimestamps.test.ts` | Timestamp propagation |
| `src/runtime/__tests__/RootLifecycle.test.ts` | Root block integration |
| `src/runtime/__tests__/NextEventHandler.test.ts` | NextEventHandler unit tests |
| `src/runtime/__tests__/NextEvent.test.ts` | NextEvent unit tests |
| `src/runtime/__tests__/NextAction.test.ts` | NextAction unit tests |
| `src/runtime/behaviors/__tests__/TimerBehavior.test.ts` | TimerBehavior contract tests |
| `src/runtime/behaviors/__tests__/CompletionBehavior.test.ts` | CompletionBehavior contract tests |
| `tests/runtime-execution/workflows/runtime-hooks.test.ts` | Timer behavior integration |
| `tests/runtime-execution/memory/anchor-subscriptions.test.ts` | Anchor/memory integration |
| `tests/runtime-execution/orchestration.test.ts` | **Placeholder - all TODOs** |
| `tests/runtime-execution/workflows/next-button-workflow.test.ts` | Next button integration workflow |
| `tests/metrics-recording/metric-inheritance.test.ts` | Metric inheritance |
| `tests/integration/metric-inheritance/rep-scheme-inheritance.test.ts` | Rep scheme inheritance |

#### Recent Reorganization (December 2024)

The following test files were reorganized to be co-located with their source files:

- ✅ `tests/runtime-execution/events/next-event-handler.test.ts` → **DELETED** (duplicate of `src/runtime/__tests__/NextEventHandler.test.ts`)
- ✅ `tests/runtime-execution/events/next-event.test.ts` → **DELETED** (duplicate of `src/runtime/__tests__/NextEvent.test.ts`)
- ✅ `tests/runtime-execution/behaviors/timer-behavior.test.ts` → **MOVED** to `src/runtime/behaviors/__tests__/TimerBehavior.test.ts`
- ✅ `tests/runtime-execution/behaviors/completion-behavior.test.ts` → **MOVED** to `src/runtime/behaviors/__tests__/CompletionBehavior.test.ts`

### 2.2 What Is Currently Tested

#### A. Lifecycle Hook Sequencing (RuntimeStackLifecycle.test.ts)

✅ **Tested:**
- Hook execution order during `pushBlock()`: `beforePush → tracker.startSpan → wrapper.wrap → logger.debug → afterPush`
- Error propagation from `unmount()` failures
- Lifecycle options passed through the chain

#### B. Debug Mode and Wrapper (RuntimeDebugMode.test.ts)

✅ **Tested:**
- RuntimeBuilder creates runtime with default options
- Debug mode auto-enables logging
- Custom wrappers are called during `pushBlock()`
- TestableBlock is not double-wrapped
- Method calls are recorded on wrapped blocks
- Multiple blocks tracked with their calls
- Cleanup happens on `popBlock()`

#### C. Timestamp Propagation (LifecycleTimestamps.test.ts)

✅ **Tested:**
- `completedAt` passed from `popBlock()` to `parent.next()`
- `startTime` used when pushing children via `PushBlockAction`
- Wall-clock alignment across pause/resume using monotonic deltas

#### D. Timer/Memory Integration (runtime-hooks.test.ts)

✅ **Tested:**
- Timer state memory references searchable
- Non-existent block keys return empty results
- Memory subscription notifications on state changes
- Timer elapsed time calculation
- Multiple spans from pause/resume cycles
- RuntimeProvider context memory access
- Rapid state change handling

⏳ **TODO (Skipped):**
- Block disposal gracefully notifying subscribers

#### E. Anchor Subscriptions (anchor-subscriptions.test.ts)

✅ **Tested:**
- Anchor creation and retrieval
- Anchor value storage and update
- Anchor resolution to target memory
- Anchor subscriptions and notifications
- Anchor search and discovery
- Anchor lifecycle and cleanup
- Edge cases (undefined values, empty criteria, null values)

### 2.3 What Is NOT Tested (Orchestration.test.ts TODOs)

The `orchestration.test.ts` file has **all placeholders** with no implementation:

```typescript
it.todo('should initialize runtime with JIT compiler, stack, and memory');
it.todo('should start runtime and begin execution');
it.todo('should stop runtime and preserve state');
it.todo('should reset runtime to initial state');
it.todo('should track running state correctly');
it.todo('should dispatch events to registered handlers');
it.todo('should collect and report errors');
it.todo('should provide accurate current time');
it.todo('should handle state transitions correctly');
```

---

## 3. Test Coverage Gap Analysis

### 3.1 Missing Tests for ScriptRuntime Core Functionality

| Area | Gap Description | Priority |
|------|-----------------|----------|
| **Constructor** | No tests for constructor validation, default options merging | Medium |
| **pushBlock() Validation** | No direct tests for block validation (null, missing key, missing sourceIds, stack overflow) | High |
| **popBlock() Edge Cases** | No tests for popping empty stack | Medium |
| **Error Collection** | `errors` array not tested | Medium |
| **isComplete()** | Not directly unit-tested | Low |
| **handle()** | Event dispatching not tested with real events | Medium |
| **dispose()** | Emergency cleanup not tested | High |
| **Clock Integration** | Clock start/stop during construction/dispose not verified | Low |
| **NextEventHandler Registration** | Auto-registration in constructor not verified | Low |

### 3.2 Detailed Missing Test Cases

#### Constructor Tests (Missing)

```typescript
describe('ScriptRuntime Constructor', () => {
  it('should merge options with defaults');
  it('should start the clock during construction');
  it('should register NextEventHandler on eventBus');
  it('should create ExecutionTracker with memory');
  it('should use provided tracker if specified in options');
  it('should use provided wrapper if specified in options');
  it('should use noopTracker/noopWrapper when not provided');
});
```

#### pushBlock Validation Tests (Missing)

```typescript
describe('pushBlock() Validation', () => {
  it('should throw TypeError when block is null');
  it('should throw TypeError when block is undefined');
  it('should throw TypeError when block has no key');
  it('should throw TypeError when block has no sourceIds');
  it('should throw TypeError when sourceIds is not an array');
  it('should throw TypeError when stack depth exceeds MAX_STACK_DEPTH (10)');
  it('should include block key in error message for sourceIds error');
  it('should include current depth and block in stack overflow error');
});
```

#### popBlock Edge Cases (Missing)

```typescript
describe('popBlock() Edge Cases', () => {
  it('should return undefined when stack is empty');
  it('should handle unmount returning undefined');
  it('should handle unmount returning empty array');
  it('should handle parent.next() returning undefined');
  it('should handle block.context being undefined');
  it('should handle block.context.release being undefined');
});
```

#### dispose() Tests (Missing)

```typescript
describe('dispose()', () => {
  it('should stop the clock');
  it('should pop all blocks from the stack');
  it('should call popBlock for each block');
  it('should handle empty stack gracefully');
  it('should dispose blocks in LIFO order');
});
```

#### Error Handling Tests (Missing)

```typescript
describe('Error Handling', () => {
  it('should collect errors in errors array');
  it('should continue execution after non-fatal errors');
  it('should propagate fatal errors');
});
```

---

## 4. Tests That Test Dependency Functionality

The following tests are testing **dependency behavior** rather than ScriptRuntime integration. These may be considered redundant if the dependencies have their own dedicated test suites:

### 4.1 Tests Better Suited for RuntimeStack

| Test File | Test Description | Why Redundant |
|-----------|------------------|---------------|
| `stack-api.test.ts` | LIFO ordering, push adds block immediately, update current block | Tests `RuntimeStack` directly, not ScriptRuntime |
| `stack-disposal.test.ts` | Dispose method called correctly, idempotent dispose | Tests `RuntimeStack` pop behavior |
| `stack-edge-cases.test.ts` | Edge cases for RuntimeStack | Tests `RuntimeStack` directly |

**Recommendation**: Keep these tests, but they belong to RuntimeStack, not ScriptRuntime.

### 4.2 Tests Better Suited for RuntimeMemory

| Test File | Test Description | Why Redundant |
|-----------|------------------|---------------|
| `memory-reference.test.ts` | Memory reference behavior | Tests `RuntimeMemory` directly |
| `block-context.test.ts` | BlockContext allocation, get, release | Tests `BlockContext`/`RuntimeMemory` |

**Recommendation**: These test the memory system, not ScriptRuntime. They should exist but aren't ScriptRuntime tests.

### 4.3 Tests Better Suited for TimerBehavior

| Test File | Test Description | Status |
|-----------|------------------|--------|
| `src/runtime/behaviors/__tests__/TimerBehavior.test.ts` | Timer state, pause/resume, spans | ✅ Moved to proper location |
| `tests/runtime-execution/workflows/runtime-hooks.test.ts` | Uses ScriptRuntime as context but primarily tests `TimerBehavior` | Integration test - keep as-is |

**Status**: TimerBehavior tests have been moved to `src/runtime/behaviors/__tests__/` and are now co-located with the source file.

### 4.4 Tests Better Suited for EventBus/NextEventHandler

| Test File | Test Description | Status |
|-----------|------------------|--------|
| `src/runtime/__tests__/NextEventHandler.test.ts` | Handler interface, event handling | ✅ Already in correct location |
| `src/runtime/__tests__/NextEvent.test.ts` | NextEvent construction and properties | ✅ Already in correct location |
| `src/runtime/__tests__/NextAction.test.ts` | NextAction behavior | ✅ Already in correct location |
| `tests/runtime-execution/workflows/next-button-workflow.test.ts` | Integration with mocked runtime | Integration test - keep as-is |

**Status**: Duplicate tests in `tests/runtime-execution/events/` were removed. Unit tests are now in `src/runtime/__tests__/`.

### 4.5 Tests Better Suited for JitCompiler

| Test File | Test Description | Why Redundant |
|-----------|------------------|---------------|
| `JitCompiler.test.ts` | Dialect registry, strategy registration | Tests `JitCompiler` directly |
| `strategy-precedence.test.ts` | Strategy matching precedence | Tests `JitCompiler` strategies |
| `strategy-matching.test.ts` | Strategy pattern matching | Tests `JitCompiler` strategies |
| `fragment-compilation.test.ts` | Fragment compilation | Tests `JitCompiler` |
| `block-compilation.test.ts` | Block compilation | Tests `JitCompiler` |

**Recommendation**: These belong to JitCompiler test suite.

---

## 5. Recommended Test Reorganization

### 5.1 Proposed Test File Structure

```
tests/
├── runtime-execution/
│   ├── script-runtime/              # NEW: Dedicated ScriptRuntime tests
│   │   ├── construction.test.ts     # Constructor, options, dependencies
│   │   ├── push-block.test.ts       # pushBlock validation and lifecycle
│   │   ├── pop-block.test.ts        # popBlock lifecycle and edge cases
│   │   ├── dispose.test.ts          # Emergency cleanup
│   │   ├── error-handling.test.ts   # Error collection and reporting
│   │   └── integration.test.ts      # Full lifecycle integration
│   ├── stack/                       # RuntimeStack tests (keep as-is)
│   ├── memory/                      # RuntimeMemory tests (keep as-is)
│   ├── events/                      # EventBus tests (keep as-is)
│   └── behaviors/                   # Behavior tests (keep as-is)
```

### 5.2 Priority Test Development

| Priority | Test Category | Estimated Effort |
|----------|---------------|------------------|
| **High** | pushBlock() validation | 2-4 hours |
| **High** | dispose() emergency cleanup | 1-2 hours |
| **Medium** | Constructor tests | 2-3 hours |
| **Medium** | popBlock() edge cases | 2-3 hours |
| **Medium** | Error handling | 2-3 hours |
| **Low** | isComplete() | 30 minutes |

---

## 6. Test Metrics Summary

### Current State

| Metric | Count |
|--------|-------|
| Total test files touching ScriptRuntime | 12+ |
| Direct unit tests for ScriptRuntime | ~15 |
| Integration tests using ScriptRuntime | ~50 |
| TODO/Skipped tests | 10 |
| Missing critical tests | 15-20 |

### Coverage by Method

| Method | Test Coverage |
|--------|---------------|
| `constructor` | ❌ Not tested |
| `pushBlock()` | ⚠️ Partial (lifecycle tested, validation not tested) |
| `popBlock()` | ⚠️ Partial (lifecycle tested, edge cases not tested) |
| `popAndDispose()` | ❌ Not tested |
| `dispose()` | ❌ Not tested |
| `isComplete()` | ❌ Not directly tested |
| `handle()` | ⚠️ Partial (via integration) |
| `activeSpans` getter | ⚠️ Partial (via integration) |
| `tracker` getter | ⚠️ Partial (via integration) |

---

## 7. Conclusion

### What Works Well
- Lifecycle hook sequencing is thoroughly tested
- Debug mode and wrapper integration is well covered
- Timestamp propagation is tested
- Memory and anchor integration tests exist

### Critical Gaps
1. **No validation tests** for `pushBlock()` - the most critical entry point
2. **No dispose() tests** - emergency cleanup path untested
3. **No constructor tests** - dependency wiring untested
4. **orchestration.test.ts is entirely placeholder**

### Recommendations
1. **Immediately**: Implement pushBlock validation tests (TypeError cases)
2. **Short-term**: Implement dispose() tests
3. **Medium-term**: Fill in orchestration.test.ts TODOs
4. **Long-term**: Reorganize test structure for clarity
