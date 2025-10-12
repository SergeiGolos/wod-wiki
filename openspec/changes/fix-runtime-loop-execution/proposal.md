# Proposal: Fix Runtime Loop Execution

**Change ID**: `fix-runtime-loop-execution`  
**Status**: Draft  
**Created**: 2025-10-12  
**Author**: AI Assistant

## Overview

Fix critical runtime execution bugs preventing multi-round workouts from executing properly. The current behavior system fails to loop children across rounds, lacks coordination between behaviors, and doesn't implement metric inheritance, causing workouts like Fran `(21-15-9) Thrusters, Pullups` to stop after the first round.

## Problem Statement

The WOD Wiki runtime execution engine has fundamental flaws preventing proper workout execution:

**Current State:**
- Multi-round workouts stop after first round (only 2 of 7 expected `next()` calls work)
- `ChildAdvancementBehavior` advances linearly without looping back to first child
- `RoundsBehavior` tracks round count but doesn't trigger child re-compilation
- No coordination mechanism between behaviors for round boundaries
- Rep schemes (21-15-9) don't pass rep counts to child blocks
- First child doesn't compile automatically on block mount (requires extra click)
- Completion detection has race conditions causing premature termination

**Impact:**
- All multi-round CrossFit workouts (Fran, Diane, Helen, Barbara, Annie, etc.) are broken
- AMRAP and EMOM workouts cannot execute properly
- Rep scheme inheritance completely non-functional
- User experience is confusing (extra clicks, unexpected stops)

**Example Failure - Fran Workout:**
```
Expected: (21-15-9) Thrusters 95lb, Pullups
- Round 1: 21 Thrusters → 21 Pullups
- Round 2: 15 Thrusters → 15 Pullups  
- Round 3: 9 Thrusters → 9 Pullups
Total: 7 next() calls (mount + 6 advances)

Actual:
- Round 1: 21 Thrusters → 21 Pullups → STOPS
- Rounds 2 & 3: Never execute
Total: 2 next() calls before stopping
```

## Root Causes

### 1. Child Advancement Doesn't Loop
**File:** `src/runtime/behaviors/ChildAdvancementBehavior.ts`

The behavior increments `currentChildIndex` linearly and stops when reaching `children.length`, never cycling back to index 0 for subsequent rounds.

```typescript
// Current broken logic
this.currentChildIndex++;
if (this.currentChildIndex >= this.children.length) {
    return []; // ❌ STOPS - no looping
}
```

### 2. No Behavior Coordination
**Files:** `RoundsBehavior.ts`, `ChildAdvancementBehavior.ts`, `LazyCompilationBehavior.ts`

These three behaviors operate independently without communication:
- `RoundsBehavior` increments rounds but doesn't reset child index
- `ChildAdvancementBehavior` doesn't know when to loop vs complete
- `LazyCompilationBehavior` may compile wrong child due to timing issues

### 3. Missing Metric Inheritance System
**Files:** Multiple - JIT compiler, strategies, block context

Child blocks don't receive compilation context from parents:
- Rep schemes (21-15-9) exist in `RoundsBlock.getRepsForCurrentRound()`
- But `EffortBlock` instances never receive these values
- No mechanism to pass metrics down the block hierarchy

### 4. No Initial Child Push
**File:** `src/runtime/behaviors/RoundsBehavior.ts`

`onPush()` initializes state but returns empty action array, requiring user to click "Next" to start the first child.

## Proposed Solution

Replace the fragmented behavior system with a unified **LoopCoordinatorBehavior** that manages all aspects of loop execution.

### Architecture Changes

**New Component:** `LoopCoordinatorBehavior`
- Single behavior replacing `RoundsBehavior` + `ChildAdvancementBehavior` + `LazyCompilationBehavior`
- Tracks unified loop state: `index`, `position`, `rounds`
- Supports multiple loop types: fixed rounds, rep schemes, AMRAP, EMOM
- Handles child group compilation with proper context passing

