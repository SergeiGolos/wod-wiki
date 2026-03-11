# Testing Workout Fixtures

This document describes the testing fixtures created for validating the workout runtime and time behavior within Storybook and Playwright.

## Goals

- **Speed:** Workouts are designed to complete in seconds rather than minutes.
- **Coverage:** Address all major loop types and block structures in the workout DSL.
- **Predictability:** Fixed durations and counts to ensure deterministic test results.

## Logical Groupings

### 1. Loops

These tests validate the behavior of different loop constructs in the DSL.

#### Fixed Rounds
- **Group:** `Loops/Fixed`
- **Focus:** Validating that the specified number of rounds/sets are executed.
- **Fixture:** `3 rounds of 1s rest` (Total: 3s)

#### For Time
- **Group:** `Loops/ForTime`
- **Focus:** Validating the stopwatch behavior and completion upon reaching a target.
- **Fixture:** `For time: 2 rounds of 1s rest` (Total: 2s + overhead)

#### EMOM (Every Minute on the Minute)
- **Group:** `Loops/EMOM`
- **Focus:** Validating the interval timer behavior and lap transitions.
- **Fixture:** `EMOM 3: 1s exercise` (3 intervals of 1s, each starting at the beginning of its minute/period). *Note: For testing, we may use shorter periods if the DSL supports it, or just validate the first few seconds.*

#### AMRAP (As Many Reps As Possible)
- **Group:** `Loops/AMRAP`
- **Focus:** Validating the countdown timer and completion.
- **Fixture:** `AMRAP 5s: 1s rest` (Total: 5s)

#### Tabata / Intervals
- **Group:** `Loops/Intervals`
- **Focus:** Validating work/rest transitions.
- **Fixture:** `8 rounds: 1s work / 1s rest` (Total: 16s)

### 2. Blocks

These tests validate how different block types are rendered and tracked.

#### Simple Exercises
- **Group:** `Blocks/Simple`
- **Focus:** Basic exercise rendering and manual/timed completion.
- **Fixture:** List of 3 exercises with 1s durations.

#### Nested Rounds
- **Group:** `Blocks/Nested`
- **Focus:** Correct stack tracking and UI nesting for complex workouts.
- **Fixture:** `2 rounds: { 2 rounds: 1s rest }`

#### Rest Periods
- **Group:** `Blocks/Rest`
- **Focus:** Automatic transitions during rest periods.
- **Fixture:** Exercise followed by 1s rest, repeated.

#### Weighted Exercises
- **Group:** `Blocks/Metadata`
- **Focus:** Metadata (weight, distance) being correctly passed to the runtime and analytics.
- **Fixture:** Exercises with `@20kg`, `@100m`, etc.

## Usage in Storybook

The testing stories are located in `stories/Testing`. Each story uses the `StorybookWorkbench` component with a specific workout fixture.

To run these tests manually:
1. Open Storybook.
2. Navigate to `Testing` section.
3. Select a story.
4. Switch to 'Track' view.
5. Press 'Start'.

For Playwright automation:
- The tests should wait for the 'Track' view to be active.
- Trigger 'Start' via a click or RPC.
- Monitor the timer and active segment IDs.
