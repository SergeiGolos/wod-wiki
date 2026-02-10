# For Time (Descending Rep-Scheme)

**Pattern**: `WorkoutRoot > Loop(repScheme) > Exercises`

**Workouts**: Fran (21-15-9 Thrusters/Pullups), Annie (50-40-30-20-10 DUs/Situps), Diane (21-15-9 Deadlift/HSPU)

**Characteristics**: Multi-round loop with rep scheme that changes per round. Children are exercises. The rep count decreases each round (21→15→9).

---

## Behavior Stack

### Block: SessionRoot (renamed from WorkoutRoot — this is the section container)
- `SegmentOutputBehavior` (mount: emit section label, unmount: close with total time)
- `HistoryRecordBehavior` (unmount: emit history:record event)
- `ChildRunnerBehavior` (mount: push WaitingToStart, then push Loop on first next(), then mark complete and pop on final next())

### Block: WaitingToStart (pre-workout idle block)
- `SegmentOutputBehavior` (mount: emit "Ready to Start" message)
- `PopOnNextBehavior` (user clicks next → pop, trigger root to push first workout block)

### Block: Loop (parent with round state)
- `RoundInitBehavior` (mount: initialize `round={current:1, total:3}`)
- `RoundAdvanceBehavior` (onNext: if all children executed, `round.current += 1`)
- `RoundCompletionBehavior` (onNext: if `round.current > round.total`, pop)
- `ChildLoopBehavior` (onNext: if all executed && should loop, reset `childIndex=0`)
- `ChildRunnerBehavior` (onNext: if children remain, push next child, increment `childIndex`)
- `SegmentOutputBehavior` (no-op; emit on children only)

### Block: Exercise (leaf effort block)
- `SegmentOutputBehavior` (mount: emit effort/reps/resistance, unmount: completion)
- `TimerInitBehavior` (up, secondary — countup)
- `PopOnNextBehavior` (user advance → pop)

---

## State Variables

| Variable | Type | Owner | Lifecycle |
|----------|------|-------|-----------|
| `round.current` | `1 → 2 → 3 → 4 (complete)` | Loop | Increments on `→next` when all children executed |
| `round.total` | `3` (constant) | Loop | Set at mount |
| `childIndex` | `0 → 1 → 2 → 0 → 1 → ...` | Loop | Increments on child push, resets after round complete |
| `repScheme` | `[21, 15, 9]` (fragment) | Loop | Merged into child exercises per round |

---

## Fran — `(21-15-9) Thrusters 95lb / Pullups`

**Blocks**: `WorkoutRoot > Loop(21-15-9) > [Thrusters, Pullups]`

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Fran" | Root.childIndex: 0→1, push Loop | ✅ |
| 2 | mount | Loop(21-15-9) | 1 | `milestone` | rounds: 1/3, reps: 21 | round={1,3}, childIndex: 0→1, push Thrusters | ✅ |
| 3 | mount | Thrusters | 2 | `segment` | effort: "Thrusters", 95lb, reps: 21 | _(leaf)_ | ✅ |
| 4 | next | Thrusters | 2 | — | _(user clicks next)_ | PopOnNext → pop Thrusters | ✅ |
| 5 | unmount | Thrusters | 2 | `completion` | effort: "Thrusters", timeSpan: closed | | ✅ |
| →6 | →next | Loop(21-15-9) | 1 | — | _(parent receives control)_ | RoundAdv: skip (childIdx=1<2). ChildRunner: childIndex 1→2, push Pullups | ✅ |
| 7 | mount | Pullups | 2 | `segment` | effort: "Pullups", reps: 21 | _(leaf)_ | ✅ |
| 8 | next | Pullups | 2 | — | _(user clicks next)_ | PopOnNext → pop Pullups | ✅ |
| 9 | unmount | Pullups | 2 | `completion` | effort: "Pullups", timeSpan: closed | | ✅ |
| →10 | →next | Loop(21-15-9) | 1 | `milestone` | rounds: 2/3, reps: 15 | RoundAdv: round 1→2. ChildLoop: reset childIndex=0. ChildRunner: childIndex 0→1, push Thrusters | ✅ |
| 11 | mount | Thrusters | 2 | `segment` | effort: "Thrusters", 95lb, reps: 15 | _(leaf, reps updated)_ | ✅ |
| 12 | unmount | Thrusters | 2 | `completion` | effort: "Thrusters", timeSpan: closed | | ✅ |
| →13 | →next | Loop(21-15-9) | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 1→2, push Pullups | ✅ |
| 14 | mount | Pullups | 2 | `segment` | effort: "Pullups", reps: 15 | _(leaf)_ | ✅ |
| 15 | unmount | Pullups | 2 | `completion` | effort: "Pullups", timeSpan: closed | | ✅ |
| →16 | →next | Loop(21-15-9) | 1 | `milestone` | rounds: 3/3, reps: 9 | RoundAdv: round 2→3. ChildLoop: reset childIndex=0. ChildRunner: childIndex 0→1, push Thrusters | ✅ |
| 17 | mount | Thrusters | 2 | `segment` | effort: "Thrusters", 95lb, reps: 9 | _(leaf, reps updated)_ | ✅ |
| 18 | unmount | Thrusters | 2 | `completion` | effort: "Thrusters", timeSpan: closed | | ✅ |
| →19 | →next | Loop(21-15-9) | 1 | — | _(parent receives control)_ | RoundAdv: skip. ChildRunner: childIndex 1→2, push Pullups | ✅ |
| 20 | mount | Pullups | 2 | `segment` | effort: "Pullups", reps: 9 | _(leaf)_ | ✅ |
| 21 | unmount | Pullups | 2 | `completion` | effort: "Pullups", timeSpan: closed | | ✅ |
| →22 | →next | Loop(21-15-9) | 1 | — | _(parent receives control)_ | RoundAdv: round 3→4. RoundCompl: 4>3 → markComplete, pop Loop | ✅ |
| 23 | unmount | Loop(21-15-9) | 1 | `completion` | rounds: 3/3 complete | | ✅ |
| →24 | →next | WorkoutRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 1 >= 1 → no more children, idle | ✅ |
| 25 | unmount | WorkoutRoot | 0 | `completion` | label: "Fran", timeSpan: total | history:record event | ✅ |

**Total expected outputs**: ~16 (1 root segment + 1 loop milestone + 2 cycles of 3 children {segment, completion} + 2 loop milestones + final completions)

---

## Key Patterns

✅ **Session lifecycle:** SessionRoot → WaitingToStart → Loop → Session ends  
✅ WaitingToStart block idles until user clicks next (gate before workout begins)  
✅ Loop emits `milestone` on initial mount with reps from repScheme[0]  
✅ Loop emits `milestone` on each round advance with updated reps  
✅ Children receive merged fragments including rep count per round  
✅ `RoundAdvanceBehavior` only fires after `allChildrenCompleted` is true  
✅ `ChildLoopBehavior` resets `childIndex` to 0 when all executed  
✅ On final round, `RoundCompletionBehavior` fires and pops Loop  
✅ Loop completion shows final round count (3/3)  
✅ **Session termination:** When Loop pops and childIndex ≥ children.length, SessionRoot marks complete and pops (session ends)

---

## Open Questions

- [ ] When does the rep-scheme fragment get merged into children? On Loop mount or on each child mount?
- [ ] Should loop emit `segment` on mount, or only `milestone` with rep count?
