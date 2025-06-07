# IRuntimeBlock Lifecycle Methods: Current State Summary (June 7, 2025)

This document summarizes the current understanding and implementation of the `IRuntimeBlock` lifecycle methods: `enter`, `next`, `leave`, `onStart`, and `onStop`. The goal is to clarify their contracts, identify inconsistencies, and provide a basis for future refinement of the TimerRuntime system.

## 1. `enter(runtime: ITimerRuntime): IRuntimeAction[]`

### General Purpose & How Called

-   **Purpose**: Called when a block is pushed onto the runtime stack and becomes the active block. It's responsible for initializing the block's state, setting up UI elements (like buttons or timer displays), and returning any initial actions that need to be processed immediately.
-   **Called By**: `TimerRuntime.push()` after a block is added to the `RuntimeTrace` (stack). The actions returned are immediately applied by the runtime.

### Implementation Summary Across Block Types

> TODO  Create new Plan to implement document that allows the current runtime block to handle the following responsibilities for each of the states:
 > onEnter: 
 > - generic -- Create a ResultSpan 
 > - Individual identify inherited fragments/metrics 



-   **`RuntimeBlock.ts` (Base Class - public wrapper for protected `onEnter`)**:
    -   Logs the entry into the block: `console.log(\`>>>>> doEnter >>>>>: \${this.blockKey} -- \${this.constructor.name}\`);`
    -   Calls the protected abstract `onEnter()` method, which concrete classes must implement.
-   **`RootBlock.ts` (`onEnter`)**:
    -   Resets its internal `_sourceIndex`.
    -   Creates a `ResultSpan` for itself.
    -   Returns actions: `SetButtonAction` (to show the "start" button), `PushIdleBlockAction` (to push the initial `IdleRuntimeBlock`).
-   **`IdleRuntimeBlock.ts` (`onEnter`)**:
    -   Returns actions: `SetButtonAction` (to show "start" button and clear runtime buttons), `SetSpanAction` (to set the primary display span).
-   **`TimerBlock.ts` (`onEnter`)**:
    -   Returns actions: `StartTimerAction` (to start its own timer), `SetButtonAction` (to show "end", "pause", "complete" buttons), and `SetDurationAction` if the timer has a countdown duration.
-   **`EffortBlock.ts` (`onEnter`)**:
    -   (Implementation details were sparse in the search results for `onEnter` specifically, but generally sets up for an effort that the user completes).
    -   Likely returns actions to display relevant UI for the effort, potentially starting a timer if the effort is timed.
-   **`RepeatingBlock.ts` (`onEnter`)**:
    -   Calls `this.next(runtime)` to determine the first set of actions.
    -   Returns those actions along with: `SetButtonAction` (to show "end", "pause", "complete" buttons).
-   **`TimedGroupBlock.ts` (`onEnter`)**:
    -   If it has a `duration`:
        -   Generates a `timerId`.
        -   Pushes `SetDurationAction`, `SetButtonAction` (for "end", "pause", "complete").
    -   Else (no duration):
        -   Pushes `SetButtonAction` (for "end" button).
    -   Crucially, it then calls `...this.onNext(runtime)` and includes those actions in its return. This is a point of interest as `enter` directly calls `next`.
-   **`DoneRuntimeBlock.ts` (`onEnter`)**:
    -   Returns actions: `SetButtonAction` (to show "reset", "save" buttons and clear runtime buttons).

### Noted Inconsistencies & Observations

1.  **`enter` calling `next`**: `TimedGroupBlock` and `RepeatingBlock` call `next()` within their `onEnter()` method. This blurs the lines between initializing a block and advancing its state. Typically, `enter` should only set up the block, and a subsequent event or explicit call to `next` (or runtime processing loop) should advance it.
2.  **Button Setup**: Most blocks set up buttons, which is consistent. The specific buttons depend on the block's purpose.
3.  **Timer Handling**: `TimerBlock` and `TimedGroupBlock` explicitly manage timer-related actions (`StartTimerAction`, `SetDurationAction`).
4.  **Initial Child Pushing**: `RootBlock` pushes `IdleRuntimeBlock`. `RepeatingBlock` and `TimedGroupBlock` effectively push their first child/set of statements via the `onNext` call within `onEnter`.

### Feedback & Planning (for `enter`)

-   \[Space for feedback]
-   **Proposal**: Standardize `enter` to *only* perform initialization. Advancing to the first piece of work within the block should be handled by a subsequent `next` call or a different mechanism.
-   **Question**: Should `enter` always return a set of actions, or can it sometimes return an empty array if no immediate UI changes or setup actions are needed?

## 2. `next(runtime: ITimerRuntime): IRuntimeAction[]`

### General Purpose & How Called

