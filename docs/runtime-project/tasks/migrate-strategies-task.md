# Task: Migrate Strategies to Aspect-Based Behaviors

> **Status:** ✅ Completed  
> **Completed:** 2026-01-28  
> **Priority:** High  
> **Estimated Effort:** 2-3 hours

## Overview

Migrate the remaining runtime block strategies to use the new aspect-based behavior system. This involves replacing monolithic behavior composition with composable aspect behaviors.

---

## Prerequisites

- [x] Aspect behaviors implemented (`src/runtime/behaviors/`)
- [x] `IBehaviorContext` pattern established
- [x] Memory types defined (`MemoryTypes.ts`)
- [x] `EffortFallbackStrategy` migrated as proof of concept

---

## Target Strategies

### Phase 1: Timer Strategies (High Priority)

| Strategy | Location | Complexity |
|----------|----------|------------|
| `IntervalLogicStrategy` | `strategies/logic/IntervalLogicStrategy.ts` | Medium |
| `EmomLogicStrategy` | `strategies/logic/EmomLogicStrategy.ts` | Medium |
| `TabataLogicStrategy` | `strategies/logic/TabataLogicStrategy.ts` | Medium |
| `AmrapLogicStrategy` | `strategies/logic/AmrapLogicStrategy.ts` | Medium |

**Behaviors to use:**
- `TimerInitBehavior` - Initialize countdown timer
- `TimerTickBehavior` - Subscribe to tick events
- `TimerCompletionBehavior` - Complete on timer expiry
- `TimerPauseBehavior` - Handle pause/resume
- `DisplayInitBehavior` - Set countdown display mode
- `TimerOutputBehavior` - Emit timer outputs
- `SoundCueBehavior` - Play countdown beeps

### Phase 2: Loop Strategies (High Priority)

| Strategy | Location | Complexity |
|----------|----------|------------|
| `LoopStrategy` | `strategies/LoopStrategy.ts` | High |
| `RoundsLogicStrategy` | `strategies/logic/RoundsLogicStrategy.ts` | Medium |
| `ForTimeLogicStrategy` | `strategies/logic/ForTimeLogicStrategy.ts` | Medium |

**Behaviors to use:**
- `RoundInitBehavior` - Initialize round state
- `RoundAdvanceBehavior` - Increment rounds
- `RoundCompletionBehavior` - Complete when rounds exhausted
- `RoundDisplayBehavior` - Update round display
- `ChildRunnerBehavior` - Execute child blocks
- `RoundOutputBehavior` - Emit round milestones

### Phase 3: Root & Utility Strategies (Medium Priority)

| Strategy | Location | Complexity |
|----------|----------|------------|
| `WorkoutRootStrategy` | `strategies/WorkoutRootStrategy.ts` | High |
| `IdleFallbackStrategy` | `strategies/fallback/IdleFallbackStrategy.ts` | Low |
| `RestFallbackStrategy` | `strategies/fallback/RestFallbackStrategy.ts` | Low |

---

## Detailed Task Breakdown

### Task 1: Analyze Existing Strategy Patterns

**Duration:** 30 min

1. [ ] Review each strategy's `apply()` method
2. [ ] Document current behavior composition patterns
3. [ ] Map to aspect-based behaviors
4. [ ] Identify missing behaviors (if any)

**Output:** Strategy → Behavior mapping table

---

### Task 2: Migrate IntervalLogicStrategy

**Duration:** 20 min

**File:** `src/runtime/compiler/strategies/logic/IntervalLogicStrategy.ts`

**Steps:**
1. [ ] Add behavior imports
2. [ ] Replace behavior composition with:
   ```typescript
   builder
     .addBehavior(new TimerInitBehavior({ direction: 'down', durationMs: interval }))
     .addBehavior(new TimerTickBehavior())
     .addBehavior(new TimerCompletionBehavior())
     .addBehavior(new DisplayInitBehavior({ mode: 'countdown', label }))
     .addBehavior(new TimerOutputBehavior())
     .addBehavior(new SoundCueBehavior({ cues: [...] }));
   ```
3. [ ] Update tests
4. [ ] Verify no regressions

---

### Task 3: Migrate EmomLogicStrategy

**Duration:** 20 min

**File:** `src/runtime/compiler/strategies/logic/EmomLogicStrategy.ts`

**Steps:**
1. [ ] Add behavior imports
2. [ ] Replace with timer + round composite:
   ```typescript
   builder
     // Timer aspect (minute timer)
     .addBehavior(new TimerInitBehavior({ direction: 'down', durationMs: 60000 }))
     .addBehavior(new TimerTickBehavior())
     .addBehavior(new TimerCompletionBehavior())
     // Iteration aspect
     .addBehavior(new RoundInitBehavior({ totalRounds }))
     .addBehavior(new RoundAdvanceBehavior())
     .addBehavior(new RoundCompletionBehavior())
     // Children aspect
     .addBehavior(new ChildRunnerBehavior({ childGroups }))
     // Display & Output
     .addBehavior(new DisplayInitBehavior({ mode: 'countdown' }))
     .addBehavior(new RoundDisplayBehavior())
     .addBehavior(new TimerOutputBehavior());
   ```
