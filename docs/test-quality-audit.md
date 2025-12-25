# Test Quality Audit Report

**Date:** 2025-12-25  
**Auditor:** AI Assistant  
**Scope:** All test files in `src/` and `tests/` directories

---

## Executive Summary

This audit identified **7 test files** with significant quality issues that reduce test reliability, maintainability, and coverage effectiveness. The issues range from structural problems (truncated files, missing imports) to design problems (code duplication, weak assertions, missing edge cases).

**Status Update (Current):**
- ✅ `TimerBehavior.test.ts` has been migrated to use `BehaviorTestHarness`, removing inline mocks and duplication.
- 🚧 Other files remain pending refactoring.

---

## Issues by Severity

### 🔴 Critical (Broken/Incomplete Tests)

#### 1. Strategy Matching Tests
**File:** `tests/jit-compilation/strategy-matching.test.ts`

**Issues:**
| Issue | Description | Impact |
|-------|-------------|--------|
| Truncated file | File starts mid-test, missing imports and setup | Tests may fail to run |
| Missing shared fixtures | Each test creates identical `ICodeStatement` objects | Maintenance burden, inconsistency risk |
| No parameterized tests | 12+ nearly identical tests with copy-paste structure | Hard to maintain, easy to miss cases |

**Proposed Test Types:**
- [ ] **Parameterized tests** - Use `it.each()` for strategy matching scenarios
- [ ] **Fixture factory** - Create `createStatement()` helper with fragment builder
- [ ] **Matrix testing** - Test all strategy × fragment combinations systematically

```typescript
// Example refactor
describe.each([
  ['TimerStrategy', FragmentType.Timer, true],
  ['TimerStrategy', FragmentType.Effort, false],
  ['RoundsStrategy', FragmentType.Rounds, true],
  ['RoundsStrategy', FragmentType.Timer, false],
])('%s with %s fragment', (strategyName, fragmentType, expected) => {
  it(`should return ${expected}`, () => { ... });
});
```

---

#### 2. TimerBehavior Tests (✅ RESOLVED)
**File:** `src/runtime/behaviors/__tests__/TimerBehavior.test.ts`

**Resolution:**
Migrated to `BehaviorTestHarness` in `tests/harness`. Inline mocks removed.

---

#### 3. Next Button Workflow Tests
**File:** `tests/runtime-execution/workflows/next-button-workflow.test.ts`

**Issues:**
| Issue | Description | Impact |
|-------|-------------|--------|
| Truncated file | Missing imports at file start | Won't compile |
| Flaky memory test | Relies on `global.gc` which may not exist | Environment-dependent failures |
| Async test anti-pattern | Uses `setTimeout` with random delays | Race conditions, flakiness |
| Multiple concerns per test | Single tests verify unrelated behaviors | Hard to diagnose failures |

**Proposed Test Types:**
- [ ] **Synchronous event tests** - Remove async timing, test event handling directly
- [ ] **Separate performance tests** - Move memory/performance tests to dedicated file
- [ ] **Deterministic concurrency tests** - Use controlled Promise sequencing
- [ ] **Single-assertion tests** - One behavior per test

---

### 🟡 Moderate (Poor Quality but Functional)

#### 4. Stack Disposal Tests
**File:** `tests/runtime-execution/stack/stack-disposal.test.ts`

**Issues:**
| Issue | Description | Impact |
|-------|-------------|--------|
| Magic numbers | `LARGE_STACK_SIZE = 10` is misleading | Confusing intent |
| Arbitrary thresholds | `expect(totalTime).toBeLessThan(500)` lacks justification | Meaningless performance assertions |
| Unused spy | `consoleSpy` created but never asserted | Dead code, confusion |
| Missing edge cases | No tests for null blocks, double-disposal safety | Coverage gaps |

**Proposed Test Types:**
- [ ] **Documented performance baselines** - Add comments explaining thresholds
- [ ] **Boundary tests** - Test at 0, 1, max stack depth
- [ ] **Idempotency tests** - Verify dispose() is safe to call multiple times
- [ ] **Error injection tests** - Test behavior when blocks throw during dispose
- [ ] **Remove or use console spy** - Either assert on logs or remove spy

---

#### 5. EffortStrategy Tests
**File:** `src/runtime/strategies/__tests__/EffortStrategy.test.ts`

**Issues:**
| Issue | Description | Impact |
|-------|-------------|--------|
| Inline mock runtime | Same mock object copy-pasted at file level | DRY violation |
| Type coercion | Frequent `as any` casts hide type issues | Type safety bypassed |
| No mock reset | Mocks not cleared between tests | Test pollution risk |
| Missing compile() edge cases | Only happy path compile() testing | Incomplete coverage |

**Proposed Test Types:**
- [ ] **Shared mock factory** - Extract to `__fixtures__/mockRuntime.ts`
- [ ] **Typed mocks** - Use proper mock types or `vi.mocked()` helpers
- [ ] **beforeEach cleanup** - Reset all mocks between tests
- [ ] **Compile error tests** - Test with invalid/missing fragments

