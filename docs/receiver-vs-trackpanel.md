# Receiver (Chromecast) vs Workbench TrackPanel — Data & Binding Comparison

## Overview

Both screens display the same conceptual workout state — a **stack of active blocks** (left column) and a **big timer with controls** (right column). However, they obtain and bind that data through fundamentally different mechanisms.

| Aspect            | **Workbench TrackPanel**                             | **Receiver (Chromecast)**                                            |
| ----------------- | ---------------------------------------------------- | -------------------------------------------------------------------- |
| Runtime access    | **Direct** — in-process `IScriptRuntime`             | **None** — receives serialized JSON snapshots                        |
| Data transport    | React hooks + Zustand store                          | WebSocket (`state-update` messages via relay server)                 |
| Timer computation | Block memory subscriptions + `requestAnimationFrame` | Local `requestAnimationFrame` over raw `TimeSpan[]` sent from bridge |
| Reactivity model  | Observable memory cells → hook re-renders            | JSON snapshot diffing (fingerprint-gated) → `setState`               |

---

## 1. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        WORKBENCH (browser)                       │
│                                                                  │
│  ScriptRuntime                                                   │
│    ├─ RuntimeStack (IRuntimeBlock[])                             │
│    │    └─ block.getMemory('time')  → TimerState (spans[])      │
│    │    └─ block.getMemoryByTag('fragment:display') → fragments  │
│    │    └─ block.getMemoryByTag('fragment:next')    → lookahead  │
│    │    └─ block.getMemoryByTag('controls') → ButtonConfig[]     │
│    │                                                             │
│    ├───► useSnapshotBlocks()  ──► useStackTimers()               │
│    │                          ──► usePrimaryTimer()              │
│    │                          ──► useSecondaryTimers()           │
│    │                          ──► useStackDisplayRows()          │
│    │                          ──► useActiveControls()            │
│    │                          ──► useNextPreview()               │
│    │                                                             │
│    ├─ [TrackPanel path]                                          │
│    │   VisualStatePanel ◄── RuntimeStackView  (reads blocks[])   │
│    │   TimerDisplay     ◄── StackIntegratedTimer (hooks above)   │
│    │        └─► TimerStackView (presentational)                  │
│    │                                                             │
│    └─ [Receiver bridge path]                                     │
│        DisplaySyncBridge ◄── same hooks                          │
│            │ serializes → workbenchSyncStore.displayState         │
│            ▼                                                     │
│        CastButton  ──► WebSocket relay ──► state-update msg      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │  WebSocket (JSON)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     RECEIVER (Chromecast / TV)                   │
│                                                                  │
│  ReceiverApp (receiver-main.tsx)                                 │
│    ├─ useState<RemoteState>  ◄── ws.onmessage('state-update')   │
│    ├─ requestAnimationFrame  → setNow(Date.now())               │
│    │                                                             │
│    ├─ RemoteVisualStatePanel (left column)                       │
│    │    └─ RemoteStackBlockItem  per displayRow                  │
│    │         └─ calculateElapsedFromSpans(spans, now)            │
│    │         └─ <FragmentSourceRow fragments={row} />            │
│    │                                                             │
│    └─ TimerStackView (right column — same component!)            │
│         ├─ primaryTimer  (re-derived from remoteState)           │
│         ├─ secondaryTimers                                       │
│         └─ timerStates Map (elapsed recomputed each frame)       │
│                                                                  │
│  receiver.html (legacy vanilla JS version)                       │
│    ├─ lastState = msg.payload.displayState                       │
│    ├─ requestAnimationFrame(tick)                                │
│    │    └─ calcElapsed(spans, Date.now())                        │
│    └─ Manual DOM updates (innerText, style)                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Shapes

### 2a. Workbench TrackPanel — Live Runtime Objects

The TrackPanel operates inside a `<ScriptRuntimeProvider>` and accesses the **live runtime** via hooks.

#### Stack blocks (via `useSnapshotBlocks()`)
```typescript
IRuntimeBlock {
  key: BlockKey;
  label: string;
  blockType: string;                        // 'Timer', 'Rest', 'Rounds', 'Root', …
  getMemory(type: 'time'): MemoryEntry<TimerState>;
  getMemoryByTag(tag: string): MemoryLocation[];
  getFragmentMemoryByVisibility(tier: 'display' | 'promote' | 'private'): MemoryLocation[];
}
```

