# Unit Test Plan

This document provides a detailed listing of the tests to be implemented for the WOD Wiki runtime, following the structure defined in [Unit Test Template](./unit-test-template.md).

## Level 1: Compiler-Level Unit Testing

Tests in this section verify that the JIT compiler correctly translates WOD scripts into `RuntimeBlock` instances with the expected strategies, fragments, and properties.

### 1.1. RoundsStrategy
- [x] **Should create a RoundsBlock for simple round counts**
    - Input: `rounds 5`
    - Assert: Block is `RoundsBlock`, `totalRounds` is 5, `LoopCoordinatorBehavior` is present.
- [x] **Should create a RoundsBlock for rep schemes (e.g., 21-15-9)**
    - Input: `21-15-9 reps`
    - Assert: `repScheme` array is `[21, 15, 9]`, `loopType` is `REP_SCHEME`.
- [x] **Should attach HistoryBehavior**
    - Assert: `HistoryBehavior` is present with label "Rounds".

### 1.2. TimerStrategy
- [x] **Should create a TimerBlock for countdown**
    - Input: `timer 10s`
    - Assert: Block is `TimerBlock`, `duration` is 10000ms, direction 'down'.
- [x] **Should create a TimerBlock for count-up/for-time**
    - Input: `for time` (or similar construct)
    - Assert: Direction 'up', no fixed duration implies open-ended or specific stop condition.
- [x] **Should attach SoundBehavior**
    - Assert: `SoundBehavior` is configured with default countdown cues.

### 1.3. TimeBoundRoundsStrategy (AMRAP)
- [x] **Should create a block with infinite loops and a timer**
    - Input: `amrap 10:00`
    - Assert: `LoopCoordinatorBehavior` has `loopType: TIME_BOUND`, `totalRounds` is Infinity. `TimerBehavior` has 10 min duration.
- [x] **Should configure CompletionBehavior correctly**
    - Assert: Completion depends on Timer expiry, not Loop completion.

### 1.4. IntervalStrategy (EMOM)
- [x] **Should create a block with interval looping**
    - Input: `emom 10`
    - Assert: `LoopCoordinatorBehavior` has `loopType: INTERVAL`, `intervalDuration` is 60s (default) or specified.
- [x] **Should configure TimerBehavior for intervals**
    - Assert: Timer resets on interval.

### 1.5. EffortStrategy
- [x] **Should create an EffortBlock for exercises**
    - Input: `10 push-ups`
    - Assert: `EffortBlock`, `reps` configured to 10 (if applicable), `HistoryBehavior` present.

---

## Level 2: Runtime Integration Testing

Tests in this section use the `CustomTestRuntime` to verify state changes and behavior interactions during execution.

### 2.1. LoopCoordinatorBehavior
*   **Fixed Loops**: Should iterate exactly N times.
    *   Arrange: Rounds block with 3 rounds.
    *   Act: Call `next()` repeatedly or completion events.
    *   Assert: Current round index increments, block pops after 3rd round completion.
*   **Rep Schemes**: Should provide correct rep count for current round.
    *   Arrange: 21-15-9 block.
    *   Act: Advance rounds.
    *   Assert: Round 1 has 21 reps, Round 2 has 15, Round 3 has 9.
*   **Time Bound**: Should loop indefinitely until stopped.
    *   Arrange: AMRAP block.
    *   Act: Complete children repeatedly.
    *   Assert: Rounds keep incrementing beyond initial guess.
*   **Intervals**: Should wait for timer before starting next round.
    *   Arrange: EMOM block.
    *   Act: Finish work early.
    *   Assert: Runtime waits for `timer:complete` before pushing next round's children.

### 2.2. TimerBehavior
*   **Countdown**: Should emit completion event at 0.
    *   Arrange: Timer 10s.
    *   Act: `tick(10000)`.
    *   Assert: `timer:complete` emitted, block pops.
*   **Pause/Resume**: Should track total elapsed time correctly across pauses.
    *   Arrange: Start, tick 5s, pause, tick 5s (paused), resume, tick 5s.
    *   Assert: Elapsed is 10s, not 15s.
*   **AutoStart**: Should start immediately if configured.
    *   Assert: `onPush` triggers start.

### 2.3. CompletionBehavior
*   **Condition Check**: Should pop block when condition is met.
    *   Arrange: Block with "reps done" condition.
    *   Act: Update reps to target.
    *   Assert: `PopBlockAction` returned/executed.

### 2.4. HistoryBehavior
*   **Span Creation**: Should create TrackedSpan on push.
    *   Assert: `runtime.tracker.currentSpan` matches block.
*   **Metrics**: Should capture final metrics on pop.
    *   Act: Block completes.
    *   Assert: Span has end time and collected metrics (reps, time).

### 2.5. SoundBehavior
*   **Cues**: Should emit sound actions at thresholds.
    *   Arrange: Timer with 3-2-1 beep.
    *   Act: Tick to 3s remaining.
    *   Assert: `PlaySoundAction` ('tick') emitted.

### 2.6. IdleBehavior
*   **Pop on Next**: Should pop when `next()` is called.
    *   Arrange: Idle block (e.g., "Get Ready").
    *   Act: `runtime.next()`.
    *   Assert: Block pops, next block starts.
*   **Pop on Event**: Should pop when specific event fires.
    *   Arrange: Idle block waiting for `view-results`.
    *   Act: Emit `view-results`.
    *   Assert: Block pops.

---

## Level 3: End-to-End Execution Testing

Tests in this section run full WOD scripts to completion and validate the `ExecutionRecord`.

### 3.1. Workflows
*   **"Grace" (Clean & Jerk Rep Scheme)**
    *   Script: `30 clean-and-jerks for time`.
    *   Validation: Single block, count-up timer, correct total reps recorded.
*   **"Cindy" (AMRAP 20)**
    *   Script: `Amrap 20: 5 pull-ups, 10 push-ups, 15 squats`.
    *   Validation: Duration approx 20m, loop count > 1, correct metrics aggregation.
*   **"Tabata" (Deep Nesting/Intervals)**
    *   Script: `Tabata Squats` (8 rounds: 20s work, 10s rest).
    *   Validation: Total time 4m, 8 work intervals recorded, 8 rest intervals (or gaps) handling.
*   **"Fight Gone Bad" (Complex EMOM/Station)**
    *   Script: 3 rounds of 5 stations, 1 min each.
    *   Validation: Correct structural hierarchy, total time 17m (with rest), accurate per-station metrics.

### 3.2. Data Integrity
*   **ExecutionRecord**: verify JSON serialization.
*   **Resume Capability**: (Future) Verify picking up from a saved state.
