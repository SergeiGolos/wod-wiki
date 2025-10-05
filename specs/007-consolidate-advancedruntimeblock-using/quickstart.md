# Quickstart: Consolidate AdvancedRuntimeBlock Using Stacked Behaviors

**Date**: October 4, 2025  
**Feature**: 007-consolidate-advancedruntimeblock-using

This quickstart demonstrates the behavior-based runtime block architecture and validates the feature implementation.

---

## Prerequisites

- Node.js installed with npm
- Repository cloned and dependencies installed (`npm install`)
- Storybook development server or test runner available

---

## Quick Validation

### Run All Tests
```bash
npm run test:unit
```

**Expected Result**: All behavior tests pass, including:
- ChildAdvancementBehavior unit tests
- LazyCompilationBehavior unit tests
- ParentContextBehavior unit tests
- CompletionTrackingBehavior unit tests
- Behavior composition integration tests
- Feature parity contract tests

**Success Criteria**: Zero test failures, all performance benchmarks within requirements

---

### View Behavior Composition in Storybook
```bash
npm run storybook
```

Navigate to:
1. **Runtime > Behavior Composition** story
2. Observe behavior stack visualization
3. Test different behavior combinations via controls
4. Verify execution flow with interactive examples

**Expected Result**: Interactive demonstrations of behavior composition with visual feedback

---

## Step-by-Step Usage

### 1. Create a Simple Runtime Block with Child Advancement

```typescript
import { RuntimeBlock } from './src/runtime/RuntimeBlock';
import { ChildAdvancementBehavior } from './src/runtime/behaviors/ChildAdvancementBehavior';
import { LazyCompilationBehavior } from './src/runtime/behaviors/LazyCompilationBehavior';

// Parse workout script to get CodeStatement array
const children = parser.parse("FOR 3 ROUNDS:\n  RUN 400m\n  REST 1:00");

// Create runtime block with behaviors
const block = new RuntimeBlock(runtime, [0, 0], [
    new ChildAdvancementBehavior(children),
    new LazyCompilationBehavior()
]);

// Push block onto runtime stack
const pushActions = block.push();
runtime.executeActions(pushActions);

// Advance through children
const nextActions = block.next(); // Compiles and returns first child
runtime.executeActions(nextActions);

// Continue until complete
while (!block.isComplete()) {
    const actions = block.next();
    runtime.executeActions(actions);
}
```

**Expected Result**: Block advances through all children sequentially, compiling each on-demand

---

### 2. Add Parent Context Awareness

```typescript
import { ParentContextBehavior } from './src/runtime/behaviors/ParentContextBehavior';

// Create parent block
const parentBlock = new RuntimeBlock(parentRuntime, [0]);

// Create child block with parent context
const childBlock = new RuntimeBlock(childRuntime, [0, 0], [
    new ChildAdvancementBehavior(children),
    new LazyCompilationBehavior(),
    new ParentContextBehavior(parentBlock)
]);

// Access parent context from child
const parentBehavior = childBlock.getBehavior<ParentContextBehavior>(ParentContextBehavior);
const parent = parentBehavior?.getParentContext();

if (parent) {
    console.log('Child block has parent context:', parent);
}
```

**Expected Result**: Child block maintains reference to parent, enabling context-aware execution

---

### 3. Track Completion Status

```typescript
import { CompletionTrackingBehavior } from './src/runtime/behaviors/CompletionTrackingBehavior';

const block = new RuntimeBlock(runtime, [0, 0], [
    new ChildAdvancementBehavior(children),
    new LazyCompilationBehavior(),
    new CompletionTrackingBehavior()
]);

// Advance through all children
while (true) {
    const actions = block.next();
    
    // Check completion
    const completionBehavior = block.getBehavior<CompletionTrackingBehavior>(
        CompletionTrackingBehavior
    );
    
    if (completionBehavior?.getIsComplete()) {
        console.log('Block completed all children');
        break;
    }
    
    runtime.executeActions(actions);
}
```

**Expected Result**: Completion tracking accurately reports when all children processed

---

### 4. Handle Compilation Errors

