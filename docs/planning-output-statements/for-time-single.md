# For Time (Single Exercise)

**Pattern**: `WorkoutRoot > Exercise`

**Workouts**: Grace (30 Clean & Jerk 135lb), Karen (150 Wall Ball Shots 20lb)

**Characteristics**: Single leaf exercise block with no children, no looping. User completes all reps, then clicks next. Timer is secondary (countup for display).

---

## Behavior Stack

### Block: WorkoutRoot
- `SegmentOutputBehavior` (mount: emit label, unmount: close with total time)
- `HistoryRecordBehavior` (unmount: emit history:record event)
- `ChildRunnerBehavior` (push single exercise, then idle)

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
| `childIndex` | `0 → 1` | WorkoutRoot | 0 initially, 1 after push, ≥ 1 when idle |

---

## Grace — `30 Clean & Jerk 135lb`

**Blocks**: `WorkoutRoot > CleanAndJerk(30)`

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Grace" | Root.childIndex: 0→1, push C&J | ✅ |
| 2 | mount | CleanAndJerk | 1 | `segment` | effort: "Clean & Jerk", 135lb, reps: 30 | _(leaf, timer starts)_ | ✅ |
| 3 | mount | CleanAndJerk | 1 | `milestone` | sound: start-beep | SoundCue.onMount | ✅ |
| 4 | next | CleanAndJerk | 1 | — | _(user completes 30 reps)_ | PopOnNext → pop C&J | ✅ |
| 5 | unmount | CleanAndJerk | 1 | `completion` | effort: "Clean & Jerk", timeSpan: closed | SegmentOutput.onUnmount | ✅ |
| 6 | unmount | CleanAndJerk | 1 | `milestone` | sound: completion-beep | SoundCue.onUnmount | ✅ |
| →7 | →next | WorkoutRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 1 >= 1 → no more children, idle | ✅ |
| 8 | unmount | WorkoutRoot | 0 | `completion` | label: "Grace", timeSpan: total | history:record event | ✅ |

**Total expected outputs**: ~6 (segment + 2 milestones + completion + 2 milestones + history)

---

## Karen — `150 Wall Ball Shots 20lb`

**Blocks**: `WorkoutRoot > WallBalls(150)`

| Step | Event | Block | Depth | Output | Fragments | State Changes | Expected? |
|---:|---|---|---:|---|---|---|---|
| 1 | mount | WorkoutRoot | 0 | `segment` | label: "Karen" | Root.childIndex: 0→1, push WallBalls | ✅ |
| 2 | mount | WallBalls | 1 | `segment` | effort: "Wall Ball Shots", 20lb, reps: 150 | _(leaf, timer starts)_ | ✅ |
| 3 | mount | WallBalls | 1 | `milestone` | sound: start-beep | SoundCue.onMount | ✅ |
| 4 | next | WallBalls | 1 | — | _(user completes 150 reps)_ | PopOnNext → pop WallBalls | ✅ |
| 5 | unmount | WallBalls | 1 | `completion` | effort: "Wall Ball Shots", timeSpan: closed | SegmentOutput.onUnmount | ✅ |
| 6 | unmount | WallBalls | 1 | `milestone` | sound: completion-beep | SoundCue.onUnmount | ✅ |
| →7 | →next | WorkoutRoot | 0 | — | _(root receives control)_ | ChildRunner: childIndex 1 >= 1 → no more children, idle | ✅ |
| 8 | unmount | WorkoutRoot | 0 | `completion` | label: "Karen", timeSpan: total | history:record event | ✅ |

**Total expected outputs**: ~6

---

## Open Questions

- [ ] Should `SoundCueBehavior` milestones be counted separately or are they decorative metadata?
- [ ] Does the exercise emit a `segment` on mount for every rep scheme, or is it conditional on reps > 0?

---

## Key Patterns

✅ Simplest workflow: no looping, no round state, no child sequencing  
✅ Exercise emits both mount (segment) and unmount (completion) outputs  
✅ Sound cues fire on mount/unmount (start/completion beep)  
✅ Timer is secondary (countup in background, not for blocking)  
✅ `ChildRunner` on Root just pushes one child, then idles forever
