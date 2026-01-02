# GPT Behaviors Overview (Overlap + Transition Plan)

This document clarifies where existing runtime behaviors overlap today, and proposes a migration path toward **single-responsibility behaviors** that can be composed to cover all block execution use cases.

The intent is to reduce “compound behaviors” (e.g., looping behaviors that also track rounds and report progress) into small, predictable units that:

- do **one** thing,
- are easy to compose,
- are easy to test in isolation,
- avoid implicit coupling (order dependencies are explicit).

> Terminology note: the repo currently uses `IRuntimeBehavior` with lifecycle hooks like `onPush`, `onNext`, `onPop`, and `onEvent`. This doc talks in those terms.

---

## Current State in This Repo

### Existing “compound” behaviors (examples)

These live in `src/runtime/behaviors/` and combine multiple responsibilities:

- `BoundLoopBehavior`:
  - decides completion (`PopBlockAction` when rounds exceed limit)
  - *also* reports rounds (`TrackRoundAction`)
  - depends on *some* round counter being present (`RoundPerNextBehavior` or `RoundPerLoopBehavior`)

- `UnboundLoopBehavior`:
  - never completes
  - reports rounds (`TrackRoundAction`)
  - depends on round counter behavior

- `SinglePassBehavior`:
  - decides completion (“pop on round >= 2”)
  - depends on round counter behavior

- `LoopCoordinatorBehavior`:
  - coordinates child compilation/push (`CompileAndPushBlockAction`)
  - decides completion for multiple loop types (fixed/repScheme/timeBound/interval)
  - updates display state (`SetRoundsDisplayAction`, `UpdateDisplayStateAction`)
  - manages lap timers in memory and creates/updates spans (`RuntimeSpan`)
  - restarts timers for interval loops

### Existing “single-ish” behaviors (closer to target)

- `RoundPerLoopBehavior`: round counter based on `ChildIndexBehavior` wrap
- `RoundPerNextBehavior`: round counter based on `onNext`
- `TimerBehavior` + `BoundTimerBehavior` + `UnboundTimerBehavior`: time tracking + timer events/state
- `SoundBehavior`: event-driven audio cue triggering on `timer:tick`

### Where overlap shows up

Today, the following concerns are mixed together across behaviors:

1. **Round counting** (what is the round number?)
2. **Completion** (when should a block pop/stop?)
3. **Reporting** (tracker updates, metrics updates)
4. **Display state** (what should UI show?)
5. **Sound cues** (when should we play audio?)
6. **Coordination / control flow** (compile/push child groups, interval waiting)

That overlap makes it hard to evolve “loop types” without duplicating logic or introducing subtle ordering/coupling bugs.

---

## Target Behavior Catalog (Single Responsibility)

The list below is the desired target set. The key idea is: **looping and completion are not the same as counting rounds, reporting rounds, or displaying rounds**.

### Looping Behavior

These behaviors decide *whether the block continues* and/or *when it should pop*.

- **SingleRepeater**
  - Responsibility: stop after one full pass.
  - Inputs: a round counter (see Rounds behavior).
  - Outputs: `PopBlockAction` when the pass is done.
  - Repo mapping (today): `SinglePassBehavior`.

- **BoundRepeater**
  - Responsibility: stop after `N` passes.
  - Inputs: a round counter.
  - Outputs: `PopBlockAction` when rounds exceed limit.
  - Repo mapping (today): `BoundLoopBehavior` *minus* reporting.

- **UnboundRepeater**
  - Responsibility: never stop (no pop condition).
  - Inputs: none.
  - Outputs: none.
  - Repo mapping (today): `UnboundLoopBehavior` *minus* reporting.

### Rounds Behavior

These behaviors own the definition of “what counts as a round.”

- **RoundPerBlock**
  - Responsibility: increment when the block completes one full “block cycle”.
  - Typical meaning: one user-visible cycle of the block, not every `next()`.
  - Implementation note: in this repo, “block cycle” commonly aligns with child-index wrapping. So in practice, `RoundPerLoopBehavior` is often closer to this than `RoundPerNextBehavior`.

- **RoundPerLoop**
  - Responsibility: increment when the loop position wraps (e.g., child group index wraps).
  - Repo mapping (today): `RoundPerLoopBehavior`.

> Design rule: only one “round counter source” should be considered authoritative for a given block. If multiple exist, composition should pick one explicitly.

