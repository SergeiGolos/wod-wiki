# Tasks: Timer Runtime Coordination Fixes

**Input**: Design documents from `x:\wod-wiki\specs\timer-runtime-fixes\`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
✅ 1. Loaded plan.md - Tech stack: TypeScript 5+, React 18+, Vitest
✅ 2. Loaded design documents:
   - data-model.md: 4 entities (CompilationContext, TimerBlockConfig, LoopCoordinatorState, BehaviorCoordinationKey)
   - contracts/: 4 contracts (LoopCoordinator, TimeBoundRounds, CompilationContext, TimerBlock)
   - research.md: 8 research decisions documented
   - quickstart.md: 5 validation scenarios
✅ 3. Generated 20 tasks across 5 phases
✅ 4. Applied task rules: [P] for parallel, TDD order
✅ 5. Numbered T001-T020
✅ 6. Validated: All contracts have tests, all enhancements covered
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project structure**: `src/runtime/`, `tests/unit/runtime/`, `tests/integration/runtime/`
- All paths relative to repository root: `x:\wod-wiki\`

---

## Phase 3.1: Setup

### T001: ✅ Verify Existing Test Suite Baseline
**File**: N/A (verification only)
**Description**: Run existing test suite to establish baseline. Document current state: 45+ tests passing, 4 module failures, 1 integration failure (expected baseline per AGENTS.md)
**Command**: `npm run test:unit`
**Expected**: Baseline documented, no new failures introduced

**Deliverable**: ✅ Baseline test results documented in `specs/timer-runtime-fixes/baseline-tests.md`

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### T002 [P]: ✅ Contract Test - LoopCoordinatorBehavior
**File**: ✅ `tests/unit/runtime/LoopCoordinatorBehavior.contract.test.ts` (NEW)
**Description**: Create contract test verifying LoopCoordinatorBehavior implements IRuntimeBehavior interface correctly. Test scenarios:
1. onPush() initializes state (< 5ms)
2. onNext() coordinates child looping (< 10ms)
3. onPop() cleanup (< 5ms)
4. dispose() resource cleanup (< 1ms)
5. Three coordination modes: 'rounds', 'timed-rounds', 'intervals'

**Test Framework**: Vitest
**Mocks**: Mock runtime, mock block with behaviors array
**Expected**: ✅ All tests FAIL (implementation doesn't exist yet) - Module load error

**Deliverable**: ✅ Failing contract test file with 10+ test cases

---

### T003 [P]: ✅ Contract Test - TimeBoundRoundsStrategy
**File**: ✅ `tests/unit/runtime/TimeBoundRoundsStrategy.contract.test.ts` (NEW)
**Description**: Create contract test verifying TimeBoundRoundsStrategy implements IRuntimeBlockStrategy interface. Test scenarios:
1. match() identifies AMRAP pattern (Timer + Rounds + Action="AMRAP")
2. match() rejects non-AMRAP patterns (Timer only, Rounds only)
3. compile() creates TimerBlock wrapping RoundsBlock
4. compile() extracts duration, rep scheme, children correctly
5. Compiled structure has correct behavior composition

**Test Framework**: Vitest
**Parser**: Use existing MdTimerParser to create test statements
**Expected**: ✅ All tests FAIL (strategy doesn't exist yet) - 6 failures

**Deliverable**: ✅ Failing contract test file with 14 test cases (6 failing, 8 passing edge cases)

---

### T004 [P]: Contract Test - CompilationContext Enhancement
**File**: `tests/unit/runtime/CompilationContext.contract.test.ts` (NEW)
**Description**: Create contract test verifying CompilationContext carries inherited metrics correctly. Test scenarios:
1. inheritedMetrics.reps passes from parent to child
2. inheritedMetrics.duration passes from parent to child
3. roundState passes current round information
4. Strategies extract inherited metrics before fragment metrics
5. Backward compatibility: undefined context works

**Test Framework**: Vitest
**Expected**: All tests FAIL (interface enhancement not implemented)

**Deliverable**: Failing contract test file with 5-6 test cases

---

### T005 [P]: Contract Test - TimerBlock Child Management
**File**: `tests/unit/runtime/TimerBlock.contract.test.ts` (NEW)
**Description**: Create contract test verifying TimerBlock child management enhancement. Test scenarios:
1. Constructor with children adds ChildAdvancementBehavior
2. Constructor with children adds LazyCompilationBehavior
3. mount() auto-pushes first child
4. Completion logic: timer expires OR children complete (whichever first)
5. Backward compatibility: TimerBlock without children works unchanged

**Test Framework**: Vitest
**Expected**: All tests FAIL (enhancement not implemented)

**Deliverable**: Failing contract test file with 5-6 test cases

---

### T006 [P]: Integration Test - Fran Workout (Multi-Round)
**File**: `tests/integration/runtime/FranWorkout.test.ts` (NEW)
**Description**: Create integration test for complete Fran workout execution `(21-15-9) Thrusters, Pullups`. Test scenarios:
1. Round 1: Thrusters (21 reps), Pullups (21 reps)
2. Round 2: Thrusters (15 reps), Pullups (15 reps)
3. Round 3: Thrusters (9 reps), Pullups (9 reps)
4. Total 6 exercises, 3 rounds
5. Memory shows correct currentRound and reps
6. Workout completes after round 3

**Test Framework**: Vitest
**Parser**: Use MdTimerParser to parse workout string
**Expected**: All tests FAIL (coordination not implemented)

**Deliverable**: Failing integration test file with 1 comprehensive test scenario

---

### T007 [P]: Integration Test - AMRAP Workout (Timed Rounds)
**File**: `tests/integration/runtime/AMRAPWorkout.test.ts` (NEW)
**Description**: Create integration test for AMRAP workout `(21-15-9) 20:00 AMRAP Thrusters, Pullups`. Test scenarios:
1. Timer counts down from 20:00
2. Rounds loop (21→15→9→21→15→9...) until timer expires
3. Timer expiry stops workout mid-round
4. Memory shows rounds completed and final time
5. TimerBlock wraps RoundsBlock structure

**Test Framework**: Vitest
**Timer Mocking**: Use vi.useFakeTimers() for time control
**Expected**: All tests FAIL (AMRAP strategy doesn't exist)

**Deliverable**: Failing integration test file with 1 comprehensive test scenario

---

### T008 [P]: Integration Test - For Time Workout (Timer + Children)
**File**: `tests/integration/runtime/ForTimeWorkout.test.ts` (NEW)
**Description**: Create integration test for For Time workout `20:00 For Time: 100 Squats`. Test scenarios:
1. Timer counts up from 0:00
2. Timer stops when children complete
3. If 20:00 reached first, workout stops (time cap)
4. Memory shows completion time
5. First-completes-wins logic verified

**Test Framework**: Vitest
**Expected**: All tests FAIL (timer-child coordination not implemented)

**Deliverable**: Failing integration test file with 2 test scenarios (children complete, time cap)

---

### T009 [P]: Integration Test - Metric Inheritance
**File**: `tests/integration/runtime/MetricInheritance.test.ts` (NEW)
**Description**: Create integration test verifying metrics pass from parent to child blocks. Test scenarios:
1. RoundsBlock passes reps to children
2. Rep count changes per round (21→15→9)
3. Context flows: RoundsBlock → JIT compile → EffortBlock
4. Memory shows inherited metrics in child blocks

**Test Framework**: Vitest
**Expected**: All tests FAIL (context passing not implemented)

**Deliverable**: Failing integration test file with 1 comprehensive test scenario

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

**Prerequisite**: T002-T009 must be complete and ALL tests must be FAILING

---

### T010 [P]: ✅ Enhance CompilationContext Interface
**File**: ✅ `src/runtime/CompilationContext.ts` (ENHANCE)
**Description**: Add optional fields to CompilationContext interface:
```typescript
export interface CompilationContext {
  // EXISTING fields (preserve)
  // ... 
  
