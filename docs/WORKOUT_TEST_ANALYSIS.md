# Workout Test Failure Analysis

This document analyzes the failing tests in `tests/workouts/` and identifies the root causes and required solutions for each workout type.

## Executive Summary

The workout tests are failing for several categories of reasons:

1. **Strategy Matching Issues** - Strategies don't match expected syntax patterns
2. **Block Compilation Failures** - Missing BlockContext or strategy not setting required fields  
3. **Child Block Sequencing** - Children not being pushed in expected order
4. **Label/Naming Mismatches** - Parser output labels differ from expected test strings
5. **Rep Tracking Gaps** - WorkoutTestHarness doesn't extract reps from actual fragments
6. **Completion Detection** - Stack empties unexpectedly or blocks don't complete when expected

---

## Test File: `emom.test.ts`

### Failure Pattern
```
error: BlockContext is required
error: Failed to compile root statement
```

### Root Cause
The `IntervalLogicStrategy` is not matching the EMOM syntax `(20) :60` because:
1. The syntax `(20)` is parsed as a `Rounds` fragment, not an EMOM indicator
2. The `:60` is parsed as a Timer, but without the `EMOM` keyword, `IntervalLogicStrategy.match()` returns `false`
3. No strategy sets the required `BlockContext` on the builder

### Affected Tests
- All 5 tests fail with compilation errors

### Required Solution
**Type: Strategy Enhancement**

1. Update `IntervalLogicStrategy.match()` to recognize `(rounds) :timer` pattern as EMOM
2. OR create a new strategy that handles this syntax pattern
3. Ensure the matching strategy sets `BlockContext` via `builder.setContext()`

---

## Test File: `chelsea.test.ts`

### Failure Pattern
```
Expected to contain: "Pushups"
Received: "+ 5 Pullups"

error: Cannot call next() - stack is empty
```

### Root Cause
1. **Wrong block on top**: After `next()` is called, the child block remains unchanged instead of advancing to the next sibling
2. **Stack empties prematurely**: The EMOM block completes and pops itself too early, leaving an empty stack

### Analysis
The `IntervalLogicStrategy` compiles an EMOM block, but:
- `ChildRunnerBehavior` doesn't cycle through children correctly
- The `BoundLoopBehavior` doesn't wait for timer boundaries before allowing round advancement
- `IntervalWaitingBehavior` may not be integrated with child cycling

### Affected Tests
- 2 pass, 3 fail
- Passing: `mount` and `first child` tests
- Failing: child advancement and round completion tests

### Required Solution
**Type: Behavior Integration**

1. Modify `ChildRunnerBehavior.onNext()` to advance `ChildIndexBehavior` BEFORE pushing next child
2. Ensure `IntervalWaitingBehavior` blocks `next()` until timer expires
3. Add `ChildIndexBehavior.incrementIndex()` call when child is popped

---

## Test File: `cindy.test.ts`

### Failure Pattern
Tests hang/timeout during execution

### Root Cause
Similar to Chelsea - AMRAP blocks compile but:
1. Child cycling may create infinite loops
2. `UnboundLoopBehavior` never triggers completion
3. Timer expiration doesn't automatically pop the AMRAP block

### Affected Tests
- Tests timeout rather than fail with assertion errors

### Required Solution
**Type: Timer Completion Behavior**

1. Add `CompletionBehavior` that checks `BoundTimerBehavior.isComplete()` on every `next()` call
2. Ensure timer expiration emits `timer:complete` event
3. Register event handler that pops AMRAP block when timer completes

---

## Test File: `fran.test.ts`

### Failure Pattern
```
Expected: true (isComplete)
Received: false

Expected: 45 (totalReps)
Received: undefined
```

### Root Cause
1. **Completion not detected**: After all rounds, the rep scheme block doesn't pop itself
2. **Rep tracking missing**: `WorkoutTestHarness._trackExerciseCompletion()` doesn't parse the label correctly for "Thrusters 95lb"

### Analysis
- `GenericLoopStrategy` handles `(21-15-9)` syntax and creates `RepSchemeBehavior`
- But `BoundLoopBehavior` may not be checking the correct round count
- The label "Thrusters 95lb" doesn't match the regex in `_trackExerciseCompletion()`

### Affected Tests
- 4 pass, 2 fail
- Passing: mount, first round, round advancement tests
- Failing: completion and rep tracking tests

### Required Solution
**Type: Multi-Part Fix**

1. **BoundLoopBehavior**: Ensure it returns `PopBlockAction` when `currentRound > totalRounds`
2. **WorkoutTestHarness**: Improve label parsing regex to handle "Exercise Weight" patterns
3. **RepSchemeBehavior**: Verify it updates the child rep count for each round

---

## Test File: `annie.test.ts`

### Failure Pattern
```
Expected to contain: "Double-Unders"
Received: "Double Unders"

Expected: 150 (totalReps)
Received: undefined
```

### Root Cause
1. **Label mismatch**: Parser strips hyphens from exercise names ("Double-Unders" → "Double Unders")
2. **Rep tracking**: Same issue as Fran - harness doesn't match exercise names correctly

### Affected Tests
- All 6 tests fail

### Required Solution
**Type: Test Adjustment + Harness Enhancement**

1. Update test expectations to match actual parser output (use "Double Unders" not "Double-Unders")
2. OR update parser to preserve hyphens in exercise names
3. Improve harness rep tracking to use normalized exercise names

---

## Test File: `barbara.test.ts`

### Failure Pattern
```
Expected to contain: "Pushups"
Received: "Countdown"

Expected to contain: "Rest"
Received: "+ 20 Pullups"

error: Cannot call next() - stack is empty
```

