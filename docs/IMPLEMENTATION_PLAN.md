# Workout Timer Runtime - Implementation Plan

**Objective**: Build out the complete runtime system for the seven workout timer patterns (For Time, AMRAP, EMOM, Sequential Timers, Fixed-Round Loops, and Loops with Rest).

**Reference**: [Planning: Output Statement Expectations](./planning-output-statements/index.md)

**Estimated Duration**: 4-6 sprints (2-3 weeks each)

---

## Phase 1: Core Block Architecture

### 1.1 Refactor WorkoutRoot → SessionRoot

**Rationale**: Rename to emphasize section/session container semantics. SessionRoot now automously manages WaitingToStart and session lifecycle.

- [ ] **File**: src/runtime/blocks/SessionRootBlock.ts
  - [ ] Rename from WorkoutRootBlock
  - [ ] Add `SegmentOutputBehavior` (section label on mount, close on unmount)
  - [ ] Add `HistoryRecordBehavior` (record session on unmount)
  - [ ] Add enhanced `ChildRunnerBehavior`:
    - [ ] Mount: push WaitingToStart block as first child (always, at index 0)
    - [ ] First `next()`: push compiled workout blocks (starting at index 1)
    - [ ] Final `next()`: when `childIndex >= children.length`, mark complete and request pop
  - [ ] Update constructor to accept session label + workout blocks
  - [ ] Unit tests: `src/runtime/blocks/__tests__/SessionRootBlock.test.ts`

**Acceptance Criteria**:
- SessionRoot emits `segment` output with section label on mount ✓
- SessionRoot pushes WaitingToStart on mount (not manually) ✓
- SessionRoot correctly tracks `childIndex` (0=WaitingToStart, 1+=workout blocks) ✓
- SessionRoot emits `completion` with total time on unmount ✓
- SessionRoot marks complete and pops when all children done ✓

---

### 1.2 Create WaitingToStart Block

**Rationale**: New pre-workout idle block that gates workout start. User must click `next()` to advance.

- [ ] **File**: src/runtime/blocks/WaitingToStartBlock.ts
  - [ ] Add `SegmentOutputBehavior` (emit "Ready to Start" message on mount)
  - [ ] Add `PopOnNextBehavior`:
    - [ ] On `next()` call: pop immediately (return `PopBlockAction`)
    - [ ] Parent SessionRoot's `next()` handler detects WaitingToStart pop
    - [ ] Parent's `next()` pushes first workout block
  - [ ] Unit tests: `src/runtime/blocks/__tests__/WaitingToStartBlock.test.ts`

**Acceptance Criteria**:
- WaitingToStart emits segment on mount ✓
- WaitingToStart pops immediately when `next()` called ✓
- WaitingToStart does NOT auto-complete ✓
- Parent can detect WaitingToStart pop in behavior chain ✓

---

### 1.3 Create Rest Block (Auto-generated)

**Rationale**: Timer-based parents (AMRAP, EMOM) auto-generate Rest blocks between exercises.

- [ ] **File**: src/runtime/blocks/RestBlock.ts
  - [ ] Add `SegmentOutputBehavior` (emit "Rest" label with duration)
  - [ ] Add `TimerInitBehavior` (countdown from remaining interval or rest duration)
  - [ ] Add `TimerCompletionBehavior` (auto-pop when elapsed >= duration)
  - [ ] Add `SoundCueBehavior` (beep on unmount for rest-over signal)
  - [ ] Unit tests: `src/runtime/blocks/__tests__/RestBlock.test.ts`

**Acceptance Criteria**:
- Rest emits segment on mount ✓
- Rest timer counts down automatically ✓
- Rest auto-pops when timer expires ✓
- Rest emits completion on unmount ✓

---

## Phase 2: Behavior Implementations

### 2.1 RestBlockBehavior (Priority Order 0)

**Rationale**: Runs FIRST in parent behavior chain. If parent has timer, generates and pushes Rest block.

- [ ] **File**: src/runtime/behaviors/RestBlockBehavior.ts
  - [ ] Check parent has active timer (`timer.durationMs > 0`)
  - [ ] Check remaining time in interval/period
  - [ ] If time remaining: compile Rest block, push to stack, return `PopBlockAction` (skip other behaviors)
  - [ ] If no time remaining: return `NextAction` (proceed with normal chain)
  - [ ] Unit tests: `src/runtime/behaviors/__tests__/RestBlockBehavior.test.ts`