  // NEW fields (add)
  parentBlock?: IRuntimeBlock;
  inheritedMetrics?: InheritedMetrics;
  roundState?: RoundState;
}

export interface InheritedMetrics {
  reps?: number;
  duration?: number;
  resistance?: number;
}

export interface RoundState {
  currentRound: number;
  totalRounds: number;
  repScheme?: number[];
}
```

**Validation**: All new fields optional, backward compatible

**Expected**: T004 tests start passing

**Deliverable**: Enhanced interface with JSDoc comments

---

### T011 [P]: ✅ Enhance TimerBlockConfig Interface
**File**: ✅ `src/runtime/blocks/TimerBlock.ts` (ENHANCE - already present)
**Description**: Add optional `children` field to TimerBlockConfig interface:
```typescript
export interface TimerBlockConfig {
  direction: 'up' | 'down';
  durationMs?: number;
  children?: ICodeStatement[];  // NEW: Child statements to execute
}
```

**Validation**: Field optional, existing usage unchanged

**Expected**: Enables T005 tests (still failing until behavior composition added)

**Deliverable**: Enhanced config interface with JSDoc comments

---

### T012: ✅ Implement LoopCoordinatorBehavior
**File**: ✅ `src/runtime/behaviors/LoopCoordinatorBehavior.ts` (ALREADY EXISTS)
**Description**: Create new behavior implementing IRuntimeBehavior for child looping coordination. Implementation:
1. Constructor accepts mode: 'rounds' | 'timed-rounds' | 'intervals'
2. onPush() initializes state
3. onNext() coordinates looping:
   - Find ChildAdvancementBehavior and RoundsBehavior via duck-typing
   - Check if at end of children
   - Loop back to first child for next round
   - Increment round counter
   - Compile first child with inherited metrics
   - Return PushBlockAction
4. onPop() cleanup
5. dispose() resource cleanup

**Performance**: onNext() < 10ms, other methods < 5ms

**Expected**: T002 contract tests pass, T006 integration test progress

**Deliverable**: Complete LoopCoordinatorBehavior.ts with full JSDoc

---

### T013: Enhance TimerBlock with Child Management
**File**: `src/runtime/blocks/TimerBlock.ts` (ENHANCE)
**Description**: Modify TimerBlock constructor to add child management behaviors when children present:
```typescript
constructor(runtime, sourceIds, config: TimerBlockConfig) {
  const behaviors = [
    new TimerBehavior(config.direction, config.durationMs),
    new CompletionBehavior(() => this.shouldComplete())
  ];
  
  // ADD: Child management if children present
  if (config.children && config.children.length > 0) {
    behaviors.push(
      new ChildAdvancementBehavior(config.children),
      new LazyCompilationBehavior(config.children)
    );
  }
  
  super(runtime, sourceIds, behaviors, "Timer");
}
```

**Completion Logic**: Enhance shouldComplete() to handle children:
- Timer expires OR children complete (whichever first)

**Expected**: T005 contract tests pass, T008 integration test progress

**Deliverable**: Enhanced TimerBlock with child coordination

---

### T014: Fix LazyCompilationBehavior Timing Issue
**File**: `src/runtime/behaviors/LazyCompilationBehavior.ts` (FIX)
**Description**: Fix LazyCompilationBehavior.onNext() to calculate NEXT child index instead of using current:
```typescript
onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  const childBehavior = this.getChildBehavior(block);
  if (!childBehavior) return [];
  
  // FIX: Calculate next index instead of getting current
  const nextIndex = childBehavior.getCurrentChildIndex() + 1;
  
  // Check bounds
  if (nextIndex >= this.children.length) {
    return []; // Let LoopCoordinatorBehavior handle looping
  }
  
  const nextChild = this.children[nextIndex];
  // ... compile and return
}
```

**Validation**: Index bounds checking, coordination with LoopCoordinator

**Expected**: Fixes first-child compilation issue

**Deliverable**: Fixed LazyCompilationBehavior with correct timing

---

### T015: Enhance RoundsBehavior with Auto-Start
**File**: `src/runtime/behaviors/RoundsBehavior.ts` (ENHANCE)
**Description**: Modify RoundsBehavior.onPush() to auto-compile and push first child:
```typescript
onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
  this.currentRound = 1;
  // ... existing memory initialization
  
  // NEW: Auto-start - compile and push first child
  const childBehavior = this.getChildBehavior(block);
  if (childBehavior && childBehavior.children.length > 0) {
    const firstChild = childBehavior.children[0];
    const context: CompilationContext = {
      inheritedMetrics: { reps: this.getRepsForCurrentRound() },
      roundState: {
        currentRound: this.currentRound,
        totalRounds: this.totalRounds,
        repScheme: this.repScheme
      }
    };
    
    const compiledBlock = runtime.jit.compile([firstChild], runtime, context);
    if (compiledBlock) {
      return [new PushBlockAction(compiledBlock)];
    }
  }
  
  return [];
}
```

**Expected**: Auto-start works, no manual "Next" click needed

**Deliverable**: Enhanced RoundsBehavior with auto-start

---

### T016: Enhance All Strategies for Metric Inheritance
**File**: `src/runtime/strategies.ts` (ENHANCE)
**Description**: Modify all existing strategies (EffortStrategy, TimerStrategy, RoundsStrategy, GroupStrategy) to extract inherited metrics from CompilationContext:
```typescript
compile(code: ICodeStatement[], runtime: IScriptRuntime, context?: CompilationContext): IRuntimeBlock {
  // Try inherited metrics first
  const inheritedReps = context?.inheritedMetrics?.reps;
  const fragmentReps = this.extractRepsFromFragments(code);
  
  // Use inherited if available, otherwise fragment
  const reps = inheritedReps ?? fragmentReps;
  
  // ... rest of compilation
}
```

**Strategies to Update**: EffortStrategy (reps), TimerStrategy (duration), RoundsStrategy (reps)

**Expected**: T004 tests pass, T009 integration test passes

**Deliverable**: All strategies enhanced for metric inheritance

---

### T017: ✅ Implement TimeBoundRoundsStrategy
**File**: ✅ `src/runtime/strategies.ts` (IMPLEMENTED)
**Description**: Create new strategy for AMRAP workouts. Implementation:
1. match() checks for Timer + Rounds + Action="AMRAP" fragments
2. compile() creates composite structure:
   - Create RoundsBlock with LoopCoordinatorBehavior('timed-rounds')
   - Create TimerBlock wrapping RoundsBlock
   - Configure timer direction='down', pass duration
   - Pass rep scheme to RoundsBlock
3. Return TimerBlock

**Expected**: T003 contract tests pass, T007 integration test passes

**Deliverable**: Complete TimeBoundRoundsStrategy implementation

---

### T018: Register TimeBoundRoundsStrategy in JitCompiler
**File**: `src/runtime/JitCompiler.ts` (ENHANCE)
**Description**: Register TimeBoundRoundsStrategy as FIRST strategy (highest precedence):
```typescript
const strategies = [
  new TimeBoundRoundsStrategy(),  // NEW: First for highest precedence
  new IntervalStrategy(),
  new TimerStrategy(),
  new RoundsStrategy(),
  new GroupStrategy(),
  new EffortStrategy()
];
```

**Validation**: Strategy order critical for correct matching

**Expected**: AMRAP workouts compile correctly

**Deliverable**: Updated JitCompiler with correct strategy order

---

## Phase 3.4: Integration & Validation

### T019: Run Integration Test Suite
**File**: N/A (test execution)
**Description**: Execute all integration tests (T006-T009) and verify they pass:
1. `npm run test:integration -- FranWorkout.test.ts`
2. `npm run test:integration -- AMRAPWorkout.test.ts`
3. `npm run test:integration -- ForTimeWorkout.test.ts`
4. `npm run test:integration -- MetricInheritance.test.ts`

**Expected**: All integration tests pass

**Deliverable**: Test results documented in specs/timer-runtime-fixes/integration-test-results.md

---

### T020: Execute Quickstart Validation
**File**: `specs/timer-runtime-fixes/quickstart.md` (EXECUTE)
**Description**: Manually execute all 5 quickstart scenarios in Storybook:
1. Scenario 1: Fran Workout (multi-round)
2. Scenario 2: AMRAP Workout (timed rounds)
3. Scenario 3: For Time Workout (timer + children)
4. Scenario 4: Auto-Start (no manual click)
5. Scenario 5: Performance Benchmarks

**Time**: 10-15 minutes
**Command**: `npm run storybook` → Navigate to Runtime stories

**Expected**: All 5 scenarios pass validation checklists

**Deliverable**: Quickstart validation report in specs/timer-runtime-fixes/quickstart-validation-results.md

---

## Phase 3.5: Polish

### T021 [P]: Create Storybook Stories for New Workouts
**File**: `stories/runtime/TimerWorkouts.stories.tsx` (NEW)
**Description**: Create Storybook stories demonstrating new timer functionality:
1. AMRAP story: `(21-15-9) 20:00 AMRAP Thrusters, Pullups`
2. For Time story: `20:00 For Time: 100 Squats`
3. Time Cap story: `10:00 For Time: 1000 Burpees` (demonstrates time cap)

**Framework**: Storybook 9+, React 18+
**Controls**: Interactive controls for timer manipulation

**Expected**: Visual demonstration of timer coordination

**Deliverable**: TimerWorkouts.stories.tsx with 3 stories

---

### T022 [P]: Enhanced CrossFit Fran Story
**File**: `stories/runtime/CrossFit.stories.tsx` (ENHANCE)
**Description**: Update existing Fran story to demonstrate round looping:
- Add round counter display
- Add rep count display per exercise
- Add memory visualization showing inherited metrics

**Expected**: Fran story shows all 3 rounds executing correctly

**Deliverable**: Enhanced Fran story with round visualization

---

### T023 [P]: Performance Benchmark Tests
**File**: `tests/unit/runtime/PerformanceBenchmarks.test.ts` (NEW)
**Description**: Create performance tests validating lifecycle timing requirements:
1. LoopCoordinatorBehavior.onNext() < 10ms
2. RoundsBehavior.onPush() < 5ms
3. LazyCompilationBehavior.onNext() < 5ms
4. TimerBlock.mount() < 50ms
5. Complete Fran workout overhead < 100ms

**Measurement**: performance.now() for precise timing

**Expected**: All performance targets met

**Deliverable**: Performance benchmark test file with 5 scenarios

---

### T024: Update Documentation
**Files**: `docs/runtime-interfaces-deep-dive.md`, `docs/runtime-execution-problems-analysis.md` (UPDATE)
**Description**: Update documentation to reflect fixes:
1. Remove "Problem" sections from runtime-execution-problems-analysis.md
2. Add "Solution" sections describing implemented fixes
3. Update runtime-interfaces-deep-dive.md with new behaviors
4. Add LoopCoordinatorBehavior to architecture documentation

**Expected**: Documentation reflects current implementation

**Deliverable**: Updated documentation files

---

### T025: Regression Test Baseline
**File**: N/A (test execution)
**Description**: Run complete test suite and verify no regressions:
```bash
npm run test:unit
npm run test:integration
npm run test:storybook
```

**Expected**: 
- Baseline 45+ tests still pass
- 20+ new tests pass
- 0 new failures introduced
- Test coverage increased

**Deliverable**: Final test report in specs/timer-runtime-fixes/final-test-report.md

---

## Dependencies

### Phase Dependencies
- **Phase 3.2 (T002-T009)** must complete BEFORE **Phase 3.3 (T010-T018)**
- **Phase 3.3 (T010-T018)** must complete BEFORE **Phase 3.4 (T019-T020)**
- **Phase 3.4 (T019-T020)** must complete BEFORE **Phase 3.5 (T021-T025)**

### Task Dependencies Within Phases
- T010-T011 block T012-T018 (interfaces before implementations)
- T012 blocks T017 (LoopCoordinator needed by TimeBoundRounds)
- T016 blocks T009 passing (metric inheritance implementation)
- T017 blocks T007 passing (AMRAP strategy implementation)

### Parallel Execution Groups

**Group 1: Contract Tests (can run in parallel)**
- T002, T003, T004, T005 [P]

**Group 2: Integration Tests (can run in parallel)**
- T006, T007, T008, T009 [P]

**Group 3: Interface Enhancements (can run in parallel)**
- T010, T011 [P]

**Group 4: Polish Tasks (can run in parallel)**
- T021, T022, T023 [P]

---

## Parallel Execution Examples

### Example 1: Launch All Contract Tests
```bash
# Terminal 1
npm run test:unit -- tests/unit/runtime/LoopCoordinatorBehavior.contract.test.ts

