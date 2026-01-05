# Refactoring Action Plan
## WOD Wiki - Prioritized Implementation Roadmap

**Version:** 1.0  
**Last Updated:** 2026-01-01  
**Status:** In Progress

---

## Overview

This document provides a concrete action plan for addressing the anti-patterns and code smells identified in the [Code Analysis Report](CODE_ANALYSIS.md). Each refactoring is prioritized by impact, effort, and risk.

---

## ✅ Completed Refactorings

### 1. Fix Empty Catch Block in CastManager
**Status:** ✅ COMPLETED  
**Date:** 2026-01-01  
**Issue Reference:** Issue 3.1  
**Files Changed:**
- `src/services/cast/CastManager.ts`
- `src/services/cast/constants.ts` (new)

**Changes Made:**
1. ✅ Replaced empty catch block with proper error handling
2. ✅ Added error logging and event emission
3. ✅ Implemented reconnection exhaustion detection
4. ✅ Created constants file for magic numbers
5. ✅ Replaced all hardcoded values with named constants

**Impact:**
- ✅ Prevents silent failures in WebSocket reconnection logic
- ✅ Improved observability with error events
- ✅ Better maintainability with named constants

**Testing:**
- [x] Type checking passed (no TypeScript errors)
- [ ] Manual testing of reconnection scenarios (requires WebSocket server)
- [ ] Unit tests for error handling (TODO)

---

### 2. Decomposition of Monolithic Behaviors
**Status:** ✅ COMPLETED  
**Date:** 2026-01-04  
**Issue Reference:** Issue 2.1  
**Resolution:**
1. ✅ Removed `LoopCoordinatorBehavior` and replaced with granular behaviors (`ChildIndexBehavior`, `BoundLoopBehavior`, etc.).
2. ✅ Removed `RootLifecycleBehavior` and replaced with `WorkoutOrchestrator` and `WorkoutFlowStateMachine`.
3. ✅ Introduced behavior contracts (`ICompletionSource`, `IRoundSource`, `ITimerSource`, etc.) for decentralized coordination.
4. ✅ Updated `RoundsStrategy`, `IntervalStrategy`, and `WorkoutRootStrategy` to use the new decomposed behaviors.

**Impact:**
- ✅ Massive reduction in cyclomatic complexity (from ~15 to <3 per behavior).
- ✅ Improved testability of individual units.
- ✅ Easier to extend with new loop and timing types.
---

## 🔴 High Priority - To Be Implemented

### 2. Break Down God Files (QueueTestHarness.tsx - 836 lines)
**Status:** 🔲 PLANNED  
**Priority:** HIGH  
**Effort:** 2-3 days  
**Risk:** MEDIUM  
**Issue Reference:** Issue 1.1

**Proposed Structure:**
```
src/testing/components/QueueTestHarness/
├── index.tsx                           # Main component (< 200 lines)
├── types.ts                            # Interfaces and types
├── templates/
│   ├── index.ts                        # Export all templates
│   ├── effortCompletionTemplate.ts
│   ├── timerBehaviorTemplate.ts
│   └── loopProgressionTemplate.ts
├── hooks/
│   ├── useQueueExecution.ts            # Queue execution logic
│   ├── useRuntimeSnapshot.ts           # Snapshot management
│   └── useTemplateLoader.ts            # Template loading/switching
└── executors/
    ├── ActionExecutor.ts               # Base interface
    ├── PushActionExecutor.ts
    ├── MountActionExecutor.ts
    ├── NextActionExecutor.ts
    ├── UnmountActionExecutor.ts
    ├── PopActionExecutor.ts
    ├── TickActionExecutor.ts
    └── SimulateActionExecutor.ts
```

**Implementation Steps:**
1. [ ] Create directory structure
2. [ ] Extract types to `types.ts`
3. [ ] Extract templates to `templates/` directory
4. [ ] Create action executor strategy pattern (see Issue 1.2)
5. [ ] Extract hooks for queue execution
6. [ ] Extract hooks for snapshot management
7. [ ] Refactor main component to use extracted pieces
8. [ ] Update imports across codebase
9. [ ] Run tests to ensure no regressions
10. [ ] Update Storybook stories if needed

**Benefits:**
- Improved testability (each piece can be tested in isolation)
- Better code organization and navigation
- Easier to review in pull requests
- Reduced cognitive load when working with the component

---

### 3. Reduce Cyclomatic Complexity in LoopCoordinatorBehavior
**Status:** ✅ COMPLETED (via Decomposition)
**Priority:** HIGH  
**Issue Reference:** Issue 2.1

