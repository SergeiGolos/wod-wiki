# Implementation Tasks: Fix Runtime Loop Execution

**Change ID**: `fix-runtime-loop-execution`  
**Status**: Draft

This document provides an ordered implementation checklist. Complete tasks sequentially and mark each with `[x]` when done.

## Phase 1: Core Loop Coordinator Behavior (Critical)

### 1.1 Create LoopCoordinatorBehavior Class
- [ ] Create `src/runtime/behaviors/LoopCoordinatorBehavior.ts`
- [ ] Define LoopConfig interface with childGroups, loopType, totalRounds, repScheme
- [ ] Define LoopState interface with index, position, rounds
- [ ] Implement class skeleton implementing IRuntimeBehavior
- [ ] Add constructor accepting LoopConfig
- [ ] Initialize index to -1 (pre-first-advance state)

**Validation**: File compiles without TypeScript errors

### 1.2 Implement Loop State Calculations
- [ ] Implement `getState(): LoopState` method
- [ ] Calculate position using modulo: `index % childGroups.length`
- [ ] Calculate rounds using floor division: `Math.floor(index / childGroups.length)`
- [ ] Write unit tests for state calculations (0-100 index values)
- [ ] Verify position cycles correctly (0, 1, 2, 0, 1, 2...)
- [ ] Verify rounds increment at position wrap

**Validation**: Run `npm run test:unit -- LoopCoordinatorBehavior.test.ts` (all pass)

### 1.3 Implement Fixed Rounds Loop Logic
- [ ] Implement `onNext(runtime, block): IRuntimeAction[]` method
- [ ] Check completion condition: `rounds >= totalRounds`
- [ ] Return empty array if complete
- [ ] Get child group at current position
- [ ] Increment index after getting position but before compilation
- [ ] Add unit tests for 3-round, 2-child workout (6 next() calls)

**Validation**: Unit tests verify 6 advancements then completion

### 1.4 Implement Rep Scheme Loop Logic
- [ ] Add `getRepsForCurrentRound(): number | undefined` method
- [ ] Return `repScheme[rounds]` if repScheme exists
- [ ] Update `isComplete()` to check `rounds >= repScheme.length` for repScheme type
- [ ] Add unit tests for Fran workout (21-15-9 rep scheme)
- [ ] Verify reps return 21, 21, 15, 15, 9, 9 sequence

**Validation**: Unit tests verify rep scheme progression

### 1.5 Implement Time-Bound Loop Logic (AMRAP)
- [ ] Add `isTimerExpired(runtime): boolean` helper method
- [ ] Implement time-bound completion: check timer instead of rounds
- [ ] Add `getCompletedRounds(): number` for AMRAP tracking
- [ ] Add unit tests with mock timer
- [ ] Verify loop continues until timer expires regardless of rounds

**Validation**: Unit tests verify AMRAP stops on timer expiry

### 1.6 Implement Interval Loop Logic (EMOM)
- [ ] Add intervalDurationMs to LoopConfig
- [ ] Implement interval completion same as fixed rounds
- [ ] Add `onIntervalComplete()` method for timer resets
- [ ] Add unit tests for 30-round EMOM
- [ ] Verify completion at 30 rounds

**Validation**: Unit tests verify EMOM 30 intervals

### 1.7 Implement Initial Push on Mount
- [ ] Implement `onPush(runtime, block): IRuntimeAction[]`
- [ ] Call `onNext()` immediately from `onPush()`
- [ ] Return PushBlockAction for first child
- [ ] Add unit test verifying first child pushes without explicit next()

**Validation**: Unit test confirms auto-push on mount

### 1.8 Add Round Boundary Event Emission
- [ ] Track `oldRounds` before increment
- [ ] Compare with `newRounds` after increment
- [ ] Emit `rounds:changed` event when newRounds > oldRounds
- [ ] Include round (1-indexed) and totalRounds in event payload
- [ ] Add unit tests verifying event emission timing

**Validation**: Unit tests verify events emitted at boundaries only

### 1.9 Add Completion Event Emission
- [ ] Emit `rounds:complete` event when `isComplete()` returns true
- [ ] Include totalRounds, completedRounds, and timestamp in payload
- [ ] Add unit tests verifying completion event
- [ ] Verify event emitted exactly once at completion

**Validation**: Unit tests verify completion event emission

## Phase 2: Compilation Context System (High Priority)

### 2.1 Define CompilationContext Interface
- [ ] Create `src/runtime/CompilationContext.ts`
- [ ] Define CompilationContext interface with optional fields:
  - round?, totalRounds?, position?, reps?, intervalDurationMs?, parent?
- [ ] Export interface
- [ ] Add JSDoc documentation for each field

**Validation**: Interface compiles and exports correctly

### 2.2 Create Context in LoopCoordinatorBehavior
- [ ] Add `getCompilationContext(): CompilationContext` method
- [ ] Build context object from current loop state
- [ ] Include round (1-indexed), position, totalRounds
- [ ] Add reps from `getRepsForCurrentRound()` if available
- [ ] Add unit tests verifying context creation

**Validation**: Unit tests verify context fields

