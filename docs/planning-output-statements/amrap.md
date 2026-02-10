# AMRAP (As Many Rounds As Possible)

**Pattern**: `WorkoutRoot > AMRAP(countdown-timer) > Exercises`

**Workouts**: Cindy (20:00 AMRAP with 5 Pullups / 10 Pushups / 15 Air Squats)

**Characteristics**: Timed loop with unbounded round count (no `round.total`). Loop continues while countdown timer is running. Once timer expires, block marks complete and pops.

---

## Behavior Stack

### Block: WorkoutRoot
- `SegmentOutputBehavior` (mount: emit label, unmount: close with total time)
- `HistoryRecordBehavior` (unmount: emit history:record event)
- `ChildRunnerBehavior` (push AMRAP, then idle)

### Block: AMRAP (parent with unbounded round state + countdown timer)
- `TimerInitBehavior` (down, primary — countdown from 20:00)
- `TimerTickBehavior` (listen to tick events)
- `TimerCompletionBehavior` (onTick: if `elapsed >= durationMs`, markComplete)
- `RoundInitBehavior` (mount: initialize `round={current:1, total:undefined}`)
- `RoundAdvanceBehavior` (onNext: if all children executed, `round.current += 1`)
- `ChildLoopBehavior` (onNext: if all executed && timer still running, reset `childIndex=0`)
- `ChildRunnerBehavior` (onNext: if children remain, push next child)

### Block: Exercise (leaf effort block, same as for-time-single)
- `SegmentOutputBehavior` (mount: emit effort/reps, unmount: completion)
- `PopOnNextBehavior` (user advance → pop)

---

## State Variables

| Variable | Type | Owner | Lifecycle |
|----------|------|-------|-----------|
| `timer` (primary) | `TimerState: { elapsed, durationMs:20000, direction:'down' }` | AMRAP | Starts on mount, ticks every frame, fires completion when elapsed ≥ duration |
| `round.current` | `1 → 2 → 3 → ...` | AMRAP | Increments on `→next` when all children executed, no max |
| `round.total` | `undefined` (unbounded) | AMRAP | Set at mount |
| `childIndex` | `0 → 1 → 2 → 3 → 0 → 1 → ...` | AMRAP | Cycles through 3 exercises while timer runs |

---

## Cindy — `20:00 AMRAP / 5 Pullups / 10 Pushups / 15 Air Squats`

**Blocks**: `WorkoutRoot > AMRAP(20:00) > [Pullups, Pushups, Squats]`

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Cindy" | Root.childIndex: 0→1, push AMRAP | ✅ |
| 2 | mount | AMRAP(20:00) | 1 | `segment` | timer: 20:00 countdown | round={1,∞}, timer starts, childIndex: 0→1, push Pullups | ✅ |
| 3 | mount | Pullups | 2 | `segment` | effort: "Pullups", reps: 5 | _(leaf)_ | ✅ |
| 4 | next | Pullups | 2 | — | _(user clicks next)_ | PopOnNext → pop | ✅ |
| 5 | unmount | Pullups | 2 | `completion` | effort: "Pullups", timeSpan: closed | | ✅ |
| →6 | →next | AMRAP(20:00) | 1 | — | _(parent receives control)_ | RoundAdv: skip (not all executed). ChildRunner: childIndex 1→2, push Pushups | ✅ |
| 7 | mount | Pushups | 2 | `segment` | effort: "Pushups", reps: 10 | _(leaf)_ | ✅ |
| 8 | unmount | Pushups | 2 | `completion` | effort: "Pushups", timeSpan: closed | | ✅ |
| →9 | →next | AMRAP(20:00) | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 2→3, push Squats | ✅ |
| 10 | mount | Squats | 2 | `segment` | effort: "Air Squats", reps: 15 | _(leaf)_ | ✅ |
| 11 | unmount | Squats | 2 | `completion` | effort: "Air Squats", timeSpan: closed | | ✅ |
| →12 | →next | AMRAP(20:00) | 1 | `milestone` | rounds: 2 (unbounded, no cap) | RoundAdv: round 1→2. ChildLoop: timer running → reset childIndex=0. ChildRunner: childIndex 0→1, push Pullups | ✅ |
| _(user continues round 2 of exercises)_ | | | | | | | |
| N | tick | AMRAP(20:00) | 1 | — | _(timer ticking, elapsed increases)_ | | ✅ |
| N+1 | tick | AMRAP(20:00) | 1 | `milestone` | sound: completion-beep | TimerCompletion: elapsed ≥ 20:00 → markComplete | ✅ |
| N+2 | unmount | AMRAP(20:00) | 1 | `completion` | timer: 20:00 elapsed, rounds: final count | | ✅ |
| →N+3 | →next | WorkoutRoot | 0 | — | _(root receives control)_ | ChildRunner: no more children → idle | ✅ |
| N+4 | unmount | WorkoutRoot | 0 | `completion` | label: "Cindy", timeSpan: total | history:record event | ✅ |

**Total expected outputs**: 2 per exercise × 3 × N rounds + round milestones + completion beep + completions

---

## Key Patterns

✅ AMRAP emits `segment` on mount with timer info  
✅ AMRAP emits `milestone` on each round advance (round 2, 3, 4, ...)  
✅ `RoundAdvanceBehavior` increments rounds unbounded (no total)  
✅ `ChildLoopBehavior.shouldLoop()` returns true while timer running  
✅ When timer expires (on tick), `TimerCompletionBehavior` marks complete  
✅ Children reset (`childIndex=0`) on each round boundary  
✅ Loop stops pushing new children once timer expires  
✅ History records final round count achieved within time

---

## Open Questions

- [ ] When AMRAP timer expires mid-exercise (user is still working), does the exercise get a `completion` output, or does it hang until user advances?
- [ ] Should the final round milestone be suppressed if timer expires before completing all children in that round?
