# Quickstart Guide: JIT Compiler Strategy Implementation

**Feature**: 009-jit-compiler-strategy  
**Date**: 2025-10-05  
**Estimated Time**: 15-20 minutes

## Overview
This quickstart validates the JIT compiler strategy implementation through interactive Storybook testing. You'll observe the "Next Block" button advancing the runtime stack through compiled workout structures, displaying distinct block types (Timer, Rounds, Effort) instead of generic "Runtime (Idle)" labels.

## Prerequisites
- WOD Wiki repository cloned and checked out to `009-jit-compiler-strategy` branch
- Node.js 18+ and npm installed
- Dependencies installed (`npm install` completed)
- Storybook builds successfully

## Quick Validation (5 minutes)

### 1. Start Storybook
```powershell
npm run storybook
```
**Expected**: Storybook starts on http://localhost:6006 within ~2 seconds

### 2. Navigate to JIT Compiler Demo
- Open browser to http://localhost:6006
- Navigate to: **Compiler > Jit Compiler Demo > Default**
- Locate the "Next Block" button in the demo interface
- Observe the "Runtime Stack" display panel

### 3. Observe Initial State
**Expected Stack Display**:
```
Runtime Stack (1 blocks):
- Root Block (Idle)
```

### 4. Click "Next Block" Button
**Expected Outcome**:
- Stack grows to 2 blocks
- Second block shows type-specific name (NOT "Runtime (Idle)")
- Console logs show strategy matching activity

**Example Expected Display**:
```
Runtime Stack (2 blocks):
- Root Block (Executing)
- Timer Block (Idle)    ← Type-specific label
```

## Detailed Validation Scenarios

### Scenario 1: AMRAP Workout (Timer Strategy)

**User Story**: AS-002 - AMRAP workout compiles to timer-based blocks

**Steps**:
1. Navigate to **Workouts > Amrap > Default** story
2. Observe demo interface with AMRAP workout loaded
3. Click "Next Block" button
4. Observe stack display

**Expected Result**:
```
Runtime Stack (2 blocks):
- Root Block (Executing)
- Timer Block (Idle)    ← Timer strategy matched
```

**Success Criteria**:
- ✅ Second block labeled "Timer Block" (not "Runtime")
- ✅ Console shows: "🧠 TimerStrategy compiling 1 statement(s)"
- ✅ No errors in browser console

**Acceptance**: AS-002 validated

---

### Scenario 2: For Time Workout (Rounds Strategy)

**User Story**: AS-003 - For Time workout compiles to rounds-based blocks

**Steps**:
1. Navigate to **Workouts > For Time > Default** story (if exists)
2. Look for workout with rounds modifier (e.g., "5 rounds for time")
3. Click "Next Block" button
4. Observe stack display

**Expected Result**:
```
Runtime Stack (2 blocks):
- Root Block (Executing)
- Rounds Block (Idle)   ← Rounds strategy matched
```

**Success Criteria**:
- ✅ Second block labeled "Rounds Block" (not "Runtime")
- ✅ Console shows: "🧠 RoundsStrategy compiling 1 statement(s)"
- ✅ Timer strategy did NOT match (precedence correct)

**Acceptance**: AS-003 validated

---

### Scenario 3: Simple Effort Statement (Effort Strategy)

**User Story**: AS-004 - Simple effort statements compile to effort blocks

**Steps**:
1. Navigate to **Parser > Simple Effort > Default** story
2. Look for single exercise without timer/rounds (e.g., "10 pull-ups")
3. Click "Next Block" button
4. Observe stack display

**Expected Result**:
```
Runtime Stack (2 blocks):
- Root Block (Executing)
- Effort Block (Idle)   ← Effort strategy matched (fallback)
```

**Success Criteria**:
- ✅ Second block labeled "Effort Block" (not "Runtime")
- ✅ Console shows: "🧠 EffortStrategy compiling 1 statement(s)"
- ✅ No timer or rounds strategies attempted

**Acceptance**: AS-004 validated

---

### Scenario 4: Nested Compilation (Behavior Cascade)

**User Story**: AS-005 - Parent blocks compile children recursively

**Steps**:
1. Navigate to **Workouts > Amrap > Default** story
2. Click "Next Block" once (compiles parent timer block)
3. Click "Next Block" again (should compile first child)
4. Observe stack growth