-   **Purpose**: Called to advance the internal state of the currently active block. This could mean processing the next item in a sequence, checking for completion conditions, or determining the next set of child statements/blocks to execute.
-   **Called By**:
    -   Internally by some blocks within `onEnter` (e.g., `TimedGroupBlock`, `RepeatingBlock`) as noted above.
    -   The `TimerRuntime` doesn't seem to have a main loop that explicitly calls `next()` on the current block after `enter()` or after an event is handled. Event handlers within blocks often return `PopBlockAction` or `PushStatementAction`, which changes the active block rather than calling `next` on the current one. This is a key area for investigation.
    -   The `IRuntimeBlock` interface defines it, and `RuntimeBlock.ts` provides a public wrapper that increments `this.blockKey.index` and then calls the protected abstract `onNext()`.

### Implementation Summary Across Block Types

-   **`RuntimeBlock.ts` (Base Class - public wrapper for protected `onNext`)**:
    -   Increments `this.blockKey.index`.
    -   Logs the call: `console.log(\`----- doNext -----: \${this.blockKey} -- \${this.constructor.name}\`);`
    -   Calls the protected abstract `onNext()` method.
-   **`RootBlock.ts` (`onNext`)**:
    -   Checks if `_sourceIndex` is past the end of its children.
        -   If so, returns `PushEndBlockAction`.
    -   Gets the next child statements using `nextChildStatements()`.
        -   If no statements, returns `PopBlockAction`.
    -   Increments `_sourceIndex`.
    -   Returns `PushStatementAction` with the child statements.
-   **`IdleRuntimeBlock.ts` (`onNext`)**:
    -   Returns `PopBlockAction` (to remove itself and allow the main workout to start).
-   **`TimerBlock.ts` (`onNext`)**:
    -   Returns `PopBlockAction` (signifying the timer has completed its primary phase).
-   **`EffortBlock.ts` (`onNext`)**:
    -   If `this.blockKey.index >= 1` (meaning it has already been "entered" or processed once), returns `PopBlockAction`. Otherwise, returns `[]`. This suggests `next` is used as a signal for completion.
-   **`RepeatingBlock.ts` (`onNext`)**:
    -   Complex logic:
        -   Checks for an "end" event in runtime history to `PopBlockAction`.
        -   Manages `roundIndex` and `childIndex`.
        -   If all rounds/children are done, returns `PopBlockAction`.
        -   Gets next child statements using `nextChildStatements()`.
        -   If no statements, returns `PopBlockAction`.
        -   Increments `childIndex`.
        -   Returns `PushStatementWithTimerAction` (if block has inheritable duration) or `PushStatementAction`.
-   **`TimedGroupBlock.ts` (`onNext`)**:
    -   Checks for an "end" event to `PopBlockAction`.
    -   Gets next child statements using `nextChildStatements()`.
    -   If no statements:
        -   If no block `duration`, returns `PopBlockAction`.
        -   Else (has duration, but no more children to run, implies waiting for timer), returns `[]`.
    -   Increments `childIndex`.
    -   Returns `PushStatementWithTimerAction` (if block has duration and `timerId`) or `PushStatementAction`.