#### Timer state (via `block.getMemory('time')`)
```typescript
TimerState {
  label: string;
  direction: 'up' | 'down';
  durationMs?: number;
  role: 'primary' | 'secondary' | 'auto';
  spans: TimeSpan[];                        // { started: number; ended?: number }
}
```

#### Fragment display rows (via `block.getMemoryByTag('fragment:display')`)
```typescript
// Each MemoryLocation contains:
MemoryLocation {
  fragments: ICodeFragment[];               // Rich typed objects with fragmentType, image, value, …
  subscribe(cb): () => void;                // Observable — triggers React re-render
}
```

#### Lookahead (via `useNextPreview()`)
```typescript
NextPreview {
  fragments: ICodeFragment[];
  block: IRuntimeBlock;
}
```

#### Controls (via `useActiveControls()`)
```typescript
ButtonConfig {
  id: string;
  label: string;
  eventName?: string;
  visible: boolean;
  enabled: boolean;
  isPinned: boolean;
}
```

### 2b. Receiver — Serialized `RemoteState` (JSON over WebSocket)

The receiver has **zero access** to `IRuntimeBlock` or any runtime memory. It gets a flat JSON snapshot:

```typescript
interface RemoteState {
  timerStack: RemoteTimerEntry[];
  displayRows: RemoteDisplayRow[];
  lookahead: { fragments: any[] } | null;   // ICodeFragment[] serialized
  subLabel?: string;
  workoutState: string;                     // 'running' | 'paused' | 'idle' | …
}

interface RemoteTimerEntry {
  id: string;
  ownerId: string;                          // block key as string
  label: string;
  format: 'up' | 'down';
  durationMs?: number;
  role: 'primary' | 'secondary';
  spans: RemoteTimeSpan[];                  // { started: number; ended?: number }
  isRunning: boolean;
  isPinned?: boolean;
}

interface RemoteDisplayRow {
  blockKey: string;
  blockType?: string;
  label: string;
  isLeaf: boolean;
  depth: number;
  rows: any[][];                            // ICodeFragment[][] (serialized)
  timer: {
    spans: RemoteTimeSpan[];
    durationMs?: number;
    direction: 'up' | 'down';
    isRunning: boolean;
  } | null;
}
```

---

## 3. Data Binding — Step-by-Step

### 3a. Workbench TrackPanel Binding Chain

```
ScriptRuntime
  └─► RuntimeStack
       └─► IRuntimeBlock[] (observable memory cells)
            │
            ├─► useSnapshotBlocks()          // re-renders on push/pop
            ├─► useStackTimers()             // subscribes to 'time' memory on each block
            ├─► usePrimaryTimer()            // pin resolution: Rest > lowest-pinned > leaf
            ├─► useSecondaryTimers()         // everything NOT primary
            ├─► useStackDisplayRows()        // subscribes to 'fragment:display' tags
            ├─► useActiveControls()          // subscribes to 'controls' tags
            └─► useNextPreview()             // subscribes to 'fragment:next' tags
```

**Left column — `VisualStatePanel`**
1. Rendered inside `<ScriptRuntimeProvider>`.
2. `RuntimeStackView` calls `runtime.stack.blocks`, reverses to root→leaf order.
3. Each `StackBlockItem` receives a live `IRuntimeBlock`:
   - Calls `useTimerElapsed(blockKey)` → finds block, subscribes to `'time'` memory, runs `requestAnimationFrame` when running, calls `calculateDuration(spans, now)`.
   - Calls `block.getFragmentMemoryByVisibility('display')` → subscribes to each location → renders `<FragmentSourceRow>` per row.
4. `LookaheadView` calls `useNextPreview()` → renders `<FragmentSourceRow>`.

**Right column — `TimerDisplay` → `StackIntegratedTimer`**
1. All hooks fire inside the runtime context.
2. `usePrimaryTimer()` selects the primary timer via pin resolution (Rest override → lowest pinned → leaf fallback).
3. `useStackTimers()` builds `timerStates` Map — elapsed recomputed each animation frame from `calculateDuration(spans, now)`.
4. Label resolution: derives `mainLabel` / `subLabel` from stack items (Rounds label, leaf label, pinned timer label).
5. Passes derived `primaryTimer`, `secondaryTimers`, `timerStates`, `subLabel`, `actions` to `<TimerStackView>`.
6. `TimerStackView` is **purely presentational** — renders SVG ring, formatted time, control buttons.

