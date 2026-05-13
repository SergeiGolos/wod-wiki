# UI Display Pipeline Architecture Report

**Date:** 2026-05-12  
**Area:** View Panels, Chromecast Receiver, Runtime Event Pipeline  
**Status:** Analysis — Deepening Opportunities  
**Scope:** Large-screen browser view, Chromecast cast receiver, UI button events, runtime session handshake

---

## Executive Summary

The WOD Wiki UI currently has **two parallel but structurally different pipelines** for connecting a view panel to a runtime session: one for the browser's large-screen track view, and one for the Chromecast receiver. Both pipelines ultimately achieve the same outcome — display runtime state and emit user input back as events — but they do so through incompatible interfaces, duplicated wiring logic, and different event dispatch patterns.

The core friction: **button events from the large-screen browser view do not flow through the same seam as button events from the Chromecast receiver**. Adding a new control to either surface requires changes in multiple disconnected places.

This report identifies four deepening opportunities, ordered by impact.

---

## Current Architecture: Two Paths to the Same Runtime

### Path 1 — Browser Large-Screen Track Panel

```
TrackPanel (track-panel.tsx)
  └── TimerScreen (props: onStart, onPause, onStop, onNext)
        └── TimerDisplay (props: onStart, onPause, onStop, onNext)
              └── TimerStackView (props: onStart, onPause, onStop, onNext)
                    └── [Button onClick] → calls prop directly
                          ↓
                    useWorkbenchRuntime.handleStart / handleNext / …
                          ↓
                    execution.start() / runtime.handle(new NextEvent())
```

Button events are **callback props** drilled three levels deep. They call into `useWorkbenchRuntime` closures which invoke `execution.start()` or `runtime.handle()` directly. The `IRuntimeEventProvider` interface exists but is never consulted on the browser side.

### Path 2 — Chromecast Receiver

```
ReceiverTimerPanel (timer-panel-chromecast.tsx)
  └── TimerStackView (props: onStart → () => onEvent('start'), …)
        └── [Button onClick] → calls onEvent('start')
              ↓
        ReceiverApp.sendEvent('start')
              ↓
        proxyRuntime.handle({ name: 'start', … })
              ↓
        IRpcTransport.send({ type: 'rpc-event', name: 'start', … })
              ↓ (wire)
        CastButtonRpc.eventProvider.onEvent(handler)
              ↓
        state.handles.handleStart()   ← Zustand store lookup
```

Button events are **event names** dispatched through `ChromecastProxyRuntime.handle()` → `IRpcTransport` → `ChromecastEventProvider` → `WorkbenchHandles` in the Zustand store. This path does use `IRuntimeEventProvider` — but only on the cast side.

### The Divergence in One Diagram

```
Browser Large-Screen                    Chromecast Receiver
─────────────────────────────────────────────────────────────
TimerStackView                          TimerStackView
  ↓ onStart()                             ↓ onEvent('start')
  ↓ (prop callback)                       ↓ (string event name)
  useWorkbenchRuntime                     ChromecastProxyRuntime.handle()
  ↓ execution.start()                     ↓ IRpcTransport
  ScriptRuntime (direct)                  ChromecastEventProvider
                                          ↓ WorkbenchHandles.handleStart()
                                          ScriptRuntime (indirect via Zustand)
```

`TimerStackView` is called with two different shapes of the "do something" callback depending on which surface it renders in. The `onEvent` prop on the cast path is a shallow wrapper — it exists precisely because the Chromecast path needs to serialise the event, but the browser path doesn't.

---

## Deepening Opportunities

### 1. Unified UI Command Channel via `IRuntimeEventProvider`

**Files:**
- `src/runtime/contracts/IRuntimeEventProvider.ts`
- `src/panels/timer-panel.tsx`
- `src/panels/timer-panel-chromecast.tsx`
- `src/components/workout/TimerStackView.tsx`
- `src/components/workbench/useWorkbenchRuntime.ts`
- `src/components/cast/CastButtonRpc.tsx`

**Problem (shallow interface, no locality):**

`IRuntimeEventProvider` already defines the correct seam:

```typescript
interface IRuntimeEventProvider {
    dispatch(event: IEvent): void;
    onEvent(handler: (event: IEvent) => void): Unsubscribe;
    dispose(): void;
}
```

