# PR Testing Checklist

Use this checklist when reviewing or submitting pull requests to ensure testing standards are met.

## Pre-Merge Checklist

### Unit Tests

- [ ] **New code has unit tests**
  - [ ] Tests cover happy path scenarios
  - [ ] Tests cover edge cases (empty, null, boundary values)
  - [ ] Tests cover error conditions
  - [ ] Tests are NOT tautological (can actually fail)

- [ ] **Test quality standards**
  - [ ] ≥3 assertions per test average
  - [ ] Multiple test cases (not just one big test)
  - [ ] Tests use real dependencies (no over-mocking)
  - [ ] Tests use realistic test data

- [ ] **Test structure**
  - [ ] Tests follow TDD pattern (RED → GREEN → REFACTOR)
  - [ ] Tests written BEFORE implementation (not after)
  - [ ] Tests use appropriate harness (BehaviorTestHarness, ExecutionContextTestHarness, etc.)
  - [ ] Tests use `afterEach` for cleanup (`harness?.dispose()`)

### Component Integration Tests

- [ ] **React components have integration tests**
  - [ ] Component renders with default props
  - [ ] Component renders with custom props
  - [ ] Component handles user interactions
  - [ ] Component handles edge cases (loading, error, empty states)

- [ ] **Storybook stories exist**
  - [ ] Stories demonstrate different states
  - [ ] Stories include interaction tests (`play` function)
  - [ ] Stories use `step()` to describe interactions
  - [ ] Stories verify user-facing behavior

### Test Execution

- [ ] **All tests pass**
  ```bash
  bun run test              # Unit tests
  bun run test:components   # Component/integration tests
  bun run test:all          # All tests combined
  ```

- [ ] **No new test failures introduced**
  - [ ] Baseline failures documented and acceptable
  - [ ] New tests are not failing (unless RED phase)
  - [ ] Old tests still passing

- [ ] **Test performance is acceptable**
  - [ ] Test suite completes in reasonable time (<5s for unit tests)
  - [ ] No infinite loops or hanging tests
  - [ ] No excessive test runtime

## Test Quality Validation

### Multi-Layer Validation Protocol

Use this 5-layer validation to ensure test quality:

#### Layer 1: Syntax Validation ✅

- [ ] Tests compile without TypeScript errors
- [ ] No import/export errors
- [ ] No syntax errors in test code

**Command**: `bun x tsc --noEmit` (check for test-related type errors)

#### Layer 2: Logic Validation ✅

- [ ] Test assertions are meaningful (not tautologies)
- [ ] Tests verify behavior, not implementation details
- [ ] Test names clearly describe what is being tested
- [ ] Tests follow Arrange-Act-Assert pattern

**Example of good assertion**:
```typescript
expect(timerValue.remainingMs).toBeLessThan(30000);
```

**Example of bad assertion**:
```typescript
expect(result).toBe(result); // Tautology!
```

#### Layer 3: Execution Validation ✅

- [ ] Tests actually execute (not skipped or pending)
- [ ] Tests pass on known good code
- [ ] Tests fail when implementation is missing (RED phase)
- [ ] Tests catch real bugs

**Validation steps**:
1. Run tests on current code (should pass)
2. Temporarily break implementation
3. Verify tests catch the breakage
4. Restore implementation
4. Verify tests pass again

#### Layer 4: Coverage Validation ✅

- [ ] New code has adequate coverage (>80% line coverage)
- [ ] Critical paths have 100% coverage
- [ ] Edge cases are covered
- [ ] Error conditions are tested

**Command**: `bun run test:coverage`

**Coverage goals**:
- Line coverage: >80%
- Branch coverage: >70%
- Function coverage: >85%
- Critical paths: 100%

#### Layer 5: Failure Validation ✅

- [ ] Tests can actually fail (are not guaranteed to pass)
- [ ] Tests fail for the right reason (clear error messages)
- [ ] Failure messages are helpful for debugging
- [ ] Tests are not flaky (consistent results)

**How to validate**:
1. Introduce a bug in the implementation
2. Run the tests
3. Verify tests fail with clear error message
4. Fix the bug
5. Verify tests pass again

## Common Anti-Patterns to Reject

### ❌ Tautological Tests

Reject tests that always pass:

```typescript
// BAD - Reject this
it('works correctly', () => {
  const result = add(1, 1);
  expect(result).toBe(result); // Always passes!
});

// GOOD - Accept this
it('adds two numbers correctly', () => {
  const result = add(1, 1);
  expect(result).toBe(2); // Meaningful assertion
});
```

### ❌ Implementation Tests

Reject tests that break on refactoring:

```typescript
// BAD - Reject this
it('uses array for storage', () => {
  expect(component.items instanceof Array).toBe(true);
});

// GOOD - Accept this
it('maintains item order', () => {
  component.add('first');
  component.add('second');
  expect(component.get(0)).toBe('first');
});
```

### ❌ Over-Mocked Tests

Reject tests with too much mocking:

```typescript
// BAD - Reject this
it('processes data', () => {
  const mockService = mock();
  mockService.process.mockReturnValue('mocked');
  const result = component.process(mockService);
  expect(result).toBe('mocked'); // Tests the mock, not the code
});

// GOOD - Accept this
it('processes data correctly', () => {
  const service = new RealService();
  const result = component.process(service);
  expect(result).toEqual(expectedData);
});
```

### ❌ Happy-Path-Only Tests

Reject tests that only cover success cases:

