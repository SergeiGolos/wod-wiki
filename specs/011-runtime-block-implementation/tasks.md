# Tasks: Runtime Block Implementation with TimerBlock, RoundsBlock, and EffortBlock

**Input**: Design documents from `/specs/011-runtime-block-implementation/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Extracted: TypeScript/React, Vitest, Storybook, component library
2. Load optional design documents ✅
   → data-model.md: 3 blocks, 3 behaviors extracted
   → contracts/: API contracts defined
   → research.md: 8 technical decisions extracted
3. Generate tasks by category ✅
   → Setup: Test utilities
   → Tests: Contract tests for all blocks/behaviors
   → Core: Blocks and behaviors implementation
   → Integration: JitCompiler extensions
   → Polish: Workout stories, performance, docs
4. Apply task rules ✅
   → Different files = marked [P] for parallel
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T051) ✅
6. Generate dependency graph ✅
7. Create parallel execution examples ✅
8. Validate task completeness ✅
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
Single project structure (component library):
- Source: `src/runtime/blocks/`, `src/runtime/behaviors/`
- Tests: `tests/unit/runtime/`, `tests/integration/runtime/`
- Stories: `stories/runtime/`, `stories/workouts/`

---

## Phase 3.1: Setup & Test Infrastructure

### T001: ✅ Create project directory structure
**Files**: Create directories
```
src/runtime/blocks/
src/runtime/behaviors/
tests/unit/runtime/
tests/integration/runtime/
stories/runtime/
stories/workouts/
```
**Acceptance**: All directories exist and are empty

---

### T002 [P]: ✅ Create test utilities for runtime blocks
**File**: `tests/unit/runtime/test-utils.ts`
**Purpose**: Mock runtime, mock behaviors, block assertions
**Implementation**:
```typescript
export function createMockRuntime(): MockScriptRuntime
export function createMockBehavior(name: string): MockRuntimeBehavior
export function assertBlockLifecycle(block: RuntimeBlock): void
export function assertDisposalComplete(block: RuntimeBlock): void
```
**Acceptance**: Test utilities compile with no errors

---

### T003 [P]: ✅ Create test utilities for timer testing
**File**: `tests/unit/runtime/timer-test-utils.ts`
**Purpose**: Mock performance.now(), time control, interval simulation
**Implementation**:
```typescript
export class MockTimer {
  now(): number
  advance(ms: number): void
  reset(): void
}
export function mockPerformanceNow(): MockTimer
export function waitForTicks(count: number): Promise<void>
```
**Acceptance**: Timer utilities compile with no errors

---

### T004 [P]: ✅ Create test utilities for event validation
**File**: `tests/unit/runtime/event-test-utils.ts`
**Purpose**: Event capture, assertion helpers
**Implementation**:
```typescript
export class EventCapture {
  capture(eventType: string): Promise<any>
  assertEmitted(eventType: string, data?: any): void
  assertNotEmitted(eventType: string): void
}
export function createEventCapture(): EventCapture
```
**Acceptance**: Event utilities compile with no errors

---

## Phase 3.2: Behavior Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

### T005 [P]: ✅ Contract test for TimerBehavior
**File**: `tests/unit/runtime/TimerBehavior.contract.test.ts`
**Purpose**: Test TimerBehavior API contract from contracts/runtime-blocks-api.md
**Requirements**:
- Constructor validates direction ('up' | 'down')
- onPush() starts timer interval
- onPop() stops timer interval
- Emits timer:tick events every ~100ms
- Emits timer:complete when countdown reaches zero
- Cleanup properly in disposal
**Status**: MUST FAIL initially (TDD)
**Acceptance**: Test file created, all tests fail with "not implemented"

---

### T006 [P]: ✅ Contract test for RoundsBehavior
**File**: `tests/unit/runtime/RoundsBehavior.contract.test.ts`
**Purpose**: Test RoundsBehavior API contract
**Requirements**:
- Constructor validates totalRounds >= 1
- onPush() initializes currentRound = 1
- onNext() advances currentRound
- Emits rounds:changed on advancement
- Emits rounds:complete when finished
- Provides compilation context with correct rep scheme
**Status**: MUST FAIL initially (TDD)
**Acceptance**: Test file created, all tests fail with "not implemented"

---

### T007 [P]: ✅ Contract test for CompletionBehavior
**File**: `tests/unit/runtime/CompletionBehavior.contract.test.ts`
**Purpose**: Test CompletionBehavior API contract
**Requirements**:
- Constructor accepts condition function
- onNext() checks completion condition
- onEvent() triggers on configured events
- Emits block:complete when condition met
- Configurable trigger events work correctly
**Status**: MUST FAIL initially (TDD)
**Acceptance**: Test file created, all tests fail with "not implemented"

---

### T008 [P]: ✅ Contract test for TimerBlock
**File**: `tests/unit/runtime/TimerBlock.contract.test.ts`
**Purpose**: Test TimerBlock API contract from contracts/runtime-blocks-api.md
**Requirements**:
- Constructor validates config (direction, durationMs)
- push() starts timer
- pop() stops timer, preserves state
- dispose() cleans up in <50ms
- pause() stops updates, preserves elapsed
- resume() continues from current time
- getDisplayTime() returns 0.1s precision
- Emits timer:tick and timer:complete events
**Status**: MUST FAIL initially (TDD)
**Acceptance**: Test file created, all tests fail with "not implemented"

---

### T009 [P]: ✅ Contract test for RoundsBlock
**File**: `tests/unit/runtime/RoundsBlock.contract.test.ts`
**Purpose**: Test RoundsBlock API contract
**Requirements**:
- Constructor validates totalRounds, repScheme
- getCurrentRound() returns 1-indexed value
- Advances rounds when children complete
- Provides compilation context
- getRepsForCurrentRound() returns correct value
- Emits rounds:changed and rounds:complete
**Status**: MUST FAIL initially (TDD)
**Acceptance**: Test file created, all tests fail with "not implemented"

---

### T010 [P]: ✅ Contract test for EffortBlock
**File**: `tests/unit/runtime/EffortBlock.contract.test.ts`
**Purpose**: Test EffortBlock API contract
**Requirements**:
- Constructor validates exerciseName, targetReps
- incrementRep() adds 1, emits reps:updated
- setReps(count) validates range, emits event
- markComplete() sets currentReps = target
- isComplete() returns true when target met
- Tracks completionMode (incremental/bulk)
- Emits reps:complete when finished
**Status**: MUST FAIL initially (TDD)
**Acceptance**: Test file created, all tests fail with "not implemented"

---

## Phase 3.3: Behavior Implementation (ONLY after tests failing)

### ✅ T011: Implement TimerBehavior
**File**: `src/runtime/behaviors/TimerBehavior.ts`
**Purpose**: Timer management behavior
**Requirements**:
- Implements RuntimeBehavior interface
- Manages setInterval for periodic updates
- Uses performance.now() for precise timing
- Handles pause/resume via events
- Cleanup interval in dispose()
- Emits timer:tick every ~100ms
- Emits timer:complete for countdown
**Dependencies**: T005 must be failing
**Acceptance**: T005 contract tests pass ✅ ALL 20 TESTS PASSING

---

### T012: Unit tests for TimerBehavior
**File**: `tests/unit/runtime/TimerBehavior.test.ts`
**Purpose**: Comprehensive unit tests beyond contract
**Tests**:
- Timer drift over long duration
- Multiple pause/resume cycles
- Edge case: pause immediately after start
- Edge case: resume after timer complete
- Performance: tick execution <16ms
**Dependencies**: T011 complete
**Acceptance**: All unit tests pass, coverage >80%

---

### ✅ T013: Implement RoundsBehavior
**File**: `src/runtime/behaviors/RoundsBehavior.ts`
**Purpose**: Round tracking and variable rep management
**Requirements**:
- Implements RuntimeBehavior interface
- Tracks current round (1-indexed)
- Provides compilation context
- Advances rounds in onNext()
- Emits rounds:changed events
- Signals completion when rounds exhausted
**Dependencies**: T006 must be failing
**Acceptance**: T006 contract tests pass (partial - needs test fixes)

---

### T014: Unit tests for RoundsBehavior
**File**: `tests/unit/runtime/RoundsBehavior.test.ts`
**Purpose**: Comprehensive unit tests
**Tests**:
- Variable rep schemes (21-15-9)
- Fixed rounds without rep scheme
- AMRAP (Infinity rounds)
- Edge case: single round
- Context provision during compilation
**Dependencies**: T013 complete
**Acceptance**: All unit tests pass, coverage >80%

---

### ✅ T015: Implement CompletionBehavior
**File**: `src/runtime/behaviors/CompletionBehavior.ts`
**Purpose**: Generic completion detection
**Requirements**:
- Implements RuntimeBehavior interface
- Configurable condition function
- Checks completion in onNext()
- Listens for trigger events
- Emits block:complete when done
**Dependencies**: T007 must be failing
**Acceptance**: T007 contract tests pass (16/17 passing)

---

### T016: Unit tests for CompletionBehavior
**File**: `tests/unit/runtime/CompletionBehavior.test.ts`
**Purpose**: Comprehensive unit tests
**Tests**:
- Different completion conditions
- Event-triggered vs onNext-triggered
- Multiple trigger events
- Completion already met at start
- Edge case: condition never met
**Dependencies**: T015 complete
**Acceptance**: All unit tests pass, coverage >80%

---

## Phase 3.4: Block Implementation (Sequential by dependency)

### ✅ T017: Implement EffortBlock
**File**: `src/runtime/blocks/EffortBlock.ts`
**Purpose**: Individual exercise/rep tracking block
**Requirements**:
- Implements RuntimeBlock interface
- Composes CompletionBehavior
- Tracks currentReps and targetReps
- incrementRep() method (tap button)
- setReps(count) method (bulk entry)
- markComplete() method
- Emits reps:updated and reps:complete
- No children (terminal block)
**Dependencies**: T010 must be failing, T015 complete (needs CompletionBehavior)
**Acceptance**: T010 contract tests pass (partial - needs test fixes)

---

### T018: Unit tests for EffortBlock
**File**: `tests/unit/runtime/EffortBlock.test.ts`
**Purpose**: Comprehensive unit tests
**Tests**:
- Incremental rep counting
- Bulk rep entry
- Mode switching (incremental → bulk → incremental)
- Validation: setReps out of range
- Auto-complete when target reached
- Disposal cleanup
**Dependencies**: T017 complete
**Acceptance**: All unit tests pass, coverage >80%

---

### ✅ T019: Implement RoundsBlock
**File**: `src/runtime/blocks/RoundsBlock.ts`
**Purpose**: Multi-round workout block
**Requirements**:
- Implements RuntimeBlock interface
- Composes RoundsBehavior, CompletionBehavior, ChildAdvancementBehavior, LazyCompilationBehavior
- Manages child blocks for current round
- Advances rounds when children complete
- Provides compilation context
- Supports variable rep schemes
- Supports infinite rounds (AMRAP)
**Dependencies**: T009 must be failing, T013 complete (needs RoundsBehavior), T017 complete (children are EffortBlocks)
**Acceptance**: T009 contract tests pass (partial - needs test fixes)

---

### T020: Unit tests for RoundsBlock
**File**: `tests/unit/runtime/RoundsBlock.test.ts`
**Purpose**: Comprehensive unit tests
**Tests**:
- Fixed rounds (3 rounds)
- Variable reps (21-15-9)
- Infinite rounds (AMRAP until timer expires)
- Lazy compilation of round contents
- Context provision to child blocks
- Round advancement logic
- Disposal of all children
**Dependencies**: T019 complete
**Acceptance**: All unit tests pass, coverage >80%

---

### ✅ T021: Implement TimerBlock
**File**: `src/runtime/blocks/TimerBlock.ts`
**Purpose**: Time-based workout block
**Requirements**:
- Implements RuntimeBlock interface
- Composes TimerBehavior, CompletionBehavior, ChildAdvancementBehavior, LazyCompilationBehavior
- Supports count-up (For Time) and countdown (AMRAP)
- Wraps child blocks (RoundsBlock or EffortBlock)
- Completion: countdown reaches zero OR children complete
- pause() and resume() methods
- Records exact completion timestamp
**Dependencies**: T008 must be failing, T011 complete (needs TimerBehavior), T019 complete (child is RoundsBlock)
**Acceptance**: T008 contract tests pass (partial - needs test fixes)

---

### T022: Unit tests for TimerBlock
**File**: `tests/unit/runtime/TimerBlock.test.ts`
**Purpose**: Comprehensive unit tests
**Tests**:
- Count-up timer (For Time)
- Countdown timer (AMRAP)
- Completion on timer zero (countdown)
- Completion on child done (count-up)
- Pause/resume preserves state
- Display time precision (0.1s)
- Internal time precision (sub-second)
- Disposal cleanup (clear intervals)
**Dependencies**: T021 complete
**Acceptance**: All unit tests pass, coverage >80%

---

## Phase 3.5: Storybook Stories (Parallel after blocks complete)

### T023 [P]: Story for TimerBlock - Count Up
**File**: `stories/runtime/TimerBlock.stories.tsx`
**Purpose**: Interactive demo of count-up timer
**Requirements**:
- Start at 0:00.0
- Counts up continuously
- Pause button
- Resume button
- Stop button
- Reset button
- Display shows 0.1s precision
**Dependencies**: T021 complete
**Acceptance**: Story renders, all controls work

---

### T024 [P]: Story for TimerBlock - Countdown
**File**: `stories/runtime/TimerBlock-Countdown.stories.tsx`
**Purpose**: Interactive demo of countdown timer
**Requirements**:
- Start at configured duration (e.g., 20:00.0)
- Counts down to 0:00.0
- Pause/resume works
- Shows "Time Expired" at zero
- Emits completion event
**Dependencies**: T021 complete
**Acceptance**: Story renders, countdown completes correctly

---

### T025 [P]: Story for RoundsBlock - Fixed Rounds
**File**: `stories/runtime/RoundsBlock.stories.tsx`
**Purpose**: Interactive demo of fixed rounds (3 rounds)
**Requirements**:
- Display shows "Round X of Y"
- Mock exercises for each round
- Advances automatically when round completes
- Shows "All Rounds Complete" when done
**Dependencies**: T019 complete
**Acceptance**: Story renders, rounds advance correctly

---

### T026 [P]: Story for RoundsBlock - Variable Reps
**File**: `stories/runtime/RoundsBlock-VariableReps.stories.tsx`
**Purpose**: Interactive demo of variable rep scheme (21-15-9)
**Requirements**:
- Round 1: 21 reps
- Round 2: 15 reps  
- Round 3: 9 reps
- Display shows current round and rep target
- Advances automatically with correct targets
**Dependencies**: T019 complete
**Acceptance**: Story renders, rep targets change per round

---

### T027 [P]: Story for EffortBlock - Rep Tracking
**File**: `stories/runtime/EffortBlock.stories.tsx`
**Purpose**: Interactive demo of hybrid rep tracking
**Requirements**:
- "+1 Rep" button (incremental)
- Text input + "Set Reps" button (bulk)
- Display shows "X/Y" (current/target)
- Both methods work
- Can switch between methods mid-exercise
**Dependencies**: T017 complete
**Acceptance**: Story renders, both rep tracking modes work

---

## Phase 3.6: Complete Workout Stories (Parallel after JIT integration)

### T028 [P]: Story for Fran workout
**File**: `stories/workouts/Fran.stories.tsx`
**Purpose**: (21-15-9) of Thrusters and Pullups, For Time
**Requirements**:
- Timer counts UP from 0:00.0
- Round 1: 21 reps each
- Round 2: 15 reps each
- Round 3: 9 reps each
- Auto-advances rounds
- Timer stops when complete
- Shows final time
**Dependencies**: T021, T019, T017, T033 (JIT integration)
**Acceptance**: Complete workout executes per quickstart.md Step 6

---

### T029 [P]: Story for Cindy workout
**File**: `stories/workouts/Cindy.stories.tsx`
**Purpose**: 20-min AMRAP of 5 Pullups, 10 Pushups, 15 Squats
**Requirements**:
- Timer counts DOWN from 20:00.0
- Unlimited rounds (AMRAP)
- Fixed reps per round (5, 10, 15)
- Stops when timer hits zero
- Shows completed rounds + partial
**Dependencies**: T021, T019, T017, T033
**Acceptance**: AMRAP executes until time expires

---

### T030 [P]: Story for Mary workout
**File**: `stories/workouts/Mary.stories.tsx`
**Purpose**: 20-min AMRAP of 5 Handstand Pushups, 10 Pistols, 15 Pullups
**Requirements**: Similar to Cindy, different exercises
**Dependencies**: T021, T019, T017, T033
**Acceptance**: AMRAP variant works correctly

---

### T031 [P]: Story for Grace workout
**File**: `stories/workouts/Grace.stories.tsx`
**Purpose**: 30 Clean & Jerks For Time
**Requirements**:
- Timer counts UP
- Single exercise (30 reps)
- No rounds (just EffortBlock in TimerBlock)
- Timer stops when 30 reps complete
**Dependencies**: T021, T017, T033
**Acceptance**: Single-effort For Time workout works

---

### T032 [P]: Story for Barbara, Nancy, Helen workouts
**File**: `stories/workouts/FixedRounds.stories.tsx`
**Purpose**: Fixed rounds workouts (Barbara=5, Nancy=5, Helen=3)
**Requirements**:
- Each as separate story variant
- Fixed rounds, fixed reps
- No timer (or optional For Time)
**Dependencies**: T019, T017, T033
**Acceptance**: All three fixed-round workouts execute

---

## Phase 3.7: JIT Compiler Integration

### T033: Extend JitCompiler with block compilation
**File**: `src/runtime/JitCompiler.ts` (MODIFY existing file)
**Purpose**: Add compilation methods for new blocks
**Requirements**:
- compileTimerBlock(node, context): TimerBlock
- compileRoundsBlock(node, context): RoundsBlock
- compileEffortBlock(node, context): EffortBlock
- Pass compilation context (repScheme) to children
- Recognize workout patterns (AMRAP, For Time, rounds)
**Dependencies**: T021, T019, T017 complete (all blocks implemented)
**Acceptance**: Compiler can create new block types from AST

---

### T034: Integration test for JitCompiler
**File**: `tests/integration/runtime/jit-compiler-blocks.test.ts`
**Purpose**: Test compilation of complete workouts
**Tests**:
- Compile Fran (21-15-9 For Time)
- Compile Cindy (AMRAP)
- Compile Grace (single effort For Time)
- Verify block nesting structure
- Verify compilation context passed correctly
**Dependencies**: T033 complete
**Acceptance**: All integration tests pass

---

## Phase 3.8: End-to-End Workout Execution Tests

### T035 [P]: Integration test for For Time workouts
**File**: `tests/integration/runtime/for-time-execution.test.ts`
**Purpose**: Test complete For Time workout execution
**Tests**:
- Fran executes correctly (21-15-9)
- Grace executes correctly (30 reps)
- Timer counts up accurately
- Timer stops when work complete
- Final time recorded correctly
**Dependencies**: T033, T034 complete
**Acceptance**: All For Time tests pass

---

### T036 [P]: Integration test for AMRAP workouts
**File**: `tests/integration/runtime/amrap-execution.test.ts`
**Purpose**: Test AMRAP workout execution
**Tests**:
- Cindy executes correctly (20-min AMRAP)
- Mary executes correctly (20-min AMRAP)
- Timer counts down accurately
- Rounds continue until time expires
- Partial round recorded correctly
**Dependencies**: T033, T034 complete
**Acceptance**: All AMRAP tests pass

---

### T037 [P]: Integration test for variable rep schemes
**File**: `tests/integration/runtime/variable-reps-execution.test.ts`
**Purpose**: Test variable rep scheme execution
**Tests**:
- 21-15-9 scheme applies correctly
- Round 1 targets: 21 reps
- Round 2 targets: 15 reps
- Round 3 targets: 9 reps
- Other schemes work (15-12-9, etc.)
**Dependencies**: T033, T034 complete
**Acceptance**: Variable reps tests pass

---

### T038 [P]: Integration test for pause/resume state
**File**: `tests/integration/runtime/pause-resume.test.ts`
**Purpose**: Test pause/resume preserves state
**Tests**:
- Pause mid-workout
- Timer stops, reps preserved
- Resume continues from correct state
- Multiple pause/resume cycles
- Pause during different blocks
**Dependencies**: T033, T034 complete
**Acceptance**: Pause/resume tests pass

---

### T039 [P]: Integration test for abandon behavior
**File**: `tests/integration/runtime/abandon.test.ts`
**Purpose**: Test abandon clears state
**Tests**:
- Abandon mid-workout
- State cleared completely
- No results recorded
- Can start new workout after abandon
**Dependencies**: T033, T034 complete
**Acceptance**: Abandon tests pass

---

## Phase 3.9: Performance Validation

### T040: Performance benchmark for push/pop operations
**File**: `tests/performance/block-lifecycle.bench.ts`
**Purpose**: Measure push/pop performance
**Requirements**:
- Measure push() for all block types
- Measure pop() for all block types
- Assert <1ms at 99th percentile
- Run 1000 iterations
**Dependencies**: T021, T019, T017 complete
**Acceptance**: Performance targets met (<1ms)

---

### T041: Performance benchmark for dispose()
**File**: `tests/performance/disposal.bench.ts`
**Purpose**: Measure disposal performance
**Requirements**:
- Measure dispose() for all block types
- Measure nested block disposal
- Assert <50ms max time
- Verify no memory leaks (heap stable)
**Dependencies**: T021, T019, T017 complete
**Acceptance**: Disposal <50ms, no leaks detected

---

### T042: Performance benchmark for timer ticks
**File**: `tests/performance/timer-ticks.bench.ts`
**Purpose**: Measure timer tick performance
**Requirements**:
- Measure tick execution time
- Assert <16ms for 60fps
- Test with multiple timers active
- Monitor CPU usage
**Dependencies**: T021 complete
**Acceptance**: Timer ticks <16ms

---

### T043: Performance benchmark for JIT compilation
**File**: `tests/performance/jit-compile.bench.ts`
**Purpose**: Measure compilation performance
**Requirements**:
- Compile Fran workout
- Compile Cindy workout
- Assert <100ms for typical workouts
- Test complex nested structures
**Dependencies**: T033 complete
**Acceptance**: Compilation <100ms

---

## Phase 3.10: Documentation & Polish

### T044 [P]: Update runtime API documentation
**File**: `docs/runtime-api.md` (UPDATE existing)
**Purpose**: Document new blocks and behaviors
**Requirements**:
- Add TimerBlock API section
- Add RoundsBlock API section
- Add EffortBlock API section
- Add behavior documentation
- Include code examples
- Update architecture diagrams
**Dependencies**: All implementation complete
**Acceptance**: Documentation accurate and complete

---

### T045 [P]: Add architecture diagram for block composition
**File**: `docs/runtime-block-architecture.md` (NEW)
**Purpose**: Visual documentation of block composition
**Requirements**:
- Diagram: Block hierarchy
- Diagram: Behavior composition pattern
- Diagram: Event flow
- Examples: Fran workout structure
- Examples: Cindy workout structure
**Dependencies**: All implementation complete
**Acceptance**: Diagrams clear and accurate

---

### T046 [P]: Update README with workout examples
**File**: `README.md` (UPDATE existing)
**Purpose**: Add runtime block examples to README
**Requirements**:
- Quick start for using TimerBlock
- Example: Creating Fran workout
- Example: Creating AMRAP workout
- Link to Storybook demos
- Link to full documentation
**Dependencies**: All implementation complete
**Acceptance**: README examples work correctly

---

### T047: Execute quickstart validation
**File**: Execute `specs/011-runtime-block-implementation/quickstart.md`
**Purpose**: Validate all acceptance criteria
**Requirements**:
- Complete all 8 quickstart steps
- Check all validation checkboxes
- Verify no console errors
- Verify performance (no lag)
- Document any issues found
**Dependencies**: All implementation and stories complete (T028-T032)
**Acceptance**: All quickstart steps pass ✅

---

### T048: Run full test suite validation
**Purpose**: Ensure no regressions
**Commands**:
```bash
npm run test:unit
npm run test:integration
npm run build-storybook
```
**Requirements**:
- All new tests pass
- No new test failures (baseline: 45 passed, 1 failed, 4 module errors)
- Storybook builds successfully
- No TypeScript errors in new files
**Dependencies**: All implementation complete
**Acceptance**: Test suite passes, Storybook builds

---

### T049: Code quality review
**Purpose**: Remove duplication, improve code quality
**Tasks**:
- Extract common behavior patterns
- Simplify complex conditionals
- Add JSDoc comments to public APIs
- Consistent error messages
- Remove debug console.logs
**Dependencies**: All implementation complete
**Acceptance**: Code quality improved, no duplication

---

### T050: Memory leak validation
**Purpose**: Verify no memory leaks
**Requirements**:
- Run workouts repeatedly (100 iterations)
- Monitor heap size in Chrome DevTools
- Verify disposal clears all references
- Check for dangling event listeners
- Test with long-running timers
**Dependencies**: All implementation complete
**Acceptance**: Heap size stable, no leaks detected

---

### T051: Final constitutional compliance check
**Purpose**: Verify all constitutional principles met
**Checklist**:
- ✅ Component-First Architecture
- ✅ Storybook-Driven Development (all stories work)
- ✅ Parser-First Domain Logic (N/A)
- ✅ JIT Compiler Runtime (proper patterns)
- ✅ Monaco Editor Integration (N/A)
- ✅ TypeScript strict mode (no errors)
- ✅ Performance targets met
**Dependencies**: All tasks complete
**Acceptance**: All constitutional principles satisfied

---

## Dependencies Graph

```
Setup (T001-T004)
  ↓
