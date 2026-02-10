# EMOM (Every Minute On the Minute)

**Pattern**: `SessionRoot > [WaitingToStart, EMOM(N × interval-timer) > Exercises]`

**Workouts**: Chelsea (30 @ :60 EMOM), EMOM Lifting (15 @ :60 EMOM), ABC (20 @ 1:00 EMOM)

**Characteristics**: Fixed-round loop with per-interval countdown timer. Timer is primary (drives round boundaries). Exercises complete within the interval, then reset for next round.

---

## Behavior Stack

### Block: SessionRoot (renamed from WorkoutRoot — this is the section container)
- `SegmentOutputBehavior` (mount: emit section label, unmount: close with total time)
- `HistoryRecordBehavior` (unmount: emit history:record event)
- `ChildRunnerBehavior` (mount: push WaitingToStart, then push EMOM on first next(), then mark complete and pop on final next())

### Block: WaitingToStart (pre-workout idle block)
- `SegmentOutputBehavior` (mount: emit "Ready to Start" message)
- `PopOnNextBehavior` (user clicks next → pop, trigger root to push EMOM block)

### Block: EMOM (parent with bounded round state + interval timer)
- `TimerInitBehavior` (down, primary — countdown from :60 per interval)
- `TimerTickBehavior` (listen to tick events)
- `TimerCompletionBehavior` (onTick: if interval elapsed, markComplete for this interval)
- `RoundInitBehavior` (mount: initialize `round={current:1, total:30}`)
- `RoundAdvanceBehavior` (onNext: if all children executed, `round.current += 1`)
- `RoundCompletionBehavior` (onNext: if `round.current > round.total`, pop)
- `ChildLoopBehavior` (onNext: if all executed && rounds remain && timer allows, reset `childIndex=0`)
- `ChildRunnerBehavior` (onNext: if children remain, push next child)

### Block: Exercise (leaf effort block, same as for-time-single)
- `SegmentOutputBehavior` (mount: emit effort/reps, unmount: completion)
- `PopOnNextBehavior` (user advance → pop)

---

## State Variables

| Variable | Type | Owner | Lifecycle |
|----------|------|-------|-----------|
| `timer` (primary) | `TimerState: { elapsed, durationMs:60000 or 1000, direction:'down' }` | EMOM | Starts on mount, resets after interval complete, repeats for each round |
| `round.current` | `1 → 2 → 3 → ... → 30` | EMOM | Increments on `→next` when all children executed, bounded by total |
| `round.total` | `30` or `20` (constant) | EMOM | Set at mount |
| `childIndex` | `0 → 1 → 2 → 3 → 0 → 1 → ...` | EMOM | Cycles through exercises, resets each round |

---

## Chelsea — `(30) :60 EMOM / 5 Pullups / 10 Pushups / 15 Air Squats`

**Blocks**: `SessionRoot > [WaitingToStart, EMOM(30×:60) > [Pullups, Pushups, Squats]]`

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | SessionRoot | 0 | `segment` | label: "Chelsea" | Root.childIndex: 0→1, push WaitingToStart | ✅ |
| 2 | mount | WaitingToStart | 1 | `segment` | label: "Ready to Start" | _(idle until user clicks next)_ | ✅ |
| 3 | next | WaitingToStart | 1 | — | _(user clicks next)_ | PopOnNext → pop WaitingToStart | ✅ |
| 4 | unmount | WaitingToStart | 1 | `completion` | label: "Ready to Start", timeSpan: closed | | ✅ |
| →5 | →next | SessionRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 1→2, push EMOM | ✅ |
| 6 | mount | EMOM(30×:60) | 1 | `segment` | timer: :60 countdown, rounds: 1/30 | round={1,30}, timer starts @:60, childIndex: 0→1, push Pullups | ✅ |
| 7 | mount | Pullups | 2 | `segment` | effort: "Pullups", reps: 5 | _(leaf)_ | ✅ |
| 8 | unmount | Pullups | 2 | `completion` | effort: "Pullups", timeSpan: closed | | ✅ |
| →9 | →next | EMOM(30×:60) | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 1→2, push Pushups | ✅ |
| 10 | mount | Pushups | 2 | `segment` | effort: "Pushups", reps: 10 | _(leaf)_ | ✅ |
| 11 | unmount | Pushups | 2 | `completion` | effort: "Pushups", timeSpan: closed | | ✅ |
| →12 | →next | EMOM(30×:60) | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 2→3, push Squats | ✅ |
| 13 | mount | Squats | 2 | `segment` | effort: "Air Squats", reps: 15 | _(leaf)_ | ✅ |
| 14 | unmount | Squats | 2 | `completion` | effort: "Air Squats", timeSpan: closed | | ✅ |
| →15 | →next | EMOM(30×:60) | 1 | `milestone` | rounds: 2/30 | RoundAdv: round 1→2. ChildLoop: reset childIndex=0. ChildRunner: childIndex 0→1, push Pullups | ✅ |
| 16 | tick | EMOM(30×:60) | 1 | `milestone` | sound: interval-beep | TimerCompl: interval :60 elapsed, timer resets for round 2 | ✅ |
| _(user continues round 2 exercises while new :60 timer starts)_ | | | | | | | |
| ...repeat interval... | | | | | | | |
| →N | →next | EMOM(30×:60) | 1 | — | _(after round 30, last child)_ | RoundAdv: round 30→31. RoundCompl: 31>30 → markComplete, pop EMOM | ✅ |
| N+1 | unmount | EMOM(30×:60) | 1 | `completion` | rounds: 30/30, timer: final | | ✅ |
| →N+2 | →next | SessionRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 2 >= 2 → no more children, markComplete → pop SessionRoot | ✅ |
| N+3 | unmount | SessionRoot | 0 | `completion` | label: "Chelsea", timeSpan: total | history:record event, **session ends** | ✅ |

**Total expected outputs**: ~8 per round × 30 + root overhead

---

## Key Patterns

✅ **Session lifecycle:** SessionRoot → WaitingToStart → EMOM → Session ends  
✅ WaitingToStart block idles until user clicks next (gate before workout begins)  
✅ EMOM emits `segment` on mount with interval timer info  
✅ EMOM emits `milestone` on each round advance (round 2, 3, ... 30)  
✅ Interval beep fires on `tick` when `:60` (or interval) elapsed  
✅ Timer resets for each new round  
✅ `RoundCompletionBehavior` fires when `round.current > round.total`  
✅ Children reset (`childIndex=0`) on each round boundary  
✅ Once final round complete, EMOM pops  
✅ History records all 30 rounds completed  
✅ **RestBlockBehavior (NEW):** When child completes early, EMOM generates Rest block for remaining interval time  
   - Rest block countdown timer runs until interval expires  
   - Rest block auto-completes and pops back to EMOM  
   - EMOM's next `next()` call advances round and pushes next child  
✅ **Session termination:** When EMOM pops and childIndex ≥ children.length, SessionRoot marks complete and pops (session ends)

---

## Open Questions

- [ ] Does the interval timer reset automatically on round advance, or must user manually advance to trigger reset?
- [ ] If user doesn't complete exercises before interval expires, does the workout pause or auto-advance to next round?
- [ ] Should the interval-beep be a separate `milestone` or combined with the round-advance `milestone`?
