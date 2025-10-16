
# Rounds Strategy

The `RoundsStrategy` is used for workouts that are structured into multiple rounds. It has a lower precedence than the `TimerStrategy` but a higher precedence than the `EffortStrategy`.

## Matching Logic

The `RoundsStrategy` matches a set of code statements if the following conditions are true:

- The statements contain at least one fragment of type `FragmentType.Rounds`.
- The statements do **not** contain any fragments of type `FragmentType.Timer`.

This ensures that workouts like "3 Rounds For Time" are handled by the `TimerStrategy` (which takes precedence), while workouts like "5 rounds of 10 push-ups" are handled by this strategy.

## Compilation Logic

When the `RoundsStrategy` compiles a set of statements, it does the following:

1.  **Generates a `BlockKey`**: A unique identifier for the new runtime block.
2.  **Extracts `exerciseId`**: If available, it extracts the exercise ID from the code statement.
3.  **Creates a `BlockContext`**: A context object for the block.
4.  **Creates Behaviors**: The intention is for this strategy to use the `RoundsBlock` which internally uses the `LoopCoordinatorBehavior` to manage the execution of rounds. However, the current implementation creates a simple `CompletionBehavior` that marks the block as complete immediately. This is noted as a temporary implementation in the source code, with a TODO to integrate the `RoundsBlock` directly.
5.  **Creates a `RuntimeBlock`**: It instantiates a new `RuntimeBlock` of type "Rounds" with the created context and behaviors.