### 3b. Receiver Binding Chain

```
WebSocket message
  └─► msg.payload.displayState
       └─► setRemoteState(…)            // single useState<RemoteState>
            │
            ├─► requestAnimationFrame    // 60fps setNow(Date.now())
            │
            ├─► Left column: <RemoteVisualStatePanel>
            │    └─► remoteState.displayRows.map(entry => <RemoteStackBlockItem>)
            │         └─► calculateElapsedFromSpans(entry.timer.spans, now)
            │         └─► <FragmentSourceRow fragments={entry.rows[i]} />
            │
            └─► Right column: <TimerStackView>    // SAME component as TrackPanel!
                 ├─► primaryTimerEntry  (derived from remoteState.timerStack[0])
                 ├─► secondaryTimerEntries
                 └─► timerStates Map (elapsed from calculateElapsedFromSpans)
```

1. `ReceiverApp` connects to relay WebSocket, registers as `receiver`.
2. `ws.onmessage` receives `state-update` → stores full `RemoteState` in React state.
3. A `requestAnimationFrame` loop continuously sets `now = Date.now()`.
4. **Left column** — `RemoteVisualStatePanel`:
   - Iterates `displayRows[]` (pre-ordered root→leaf by the bridge).
   - Each `RemoteStackBlockItem` computes elapsed locally: `calculateElapsedFromSpans(entry.timer.spans, now)`.
   - Renders `<FragmentSourceRow>` from the serialized `entry.rows` (same component — fragments are plain objects).
5. **Right column** — Re-derives `ITimerDisplayEntry` shapes from `remoteState.timerStack`:
   - Primary timer = first entry with `role === 'primary'` or `timerStack[0]`.
   - Secondaries = everything else.
   - Builds `timerStates` Map by calling `calculateElapsedFromSpans` for each entry.
   - Passes to the **same `<TimerStackView>`** component used by the Workbench.

---

## 4. Key Differences

### 4a. Timer Elapsed Computation

| | TrackPanel | Receiver |
|---|---|---|
| **Source** | `block.getMemory('time').value.spans` (live `TimerState`) | `remoteState.timerStack[i].spans` (serialized snapshot) |
| **Function** | `calculateDuration(spans, now)` from `src/lib/timeUtils.ts` | `calculateElapsedFromSpans(spans, now)` — inline reimplementation |
| **Trigger** | `requestAnimationFrame` gated by `isAnyTimerRunning` | Always-running `requestAnimationFrame` loop |
| **Accuracy** | Exact — reads memory in same process | Near-exact — epoch timestamps survive serialization; only network latency causes drift |

### 4b. Structural Updates

| | TrackPanel | Receiver |
|---|---|---|
| **Reactivity** | Memory cell `.subscribe()` → React re-render on each granular change | Fingerprint-gated JSON snapshot pushed over WebSocket |
| **Granularity** | Per-block, per-memory-location subscriptions | Entire display state replaced atomically |
| **Frequency** | Structural changes only (no timer tick re-renders thanks to `requestAnimationFrame`) | Structural changes only — `DisplaySyncBridge` and `CastButton` both use fingerprinting to suppress tick-level updates |

### 4c. Fragment Display

| | TrackPanel | Receiver |
|---|---|---|
| **Source** | `block.getFragmentMemoryByVisibility('display')` → `MemoryLocation[]` | `displayRow.rows: any[][]` (pre-serialized `ICodeFragment[][]`) |
| **Visibility tiers** | Supports `display`, `promote`, `private` (debug mode) | Only `display` tier is serialized |
| **Rendering** | `<FragmentSourceRow fragments={loc.fragments}>` | `<FragmentSourceRow fragments={row}>` — same component |

### 4d. Lookahead ("Up Next")

| | TrackPanel | Receiver |
|---|---|---|
| **Source** | `useNextPreview()` hook → walks stack for `fragment:next` memory | `remoteState.lookahead.fragments` (pre-resolved by bridge) |
| **Resolution** | Client-side: leaf-to-root walk, first non-empty `fragment:next` wins | Server-side: bridge runs the same hook and serializes the result |

