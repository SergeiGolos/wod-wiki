# Quickstart: Proper Script Advancement

**Feature**: 006-proper-advancement-of  
**Date**: 2025-10-04  
**Estimated Time**: 10 minutes

This quickstart validates the advancement feature through progressive test scenarios.

## Prerequisites

```bash
# Ensure dependencies installed
npm install

# Verify test environment
npm run test:unit -- --version
```

## Test Execution Order

Tests must be run in order as each builds on previous functionality.

### Phase 1: Parse-Time Validation ✅

**Purpose**: Verify script structure validation catches errors before execution

```bash
# Run validation tests
npm run test:unit -- src/parser/timer.visitor.test.ts
```

**Expected Results**:
- ✅ Valid sequential script passes validation
- ✅ Valid nested script (3 levels) passes validation
- ❌ Circular reference detected and rejected
- ❌ Excessive nesting (11 levels) rejected
- ❌ Invalid timer duration rejected
- ⚡ Validation completes in < 100ms for 50-element script

**Verification**:
```typescript
// Valid script structure
const script = parseScript(`
  timer 30s
    exercise "Squats"
      timer 10s
  timer 20s
`);
const result = validate(script);
expect(result.isValid).toBe(true);

// Circular reference detection
const circular = createCircularReference();
const result = validate(circular);
expect(result.isValid).toBe(false);
expect(result.errorMessage).toContain('circular');
```

---

### Phase 2: Lazy Block Creation ✅

**Purpose**: Verify JIT compiler creates blocks only when parent calls next()

```bash
# Run JIT compiler tests
npm run test:unit -- src/runtime/JitCompiler.test.ts
```

**Expected Results**:
- ✅ Leaf block (no children) compiles successfully
- ✅ Parent block defers child compilation until next()
- ✅ Multiple children compiled sequentially
- ⚡ Compilation completes in < 5ms per block

**Verification**:
```typescript
const parent = new ParentBlock(statement, [child1, child2]);
expect(parent.currentChildIndex).toBe(0);

// Children not compiled yet
expect(compiledBlocks.length).toBe(0);

// First next() compiles first child
const action = parent.next();
expect(action.type).toBe('next');
expect(parent.currentChildIndex).toBe(1);
expect(compiledBlocks.length).toBe(1);
```

---

### Phase 3: Sequential Child Execution ✅

**Purpose**: Verify children execute strictly sequentially (one completes before next starts)

```bash
# Run integration tests
npm run test:integration -- advancement-scenarios.test.ts
```

**Expected Results**:
- ✅ Parent with 3 children executes in order
- ✅ Child completion triggers next sibling
- ✅ All children complete before parent pops
- ✅ Stack integrity maintained throughout

**Verification**:
```typescript
const parent = createParent([child1, child2, child3]);
runtime.push(parent);

// First child starts
let action = parent.next();
runtime.push(action.block);

// Child 1 completes
runtime.pop();
action = parent.next();
expect(action.block).toBe(child2Block); // Sequential

// Repeat for child 2 and 3
```

---

### Phase 4: Stack Operations ✅

**Purpose**: Verify push/pop operations maintain performance and validate correctly

```bash
# Run stack tests
npm run test:unit -- src/runtime/RuntimeStack.test.ts
```

**Expected Results**:
- ✅ Push validates block before adding
- ✅ Pop returns block without cleanup
- ✅ Stack overflow detected at depth 10
- ✅ Invalid blocks rejected
- ⚡ Push operation < 1ms
- ⚡ Pop operation < 1ms

**Verification**:
```typescript
const stack = new RuntimeStack();

// Valid push
const block = createBlock();
expect(() => stack.push(block)).not.toThrow();
expect(stack.current).toBe(block);

// Invalid push (null)
expect(() => stack.push(null)).toThrow(TypeError);

// Stack overflow
for (let i = 0; i < 10; i++) {
  stack.push(createBlock());
}
expect(() => stack.push(createBlock())).toThrow('overflow');
```

---

### Phase 5: Memory Cleanup ✅

**Purpose**: Verify consumer-managed disposal clears references properly

```bash
# Run disposal tests
npm run test:unit -- src/runtime/RuntimeBlock.disposal.test.ts
```

**Expected Results**:
- ✅ Pop returns block without cleanup
- ✅ dispose() clears parent reference
- ✅ dispose() clears children array
- ✅ dispose() is idempotent
- ⚡ dispose() completes in < 50ms

**Verification**:
```typescript
const parent = createParent([child1, child2]);
const child = parent.next().block;

// Pop doesn't clean up
const popped = stack.pop();
expect(popped.parentContext).toBeDefined(); // Still has reference

// Consumer calls dispose
popped.dispose();
expect(popped.parentContext).toBeUndefined(); // Cleaned
expect(popped.children).toHaveLength(0); // Cleared

// Idempotent
expect(() => popped.dispose()).not.toThrow();
```