**Target Methods:**
1. `validateConfig()` - Extract to validator strategy pattern
2. `onNext()` - Simplify with guard clauses
3. `advance()` - Extract helper methods

**Proposed Refactoring:**

**Step 1: Create Validator Strategy Pattern**
```typescript
// src/runtime/behaviors/validators/LoopConfigValidator.ts
interface LoopConfigValidator {
  validate(config: LoopConfig): void;
}

class FixedLoopValidator implements LoopConfigValidator { /* ... */ }
class RepSchemeLoopValidator implements LoopConfigValidator { /* ... */ }
class IntervalLoopValidator implements LoopConfigValidator { /* ... */ }
class TimeBoundLoopValidator implements LoopConfigValidator { /* ... */ }

// Registry
const VALIDATORS = new Map<LoopType, LoopConfigValidator>([
  [LoopType.FIXED, new FixedLoopValidator()],
  [LoopType.REP_SCHEME, new RepSchemeLoopValidator()],
  [LoopType.INTERVAL, new IntervalLoopValidator()],
  [LoopType.TIME_BOUND, new TimeBoundLoopValidator()],
]);
```

**Step 2: Simplify validateConfig()**
```typescript
private validateConfig(config: LoopConfig): void {
  if (config.childGroups.length === 0) {
    throw new RangeError('childGroups must not be empty');
  }
  
  const validator = VALIDATORS.get(config.loopType);
  if (validator) {
    validator.validate(config);
  }
}
```

**Step 3: Extract Helper Methods for onNext()**
```typescript
private canAdvance(block: IRuntimeBlock, clock: IRuntimeClock): boolean {
  if (this._isComplete) return false;
  if (this.config.loopType !== LoopType.INTERVAL) return true;
  
  return !this.isWaitingForInterval || this.isIntervalComplete(block, clock.now);
}

private isIntervalComplete(block: IRuntimeBlock, now: Date): boolean {
  const timerBehavior = block.getBehavior(TimerBehavior);
  return !timerBehavior || !timerBehavior.isRunning() || timerBehavior.isComplete(now);
}
```

**Implementation Steps:**
1. [ ] Create validator directory and interface
2. [ ] Implement validator classes for each loop type
3. [ ] Add unit tests for each validator
4. [ ] Refactor validateConfig() to use validators
5. [ ] Extract helper methods from onNext()
6. [ ] Add unit tests for helper methods
7. [ ] Run full test suite
8. [ ] Update documentation

**Benefits:**
- Reduced cyclomatic complexity from ~15 to ~2
- Each behavior can be tested independently via its contract interface
- More modular and maintainable orchestrations

---

### 4. Implement Structured Error System
**Status:** 🔲 PLANNED  
**Priority:** HIGH  
**Effort:** 2-3 days  
**Risk:** LOW  
**Issue Reference:** Issue 3.3

**Proposed Structure:**
```
src/runtime/errors/
├── index.ts                       # Export all errors
├── RuntimeError.ts                # Base error class
├── ErrorCodes.ts                  # Enum of error codes
├── StackErrors.ts                 # Stack-related errors
├── CompilationErrors.ts           # JIT compilation errors
└── ConfigurationErrors.ts         # Configuration errors
```

**Implementation:**

**Step 1: Create Error Code Enum**
```typescript
// src/runtime/errors/ErrorCodes.ts
export enum RuntimeErrorCode {
  // Stack errors
  STACK_OVERFLOW = 'STACK_OVERFLOW',
  STACK_UNDERFLOW = 'STACK_UNDERFLOW',
  INVALID_BLOCK = 'INVALID_BLOCK',
  
  // Compilation errors
  COMPILATION_FAILED = 'COMPILATION_FAILED',
  INVALID_SYNTAX = 'INVALID_SYNTAX',
  UNKNOWN_STATEMENT_TYPE = 'UNKNOWN_STATEMENT_TYPE',
  
  // Configuration errors
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Memory errors
  MEMORY_ALLOCATION_FAILED = 'MEMORY_ALLOCATION_FAILED',
  MEMORY_NOT_FOUND = 'MEMORY_NOT_FOUND',
  
  // Behavior errors
  INVALID_BEHAVIOR = 'INVALID_BEHAVIOR',
  BEHAVIOR_NOT_FOUND = 'BEHAVIOR_NOT_FOUND',
}
```

