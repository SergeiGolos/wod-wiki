# Sequential Timers

**Pattern**: `WorkoutRoot > [Timer, Rest, Timer, ...]`

**Workouts**: Simple and Sinister (5:00 KB Swings / 1:00 Rest / 10:00 Turkish Getups)

**Characteristics**: Root with multiple timed leaf blocks in sequence. No looping. Each timer is a countdown leaf block. Children are pushed sequentially.

---

## Behavior Stack

### Block: WorkoutRoot
- `SegmentOutputBehavior` (mount: emit label, unmount: close with total time)
- `HistoryRecordBehavior` (unmount: emit history:record event)
- `ChildRunnerBehavior` (push first timer, then next on each `→next`, then idle)

### Block: Timer (leaf countdown block)
- `SegmentOutputBehavior` (mount: emit timer duration + effort info, unmount: completion)
- `SoundCueBehavior` (mount: start-beep, tick: countdown beep, unmount: completion-beep)
- `TimerInitBehavior` (down, primary — countdown from 5:00 or 10:00)
- `TimerCompletionBehavior` (onTick: if `elapsed >= durationMs`, markComplete)

### Block: Rest (leaf countdown block, same structure as Timer)
- `SegmentOutputBehavior` (mount: emit timer duration + "Rest" label, unmount: completion)
- `SoundCueBehavior` (mount: usually silent or minor beep, unmount: rest-over-beep)
- `TimerInitBehavior` (down)
- `TimerCompletionBehavior` (onTick: if `elapsed >= durationMs`, markComplete)

---

## State Variables

| Variable | Type | Owner | Lifecycle |
|----------|------|-------|-----------|
| `childIndex` | `0 → 1 → 2 → 3 → idle` | WorkoutRoot | Increments on each child completion |
| `timer` (primary) | `TimerState` | Each Timer/Rest | Independent countdown, marks complete when elapsed ≥ duration |

---

## Simple and Sinister — `5:00 100 KB Swings / 1:00 Rest / 10:00 10 Turkish Getups`

**Blocks**: `WorkoutRoot > [Timer(5:00, KBSwings), Rest(1:00), Timer(10:00, TGU)]`

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Simple and Sinister" | Root.childIndex: 0→1, push Timer(5:00) | ✅ |
| 2 | mount | Timer(5:00) | 1 | `segment` | timer: 5:00 countdown, effort: "KB Swings", reps: 100, 70lb | timer starts | ✅ |
| 3 | mount | Timer(5:00) | 1 | `milestone` | sound: start-beep | SoundCue.onMount | ✅ |
| 4 | tick | Timer(5:00) | 1 | `milestone` | sound: completion-beep | TimerCompl: elapsed ≥ 5:00 → markComplete | ✅ |
| 5 | unmount | Timer(5:00) | 1 | `completion` | timer: 5:00 elapsed, effort: "KB Swings", timeSpan: closed | | ✅ |
| →6 | →next | WorkoutRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 1→2, push Rest(1:00) | ✅ |
| 7 | mount | Rest(1:00) | 1 | `segment` | timer: 1:00 countdown, label: "Rest" | timer starts | ✅ |
| 8 | tick | Rest(1:00) | 1 | `milestone` | sound: rest-over-beep | TimerCompl: elapsed ≥ 1:00 → markComplete | ✅ |
| 9 | unmount | Rest(1:00) | 1 | `completion` | timer: 1:00 elapsed, timeSpan: closed | | ✅ |
| →10 | →next | WorkoutRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 2→3, push Timer(10:00) | ✅ |
| 11 | mount | Timer(10:00) | 1 | `segment` | timer: 10:00 countdown, effort: "Turkish Getups", reps: 10, 70lb | timer starts | ✅ |
| 12 | mount | Timer(10:00) | 1 | `milestone` | sound: start-beep | SoundCue.onMount | ✅ |
| 13 | tick | Timer(10:00) | 1 | `milestone` | sound: completion-beep | TimerCompl: elapsed ≥ 10:00 → markComplete | ✅ |
| 14 | unmount | Timer(10:00) | 1 | `completion` | timer: 10:00 elapsed, effort: "Turkish Getups", timeSpan: closed | | ✅ |
| →15 | →next | WorkoutRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 3 >= 3 → no more children, idle | ✅ |
| 16 | unmount | WorkoutRoot | 0 | `completion` | label: "S&S", timeSpan: total | history:record event | ✅ |

**Total expected outputs**: ~14 (1 root + 2 per timer segment + 1 beep + 1 completion per timer/rest × 3 + beeps)

---

## Key Patterns

✅ Root emits label segment and later completion  
✅ Each timer emits segment on mount with duration + effort info  
✅ Each timer emits sound beep milestones (start, completion)  
✅ Each timer auto-completes on tick when elapsed ≥ duration  
✅ Rest blocks are just timers with "Rest" label and rest-over beep  
✅ `ChildRunner` on Root pushes timers sequentially on each `→next`  
✅ No looping, no round state, no child sequencing logic  
✅ History records total elapsed time for entire sequence

---

## Open Questions

- [ ] Should Rest blocks emit `segment` output or are they silent/transparent?
- [ ] Should the start-beep and completion-beep be separate `milestone` outputs or combined into one?