---

### Phase 6: Error Handling ✅

**Purpose**: Verify errors halt execution with proper logging

```bash
# Run error handling tests
npm run test:unit -- src/runtime/RuntimeStack.edge-cases.test.ts
```

**Expected Results**:
- ✅ Stack overflow throws TypeError and halts
- ✅ Invalid block throws TypeError and halts
- ✅ Malformed script detected at parse time
- ✅ All errors include stack state in logs

**Verification**:
```typescript
// Stack overflow
expect(() => {
  for (let i = 0; i < 11; i++) {
    stack.push(createBlock());
  }
}).toThrow(TypeError);
expect(consoleLog).toContain('Stack depth: 10');

// Invalid block
expect(() => stack.push(null)).toThrow(TypeError);
expect(consoleError).toContain('null or undefined');
```

---

### Phase 7: Timer Event Integration ✅

**Purpose**: Verify timer events trigger advancement correctly

```bash
# Run event handler tests
npm run test:unit -- src/runtime/NextEventHandler.test.ts
```

**Expected Results**:
- ✅ Timer registration during push()
- ✅ Event triggers next() on expiration
- ✅ Event handlers stored in memory
- ✅ Multiple timers handled correctly

**Verification**:
```typescript
const block = new TimerBlock(duration(30));
const actions = block.push();

// Verify event registered
expect(runtime.memory.events).toContain(nextEvent);

// Simulate timer expiration
await advanceTime(30000);
expect(handlerCalled).toBe(true);
expect(block.next).toHaveBeenCalled();
```

---

### Phase 8: Performance Validation ⚡

**Purpose**: Verify all operations meet performance targets

```bash
# Run performance tests
npm run test:unit -- src/runtime/RuntimeStack.perf.test.ts
```

**Expected Results**:
- ⚡ Push operation: < 1ms (measured average)
- ⚡ Pop operation: < 1ms (measured average)
- ⚡ JIT compilation: < 5ms per block
- ⚡ Block disposal: < 50ms
- ⚡ Parse validation: < 100ms for 50 elements

**Verification**:
```typescript
const iterations = 1000;
const start = performance.now();

for (let i = 0; i < iterations; i++) {
  stack.push(createBlock());
}

const elapsed = performance.now() - start;
const avgPush = elapsed / iterations;
expect(avgPush).toBeLessThan(1); // < 1ms per push
```

---

## End-to-End Scenario

**Complete workout script execution from parse to disposal**:

```typescript
// 1. Parse script
const script = parseScript(`
  for 3 rounds
    timer 30s
      exercise "Push-ups"
    timer 20s
      exercise "Rest"
`);

// 2. Validate (parse time)
const validation = validate(script);
expect(validation.isValid).toBe(true);

// 3. Compile root
const runtime = new ScriptRuntime();
const root = compiler.compile(script.statements, runtime);

// 4. Execute
runtime.start(root);
expect(runtime.stack.depth).toBe(1); // Root pushed

// 5. Advance through structure
runtime.next(); // Compiles "for" block
expect(runtime.stack.depth).toBe(2);

runtime.next(); // Compiles first "timer 30s"
expect(runtime.stack.depth).toBe(3);

runtime.next(); // Compiles "exercise"
expect(runtime.stack.depth).toBe(4);

// 6. Timer expires, triggers pop
await advanceTime(30000);
expect(runtime.stack.depth).toBe(3); // Exercise popped

// 7. Continue until complete
await runtime.completeExecution();
expect(runtime.stack.depth).toBe(0); // All popped

// 8. Verify all blocks disposed
expect(allBlocksDisposed).toBe(true);
```

---

## Success Criteria

All phases must pass with:
- ✅ All tests passing (green)
- ⚡ All performance targets met
- 📝 Clear error messages for all failures
- 🧹 No memory leaks (all references cleared)

## Troubleshooting

### Tests failing in Phase 1
- Check parser visitor includes validation rules
- Verify error messages include source positions

### Tests failing in Phase 2
- Ensure JIT compiler supports lazy compilation
- Check parent blocks track currentChildIndex

### Tests failing in Phase 3
- Verify sequential execution (no parallel children)
- Check next() returns correct NextAction

### Performance tests failing
- Profile critical paths with browser devtools
- Check for unnecessary allocations or deep cloning

### Memory leaks detected
- Verify dispose() called on all popped blocks
- Check references are set to undefined, arrays cleared

---

## Next Steps

After quickstart passes:
1. Run full test suite: `npm run test:unit`
2. Build Storybook: `npm run build-storybook`
3. Verify no regressions in existing features
4. Update documentation with examples