**Step 2: Create Base Error Class**
```typescript
// src/runtime/errors/RuntimeError.ts
export class RuntimeError extends Error {
  constructor(
    public readonly code: RuntimeErrorCode,
    message: string,
    public readonly context?: Record<string, unknown>,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'RuntimeError';
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RuntimeError);
    }
  }
  
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      cause: this.cause?.message,
    };
  }
}
```

**Step 3: Create Specific Error Classes**
```typescript
// src/runtime/errors/StackErrors.ts
export class StackOverflowError extends RuntimeError {
  constructor(currentDepth: number, maxDepth: number) {
    super(
      RuntimeErrorCode.STACK_OVERFLOW,
      `Stack depth ${currentDepth} exceeded maximum of ${maxDepth}`,
      { currentDepth, maxDepth }
    );
    this.name = 'StackOverflowError';
  }
}

export class InvalidBlockError extends RuntimeError {
  constructor(blockId: string, reason: string) {
    super(
      RuntimeErrorCode.INVALID_BLOCK,
      `Invalid block ${blockId}: ${reason}`,
      { blockId, reason }
    );
    this.name = 'InvalidBlockError';
  }
}
```

**Implementation Steps:**
1. [ ] Create error directory structure
2. [ ] Implement ErrorCodes enum
3. [ ] Implement base RuntimeError class
4. [ ] Implement specific error classes for each category
5. [ ] Add unit tests for error classes
6. [ ] Update ScriptRuntime to use new errors
7. [ ] Update LoopCoordinatorBehavior to use new errors
8. [ ] Update JitCompiler to use new errors
9. [ ] Update other runtime components
10. [ ] Add error handling examples to documentation
11. [ ] Run full test suite

**Migration Strategy:**
- Replace errors incrementally (file by file)
- Keep old error messages for backwards compatibility
- Add deprecation warnings for old error catching patterns

**Benefits:**
- Consistent error handling across codebase
- Better error categorization and filtering
- Improved debugging with structured context
- Easier to add error monitoring/tracking

---

## 🟡 Medium Priority - Future Sprints

### 5. Extract Action Executor Strategy Pattern
**Status:** 🔲 PLANNED  
**Priority:** MEDIUM  
**Effort:** 1 day  
**Risk:** LOW  
**Issue Reference:** Issue 1.2

**Note:** This can be combined with refactoring #2 (QueueTestHarness)

---

### 6. Extract Timer Role Resolution Logic
**Status:** 🔲 PLANNED  
**Priority:** MEDIUM  
**Effort:** 1 day  
**Risk:** LOW  
**Issue Reference:** Issue 4.1

**Target File:** `src/clock/components/StackedClockDisplay.tsx`

**Proposed Utility:**
```typescript
// src/clock/utils/TimerRoleResolver.ts
export class TimerRoleResolver {
  resolve(
    timerStack: ITimerDisplayEntry[], 
    fallbackCurrent?: ITimerDisplayEntry
  ): { primary: ITimerDisplayEntry | null; secondaries: ITimerDisplayEntry[] }
}
```

**Implementation Steps:**
1. [ ] Create utility class with tests
2. [ ] Refactor StackedClockDisplay to use utility
3. [ ] Add unit tests for edge cases
4. [ ] Update Storybook stories
5. [ ] Run tests

---

### 7. Improve React Root Lifecycle Management
**Status:** 🔲 PLANNED  
**Priority:** MEDIUM  
**Effort:** 1-2 days  
**Risk:** MEDIUM  
**Issue Reference:** Issue 5.1

**Target File:** `src/editor/inline-cards/RowRuleRenderer.ts`

**Implementation Steps:**
1. [ ] Add root tracking set
2. [ ] Implement dispose() method
3. [ ] Add isDisposed flag and checks
4. [ ] Update all root creation to use tracking
5. [ ] Update all root unmounting to use tracking
6. [ ] Add memory leak tests
7. [ ] Update documentation

---

### 8. Refactor Complex View Zone Sorting Logic
**Status:** 🔲 PLANNED  
**Priority:** MEDIUM  
**Effort:** 4 hours  
**Risk:** LOW  
**Issue Reference:** Issue 2.2

**Target File:** `src/editor/inline-cards/RowRuleRenderer.ts:210-226`

**Proposed Refactoring:**
```typescript
// Extract helper functions
function getEffectiveLineNumber(rule: ViewZoneRule): number { /* ... */ }
function compareZonePosition(a: ViewZoneRule, b: ViewZoneRule): number { /* ... */ }
function compareViewZoneRules(...): number { /* ... */ }
```

