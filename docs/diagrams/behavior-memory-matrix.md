# Behavior ↔ Memory Matrix

Quick reference showing which behaviors interact with which memory types.

**Legend:**
- **W** = Writes (sets initial value)
- **U** = Updates (modifies existing value)
- **R** = Reads (uses value for logic/output)
- **M** = Marks completion

## Timer Aspect

| Behavior | timer | completion | Notes |
|----------|:-----:|:----------:|-------|
| TimerInitBehavior | W | | Seeds spans, duration, direction, label |
| TimerTickBehavior | U | | Closes open span on unmount |
| TimerPauseBehavior | U | | Closes/opens spans on pause/resume |
| TimerCompletionBehavior | R | M | Checks elapsed vs duration → `timer-expired` |
| TimerOutputBehavior | R | | Emits duration/elapsed fragments |

## Round Aspect

| Behavior | round | display | completion | Notes |
|----------|:-----:|:-------:|:----------:|-------|
| RoundInitBehavior | W | | | Seeds current, total |
| RoundAdvanceBehavior | U | | | Increments current |
| RoundCompletionBehavior | R | | M | Checks current > total → `rounds-complete` |
| RoundDisplayBehavior | R | U | | Formats roundDisplay string |
| RoundOutputBehavior | R | | | Emits count fragments, milestones |

## Display Aspect

| Behavior | display | Notes |
|----------|:-------:|-------|
| DisplayInitBehavior | W | Seeds mode, label, subtitle |
| RoundDisplayBehavior | U | Updates roundDisplay |

## Controls Aspect

| Behavior | controls | Notes |
|----------|:--------:|-------|
| ButtonBehavior | W | Writes buttons[]; clears on unmount |

## Completion Aspect

| Behavior | completion | Trigger |
|----------|:----------:|---------|
| TimerCompletionBehavior | M | Timer elapsed ≥ duration |
| RoundCompletionBehavior | M | Round current > total |
| PopOnEventBehavior | M | Subscribed event fires |
| PopOnNextBehavior | M | next() called |

## Output/History Aspect

| Behavior | timer | round | fragment | Notes |
|----------|:-----:|:-----:|:--------:|-------|
| TimerOutputBehavior | R | | | Emits timer fragments |
| RoundOutputBehavior | | R | | Emits round fragments |
| SegmentOutputBehavior | | | R | Consumes block fragments |
| SoundCueBehavior | R | | | Reads countdown for cue timing |
| HistoryRecordBehavior | R | R | | Reads both for history:record event |

## Cross-Reference Summary

| Memory Type | Written By | Updated By | Read By |
|-------------|------------|------------|---------|
| **timer** | TimerInitBehavior | TimerTickBehavior, TimerPauseBehavior | TimerCompletionBehavior, TimerOutputBehavior, SoundCueBehavior, HistoryRecordBehavior |
| **round** | RoundInitBehavior | RoundAdvanceBehavior | RoundCompletionBehavior, RoundDisplayBehavior, RoundOutputBehavior, HistoryRecordBehavior |
| **display** | DisplayInitBehavior | RoundDisplayBehavior | (UI layer) |
| **controls** | ButtonBehavior | — | (UI layer) |
| **completion** | — | — | (via markComplete: TimerCompletionBehavior, RoundCompletionBehavior, PopOnEventBehavior, PopOnNextBehavior) |
| **fragment** | (parser) | — | SegmentOutputBehavior |

## Special Behaviors

| Behavior | Memory Impact | Notes |
|----------|--------------|-------|
| ChildRunnerBehavior | None | Compiles/pushes child blocks |
| IdleInjectionBehavior | None | Legacy no-op stub |