**Core Loop State:**
```typescript
interface LoopState {
  index: number;      // Total next() calls: 0 to infinity
  position: number;   // Child group index: index % childGroups.length
  rounds: number;     // Completed rounds: floor(index / childGroups.length)
}
```

**Loop Types Supported:**
1. **Fixed Rounds**: `(3) Pullups, Pushups` - Same reps all rounds
2. **Rep Scheme**: `(21-15-9) Thrusters, Pullups` - Variable reps per round
3. **AMRAP**: `20:00 AMRAP Pullups, Pushups` - Loop until timer expires
4. **EMOM**: `(30) :60 EMOM + Pullups, + Pushups` - Timed intervals with grouping

### Key Features

1. **Automatic Child Looping**
   - Uses modulo arithmetic: `position = index % childGroups.length`
   - Loops children indefinitely based on loop type completion
   - Properly handles child groups (compose `+` vs separate `-`)

2. **Round Boundary Detection**
   - Detects round transitions when `position` wraps to 0
   - Increments round counter: `rounds = floor(index / childGroups.length)`
   - Emits `rounds:changed` and `rounds:complete` events

3. **Context-Aware Compilation**
   - Passes `CompilationContext` to JIT compiler with round, position, reps
   - Enables metric inheritance from parent to child blocks
   - Rep scheme values accessible via `getRepsForCurrentRound()`

4. **Initial Push on Mount**
   - `onPush()` immediately compiles and pushes first child
   - Eliminates extra "Next" click for workout start
   - Returns `PushBlockAction` for first child group

5. **Loop Type Detection**
   - Analyzes fragments (RoundsFragment, TimerFragment) to determine loop type
   - Configures completion logic based on type (fixed, timeBound, interval)
   - Supports infinite loops for AMRAP with timer-based completion

## Implementation Phases

### Phase 1: Create LoopCoordinatorBehavior (Critical)
- Implement unified behavior with index/position/rounds state
- Add loop type detection from fragments
- Implement modulo-based child cycling logic
- Support all four loop types (fixed, repScheme, timeBound, interval)
- Write comprehensive unit tests

### Phase 2: Add Compilation Context System (High Priority)
- Create `CompilationContext` interface
- Modify `JitCompiler.compile()` to accept parent context
- Update all strategies to receive and use context
- Implement `EffortStrategy` metric inheritance from parent
- Test rep scheme propagation

### Phase 3: Integrate with RoundsBlock (High Priority)
- Replace `RoundsBehavior` + `ChildAdvancementBehavior` with `LoopCoordinatorBehavior`
- Update `RoundsBlock.ts` to use new behavior
- Implement initial push on mount
- Update memory state management
- Test Fran workout end-to-end

### Phase 4: Add Event Emission (Medium Priority)
- Emit `rounds:changed` on round transitions
- Emit `rounds:complete` on workout completion
- Update event interfaces if needed
- Test event handlers in Clock components

### Phase 5: Update Other Loop Types (Medium Priority)
- Test AMRAP workouts with timer completion
- Test EMOM workouts with interval timing
- Verify compose grouping works correctly
- Add tests for edge cases (single child, no children)

### Phase 6: Remove Deprecated Behaviors (Low Priority)
- Remove `ChildAdvancementBehavior.ts`
- Remove `LazyCompilationBehavior.ts` 
- Update `RoundsBehavior.ts` or deprecate if fully replaced
- Clean up imports across codebase
- Update documentation

## Migration Strategy

**Backward Compatibility:**
- New behavior is opt-in initially via feature flag
- Existing runtime blocks continue using old behaviors during testing
- Gradual migration: RoundsBlock first, then TimerBlock, then others

**Testing Approach:**
- Unit tests for `LoopCoordinatorBehavior` in isolation
- Integration tests for each workout type (Fran, Helen, Cindy, Chelsea)
- Storybook stories updated with validation
- Manual testing checklist in Storybook

**Rollback Plan:**
- Keep old behaviors in codebase until full validation
- Feature flag enables easy revert if issues found
- Document known limitations during migration

## Success Criteria