**Applies to**: AMRAP, EMOM parents

**Acceptance Criteria**:
- Returns early if timer active ✓
- Rest block pushed with correct duration ✓
- Skips RoundAdvance/ChildLoop/ChildRunner on early return ✓
- Proceeds normally if no timer ✓

---

### 2.2 PopOnNextBehavior

**Rationale**: Simple behavior that pops block immediately on `next()` call.

- [ ] **File**: src/runtime/behaviors/PopOnNextBehavior.ts
  - [ ] Attach to WaitingToStart block
  - [ ] `onNext()` handler: return `PopBlockAction`
  - [ ] Unit tests: `src/runtime/behaviors/__tests__/PopOnNextBehavior.test.ts`

**Acceptance Criteria**:
- Blocks with PopOnNext pop immediately on `next()` ✓
- Parent receives control after pop ✓

---

### 2.3 Enhanced RoundAdvanceBehavior

**Rationale**: Update to work with SessionRoot's childIndex tracking.

- [ ] **File**: src/runtime/behaviors/RoundAdvanceBehavior.ts
  - [ ] Check `allChildrenCompleted` before incrementing round
  - [ ] Increment `round.current += 1`
  - [ ] Emit `milestone` output with new round count
  - [ ] Unit tests: include SessionRoot + child scenarios

**Acceptance Criteria**:
- Only advances when all children completed ✓
- Round count increments correctly ✓
- Milestone emitted with correct round.current/total ✓

---

### 2.4 Enhanced RoundCompletionBehavior

**Rationale**: Check if round exceeded total, then pop.

- [ ] **File**: src/runtime/behaviors/RoundCompletionBehavior.ts
  - [ ] Check if `round.current > round.total`
  - [ ] If true: mark block complete, return `PopBlockAction`
  - [ ] If false: continue with next behavior
  - [ ] Unit tests

**Acceptance Criteria**:
- Pops when round.current exceeds round.total ✓
- Continues normally if round.current <= round.total ✓

---

### 2.5 Enhanced ChildLoopBehavior

**Rationale**: Reset childIndex after all children executed, if should loop.

- [ ] **File**: src/runtime/behaviors/ChildLoopBehavior.ts
  - [ ] Check `allChildrenExecuted && shouldLoop()`
  - [ ] If true: reset `childIndex = 0`, continue to next behavior
  - [ ] If false: continue to next behavior
  - [ ] For AMRAP: loop while timer running
  - [ ] For Loop/EMOM: loop while rounds remain
  - [ ] Unit tests

**Acceptance Criteria**:
- resets childIndex to 0 on loop ✓
- Respects timer/round completion signals ✓

---

### 2.6 Enhanced ChildRunnerBehavior

**Rationale**: Push next child, handle SessionRoot special case.

- [ ] **File**: src/runtime/behaviors/ChildRunnerBehavior.ts
  - [ ] Check if `childIndex < children.length`
  - [ ] If true: compile & push child, increment `childIndex`
  - [ ] If false (on SessionRoot): mark complete and request pop
  - [ ] Unit tests

**Acceptance Criteria**:
- Pushes next child when available ✓
- SessionRoot terminates session when no more children ✓
- childIndex incremented correctly ✓

---

### 2.7 SegmentOutputBehavior (Verify Existing)

**Rationale**: Ensure correct output for SessionRoot, WaitingToStart, and other blocks.

- [ ] Verify outputs segment on mount
- [ ] Verify outputs completion on unmount
- [ ] Check `timeSpan` properly captured (start on mount, end on unmount)
- [ ] Unit tests cover all block types

**Acceptance Criteria**:
- All blocks emit paired segment/completion outputs ✓
- timeSpan.start <= timeSpan.end ✓

---

### 2.8 SoundCueBehavior (Verify Existing)

**Rationale**: Verify sound milestone outputs for timers and rest blocks.

- [ ] Verify start-beep on timer mount
- [ ] Verify completion-beep on timer unmount
- [ ] Verify rest-over-beep on rest unmount
- [ ] Check behaviors can be combined (multiple sounds if needed)
- [ ] Unit tests

