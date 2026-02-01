# Troubleshooting Guide: ExecutionContext Testing Platform

Common issues and solutions when using the ExecutionContext Testing Platform.

---

## Action Recording Issues

### Actions Not Being Recorded

**Symptom**: `harness.actionExecutions` is empty after executing actions.

**Cause**: Actions not executed through `harness.executeAction()`.

**Solution**:
```typescript
// ❌ Wrong - bypasses recording
harness.runtime.do({ type: 'test', do: () => {} });

// ✅ Correct - uses harness recording
harness.executeAction({ type: 'test', do: () => {} });
```

### Nested Actions Not Recorded

**Symptom**: Only the top-level action appears in recordings.

**Cause**: This is by design. Nested actions (queued via `runtime.do()` inside an action) are executed by the ExecutionContext but not individually recorded.

**Solution**: Each `executeAction()` call represents a "turn". If you need to track nested actions, execute them as separate turns:

```typescript
// Nested actions in same turn (only 'outer' recorded)
harness.executeAction({
  type: 'outer',
  do: (rt) => rt.do({ type: 'inner', do: () => {} })
});

// Separate turns (both recorded)
harness.executeAction({ type: 'first', do: () => {} });
harness.executeAction({ type: 'second', do: () => {} });
```

---

## Event Handling Issues

### Event Handlers Not Firing

**Symptom**: Registered event handlers don't execute.

**Cause**: Event handlers are scope-filtered. Default scope is `'active'` which only fires for the current block.

**Solution**: Use global scope for test handlers:

```typescript
// ❌ Wrong - active scope, won't fire without matching block
harness.eventBus.register('test', handler, 'owner');

// ✅ Correct - global scope, always fires
harness.eventBus.register('test', handler, 'owner', { scope: 'global' });

// ✅ Or use builder which defaults to global
new ExecutionContextTestBuilder()
  .onEvent('test', handler)
  .build();
```

### Event Not Dispatched

**Symptom**: `wasEventDispatched()` returns false.

**Cause**: Event dispatched through wrong method.

**Solution**:
```typescript
// ❌ Wrong - bypasses recording
harness.eventBus.emit(event, harness.runtime);

// ✅ Correct - uses harness recording
harness.dispatchEvent(event);
```

---

## Clock Issues

### Clock Not Advancing

**Symptom**: `harness.clock.now` doesn't change after `advanceClock()`.

**Cause**: Usually a reference issue.

**Debug**:
```typescript
console.log('Before:', harness.clock.now.getTime());
harness.advanceClock(5000);
console.log('After:', harness.clock.now.getTime());
```

### Time Frozen During Execution

**Symptom**: All actions in a turn have the same timestamp.

**Cause**: This is correct behavior! ExecutionContext freezes time during a turn.

**Solution**: If you need different timestamps, execute in separate turns:

```typescript
harness.executeAction({ type: 'first', do: () => {} });
harness.advanceClock(1000);  // Advance between turns
harness.executeAction({ type: 'second', do: () => {} });
```

---

## JIT Compilation Issues

### Matcher Not Triggering

**Symptom**: `mockJit.compile()` returns `undefined` instead of configured block.

**Causes**:
1. Predicate doesn't match
2. Lower priority matcher evaluated first
3. Statements don't contain expected content

**Debug**:
```typescript
// Check what's being compiled
harness.mockJit.whenMatches(
  (stmts, rt) => {
    console.log('Statements:', JSON.stringify(stmts));
    return true; // or your condition
  },
  block
);
```

### Priority Confusion

**Symptom**: Wrong block returned when multiple matchers match.

**Cause**: Higher priority matchers are evaluated first.

**Solution**:
```typescript
// Higher priority (20) wins over lower (10)
builder
  .whenCompiling(() => true, blockA, 10)
  .whenCompiling(() => true, blockB, 20); // This one wins
```

---

## Max Iterations Errors

### Unexpected Max Iterations Error

**Symptom**: `Error: Max iterations reached (20)`

**Cause**: Recursive or unbounded action queuing.

**Solutions**:

1. **Increase limit** (if recursion is intentional):
```typescript
const harness = new ExecutionContextTestBuilder()
  .withMaxDepth(100)
  .build();
```

2. **Add termination condition**:
```typescript
let count = 0;
const action: IRuntimeAction = {
  type: 'recursive',
  do: (runtime) => {
    if (count++ < 10) {
      runtime.do(action);
    }
  }
};
```

3. **Test the error explicitly**:
```typescript
expect(() => harness.executeAction(infiniteAction)).toThrow(/Max iterations/);
```

---

## TypeScript Errors

### Builder Methods Not Found

**Symptom**: `Property 'withClock' does not exist on type`

**Cause**: Wrong import or outdated types.

**Solution**:
```typescript
// Ensure correct import
import { ExecutionContextTestBuilder } from '@/testing/harness';

// Not from the wrong location
// import { ExecutionContextTestBuilder } from './some-other-path';
```

### Type Mismatch in Handlers

**Symptom**: TypeScript errors when defining event handlers.

**Solution**:
```typescript
import { IEventHandler } from '@/runtime/contracts/events/IEventHandler';

const handler: IEventHandler = {
  id: 'my-handler',
  name: 'MyHandler',
  handler: (event, runtime) => {
    return []; // Must return IRuntimeAction[]
  }
};
```

---

## Performance Issues

### Tests Running Slowly

**Causes & Solutions**:

1. **Too many recordings** - Clear between tests:
```typescript
afterEach(() => harness.clearRecordings());
```

2. **High max depth** - Reduce if not needed:
```typescript
new ExecutionContextTestBuilder().withMaxDepth(10).build();
```

3. **Inefficient queries** - Cache results:
```typescript
// ❌ Slow - filters on every check
for (let i = 0; i < 100; i++) {
  expect(harness.wasActionExecuted(`action-${i}`)).toBe(true);
}

// ✅ Fast - filter once
const types = new Set(harness.actionExecutions.map(e => e.action.type));
for (let i = 0; i < 100; i++) {
  expect(types.has(`action-${i}`)).toBe(true);
}
```

### Memory Issues

**Symptom**: Tests consume excessive memory.

**Cause**: Recordings accumulate across tests.

**Solution**:
```typescript
afterEach(() => {
  harness.clearRecordings();
  harness.mockJit.clearCalls();
});

afterAll(() => {
  harness.dispose();
});
```

---

## Factory Function Issues

### Factory Returns Incomplete Harness

**Symptom**: Missing properties on harness from factory.

**Debug**:
```typescript
const harness = createTimerTestHarness();
console.log('Runtime:', harness.runtime);
console.log('MockJit:', harness.mockJit);
console.log('Clock:', harness.clock);
console.log('Stack:', harness.stack);
```

### Behavior Not on Stack

**Symptom**: `createBehaviorTestHarness()` doesn't have behavior accessible.

**Solution**:
```typescript
const behavior = new TimerBehavior('up');
const harness = createBehaviorTestHarness(behavior);

// Access via stack
const block = harness.stack.current;
const foundBehavior = block?.getBehavior(TimerBehavior);
```

---

## Getting More Help

1. Check [API Reference](./api-reference.md) for method signatures
2. Review [Migration Guide](./migration-guide.md) for pattern comparisons
3. Look at test files in `src/testing/harness/__tests__/` for examples
4. Check phase documentation for detailed behavior:
   - [Phase 1: MockJitCompiler](./phase-1-mock-jit-compiler.md)
   - [Phase 2: ExecutionContextTestHarness](./phase-2-execution-context-test-harness.md)
   - [Phase 3: Builder & Helpers](./phase-3-builder-and-helpers.md)