### 2.3 Update JitCompiler Signature
- [ ] Modify `JitCompiler.compile()` to accept optional context parameter
- [ ] Update signature: `compile(statements, runtime, context?)`
- [ ] Pass context to strategy selection if needed
- [ ] Pass context to strategy.compile() calls
- [ ] Update all existing compile() call sites to pass undefined initially

**Validation**: Project compiles; no TypeScript errors

### 2.4 Update Strategy Signatures
- [ ] Update IRuntimeStrategy interface: `compile(statement, runtime, context?)`
- [ ] Update EffortStrategy.compile() signature
- [ ] Update RoundsStrategy.compile() signature  
- [ ] Update TimerStrategy.compile() signature
- [ ] Update all other strategy signatures
- [ ] Update all strategy implementations to accept context parameter

**Validation**: All strategies compile with new signature

### 2.5 Implement EffortStrategy Context Consumption
- [ ] In EffortStrategy.compile(), check for context?.reps
- [ ] Use context.reps if no local RepFragment found
- [ ] Prefer local RepFragment over context (explicit overrides inherited)
- [ ] Add unit tests with various combinations:
  - No fragment, no context → reps = 1 (default)
  - No fragment, context.reps = 21 → reps = 21 (inherited)
  - Fragment reps = 5, context.reps = 21 → reps = 5 (explicit wins)

**Validation**: Unit tests verify rep inheritance logic

### 2.6 Implement RoundsStrategy Context Creation
- [ ] In RoundsStrategy.compile(), create child context
- [ ] Include parent context fields
- [ ] Add current round, totalRounds, reps (from repScheme)
- [ ] Set context.parent to parent context
- [ ] Pass child context to JitCompiler.compile() for children

**Validation**: Integration test verifies context flows to grandchildren

### 2.7 Add Context Storage to RuntimeBlock
- [ ] Add private `context?: CompilationContext` field to RuntimeBlock base class
- [ ] Accept context in constructor or setContext() method
- [ ] Implement `getContext(): CompilationContext | undefined`
- [ ] Make context readonly/frozen to prevent modification

**Validation**: Blocks can store and retrieve context

## Phase 3: RoundsBlock Integration (High Priority)

### 3.1 Add Feature Flag to RoundsBlock
- [ ] Add `useNewLoopBehavior?: boolean` to RoundsBlockConfig
- [ ] Default to false (opt-in during testing)
- [ ] Update RoundsBlock constructor to check flag

**Validation**: Flag exists and is checked

### 3.2 Integrate LoopCoordinatorBehavior into RoundsBlock
- [ ] In RoundsBlock constructor, conditionally create LoopCoordinatorBehavior
- [ ] Pass childGroups, loopType, totalRounds, repScheme to coordinator
- [ ] Detect loopType from fragments (Rounds vs Timer vs default)
- [ ] Skip adding RoundsBehavior + ChildAdvancementBehavior if flag enabled
- [ ] Keep CompletionBehavior, have it delegate to coordinator.isComplete()

**Validation**: RoundsBlock constructs with either behavior set

### 3.3 Update Memory State Management
- [ ] Ensure LoopCoordinatorBehavior updates memory with current round
- [ ] Use rounds + 1 for 1-indexed display
- [ ] Update completedRounds = rounds (0-indexed completed count)
- [ ] Test memory state reflects loop progression

**Validation**: Memory state updates match expectations

### 3.4 Test Fran Workout End-to-End
- [ ] Enable feature flag for Fran story in Storybook
- [ ] Load http://localhost:6006/?path=/story/runtime-crossfit--fran
- [ ] Click "Next" 7 times
- [ ] Verify execution:
  1. Mount → Thrusters (21 reps)
  2. Next → Pullups (21 reps)
  3. Next → Thrusters (15 reps)
  4. Next → Pullups (15 reps)
  5. Next → Thrusters (9 reps)
  6. Next → Pullups (9 reps)
  7. Next → Complete
- [ ] Verify memory shows correct round (1, 2, 3)
- [ ] Verify reps display correctly (21, 15, 9)

**Validation**: Fran workout executes completely with correct reps

### 3.5 Enable for All RoundsBlock Stories
- [ ] Update all CrossFit workout stories to use new behavior
- [ ] Test Helen (3 rounds, 3 exercises)
- [ ] Test Barbara (5 rounds, 4 exercises)
- [ ] Test Annie (5 rounds, 2 exercises, descending reps)
- [ ] Test Diane (21-15-9, 2 exercises)
- [ ] Verify all complete correctly

**Validation**: All workout stories execute without errors

### 3.6 Update Unit Tests for RoundsBlock
- [ ] Update existing RoundsBlock unit tests to work with new behavior
- [ ] Add tests specifically for LoopCoordinatorBehavior integration
- [ ] Test feature flag toggling
- [ ] Test backward compatibility with old behavior

**Validation**: `npm run test:unit -- RoundsBlock.test` passes

## Phase 4: Event Emission Validation (Medium Priority)

