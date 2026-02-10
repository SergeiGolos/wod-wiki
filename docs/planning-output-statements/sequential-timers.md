# Sequential Timers

**Pattern**: `SessionRoot > [WaitingToStart, Timer > Timer > ...]`

**Workouts**: Simple and Sinister (5:00 KB Swings / 1:00 Rest / 10:00 Turkish Getups)

**Characteristics**: Root with multiple timed leaf blocks in sequence. No looping. Each timer is a countdown leaf block. Children are pushed sequentially.

---

## Behavior Stack

### Block: SessionRoot (renamed from WorkoutRoot — this is the section container)
- `SegmentOutputBehavior` (mount: emit section label, unmount: close with total time)
- `HistoryRecordBehavior` (unmount: emit history:record event)
- `ChildRunnerBehavior` (mount: push WaitingToStart, onNext: push next timer, mark complete and pop when all done)

### Block: WaitingToStart (pre-workout idle block)
- `SegmentOutputBehavior` (mount: emit "Ready to Start" message)
- `PopOnNextBehavior` (user clicks next → pop, trigger root to push first timer)

### Block: Timer (leaf countdown block)
- `SegmentOutputBehavior` (mount: emit timer duration + effort info, unmount: completion)
- `SoundCueBehavior` (mount: start-beep, tick: countdown beep, unmount: completion-beep)
- `TimerInitBehavior` (down, primary — countdown from 5:00 or 10:00)
- `TimerCompletionBehavior` (onTick: if `elapsed >= durationMs`, markComplete)

### Block: Rest (explicitly defined in workout script as a Timer leaf)
**Note**: In Sequential Timers, Rest blocks are **explicitly defined in the script** (e.g., `1:00 Rest`), not auto-generated. This differs from AMRAP/EMOM where Rest blocks are auto-generated *by the parent* when a child completes and the parent has a timer.

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

**Blocks**: `SessionRoot > [WaitingToStart, Timer(5:00, KBSwings), Rest(1:00), Timer(10:00, TGU)]`

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | SessionRoot | 0 | `segment` | label: "Simple and Sinister" | Root.childIndex: 0→1, push WaitingToStart | ✅ |
| 2 | mount | WaitingToStart | 1 | `segment` | label: "Ready to Start" | _(idle until user clicks next)_ | ✅ |
| 3 | next | WaitingToStart | 1 | — | _(user clicks next)_ | PopOnNext → pop WaitingToStart | ✅ |
| 4 | unmount | WaitingToStart | 1 | `completion` | label: "Ready to Start", timeSpan: closed | | ✅ |
| →5 | →next | SessionRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 1→2, push Timer(5:00) | ✅ |
| 6 | mount | Timer(5:00) | 1 | `segment` | timer: 5:00 countdown, effort: "KB Swings", reps: 100, 70lb | timer starts | ✅ |
| 7 | mount | Timer(5:00) | 1 | `milestone` | sound: start-beep | SoundCue.onMount | ✅ |
| 8 | tick | Timer(5:00) | 1 | `milestone` | sound: completion-beep | TimerCompl: elapsed ≥ 5:00 → markComplete | ✅ |
| 9 | unmount | Timer(5:00) | 1 | `completion` | timer: 5:00 elapsed, effort: "KB Swings", timeSpan: closed | | ✅ |
| →10 | →next | SessionRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 2→3, push Rest(1:00) | ✅ |
| 11 | mount | Rest(1:00) | 1 | `segment` | timer: 1:00 countdown, label: "Rest" | timer starts | ✅ |
| 12 | tick | Rest(1:00) | 1 | `milestone` | sound: rest-over-beep | TimerCompl: elapsed ≥ 1:00 → markComplete | ✅ |
| 13 | unmount | Rest(1:00) | 1 | `completion` | timer: 1:00 elapsed, timeSpan: closed | | ✅ |
| →14 | →next | SessionRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 3→4, push Timer(10:00) | ✅ |
| 15 | mount | Timer(10:00) | 1 | `segment` | timer: 10:00 countdown, effort: "Turkish Getups", reps: 10, 70lb | timer starts | ✅ |
| 16 | mount | Timer(10:00) | 1 | `milestone` | sound: start-beep | SoundCue.onMount | ✅ |
| 17 | tick | Timer(10:00) | 1 | `milestone` | sound: completion-beep | TimerCompl: elapsed ≥ 10:00 → markComplete | ✅ |
| 18 | unmount | Timer(10:00) | 1 | `completion` | timer: 10:00 elapsed, effort: "Turkish Getups", timeSpan: closed | | ✅ |
| →19 | →next | SessionRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 4 >= 4 → no more children, markComplete → pop SessionRoot | ✅ |
| 20 | unmount | SessionRoot | 0 | `completion` | label: "S&S", timeSpan: total | history:record event, **session ends** | ✅ |

**Total expected outputs**: ~14 (1 root + 2 per timer segment + 1 beep + 1 completion per timer/rest × 3 + beeps)

---

## Key Patterns

✅ **Session lifecycle:** SessionRoot → WaitingToStart → Timer sequence → Session ends  
✅ WaitingToStart block idles until user clicks next (gate before workout begins)  
✅ Root emits label segment and later completion  
✅ Each timer emits segment on mount with duration + effort info  
✅ Each timer emits sound beep milestones (start, completion)  
✅ Each timer auto-completes on tick when elapsed ≥ duration  
✅ **Rest blocks are explicitly defined in the script** (e.g., `1:00 Rest`) — NOT auto-generated  
   - This differs from AMRAP/EMOM where Rest blocks are auto-generated by timer-based parents  
✅ Rest blocks are just timers with "Rest" label and rest-over beep  
✅ `ChildRunner` on Root pushes timers sequentially on each `→next`  
✅ No looping, no round state, no child sequencing logic  
✅ History records total elapsed time for entire sequence  
✅ **Session termination:** When last Timer pops and childIndex ≥ children.length, SessionRoot marks complete and pops (session ends)

---

## Open Questions

- [ ] Should Rest blocks emit `segment` output or are they silent/transparent?
- [ ] Should the start-beep and completion-beep be separate `milestone` outputs or combined into one?
