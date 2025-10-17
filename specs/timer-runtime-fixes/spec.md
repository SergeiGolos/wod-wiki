# Feature Specification: Timer Runtime Coordination Fixes

**Feature Name**: Timer Runtime Coordination - Multi-Round and Timed Workout Support  
**Created**: October 16, 2025  
**Status**: Draft  
**Branch**: timer-runtime-fixes

---

## Overview

Fix critical coordination issues in the WOD Wiki runtime system that prevent timer-based workouts (AMRAP, For Time, EMOM) and multi-round workouts (rep schemes like 21-15-9) from executing correctly. The runtime architecture is well-designed but missing 7 critical coordination mechanisms between timers, rounds, and child blocks.

## Problem Statement

The current runtime system has comprehensive interfaces and behaviors but lacks the coordination logic needed for complex workouts. Specifically:

**Current Failures**:
1. **Fran Workout** `(21-15-9) Thrusters, Pullups` - Only executes first round, then stops
2. **AMRAP Workouts** `(21-15-9) 20:00 AMRAP Thrusters, Pullups` - Cannot compile (no strategy)
3. **For Time Workouts** `20:00 For Time: 100 Squats` - Timer runs but children don't execute
4. **Rep Inheritance** - Children don't receive rep counts from parent rounds (21→15→9)
5. **Timer Completion** - Timer expires but workout continues, or children complete but timer keeps running
6. **Manual Start** - User must click "Next" to start workout instead of auto-executing
7. **Round Boundaries** - Behaviors don't coordinate at round transitions

**Root Cause**: Missing coordination behaviors and compilation strategies that connect independently-working subsystems (timers, rounds, children).

## User Stories

### US-1: Multi-Round Workouts (Fran)
**As a** CrossFit athlete  
**I want to** execute workouts with rep schemes like "21-15-9"  
**So that** each round executes with the correct rep count and all rounds complete

**Acceptance Criteria**:
- `(21-15-9) Thrusters 95lb, Pullups` executes 3 complete rounds
- Round 1: Thrusters (21 reps), Pullups (21 reps)
- Round 2: Thrusters (15 reps), Pullups (15 reps)
- Round 3: Thrusters (9 reps), Pullups (9 reps)
- Memory shows correct currentRound and rep counts
- Workout completes after round 3

### US-2: AMRAP Workouts
**As a** CrossFit athlete  
**I want to** execute AMRAP (As Many Rounds As Possible) workouts with countdown timers  
**So that** I can complete as many rounds as possible before time expires

**Acceptance Criteria**:
- `(21-15-9) 20:00 AMRAP Thrusters, Pullups` compiles successfully
- Timer counts down from 20:00
- Rounds loop (21→15→9→21→15→9...) until timer expires
- Workout stops when timer reaches 0:00
- Final state shows rounds completed and time elapsed

### US-3: For Time Workouts
**As a** CrossFit athlete  
**I want to** execute "For Time" workouts where timer counts up until work completes  
**So that** I can track how long it takes to finish the workout

**Acceptance Criteria**:
- `20:00 For Time: 100 Squats` executes correctly
- Timer counts up from 0:00
- Squats execute with 100 reps
- Timer stops when squats complete
- If 20:00 expires first, workout stops (time cap)

### US-4: EMOM Intervals
**As a** CrossFit athlete  
**I want to** execute EMOM (Every Minute On the Minute) workouts  
**So that** exercises trigger at precise intervals

**Acceptance Criteria**:
- `10:00 EMOM: 10 Burpees` executes 10 rounds
- Each round starts exactly on the minute
- Timer controls round advancement
- Workout completes after 10 minutes

## Functional Requirements

### FR-1: LoopCoordinatorBehavior
**Purpose**: Coordinate child looping with round advancement

**Requirements**:
- Reset child index to 0 when reaching end of children array
- Increment round counter when looping back to first child
- Compile next child with inherited metrics from parent
- Detect workout completion (all rounds done)
- Support three modes: 'rounds', 'timed-rounds', 'intervals'

**Integration**:
- Works with ChildAdvancementBehavior for child management
- Works with RoundsBehavior for round tracking
- Works with LazyCompilationBehavior for just-in-time compilation

