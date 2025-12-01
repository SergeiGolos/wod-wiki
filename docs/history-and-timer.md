# History and Timer Display Specification

This document describes the desired behavior for the workout history timeline (left panel) and timer display (right panel).

---

## Current Screen Layout

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  WOD:WIKI++    TRACK                                          🎲  +  📝 Plan  ⏱ Track  │
├────────────────────────────────────────┬────────────────────────────────────────────────┤
│                                        │                                                │
│  11:42:48 PM ──── WORKOUT STARTED ──── │                                                │
│                                        │                                                │
│    11:42:48 PM   [▶] 3  21  15  9   4s │                                                │
│    11:42:48 PM   🏃 Thrusters 💪 95 lb  1s │                                                │
│                                        │                                                │
│  11:42:48 PM ──────── ROUND 1 ──────── │            Workout Timer                       │
│                                        │                                                │
│    11:42:49 PM   🏃 Pullups            1s │         00:00.00                             │
│    11:42:50 PM   🏃 Thrusters 💪 95 lb  0s │                                                │
│    11:42:51 PM   🏃 Pullups            0s │         Round 1 / 1                           │
│    11:42:52 PM   🏃 Thrusters 💪 95 lb  0s │                                                │
│                                        │   ┌─────────────────────────────────────────┐  │
│  11:42:52 PM ──────── ROUND 3 ──────── │   │  ●    ▶ For Time   Workout Timer   Next ▷│  │
│                                        │   └─────────────────────────────────────────┘  │
│    11:42:52 PM   🏃 Pullups            0s │                                                │
│    11:42:53 PM   🏃 Thrusters 💪 95 lb  0s │                                                │
│    11:42:53 PM   🏃 Pullups            0s │                                                │
│                                        │                                                │
├────────────────────────────────────────┴────────────────────────────────────────────────┤
│  HISTORY TIMELINE                      │  TIMER DISPLAY                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## History Timeline (Left Panel)

### Current Behavior
<!-- Describe what currently happens -->

- Shows timestamps for each event
- Groups events by rounds
- Displays exercise names with icons
- Shows duration for each item (e.g., "4s", "1s", "0s")

### Desired Behavior
<!-- Edit this section to describe what you want -->

- [ ] TODO: Describe desired timestamp format
- [ ] TODO: Describe desired grouping behavior
- [ ] TODO: Describe what information should show per exercise
- [ ] TODO: Describe round header format

### Event Types

| Event Type | Current Display | Desired Display |
|------------|-----------------|-----------------|
| Workout Started | `WORKOUT STARTED` | |
| Round Header | `ROUND 1`, `ROUND 3` | |
| Exercise | `🏃 Thrusters 💪 95 lb` | |
| Rep Scheme | `[▶] 3 21 15 9` | |

---

## Timer Display (Right Panel)

### Current Behavior
<!-- Describe what currently happens -->

- Shows "Workout Timer" label
- Large digital clock display: `00:00.00`
- Round counter: `Round 1 / 1`
- Bottom bar with: workout type indicator, timer name, Next button

### Desired Behavior
<!-- Edit this section to describe what you want -->

- [ ] TODO: Describe desired timer format
- [ ] TODO: Describe desired round display
- [ ] TODO: Describe what controls should be visible
- [ ] TODO: Describe any additional information to show

### Timer States

| State | Current Display | Desired Display |
|-------|-----------------|-----------------|
| Idle | `00:00.00` | |
| Running | Counting up | |
| Paused | Frozen time | |
| Completed | Final time | |

---

## Bottom Control Bar

### Current Layout
```
┌──────────────────────────────────────────────────────────────┐
│  ●    ▶ For Time    Workout Timer                    Next ▷  │
└──────────────────────────────────────────────────────────────┘
```

### Elements
1. **Status Indicator** (●) - Current state
2. **Workout Type** (▶ For Time) - Type of workout
3. **Timer Label** (Workout Timer) - Current timer name
4. **Next Button** (Next ▷) - Advance to next exercise

### Desired Behavior
<!-- Edit this section to describe what you want -->

- [ ] TODO: Describe status indicator states
- [ ] TODO: Describe what info should show in the bar
- [ ] TODO: Describe Next button behavior

---

## Questions to Answer

1. **Timer Precision**: Should the timer show centiseconds (00:00.00) or just seconds (00:00)?

2. **Round Display**: The screenshot shows "Round 1 / 1" but history shows "ROUND 1" and "ROUND 3" - is round 2 missing? What's the expected behavior?

3. **Duration Column**: The "4s", "1s", "0s" values in history - what do these represent?
   - Time spent on that exercise?
   - Time since last event?
   - Something else?

4. **Exercise Completion**: How should completed exercises be visually distinguished from current/upcoming?

5. **Scrolling**: Should history auto-scroll to keep current exercise visible?

---

## Notes

<!-- Add any additional notes or context here -->

