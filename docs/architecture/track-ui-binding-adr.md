# ADR 006: UI-Runtime Decoupling for Remote Display Support

## Status
Proposed

## Context
The current Track Screen UI components (`TimerDisplay`, `VisualStatePanel`, etc.) interact with the `ScriptRuntime` via direct object references and specialized hooks (`useTimerElapsed`, `useStackDisplay`, etc.). 

These hooks reach deep into the `RuntimeBlock` internals, specifically:
1. Subscribing to `block.getMemory('timer')`.
2. Accessing `runtime.stack.blocks` to find active nodes.
3. Reading `IRuntimeBlock.label`, `key`, and `blockType`.

This direct object traversal is "Illegal" in a distributed environment (Chromecast/Remote TV) because `IRuntimeBlock` instances contain methods, private state, and complex circular dependencies that cannot be serialized over WebSockets.

## Decision
We will decouple the Track Screen UI from the live `ScriptRuntime` engine by introducing an intermediate **Display State Snapshot** layer.

### 1. Stable Interface
Define `IDisplayStackState` in `src/clock/types/DisplayTypes.ts` as the SOLE source of truth for the UI. No UI component in the Track Screen should accept an `IScriptRuntime` or `IRuntimeBlock` directly.

### 2. Snapshot Producer
Implement a `DisplayStateHub` that:
- Subscribes to the `ScriptRuntime` (Stack events + Memory updates).
- Produces a JSON-serializable `IDisplayStackState` snapshot whenever the state changes.
- Buffers high-frequency updates (e.g., system logs) to prevent socket congestion.

### 3. Command Forwarding
The UI will no longer call `runtime.handle()` directly. Instead, it will use a `CommandBus` (or `onCommand` callback) that dispatches serializable `RuntimeCommand` objects.
- In **Local** mode, these commands are immediately handled by the local runtime.
- In **Remote** mode, these commands are serialized and sent over the WebSocket.

### 4. Hybrid Timer Ticking
To maintain visual smoothness (60fps):
- Snapshots will include `startTime` and `accumulatedMs` for all active timers.
- The UI will use a local `requestAnimationFrame` loop to interpolate the "current" time based on the last received `startTime` from the remote runtime.

## Consequences
### Positive
- **Remote Display Support**: Enabling Chromecast, Android TV, and "Second Screen" workout experiences.
- **Improved Testability**: UI components can be fully unit tested by injecting static snapshots.
- **Architecture Sanity**: Clear boundary between the "Engine" (Runtime) and the "Dashboard" (Track UI).

### Negative
- **Latency**: Remote environments will have a small delay (tens of milliseconds) between a command (e.g., Lap) and the visual feedback.
- **Boilerplate**: Need to maintain a mapping between internal block state and the external display state.
- **Refactor Cost**: Existing Track Screen components must be refactored to remove direct runtime dependencies.

## Implementation Steps for Track Screen
1. **Define POJO Structures**: Finalize the shapes of `ITimerDisplayEntry` and `IDisplayCardEntry` to cover all current WOD features (Rounds, AMRAP, EMOM).
2. **Refactor Hooks**: Update `useStackDisplay` to be provide data from a `DisplayStateContext` instead of `ScriptRuntimeContext`.
3. **Create Hub**: Implement the `ScriptRuntime` → `IDisplayStackState` transformer.
4. **Abstract Controls**: Moving `onStart`, `onNext`, etc., to a unified `dispatch(command)` pattern.