### 4e. Controls / Actions

| | TrackPanel | Receiver |
|---|---|---|
| **Discovery** | `useActiveControls()` scans all blocks for `controls` memory | Not transmitted — receiver uses hardcoded D-Pad → event mapping |
| **Dispatch** | `runtime.handle({ name, timestamp, data })` dispatched in-process | `sendReceiverEvent(name)` → WebSocket `event-from-receiver` → relay → `CastButton` → `useWorkbenchSyncStore.getState().handleNext/Start/Pause/Stop()` |
| **Dynamic actions** | Yes — blocks can expose custom buttons (e.g., "Choose Weight") | No — only `next`, `start`, `pause`, `stop` are supported |

### 4f. Label / Sub-Label Resolution

| | TrackPanel | Receiver |
|---|---|---|
| **Where** | `StackIntegratedTimer` derives `mainLabel`/`subLabel` from stack items (Rounds, pinned timer, leaf) | `DisplaySyncBridge` runs the same Rounds/pinned/leaf logic and serializes `subLabel` into the snapshot |
| **Result** | Computed per-frame in the Workbench | Pre-computed by bridge, consumed as a string |

---

## 5. The Serialization Bridge — `DisplaySyncBridge`

The bridge (`src/components/layout/DisplaySyncBridge.tsx`) is the **critical translation layer** that converts live runtime state into the flat JSON the receiver understands. It:

1. Runs inside a `<ScriptRuntimeProvider>` with the active runtime.
2. Subscribes to the **same hooks** the TrackPanel uses (`useSnapshotBlocks`, `usePrimaryTimer`, `useStackTimers`, `useNextPreview`).
3. Also subscribes to fragment memory changes (visibility `'display'` tier only).
4. Serializes everything into the `RemoteState` shape and writes it to `workbenchSyncStore.displayState`.
5. Uses a **fingerprint** to suppress redundant writes — only updates the store when block structure, fragment content, timer running-state, or lookahead actually change.

`CastButton` then reads `store.displayState`, applies its own fingerprint check, and sends `state-update` messages over the WebSocket.

---

## 6. Shared Components

Both screens share these **identical** presentational components:

| Component | File | Used By |
|-----------|------|---------|
| `TimerStackView` | `src/components/workout/TimerStackView.tsx` | TrackPanel (via `TimerDisplay`) and Receiver (directly) |
| `FragmentSourceRow` | `src/components/fragments/FragmentSourceRow.tsx` | Both — renders `ICodeFragment[]` arrays identically |

The receiver also has a **mirror component** — `RemoteStackBlockItem` — that replicates the look of `StackBlockItem` from `VisualStateComponents.tsx` but operates on serialized `RemoteDisplayRow` instead of live `IRuntimeBlock`.

---

## 7. Legacy Receiver (`public/receiver.html`)

A vanilla-JS version exists at `public/receiver.html`. It:
- Connects directly to the relay WebSocket (URL passed as query param).
- Uses raw DOM manipulation (`innerText`, `style` assignments).
- Only displays the **primary timer label** and **single big clock** — no stack visualization, no fragment rows, no lookahead.
- Computes elapsed via an inline `calcElapsed(spans, now)` in a `requestAnimationFrame` loop.
- Hardcodes D-Pad key mappings to `sendReceiverEvent()`.

This is a stripped-down fallback for environments where the React bundle cannot load (e.g., low-memory Chromecast devices).

---

## 8. Summary Table

| Data Point | TrackPanel Source | Receiver Source | Same Component? |
|------------|-------------------|-----------------|-----------------|
| Block stack | `runtime.stack.blocks` + `useSnapshotBlocks()` | `remoteState.displayRows[]` | No — `StackBlockItem` vs `RemoteStackBlockItem` |
| Timer elapsed | `calculateDuration(spans, now)` from memory subscription | `calculateElapsedFromSpans(spans, now)` from serialized spans | No — different functions, same algorithm |
| Primary timer selection | `usePrimaryTimer()` hook (Rest > pinned > leaf) | First `timerStack` entry with `role=primary` | No — bridge pre-resolves |
| Fragment rows | `block.getFragmentMemoryByVisibility('display')` | `displayRow.rows` (pre-serialized) | **Yes** — both use `<FragmentSourceRow>` |
| Lookahead | `useNextPreview()` | `remoteState.lookahead` | **Yes** — both use `<FragmentSourceRow>` |
| Big timer + ring | `<TimerStackView>` via `<TimerDisplay>` | `<TimerStackView>` directly | **Yes** — identical component |
| Control actions | `useActiveControls()` + `runtime.handle()` | D-Pad keys → WebSocket → `CastButton` → store handlers | No — completely different path |
| Sub-label | Derived in `StackIntegratedTimer` | Pre-serialized in `remoteState.subLabel` | N/A — string value, not a component |

