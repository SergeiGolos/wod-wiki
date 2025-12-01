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

```
├────────────────────────────────────────┬
│  11:42:48 PM ──── Initiated ──── ││                                              │  
│    11:42:48 PM  Ready    1s │
│                                        │
│  11:42:48 PM ──── WORKOUT STARTED ──── ││                                              │  
│    11:42:48 PM   [▶] 3  21  15  9         4s │ 

│  11:42:48 PM ──────── ROUND 1 ───────------─ │
│    11:42:48 PM  21x  🏃 Thrusters 💪 95 lb    1s │
│    11:42:49 PM  21x 🏃 Pullups               1s │

│  11:42:48 PM ──────── ROUND 2 ───────------─ │
│    11:42:50 PM  15x 🏃 Thrusters 💪 95 lb    0s │
│    11:42:51 PM  15x 🏃 Pullups               0s │

│  11:42:48 PM ──────── ROUND 3 ───────------─ │

│    11:42:52 PM  9x 🏃 Thrusters 💪 95 lb    0s │
│    11:42:53 PM  9x 🏃 Pullups                0s │ 
│  11:42:48 PM ──── WORKOUT Completed ────     │ 
│                                               │
├────────────────────────────────────────┴─
```



- [ ] TODO: Describe desired timestamp format
- [ ] TODO: Describe desired grouping behavior
- [ ] TODO: Describe what information should show per exercise
- [ ] TODO: Describe round header format

### Event Types

| Event Type      | Current Display         | Desired Display                                                                        |
| --------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| Workout Started | `WORKOUT STARTED`       |                                                                                        |
| Round Header    | `ROUND 1`, `ROUND 3`    | round head for each round that is processed.  if we know how mnay rounds should be x/n |
| Exercise        | `🏃 Thrusters 💪 95 lb` | with the inherited rep count from the parent group object.                             |
| Rep Scheme      | `[▶] 3 21 15 9`         |                                                                                        |
| Compelted Event |                         |                                                                                        |

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

| State             | Current Display | Desired Display |
| ----------------- | --------------- | --------------- |
| Idle              | `00:00.00`      |                 |
| Running           | Counting up     |                 |
| Paused            | Frozen time     |                 |
| Completed         | Final time      |                 |
| Current time Mode |                 |                 |
|                   |                 |                 |

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

- [ ] the timer label should be the metric values on the current runtime block there should be an array of values for each of the grouped statements if mulitiple are compiled by the git.
- [ ] idel timeers shoudl be able to build custom cards that define ther state and provide additional notes with addtional action buttons 
	- [ ] more the start workout reasonability to add and remove to the idley redy block
	- [ ] move the analytics reasonability to the copmlted idle block
	- [ ] next functionality should ne based on the individual block based on inherted or defined funcationlity of the `[:action]` syntax.
- [ ] the card should also have a small timer display for that block so that if a parent is using the primayr timer diplay tocountdown the total time, you can see how long the block has been active next to the card.

---

## Questions to Answer

1. **Timer Precision**: Should the timer show centiseconds (00:00.00) or just seconds (00:00)?  00.00.0 with the last number a bit smaller.

2. **Round Display**: The screenshot shows "Round 1 / 1" but history shows "ROUND 1" and "ROUND 3" - is round 2 missing? What's the expected behavior? no, as explained this is a  problem of reporting behaviors of to the logger and neeted to be fixed.

3. **Duration Column**: The "4s", "1s", "0s" values in history - what do these represent? the duration of the exercise
   - Time spent on that exercise?
   - Time since last event?
   - Something else?

1. **Exercise Completion**: How should completed exercises be visually distinguished from current/upcoming? the completed or stated sections should be listed in the history view, and follow the correct thje oreder of execution like a log.

2. **Scrolling**: Should history auto-scroll to keep current exercise visible?the current excerzie shodl be in the card under the timer.  like the view of the parsedview using the fragments, but with all the runtime metrics of that block applied.

---

## Notes

<!-- Add any additional notes or context here -->

