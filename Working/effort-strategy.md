
# Effort Strategy

The `EffortStrategy` is the default, fallback strategy used by the `JitCompiler`. It is intended for simple, repetition-based exercises that do not involve timers or multiple rounds.

## Matching Logic

The `EffortStrategy` matches a set of code statements if they meet the following criteria:

- The statement list is not empty.
- The first statement contains code fragments.
- None of the fragments are of type `FragmentType.Timer`.
- None of the fragments are of type `FragmentType.Rounds`.

Essentially, it matches any valid statement that isn't explicitly a timer or a rounds-based workout.

## Compilation Logic

When the `EffortStrategy` compiles a set of statements, it performs the following steps:

1.  **Generates a `BlockKey`**: A unique identifier for the new runtime block.
2.  **Extracts `exerciseId`**: If available, it extracts the exercise ID from the code statement.
3.  **Creates a `BlockContext`**: A context object for the block.
4.  **Creates Behaviors**: It attaches a `CompletionBehavior` that is configured to mark the block as complete immediately upon being pushed to the runtime stack. This is because effort blocks are considered "leaf nodes" in the workout execution tree.
5.  **Creates a `RuntimeBlock`**: It instantiates a new `RuntimeBlock` of type "Effort" with the created context and behaviors.