`ChromecastEventProvider` implements it for the cast path. But the browser large-screen path never uses it — buttons call `onStart` / `onStop` / `onNext` props that are closure callbacks wired deep in `useWorkbenchRuntime`. Adding a fifth button (e.g., "lap" or "select-block") requires: updating `TimerStackViewProps`, threading the new prop through `TimerDisplay` → `TrackPanel` → `Workbench.tsx`, adding a case to `useWorkbenchRuntime`, **and** adding a case to `CastButtonRpc`'s `eventProvider.onEvent` handler — four files for one new control.

A `LocalEventProvider` implementation of `IRuntimeEventProvider` would dispatch events directly to `ScriptRuntime.handle()`. Both the browser and cast paths would then share the same `TimerStackView` interface:

```typescript
// TimerStackView — unified
interface TimerStackViewProps {
  elapsedMs: number;
  hasActiveBlock: boolean;
  isRunning: boolean;
  eventProvider: IRuntimeEventProvider;   // ← single seam
  compact?: boolean;
  // … display props
}
```

A button press becomes:
```typescript
eventProvider.dispatch({ name: 'start', timestamp: new Date() });
```

- **Browser path**: `LocalEventProvider.dispatch()` calls `runtime.handle()` directly.  
- **Cast path**: `ChromecastEventProvider.dispatch()` serialises over WebRTC.

**Benefits:**
- **Locality**: adding a new button event touches `IEvent` definitions + one `LocalEventProvider` case. No prop threading.
- **Leverage**: `TimerStackView` becomes a pure display component with a single event seam — independently testable with a mock `IRuntimeEventProvider`.
- **One adapter = hypothetical seam. Two adapters = real seam.** The cast path already proves the seam is real; the browser path just hasn't adopted it yet.

---

### 2. Formal `IViewSession` Handshake Interface

**Files:**
- `src/components/cast/CastButtonRpc.tsx` (476 lines — does connection, subscription wiring, event routing, state sync, cleanup)
- `src/services/cast/rpc/ChromecastProxyRuntime.ts` (582 lines)
- `src/receiver-rpc.tsx` (378 lines)
- `src/services/cast/rpc/WebRtcRpcTransport.ts`
- `src/services/cast/rpc/ChromecastRuntimeSubscription.ts`
- `src/services/cast/CastSignaling.ts`

**Problem (shallow module, no locality):**

`CastButtonRpc.tsx` is a 476-line component that does six distinct jobs:

1. Manages Cast SDK state (`sdkState`, `isCasting`, `isConnecting`, `isDisconnecting`)
2. Establishes / tears down `WebRtcRpcTransport`
3. Performs clock synchronisation (`ClockSyncService`)
4. Creates and registers `ChromecastRuntimeSubscription` with `SubscriptionManager`
5. Creates `ChromecastEventProvider` and routes incoming events to `WorkbenchHandles`
6. Sends the initial workbench-mode RPC message

Steps 2–6 define a **connection handshake** that has no named interface. The same six steps must be reproduced in a slightly different order for the page-refresh reconnect path (inside `CastButtonRpc`), for the playground variant, and — on the other end — inside `receiver-rpc.tsx`.

A `IViewSession` interface would name this:

```typescript
interface IViewSession {
    /** Connect to a remote runtime view. Returns when the channel is ready. */
    connect(): Promise<void>;

    /** The event provider for UI-to-runtime commands. */
    readonly eventProvider: IRuntimeEventProvider;

    /** The subscription for runtime-to-UI state updates. */
    readonly subscription: IRuntimeSubscription;

    /** True while the session is connected. */
    readonly connected: boolean;

    /** Subscribe to connection state changes. */
    onConnectionChange(handler: (connected: boolean) => void): Unsubscribe;

    /** Tear down the session cleanly. */
    dispose(): void;
}
```

A `ChromecastViewSession` adapter would implement this, encapsulating steps 2–6 from `CastButtonRpc`. `CastButtonRpc` shrinks to: call `ChromecastSdk.requestSession()`, then `new ChromecastViewSession(session).connect()`.

The receiver side currently lacks a matching "session accepted" handshake. `receiver-rpc.tsx` rebuilds transport + ProxyRuntime manually on every incoming `webrtc-offer`. A `ReceiverViewSession` that accepts an `IRpcTransport` and returns a ready `ChromecastProxyRuntime` would give the receiver an equivalent depth.

**Benefits:**
- **Deletion test**: deleting `CastButtonRpc`'s manual wiring reveals complexity that is currently hidden in the component. A `IViewSession` seam concentrates it.
- **Locality**: reconnect logic lives in `ChromecastViewSession.connect()`, not scattered across refs and `useEffect` chains.
- **Testability**: `ChromecastViewSession` can be exercised with a mock `IRpcTransport` without a browser component.