**Acceptance Criteria**:
- Sound milestones emitted at correct lifecycle points ✓
- Rest-over-beep distinct from completion-beep ✓

---

## Phase 3: Compiler Strategies

### 3.1 SessionRootStrategy

**Rationale**: Compile workout into SessionRoot + workout block tree.

- [ ] **File**: src/runtime/compiler/strategies/SessionRootStrategy.ts
  - [ ] Accept `CodeStatement` (parsed workout)
  - [ ] Create `SessionRoot` block with section label
  - [ ] Call child compilation for each top-level block
  - [ ] SessionRoot receives WaitingToStart + compiled children
  - [ ] Unit tests: `src/runtime/compiler/strategies/__tests__/SessionRootStrategy.test.ts`

**Acceptance Criteria**:
- Compiles workout script into SessionRoot ✓
- Extracts section label correctly ✓
- Child blocks compiled and ordered ✓

---

### 3.2 WaitingToStartStrategy

**Rationale**: Compile WaitingToStart idle block.

- [ ] **File**: src/runtime/compiler/strategies/WaitingToStartStrategy.ts
  - [ ] Create `WaitingToStart` block
  - [ ] Attach `SegmentOutputBehavior` + `PopOnNextBehavior`
  - [ ] No children
  - [ ] Unit tests

**Acceptance Criteria**:
- WaitingToStart block created ✓
- Correct behaviors attached ✓

---

### 3.3 RestBlockStrategy

**Rationale**: Auto-generate Rest block for AMRAP/EMOM parents.

- [ ] **File**: src/runtime/compiler/strategies/components/RestBlockStrategy.ts
  - [ ] Accept duration from parent (remaining interval time or configured rest duration)
  - [ ] Create `RestBlock` with timer set to duration
  - [ ] Attach behaviors: `SegmentOutputBehavior`, `TimerInitBehavior`, `TimerCompletionBehavior`, `SoundCueBehavior`
  - [ ] Unit tests

**Acceptance Criteria**:
- Rest block created dynamically ✓
- Duration set correctly ✓
- Behaviors attached correctly ✓

---

### 3.4 Update Existing Strategies

**Rationale**: Update Timer, Loop, AMRAP, EMOM strategies to work with RestBlockBehavior and new SessionRoot.

- [ ] **TimerStrategy** (src/runtime/compiler/strategies/components/TimerStrategy.ts)
  - [ ] Ensure Timer blocks have `TimerCompletionBehavior` that auto-completes and pops
  - [ ] Verify `SoundCueBehavior` attached
  - [ ] Verify parent can detect Timer pop
  - [ ] Tests

- [ ] **LoopStrategy** (src/runtime/compiler/strategies/components/LoopStrategy.ts)
  - [ ] Initialize round state (round.current = 1, round.total = N)
  - [ ] Attach `RoundInitBehavior`, `RoundAdvanceBehavior`, `RoundCompletionBehavior`, `ChildLoopBehavior`, `ChildRunnerBehavior`
  - [ ] Tests: verify round increment and completion

- [ ] **AMRAPStrategy** (src/runtime/compiler/strategies/components/AmrapStrategy.ts)
  - [ ] Initialize round state (round.current = 1, round.total = undefined)
  - [ ] Attach `RestBlockBehavior` at Order 0
  - [ ] Attach timer behaviors + round behaviors
  - [ ] Tests: verify unbounded rounds, timer-driven completion

- [ ] **EMOMStrategy** (src/runtime/compiler/strategies/components/EmomStrategy.ts)
  - [ ] Initialize round state (round.current = 1, round.total = N)
  - [ ] Attach `RestBlockBehavior` at Order 0
  - [ ] Reset timer for each round
  - [ ] Tests: verify interval reset, bounded rounds

**Acceptance Criteria**:
- All strategies updated to use RestBlockBehavior ✓
- Round state correctly initialized ✓
- Behavior chains follow documented order ✓

---

## Phase 4: Runtime Stack Integration

### 4.1 Update RuntimeStack

**Rationale**: Ensure behavior chain runs in correct order.

