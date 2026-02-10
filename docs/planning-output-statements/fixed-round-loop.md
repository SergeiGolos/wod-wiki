# Fixed-Round Loop

**Pattern**: `WorkoutRoot > Loop(N-rounds) > Exercises`

**Workouts**: Helen (3 rounds: Run / KB Swings / Pullups), Nancy (5 rounds: Run / Overhead Squats)

**Characteristics**: Multi-round loop with constant rep/distance per exercise. Unlike descending rep-schemes, the exercise metrics stay the same across all rounds. Children are exercises.

---

## Behavior Stack

### Block: WorkoutRoot
- `SegmentOutputBehavior` (mount: emit label, unmount: close with total time)
- `HistoryRecordBehavior` (unmount: emit history:record event)
- `ChildRunnerBehavior` (push Loop, then idle)

### Block: Loop (parent with bounded round state)
- `RoundInitBehavior` (mount: initialize `round={current:1, total:3 or 5}`)
- `RoundAdvanceBehavior` (onNext: if all children executed, `round.current += 1`)
- `RoundCompletionBehavior` (onNext: if `round.current > round.total`, pop)
- `ChildLoopBehavior` (onNext: if all executed && rounds remain, reset `childIndex=0`)
- `ChildRunnerBehavior` (onNext: if children remain, push next child, increment `childIndex`)

### Block: Exercise (leaf effort block)
- `SegmentOutputBehavior` (mount: emit effort/distance/reps, unmount: completion)
- `TimerInitBehavior` (optional, for distance-based exercises like runs)
- `PopOnNextBehavior` (user advance → pop)

---

## State Variables

| Variable | Type | Owner | Lifecycle |
|----------|------|-------|-----------|
| `round.current` | `1 → 2 → 3` | Loop | Increments on `→next` when all children executed |
| `round.total` | `3` or `5` (constant) | Loop | Set at mount |
| `childIndex` | `0 → 1 → 2 → 0 → 1 → ...` | Loop | Increments on child push, resets after round |

---

## Helen — `(3) 400m Run / 21 KB Swings 53lb / 12 Pullups`

**Blocks**: `WorkoutRoot > Loop(3) > [Run, KBSwings, Pullups]`

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Helen" | Root.childIndex: 0→1, push Loop | ✅ |
| 2 | mount | Loop(3) | 1 | `milestone` | rounds: 1/3 | round={1,3}, childIndex: 0→1, push Run | ✅ |
| 3 | mount | Run | 2 | `segment` | effort: "Run", distance: "400m" | _(leaf)_ | ✅ |
| 4 | unmount | Run | 2 | `completion` | effort: "Run", timeSpan: closed | | ✅ |
| →5 | →next | Loop(3) | 1 | — | _(parent receives control)_ | RoundAdv: skip (childIdx=1<3). ChildRunner: childIndex 1→2, push KBSwings | ✅ |
| 6 | mount | KBSwings | 2 | `segment` | effort: "KB Swings", 53lb, reps: 21 | _(leaf, same per round)_ | ✅ |
| 7 | unmount | KBSwings | 2 | `completion` | effort: "KB Swings", timeSpan: closed | | ✅ |
| →8 | →next | Loop(3) | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 2→3, push Pullups | ✅ |
| 9 | mount | Pullups | 2 | `segment` | effort: "Pullups", reps: 12 | _(leaf, same per round)_ | ✅ |
| 10 | unmount | Pullups | 2 | `completion` | effort: "Pullups", timeSpan: closed | | ✅ |
| →11 | →next | Loop(3) | 1 | `milestone` | rounds: 2/3 | RoundAdv: round 1→2. ChildLoop: reset childIndex=0. ChildRunner: childIndex 0→1, push Run | ✅ |
| 12 | mount | Run | 2 | `segment` | effort: "Run", distance: "400m" | _(leaf, identical to round 1)_ | ✅ |
| 13 | unmount | Run | 2 | `completion` | effort: "Run", timeSpan: closed | | ✅ |
| →14 | →next | Loop(3) | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 1→2, push KBSwings | ✅ |
| 15 | mount | KBSwings | 2 | `segment` | effort: "KB Swings", 53lb, reps: 21 | _(leaf)_ | ✅ |
| 16 | unmount | KBSwings | 2 | `completion` | effort: "KB Swings", timeSpan: closed | | ✅ |
| →17 | →next | Loop(3) | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 2→3, push Pullups | ✅ |
| 18 | mount | Pullups | 2 | `segment` | effort: "Pullups", reps: 12 | _(leaf)_ | ✅ |
| 19 | unmount | Pullups | 2 | `completion` | effort: "Pullups", timeSpan: closed | | ✅ |
| →20 | →next | Loop(3) | 1 | `milestone` | rounds: 3/3 | RoundAdv: round 2→3. ChildLoop: reset childIndex=0. ChildRunner: childIndex 0→1, push Run | ✅ |
| ...repeat final round... | | | | | | | |
| →N | →next | Loop(3) | 1 | — | _(after round 3, last child)_ | RoundAdv: round 3→4. RoundCompl: 4>3 → markComplete, pop Loop | ✅ |
| N+1 | unmount | Loop(3) | 1 | `completion` | rounds: 3/3 | | ✅ |
| →N+2 | →next | WorkoutRoot | 0 | — | _(root receives control)_ | ChildRunner: no more children → idle | ✅ |
| N+3 | unmount | WorkoutRoot | 0 | `completion` | label: "Helen", timeSpan: total | history:record event | ✅ |

**Total expected outputs**: ~22 (1 root + 1 loop milestone + 6 per round × 3 + loop milestone × 2 + completions)

---

## Key Patterns

✅ Loop emits `milestone` on initial mount (1/3)  
✅ Loop emits `milestone` on each subsequent round advance (2/3, 3/3)  
✅ Exercise metrics (reps, distance) are identical across all rounds  
✅ `RoundAdvanceBehavior` increments `round.current` after all children executed  
✅ `ChildLoopBehavior` resets `childIndex=0` when all executed and rounds remain  
✅ On final round, `RoundCompletionBehavior` fires and pops Loop  
✅ Loop completion shows final round count (3/3)  
✅ History records all rounds completed with final times

---

## Difference from Descending Rep-Scheme

| Aspect | Descending Rep-Scheme (Fran) | Fixed-Round (Helen) |
|--------|-----|-----|
| **Rep/Distance** | Changes per round (21→15→9) | Same per round (12 pullups every round) |
| **Loop milestone content** | Includes reps per round | Just round count (1/3, 2/3, 3/3) |
| **Fragment updates** | Rep count merged per round | No per-round updates |
| **Output complexity** | Higher (milestone shows reps) | Lower (consistent milestones) |

---

## Open Questions

- [ ] Should Loop emit `segment` on mount, or only `milestone` with round count?
- [ ] For distance-based exercises, should timer be countup or just metadata?