---

### 3. Unified View Panel Handshake — `IViewPanelHost`

**Files:**
- `src/panels/track-panel.tsx` (`TimerScreen`)
- `src/panels/timer-panel-chromecast.tsx` (`ReceiverTimerPanel`)
- `src/panels/track-panel-chromecast.tsx` (`ReceiverStackPanel`)
- `src/panels/visual-state-panel.tsx` (`VisualStatePanel`)
- `src/panels/timer-panel.tsx` (`TimerDisplay` → `StackIntegratedTimer`)
- `src/receiver-rpc.tsx`

**Problem (two handshakes, no common contract):**

The browser's track panel connects to a runtime session via:
```
ScriptRuntimeProvider (React Context)
  └── usePanelSize()
  └── useRuntimeExecution()
  └── [callback props for buttons]
```

The Chromecast receiver's panels connect via:
```
ScriptRuntimeProvider (React Context — same!)
  └── PanelSizeProvider
  └── useSnapshotBlocks() / usePrimaryTimer() (same hooks!)
  └── onEvent prop (string) for buttons  ← different
  └── localNow: number prop for clock    ← browser panels don't have this
```

The `ScriptRuntimeProvider` + standard runtime hooks (`useSnapshotBlocks`, `usePrimaryTimer`, `useStackTimers`, `useOutputStatements`) already form a **correct and shared** handshake for display data. This part works and should be preserved.

The friction is in the **input side**: `ReceiverTimerPanel` accepts `onEvent: (name: string) => void`, while `TimerDisplay` accepts four separate callback props. They render the same `TimerStackView` component but pass it through two different adapters. Similarly, `ReceiverStackPanel` duplicates the rendering logic from `VisualStatePanel` rather than calling it.

The fix is to make both panel variants adopt `IRuntimeEventProvider` (from Opportunity 1) so both are:

```
ScriptRuntimeProvider (React Context)
  └── [runtime hooks for display state]
  └── IRuntimeEventProvider (for button commands)
```

`ReceiverTimerPanel` would accept `eventProvider: IRuntimeEventProvider` and pass `eventProvider.dispatch` to `TimerStackView`. `TimerDisplay`'s `StackIntegratedTimer` would construct a `LocalEventProvider` internally (or receive one from context). The `localNow` clock prop — currently Chromecast-only — can be handled inside `LocalEventProvider` since the browser clock is authoritative.

**Benefits:**
- `ReceiverTimerPanel` and `TimerDisplay` become **the same component** with different adapters behind the seam.
- `ReceiverStackPanel` can be deleted in favour of `VisualStatePanel` (same hooks, same contract).
- **Leverage**: any new view surface (e.g., a second-screen web view) gets the full display + command pipeline by implementing `IRuntimeEventProvider`.

---

### 4. Explicit `WorkbenchDisplayMode` Sync Contract

**Files:**
- `src/components/cast/WorkbenchCastBridge.tsx`
- `src/components/cast/CastButtonRpc.tsx` (duplicate `buildPreviewMessage` / `buildReviewMessage`)
- `src/services/cast/rpc/ChromecastProxyRuntime.ts` (`WorkbenchDisplayState`, `subscribeToWorkbench`)
- `src/receiver-rpc.tsx` (mode-driven conditional rendering)

**Problem (duplicated logic, no locality):**

`buildPreviewMessage` and `buildReviewMessage` are **defined twice** — once in `WorkbenchCastBridge.tsx` and once in `CastButtonRpc.tsx` — with slightly different trigger conditions. Both maintain their own `lastFingerprintRef` to deduplicate sends. The workbench mode state is determined by four interacting variables (`viewMode`, `execution.status`, `runtime`, `analyticsSegments`) but the decision logic that maps those to `'idle' | 'preview' | 'active' | 'review'` is split between the two files.

On the receiver, `receiver-rpc.tsx` renders the correct panel imperatively:

```typescript
if (workbenchState.mode === 'preview' && workbenchState.previewData) {
    return <ReceiverPreviewPanel … />;
}
if (workbenchState.mode === 'review' && workbenchState.reviewData) {
    return <ReceiverReviewPanel … />;
}
// else: ScriptRuntimeProvider active/idle
```

This is not wrong, but when a new display mode is added (e.g., `'countdown'` or `'warmup'`) the sender must update both `WorkbenchCastBridge` and `CastButtonRpc`, and the receiver must add another conditional branch. None of these are co-located.