3. [ ] Update tests
4. [ ] Verify no regressions

---

### Task 4: Migrate TabataLogicStrategy

**Duration:** 20 min

**File:** `src/runtime/compiler/strategies/logic/TabataLogicStrategy.ts`

**Steps:**
1. [ ] Add behavior imports
2. [ ] Compose work/rest intervals with rounds
3. [ ] Update tests
4. [ ] Verify no regressions

---

### Task 5: Migrate AmrapLogicStrategy

**Duration:** 20 min

**File:** `src/runtime/compiler/strategies/logic/AmrapLogicStrategy.ts`

**Steps:**
1. [ ] Add behavior imports
2. [ ] Replace with time-based completion:
   ```typescript
   builder
     // Timer aspect (AMRAP uses count-up until cap)
     .addBehavior(new TimerInitBehavior({ direction: 'down', durationMs: amrapDuration }))
     .addBehavior(new TimerCompletionBehavior()) // Complete when time expires
     // Iteration aspect (unbounded rounds)
     .addBehavior(new RoundInitBehavior({ totalRounds: undefined }))
     .addBehavior(new RoundAdvanceBehavior())
     // Children & Output
     .addBehavior(new ChildRunnerBehavior({ childGroups }))
     .addBehavior(new RoundOutputBehavior())
     .addBehavior(new HistoryRecordBehavior());
   ```
3. [ ] Update tests
4. [ ] Verify no regressions

---

### Task 6: Migrate LoopStrategy

**Duration:** 30 min (High Complexity)

**File:** `src/runtime/compiler/strategies/LoopStrategy.ts`

**Steps:**
1. [ ] Analyze existing `LoopCoordinatorBehavior` logic
2. [ ] Add behavior imports
3. [ ] Replace coordinator with composition:
   ```typescript
   builder
     .addBehavior(new RoundInitBehavior({ totalRounds, startRound: 1 }))
     .addBehavior(new RoundAdvanceBehavior())
     .addBehavior(new RoundCompletionBehavior())
     .addBehavior(new RoundDisplayBehavior())
     .addBehavior(new ChildRunnerBehavior({ childGroups }))
     .addBehavior(new DisplayInitBehavior({ mode: 'clock' }))
     .addBehavior(new RoundOutputBehavior())
     .addBehavior(new HistoryRecordBehavior());
   ```
4. [ ] Handle edge cases (nested loops, empty children)
5. [ ] Update tests
6. [ ] Verify no regressions

---

### Task 7: Migrate WorkoutRootStrategy

**Duration:** 30 min (High Complexity)

**File:** `src/runtime/compiler/strategies/WorkoutRootStrategy.ts`

**Steps:**
1. [ ] Analyze existing root lifecycle behavior
2. [ ] Add behavior imports
3. [ ] Replace with:
   ```typescript
   builder
     // Root doesn't complete on next, only when children done
     .addBehavior(new ChildRunnerBehavior({ childGroups }))
     .addBehavior(new DisplayInitBehavior({ mode: 'clock', label: 'Workout' }))
     .addBehavior(new HistoryRecordBehavior()) // Record full workout
     .addBehavior(new ControlsInitBehavior({ buttons: [...] }));
   ```
4. [ ] Handle workout completion detection
5. [ ] Update tests
6. [ ] Verify no regressions

---

### Task 8: Migrate Fallback Strategies

**Duration:** 15 min

**Files:**
- `src/runtime/compiler/strategies/fallback/IdleFallbackStrategy.ts`
- `src/runtime/compiler/strategies/fallback/RestFallbackStrategy.ts`

**Steps:**
1. [ ] Add behavior imports
2. [ ] Replace with simple timer compositions
3. [ ] Update tests
4. [ ] Verify no regressions

---

### Task 9: Cleanup & Deprecation

**Duration:** 15 min

**Steps:**
1. [ ] Mark old compound behaviors as deprecated
2. [ ] Add deprecation comments
3. [ ] Update barrel exports
4. [ ] Document migration in CHANGELOG

---

## Verification Checklist

| Check | Command |
|-------|---------|
| Type Check | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Unit Tests | `npx vitest run src/runtime` |
| Integration | `npx vitest run src/runtime/__tests__/integration` |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Behavior ordering issues | Add ordering tests, document add order |
| Missing edge cases | Keep old behaviors as fallback temporarily |
| Performance regression | Profile block creation before/after |

---

## Success Criteria

- [ ] All strategies use aspect-based behaviors
- [ ] No increase in test failures
- [ ] No performance regression
- [ ] Old compound behaviors deprecated
- [ ] Documentation updated
