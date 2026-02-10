# Loop with Rest

**Pattern**: `WorkoutRoot > Loop(N) > [Exercises..., Rest(timer)]`

**Workouts**: Barbara (5 rounds: Pullups / Pushups / Situps / Squats / 3:00 Rest)

**Characteristics**: Fixed-round loop where the last child in each round is a Rest timer. The rest timer is just another child block, treated identically to exercises.

---

## Behavior Stack

### Block: SessionRoot (renamed from WorkoutRoot — this is the section container)
- `SegmentOutputBehavior` (mount: emit section label, unmount: close with total time)
- `HistoryRecordBehavior` (unmount: emit history:record event)
- `ChildRunnerBehavior` (mount: push WaitingToStart, then push Loop on first next(), then mark complete and pop on final next())

### Block: WaitingToStart (pre-workout idle block)
- `SegmentOutputBehavior` (mount: emit "Ready to Start" message)
- `PopOnNextBehavior` (user clicks next → pop, trigger root to push first workout block)

### Block: Loop (parent with bounded round state)
- `RoundInitBehavior` (mount: initialize `round={current:1, total:5}`)
- `RoundAdvanceBehavior` (onNext: if all children executed, `round.current += 1`)
- `RoundCompletionBehavior` (onNext: if `round.current > round.total`, pop)
- `ChildLoopBehavior` (onNext: if all executed && rounds remain, reset `childIndex=0`)
- `ChildRunnerBehavior` (onNext: if children remain, push next child)
- Children include 4 exercises + 1 rest timer = 5 total children

### Block: Exercise (leaf effort block)
- `SegmentOutputBehavior` (mount: emit effort/reps, unmount: completion)
- `PopOnNextBehavior` (user advance → pop)

### Block: Rest (leaf countdown timer)
- `SegmentOutputBehavior` (mount: emit timer duration + "Rest" label, unmount: completion)
- `SoundCueBehavior` (mount: optional, unmount: rest-over-beep)
- `TimerInitBehavior` (down, countdown from 3:00)
- `TimerCompletionBehavior` (onTick: if `elapsed >= durationMs`, markComplete)

---

## State Variables

| Variable | Type | Owner | Lifecycle |
|----------|------|-------|-----------|
| `round.current` | `1 → 2 → 3 → 4 → 5 → 6 (complete)` | Loop | Increments after all 5 children executed |
| `round.total` | `5` (constant) | Loop | Set at mount |
| `childIndex` | `0 → 1 → 2 → 3 → 4 → 5 → 0 → ...` | Loop | Points to next child (4 exercises + 1 rest = 5 children) |

---

## Barbara — `(5) 20 Pullups / 30 Pushups / 40 Situps / 50 Squats / 3:00 Rest`