```typescript
// BAD - Reject this
it('parses valid input', () => {
  expect(parser.parse('10:00 Run')).toBeDefined();
});

// GOOD - Accept this
describe('parse', () => {
  it('parses valid input', () => {
    expect(parser.parse('10:00 Run').durationMs).toBe(600000);
  });

  it('throws on invalid input', () => {
    expect(() => parser.parse('invalid')).toThrow();
  });
});
```

## Type Safety

### TypeScript Validation

- [ ] **No new TypeScript errors**
  - [ ] `bun x tsc --noEmit` passes (except for baseline 369 errors)
  - [ ] New code doesn't introduce type errors
  - [ ] Test files have proper type definitions

- [ ] **Type coverage**
  - [ ] Functions have return types
  - [ ] Parameters have type annotations
  - [ ] No `any` types without justification
  - [ ] Props are properly typed

## E2E Acceptance Tests (When Required)

E2E tests are **required** for:
- UI/layout changes
- User interaction flows
- Form submissions
- Navigation changes
- Multi-page workflows

### E2E Checklist

- [ ] **E2E tests written for UI changes**
  - [ ] Tests verify user-facing behavior
  - [ ] Tests use page objects (avoid brittle selectors)
  - [ ] Tests cover both mobile and desktop (if layout affected)
  - [ ] Tests are deterministic (no random data or timing dependencies)

- [ ] **E2E tests pass**
  ```bash
  bun run test:e2e
  ```

- [ ] **Storybook smoke test**
  - [ ] Storybook runs without errors: `bun run storybook`
  - [ ] Affected stories render correctly
  - [ ] No console errors in browser

- [ ] **Build validation**
  - [ ] `bun run build-storybook` completes successfully
  - [ ] Static build generates correctly
  - [ ] No build-time errors

## Documentation

### Test Documentation

- [ ] **Complex tests have comments**
  - [ ] Non-obvious test setup is explained
  - [ ] Edge cases are documented
  - [ ] Test purpose is clear from name and structure

- [ ] **Storybook stories documented**
  - [ ] Stories have descriptions
  - [ ] Component props are documented
  - [ ] Interaction flows are clear

## Performance Considerations

### Test Performance

- [ ] **Tests run efficiently**
  - [ ] Unit test suite completes in <5 seconds
  - [ ] No unnecessary sleeps or waits
  - [ ] No redundant test setup

- [ ] **No memory leaks**
  - [ ] Tests clean up resources (`afterEach` hooks)
  - [ ] No event listeners left dangling
  - [ ] No memory growth across tests

### Code Performance

- [ ] **Performance tests pass** (if applicable)
  ```bash
  bun run test:perf
  ```

- [ ] **No performance regressions**
  - [ ] Runtime stack operations meet performance targets
  - [ ] JIT compilation completes in reasonable time
  - [ ] Memory usage is acceptable

## Integration Points

### Cross-Component Integration

- [ ] **Component interactions tested**
  - [ ] Parent-child component communication
  - [ ] Event propagation
  - [ ] State sharing

### Service Integration

- [ ] **Service integrations tested**
  - [ ] API calls mocked appropriately
  - [ ] Error handling verified
  - [ ] Loading states tested

## Security Considerations

### Input Validation

- [ ] **Input sanitization tested**
  - [ ] XSS attack vectors tested
  - [ ] SQL injection vectors tested (if applicable)
  - [ ] Path traversal tested (if applicable)

### Error Handling

- [ ] **Error boundaries tested**
  - [ ] Component failures handled gracefully
  - [ ] Error messages user-friendly
  - [ ] No sensitive data leaked in errors

## Accessibility Testing

### ARIA Attributes

- [ ] **Components are accessible**
  - [ ] Proper ARIA labels
  - [ ] Keyboard navigation works
  - [ ] Screen reader support verified

### Focus Management

- [ ] **Focus management tested**
  - [ ] Focus moves logically
  - [ ] Modal focus trapping works
  - [ ] Focus restoration on close

## Before Merge Final Checks

### Final Validation

- [ ] **All checklist items complete**
- [ ] **No unresolved blockers**
- [ ] **Documentation updated**
- [ ] **Tests passing locally**
- [ ] **CI checks passing**

### Merge Approval

- [ ] **Code review approved**
- [ ] **Tests reviewed and approved**
- [ ] **Documentation reviewed**
- [ ] **Performance validated** (if applicable)
- [ ] **Security reviewed** (if applicable)

## Post-Merge Verification

### After Merge

- [ ] **Tests still pass in CI**
- [ ] **No regressions detected**
- [ ] **Documentation published**
- [ ] **Storybook deployed** (if applicable)

---

## Quick Reference

### Essential Commands

```bash
# Run all tests
bun run test

# Run unit tests only
bun run test

# Run component/integration tests
bun run test:components

# Run all tests (unit + component)
bun run test:all

# Run with coverage
bun run test:coverage

# Run Storybook
bun run storybook

# Run Storybook tests
bun run test:storybook

# Run E2E tests
bun run test:e2e

# Type check
bun x tsc --noEmit
```

### Test File Locations

- **Unit tests**: `src/**/*.test.ts`
- **Component tests**: `tests/**/*.test.ts`
- **E2E tests**: `e2e/**/*.e2e.ts`
- **Storybook stories**: `stories/**/*.stories.tsx`

### Test Harness Imports

```typescript
// Unit testing behaviors
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

## Resources

- [Component Testing Guidelines](/docs/component-testing-guidelines.md)
- [Test Templates](/docs/test-templates.md)
- [Storybook Testing Guide](/docs/storybook-testing.md)
- [Test Harness API](/docs/runtime-api.md)
- [AGENTS.md → Unit Test Engineer](/AGENTS.md)
