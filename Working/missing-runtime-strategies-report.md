
# Analysis of Missing Runtime Strategies for WOD.Wiki

## 1.0 Executive Summary

This report identifies critical gaps in the WOD.Wiki runtime engine's strategy-based compilation system. While the current architecture, which leverages a `JitCompiler` to select from a set of predefined strategies, is robust and extensible, it currently fails to support several common and important workout syntaxes. This analysis, based on a review of the project's technical specifications, data models, and source code, has identified the need for three new strategies: an `IntervalStrategy` for EMOM (Every Minute On the Minute) workouts, a `TimeBoundRoundsStrategy` for AMRAP (As Many Rounds As Possible) workouts, and a `GroupStrategy` for nested exercises. The implementation of these strategies is essential to fulfill the intended feature set of the WOD.Wiki platform and provide a complete user experience.

## 2.0 Current Strategy Landscape

The runtime engine currently employs three strategies, each targeting a basic workout structure:

*   **`EffortStrategy`**: A fallback strategy for simple, single-exercise, repetition-based efforts.
*   **`TimerStrategy`**: Handles workouts with a simple time component, such as a single "For Time" block.
*   **`RoundsStrategy`**: Manages workouts consisting of a fixed number of rounds.

While these strategies cover the most basic workout types, they are insufficient for more complex, composite workout structures that are common in fitness programming.

## 3.0 Analysis of Unsupported Workout Syntaxes

A thorough review of the project's documentation (`specs/main/spec.md` and `specs/main/data-model.md`) and source code has revealed several unsupported, yet intended, workout syntaxes.

### 3.1 EMOM (Every Minute On the Minute) Workouts

The test scenarios outlined in `specs/main/spec.md` explicitly mention the need to support "EMOM with multiple exercises." This type of workout involves performing a set of exercises at the start of each minute for a specified number of minutes. The current strategies cannot handle this interval-based logic. The `LoopCoordinatorBehavior` contains a `LoopType.INTERVAL`, indicating that this functionality was planned, but no corresponding strategy exists to trigger it.

### 3.2 AMRAP (As Many Rounds As Possible) Workouts

AMRAP workouts, also mentioned as a required test scenario, involve completing as many rounds as possible within a specific time frame. The current `TimerStrategy` can create a timer, and the `RoundsStrategy` can handle rounds, but there is no strategy that can combine these two concepts to create a time-bound, round-based workout. The `LoopCoordinatorBehavior`'s `LoopType.TIME_BOUND` and a `TODO` comment in `src/runtime/blocks/TimerBlock.ts` about supporting child blocks both point to the need for this functionality.

### 3.3 Grouped and Nested Exercises

The `data-model.md` file defines a `blockType` of `group`, and the test scenarios mention "Nested rounds with timers." This implies a need to group exercises or blocks within a larger structure. For example, a single round might consist of a group of several exercises. The current system lacks a `GroupStrategy` to parse and compile such structures, limiting the complexity of workouts that can be represented.

## 4.0 Proposed New Strategies

To address the identified gaps, this report proposes the creation of three new strategies.

### 4.1 `IntervalStrategy`

*   **Purpose**: To support interval-based workouts like EMOMs.
*   **Proposed `match` Logic**: The strategy should match workout syntax that specifies an interval, such as "every 1 minute for 10 minutes" or "EMOM 10".
*   **Proposed `compile` Logic**: The strategy would compile the statements into a `RuntimeBlock` that utilizes a `LoopCoordinatorBehavior` configured with `LoopType.INTERVAL`. It would extract the interval duration and the total number of intervals from the workout script.

### 4.2 `TimeBoundRoundsStrategy`

*   **Purpose**: To support AMRAP workouts.
*   **Proposed `match` Logic**: This strategy should match syntax that combines a time limit with rounds, such as "20 minute AMRAP" or "AMRAP 20". It should have a higher precedence than the simple `TimerStrategy` and `RoundsStrategy`.
*   **Proposed `compile` Logic**: It would compile the workout into a `TimerBlock` that wraps a `RoundsBlock`. The `TimerBlock` would enforce the time limit, while the `RoundsBlock` would be configured to loop indefinitely until the timer completes. This would leverage the `LoopCoordinatorBehavior` with the `LoopType.TIME_BOUND`.

### 4.3 `GroupStrategy`

*   **Purpose**: To allow for the grouping and nesting of exercises and other blocks.
*   **Proposed `match` Logic**: The strategy should match syntax that indicates a grouping, such as parentheses or brackets enclosing a set of exercises.
*   **Proposed `compile` Logic**: It would create a container `RuntimeBlock` with the `blockType` of `group`. This block's primary role would be to hold and manage a list of child blocks, enabling the creation of more complex and nested workout structures.

## 5.0 Supporting Evidence from the Codebase

The need for these new strategies is not merely speculative; it is supported by evidence within the existing codebase:

*   **`LoopType` Enum**: The `LoopCoordinatorBehavior` already defines `LoopType.INTERVAL` and `LoopType.TIME_BOUND`, clearly indicating that EMOM and AMRAP-style workouts were anticipated.
*   **`blockType` Definition**: The `data-model.md` file defines a `blockType` of `group`, showing that the concept of grouping blocks is part of the system's intended design.
*   **`TODO` Comments**: A `TODO` comment in `src/runtime/blocks/TimerBlock.ts` explicitly states the need to support children, which is a prerequisite for the `TimeBoundRoundsStrategy`. Another `TODO` in `src/runtime/behaviors/LoopCoordinatorBehavior.ts` mentions the need to implement timer checking, which is the core logic for time-bound loops.

## 6.0 Conclusion and Recommendations

The WOD.Wiki runtime engine is built on a solid, strategy-based foundation. However, to achieve the full vision outlined in the project's own specification documents, it is imperative that the missing strategies are implemented. The current implementation supports only the most basic workout types, leaving common and essential formats like EMOM and AMRAP unsupported.

It is therefore strongly recommended that the development team prioritize the creation of the `IntervalStrategy`, `TimeBoundRoundsStrategy`, and `GroupStrategy`. The implementation of these strategies will close the existing gaps in workout syntax coverage, unlock the full potential of the `LoopCoordinatorBehavior`, and enable the WOD.Wiki platform to accurately represent and execute the wide variety of workouts envisioned in its design.