**Blocks**: `WorkoutRoot > Loop(5) > [Pullups, Pushups, Situps, Squats, Rest(3:00)]`

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Barbara" | Root.childIndex: 0→1, push Loop | ✅ |
| 2 | mount | Loop(5) | 1 | `milestone` | rounds: 1/5 | round={1,5}, childIndex: 0→1, push Pullups | ✅ |
| 3 | mount | Pullups | 2 | `segment` | effort: "Pullups", reps: 20 | _(leaf)_ | ✅ |
| 4 | unmount | Pullups | 2 | `completion` | effort: "Pullups", timeSpan: closed | | ✅ |
| →5 | →next | Loop(5) | 1 | — | _(parent receives control)_ | RoundAdv: skip (childIdx=1<5). ChildRunner: childIndex 1→2, push Pushups | ✅ |
| 6 | mount | Pushups | 2 | `segment` | effort: "Pushups", reps: 30 | _(leaf)_ | ✅ |
| 7 | unmount | Pushups | 2 | `completion` | effort: "Pushups", timeSpan: closed | | ✅ |
| →8 | →next | Loop(5) | 1 | — | _(parent receives control)_ | RoundAdv: skip (childIdx=2<5). ChildRunner: childIndex 2→3, push Situps | ✅ |
| 9 | mount | Situps | 2 | `segment` | effort: "Situps", reps: 40 | _(leaf)_ | ✅ |
| 10 | unmount | Situps | 2 | `completion` | effort: "Situps", timeSpan: closed | | ✅ |
| →11 | →next | Loop(5) | 1 | — | _(parent receives control)_ | RoundAdv: skip (childIdx=3<5). ChildRunner: childIndex 3→4, push Squats | ✅ |
| 12 | mount | Squats | 2 | `segment` | effort: "Air Squats", reps: 50 | _(leaf)_ | ✅ |
| 13 | unmount | Squats | 2 | `completion` | effort: "Air Squats", timeSpan: closed | | ✅ |
| →14 | →next | Loop(5) | 1 | — | _(parent receives control)_ | RoundAdv: skip (childIdx=4<5). ChildRunner: childIndex 4→5, push Rest(3:00) | ✅ |
| 15 | mount | Rest(3:00) | 2 | `segment` | timer: 3:00 countdown, label: "Rest" | timer starts | ✅ |
| 16 | tick | Rest(3:00) | 2 | `milestone` | sound: rest-over-beep | TimerCompl: 3:00 elapsed → markComplete | ✅ |
| 17 | unmount | Rest(3:00) | 2 | `completion` | timer: 3:00 elapsed, timeSpan: closed | | ✅ |
| →18 | →next | Loop(5) | 1 | `milestone` | rounds: 2/5 | RoundAdv: round 1→2 (now childIdx=5 >= 5, so allExecuted). ChildLoop: reset childIndex=0. ChildRunner: childindex 0→1, push Pullups | ✅ |
| 19 | mount | Pullups | 2 | `segment` | effort: "Pullups", reps: 20 | _(leaf, round 2)_ | ✅ |
| 20 | unmount | Pullups | 2 | `completion` | effort: "Pullups", timeSpan: closed | | ✅ |
| _(repeat next 3 exercises + rest for round 2)_ | | | | | | | |
| →N | →next | Loop(5) | 1 | `milestone` | rounds: 5/5 | RoundAdv: round 5→6. ChildLoop: reset childIndex=0. ChildRunner: childindex 0→1, push Pullups | ✅ |
| _(last round exercises + rest)_ | | | | | | | |
| →(N+M) | →next | Loop(5) | 1 | — | _(after round 5, last child)_ | RoundAdv: round 5→6. RoundCompl: 6>5 → markComplete, pop Loop | ✅ |
| N+M+1 | unmount | Loop(5) | 1 | `completion` | rounds: 5/5 | | ✅ |
| →(N+M+2) | →next | WorkoutRoot | 0 | — | _(root receives control)_ | ChildRunner: no more children → idle | ✅ |
| N+M+3 | unmount | WorkoutRoot | 0 | `completion` | label: "Barbara", timeSpan: total | history:record event | ✅ |

**Total expected outputs**: ~16 per round × 5 + root (80+ outputs)

---

## Key Patterns

✅ **Session lifecycle:** SessionRoot → WaitingToStart → Loop → Session ends  
✅ WaitingToStart block idles until user clicks next (gate before workout begins)  
✅ Rest is treated as a regular child (just another leaf block)  
✅ Rest timer auto-completes on tick when 3:00 elapsed  
✅ `RoundAdvanceBehavior` fires after all 5 children executed (including rest)  
✅ Each round advance shows updated round count (1/5 → 2/5 → ... → 5/5)  
✅ `ChildLoopBehavior` resets `childIndex=0` after rest completes  
✅ On final round, `RoundCompletionBehavior` pops Loop after 5th child (rest)  
✅ History records 5 complete rounds with all exercise completions  
✅ **Session termination:** When Loop pops and childIndex ≥ children.length, SessionRoot marks complete and pops (session ends)

---

## Comparison to Fixed-Round Loop (Helen)

| Aspect | Helen (3 exercises) | Barbara (4 exercises + rest) |
|--------|-----|-----|
| **Children per round** | 3 | 5 (4 exercises + 1 rest timer) |
| **Output per round** | 2×3 segments + 2×3 completions + 1 milestone | 2×5 segments + 2×5 completions + 1 milestone |
| **Rest handling** | N/A | Rest is a child, auto-completes on timer |
| **ChildIndex range** | 0→1→2→0 | 0→1→2→3→4→0 |

---

## Open Questions

- [ ] Should Rest block emit `segment` output, or just a `completion` when timer expires?
- [ ] Does the user have to click "next" to advance past rest, or does timer auto-complete and auto-advance?
- [ ] Should rest-over beep fire before or after the rest block unmounts?