### FR-2: TimeBoundRoundsStrategy
**Purpose**: Compile AMRAP workouts combining timer + rounds + children

**Requirements**:
- Match patterns: Timer fragment + Rounds fragment + Action="AMRAP"
- Strategy precedence: HIGHEST (before TimerStrategy and RoundsStrategy)
- Create composite structure: TimerBlock wrapping RoundsBlock wrapping children
- Configure timer direction: 'down' for countdown, 'up' for count-up
- Pass duration to TimerBlock, rep scheme to RoundsBlock

**Example Compilation**:
```typescript
// Input: "(21-15-9) 20:00 AMRAP Thrusters, Pullups"
// Output: TimerBlock(20:00, down) → RoundsBlock([21,15,9]) → [Thrusters, Pullups]
```

### FR-3: TimerBlock Child Management
**Purpose**: Enable TimerBlock to wrap and coordinate with child blocks

**Requirements**:
- Add ChildAdvancementBehavior to TimerBlock when children present
- Add LazyCompilationBehavior for child compilation
- Add LoopCoordinatorBehavior for round looping (if needed)
- Coordinate completion: timer expires OR children complete (whichever first)
- Auto-push first child on mount

**Configuration**:
```typescript
interface TimerBlockConfig {
  direction: 'up' | 'down';
  durationMs?: number;
  children?: ICodeStatement[];  // NEW: Child statements to execute
}
```

### FR-4: Metric Inheritance System
**Purpose**: Pass metrics from parent blocks to children during compilation

**Requirements**:
- Enhance CompilationContext with inheritedMetrics field
- RoundsBlock passes current round's rep count to children
- TimerBlock passes duration to children (if needed)
- Strategies extract inherited metrics before fragment metrics
- Context flows: RoundsBlock → JIT compile → EffortBlock constructor

**Implementation**:
```typescript
interface CompilationContext {
  parentBlock?: IRuntimeBlock;
  inheritedMetrics?: {
    reps?: number;
    duration?: number;
    resistance?: number;
  };
  roundState?: {
    currentRound: number;
    totalRounds: number;
    repScheme?: number[];
  };
}
```

### FR-5: Auto-Start on Mount
**Purpose**: Automatically push first child when parent block mounts

**Requirements**:
- RoundsBehavior.onPush() compiles and pushes first child
- Returns PushBlockAction with compiled child block
- Passes current round context to child compilation
- Eliminates need for manual "Next" click to start
- Works for all parent blocks (Rounds, Timer, Group)

### FR-6: Timer-Child Completion Coordination
**Purpose**: Stop execution when either timer expires or children complete

**Requirements**:
- TimerBehavior emits timer:complete when countdown reaches zero
- CompletionBehavior listens for timer:complete event
- When children complete, stop timer (close final timespan)
- Whichever completes first triggers workout completion
- Record exact completion timestamp for analytics

### FR-7: Fix LazyCompilationBehavior Timing
**Purpose**: Compile correct child at round boundaries

**Requirements**:
- Calculate NEXT child index (current + 1) before compiling
- Check bounds before accessing children array
- Coordinate with LoopCoordinatorBehavior for looping logic
- Pass current round context to child compilation
- Handle edge cases (empty children, last child)

## Non-Functional Requirements

### NFR-1: Performance
- All lifecycle methods must complete within 50ms (existing contract)
- Stack push/pop operations < 1ms (existing contract)
- Round transitions < 10ms (new requirement for smooth UX)
- Metric inheritance adds < 5ms to compilation time

