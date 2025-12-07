# Runtime Stack Simplification Proposal

This document proposes a slimmer Runtime Stack surface by moving tracking/wrapping concerns into runtime-managed hooks and helpers, keeping lifecycle ordering intact while reducing class responsibility. Examples show before/after usage and code changes required.

For detailed option breakdowns, see:
- [Option 1 — Stack-Orchestrated Instrumentation](./simplification.option1.md)
- [Option 2 — Runtime-Orchestrated Instrumentation](./simplification.option2.md)

## Goals
- Reduce `RuntimeStack` responsibility to: validation, depth limits, storage, and lifecycle sequencing (`popWithLifecycle`).
- Move execution tracking (spans/metrics) and debug wrapping/logging into runtime-owned helpers.
- Keep public behavior stable for callers (`push`, `pop`, `popWithLifecycle`, `current`, `blocks`).
- Maintain event-bus unregister + context release guarantees without stack owning trackers or loggers.

## Current Responsibility (too much in stack)
- Validations and depth guard.
- ExecutionTracker span start/end + legacy metric recording on push/pop.
- Debug/TestableBlock wrapping + wrapped-block registry + debug logging.
- Lifecycle pop (unmount → pop → dispose → context.release → unregister → parent.next).

## Proposed Responsibility Split
- **RuntimeStack (lean):**
  - Validate push/pop, enforce max depth.
  - Store blocks; expose `current`, `blocks`, `graph`.
  - `popWithLifecycle` orchestrates lifecycle order and returns popped/owner keys for cleanup.
  - Optional minimal wrapped map only if runtime supplies it (or none if runtime keeps registry).
- **ScriptRuntime (or helpers):**
  - ExecutionTracker spans + legacy metric recording.
  - Debug wrapping/log emission via `DebugWrappingService`.
  - Event bus unregister and wrapped cleanup after lifecycle pop using returned keys.
  - Hook wiring: call stack hooks (`onBeforePush`, `onAfterPush`, `onAfterPop`) to keep extensible.

## Simplified Interfaces
```ts
// Stack stays minimal
class RuntimeStack {
  push(block: IRuntimeBlock): void;
  pop(): IRuntimeBlock | undefined;
  popWithLifecycle(): { popped?: IRuntimeBlock; ownerKey?: string };
  current?: IRuntimeBlock;
  blocks: readonly IRuntimeBlock[];
}

// Runtime-managed hooks
interface StackHooks {
  onBeforePush?(block: IRuntimeBlock, parent?: IRuntimeBlock): void;
  onAfterPush?(block: IRuntimeBlock): void;
  onAfterPop?(block: IRuntimeBlock | undefined): void;
}
```

## Before vs After Flow
### Before (push)
- Stack wraps block if debug.
- Stack starts tracker span, records metrics.
- Stack logs debug events.
- Stack pushes block.

### After (push)
- Runtime: optionally wrap block (`wrapper.wrapIfNeeded(block)`).
- Runtime: tracker.startSpan(block,…); tracker.recordLegacyMetric(block,…).
- Runtime: call `stack.push(block)` (stack only validates and stores).
- Runtime: optional logging/hook after push.

### Before (popWithLifecycle)
- Stack: unmount → pop(end span) → dispose → context.release → unregisterByOwner → parent.next → wrapper cleanup.

### After (popWithLifecycle)
- Stack: unmount → pop (no tracker) → dispose → context.release → return `{ popped, ownerKey }`.
- Runtime: tracker.endSpan(ownerKey); eventBus.unregisterByOwner(ownerKey); wrapper.cleanup(ownerKey); parent.next via runtime call.

## Example Changes (illustrative)
### Stack push (before)
```ts
push(block) {
  const parentSpanId = tracker.getActiveSpanId(parent.key);
  const wrapped = maybeWrap(block);
  tracker.startSpan(block, parentSpanId);
  tracker.recordLegacyMetric(block);
  super.push(wrapped);
  logDebug(...);
}
```

### Stack push (after)
```ts
push(block) {
  validate(block);
  enforceDepth();
  this._blocks.push(block);
}
```

### Runtime using hooks (after)
```ts
const blockToPush = wrapper.wrapIfNeeded(block);
tracker.startSpan(blockToPush, tracker.parentSpan(stack.current));
tracker.recordLegacyMetric(blockToPush);
stack.push(blockToPush);
hooks.onAfterPush?.(blockToPush);
```

### Stack popWithLifecycle (after)
```ts
popWithLifecycle() {
  const current = this.current;
  if (!current) return { popped: undefined };
  const unmountActions = safe(current.unmount(runtime));
  const popped = this.pop();
  safe(() => popped?.dispose(runtime));
  safe(() => popped?.context?.release?.());
  runActions(unmountActions);
  return { popped, ownerKey: popped?.key.toString() };
}
```

### Runtime consuming pop result (after)
```ts
const { popped, ownerKey } = stack.popWithLifecycle();
if (popped) {
  tracker.endSpan(ownerKey);
  eventBus.unregisterByOwner(ownerKey);
  wrapper.cleanup(ownerKey);
  runParentNext(stack.current, runtime);
}
```

## Migration Steps
1) Add hook-capable `RuntimeStack` (no tracker/wrapping inside).
2) Introduce `StackOrchestrator` in runtime to: wrap blocks (debug), start/end spans, log, unregister handlers, and run parent.next after lifecycle.
3) Refactor `ScriptRuntime` to use orchestrator around stack calls.
4) Deprecate wrapper-heavy `MemoryAwareRuntimeStack`/`DebugRuntimeStack` aliases (already thin) and point consumers to `RuntimeStack`.
5) Update tests: move tracker/wrapper expectations to runtime/orchestrator tests; keep stack tests for lifecycle ordering and validation.

## Benefits
- Single responsibility: stack manages order/storage; runtime manages instrumentation.
- Easier to reason and test: stack tests do not mock trackers/loggers; runtime tests cover instrumentation.
- Extensible: new behaviors (e.g., perf timers) added via hooks without stack changes.

## Risks & Mitigations
- Forgetting to call tracker/wrapper hooks in runtime → guard with integration tests that assert spans and unregisters after pop.
- Parent.next sequencing: ensure orchestrator invokes parent.next after stack pop lifecycle; add regression test.
- Backward compatibility: keep thin aliases for a transition window; document new entry points.

## Quick Checklist to Implement
- [ ] Add `{ popped, ownerKey }` return shape to `popWithLifecycle` and remove tracker/logging/wrapping from stack.
- [ ] Add `StackOrchestrator` (or similar) in runtime to handle wrapping/tracker/unregister/logging.
- [ ] Update `ScriptRuntime` to use orchestrator for push/pop flows.
- [ ] Update tests to new boundaries (stack vs runtime/orchestrator).
- [ ] Update docs/examples to show new flow and hooks.