**Expected Result**:
```
Runtime Stack (3 blocks):
- Root Block (Executing)
- Timer Block (Executing)
- Effort Block (Idle)   ← Child compiled by LazyCompilationBehavior
```

**Success Criteria**:
- ✅ Stack grows to 3 blocks
- ✅ Third block shows effort type (child exercise)
- ✅ Console shows recursive compilation activity
- ✅ ChildAdvancementBehavior incremented index

**Acceptance**: AS-005 validated

---

### Scenario 5: Strategy Precedence Order

**User Story**: AS-006 - Strategies evaluated in correct precedence

**Steps**:
1. Open browser DevTools console
2. Navigate to any workout story with timer
3. Click "Next Block"
4. Observe console log output

**Expected Console Output**:
```
🔍 JitCompiler: Evaluating 3 strategies...
🧠 TimerStrategy checking statement...
✅ TimerStrategy matched! Compiling...
🧠 TimerStrategy compiling 1 statement(s)
```

**Success Criteria**:
- ✅ TimerStrategy evaluated first (before Rounds, Effort)
- ✅ Compilation stops after first match (no extra checks)
- ✅ Log order: Timer → [match] → compile

**Acceptance**: AS-006 validated

---

### Scenario 6: Block Type Display

**User Story**: AS-007 - Demo interface displays distinct block types

**Steps**:
1. Navigate to any workout story
2. Click "Next Block" multiple times
3. Observe stack display panel
4. Verify each block shows unique type

**Expected Display**:
```
Runtime Stack (4 blocks):
- Root Block (Executing)
- Timer Block (Executing)
- Effort Block (Completed)
- Effort Block (Idle)
```

**Success Criteria**:
- ✅ NO blocks labeled "Runtime (Idle)"
- ✅ Timer blocks show "Timer"
- ✅ Rounds blocks show "Rounds"
- ✅ Effort blocks show "Effort"
- ✅ State displayed (Idle/Executing/Completed)

**Acceptance**: AS-007 validated

---

## Regression Testing

### Test Existing Workout Stories
Run through all existing workout examples to ensure no regressions:

1. **Workouts > Amrap** - All AMRAP stories compile correctly
2. **Workouts > For Time** - All For Time stories compile correctly
3. **Workouts > EMOM** - All EMOM stories compile correctly (if exist)
4. **Workouts > Tabata** - All Tabata stories compile correctly (if exist)

**Expected**: All stories load without errors, "Next Block" advances stack correctly

**Acceptance**: SC-008 validated

---

## Troubleshooting

### Issue: Second block still shows "Runtime (Idle)"
**Cause**: EffortStrategy not fixed, still matching everything
**Solution**: Verify `EffortStrategy.match()` checks for Timer/Rounds fragments
**Verification**: Check `src/runtime/strategies.ts` line 15

### Issue: No second block added to stack
**Cause**: Behaviors not propagated to compiled blocks
**Solution**: Verify strategies add `ChildAdvancementBehavior` and `LazyCompilationBehavior`
**Verification**: Check strategy `compile()` methods add behaviors when children exist

### Issue: Console shows "No suitable strategy found"
**Cause**: All strategies returning false for valid statements
**Solution**: Verify fragment type checking logic in strategy `match()` methods
**Verification**: Check `FragmentType` enum values match fragment inspection

### Issue: Wrong strategy matching (e.g., Timer statement matched by Effort)
**Cause**: Strategy registration order incorrect
**Solution**: Verify registration order in demo initialization: Timer → Rounds → Effort
**Verification**: Check `JitCompilerDemo.tsx` strategy registration sequence

### Issue: TypeScript compilation errors
**Cause**: Strategy interface signatures don't match implementation
**Solution**: Verify `match()` and `compile()` accept `ICodeStatement[]` not `RuntimeMetric[]`
**Verification**: Check TypeScript compiler output, fix parameter types

---

## Performance Validation

### Expected Performance Metrics
- **Strategy matching**: < 1ms per statement
- **Block compilation**: < 1ms per block
- **Stack push operation**: < 1ms
- **UI update latency**: < 100ms perceived

