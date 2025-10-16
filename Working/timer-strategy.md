
# Timer Strategy

The `TimerStrategy` is responsible for handling time-bound workout segments. It has a higher precedence than the `RoundsStrategy` and the `EffortStrategy`.

## Matching Logic

The `TimerStrategy` matches a set of code statements if they contain at least one fragment of type `FragmentType.Timer`. This makes it the designated strategy for any workout that involves a timer, such as AMRAPs (As Many Rounds As Possible) or "For Time" workouts.

## Compilation Logic

Upon a successful match, the `TimerStrategy` compiles the statements into a `RuntimeBlock` by following these steps:

1.  **Generates a `BlockKey`**: A unique identifier for the new runtime block.
2.  **Extracts `exerciseId`**: If available, it extracts the exercise ID from the code statement.
3.  **Creates a `BlockContext`**: A context object for the block.
4.  **Allocates Timer Memory**: It allocates memory in the runtime for tracking the timer's state, including `timeSpans` and an `isRunning` flag.
5.  **Creates Behaviors**: It creates and attaches a `TimerBehavior`. The `TimerBehavior` is initialized with the memory references allocated in the previous step. The direction of the timer (e.g., 'up' or 'down') and its duration are extracted from the code fragments.
6.  **Creates a `RuntimeBlock`**: It instantiates a new `RuntimeBlock` of type "Timer" with the created context and behaviors.
