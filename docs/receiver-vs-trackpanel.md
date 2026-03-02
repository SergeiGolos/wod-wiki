# Receiver (Chromecast) vs Workbench TrackPanel — Data & Binding Comparison

## Overview

Both screens display the same conceptual workout state — a **stack of active blocks** (left column) and a **big timer with controls** (right column). However, they obtain and bind that data through fundamentally different mechanisms.

| Aspect | **Workbench TrackPanel** | **Receiver (Chromecast)** |
|--------|--------------------------|---------------------------|
| Runtime access | **Direct** — in-process `IScriptRuntime` | **None** — receives serialized JSON snapshots |
| Data transport | React hooks + Zustand store | WebSocket (`state-update` messages via relay server) |
| Timer computation | Block memory subscriptions + `requestAnimationFrame` | Local `requestAnimationFrame` over raw `TimeSpan[]` sent from bridge |
| Reactivity model | Observable memory cells → hook re-renders | JSON snapshot diffing (fingerprint-gated) → `setState` |

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