### Measurement Steps
1. Open browser DevTools Performance tab
2. Click "Next Block" button
3. Observe flame graph for compilation activity

**Expected**: Single compilation span < 5ms total (including UI update)

**Acceptance**: NFR-001 validated (no specific targets required for demo)

---

## Unit Test Validation

### Run Unit Tests
```powershell
npm run test:unit
```

**Expected Output**:
```
✓ tests/unit/runtime/strategies.test.ts (9 tests)
  ✓ Strategy Matching Contract
    ✓ TSC-001: TimerStrategy matches Timer fragments
    ✓ TSC-002: TimerStrategy rejects non-Timer
    ✓ TSC-003: RoundsStrategy matches Rounds
    ✓ TSC-004: RoundsStrategy rejects Timer
    ✓ TSC-005: EffortStrategy matches effort only
    ✓ TSC-006: EffortStrategy rejects Timer
    ✓ TSC-007: EffortStrategy rejects Rounds
    ✓ TSC-008: Handles empty statements
    ✓ TSC-009: Handles missing fragments

✓ tests/unit/runtime/block-compilation.test.ts (9 tests)
  ✓ Block Compilation Contract
    ✓ TBC-001: TimerStrategy sets Timer type
    ✓ TBC-002: RoundsStrategy sets Rounds type
    ✓ TBC-003: EffortStrategy sets Effort type
    ✓ TBC-004: Adds behaviors when children exist
    ✓ TBC-005: Omits behaviors for leaf blocks
    ✓ TBC-006: ChildAdvancementBehavior initialized
    ✓ TBC-007: Preserves source statement ID
    ✓ TBC-008: Receives runtime reference
    ✓ TBC-009: Multiple statements handled

Test Files: 2 passed (2)
Tests: 18 passed (18)
Duration: ~3s
```

**Acceptance**: All contract tests pass

---

## Integration Test Validation

### Run Integration Tests
```powershell
npm run test:integration
```

**Expected Output**:
```
✓ tests/integration/jit-compiler-precedence.test.ts (9 tests)
  ✓ Strategy Precedence Contract
    ✓ TSP-001: Timer evaluated before Rounds
    ✓ TSP-002: Rounds evaluated before Effort
    ✓ TSP-003: Effort acts as fallback
    ✓ TSP-004: Timer+Rounds matches Timer
    ✓ TSP-005: Registration order matters
    ✓ TSP-006: No matching strategy returns undefined
    ✓ TSP-007: Empty statements returns undefined
    ✓ TSP-008: First match wins (no double compilation)
    ✓ TSP-009: Multiple compiles maintain precedence

Test Files: 1 passed (1)
Tests: 9 passed (9)
Duration: ~2s
```

**Acceptance**: All integration tests pass

---

## Success Checklist

Mark each item when validated:

- [ ] Storybook starts without errors
- [ ] "Next Block" button adds second block to stack
- [ ] Second block shows type-specific label (not "Runtime")
- [ ] AMRAP workouts compile to Timer blocks
- [ ] For Time workouts compile to Rounds blocks
- [ ] Simple efforts compile to Effort blocks
- [ ] Nested children compile recursively
- [ ] Console logs show strategy matching
- [ ] No TypeScript compilation errors introduced
- [ ] Unit tests pass (18/18)
- [ ] Integration tests pass (9/9)
- [ ] All existing workout stories still work

**Overall Status**: ✅ Feature validated when all boxes checked

---

## Next Steps After Validation

1. **Commit changes**: `git commit -am "Implement JIT compiler strategy matching with fragment-based precedence"`
2. **Push branch**: `git push origin 009-jit-compiler-strategy`
3. **Open pull request**: Include validation screenshots from Storybook
4. **Review checklist**: Ensure constitutional compliance documented
5. **Merge to main**: After review approval

---

## References

- Feature Spec: `specs/009-jit-compiler-strategy/spec.md`
- Implementation Plan: `specs/009-jit-compiler-strategy/plan.md`
- Data Model: `specs/009-jit-compiler-strategy/data-model.md`
- Contracts: `specs/009-jit-compiler-strategy/contracts/`
- Constitution: `.specify/memory/constitution.md`

---

**Quickstart Complete**: Follow scenarios in order for comprehensive validation. Each scenario maps to acceptance criteria from feature spec.
