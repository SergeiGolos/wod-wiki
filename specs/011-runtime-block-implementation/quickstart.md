# Quickstart: Runtime Block Implementation

**Feature**: Runtime Block Implementation with TimerBlock, RoundsBlock, and EffortBlock  
**Date**: 2025-10-08  
**Estimated Time**: 15 minutes

This quickstart validates the core functionality of the runtime block system through executable examples in Storybook.

---

## Prerequisites

```bash
# Ensure dependencies installed
npm install

# Verify tests pass (baseline)
npm run test:unit
```

**Expected baseline**: 45 passed, 1 failed, 4 module errors (known issues)

---

## Step 1: Verify TimerBlock - Count Up (3 minutes)

### Open Storybook
```bash
npm run storybook
```

Navigate to: **Runtime > TimerBlock > Count Up**

### Validate
1. ✅ Timer starts at 0:00.0
2. ✅ Timer increments every 0.1 seconds
3. ✅ Click "Pause" - timer stops incrementing
4. ✅ Click "Resume" - timer continues from paused value
5. ✅ Click "Stop" - timer records final time
6. ✅ Click "Reset" - timer returns to 0:00.0

### Expected Output
```
Timer: 0:00.0 → 0:00.1 → 0:00.2 → ... (incrementing)
[Pause] Timer: 0:05.3 (frozen)
[Resume] Timer: 0:05.4 → 0:05.5 → ... (continues)
[Stop] Final Time: 0:12.7
```

---

## Step 2: Verify TimerBlock - Countdown (3 minutes)

Navigate to: **Runtime > TimerBlock > Countdown**

### Validate
1. ✅ Timer starts at configured duration (e.g., 20:00.0 for 20 minutes)
2. ✅ Timer decrements every 0.1 seconds
3. ✅ Timer reaches 0:00.0 and emits completion event
4. ✅ Pause/Resume work correctly
5. ✅ UI shows "Time Expired" when countdown completes

### Expected Output
```
Timer: 20:00.0 → 19:59.9 → 19:59.8 → ... (decrementing)
[When reaches zero]
Timer: 0:00.0
Status: ⏰ Time Expired
```

---

## Step 3: Verify RoundsBlock - Fixed Rounds (3 minutes)

Navigate to: **Runtime > RoundsBlock > Fixed Rounds (3 Rounds)**

### Validate
1. ✅ Display shows "Round 1 of 3"
2. ✅ Complete exercises in round 1
3. ✅ Display automatically advances to "Round 2 of 3"
4. ✅ Complete all 3 rounds
5. ✅ Display shows "All Rounds Complete"

### Expected Output
```
Round 1 of 3
- Pullups: 0/20 [Complete] → "Round 2 of 3"
Round 2 of 3  
- Pullups: 0/20 [Complete] → "Round 3 of 3"
Round 3 of 3
- Pullups: 0/20 [Complete] → "All Rounds Complete ✅"
```

---

## Step 4: Verify RoundsBlock - Variable Reps (3 minutes)

Navigate to: **Runtime > RoundsBlock > Variable Reps (21-15-9)**

### Validate
1. ✅ Round 1 shows target: 21 reps
2. ✅ Complete round 1 exercises
3. ✅ Round 2 shows target: 15 reps (auto-adjusted)
4. ✅ Complete round 2 exercises
5. ✅ Round 3 shows target: 9 reps (auto-adjusted)
6. ✅ Complete round 3 - workout done

### Expected Output
```
Round 1 of 3
- Thrusters: 0/21 [Complete]
- Pullups: 0/21 [Complete] → "Round 2 of 3"

Round 2 of 3
- Thrusters: 0/15 [Complete]  ← Note: 15, not 21
- Pullups: 0/15 [Complete] → "Round 3 of 3"

Round 3 of 3
- Thrusters: 0/9 [Complete]   ← Note: 9, not 15
- Pullups: 0/9 [Complete] → "Workout Complete ✅"
```

---

## Step 5: Verify EffortBlock - Hybrid Rep Tracking (3 minutes)

Navigate to: **Runtime > EffortBlock > Rep Tracking**

### Validate Incremental Mode
1. ✅ Click "+1 Rep" button 5 times
2. ✅ Display shows "5/21"
3. ✅ Each click increments by 1

### Validate Bulk Entry Mode
4. ✅ Enter "21" in input field
5. ✅ Click "Set Reps"
6. ✅ Display shows "21/21"
7. ✅ Exercise marks as complete

### Validate Mode Switching
8. ✅ Start new exercise
9. ✅ Click "+1 Rep" 3 times (shows "3/21")
10. ✅ Enter "10" and click "Set Reps"
11. ✅ Display shows "10/21" (overwrites previous)
12. ✅ Click "+1 Rep" again (shows "11/21")

### Expected Output
```
Incremental:
Thrusters: 0/21
[+1 Rep] → 1/21
[+1 Rep] → 2/21
...

Bulk:
[Input: 21] [Set Reps] → 21/21 ✅ Complete

Switching:
Pullups: 0/21
[+1 Rep] → 1/21
[+1 Rep] → 2/21
[+1 Rep] → 3/21
[Input: 10] [Set Reps] → 10/21
[+1 Rep] → 11/21
```

---

## Step 6: Validate Complete Workout - Fran (3 minutes)