-   **`DoneRuntimeBlock.ts` (`onNext`)**:
    -   Returns `[]` (it's a terminal state).

### Noted Inconsistencies & Observations

1.  **Invocation of `next`**: The primary concern is *when* and *how* `next` is called. It's not consistently called by the `TimerRuntime`'s main loop after each action or event. Its use seems more specialized within certain blocks or as a response to specific internal logic.
2.  **Role of `next`**:
    -   For `IdleRuntimeBlock`, `TimerBlock`, `EffortBlock`, `next` seems to primarily signal completion by returning `PopBlockAction`.
    -   For container blocks (`RootBlock`, `RepeatingBlock`, `TimedGroupBlock`), `next` is about advancing to the next piece of work (child statement/block).
3.  **Return Value**: Can return `PopBlockAction`, `PushStatementAction`, `PushStatementWithTimerAction`, `PushEndBlockAction`, or `[]`. The empty array `[]` implies "stay in this block, no immediate further statements to push, possibly waiting for an event or timer".

### Feedback & Planning (for `next`)

-   \[Space for feedback]
-   **Proposal**: Clarify the role of `TimerRuntime` in calling `next`. Should there be a more explicit runtime loop that calls `next()` on the active block if no other actions (like pop/push from event handlers) have changed the active block?
-   **Question**: If a block returns `[]` from `next`, what is the expected runtime behavior? Does it wait for an external event?

## 3. `leave(runtime: ITimerRuntime): IRuntimeAction[]`

### General Purpose & How Called

-   **Purpose**: Called when a block is about to be popped from the runtime stack. It's responsible for any cleanup, finalizing metrics or state, and returning final actions before the block becomes inactive.
-   **Called By**: `TimerRuntime.pop()` *after* the block has been removed from the `RuntimeTrace` stack but before the method returns. The actions are applied to the (now previously) popped block.

### Implementation Summary Across Block Types

-   **`RuntimeBlock.ts` (Base Class - public wrapper for protected `onLeave`)**:
    -   Logs the leaving of the block: `console.log(\`<<<<< doLeave <<<<<: \${this.blockKey} -- \${this.constructor.name}\`);`
    -   Calls the protected abstract `onLeave()` method.
    -   Crucially, it *always* adds a `WriteResultAction(this.spanBuilder.Build())` to the actions returned by `onLeave()`. This ensures that a result span is recorded for every block when it leaves.
-   **`RootBlock.ts` (`onLeave`)**:
    -   Returns `[]`. (The `WriteResultAction` is added by the base class).
-   **`IdleRuntimeBlock.ts` (`onLeave`)**:
    -   Returns `[]`.
-   **`TimerBlock.ts` (`onLeave`)**:
    -   Returns `StopTimerAction`.
-   **`EffortBlock.ts` (`onLeave`)**:
    -   Returns `StopTimerAction` and `SetButtonAction` (to clear runtime buttons).
-   **`RepeatingBlock.ts` (`onLeave`)**:
    -   Returns `StopTimerAction`.
-   **`TimedGroupBlock.ts` (`onLeave`)**:
    -   If it has a `timerId`, returns `StopTimerAction`. Otherwise `[]`.
-   **`DoneRuntimeBlock.ts` (`onLeave`)**:
    -   Returns `[]`.

### Noted Inconsistencies & Observations

1.  **Automatic `WriteResultAction`**: The base `RuntimeBlock.leave()` *always* issues a `WriteResultAction`. This is a strong convention.
2.  **Timer Stopping**: Blocks that manage timers (`TimerBlock`, `EffortBlock`, `RepeatingBlock`, `TimedGroupBlock`) generally return a `StopTimerAction`.
3.  **Button Clearing**: `EffortBlock` clears runtime buttons. Others don't explicitly, relying perhaps on the next block's `enter` to set them.

### Feedback & Planning (for `leave`)

-   \[Space for feedback]
-   **Consideration**: Is the automatic `WriteResultAction` always appropriate? Are there cases where a block might leave without producing a "final" result span (e.g., if it's cancelled)?
-   **Question**: Should `leave` also be responsible for explicitly clearing any UI elements it set up in `enter` if the next block might not overwrite them? (e.g. specific displays, not just buttons).

## 4. `onStart(runtime: ITimerRuntime): IRuntimeAction[]`

### General Purpose & How Called

-   **Purpose**: This method, along with `onStop`, appears to be part of a newer layer of lifecycle management, possibly intended for more granular control over when a block *actively starts* processing or timing, which might be distinct from when it's simply `entered`.
    The base `RuntimeBlock.onStart()` ensures a `ResultSpan` is created (if one doesn't exist) and then calls `Start()` on the `ResultSpanBuilder` before calling the protected `onBlockStart()`.
-   **Called By**: The `IRuntimeBlock.ts` interface defines `onStart(runtime: ITimerRuntime): IRuntimeAction[]`. However, the `TimerRuntime.ts` search results didn't show explicit calls to `onStart` from the main runtime logic (like `push`, `pop`, or event handling). Its invocation pattern is unclear from the provided context. It might be intended to be called by specific actions or events.

### Implementation Summary Across Block Types

-   **`RuntimeBlock.ts` (Base Class - public wrapper for protected `onBlockStart`)**:
    -   Ensures `ResultSpanBuilder` has a span and calls `Start()` on it.
    -   Calls protected abstract `onBlockStart()`.
-   **`RootBlock.ts` (`onBlockStart`)**: Returns `[]`.
-   **`IdleRuntimeBlock.ts` (`onBlockStart`)**: Returns `[]`.
-   **`TimerBlock.ts` (`onBlockStart`)**: Returns `[]` (comments suggest "simple - no additional setup needed").
-   **`EffortBlock.ts` (`onBlockStart`)**: Returns `[]`.
-   **`RepeatingBlock.ts` (`onBlockStart`)**: Returns `[]`. (Comments mention checking for duration to set timer state, but current code returns `[]`).
-   **`TimedGroupBlock.ts` (`onBlockStart`)**:
    -   If `duration` and `timerId` are *not* already set (e.g., wasn't set in `onEnter` because `onEnter` might not have known if it was a countdown scenario until later):
        -   Generates a `timerId`.
        -   Returns `SetDurationAction`, `SetButtonAction` (for "end", "pause", "complete").
    -   Otherwise, returns `[]`.
-   **`DoneRuntimeBlock.ts` (`onBlockStart`)**: Returns `[]`.

### Noted Inconsistencies & Observations

1.  **Invocation Mystery**: The most significant observation is the lack of clear invocation points for `onStart` from the `TimerRuntime`.
2.  **Purpose Overlap with `enter`**: For `TimedGroupBlock`, `onBlockStart` seems to handle timer and button setup that `onEnter` might also do, conditional on whether a duration is present. This suggests a potential overlap or unclear division of responsibility between `enter` and `onStart`.
3.  **Span Management**: The base class `onStart` focuses on starting the `ResultSpan`. Concrete implementations mostly do nothing, except `TimedGroupBlock` which might set up a timer.

### Feedback & Planning (for `onStart`)

-   \[Space for feedback]
-   **Critical Question**: When and how should `onStart` be called by the runtime or other mechanisms?
-   **Proposal**: Define a clear distinction between `enter` (block becomes active on stack) and `onStart` (block begins its primary work/timing). If a block is entered but waits for a "start" event, `onStart` could be triggered by that event.

## 5. `onStop(runtime: ITimerRuntime): IRuntimeAction[]`

### General Purpose & How Called

-   **Purpose**: Counterpart to `onStart`. Likely intended for when a block actively stops its processing or timing, which might be distinct from when it `leaves` the stack (e.g., a pause scenario vs. full completion).
    The base `RuntimeBlock.onStop()` calls `Stop()` on the `ResultSpanBuilder` and then calls the protected `onBlockStop()`.
-   **Called By**: Similar to `onStart`, the `IRuntimeBlock.ts` interface defines `onStop(runtime: ITimerRuntime): IRuntimeAction[]`. The `TimerRuntime.ts` search results didn't show explicit calls to `onStop` from the main runtime logic.

### Implementation Summary Across Block Types

-   **`RuntimeBlock.ts` (Base Class - public wrapper for protected `onBlockStop`)**:
    -   Calls `Stop()` on the `ResultSpanBuilder`.
    -   Calls protected abstract `onBlockStop()`.
-   **`RootBlock.ts` (`onBlockStop`)**: Returns `[]`.
-   **`IdleRuntimeBlock.ts` (`onBlockStop`)**: Returns `[]`.
-   **`TimerBlock.ts` (`onBlockStop`)**: Returns `[]` (comments suggest "no additional cleanup needed").
-   **`EffortBlock.ts` (`onBlockStop`)**: Returns `[]`.
-   **`RepeatingBlock.ts` (`onBlockStop`)**: Returns `[]`.
-   **`TimedGroupBlock.ts` (`onBlockStop`)**: Returns `[]`.
-   **`DoneRuntimeBlock.ts` (`onBlockStop`)**: Returns `[]`.

### Noted Inconsistencies & Observations

1.  **Invocation Mystery**: Like `onStart`, the invocation of `onStop` is unclear.
2.  **Minimal Implementation**: All concrete block implementations of `onBlockStop` currently return `[]`. Their primary stop-related logic (like stopping timers) seems to be in `onLeave`.
3.  **Span Management**: The base class `onStop` focuses on stopping the `ResultSpan`.

### Feedback & Planning (for `onStop`)

-   \[Space for feedback]
-   **Critical Question**: When and how should `onStop` be called? Is it for pausing, or for a pre-leave "soft stop"?
-   **Proposal**: If `onStart`/`onStop` are to be used for pause/resume functionality, or for starting/stopping timed sections *within* a block's active lifecycle (between `enter` and `leave`), their invocation needs to be integrated into event handling (e.g., `PauseEvent` triggers `onStop`, `ResumeEvent` triggers `onStart`).
-   **Consideration**: If `onStop` is called, and then the block later `leaves`, `ResultSpanBuilder.Stop()` would be called twice. The builder should be robust to this.

## Overall Summary & Next Steps

The lifecycle methods `enter`, `next`, and `leave` form the primary mechanism for block state progression and stack management. `enter` initializes, `next` advances (though its invocation is inconsistent), and `leave` cleans up and records results.

The `onStart` and `onStop` methods are less integrated into the current runtime flow and their intended purpose/interaction with `enter`/`leave` needs clarification. They seem tied to `ResultSpan` active timing.

**Key areas for refinement:**
1.  **Clarify `TimerRuntime`'s role in calling `next()`**: Establish a consistent mechanism for advancing block state.
2.  **Define the precise responsibilities of `onStart` and `onStop`**: Determine their invocation triggers and how they relate to `enter`, `leave`, and events like pause/resume.
3.  **Address `enter` calling `next`**: Decide if this pattern is desirable or if `enter` should be purely for initialization.
4.  **Ensure consistent cleanup**: Review if `leave` (or `onStop`) should be more broadly responsible for undoing UI changes made in `enter` (or `onStart`).

This summary should serve as a foundation for discussing these points and planning the refactoring of the `TimerRuntime` and `IRuntimeBlock` interactions.