```typescript
// Child with invalid syntax
const invalidChildren = parser.parse("INVALID SYNTAX HERE");

const block = new RuntimeBlock(runtime, [0, 0], [
    new ChildAdvancementBehavior(invalidChildren),
    new LazyCompilationBehavior()
]);

// Attempt to advance
const actions = block.next();

// Check for ErrorRuntimeBlock
const hasError = actions.some(action => 
    action instanceof NextAction && 
    action.block instanceof ErrorRuntimeBlock
);

console.log('Error handling active:', hasError); // true
```

**Expected Result**: Compilation failures produce ErrorRuntimeBlock, stopping execution gracefully

---

### 5. Compose Full Advanced Behavior Stack

```typescript
import { ChildAdvancementBehavior } from './src/runtime/behaviors/ChildAdvancementBehavior';
import { LazyCompilationBehavior } from './src/runtime/behaviors/LazyCompilationBehavior';
import { ParentContextBehavior } from './src/runtime/behaviors/ParentContextBehavior';
import { CompletionTrackingBehavior } from './src/runtime/behaviors/CompletionTrackingBehavior';

// Full behavior stack (equivalent to AdvancedRuntimeBlock)
const advancedBlock = new RuntimeBlock(runtime, [0, 0], [
    new ChildAdvancementBehavior(children),    // Must be first
    new LazyCompilationBehavior(),             // Depends on ChildAdvancement
    new CompletionTrackingBehavior(),          // Observes others
    new ParentContextBehavior(parentBlock)     // Order independent
]);

// Use exactly like AdvancedRuntimeBlock
advancedBlock.push();
while (!isComplete(advancedBlock)) {
    const actions = advancedBlock.next();
    runtime.executeActions(actions);
}
advancedBlock.pop();
advancedBlock.dispose();
```

**Expected Result**: Full feature parity with AdvancedRuntimeBlock behavior

---

## Verification Scenarios

### Scenario 1: Sequential Execution Validation

**Given**: A runtime block with 3 child statements  
**When**: next() is called 3 times  
**Then**: Each child is compiled and executed in order

**Validation**:
```typescript
const children = [statement1, statement2, statement3];
const block = new RuntimeBlock(runtime, [0], [
    new ChildAdvancementBehavior(children),
    new LazyCompilationBehavior()
]);

const action1 = block.next();
const action2 = block.next();
const action3 = block.next();
const action4 = block.next(); // Should be empty

expect(action1.length).toBe(1); // First child compiled
expect(action2.length).toBe(1); // Second child compiled
expect(action3.length).toBe(1); // Third child compiled
expect(action4.length).toBe(0); // No more children
```

---

### Scenario 2: Performance Validation

**Given**: A runtime block with full behavior stack  
**When**: next() is called 100 times  
**Then**: Average execution time < 5ms per call

**Validation**:
```typescript
const block = createFullBehaviorStack(runtime, children);

const start = performance.now();
for (let i = 0; i < 100; i++) {
    block.next();
}
const end = performance.now();

const avgTime = (end - start) / 100;
expect(avgTime).toBeLessThan(5); // < 5ms per call
```

---

### Scenario 3: Feature Parity Validation

**Given**: Existing AdvancedRuntimeBlock test scenarios  
**When**: Same scenarios run with behavior-based blocks  
**Then**: Identical results with zero behavioral differences

**Validation**:
```typescript
// Run all existing AdvancedRuntimeBlock contract tests
// against behavior-based implementation
import { advancedRuntimeBlockContractTests } from './tests/runtime/contract/advanced-runtime-block.contract';

const behaviorBasedBlock = new RuntimeBlock(runtime, [0], [
    new ChildAdvancementBehavior(children),
    new LazyCompilationBehavior(),
    new CompletionTrackingBehavior(),
    new ParentContextBehavior(parent)
]);

advancedRuntimeBlockContractTests.forEach(test => {
    const result = test.run(behaviorBasedBlock);
    expect(result).toEqual(test.expectedResult);
});
```

---

## Troubleshooting

### Issue: Behaviors not executing in correct order