- [ ] **File**: src/runtime/RuntimeStack.ts
  - [ ] Verify `next()` handler calls behaviors in documented order
  - [ ] Order: RestBlockBehavior → RoundAdvance → RoundCompletion → ChildLoop → ChildRunner
  - [ ] Verify `PopBlockAction` short-circuits remaining behaviors
  - [ ] Verify `NextAction` continues chain
  - [ ] Unit tests: behavior chain execution order

**Acceptance Criteria**:
- Behaviors execute in documented order ✓
- PopBlockAction prevents subsequent behaviors ✓
- State changes persist across behavior calls ✓

---

### 4.2 Output Statement Emission

**Rationale**: Ensure all outputs documented in planning tables are actually emitted.

- [ ] Create test harness to trace all outputs during execution
  - [ ] [ ] File: `tests/harness/OutputTracingHarness.ts`
  - [ ] Capture OutputStatement objects as emitted
  - [ ] Verify timeSpan, fragments, stackLevel, sourceStatementId
  - [ ] Compare to planning table expectations

- [ ] Run through each workout type
  - [ ] [ ] For Time (Grace, Karen)
  - [ ] [ ] For Time Rep-Scheme (Fran)
  - [ ] [ ] AMRAP (Cindy - first 2 rounds)
  - [ ] [ ] EMOM (Chelsea - first 2 rounds)
  - [ ] [ ] Sequential Timers (Simple & Sinister)
  - [ ] [ ] Fixed-Round Loop (Helen)
  - [ ] [ ] Loop + Rest (Barbara - first 2 rounds)

**Acceptance Criteria**:
- All outputs in planning tables emitted ✓
- No unexpected outputs ✓
- Output order matches tables ✓
- Fragments correctly merged (parser + runtime) ✓

---

## Phase 5: Integration Testing

### 5.1 Unit Tests for Each Behavior

**Rationale**: Isolated behavior testing with BehaviorTestHarness.

- [ ] `RestBlockBehavior.test.ts`
  - [ ] Test: parent with timer → Rest block pushed
  - [ ] Test: parent without timer → normal behavior chain
  - [ ] Test: remaining interval time respected

- [ ] `PopOnNextBehavior.test.ts`
  - [ ] Test: block pops immediately on next()
  - [ ] Test: parent receives control

- [ ] `RoundAdvanceBehavior.test.ts`
  - [ ] Test: increments only when allChildrenCompleted
  - [ ] Test: emits milestone with new round count
  - [ ] Test: skip if not allChildrenCompleted

- [ ] `RoundCompletionBehavior.test.ts`
  - [ ] Test: pops when round > total
  - [ ] Test: continues when round <= total

- [ ] `ChildLoopBehavior.test.ts`
  - [ ] Test: resets childIndex when looping
  - [ ] Test: skips if not looping
  - [ ] Test: respects timer/round completion

- [ ] `ChildRunnerBehavior.test.ts`
  - [ ] Test: pushes next child when available
  - [ ] Test: SessionRoot marks complete when no more children

**Files**: `src/runtime/behaviors/__tests__/*.test.ts`

---

### 5.2 Integration Tests for Each Workout Type

**Rationale**: Full workflow testing with RuntimeTestBuilder.

- [ ] **For Time (Grace)** — `tests/jit-compilation/for-time-single.test.ts`
  - [ ] Mount SessionRoot → WaitingToStart pushed
  - [ ] User clicks next on WaitingToStart
  - [ ] SessionRoot pushes Exercise block
  - [ ] Exercise completes
  - [ ] SessionRoot pops (session ends)
  - [ ] Verify all 10 outputs from planning table

- [ ] **For Time Rep-Scheme (Fran)** — `tests/jit-compilation/for-time-rep-scheme.test.ts`
  - [ ] 3 rounds with rep-scheme changes (21→15→9)
  - [ ] Verify round milestones
  - [ ] Verify rep count changes
  - [ ] Verify session termination

- [ ] **AMRAP (Cindy, partial)** — `tests/jit-compilation/amrap.test.ts`
  - [ ] 2 rounds of exercises
  - [ ] Verify unbounded rounds (round.total = undefined)
  - [ ] Verify timer-driven completion scenario
  - [ ] (Full test with 20-min timer can be skipped; use mock timer)