---

## 9. Problem: Divergent Abstractions Block Component Reuse

TrackPanel components expect **live runtime primitives** (`IRuntimeBlock`, memory subscriptions, in-process actions). The receiver gets **transport-friendly snapshots** and a different action path. This mismatch prevents us from rendering the exact same React tree in both places.

- **State shape drift**: hooks expose rich objects; receiver consumes flattened `RemoteState`.
- **Action path drift**: TrackPanel dispatches directly to `runtime.handle()`, receiver emits WebSocket events without dynamic buttons.
- **Timer plumbing drift**: TrackPanel reads memory + `calculateDuration`; receiver re-derives elapsed with its own helper.
- **Component duplication**: `StackBlockItem` vs `RemoteStackBlockItem`; hooks vs WebSocket listener.

Goal: make the UI **location-agnostic** so the same React components (TrackPanel layout + controls) render on both the workbench and Chromecast.

---

## 10. Design Goals

- **Single display contract**: One `DisplayState` and `DisplayAction` interface used everywhere.
- **Pluggable transport**: Runtime in-process provider and Cast/WebRTC transport both satisfy the same controller contract.
- **No feature loss**: Keep current TrackPanel behavior (fragment tiers, pinning, lookahead, controls).
- **Zero UI duplication**: Reuse `VisualStatePanel`, `TimerStackView`, and the Track control buttons verbatim on receiver.
- **Drift-proof timers**: One elapsed-time function shared by both surfaces.

---

## 11. Proposed Architecture (C4 Views)

### 11a. Context (users + screens)

```
[Athlete] ─┬─ interacts with ─► [Workbench UI (browser)]
          └─ views ───────────► [TV UI (Chromecast receiver)]

[Coach] ───┬─ monitors ───────► [TV UI]
          └─ edits ───────────► [Workbench UI]
```

### 11b. Container View (runtime, bridge, receiver)

```
┌───────────────────────────┐        Cast/WebRTC events        ┌───────────────────────────┐
│ Workbench Browser         │  DisplayState ⇄ DisplayAction    │ Chromecast Receiver (TV)  │
│                           │─────────────────────────────────►│                           │
│  ScriptRuntime            │                                  │  ReceiverApp              │
│   └─ RuntimeDisplayCtrl   │                                  │   └─ RemoteDisplayCtrl    │
│      (projects runtime →  │◄─────────────────────────────────│      (subscribes to      │
│       DisplayState)       │   fingerprints + reliability     │       transport)          │
│                           │                                  │                           │
│  DisplaySurface (UI)      │                                  │  DisplaySurface (same UI) │
└───────────────────────────┘                                  └───────────────────────────┘
```

### 11c. Component / Sequence (unified flow)

```
Runtime → RuntimeDisplayController
        → emits DisplayState (live objects)
        → DisplaySurface renders (TrackPanel components)
        → CastBridge serializes DisplayState
        → Transport sends to receiver
Receiver → RemoteDisplayController deserializes DisplayState
        → DisplaySurface renders (same components)
        → DisplaySurface dispatches DisplayAction
        → RemoteDisplayController sends action event
        → CastBridge routes to runtime.handle()
```

---

## 12. Implementation Plan (Minimal, Safe, Reversible)

1) **Define shared contracts**
   - `DisplayState` (timers, stack rows, lookahead, controls, subLabel, workout status).
   - `DisplayAction` (start, pause, stop, next, plus dynamic control buttons).
   - `DisplayController` interface with `state$` (observable/subscribe) and `dispatch(action)`.