Navigate to: **Workouts > Fran** (21-15-9 of Thrusters and Pullups, For Time)

### Validate Full Execution Flow
1. ✅ Click "Start Workout"
2. ✅ Timer counts UP from 0:00.0
3. ✅ Round 1: Thrusters target is 21
4. ✅ Complete 21 Thrusters (use bulk entry for speed)
5. ✅ Automatically advances to Pullups
6. ✅ Round 1: Pullups target is 21
7. ✅ Complete 21 Pullups
8. ✅ Automatically advances to Round 2
9. ✅ Round 2: Both exercises show target 15
10. ✅ Complete round 2
11. ✅ Round 3: Both exercises show target 9
12. ✅ Complete round 3
13. ✅ Timer stops automatically
14. ✅ Display shows final time (e.g., "3:45.2")

### Expected Output
```
[Start] Timer: 0:00.0 (counting up)

Round 1 of 3
- Thrusters: [bulk: 21] → 21/21 ✅
- Pullups: [bulk: 21] → 21/21 ✅

Round 2 of 3
- Thrusters: [bulk: 15] → 15/15 ✅
- Pullups: [bulk: 15] → 15/15 ✅

Round 3 of 3
- Thrusters: [bulk: 9] → 9/9 ✅
- Pullups: [bulk: 9] → 9/9 ✅

🎉 Workout Complete!
Final Time: 3:45.2
```

---

## Step 7: Validate Pause/Resume State Management (Bonus)

Using any workout story:

### Validate
1. ✅ Start workout
2. ✅ Complete partial work (e.g., 5 reps into an exercise)
3. ✅ Click "Pause"
4. ✅ Timer stops, rep count preserved
5. ✅ Wait 10 seconds (real time)
6. ✅ Click "Resume"
7. ✅ Timer continues from paused value
8. ✅ Rep count still shows 5
9. ✅ Continue workout normally

### Expected Behavior
```
[Start] Timer: 0:00.0
[Work] Timer: 0:15.3, Thrusters: 5/21
[Pause] Timer: 0:15.3 (frozen), Thrusters: 5/21 (preserved)
[Wait 10 seconds...]
[Resume] Timer: 0:15.4 → 0:15.5 → ... (continues)
         Thrusters: 5/21 (unchanged)
```

---

## Step 8: Validate Abandon Behavior (Bonus)

Using any workout story:

### Validate
1. ✅ Start workout
2. ✅ Complete partial work
3. ✅ Click "Abandon"
4. ✅ Confirm dialog appears
5. ✅ Confirm abandonment
6. ✅ Workout state cleared
7. ✅ No final time recorded
8. ✅ UI returns to initial state

### Expected Behavior
```
[Start] Timer: 0:23.7, Round 2, Pullups: 8/15
[Abandon] → Confirmation dialog
[Confirm] → Workout cleared
          Timer: -- : --
          No results recorded
          Ready to start new workout
```

---

## Validation Checklist

### Core Functionality
- [ ] Count-up timer works correctly
- [ ] Countdown timer works correctly
- [ ] Fixed rounds advance properly
- [ ] Variable rep schemes apply correct targets
- [ ] Incremental rep tracking works
- [ ] Bulk rep entry works
- [ ] Mode switching works
- [ ] Complete workout (Fran) executes correctly

### State Management
- [ ] Pause preserves timer and rep state
- [ ] Resume continues from correct state
- [ ] Abandon clears all state
- [ ] No persistence across browser refresh

### UI/Display
- [ ] Timer displays with 0.1s precision
- [ ] Round numbers display correctly (1-indexed)
- [ ] Rep counts display correctly
- [ ] Completion states display correctly

### Performance
- [ ] Timer ticks smoothly (no visible lag)
- [ ] UI remains responsive during workout
- [ ] No console errors
- [ ] No memory warnings in dev tools

---

## Success Criteria

✅ **PASS**: All validation checkboxes checked  
✅ **PASS**: All 7 example workouts have working stories  
✅ **PASS**: No TypeScript errors in new code  
✅ **PASS**: Unit tests pass with no new failures  

❌ **FAIL**: Any validation step fails  
❌ **FAIL**: Console shows errors during workout execution  
❌ **FAIL**: Timer drift > 1 second over 10 minutes  
❌ **FAIL**: Memory leak detected (heap grows continuously)  

---

## Troubleshooting

### Timer not updating
- Check browser console for errors
- Verify setInterval is being called (add breakpoint in TimerBehavior.tick())
- Check if dispose() was called prematurely

### Reps not incrementing
- Verify EffortBlock event handlers are registered
- Check if event is being emitted (add console.log in incrementRep())
- Ensure UI is subscribed to 'reps:updated' event

### Rounds not advancing
- Verify RoundsBehavior.onNext() is called when exercises complete
- Check if all children are marked complete before advancing
- Add logging to rounds:changed event handler

### Storybook won't start
- Run `npm install` to ensure dependencies current
- Check for port 6006 conflicts
- Try `npm run build-storybook` to identify build issues

---

## Next Steps

After completing quickstart:
1. Run full unit test suite: `npm run test:unit`
2. Run integration tests: `npm run test:integration`
3. Build Storybook: `npm run build-storybook`
4. Review performance in Chrome DevTools (Performance tab)

---

**Estimated Total Time**: 15-20 minutes  
**Status**: Ready for execution ✅