### Timer Behaviors

Timers should only manage time state and timer-related events/state, not loop completion or display decisions.

- **UnboundTimedBehavior**
  - Responsibility: count up indefinitely.
  - Repo mapping (today): `UnboundTimerBehavior`.

- **BoundTimeBehavior**
  - Responsibility: count down (or up) for a specified duration.
  - Repo mapping (today): `BoundTimerBehavior`.

### Reporting Behaviors

Reporting behaviors should be pure “emit side effects” (actions) based on state from other behaviors.

- **Report Rounds Behavior**
  - Responsibility: push round updates to the tracker.
  - Inputs: the chosen round counter + optional total rounds.
  - Outputs: `TrackRoundAction`.
  - Repo mapping (today): logic currently embedded in `BoundLoopBehavior` and `UnboundLoopBehavior`.

- **Report Metrics Behavior**
  - Responsibility: push metric updates to the tracker.
  - Inputs: metrics source(s) (e.g., fragments, runtime span metrics, or explicit `TrackMetricAction` triggers).
  - Outputs: `TrackMetricAction`.
  - Repo mapping (today): `TrackMetricAction` exists, but behavior-level orchestration is not consistently isolated.

### Display Behaviors

Display behaviors should update display state, but not decide the underlying execution control flow.

- **Display Timer Behaviors**
- **Display Stopwatch Behavior**
- **Display Current Time Behavior**
- **Display Empty Timer Behavior**

In this repo, display is primarily updated via display actions (e.g., `SetRoundsDisplayAction`, `UpdateDisplayStateAction`). The goal is to move those calls out of coordinators/loopers and into dedicated display behaviors.

### Sound Behaviors

Sound behaviors should convert “state changes” or “timer thresholds” into `PlaySoundAction`s.

- **PlaySoundAtElapsedTime**
- **PlaySoundAtRemainingTime**
- **PlaySoundsOnStart**
- **PlaySoundsOnNext**
- **PlaySoundsOnStop**

Repo mapping (today): `SoundBehavior` is effectively a **compound sound behavior** that covers “at elapsed/remaining thresholds” by listening to `timer:tick`.

> Note: the list says “Ellapsed”; use **Elapsed** in code/docs going forward.

---

## Overlap Matrix (What Should Own What)

This table is the core policy to remove overlap.

| Concern | Should be owned by | Should *not* be owned by |
|---|---|---|
| Round number definition | `RoundPer*` behaviors | Looping/completion, reporting, display |
| Block completion / popping | `*Repeater` behaviors | round counters, reporting, display |
| Tracker rounds updates | `ReportRoundsBehavior` | repeaters/round counters |
| Metric reporting | `ReportMetricsBehavior` | loop/timer behaviors |
| Display state updates | `Display*` behaviors | coordinators/repeaters |
| Sound cues | `PlaySound*` behaviors | timers/repeaters |
| Child compilation/push sequencing | coordinator behavior / runtime | tracking/display/sound |

---

## Composition Recipes (Common Block Use Cases)

These recipes show how single-responsibility behaviors compose to replace compound behaviors.

### 1) “Do this once” (single pass)

- `RoundPerLoop` (or `RoundPerBlock`, whichever defines a “pass”)
- `SingleRepeater`
- Optional: `ReportRoundsBehavior` (round 1/1)
- Optional: display + sound behaviors

Today this is mostly: `RoundPerLoopBehavior` + `SinglePassBehavior`.

### 2) “For N rounds” (bounded rounds)

- `RoundPerLoop`
- `BoundRepeater(totalRounds=N)`
- `ReportRoundsBehavior(totalRounds=N)`
- Optional: display rounds behavior

Today this is mostly: `RoundPerLoopBehavior` + `BoundLoopBehavior`.

### 3) “AMRAP until time expires” (time-bound loop)

- `BoundTimeBehavior(durationMs=T, direction='down')`
- `UnboundRepeater` (or no repeater at all; completion is time-based)
- A dedicated completion behavior like `CompleteWhenTimerExpires` (if you want completion to be explicit and testable)
- `RoundPerLoop` (if “rounds” exist conceptually)
- `ReportRoundsBehavior` (optional; often useful)
- `PlaySoundAtRemainingTime` cues (optional)

Today, `LoopCoordinatorBehavior` mixes: time-bound completion + round display + lap timers.