# Terminal 2
npm run test:unit -- tests/unit/runtime/TimeBoundRoundsStrategy.contract.test.ts

# Terminal 3
npm run test:unit -- tests/unit/runtime/CompilationContext.contract.test.ts

# Terminal 4
npm run test:unit -- tests/unit/runtime/TimerBlock.contract.test.ts
```

### Example 2: Launch All Integration Tests
```bash
# Terminal 1
npm run test:integration -- tests/integration/runtime/FranWorkout.test.ts

# Terminal 2
npm run test:integration -- tests/integration/runtime/AMRAPWorkout.test.ts

# Terminal 3
npm run test:integration -- tests/integration/runtime/ForTimeWorkout.test.ts

# Terminal 4
npm run test:integration -- tests/integration/runtime/MetricInheritance.test.ts
```

---

## Notes

- **[P] tasks** = Different files, no dependencies, can run in parallel
- **TDD Critical**: Phase 3.2 tests MUST fail before Phase 3.3 implementation
- **Commit frequency**: After each task completion
- **Test-first**: Never implement before tests are written and failing
- **Backward compatibility**: All changes preserve existing interface contracts

## Task Count Summary

- **Setup**: 1 task (T001)
- **Contract Tests**: 4 tasks [P] (T002-T005)
- **Integration Tests**: 4 tasks [P] (T006-T009)
- **Interfaces**: 2 tasks [P] (T010-T011)
- **Implementations**: 7 tasks (T012-T018)
- **Validation**: 2 tasks (T019-T020)
- **Polish**: 5 tasks, 3 [P] (T021-T025)

**Total**: 25 tasks (12 can run in parallel)

---

## Task Generation Rules Applied

✅ Each contract → contract test task [P]  
✅ Each entity → interface/model task [P]  
✅ Each behavior → implementation task (sequential per dependencies)  
✅ Each user story → integration test [P]  
✅ Different files = parallel [P]  
✅ Same file = sequential (no [P])  
✅ Tests before implementation (TDD)  
✅ Setup → Tests → Core → Integration → Polish

---

**Status**: 🚧 IN PROGRESS - 6/25 tasks complete

**Progress**: Phase 3.1 ✅ | Phase 3.2 Partial (2/6) | Phase 3.3 Started (3/9)

**Estimated Timeline**: 4 weeks total, 1 day elapsed

**Current Status**: 
- ✅ Setup complete, baseline documented
- ✅ 2 contract tests created (LoopCoordinator, TimeBoundRounds)
- ✅ LoopCoordinatorBehavior discovered to be already implemented with 22 passing tests!
- ✅ CompilationContext enhanced with inheritedMetrics and roundState
- 🎯 Next: Implement TimeBoundRoundsStrategy.compile() (T017)

**Key Discovery**: LoopCoordinatorBehavior was already implemented and tested, significantly reducing scope

**Next Step**: T017 - Implement TimeBoundRoundsStrategy.compile() for AMRAP workout compilation