2) **Create runtime-backed controller**
   - Move existing bridge logic (`usePrimaryTimer`, `useStackTimers`, fragment subscriptions, label resolution) into `RuntimeDisplayController` that **emits DisplayState** without serialization.
   - Expose `dispatch` that calls `runtime.handle(action)` and preserves dynamic controls.

3) **Create transport-backed controller**
   - `RemoteDisplayController` listens to Cast/WebRTC messages (`state-update`) and exposes the same `state$`.
   - `dispatch` publishes `event-from-receiver` with the same `DisplayAction` payloads (not just d-pad).

4) **Unify UI entry point**
   - Introduce `DisplaySurface` (provider + hooks) that consumes any `DisplayController`.
   - Render **TrackPanel** and **ReceiverApp** through `DisplaySurface`, passing different controllers:
     - Workbench: `controller={new RuntimeDisplayController(runtime)}`
     - Receiver: `controller={new RemoteDisplayController(transport)}`

5) **Remove duplicated plumbing**
   - Replace `RemoteStackBlockItem` with the actual `StackBlockItem`, supplying adapters to map `DisplayState` rows to the props it expects (fragments, timer state, depth, label).
   - Replace receiver-specific elapsed calculation with the shared `calculateDuration`.

6) **Transport details**
   - Keep fingerprinting in the transport layer (CastButton / bridge) so UI remains pure.
   - Use the same `DisplayState` serializer for Cast payloads; receiver simply hydrates.

---

## 13. Before / After Code Sketches

### 13a. UI wiring (TrackPanel)
```tsx
// BEFORE (tight runtime coupling)
const blocks = useSnapshotBlocks();
const primary = usePrimaryTimer();
return <TimerStackView primaryTimer={primary} blocks={blocks} />;
```

```tsx
// AFTER (location-agnostic)
const display = useDisplaySurface(); // from shared provider
return (
  <TrackLayout
    stackRows={display.state.displayRows}
    timers={display.state.timerStack}
    controls={display.state.controls}
    dispatch={display.dispatch}
  />
);
```

### 13b. UI wiring (Receiver)
```tsx
// BEFORE (WebSocket-driven state)
const [remoteState, setRemoteState] = useState<RemoteState>();
useEffect(() => ws.onmessage = msg => setRemoteState(JSON.parse(msg.data)), []);
return <TimerStackView primaryTimer={derive(remoteState)} />;
```

```tsx
// AFTER (same components, different controller)
const controller = useMemo(() => new RemoteDisplayController(transport), [transport]);
const display = useDisplaySurface(controller);
return (
  <TrackLayout
    stackRows={display.state.displayRows}
    timers={display.state.timerStack}
    controls={display.state.controls}
    dispatch={display.dispatch}
  />
);
```

### 13c. Controller contract
```typescript
export interface DisplayController {
  subscribe(listener: (state: DisplayState) => void): () => void;
  dispatch(action: DisplayAction): void;
}

class RuntimeDisplayController implements DisplayController {
  constructor(private runtime: IScriptRuntime) {}
  subscribe(fn) { /* hook aggregation using existing use* hooks */ }
  dispatch(action) { this.runtime.handle(action); }
}

class RemoteDisplayController implements DisplayController {
  constructor(private transport: CastTransport) {}
  subscribe(fn) { return transport.onState(fn); }
  dispatch(action) { transport.sendAction(action); }
}
```

### 13d. Action symmetry (example)
```typescript
// BEFORE: receiver hardcodes
sendReceiverEvent('next');

// AFTER: shared action payload
dispatch({ type: 'controls/trigger', id: 'next' });
```

---

## 14. Migration Steps (Keeps Current Behavior Intact)

- **Phase 1**: Extract `calculateDuration` into a shared module used by receiver; wrap existing Remote components with the new provider (no UI change).
- **Phase 2**: Swap ReceiverApp to render the **real TrackPanel components** via `DisplaySurface` adapters while keeping legacy `RemoteStackBlockItem` behind a feature flag for rollback.
- **Phase 3**: Move Cast serialization to use `DisplayState` contract; delete bespoke `RemoteDisplayRow` types.
- **Phase 4**: Enable dynamic controls over transport (`DisplayAction`), preserving current d-pad mappings as defaults.

Each phase is shippable and reversible; TrackPanel remains unchanged while Receiver progressively adopts the shared components.
