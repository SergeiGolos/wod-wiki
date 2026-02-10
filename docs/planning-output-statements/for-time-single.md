# For Time (Single Exercise)

**Pattern**: `WorkoutRoot > Exercise`

**Workouts**: Grace (30 Clean & Jerk 135lb), Karen (150 Wall Ball Shots 20lb)

**Characteristics**: Single leaf exercise block with no children, no looping. User completes all reps, then clicks next. Timer is secondary (countup for display).

---

## Behavior Stack

### Block: SessionRoot (renamed from WorkoutRoot — this is the section container)
- `SegmentOutputBehavior` (mount: emit section label, unmount: close with total time)
- `HistoryRecordBehavior` (unmount: emit history:record event)
- `ChildRunnerBehavior` (mount: push WaitingToStart, then push exercise on first next(), then mark complete and pop on final next())

### Block: WaitingToStart (pre-workout idle block)
- `SegmentOutputBehavior` (mount: emit "Ready to Start" message)
- `PopOnNextBehavior` (user clicks next → pop, trigger root to push first workout block)

### Block: Exercise (leaf effort block)
- `SegmentOutputBehavior` (mount: emit exercise with effort/reps/resistance, unmount: completion)
- `SoundCueBehavior` (mount: start-beep, unmount: completion-beep)
- `TimerInitBehavior` (up, secondary — just counts elapsed time for display)
- `PopOnNextBehavior` (user advance → pop this block)

---

## State Variables

| Variable | Type | Owner | Lifecycle |
|----------|------|-------|-----------|
| `timer` (secondary) | `TimerState` | Exercise | Starts on mount, tracks elapsed |
| `childIndex` | `0 → 1 → 2 → complete` | SessionRoot | 0 initially, 1 after WaitingToStart, 2 after exercise, ≥2 triggers session end |

---

## Grace — `30 Clean & Jerk 135lb`

**Blocks**: `SessionRoot > [WaitingToStart, CleanAndJerk(30)]`

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | SessionRoot | 0 | `segment` | section: "Grace" | Root.childIndex: 0→1, push WaitingToStart | ✅ |
| 2 | mount | WaitingToStart | 1 | `segment` | label: "Ready to Start" | _(idle until user clicks next)_ | ✅ |
| 3 | next | WaitingToStart | 1 | — | _(user clicks next)_ | PopOnNext → pop WaitingToStart | ✅ |
| 4 | unmount | WaitingToStart | 1 | `completion` | label: "Ready to Start", timeSpan: closed | | ✅ |
| →5 | →next | SessionRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 1→2, push C&J | ✅ |
| 6 | mount | CleanAndJerk | 1 | `segment` | effort: "Clean & Jerk", 135lb, reps: 30 | _(leaf, timer starts)_ | ✅ |
| 7 | mount | CleanAndJerk | 1 | `milestone` | sound: start-beep | SoundCue.onMount | ✅ |
| 8 | next | CleanAndJerk | 1 | — | _(user completes 30 reps)_ | PopOnNext → pop C&J | ✅ |
| 9 | unmount | CleanAndJerk | 1 | `completion` | effort: "Clean & Jerk", timeSpan: closed | SegmentOutput.onUnmount | ✅ |
| 10 | unmount | CleanAndJerk | 1 | `milestone` | sound: completion-beep | SoundCue.onUnmount | ✅ |
| →11 | →next | SessionRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 2 >= 2 → no more children, markComplete → pop SessionRoot (session ends) | ✅ |
| 12 | unmount | SessionRoot | 0 | `completion` | section: "Grace", timeSpan: total | history:record event, **session ends** | ✅ |

**Total expected outputs**: ~10 (section segment + waiting segment + waiting completion + exercise segment + 2 milestones + completion + milestone + section completion)

---SessionRoot > [WaitingToStart, WallBalls(150)]`

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | SessionRoot | 0 | `segment` | section: "Karen" | Root.childIndex: 0→1, push WaitingToStart | ✅ |
| 2 | mount | WaitingToStart | 1 | `segment` | label: "Ready to Start" | _(idle until user clicks next)_ | ✅ |
| 3 | next | WaitingToStart | 1 | — | _(user clicks next)_ | PopOnNext → pop WaitingToStart | ✅ |
| 4 | unmount | WaitingToStart | 1 | `completion` | label: "Ready to Start", timeSpan: closed | | ✅ |
| →5 | →next | SessionRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 1→2, push WallBalls | ✅ |
| 6 | mount | WallBalls | 1 | `segment` | effort: "Wall Ball Shots", 20lb, reps: 150 | _(leaf, timer starts)_ | ✅ |
| 7 | mount | WallBalls | 1 | `milestone` | sound: start-beep | SoundCue.onMount | ✅ |
| 8 | next | WallBalls | 1 | — | _(user completes 150 reps)_ | PopOnNext → pop WallBalls | ✅ |
| 9 | unmount | WallBalls | 1 | `completion` | effort: "Wall Ball Shots", timeSpan: closed | SegmentOutput.onUnmount | ✅ |
| 10 | unmount | WallBalls | 1 | `milestone` | sound: completion-beep | SoundCue.onUnmount | ✅ |
| →11 | →next | SessionRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 2 >= 2 → markComplete → pop SessionRoot (session ends) | ✅ |
| 12 | unmount | SessionRoot | 0 | `completion` | section: "Karen", timeSpan: total | history:record event, **session ends** | ✅ |

**Total expected outputs**: ~10| `milestone` | sound: completion-beep | SoundCue.onUnmount | ✅ |
| →7 | →next | WorkoutRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 1 >= 1 → no more children, idle | ✅ |
| 8 | unmount | WorkoutRoot | 0 | `completion` | label: "Karen", timeSpan: total | history:record event | ✅ |

**Total expected outputs**: ~6

---

## Open Questions
**Session lifecycle:** SessionRoot → WaitingToStart → Exercise → Session ends  
✅ WaitingToStart block idles until user clicks next (gate before workout begins)  
✅ Exercise emits both mount (segment) and unmount (completion) outputs  
✅ Sound cues fire on mount/unmount (start/completion beep)  
✅ Timer is secondary (countup in background, not for blocking)  
✅ `ChildRunner` on SessionRoot: push WaitingToStart (childIndex 0→1), push Exercise (1→2), mark complete and pop (session ends)  
✅ **Session termination:** When last workout block pops and childIndex ≥ children.length, SessionRoot marks complete and pops

## Key Patterns

✅ Simplest workflow: no looping, no round state, no child sequencing  
✅ Exercise emits both mount (segment) and unmount (completion) outputs  
✅ Sound cues fire on mount/unmount (start/completion beep)  
✅ Timer is secondary (countup in background, not for blocking)  
✅ `ChildRunner` on Root just pushes one child, then idles forever