### Root Cause
1. **Countdown timer injected**: `GenericTimerStrategy` creates a "Countdown" timer block that wraps or precedes exercise blocks
2. **Rest block not found**: The "3:00 Rest" child is parsed as a Timer, not a labeled "Rest" block
3. **Round structure mismatch**: Barbara has 4 exercises + 1 rest per round, but the runtime cycles through children differently

### Analysis
The workout syntax:
```
(5)
  + 20 Pullups
  + 30 Pushups
  + 40 Situps
  + 50 Air Squats
  3:00 Rest
```

Creates a rounds block with 5 children, but:
- `GenericTimerStrategy` may be wrapping the `3:00 Rest` in a "Countdown" block
- Or the first child pushed is a Countdown pre-amble timer

### Affected Tests
- 2 pass, 6 fail
- Passing: mount and first child tests
- Failing: all exercise sequencing and rest timer tests

### Required Solution
**Type: Child Compilation Fix**

1. Investigate why "Countdown" is the first child instead of "Pullups"
2. Ensure `ChildrenStrategy` respects the source order of children
3. Verify `3:00 Rest` compiles to a block with "Rest" in the label

---

## Test File: `grace.test.ts`

### Failure Pattern
```
Expected to contain: "Clean & Jerk"
Received: "30 Clean Jerk 135 lb"

Expected: 30 (totalReps)
Received: undefined
```

### Root Cause
1. **Label format**: Parser outputs "30 Clean Jerk 135 lb" instead of preserving "Clean & Jerk"
2. **Ampersand handling**: The `&` character is stripped or parsed as a separator
3. **Rep tracking**: Harness doesn't extract the "30" rep count from the label

### Affected Tests
- 4 pass, 2 fail

### Required Solution
**Type: Parser + Harness Enhancement**

1. Update parser to preserve `&` in exercise names, OR
2. Update test expectations to match actual output
3. Enhance harness to extract rep count from block label pattern `{reps} {exercise} {weight}`

---

## Test File: `simple-sinister.test.ts`

### Failure Pattern
```
Expected to contain: "KB Swings"
Received: "Countdown"

error: Received value must be an array type

Expected: 100 (totalReps)
Received: undefined
```

### Root Cause
1. **Sequential blocks**: The script has 3 top-level statements, but `mount()` only compiles the first
2. **Timer wrapping**: `GenericTimerStrategy` creates a "Countdown" wrapper instead of preserving "KB Swings"
3. **currentBlock undefined**: After blocks pop, `currentBlock?.label` returns undefined

### Analysis
The workout syntax:
```
5:00 100 KB Swings 70lb
1:00 Rest
10:00 10 Turkish Getups 70lb
```

Should create 3 sequential blocks, but:
- `WorkoutTestHarness.mount()` only compiles `script.statements[0]`
- Each statement becomes independent blocks rather than a sequence

### Affected Tests
- All 7 tests fail

### Required Solution
**Type: Harness + Strategy Enhancement**

1. Update `WorkoutTestHarness.mount()` to compile all statements as a sequence
2. OR wrap multiple statements in a root "Group" block automatically
3. Ensure `GenericTimerStrategy` preserves exercise label when timer + effort are combined
4. Fix null-check in assertion that tries to call `.toContain()` on undefined

---

## Summary of Required Changes

### Category 1: Strategy Matching (High Priority)
| Issue | Location | Solution |
|-------|----------|----------|
| EMOM syntax `(20) :60` not matched | `IntervalLogicStrategy.match()` | Add pattern for rounds + timer without EMOM keyword |
| Timer blocks labeled "Countdown" | `GenericTimerStrategy.apply()` | Use exercise label when effort fragment exists |

### Category 2: Child Block Management (High Priority)
| Issue | Location | Solution |
|-------|----------|----------|
| Children don't advance correctly | `ChildRunnerBehavior.onNext()` | Increment child index before pushing next |
| Wrong child order | `ChildrenStrategy.apply()` | Preserve source order of children |
| Stack empties prematurely | `BoundLoopBehavior` | Only pop when `currentRound > totalRounds` |

### Category 3: Timer & Completion (Medium Priority)
| Issue | Location | Solution |
|-------|----------|----------|
| AMRAP doesn't auto-complete | `AmrapLogicStrategy` | Add timer expiration check in `CompletionBehavior` |
| Rest timer not detected | Parser or strategy | Ensure "Rest" label preserved |

### Category 4: Harness Enhancements (Medium Priority)
| Issue | Location | Solution |
|-------|----------|----------|
| Rep tracking fails | `WorkoutTestHarness._trackExerciseCompletion()` | Improve label parsing regex |
| Single statement mounting | `WorkoutTestHarness.mount()` | Support multi-statement scripts |

### Category 5: Parser/Label Issues (Low Priority)
| Issue | Location | Solution |
|-------|----------|----------|
| Hyphens stripped | Parser | Preserve hyphens in exercise names |
| Ampersand stripped | Parser | Preserve `&` in exercise names |
| Weight format | Parser | Standardize "95lb" vs "95 lb" output |

---

## Recommended Implementation Order

1. **Fix Strategy Matching** - Get blocks to compile correctly first
2. **Fix Child Management** - Ensure children cycle in correct order
3. **Fix Completion Detection** - Blocks should complete at right time
4. **Enhance Harness** - Improve test infrastructure for better assertions
5. **Parser Tweaks** - Normalize output format (can defer or adjust tests)

---

## Notes

- All tests are intentionally failing as part of TDD Red Phase
- The existing test suite (410 passing) is unaffected by these issues
- Some failures are test expectation issues (string matching), not runtime bugs
- Priority should be given to runtime behavior fixes over cosmetic label changes
