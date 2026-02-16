# PRD: Track Screen UI-Runtime Binding & Decoupling

## 1. Objective
Define a stable, serializable interface between the Script Runtime and the Track Screen UI. This decoupling allows the UI to run either locally (same thread/process) or remotely (via WebSockets/Chromecast) without changing the component logic.

## 2. Context
Currently, Track Screen components (`TimerDisplay`, `VisualStatePanel`) are tightly coupled to the `IScriptRuntime` and `IRuntimeBlock` instances. They subscribe to block-level memory and traverse the runtime stack directly. While efficient for local execution, this pattern prevents:
1. **Remote Display**: Casting the workout to a TV while controlling it from a phone.
2. **Snapshotting**: Easily saving and restoring the exact visual state of a workout.
3. **Testing**: Pure component testing without a full runtime engine.

## 3. High-Level Requirements
* **Serializable State**: The entire state needed to render the Track Screen must be representable as a JSON-serializable object (`IDisplayStackState`).
* **Directional Flow**:
    * **State (Runtime → UI)**: Pushed via snapshots or deltas.
    * **Commands (UI → Runtime)**: Sent as serializable events (e.g., `START`, `NEXT`, `PAUSE`).
* **High-Fidelity Timers**: Local UI must still support 60fps timer updates, while remote UI should support low-latency sync.
* **Component Agnosticism**: UI components should consume `IDisplayStackState` instead of `IScriptRuntime`.

## 4. Interface Shapes

### 4.1. Display State (`IDisplayStackState`)
The primary data structure sent from the Runtime to the UI.
```typescript
interface IDisplayStackState {
  workoutState: 'idle' | 'running' | 'paused' | 'complete' | 'error';
  totalElapsedMs: number;
  
  // The primary stack of timers and activity cards
  timerStack: ITimerDisplayEntry[];
  cardStack: IDisplayCardEntry[];
  
  // History of completed items interleaved with the stack
  history: IOutputStatement[];
  
  // Lookahead/Up-next preview
  upNext?: IDisplayCardEntry;
}
```

### 4.2. Commands (`RuntimeCommand`)
Serializable messages sent from the UI to the Runtime.
```typescript
type RuntimeCommand = 
  | { type: 'control', action: 'start' | 'pause' | 'stop' | 'next' | 'reset' }
  | { type: 'select-session', sessionId: string }
  | { type: 'update-metric', blockKey: string, value: unknown };
```

## 5. Track Screen Requirements
To support decoupling for the Track Screen, the following technical updates are required:

1. **State Hub**: A new layer that aggregates `RuntimeStack` events and `Memory` updates into a single `IDisplayStackState` snapshot.
2. **Context Provider**: A `DisplayStateProvider` that replaces `ScriptRuntimeProvider` for pure UI components.
3. **Timer Normalization**: Move timer calculation logic out of components and into the state snapshot (providing `accumulatedMs` and `startTime` for local ticking).
4. **WebSocket Bridge**: A service that wraps the State Hub and forwards snapshots to a remote client, while receiving and injecting commands back into the runtime.

## 6. Target Environments
| Environment | Runtime Location | UI Location | Communication |
|-------------|------------------|-------------|---------------|
| **Local** | Web Worker / Main Thread | Web App | Direct / MessagePort |
| **Chromecast** | Mobile Web App | TV Web Receiver | WebSockets (Relay) |
| **Android TV** | Mobile Web App | Native Android App | WebSockets (Relay) |