**Symptom**: LazyCompilationBehavior throws error about missing child index

**Solution**: Ensure ChildAdvancementBehavior is first in behavior array
```typescript
// ❌ Wrong order
new RuntimeBlock(runtime, [0], [
    new LazyCompilationBehavior(),        // Executes first
    new ChildAdvancementBehavior(children) // Executes second
]);

// ✅ Correct order
new RuntimeBlock(runtime, [0], [
    new ChildAdvancementBehavior(children), // Executes first
    new LazyCompilationBehavior()          // Executes second
]);
```

---

### Issue: Performance degradation with behavior stack

**Symptom**: next() exceeds 5ms execution time

**Solution**: 
1. Check behavior count (should be 2-4 behaviors)
2. Verify no heavy computation in behavior lifecycle methods
3. Use performance profiler to identify slow behavior
4. Consider enabling compilation caching in LazyCompilationBehavior

```typescript
// Enable caching for improved performance
const block = new RuntimeBlock(runtime, [0], [
    new ChildAdvancementBehavior(children),
    new LazyCompilationBehavior(true), // Enable caching
    new CompletionTrackingBehavior()
]);
```

---

### Issue: Parent context not accessible

**Symptom**: getParentContext() returns undefined

**Solution**: Verify ParentContextBehavior added to block and parent passed to constructor
```typescript
// ❌ Missing ParentContextBehavior
const block = new RuntimeBlock(runtime, [0], [
    new ChildAdvancementBehavior(children)
]);

// ✅ ParentContextBehavior included
const block = new RuntimeBlock(runtime, [0], [
    new ChildAdvancementBehavior(children),
    new ParentContextBehavior(parentBlock) // Parent context provided
]);
```

---

### Issue: Compilation errors not handled

**Symptom**: Application crashes on invalid workout syntax

**Solution**: Ensure LazyCompilationBehavior included and error handling active
```typescript
const block = new RuntimeBlock(runtime, [0], [
    new ChildAdvancementBehavior(children),
    new LazyCompilationBehavior() // Handles compilation errors
]);

// LazyCompilationBehavior returns ErrorRuntimeBlock on failure
// Runtime stack handles error and stops execution gracefully
```

---

## Success Criteria Checklist

- [ ] All unit tests pass for individual behaviors
- [ ] Integration tests pass for behavior composition
- [ ] Contract tests pass for feature parity with AdvancedRuntimeBlock
- [ ] Performance benchmarks meet requirements (< 5ms next(), < 1ms push/pop)
- [ ] Storybook stories demonstrate behavior composition
- [ ] Error handling works correctly (ErrorRuntimeBlock on compilation failure)
- [ ] Parent context accessible when ParentContextBehavior included
- [ ] Completion tracking accurate for all test scenarios
- [ ] Zero behavioral regressions compared to AdvancedRuntimeBlock
- [ ] Documentation and examples updated

---

## Next Steps

1. **Run Tests**: Execute `npm run test:unit` to validate implementation
2. **View Stories**: Launch Storybook to see interactive demonstrations
3. **Review Documentation**: Read behavior-based-architecture-consolidation.md for architecture details
4. **Migrate Usage**: Update codebase to replace AdvancedRuntimeBlock with behavior composition
5. **Deprecate Legacy**: Add deprecation warnings to AdvancedRuntimeBlock
6. **Remove Legacy**: Delete AdvancedRuntimeBlock and IAdvancedRuntimeBlock after migration complete

---

## Additional Resources

- **Architecture Document**: `docs/behavior-based-architecture-consolidation.md`
- **Data Model**: `specs/007-consolidate-advancedruntimeblock-using/data-model.md`
- **Contracts**: `specs/007-consolidate-advancedruntimeblock-using/contracts/`
- **Research**: `specs/007-consolidate-advancedruntimeblock-using/research.md`
- **Unit Tests**: `tests/unit/behaviors/`
- **Integration Tests**: `tests/integration/runtime/behavior-composition.test.ts`
- **Storybook Stories**: `stories/runtime/BehaviorComposition.stories.tsx`