- [ ] **EMOM (Chelsea, partial)** — `tests/jit-compilation/emom.test.ts`
  - [ ] 2 rounds of :60 interval
  - [ ] Verify interval timer reset per round
  - [ ] Verify bounded rounds (round.current <= round.total)
  - [ ] Verify rest block auto-generated between exercises

- [ ] **Sequential Timers** — `tests/jit-compilation/sequential-timers.test.ts`
  - [ ] 3 timers: 5:00, 1:00, 10:00
  - [ ] Each timer auto-completes
  - [ ] SessionRoot sequences them
  - [ ] Session ends after last timer

- [ ] **Fixed-Round Loop (Helen)** — `tests/jit-compilation/fixed-round-loop.test.ts`
  - [ ] 3 rounds, same metrics per round
  - [ ] Verify consistency of exercise metrics across rounds
  - [ ] Verify session termination

- [ ] **Loop + Rest (Barbara, partial)** — `tests/jit-compilation/loop-with-rest.test.ts`
  - [ ] 2 rounds, 5 children (4 exercises + rest)
  - [ ] Verify rest as regular child
  - [ ] Verify round advancement after all 5 children
  - [ ] Verify round milestones

**Files**: `tests/integration/workout-types/*.test.ts`

---

### 5.3 Storybook Stories for Visual Validation

**Rationale**: Visual feedback for block lifecycle and output generation.

- [ ] `stories/runtime/SessionRootBlock.stories.tsx`
  - [ ] Story: Show SessionRoot mount with WaitingToStart
  - [ ] Story: Show user interacting with WaitingToStart
  - [ ] Story: Show first workout block pushed

- [ ] `stories/runtime/WaitingToStartBlock.stories.tsx`
  - [ ] Story: Idle state awaiting user input
  - [ ] Story: On next() → pop

- [ ] `stories/runtime/RestBlock.stories.tsx`
  - [ ] Story: Rest block enters with countdown timer
  - [ ] Story: Timer expires, block auto-completes

- [ ] `stories/runtime/WorkoutPatterns.stories.tsx`
  - [ ] Story: Grace (For Time single) complete workflow
  - [ ] Story: Fran (For Time rep-scheme) first 2 rounds
  - [ ] Story: Simple & Sinister (Sequential) full workflow
  - [ ] Story: Partial Cindy (AMRAP) 2 rounds

**Files**: `stories/runtime/*.stories.tsx`

---

## Phase 6: Validation & Documentation

### 6.1 Output Statement Checklist

**Rationale**: Verify all outputs match planning tables.

- [ ] For each workout type, run through first 2-3 rounds
- [ ] Capture all OutputStatement objects
- [ ] Check against planning table:
  - [ ] Output type (segment/completion/milestone)
  - [ ] Fragments present and correct
  - [ ] timeSpan closed correctly
  - [ ] stackLevel matches depth
  - [ ] Order matches table sequence
- [ ] Document any discrepancies

**Checklist**:
- [ ] Grace
- [ ] Karen
- [ ] Fran (first 2 rounds)
- [ ] Cindy (first 2 rounds)
- [ ] Chelsea (first 2 rounds)
- [ ] Simple and Sinister
- [ ] Helen
- [ ] Barbara (first 2 rounds)

---

### 6.2 Open Questions Resolution

**Rationale**: Address documented unknowns.

- [ ] **For Time patterns**: Confirm secondary timer is countup-only (not blocking)
- [ ] **AMRAP**: When timer expires mid-exercise, does exercise hang or auto-complete?
- [ ] **EMOM**: Timer reset—automatic or user-triggered?
- [ ] **Rest blocks**: Emit segment or silent/transparent?
- [ ] **Sound cues**: Separate milestones or combined output?
- [ ] **Session termination**: Exactly when does SessionRoot request pop?

**Resolution**: Update planning tables and write test cases for each answer.

---

### 6.3 Behavior Ordering Documentation

**File**: `docs/runtime-api-behavior-chain.md`

- [ ] Document parent `next()` behavior chain order
- [ ] Explain each behavior's responsibility
- [ ] Show examples of RestBlockBehavior short-circuit
- [ ] Show examples of round advancement
- [ ] Diagram the flow

---

### 6.4 Block Lifecycle Diagrams

**File**: `docs/block-lifecycle-diagrams.md`

