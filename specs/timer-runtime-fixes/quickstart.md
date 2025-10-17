# Quickstart: Timer Runtime Coordination Fixes

**Purpose**: Step-by-step validation that timer and multi-round workouts execute correctly  
**Time**: 10-15 minutes  
**Prerequisites**: Node.js 18+, npm installed, wod-wiki repository cloned

---

## Setup

```bash
# 1. Navigate to repository
cd x:/wod-wiki

# 2. Install dependencies (if not already)
npm install

# 3. Build the project
npm run build

# 4. Start Storybook for interactive testing
npm run storybook
```

**Expected**: Storybook starts on `http://localhost:6006`

---

## Test Scenario 1: Fran Workout (Multi-Round)

**Goal**: Verify round looping with rep scheme works

### Steps

1. Open Storybook → Navigate to **Runtime** → **CrossFit** → **Fran**
2. Observe initial state:
   - Timer shows 0:00 (count-up)
   - Stack shows: `RoundsBlock (21-15-9)`
   - Memory shows: `currentRound: 1, reps: 21`
3. Click **Next** button
   - First exercise: "Thrusters" with 21 reps appears
4. Click **Next** button again
   - Second exercise: "Pullups" with 21 reps appears
5. Click **Next** button again
   - **KEY VALIDATION**: Round 2 should start
   - "Thrusters" appears again with **15 reps** (not 21)
   - Memory shows: `currentRound: 2, reps: 15`
6. Continue clicking **Next** until workout completes
   - Round 2: Thrusters (15), Pullups (15)
   - Round 3: Thrusters (9), Pullups (9)
7. After 6 total exercises, workout should complete
   - Event log shows: `rounds:complete`
   - Stack is empty
   - Timer stops

### Expected Outcomes

✅ **Round 1**: Thrusters 21, Pullups 21  
✅ **Round 2**: Thrusters 15, Pullups 15  
✅ **Round 3**: Thrusters 9, Pullups 9  
✅ **Total**: 6 exercises, 3 rounds complete  
✅ **Memory**: Rep counts inherited correctly  
✅ **Completion**: Workout stops after round 3

### Validation Checklist

- [ ] All 3 rounds execute
- [ ] Rep counts decrease (21 → 15 → 9)
- [ ] Children loop back to first exercise each round
- [ ] Memory shows correct currentRound
- [ ] Workout completes after round 3
- [ ] No "Next" click does nothing (stopped state)

---

## Test Scenario 2: AMRAP Workout (Timed Rounds)

**Goal**: Verify timer countdown stops round looping

### Steps

1. Open Storybook → Navigate to **Runtime** → **Timer Workouts** → **AMRAP**
2. Observe workout: `(21-15-9) 20:00 AMRAP Thrusters, Pullups`
3. Initial state:
   - Timer shows 20:00 (countdown)
   - Stack shows: `TimerBlock → RoundsBlock`
   - Memory shows: `currentRound: 1, reps: 21, isRunning: true`
4. Click **Next** rapidly to complete rounds quickly
   - Round 1: Thrusters (21), Pullups (21) - Timer at ~19:00
   - Round 2: Thrusters (15), Pullups (15) - Timer at ~18:00
   - Round 3: Thrusters (9), Pullups (9) - Timer at ~17:00
   - **KEY**: Rounds loop back to Round 1 (rep scheme repeats)
5. Continue until timer reaches 0:00
6. When timer expires:
   - Event log shows: `timer:complete`
   - Workout stops immediately (even if mid-exercise)
   - Memory shows: `isRunning: false`

### Expected Outcomes

✅ **Timer**: Counts down from 20:00 to 0:00  
✅ **Rounds**: Loop (21→15→9→21→15→9...) until timer stops  
✅ **Completion**: Timer expiry stops workout  
✅ **No Manual Stop**: User doesn't need to click anything when timer expires

### Validation Checklist

- [ ] Timer counts down continuously
- [ ] Rounds loop indefinitely (more than 3 rounds)
- [ ] Rep scheme repeats (21→15→9→21→15→9...)
- [ ] Workout stops when timer reaches 0:00
- [ ] Completion is automatic (no manual intervention)
- [ ] Final round count shows how many rounds completed

---

## Test Scenario 3: For Time Workout (Timer + Children)

**Goal**: Verify count-up timer stops when children complete

### Steps

1. Open Storybook → Navigate to **Runtime** → **Timer Workouts** → **For Time**
2. Observe workout: `20:00 For Time: 100 Squats`
3. Initial state:
   - Timer shows 0:00 (count-up)
   - Time cap: 20:00 (timer will stop at 20:00 if not finished)
   - Stack shows: `TimerBlock → EffortBlock (Squats)`
4. Click **Next** to complete squats
5. Workout completes immediately:
   - Timer stops (e.g., at 5:32)
   - Event log shows: `timer:stopped`, `workout:complete`
   - Memory shows: `isRunning: false`

