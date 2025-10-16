
# An Analysis of Runtime Strategies in the WOD.Wiki System

## 1.0 Executive Summary

This report provides a comprehensive analysis of the runtime strategies employed in the WOD.Wiki system. The system utilizes a Just-In-Time (JIT) compiler to dynamically select and apply different strategies for compiling workout scripts into executable runtime blocks. This strategy pattern allows for a flexible and extensible architecture where different types of workouts (e.g., time-based, round-based, or simple efforts) can be handled by specialized logic. The core of this mechanism is the `JitCompiler`, which iterates through a list of registered strategy implementations and selects the first one that matches the structure of the workout script. This report details the identified strategies, the selection process, and the underlying components that constitute the runtime engine.

## 2.0 Current Landscape and Key Components

The runtime system is composed of several key components that work together to parse, compile, and execute workout scripts.

*   **`JitCompiler`**: The central component responsible for strategy selection and compilation. It maintains a list of `IRuntimeBlockStrategy` implementations.
*   **`IRuntimeBlockStrategy`**: An interface that defines the contract for all strategy implementations. It includes a `match` method to determine applicability and a `compile` method to execute the compilation.
*   **Concrete Strategies**: These are the implementations of `IRuntimeBlockStrategy`. The system currently includes `TimerStrategy`, `RoundsStrategy`, and `EffortStrategy`.
*   **`RuntimeBlock`**: The base class for all executable workout blocks. These blocks are the output of the compilation process.
*   **Behaviors**: These are modules that can be attached to `RuntimeBlock` instances to provide specific functionalities, such as timing (`TimerBehavior`), loop management (`LoopCoordinatorBehavior`), and completion tracking (`CompletionBehavior`).

## 3.0 Technical Deep Dive: The Strategies

The WOD.Wiki runtime employs three primary strategies for compiling workout scripts. Each strategy is designed to handle a specific type of workout structure.

### 3.1 TimerStrategy

The `TimerStrategy` is designed for time-bound workouts.

*   **Description**: Handles workouts that are performed "For Time" or "AMRAP" (As Many Rounds As Possible).
*   **Matching Logic**: It matches any workout script that contains a `Timer` fragment.
*   **Compilation**: It creates a `RuntimeBlock` of type "Timer" and attaches a `TimerBehavior` to manage the timing logic.
*   **Further Reading**: [Timer Strategy Details](./timer-strategy.md)

### 3.2 RoundsStrategy

The `RoundsStrategy` is used for workouts that are structured into multiple rounds.

*   **Description**: Manages workouts that consist of a set number of rounds of one or more exercises.
*   **Matching Logic**: It matches workout scripts that contain a `Rounds` fragment but **do not** contain a `Timer` fragment. This gives the `TimerStrategy` higher precedence.
*   **Compilation**: It creates a `RuntimeBlock` of type "Rounds". The intended behavior is to use a `LoopCoordinatorBehavior` to manage the rounds, although the current implementation has a temporary, simpler behavior.
*   **Further Reading**: [Rounds Strategy Details](./rounds-strategy.md)

### 3.3 EffortStrategy

The `EffortStrategy` is the default, fallback strategy.

*   **Description**: Handles simple, repetition-based exercises that do not have a time or round structure.
*   **Matching Logic**: It matches any workout script that does not contain a `Timer` or `Rounds` fragment.
*   **Compilation**: It creates a `RuntimeBlock` of type "Effort" with a simple `CompletionBehavior` that marks it as complete immediately, as it is considered a "leaf" in the execution tree.
*   **Further Reading**: [Effort Strategy Details](./effort-strategy.md)

## 4.0 Strategy Selection Crosswalk

The selection of a strategy is determined by the `JitCompiler`, which iterates through the registered strategies in a specific order and selects the first one that returns `true` from its `match` method. The order of precedence is crucial for the correct interpretation of workout scripts.

| Precedence | Strategy | Matching Condition | Resulting Block Type |
| :--- | :--- | :--- | :--- |
| 1 | `TimerStrategy` | Statement contains a `Timer` fragment. | `Timer` |
| 2 | `RoundsStrategy` | Statement contains a `Rounds` fragment AND no `Timer` fragment. | `Rounds` |
| 3 | `EffortStrategy` | Statement contains neither a `Timer` nor a `Rounds` fragment. | `Effort` |

This hierarchical selection process is visualized in the diagram below.

## 5.0 Visual Diagrams

To better illustrate the concepts discussed in this report, two diagrams have been generated.

### 5.1 Runtime Strategy Selection Flowchart

This flowchart illustrates the decision-making process within the `JitCompiler` when selecting a strategy.

![Runtime Strategy Selection Flowchart](./diagrams.md#runtime-strategy-selection-flowchart)

### 5.2 Runtime Components Class Diagram

This class diagram shows the relationships between the key components of the runtime system.

![Runtime Components Class Diagram](./diagrams.md#runtime-components-class-diagram)

*Note: The diagrams are located in the [diagrams.md](./diagrams.md) file.*

## 6.0 Conclusion and Strategic Recommendations

The strategy pattern employed in the WOD.Wiki runtime provides a robust and extensible foundation for handling diverse workout structures. The clear separation of concerns between the `JitCompiler`, the strategies, and the behaviors allows for modular development and easy addition of new workout types in the future.

Based on the analysis, the following recommendations are proposed:

1.  **Complete `RoundsStrategy` Implementation**: The `RoundsStrategy` currently has a temporary implementation. It should be updated to fully utilize the `RoundsBlock` and `LoopCoordinatorBehavior` to properly handle multi-round workouts.
2.  **Formalize Strategy Registration Order**: The order of strategy registration in the `JitCompiler` is critical. This order should be explicitly defined and documented to prevent subtle bugs if more strategies are added in the future.
3.  **Enhance `TimerStrategy`**: The `TimerStrategy` could be enhanced to extract more detailed information from the workout script, such as the timer's direction ('up' or 'down') and duration, to create more specialized `TimerBlock` configurations.
