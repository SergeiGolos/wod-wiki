# Behavior System Architecture Overview

This document outlines the architecture for Geminis Runtime Behaviors, moving from compound behaviors to single-responsibility, composable behaviors.

## Core Philosophy

The goal is to decompose complex behaviors (like `BoundLoopBehavior` or `TimerBehavior`) into atomic units that handle one specific aspect of the runtime lifecycle. This allows for greater flexibility, easier testing, and clearer separation of concerns.

### The "Overlap" Problem

Currently, behaviors often mix responsibilities:
- **Logic**: Deciding when a block starts, stops, or repeats.
- **State**: Maintaining internal counters or timers.
- **Reporting**: Sending events or actions to the analytics/history system.
- **Display**: Updating shared memory for the UI to render.

For example, `BoundLoopBehavior` currently handles:
1.  Checking if the loop limit is reached (Logic).
2.  Emitting `TrackRoundAction` (Reporting).

In the new architecture, these responsibilities are split.

---

## 1. Looping Behavior
*Responsibility: Decides if a block should repeat or complete based on iteration counts.*

These behaviors interact with the **Stack** logic (Push/Pop) but do **not** report data or track the "current round" number themselves (they read it from Round Behaviors).

| Behavior | Description | Current Equivalent / Status |
| :--- | :--- | :--- |
| **SingleRepeater** | Runs exactly once. Requests a Pop after the first pass. | `SinglePassBehavior.ts` |
| **BoundRepeater** | Runs for $N$ iterations. Requests a Pop when $Round > N$. | `BoundLoopBehavior.ts` (Logic part) |
| **UnboundRepeater** | Runs indefinitely until explicitly stopped by another mechanism (e.g., user input). | `UnboundLoopBehavior.ts` |

**Transition:**
- Extract tracking logic out of `BoundLoopBehavior`.
- Rename `SinglePassBehavior` to `SingleRepeater`.
- Rename `BoundLoopBehavior` to `BoundRepeater`.

## 2. Rounds Behavior
*Responsibility: Calculates and maintains the "Current Round" index.*

These behaviors provide the source of truth for "which iteration am I on?".

| Behavior | Description | Current Equivalent / Status |
| :--- | :--- | :--- |
| **RoundPerBlock** | Increments round count every time the `onNext` lifecycle is triggered (standard block re-entry). | `RoundPerNextBehavior.ts` |
| **RoundPerLoop** | Increments round count based on explicit loop signals (often used in complex nesting). | `RoundPerLoopBehavior.ts` |

**Transition:**
- These are mostly stable but need to be decoupled from reporting side-effects.

## 3. Timer Behaviors
*Responsibility: Manages the internal clock state (Started, Paused, Elapsed Time, Duration).*

These behaviors handle the physics of time but **not** the display or the reporting.

| Behavior | Description | Current Equivalent / Status |
| :--- | :--- | :--- |
| **UnboundTimedBehavior** | A stopwatch that runs potentially forever. | `UnboundTimerBehavior.ts` |
| **BoundTimeBehavior** | A timer with a fixed duration. Completes when time expires. | `BoundTimerBehavior.ts` |

**Transition:**
- `TimerBehavior` currently handles state management (`TimerStateManager`) AND event emission.
- Strip `TimerBehavior` down to pure state logic (start/stop/tick).
- Move shared memory updates to **Display Behaviors**.

## 4. Reporting Behaviors
*Responsibility: Emits Actions/Events for the History and Analytics systems.*

These are purely side-effect behaviors that observe state and report it.

| Behavior | Description | Transition Note |
| :--- | :--- | :--- |
| **Report Rounds Behavior** | Observes `RoundBehavior`. Emits `TrackRoundAction` on each iteration. | Extract from `BoundLoopBehavior`. |
| **Report Metrics Behavior** | Observes other state (reps, weight, etc.) and emits `TrackMetricAction`. | Extract from `RepSchemeBehavior` / others. |

## 5. Display Behaviors
*Responsibility: Updates the Shared Runtime Memory (Memory Blocks) for the UI.*

The UI is "dumb" and reads state from memory. These behaviors write that state.

| Behavior | Description | Transition Note |
| :--- | :--- | :--- |
| **Display Timer Behaviors** | Generic writer for timer state (running, paused, scalar value). | Extract `TimerStateManager` logic here. |
| **Display Stopwatch Behavior** | Formats and writes time as a count-up stopwatch (00:00 -> ...). | Specific formatting logic. |
| **Display Current Time Behavior** | Writes the current wall-clock time required for AMRAP or EMOM headers. | New behavior. |
| **Display Empty Timer Behavior** | Clears or sets a "placeholder" timer state. | New behavior. |

## 6. Sound Behaviors
*Responsibility: Triggers audio cues based on state changes.*

| Behavior | Description | Current Equivalent / Status |
| :--- | :--- | :--- |
| **PlaySoundAtEllapsedTime** | Triggers when `Elapsed > X`. | Part of `SoundBehavior` |
| **PlaySoundAtRemainingTime** | Triggers when `Duration - Elapsed < X`. | Part of `SoundBehavior` |
| **PlaySoundsOnStart** | Triggers on `onPush`. | New / Implicit |
| **PlaySoundsOnNext** | Triggers on `onNext` (Round start). | New / Implicit |
| **PlaySoundsOnStop** | Triggers on `onPop`. | New / Implicit |

**Transition:**
- `SoundBehavior` is currently a "God Class" for sounds. 
- Break it down into composable units so a block can just have `PlaySoundsOnStart(beep)` without needing a full timer definition.

## Summary of Changes

To achieve this architecture, we need to refactor the `TimerBehavior` and `BoundLoopBehavior` classes significantly.

1.  **Stop Inheritance for Logic**: Don't let behaviors inherit "Reporting" or "Display" capabilities. Use **Composition**.
    *   *Old*: `class BoundLoopBehavior extends ReportingBehavior` (Conceptual)
    *   *New*: A Block has `[BoundRepeater, ReportRoundsBehavior, RoundPerBlock]` attached.

2.  **Memory Separation**: Ensure Display Behaviors explicitly own the write-path to `SharedMemory`. Logic behaviors should just update their private state.

3.  **Event Driven**: Reporting Behaviors should listen to internal events or check state changes in `onNext`/`onPop` rather than being hardcoded into the logic loop.