**Implementation Steps:**
1. [ ] Extract helper functions
2. [ ] Add unit tests for helper functions
3. [ ] Refactor sorting to use helpers
4. [ ] Add integration tests
5. [ ] Run tests

---

## 🟢 Low Priority - Backlog

### 9. Clean Up TODO/FIXME Comments
**Status:** 🔲 PLANNED  
**Priority:** LOW  
**Effort:** 1 day  
**Risk:** LOW  
**Issue Reference:** Issue 3.2

**Implementation Steps:**
1. [ ] Create GitHub issues for each TODO
2. [ ] Add issue references to code
3. [ ] Remove TODO comments
4. [ ] Prioritize issues in backlog

**Files with TODOs:**
- `src/components/layout/UnifiedWorkbench.tsx:170`
- `src/runtime/BlockContext.ts:172`
- `src/runtime-test-bench/hooks/useRuntimeTestBench.ts` (multiple)
- `src/runtime-test-bench/adapters/RuntimeAdapter.ts` (multiple)

---

### 10. Extract Magic Numbers to Constants
**Status:** 🔲 PLANNED  
**Priority:** LOW  
**Effort:** 1 day  
**Risk:** LOW  
**Issue Reference:** Issue 2.3

**Completed:**
- ✅ CastManager constants

**Remaining:**
- [ ] View zone dimensions
- [ ] Timer durations
- [ ] Buffer sizes
- [ ] Timeout values

---

### 11. Improve Type Safety (Reduce any/unknown usage)
**Status:** 🔲 PLANNED  
**Priority:** LOW (Ongoing)  
**Effort:** Ongoing  
**Risk:** MEDIUM  
**Issue Reference:** Issue 3.4

**Strategy:**
1. Enable stricter TypeScript compiler options gradually
2. Replace `any` with proper types (file by file)
3. Add type guards for `unknown` types
4. Create generic utilities where appropriate

**Implementation Steps:**
1. [ ] Audit current `any`/`unknown` usage
2. [ ] Prioritize by impact (public APIs first)
3. [ ] Create tracking issue for each file
4. [ ] Update one file per week
5. [ ] Add tests to prevent regressions

---

## Testing Strategy

### Unit Tests
Each refactoring should include:
- [ ] Unit tests for new code
- [ ] Unit tests for edge cases
- [ ] Regression tests for existing functionality

### Integration Tests
- [ ] Test interactions between refactored components
- [ ] Test with real runtime scenarios
- [ ] Test error handling paths

### Manual Testing
- [ ] Verify Storybook stories still work
- [ ] Test in actual workout scenarios
- [ ] Verify performance hasn't degraded

---

## Success Metrics

### Code Quality Metrics
| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Files >500 Lines | 7 | 3 | 🔲 |
| Average File Size | ~122 lines | <200 lines | ✅ |
| Cyclomatic Complexity | ~8 | <5 | 🔲 |
| Empty Catch Blocks | 0 | 0 | ✅ |
| TODO Comments | 20+ | <5 | 🔲 |
| Type Safety Issues | 485 | <200 | 🔲 |

### Process Metrics
- [ ] All refactorings have unit tests
- [ ] All refactorings reviewed by at least 2 people
- [ ] All refactorings documented
- [ ] No regressions introduced

---

## Timeline

### Sprint 1 (Current - Week 1)
- [x] Complete code analysis
- [x] Fix empty catch block
- [x] Extract CastManager constants
- [ ] Implement structured error system

### Sprint 2 (Week 2-3)
- [ ] Break down QueueTestHarness
- [ ] Refactor LoopCoordinatorBehavior complexity

### Sprint 3 (Week 4-5)
- [ ] Extract action executor strategy
- [ ] Improve React root lifecycle
- [ ] Extract timer role resolver

### Sprint 4+ (Week 6+)
- [ ] Clean up TODOs
- [ ] Extract remaining constants
- [ ] Improve type safety (ongoing)

---

## Review Checklist

Before marking a refactoring as complete:
- [ ] All code changes reviewed
- [ ] All tests passing
- [ ] No new TypeScript errors
- [ ] Documentation updated
- [ ] Storybook stories verified
- [ ] Manual testing completed
- [ ] PR merged

---

## Notes

- This plan is a living document and will be updated as refactorings are completed
- Priorities may shift based on business needs or discovered issues
- Each refactoring should be done in a separate PR for easier review
- Always run the full test suite before merging

---

**Last Updated:** 2026-01-01  
**Next Review:** 2026-01-08