A deeper module would be a `WorkbenchModeResolver`:

```typescript
// Single location for all mode-mapping logic
class WorkbenchModeResolver {
    resolve(state: {
        viewMode: ViewMode;
        executionStatus: ExecutionStatus;
        hasRuntime: boolean;
        hasAnalytics: boolean;
    }): WorkbenchDisplayMode;
}
```

Combined with **one** `WorkbenchCastBridge` that owns the single deduplicating send path, and the `CastButtonRpc` duplicate removed.

**Benefits:**
- **Locality**: mode-mapping logic exists in one place, tested once.
- **Deletion test**: deleting one of the two `buildPreviewMessage` functions reveals the duplication — complexity doesn't vanish, it moves back to the resolver where it belongs.

---

## Summary Table

| # | Opportunity | Files Touched | Primary Gain |
|---|------------|--------------|-------------|
| 1 | Unified UI Command Channel (`IRuntimeEventProvider` browser-side) | `timer-panel.tsx`, `TimerStackView.tsx`, `useWorkbenchRuntime.ts`, `CastButtonRpc.tsx` | New button event = 1 file change; `TimerStackView` testable in isolation |
| 2 | Formal `IViewSession` Handshake | `CastButtonRpc.tsx`, `ChromecastProxyRuntime.ts`, `receiver-rpc.tsx` | Reconnect/handshake logic concentrated; testable without React |
| 3 | Unified Panel Handshake (`IViewPanelHost`) | All `*-chromecast.tsx` panels, `VisualStatePanel`, `TimerDisplay` | Chromecast panels become thin adapters over standard components |
| 4 | `WorkbenchModeResolver` — single mode-mapping path | `WorkbenchCastBridge.tsx`, `CastButtonRpc.tsx`, `receiver-rpc.tsx` | Duplicate mode-logic removed; new modes added in one place |

---

## Current State: What Already Works Well

Before the deepening opportunities, it is worth noting the **correct seams that already exist and should be preserved**:

- **`IRpcTransport`** — transport-agnostic bidirectional channel. Clean interface, independently testable. ✓
- **`IRuntimeSubscription` / `ICastSubscription`** — the fan-out subscription model for pushing runtime state to multiple sinks (local + cast). ✓
- **`ScriptRuntimeProvider` + standard runtime hooks** — the receiver already uses identical hooks (`useSnapshotBlocks`, `usePrimaryTimer`, `useOutputStatements`) as the browser. The display-data handshake is sound. ✓
- **`SerializedBlock` / `RpcMessages`** — the wire protocol is well-typed and versioned. ✓
- **`ProxyBlock` update-in-place cache** — preserves subscriber connections across RPC updates. ✓

The deepening work is specifically on the **input side** (button events) and the **connection lifecycle** (session handshake), not the display output path.

---

## Recommended Sequencing

The opportunities are not independent — they build on each other:

```
Opportunity 1 (Unified Command Channel)
  └── enables Opportunity 3 (Unified Panel Handshake)
        └── reduces surface area of Opportunity 2 (IViewSession)
              └── makes Opportunity 4 (Mode Resolver) a natural cleanup
```

**Start with Opportunity 1.** Introducing `LocalEventProvider` and wiring `TimerStackView` to `IRuntimeEventProvider` is a self-contained change with no protocol impact. It immediately makes `TimerStackView` independently testable. Opportunity 3 follows naturally because the cast panels can then drop their `onEvent: string` prop in favour of the same interface.

---

## Vocabulary Additions for CONTEXT.md

If these opportunities are pursued, the following terms should be added to the project's domain glossary:

| Term | Definition |
|------|-----------|
| **View Session** | A connected channel between a UI surface and a runtime session, providing both display subscriptions and an event command path. Implementations: `ChromecastViewSession`, `LocalViewSession`. |
| **View Panel Host** | A surface that can host a runtime view: large-screen browser track panel, Chromecast receiver, future second-screen web view. All connect via `IViewSession`. |
| **Workbench Display Mode** | The coarse UI state of the workbench as seen by a remote display: `idle`, `preview`, `active`, `review`. Determined by `WorkbenchModeResolver`; sent via `RpcWorkbenchUpdate`. |
| **UI Command** | A named runtime event originating from a UI control (button, D-Pad key, gesture). Dispatched through `IRuntimeEventProvider.dispatch()` regardless of which surface generated it. |