### Expected Outcomes

✅ **Timer**: Counts up from 0:00  
✅ **Children Complete**: Stops timer at completion time  
✅ **Time Cap**: If 20:00 reached, workout stops (time cap)  
✅ **First-Completes-Wins**: Children OR time cap, whichever first

### Validation Checklist

- [ ] Timer counts up from 0:00
- [ ] Timer stops when exercise completes
- [ ] Final time shows actual completion time
- [ ] If time cap reached first, workout stops at 20:00
- [ ] Completion is automatic

---

## Test Scenario 4: Auto-Start (No Manual Click)

**Goal**: Verify workouts start automatically without clicking "Next"

### Steps

1. Open any workout story (Fran, AMRAP, For Time)
2. Observe **immediately upon load**:
   - First exercise should appear automatically
   - Timer should start automatically
   - No manual "Next" click needed to begin
3. Stack visualization shows:
   - Parent block (RoundsBlock or TimerBlock)
   - First child block already pushed

### Expected Outcomes

✅ **Auto-Start**: First exercise appears without user action  
✅ **Timer Starts**: Timer begins counting immediately  
✅ **No Extra Click**: User doesn't click "Next" to begin

### Validation Checklist

- [ ] First exercise visible on load
- [ ] Timer running immediately
- [ ] Stack shows first child already pushed
- [ ] No "idle" state requiring manual start

---

## Test Scenario 5: Performance Benchmarks

**Goal**: Verify lifecycle methods meet performance targets

### Steps

1. Open browser DevTools → Console
2. Run performance test in Storybook:
   - Navigate to **Runtime** → **Performance Tests**
3. Observe console output:
   - `LoopCoordinatorBehavior.onNext(): X.XXms` (should be < 10ms)
   - `RoundsBehavior.onPush(): X.XXms` (should be < 5ms)
   - `TimerBlock.mount(): X.XXms` (should be < 50ms)
4. Complete a full Fran workout
5. Check total execution time:
   - 6 exercises × ~10ms per transition = ~60ms total overhead
   - Should feel instantaneous (no lag)

### Expected Outcomes

✅ **onPush()**: < 5ms  
✅ **onNext()**: < 10ms  
✅ **onPop()**: < 5ms  
✅ **dispose()**: < 1ms  
✅ **Total Feel**: Instant response, no perceived lag

### Validation Checklist

- [ ] All lifecycle methods under targets
- [ ] No visual lag when clicking "Next"
- [ ] Smooth transitions between exercises
- [ ] Memory allocation stable (no leaks)

---

## Troubleshooting

### Problem: Rounds Don't Loop

**Symptom**: After round 1, workout stops instead of continuing

**Check**:
- Is `LoopCoordinatorBehavior` attached to RoundsBlock?
- Console shows: `ChildAdvancementBehavior not found`?

**Fix**: Verify `LoopCoordinatorBehavior` is in behaviors array

---

### Problem: Rep Counts Don't Inherit

**Symptom**: All exercises show same reps (e.g., 21 for all rounds)

**Check**:
- Is `CompilationContext` being passed to `jit.compile()`?
- Console shows: `No inheritedMetrics in context`?

**Fix**: Verify `RoundsBehavior.onPush()` passes context with reps

---

### Problem: Timer Doesn't Stop When Children Complete

**Symptom**: Timer keeps running after exercises finish

**Check**:
- Is `CompletionBehavior` checking child completion?
- Timer completion logic includes `childrenDone` check?

**Fix**: Verify `shouldCompleteWithChildren()` logic in TimerBlock

---

### Problem: Workout Doesn't Auto-Start

**Symptom**: Nothing appears until "Next" clicked

**Check**:
- Does `RoundsBehavior.onPush()` return `PushBlockAction`?
- Is first child being compiled and pushed?

**Fix**: Verify auto-start logic in `onPush()` methods

---

## Success Criteria

All 5 test scenarios must pass:
- [x] Scenario 1: Fran (multi-round) executes 3 rounds
- [x] Scenario 2: AMRAP loops rounds until timer expires
- [x] Scenario 3: For Time stops timer when children complete
- [x] Scenario 4: Workouts auto-start without manual click
- [x] Scenario 5: Performance targets met (<50ms lifecycle)

---

## Next Steps

If all scenarios pass:
1. Run full test suite: `npm test`
2. Run integration tests: `npm run test:integration`
3. Check test coverage: `npm run test:coverage`
4. Commit changes and create pull request

If any scenario fails:
1. Check console for error messages
2. Review behavior coordination logic
3. Verify contract compliance
4. Re-run failing scenario with debugging

---

**Estimated Time**: 10-15 minutes for all scenarios

**Support**: See `docs/timer-runtime-alignment-analysis.md` for detailed architecture

---

**Status**: ✅ READY FOR VALIDATION - Quickstart complete, ready for implementation testing
