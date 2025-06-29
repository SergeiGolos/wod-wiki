You've asked an excellent and insightful question that gets to the very heart of how this system operates. You are absolutely right to think that just `push`, `pop`, and `next` are insufficient. The `IRuntimeAction` set is essentially the "instruction set" or the "verbs" of the runtime engine. They are the commands that `IRuntimeBlock` instances issue to the `TimerRuntime` to manage the program's flow, state, and UI.

Based on the documentation and the files from the previous project, here is a breakdown of the necessary `IRuntimeAction`s, categorized by their function.

### 1. Execution Flow & Stack Management
These actions control the flow of the program by manipulating the `RuntimeStack`. This is what you were thinking of with `push`, `pop`, and `next`.

*   **`PushStatementAction`**: The fundamental "goto" or "call" instruction. It takes one or more `ICodeStatement`s, compiles them into a new `IRuntimeBlock` using the `JitCompiler`, and pushes that new block onto the execution stack. This is how the runtime drills down into nested parts of the workout.
*   **`PopBlockAction`**: The "return" instruction. It signals that the current block has finished its work. The `TimerRuntime` pops it from the stack, and control returns to the parent block (which will then likely call `next` to proceed).
*   **`PushNextAction`**: This is the "what's next?" instruction. It tells the *current* block to execute its `next()` method. This is crucial for sequences and loops. For example, a `RepeatingBlock`'s `next()` method would either push the next child statement or, if all rounds are done, issue a `PopBlockAction`.
*   **`PushIdleBlockAction` / `PushEndBlockAction`**: These are specialized "goto"s that push the dedicated `IdleRuntimeBlock` or `DoneRuntimeBlock` onto the stack, representing the start and end states of the entire program.

### 2. State & Timer Management
These actions directly manage the state of the timers and the blocks themselves.

*   **`StartTimerAction`**: Begins a new `ITimeSpan` within the current block's `ResultSpanBuilder`. It records the start timestamp. This action is often propagated up the parent chain.
*   **`StopTimerAction`**: Closes the current `ITimeSpan` by recording the stop timestamp.
*   **`ResetAction`**: A powerful action that tells the `TimerRuntime` to completely reset its state, clearing the stack, history, and results, and re-initializing from the `RootBlock`.
*   **`NotifyRuntimeAction`**: A critical action for handling asynchronous-like events. For example, the `TickHandler` doesn't directly pop a block when a timer expires. Instead, it issues a `NotifyRuntimeAction` containing a `CompleteEvent`. The runtime then processes this `CompleteEvent` in the main loop, allowing the block to handle its own completion gracefully. This decouples event detection from event handling.

### 3. UI & External Communication
These actions are the bridge between the runtime engine and the user-facing components.

*   **`SetButtonAction`**: Updates a named button anchor (e.g., "system" or "runtime") in the UI with a new set of buttons (`IActionButton[]`). This is how the UI changes from "Start" to "Pause", "End", etc.
*   **`SetSpanAction`**: This is the primary action for updating the main timer displays. It sends a `RuntimeSpan` object to a named UI anchor (e.g., "primary", "total"). The UI component listening to that anchor then updates its display with the new time, metrics, and effort text.
*   **`SetDurationAction`**: Informs the UI about the total duration of a timer, which is essential for components like progress bars or countdown displays.
*   **`PlaySoundAction`**: Triggers an audio cue for the user (e.g., start beep, end beep).

### 4. Data & Metric Management
These actions are responsible for outputting the final, reportable data from the workout.

*   **`WriteResultAction`**: When a leaf-node block (like an `EffortBlock`) completes, it uses this action to send its final `RuntimeSpan` to the results panel for display and aggregation.
*   **`WriteLogAction`**: Used for debugging and tracing. It writes an `IRuntimeLog` event to the history log.

### Summary Table

| Action Category | `IRuntimeAction` | Purpose | Example Trigger (Event) |
| :--- | :--- | :--- | :--- |
| **Execution Flow** | `PushStatementAction` | Compile and run a new block. | `RunEvent`, `NextEvent` |
| | `PopBlockAction` | Finish current block, return to parent. | `CompleteEvent` |
| | `PushNextAction` | Ask the current block what to do next. | `CompleteEvent`, `RunEvent` |
| **State & Timer** | `StartTimerAction` | Start a new timespan. | `StartEvent`, `RunEvent` |
| | `StopTimerAction` | Stop the current timespan. | `StopEvent`, `EndEvent` |
| | `ResetAction` | Reset the entire workout. | `ResetEvent` |
| | `NotifyRuntimeAction` | Send an event for the system to process. | `TickEvent` (when timer expires) |
| **UI & External** | `SetButtonAction` | Update UI buttons. | `StartEvent`, `StopEvent` |
| | `SetSpanAction` | Update a timer/metric display. | `onEnter` of a block |
| | `PlaySoundAction` | Play an audio cue. | `CompleteEvent` |
| **Data & Metrics** | `WriteResultAction` | Send a completed span to the results panel. | `onLeave` of a leaf block |
| | `WriteLogAction` | Record an event for debugging. | Any event |

This comprehensive set of actions allows the system to handle the edge cases you were thinking about. The combination of a stack (`Push`/`Pop`), a "next" instruction (`PushNextAction`), and an internal eventing system (`NotifyRuntimeAction`) creates a robust state machine capable of managing complex, nested, and timed workout logic.