Behavior Tests (T005-T007) [P]
  ↓
Behaviors (T011-T016) [Sequential per behavior, but behaviors in parallel]
  ↓
Block Tests (T008-T010) [P]
  ↓
EffortBlock (T017-T018)
  ↓
RoundsBlock (T019-T020)
  ↓
TimerBlock (T021-T022)
  ↓
Block Stories (T023-T027) [P]
  ↓
JIT Integration (T033-T034)
  ↓
Workout Stories (T028-T032) [P]
  ∧
  └─ E2E Tests (T035-T039) [P]
  ↓
Performance (T040-T043) [P]
  ↓
Documentation (T044-T046) [P]
  ↓
Validation (T047-T051)
```

## Parallel Execution Examples

### Example 1: Setup Phase (All Parallel)
```bash
# Launch T002-T004 together:
Task: "Create test utilities for runtime blocks in tests/unit/runtime/test-utils.ts"
Task: "Create test utilities for timer testing in tests/unit/runtime/timer-test-utils.ts"
Task: "Create test utilities for event validation in tests/unit/runtime/event-test-utils.ts"
```

### Example 2: Contract Tests (All Parallel)
```bash
# Launch T005-T010 together:
Task: "Contract test for TimerBehavior in tests/unit/runtime/TimerBehavior.contract.test.ts"
Task: "Contract test for RoundsBehavior in tests/unit/runtime/RoundsBehavior.contract.test.ts"
Task: "Contract test for CompletionBehavior in tests/unit/runtime/CompletionBehavior.contract.test.ts"
Task: "Contract test for TimerBlock in tests/unit/runtime/TimerBlock.contract.test.ts"
Task: "Contract test for RoundsBlock in tests/unit/runtime/RoundsBlock.contract.test.ts"
Task: "Contract test for EffortBlock in tests/unit/runtime/EffortBlock.contract.test.ts"
```

### Example 3: Behavior Implementation (Parallel)
```bash
# After contract tests fail, launch T011, T013, T015 together:
Task: "Implement TimerBehavior in src/runtime/behaviors/TimerBehavior.ts"
Task: "Implement RoundsBehavior in src/runtime/behaviors/RoundsBehavior.ts"
Task: "Implement CompletionBehavior in src/runtime/behaviors/CompletionBehavior.ts"
```

### Example 4: Block Stories (All Parallel)
```bash
# After blocks implemented, launch T023-T027 together:
Task: "Story for TimerBlock count-up in stories/runtime/TimerBlock.stories.tsx"
Task: "Story for TimerBlock countdown in stories/runtime/TimerBlock-Countdown.stories.tsx"
Task: "Story for RoundsBlock fixed in stories/runtime/RoundsBlock.stories.tsx"
Task: "Story for RoundsBlock variable reps in stories/runtime/RoundsBlock-VariableReps.stories.tsx"
Task: "Story for EffortBlock rep tracking in stories/runtime/EffortBlock.stories.tsx"
```

### Example 5: Workout Stories (All Parallel)
```bash
# After JIT integration, launch T028-T032 together:
Task: "Story for Fran workout in stories/workouts/Fran.stories.tsx"
Task: "Story for Cindy workout in stories/workouts/Cindy.stories.tsx"
Task: "Story for Mary workout in stories/workouts/Mary.stories.tsx"
Task: "Story for Grace workout in stories/workouts/Grace.stories.tsx"
Task: "Story for Barbara, Nancy, Helen in stories/workouts/FixedRounds.stories.tsx"
```

### Example 6: E2E Tests (All Parallel)
```bash
# Launch T035-T039 together:
Task: "Integration test for For Time workouts in tests/integration/runtime/for-time-execution.test.ts"
Task: "Integration test for AMRAP workouts in tests/integration/runtime/amrap-execution.test.ts"
Task: "Integration test for variable reps in tests/integration/runtime/variable-reps-execution.test.ts"
Task: "Integration test for pause/resume in tests/integration/runtime/pause-resume.test.ts"
Task: "Integration test for abandon in tests/integration/runtime/abandon.test.ts"
```

## Critical Path Summary

**Longest Path** (items must be sequential):
1. T001 (setup)
2. T002-T004 (test utils) [P]
3. T005-T010 (contract tests) [P]
4. T011 (TimerBehavior) or T013 (RoundsBehavior) or T015 (CompletionBehavior) [P]
5. T017 (EffortBlock)
6. T019 (RoundsBlock)
7. T021 (TimerBlock)
8. T033-T034 (JIT integration)
9. T028-T032 (workout stories) [P]
10. T047-T051 (validation)

**Estimated Timeline**: 3-5 days with parallel execution

## Validation Checklist
*GATE: Checked before marking feature complete*

- [x] All contracts have corresponding tests (T005-T010)
- [x] All entities have implementation tasks (T011, T013, T015, T017, T019, T021)
- [x] All tests come before implementation (Phase 3.2 before 3.3)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task (except T033 modifies existing JitCompiler)
- [x] All 7 workout examples have stories (T028-T032)
- [x] Quickstart validation included (T047)
- [x] Performance benchmarks included (T040-T043)
- [x] Constitutional compliance check (T051)

---

**Total Tasks**: 51  
**Parallel Opportunities**: 30+ tasks marked [P]  
**Estimated Completion**: 3-5 days  
**Status**: ✅ Ready for execution