### 4) “EMOM / Intervals” (interval loop)

- `BoundTimeBehavior(intervalDurationMs)` (timer resets every interval)
- `RoundPerLoop` (interval count)
- `BoundRepeater(totalIntervals=N)`
- `DisplayTimer` + `DisplayRounds`
- Sound cues (on start/complete)

Today, `LoopCoordinatorBehavior` implements waiting logic + timer restarts + display updates.

### 5) “Rep scheme per round” (21-15-9)

- `RoundPerLoop`
- `BoundRepeater(totalRounds=N)`
- A “rep scheme state” provider (can be a small behavior that exposes `getTargetReps(round)`)
- `ReportMetricsBehavior` (optional)

Today, `LoopCoordinatorBehavior.getRepsForCurrentRound()` hints at this need, but it is bundled into the coordinator.

---

## Transition Plan (From Compound to Single Responsibility)

The migration can be done incrementally without breaking existing scripts/strategies.

### Step 1: Define the boundaries (no behavior does >1 concern)

Adopt the overlap matrix above as a rule for new code.

### Step 2: Introduce “single behaviors” as thin wrappers first

Create the target behaviors (even if internally they reuse existing code paths):

- `SingleRepeater` delegates to logic currently in `SinglePassBehavior`
- `BoundRepeater` delegates to the pop logic in `BoundLoopBehavior`
- `UnboundRepeater` is a no-op
- `ReportRoundsBehavior` extracts the `TrackRoundAction` emission currently in loop behaviors

This step is mostly mechanical and reduces coupling fast.

### Step 3: Stop mixing reporting into looping behaviors

Refactor compilation strategies to attach:

- repeater behavior (completion)
- round counter behavior (state)
- report behavior (side effect)

…instead of embedding reporting inside repeater.

Acceptance check:
- `BoundRepeater` should never emit `TrackRoundAction`.
- `ReportRoundsBehavior` should never emit `PopBlockAction`.

### Step 4: Carve display logic out of coordinators

Move `SetRoundsDisplayAction` and `UpdateDisplayStateAction` calls out of `LoopCoordinatorBehavior` into dedicated display behaviors.

Keep `LoopCoordinatorBehavior` focused on:

- index/position state
- child group selection
- producing `CompileAndPushBlockAction`
- interval waiting gate (if it truly must own this)

### Step 5: Split sound behaviors (optional but aligns with target list)

Either:

- keep `SoundBehavior` as a *compound* that is implemented by composing `PlaySoundAtElapsedTime` / `PlaySoundAtRemainingTime`, or
- replace it gradually with smaller behaviors that each handle one trigger mode.

Given `SoundBehavior` already has solid validation + dedupe state, a pragmatic transition is:

- implement `PlaySoundAtElapsedTime`/`RemainingTime` as wrappers that configure a shared internal “threshold cue engine”,
- keep the existing `SoundBehavior` API as a compatibility layer until strategies switch.

### Step 6: Deprecate compound behaviors

Once strategies no longer attach `BoundLoopBehavior`/`UnboundLoopBehavior`/`SinglePassBehavior` directly, mark them as legacy (or keep as aliases) and stop extending them.

---

## Practical Guardrails (To Prevent Overlap Reappearing)

- Composition order must be explicit when there are dependencies (e.g., `ChildIndexBehavior` before `RoundPerLoopBehavior`).
- Prefer event-driven cross-cutting behaviors (sound, display, reporting) over “polling” other behaviors inside loop coordinators.
- Each behavior should have a clearly documented:
  - inputs (other behaviors, events, memory refs)
  - outputs (actions/events)
  - lifecycle expectations

---

## Open Questions (Decisions Needed)

1. **What is the canonical definition of “RoundPerBlock” in this runtime?**
   - If it means “child index wrapped”, it aligns with current `RoundPerLoopBehavior`.
   - If it means “every next() is a round”, it aligns with `RoundPerNextBehavior`.

2. **Who should own ‘interval waiting’ gating?**
   - Coordinator (control flow) vs. a dedicated `IntervalGateBehavior`.

3. **Do we want timer expiry to cause `PopBlockAction`, or just stop producing children?**
   - Today, `LoopCoordinatorBehavior` marks complete and returns no further actions; some systems prefer explicit popping.

If you answer those, we can turn this doc into an actionable refactor checklist for the compiler strategies.
