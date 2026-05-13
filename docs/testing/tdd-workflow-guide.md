# Test-Driven Development (TDD) Workflow Guide

This guide explains the Test-Driven Development workflow specific to the WOD Wiki project. It defines roles, responsibilities, and processes for the TDD cycle.

## Table of Contents

1. [TDD Philosophy](#tdd-philosophy)
2. [The Red-Green-Refactor Cycle](#the-red-green-refactor-cycle)
3. [Roles and Responsibilities](#roles-and-responsibilities)
4. [TDD Workflow Step-by-Step](#tdd-workflow-step-by-step)
5. [Common Patterns](#common-patterns)
6. [Troubleshooting](#troubleshooting)

## TDD Philosophy

### Core Principle

**Always write tests BEFORE implementation code.**

This is non-negotiable. Tests written after implementation are circular validation and provide no value.

### Why TDD Matters

1. **Tests drive good design**: When you write tests first, you design for testability
2. **Tests serve as documentation**: Failing tests show what the code should do
3. **No circular validation**: Tests prove implementation meets requirements
4. **Regression protection**: Tests catch future breaks
5. **Confidence in refactoring**: Tests ensure behavior doesn't change

### The TDD Mantra

> **"Red, Green, Refactor"**

- **Red**: Write a failing test that shows what you want
- **Green**: Write the minimal code to make the test pass
- **Refactor**: Improve the code while keeping tests green

## The Red-Green-Refactor Cycle

### Phase 1: RED 🔴

**Write failing tests first.**

**Who**: Unit Test Engineer (wod-unit-tester)

**Responsibilities**:
- Understand requirements from issue/spec
- Write failing tests that validate expected behavior
- Ensure tests actually fail (not tautological)
- Document expected behavior clearly
- Pass failing tests to Core Developer

**Quality Standards**:
- Tests MUST fail on missing implementation
- Tests MUST pass on correct implementation
- Multiple assertions per test (≥3 average)
- Cover happy paths, edge cases, and errors

**Exit Criteria**:
- All tests fail with clear error messages
- Test intent is documented
- Tests cover all requirements
- Handoff to Core Developer complete

### Phase 2: GREEN 🟢

**Write implementation to pass tests.**

**Who**: Core Developer

**Responsibilities**:
- Read failing tests to understand requirements
- Write minimal implementation to pass tests
- Don't add features beyond what tests require
- Make tests pass one by one
- Run tests continuously while developing

**Quality Standards**:
- Implementation passes all tests
- No adding features not in tests
- No skipping tests or commenting them out
- Minimal code that satisfies tests

**Exit Criteria**:
- All tests pass
- Implementation is clean and simple
- No test failures or skips
- Ready for refactoring

### Phase 3: REFACTOR 🔵

**Improve code while keeping tests green.**

**Who**: Collaborative (Unit Test Engineer + Core Developer)

**Responsibilities**:
- Review code for improvements
- Extract abstractions
- Remove duplication
- Improve names and structure
- Keep tests green throughout

**Quality Standards**:
- Tests still pass after refactoring
- Code is more maintainable
- No behavior changes
- Tests still catch bugs

**Exit Criteria**:
- Code is clean and maintainable
- Tests still pass
- No behavior changes
- Ready for next cycle

## Roles and Responsibilities

### Unit Test Engineer (wod-unit-tester)

**Primary Responsibility**: Own unit testing and TDD workflow

**In Scope**:
- Isolated unit tests for functions and methods
- Unit tests for React components (without browser)
- Parser testing with Lezer grammar patterns
- TypeScript type-level testing
- Test harness development
- **RED phase of TDD**

**Out of Scope**:
- Integration testing (wod-dogfood-tester)
- E2E testing (wod-dogfood-tester)
- Implementation code (Core Developer)
- Manual testing (QA)

**Success Metrics**:
- Line coverage >80%
- Branch coverage >70%
- Zero tautological tests
- ≥3 assertions per test average
- Tests drive good design

### Core Developer

**Primary Responsibility**: Write implementation code

**Responsibilities**:
- **GREEN phase of TDD**: Implement code to pass tests
- Read failing tests to understand requirements
- Write minimal code to satisfy tests
- Collaborate on refactoring
- Ensure tests pass continuously

**Working with Unit Test Engineer**:
- Receive failing tests (RED phase)
- Implement code (GREEN phase)
- Collaborate on refactoring (REFACTOR phase)
- Never write tests after implementation

## TDD Workflow Step-by-Step

### Step 1: Understand Requirements

**Input**: Issue, spec, or user story

**Actions**:
1. Read the issue description carefully
2. Identify acceptance criteria
3. Clarify ambiguities with stakeholders
4. Identify edge cases and error conditions

**Example**: WOD-29 requires component testing guidelines

**Requirements**:
- Create testing guidelines document
- Create test templates
- Create Storybook testing guide
- Create PR testing checklist

### Step 2: Write Failing Tests (RED Phase)

**Who**: Unit Test Engineer

**Actions**:
1. Create test file: `YourFeature.test.ts`
2. Import test harness: `BehaviorTestHarness`, `MockBlock`
3. Write test cases for all requirements
4. **Run tests to verify they FAIL**
5. Ensure failures are clear and helpful

**Example**:

```typescript
// src/runtime/behaviors/__tests__/TimerBehavior.test.ts
import { describe, it, expect, afterEach } from 'bun:test';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { TimerBehavior } from '../TimerBehavior';

describe('TimerBehavior', () => {
  let harness: BehaviorTestHarness;

  afterEach(() => { harness?.dispose(); });

  it('should initialize timer with countdown direction', () => {
    // This test WILL FAIL because TimerBehavior doesn't exist yet
    harness = new BehaviorTestHarness();
    const block = new MockBlock('test', [new TimerBehavior('down')]);

    harness.push(block);
    harness.mount();

    const timerMemory = block.getMemoryByTag('time');
    expect(timerMemory.length).toBeGreaterThan(0);

    const timerValue = timerMemory[0].metrics[0].value;
    expect(timerValue.direction).toBe('down');
  });
});
```

**Verify RED**:
```bash
$ bun test src/runtime/behaviors/__tests__/TimerBehavior.test.ts
✗ TimerBehavior should initialize timer with countdown direction
  ReferenceError: TimerBehavior is not defined
```

**Success Criteria**:
- ✅ Test fails with clear error
- ✅ Error message shows what's missing
- ✅ Test name describes expected behavior
- ✅ Multiple assertions for completeness

### Step 3: Implement Code (GREEN Phase)

**Who**: Core Developer

**Actions**:
1. Read failing tests carefully
2. Create implementation file: `TimerBehavior.ts`
3. Implement minimal code to pass tests
4. **Run tests continuously while coding**
5. Stop when all tests pass

**Example**:

```typescript
// src/runtime/behaviors/TimerBehavior.ts
export class TimerBehavior implements IRuntimeBehavior {
  constructor(private direction: 'up' | 'down') {}

  onMount(context: IBehaviorContext): IRuntimeAction[] {
    context.pushMemory('time', [{
      type: MetricType.Time,
      value: {
        direction: this.direction,
        durationMs: 0,
        label: '',
        spans: [{ started: Date.now() }]
      }
    }]);

    return [];
  }
}
```

**Verify GREEN**:
```bash
$ bun test src/runtime/behaviors/__tests__/TimerBehavior.test.ts
✓ TimerBehavior should initialize timer with countdown direction
```

**Success Criteria**:
- ✅ All tests pass
- ✅ Minimal implementation (no extra features)
- ✅ No test modifications
- ✅ Code is simple and clear

### Step 4: Refactor (REFACTOR Phase)

**Who**: Collaborative

**Actions**:
1. Review code for improvements
2. Extract common patterns
3. Improve names and structure
4. Remove duplication
5. **Run tests after every change**

**Example Refactorings**:

```typescript
// Before: Duplicate initialization logic
onMount(context: IBehaviorContext): IRuntimeAction[] {
  context.pushMemory('time', [{
    type: MetricType.Time,
    value: { direction: this.direction, /* ... */ }
  }]);
  return [];
}

onNext(context: IBehaviorContext): IRuntimeAction[] | undefined {
  // Similar initialization logic duplicated
  context.pushMemory('time', [{
    type: MetricType.Time,
    value: { direction: this.direction, /* ... */ }
  }]);
  return undefined;
}

// After: Extract common logic
private createTimerValue(): TimerValue {
  return {
    direction: this.direction,
    durationMs: 0,
    label: '',
    spans: [{ started: Date.now() }]
  };
}

onMount(context: IBehaviorContext): IRuntimeAction[] {
  context.pushMemory('time', [{
    type: MetricType.Time,
    value: this.createTimerValue()
  }]);
  return [];
}
```

**Verify Tests Still Pass**:
```bash
$ bun test src/runtime/behaviors/__tests__/TimerBehavior.test.ts
✓ TimerBehavior should initialize timer with countdown direction
```

**Success Criteria**:
- ✅ Tests still pass
- ✅ Code is more maintainable
- ✅ No behavior changes
- ✅ Duplication reduced

### Step 5: Document and Repeat

**Actions**:
1. Document complex test logic
2. Add Storybook stories if applicable
3. Run full test suite
4. Commit with test and implementation together
5. Move to next feature

**Repeat Cycle**:
- Return to Step 1 for next feature
- Keep tests green while adding new tests
- Continuously refactor as you go

## Common Patterns

### Pattern 1: Test Interface First

**Problem**: Need to create a new behavior

**Solution**:
1. Define behavior interface in tests
2. Write test that uses the interface
3. Implement interface in concrete class

```typescript
// Step 1: Write test with ideal interface
it('should subscribe to tick events', () => {
  const behavior = new TimerBehavior('down');
  expect(behavior.subscribedEvents).toContain('tick');
});

// Step 2: Implement to satisfy test
class TimerBehavior implements IRuntimeBehavior {
  get subscribedEvents() {
    return ['tick', 'reset', 'pause', 'resume'];
  }
}
```

### Pattern 2: Test Error Conditions First

**Problem**: Need to handle edge cases

**Solution**:
1. Write tests for error conditions first
2. Implement error handling
3. Then write happy path tests

```typescript
// Step 1: Test error conditions
it('should throw on invalid direction', () => {
  expect(() => new TimerBehavior('invalid' as any))
    .toThrow('Invalid direction: invalid');
});

it('should throw on negative duration', () => {
  expect(() => new TimerBehavior('down', -1000))
    .toThrow('Duration must be positive');
});

// Step 2: Implement validation
constructor(direction: 'up' | 'down', durationMs?: number) {
  if (direction !== 'up' && direction !== 'down') {
    throw new Error(`Invalid direction: ${direction}`);
  }
  if (durationMs !== undefined && durationMs < 0) {
    throw new Error('Duration must be positive');
  }
  this.direction = direction;
  this.durationMs = durationMs;
}
```

### Pattern 3: Test Doubles for Dependencies

**Problem**: Need to test code with dependencies

**Solution**:
1. Use MockBlock for behavior dependencies
2. Use BehaviorTestHarness for runtime dependencies
3. Test behavior in isolation

```typescript
// Test behavior with mocked runtime
it('should dispatch next event on completion', () => {
  const harness = new BehaviorTestHarness();
  const block = new MockBlock('test', [
    new CompletionBehavior()
  ]);

  harness.push(block);
  harness.mount();

  // Verify event was dispatched through runtime
  expect(harness.wasEventEmitted('next')).toBe(true);
});
```

### Pattern 4: Test Before Integration

**Problem**: Need to integrate multiple components

**Solution**:
1. Test each component in isolation first
2. Then test integration
3. Integration tests should be minimal

```typescript
// Step 1: Test TimerBehavior in isolation
describe('TimerBehavior', () => {
  it('should track time correctly', () => {
    // Unit test for TimerBehavior
  });
});

// Step 2: Test CountdownTimerBehavior in isolation
describe('CountdownTimerBehavior', () => {
  it('should count down from initial duration', () => {
    // Unit test for CountdownTimerBehavior
  });
});

// Step 3: Test integration (minimal)
describe('Timer Integration', () => {
  it('should complete workout when countdown ends', () => {
    // Integration test for timer in workout context
  });
});
```

## Troubleshooting

### Problem: Tests Won't Fail

**Symptom**: Tests pass even without implementation

**Diagnosis**: Tautological tests

```typescript
// BAD - Always passes
it('works correctly', () => {
  const result = add(1, 1);
  expect(result).toBe(result); // Always true!
});
```

**Solution**: Write meaningful assertions

```typescript
// GOOD - Fails without implementation
it('adds two numbers', () => {
  const result = add(1, 1);
  expect(result).toBe(2); // Requires correct implementation
});
```

### Problem: Tests Fail After Refactoring

**Symptom**: Tests break when code structure changes

**Diagnosis**: Tests coupled to implementation

```typescript
// BAD - Tests internal structure
it('uses array for storage', () => {
  expect(component.items instanceof Array).toBe(true);
});
```

**Solution**: Test behavior, not structure

```typescript
// GOOD - Tests behavior
it('maintains insertion order', () => {
  component.add('first');
  component.add('second');
  expect(component.get(0)).toBe('first');
  expect(component.get(1)).toBe('second');
});
```

### Problem: Tests Are Slow

**Symptom**: Test suite takes too long to run

**Diagnosis**: Too many integration tests or slow operations

**Solution**:
- Use unit tests for fast feedback
- Keep integration tests minimal
- Use test harness for isolation
- Mock external dependencies

### Problem: Tests Are Fragile

**Symptom**: Tests break randomly

**Diagnosis**: Flaky tests due to timing or shared state

**Solution**:
- Use `afterEach` for cleanup
- Don't share state between tests
- Avoid timing-dependent assertions
- Use deterministic test data

## Best Practices

### DO ✅

1. **Write tests first** - Always RED phase before GREEN phase
2. **Test behavior, not implementation** - Tests survive refactoring
3. **Use appropriate test harness** - BehaviorTestHarness, MockBlock, etc.
4. **Clean up in afterEach** - Call `harness?.dispose()` to prevent leaks
5. **Multiple assertions per test** - ≥3 average for coverage
6. **Test edge cases** - Empty, null, boundary values
7. **Test error conditions** - Invalid inputs, exceptions
8. **Run tests continuously** - Get fast feedback
9. **Refactor while green** - Improve code with tests passing
10. **Document complex tests** - Explain non-obvious setup

### DON'T ❌

1. **Don't write tests after implementation** - Circular validation
2. **Don't write tautological tests** - Must be able to fail
3. **Don't test implementation details** - Tests break on refactoring
4. **Don't over-mock** - Hides implementation bugs
5. **Don't skip tests** - Indicates problem with code or tests
6. **Don't ignore failing tests** - Fix before moving on
7. **Don't write happy-path-only tests** - Must cover errors and edges
8. **Don't share state between tests** - Causes flakiness
9. **Don't use production data in tests** - Use realistic test data
10. **Don't add features not in tests** - Violates TDD principle

## Quick Reference

### Essential Commands

```bash
# Run tests
bun run test              # Unit tests
bun run test:components   # Component/integration tests
bun run test:all          # All tests

# Watch mode
bun run test --watch

# Coverage
bun run test:coverage

# Type check
bun x tsc --noEmit
```

### Test Harness Imports

```typescript
// Behavior testing
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';

// Integration testing
import { ExecutionContextTestBuilder } from '@/testing/harness';

// Factory functions
import {
  createTimerTestHarness,
  createBehaviorTestHarness,
  createCompilationTestHarness,
} from '@/testing/harness';
```

### Test Structure

```typescript
import { describe, it, expect, afterEach } from 'bun:test';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';

describe('YourFeature', () => {
  let harness: BehaviorTestHarness;

  afterEach(() => { harness?.dispose(); });

  it('should do something specific', () => {
    // Arrange
    harness = new BehaviorTestHarness();
    const block = new MockBlock('test', [new YourBehavior()]);

    // Act
    harness.push(block);
    harness.mount();

    // Assert (multiple assertions)
    expect(block.recordings!.pushMemory.length).toBeGreaterThan(0);
    expect(harness.stackDepth).toBe(1);
    expect(harness.currentBlock).toBeDefined();
  });
});
```

## Resources

- [Component Testing Guidelines](/docs/component-testing-guidelines.md)
- [Test Templates](/docs/test-templates.md)
- [Storybook Testing Guide](/docs/storybook-testing.md)
- [PR Testing Checklist](/docs/pr-testing-checklist.md)
- [Test Harness API](/docs/runtime-api.md)
- [AGENTS.md → Unit Test Engineer](/AGENTS.md)