- [ ] Create diagrams for each block type:
  - [ ] SessionRoot → WaitingToStart → Exercise → Session ends
  - [ ] SessionRoot → WaitingToStart → Loop(N) → Session ends
  - [ ] AMRAP with Rest block insertion
  - [ ] EMOM with interval reset
- [ ] Show state transitions
- [ ] Show behavior attachment points

---

## Phase 7: Refactoring & Polish

### 7.1 Code Quality

- [ ] [ ] ESLint + TypeScript strict mode: all files pass
- [ ] [ ] Test coverage: >90% for behavior classes
- [ ] [ ] No console.logs or debug statements remaining
- [ ] [ ] Consistent naming: camelCase for methods/vars, PascalCase for classes

---

### 7.2 Performance Validation

- [ ] [ ] RuntimeStack operations < 1ms (push/pop/current)
- [ ] [ ] Behavior execution < 100μs per behavior
- [ ] [ ] SessionRoot with 100 children compiles in < 5ms
- [ ] [ ] Output emission doesn't create memory leaks

---

### 7.3 Documentation Updates

- [ ] [ ] README: Add overview of session lifecycle
- [ ] [ ] API docs: SessionRoot, WaitingToStart, RestBlock
- [ ] [ ] Integration guide: How to add new workout patterns
- [ ] [ ] Update [planning-output-statements](./planning-output-statements/index.md) with implementation status

---

## Success Criteria

✅ **All 7 workout patterns compile and execute correctly**
- Grace/Karen (For Time single)
- Fran/Annie/Diane (For Time rep-scheme)
- Cindy (AMRAP)
- Chelsea/EMOM Lifting/ABC (EMOM)
- Simple and Sinister (Sequential Timers)
- Helen/Nancy (Fixed-round Loop)
- Barbara (Loop + Rest)

✅ **Session lifecycle works end-to-end**
- SessionRoot mounts, pushes WaitingToStart
- User clicks next, WaitingToStart pops
- SessionRoot pushes first workout block
- Blocks execute according to pattern
- Final block pops, SessionRoot marks complete and pops (session ends)

✅ **All outputs from planning tables are emitted**
- Output type, fragments, timeSpan, stackLevel correct
- Order matches expected sequence
- No missing or unexpected outputs

✅ **All behaviors execute in documented order**
- RestBlockBehavior → RoundAdvance → RoundCompletion → ChildLoop → ChildRunner
- PopBlockAction short-circuits correctly
- State changes persist

✅ **100% test coverage for new behaviors**
- Unit tests for each behavior class
- Integration tests for each workout type
- Storybook stories for visual validation

✅ **Documentation complete**
- Behavior chain ordering documented
- Block lifecycle diagrams created
- Planning tables updated with implementation status
- API documentation updated

---

## Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| SessionRoot refactor breaks existing tests | Run full test suite after each step; use feature flags if needed |
| Behavior chain ordering too complex | Document with detailed diagram; test behavior ordering explicitly |
| Rest block auto-generation doesn't work for all parents | Use mocking in tests; verify with real AMRAP/EMOM workflows |
| Output emission timing off | Use OutputTracingHarness to capture and compare against tables |
| Performance regression from new behaviors | Benchmark key operations; add performance tests |

---

## Timeline Estimate

| Phase | Tasks | Duration |
|-------|-------|----------|
| 1 | Core blocks (SessionRoot, WaitingToStart, Rest) | 3 days |
| 2 | Behaviors (7 new/updated) | 4 days |
| 3 | Compiler strategies (5 updated) | 3 days |
| 4 | Runtime integration + output tracing | 3 days |
| 5 | Integration tests (8 workout types) | 5 days |
| 6 | Validation, documentation, open questions | 4 days |
| 7 | Code quality, performance, polish | 2 days |
| **Total** | | **~24 days (4-6 sprints)** |

---

## Next Steps

1. **Start Phase 1**: Refactor WorkoutRoot → SessionRoot
2. **Parallel**: Create WaitingToStart + RestBlock classes
3. **Phase 2**: Implement behaviors one by one
4. **Phase 3**: Update compiler strategies
5. **Phase 4-5**: Integration testing + validation
6. **Phase 6-7**: Documentation + polish

**First Milestone**: Session lifecycle working (SessionRoot → WaitingToStart → Exercise → Session ends) by end of Phase 1.