---

#### 6. Parser Fragment Tests
**Files:** 
- `src/parser/__tests__/rep-fragment.parser.test.ts`
- `src/parser/__tests__/timer-fragment.parser.test.ts`

**Issues:**
| Issue | Description | Impact |
|-------|-------------|--------|
| Minimal coverage | Only 2-4 tests per file | Many untested scenarios |
| No error cases | Only happy path testing | Silent failures possible |
| No boundary tests | Missing max values, overflow scenarios | Edge case bugs |
| No whitespace handling | Missing tests for formatting variations | Parser brittleness |

**Proposed Test Types:**
- [ ] **Invalid input tests** - Malformed timers, negative reps, non-numeric values
- [ ] **Boundary tests** - `99:59:59`, `0`, `999999` reps
- [ ] **Whitespace variations** - `5 : 00`, `5:00 `, ` 5:00`
- [ ] **Unicode handling** - Full-width digits, special characters
- [ ] **Error message tests** - Verify helpful error messages for invalid input

```typescript
// Example additions
describe('Timer fragment error cases', () => {
  it.each([
    ['99:99', 'invalid seconds'],
    ['-5:00', 'negative time'],
    ['5:00:00:00', 'too many segments'],
    ['abc:def', 'non-numeric'],
  ])('rejects %s (%s)', (input, reason) => {
    const result = parse(input);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

---

### 🟢 Minor (Good but Could Be Better)

#### 7. timeUtils Tests
**File:** `src/lib/timeUtils.test.ts`

**Issues:**
| Issue | Description | Impact |
|-------|-------------|--------|
| Missing edge cases | No negative, NaN, Infinity tests | Potential runtime errors |
| No error handling tests | Unknown behavior for invalid inputs | Undefined behavior |
| Hardcoded dates | Uses specific date strings | Timezone sensitivity risk |

**Proposed Test Types:**
- [ ] **Edge value tests** - `NaN`, `Infinity`, `-Infinity`, `Number.MAX_SAFE_INTEGER`
- [ ] **Negative value tests** - How should `-1000ms` format?
- [ ] **Timezone tests** - Verify consistent behavior across timezones
- [ ] **Property-based tests** - Use fast-check for randomized input testing

---

## Recommended Test Patterns

### 1. Parameterized Tests (for repetitive scenarios)
```typescript
describe.each([
  [input1, expected1],
  [input2, expected2],
])('when input is %s', (input, expected) => {
  it(`returns ${expected}`, () => {
    expect(fn(input)).toBe(expected);
  });
});
```

### 2. Shared Test Fixtures
```typescript
// __fixtures__/statements.ts
export const createStatement = (fragments: Fragment[]): ICodeStatement => ({
  id: new BlockKey('test'),
  fragments,
  children: [],
  meta: undefined
});

export const timerFragment = (ms: number) => ({
  fragmentType: FragmentType.Timer,
  value: ms,
  type: 'timer'
});
```

### 3. Mock Factories with Reset
```typescript
// __fixtures__/mockRuntime.ts
export const createMockRuntime = () => {
  const mock = {
    stack: { current: null, blocks: [] },
    // ...
  };
  return {
    runtime: mock,
    reset: () => vi.clearAllMocks()
  };
};

// In test file
let mockRuntime: ReturnType<typeof createMockRuntime>;
beforeEach(() => {
  mockRuntime = createMockRuntime();
});
afterEach(() => {
  mockRuntime.reset();
});
```

### 4. Deterministic Time Testing
```typescript
// Use fake timers for time-dependent tests
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});
```

---

## Implementation Priority

| Priority | File | Effort | Impact | Status |
|----------|------|--------|--------|--------|
| 1 | `strategy-matching.test.ts` | Medium | High | Pending |
| 2 | `TimerBehavior.test.ts` | Medium | High | ✅ Done |
| 3 | `next-button-workflow.test.ts` | High | High | Pending |
| 4 | `*-fragment.parser.test.ts` | Low | Medium | Pending |
| 5 | `stack-disposal.test.ts` | Low | Medium | Pending |
| 6 | `EffortStrategy.test.ts` | Low | Low | Pending |
| 7 | `timeUtils.test.ts` | Low | Low | Pending |

---

## Metrics to Track

After refactoring, measure improvement via:

1. **Test count** - Should increase with edge case coverage
2. **Flakiness rate** - Should drop to 0% with deterministic tests
3. **Code coverage** - Target >80% on critical paths
4. **Mutation testing score** - Use Stryker to verify test effectiveness
5. **Test execution time** - Should remain under 30s for unit tests

---

## Next Steps

1. [ ] Review this document with team
2. [ ] Create GitHub issues for each file requiring refactoring
3. [ ] Prioritize based on risk and effort
4. [ ] Refactor one file at a time, ensuring all tests pass
5. [ ] Add missing test types as identified above
6. [ ] Run mutation testing to validate improvements