### 4.1 Verify Event Interfaces
- [ ] Check if `rounds:changed` event type exists
- [ ] Check if `rounds:complete` event type exists
- [ ] Update event interfaces if needed
- [ ] Add round, totalRounds, completedAt fields to event payloads

**Validation**: Event types compile correctly

### 4.2 Test Event Handlers in Clock Components
- [ ] Load Clock story that listens for rounds events
- [ ] Verify rounds:changed updates UI correctly
- [ ] Verify rounds:complete triggers end state
- [ ] Check console for emitted events
- [ ] Verify no extra/missing events

**Validation**: Clock UI responds correctly to events

### 4.3 Add Event Tests
- [ ] Write unit tests for event emission in LoopCoordinatorBehavior
- [ ] Mock runtime.emit() and verify call counts and payloads
- [ ] Test edge cases (1 round, 100 rounds, AMRAP)

**Validation**: Event tests pass

## Phase 5: AMRAP and EMOM Support (Medium Priority)

### 5.1 Test AMRAP Workouts
- [ ] Find or create AMRAP story (e.g., Cindy)
- [ ] Enable new behavior for AMRAP blocks
- [ ] Verify looping continues until timer expires
- [ ] Verify round count increments indefinitely
- [ ] Test timer expiry mid-exercise

**Validation**: AMRAP workout executes until timer expires

### 5.2 Test EMOM Workouts  
- [ ] Find or create EMOM story (e.g., Chelsea)
- [ ] Enable new behavior for EMOM blocks
- [ ] Verify interval timing works correctly
- [ ] Verify compose grouping (+ exercises) executes together
- [ ] Test 30 intervals complete correctly

**Validation**: EMOM workout executes all intervals

### 5.3 Add Edge Case Tests
- [ ] Test single child workout: `(3) Pushups`
- [ ] Test no children workout: `(3)` (should error gracefully)
- [ ] Test 100 rounds stress test
- [ ] Test compose groups: `(3) + A, + B, C`
- [ ] Measure performance (ensure < 1ms per next())

**Validation**: Edge cases handled correctly; performance within bounds

## Phase 6: Cleanup and Documentation (Low Priority)

### 6.1 Remove Feature Flag
- [ ] Set `useNewLoopBehavior` default to true
- [ ] Remove flag from all stories
- [ ] Remove conditional logic in RoundsBlock constructor
- [ ] Always use LoopCoordinatorBehavior

**Validation**: All stories work without explicit flag

### 6.2 Deprecate Old Behaviors
- [ ] Add @deprecated JSDoc to ChildAdvancementBehavior
- [ ] Add @deprecated JSDoc to LazyCompilationBehavior
- [ ] Add console warning if old behaviors are instantiated
- [ ] Update imports to avoid deprecated behaviors

**Validation**: Deprecation warnings appear if old behaviors used

### 6.3 Remove Deprecated Behaviors (Optional)
- [ ] Delete `src/runtime/behaviors/ChildAdvancementBehavior.ts`
- [ ] Delete `src/runtime/behaviors/LazyCompilationBehavior.ts`
- [ ] Update all imports
- [ ] Remove from exports
- [ ] Run full test suite to ensure nothing breaks

**Validation**: All tests pass; no imports fail

### 6.4 Update Documentation
- [ ] Update `docs/runtime-execution-problems-analysis.md` with "RESOLVED" status
- [ ] Create or update architecture docs with LoopCoordinatorBehavior design
- [ ] Update behavior composition guide
- [ ] Add metric inheritance documentation
- [ ] Update JitCompiler API docs with context parameter

**Validation**: Documentation is complete and accurate

### 6.5 Update Storybook Story Descriptions
- [ ] Add notes to workout stories explaining loop execution
- [ ] Document expected next() call counts
- [ ] Show round and rep progression
- [ ] Add visual indicators for round transitions

**Validation**: Storybook stories are well-documented

### 6.6 Final Validation
- [ ] Run full test suite: `npm run test:unit`
- [ ] Verify no new failures introduced
- [ ] Check test coverage for new files (aim for 95%+)
- [ ] Run Storybook: `npm run storybook`
- [ ] Manually test 6+ workout stories
- [ ] Build Storybook: `npm run build-storybook` (wait for completion)
- [ ] Verify production build works

**Validation**: All tests pass; all stories work; build succeeds

## Summary of Validation Commands

```bash
# Unit tests
npm run test:unit

# Specific test files
npm run test:unit -- LoopCoordinatorBehavior.test
npm run test:unit -- RoundsBlock.test
npm run test:unit -- CompilationContext.test

# Storybook development
npm run storybook
# Visit: http://localhost:6006/?path=/story/runtime-crossfit--fran

# Build validation
npm run build-storybook
# Wait ~30 seconds for completion

# TypeScript validation
npx tsc --noEmit
# Expect 369 existing errors; no new errors
```

## Rollback Plan

If critical issues arise:

1. **Immediate**: Set `useNewLoopBehavior` default back to false
2. **Short-term**: Disable feature flag in problematic stories only
3. **Long-term**: Revert commits related to LoopCoordinatorBehavior if unfixable

Keep deprecated behaviors in codebase until full confidence in new system.