**Functional Requirements:**
- [ ] Fran workout executes all 7 next() calls correctly (3 rounds × 2 exercises + complete)
- [ ] Rep schemes (21-15-9) propagate to child blocks
- [ ] Round counter increments properly: 1 → 2 → 3
- [ ] No premature completion or infinite loops
- [ ] First child pushes automatically on mount (no extra click)
- [ ] All loop types work: fixed, repScheme, AMRAP, EMOM

**Performance Requirements:**
- [ ] Loop state calculations < 0.1ms (same as before)
- [ ] Child compilation timing unchanged (< 1ms)
- [ ] No memory leaks during long AMRAP workouts
- [ ] Event emission doesn't impact performance

**Test Coverage:**
- [ ] Unit tests: 95%+ coverage for LoopCoordinatorBehavior
- [ ] Integration tests for all 4 loop types
- [ ] Edge case tests (0 children, 1 child, 100 rounds)
- [ ] Storybook visual validation for 6+ workouts

**Documentation:**
- [ ] Architecture docs updated with new behavior model
- [ ] Migration guide for other block types
- [ ] API documentation for LoopCoordinatorBehavior
- [ ] Storybook stories demonstrate all loop types

## Related Documents

- **Analysis**: `docs/runtime-execution-problems-analysis.md`
- **Refactoring Plan**: `docs/runtime-refactoring-plan.md`
- **Behavior Guides**: `docs/behavior-metric-emission-guide.md`
- **Test Migration**: `docs/test-migration-guide.md`

## Key Capabilities

This change introduces and modifies the following capabilities:

### New Capabilities
1. **`runtime-loop-coordination`** - Unified loop state management and child cycling
2. **`runtime-metric-inheritance`** - Parent-to-child context passing system
3. **`runtime-compilation-context`** - Context-aware JIT compilation

### Modified Capabilities  
4. **`runtime-block-behaviors`** (existing) - Updated behavior composition model
5. **`runtime-event-emission`** (existing) - Enhanced round/completion events

## Open Questions

1. **Should LazyCompilationBehavior be fully removed or kept for other block types?**
   - Decision: Keep for TimerBlock, EffortBlock; deprecate for RoundsBlock

2. **How to handle AMRAP completion when timer expires mid-exercise?**
   - Decision: Allow current exercise to complete, then emit completion event

3. **Should metric inheritance use push (parent provides) or pull (child requests) model?**
   - Decision: Push model via CompilationContext for better type safety

4. **What happens if rep scheme has fewer values than rounds requested?**
   - Decision: Error during compilation with clear message

5. **Should old behaviors remain for backward compatibility or hard cutover?**
   - Decision: Hard cutover for RoundsBlock, gradual for others with deprecation warnings

## Dependencies

**Internal:**
- `src/runtime/JitCompiler.ts` - Requires signature changes
- `src/runtime/strategies.ts` - All strategies need context parameter
- `src/runtime/blocks/RoundsBlock.ts` - Main integration point
- `src/runtime/IRuntimeBehavior.ts` - Interface may need additions

**External:**
- None - purely internal refactoring

## Risks & Mitigations

**Risk 1: Breaking existing workouts**
- *Mitigation*: Feature flag, extensive testing, gradual rollout

**Risk 2: Performance regression**
- *Mitigation*: Benchmark before/after, profiling, optimization pass

**Risk 3: Incomplete context passing**
- *Mitigation*: Type system enforcement, integration tests, runtime validation

**Risk 4: Event emission changes break UI**
- *Mitigation*: Test Clock components, verify event payloads, backward compatible events

## Timeline Estimate

- **Phase 1**: 3-4 days (LoopCoordinatorBehavior + tests)
- **Phase 2**: 2-3 days (Compilation context system)
- **Phase 3**: 2-3 days (RoundsBlock integration)
- **Phase 4**: 1-2 days (Event emission)
- **Phase 5**: 2-3 days (Other loop types)
- **Phase 6**: 1-2 days (Cleanup)

**Total**: 11-17 days for complete implementation and validation