### NFR-2: Backward Compatibility
- NO breaking changes to IRuntimeBlock interface
- NO breaking changes to IScriptRuntime interface
- Existing strategies continue to work (add new, don't modify)
- Existing workouts continue to execute correctly
- Memory system remains unchanged

### NFR-3: Test Coverage
- 90%+ coverage for all new behaviors
- Integration tests for each workout type (Fran, AMRAP, For Time, EMOM)
- Contract tests verify interface compliance
- Performance tests validate timing requirements

### NFR-4: Code Quality
- TypeScript strict mode compliance
- Comprehensive JSDoc comments for all public APIs
- Follow existing behavior patterns and naming conventions
- Constitutional compliance (Component-First, JIT Compiler, Parser-First)

## Technical Constraints

### TC-1: No Interface Changes
- Cannot modify IRuntimeBlock, IScriptRuntime, IRuntimeBehavior interfaces
- Cannot change RuntimeStack public API
- Can add new optional fields to existing interfaces
- Can create new interfaces for new features

### TC-2: Strategy Precedence
- New TimeBoundRoundsStrategy must be registered FIRST in JitCompiler
- Strategy order: TimeBoundRounds > Interval > Timer > Rounds > Group > Effort
- Match methods must be precise to avoid conflicts

### TC-3: Behavior Coordination
- Behaviors must coordinate via runtime context, not direct references
- Use duck-typing to find sibling behaviors (findBehavior pattern)
- Event-driven communication for cross-behavior coordination
- No circular dependencies between behaviors

## Success Criteria

### SC-1: All Workout Types Execute
- ✅ Fran workout `(21-15-9) Thrusters, Pullups` completes 3 rounds
- ✅ AMRAP workout `(21-15-9) 20:00 AMRAP Thrusters, Pullups` loops until timer expires
- ✅ For Time workout `20:00 For Time: 100 Squats` completes or hits time cap
- ✅ EMOM workout `10:00 EMOM: 10 Burpees` executes 10 rounds at 1-minute intervals

### SC-2: Metric Inheritance Works
- ✅ Round 1 children receive reps=21
- ✅ Round 2 children receive reps=15
- ✅ Round 3 children receive reps=9
- ✅ Memory visualization shows correct inherited metrics

### SC-3: No Manual Start Required
- ✅ Pushing RoundsBlock auto-pushes first child
- ✅ Pushing TimerBlock auto-pushes first child (if has children)
- ✅ No "Next" click needed to start workout

### SC-4: All Tests Pass
- ✅ 45+ existing tests continue to pass (no regressions)
- ✅ 20+ new integration tests pass
- ✅ Performance benchmarks met (<50ms lifecycle)
- ✅ Contract tests verify behavior compliance

## Dependencies

### Internal Dependencies
- `src/runtime/IRuntimeBlock.ts` - Block interface (no changes)
- `src/runtime/IRuntimeBehavior.ts` - Behavior interface (no changes)
- `src/runtime/IScriptRuntime.ts` - Runtime interface (no changes)
- `src/runtime/behaviors/` - Existing behaviors (extend, don't modify)
- `src/runtime/strategies.ts` - Strategy implementations (add new strategy)
- `src/runtime/JitCompiler.ts` - Compiler (register new strategy)
- `src/runtime/CompilationContext.ts` - Context (enhance interface)

### External Dependencies
- TypeScript 5+ (existing)
- Vitest (existing)
- No new external dependencies

## Out of Scope

The following are explicitly **not** included in this feature:
- Timer display UI components (separate feature)
- Analytics/metrics collection (separate feature)
- Workout saving/persistence (separate feature)
- New workout syntax (parser changes)
- Exercise database integration (separate feature)
- Real-time timer updates at sub-100ms intervals
- Multi-timer support (nested timers)
- Dynamic rep scheme modification during execution

## Risks and Mitigations

### Risk 1: Behavior Coordination Complexity
**Risk**: Multiple behaviors coordinating may introduce subtle timing bugs  
**Likelihood**: Medium  
**Impact**: High  
**Mitigation**: Comprehensive integration tests for each workout type; behavior execution order tests; state machine validation

### Risk 2: Strategy Precedence Conflicts
**Risk**: New TimeBoundRoundsStrategy may conflict with existing strategies  
**Likelihood**: Low  
**Impact**: High  
**Mitigation**: Precise match conditions; strategy precedence tests; conflict detection in JitCompiler

### Risk 3: Performance Regression
**Risk**: Additional coordination logic may slow down lifecycle methods  
**Likelihood**: Low  
**Impact**: Medium  
**Mitigation**: Performance benchmarks; profiling; optimization pass before release

### Risk 4: Backward Compatibility Break
**Risk**: Changes may break existing workouts  
**Likelihood**: Low  
**Impact**: Critical  
**Mitigation**: Comprehensive regression tests; backward compatibility test suite; canary deployments

## Clarifications

### Session 1: October 16, 2025

**Q1: Should LoopCoordinatorBehavior be a separate behavior or integrated into existing behaviors?**  
**A**: Separate behavior. This maintains single-responsibility principle and makes it optional for blocks that don't need looping. Add to blocks via composition.

**Q2: How should timer-child completion coordination work exactly?**  
**A**: 
- For countdown timers (AMRAP): Timer completes when countdown reaches zero OR all children permanently complete (no more work)
- For count-up timers (For Time): Timer completes when children complete OR time cap reached
- Whichever event happens first triggers block completion
- Close timer timespan and emit completion event

**Q3: Should metric inheritance be deep or shallow?**  
**A**: Shallow (one level). Parent passes metrics to immediate children only. Grandchildren receive metrics from their parents (which may have inherited from grandparents). No deep context chaining needed.

**Q4: What should happen when LazyCompilationBehavior runs out of children mid-round?**  
**A**: Let LoopCoordinatorBehavior handle it. LazyCompilation should return empty actions when out of bounds, allowing LoopCoordinatorBehavior to decide whether to loop or complete.

**Q5: Should auto-start be configurable or always-on?**  
**A**: Always-on for parent blocks with children. This is expected behavior for all workout types. No configuration needed.

**Q6: How should TimeBoundRoundsStrategy distinguish between AMRAP and For Time?**  
**A**: 
- AMRAP: Timer fragment + Rounds fragment + Action="AMRAP" → countdown timer, rounds loop
- For Time: Timer fragment + children (no rounds) → count-up timer, children execute once
- Different strategies for different patterns

**Q7: Should we create IntervalStrategy for EMOM workouts now or later?**  
**A**: Phase 3 (week 3). Focus on basic timer-child coordination (Phase 1) and round looping (Phase 2) first. EMOM needs additional interval-based round triggering logic.

**Q8: What test scenarios are mandatory?**  
**A**:
1. Fran workout (21-15-9, multi-round)
2. Simple AMRAP (timer countdown, round looping)
3. For Time with time cap (count-up timer, child completion)
4. Empty workout edge cases
5. Single-round workout (no looping)
6. Timer-only workout (no children)
7. Performance benchmarks for all lifecycle methods

## Implementation Phases

### Phase 1: Basic Timer-Child Coordination (Week 1)
**Goal**: Get timers working with children

**Deliverables**:
1. Enhanced TimerBlock with child management behaviors
2. Auto-start on mount for TimerBlock and RoundsBlock
3. Fix LazyCompilationBehavior timing issue
4. Timer-child completion coordination

**Success**: `20:00 For Time: 100 Squats` executes correctly

### Phase 2: Round Looping (Week 2)
**Goal**: Get multi-round workouts working

**Deliverables**:
1. LoopCoordinatorBehavior implementation
2. Enhanced CompilationContext with metric inheritance
3. Metric passing in all strategies
4. Round boundary handling

**Success**: `(21-15-9) Thrusters, Pullups` completes 3 rounds with correct reps

### Phase 3: AMRAP and Intervals (Week 3)
**Goal**: Get timed round workouts working

**Deliverables**:
1. TimeBoundRoundsStrategy implementation
2. Strategy registration and precedence
3. Timer-controlled round looping
4. EMOM IntervalStrategy (stretch goal)

**Success**: `(21-15-9) 20:00 AMRAP Thrusters, Pullups` loops rounds until timer expires

### Phase 4: Polish and Edge Cases (Week 4)
**Goal**: Production readiness

**Deliverables**:
1. Comprehensive test coverage (90%+)
2. Performance optimization
3. Edge case handling
4. Documentation updates

**Success**: All tests pass, no known bugs, documentation complete

## References

- **Analysis Document**: `docs/timer-runtime-alignment-analysis.md`
- **Runtime Interfaces**: `docs/runtime-interfaces-deep-dive.md`
- **Execution Problems**: `docs/runtime-execution-problems-analysis.md`
- **Behavior Architecture**: `notes/runtime-behavior-architecture.md`
- **Constitution**: `.specify/memory/constitution.md`
- **Copilot Instructions**: `.github/copilot-instructions.md`

## Approval

- [ ] Product Owner: ___________________ Date: _______
- [ ] Tech Lead: ___________________ Date: _______
- [ ] Runtime Architect: ___________________ Date: _______

---

**Next Steps**: Execute implementation plan with `/plan` command
