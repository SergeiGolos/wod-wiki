# UI Display Pipeline Architecture Report

**Date:** 2026-05-12  
**Area:** View Panels, Chromecast Receiver, Runtime Event Pipeline  
**Status:** Analysis — Design Target + Deepening Opportunities  
**Scope:** Large-screen browser view, Chromecast cast receiver, UI button events, runtime session handshake

---

## Design Principle

> **The `ScriptRuntime` is the single source of truth. It runs in the browser. Every UI surface — the large-screen track panel, the Chromecast receiver, and any future second-screen — is an async client. All surfaces connect through the same interface: subscriptions deliver state out; `IEvent` objects carry commands in. The browser's local view is a zero-latency client, not a privileged direct caller.**

The Chromecast path already follows this principle. The browser's large-screen path is the exception that needs to be aligned.

---

## Target Architecture

```
                    ┌──────────────────────────────────────────┐
                    │              ScriptRuntime                │
                    │           (source of truth)              │
                    │                                          │
                    │  runtime.handle(IEvent) ◄─── all commands│
                    │  subscribeToStack()     ─────► all state │
                    └───────────────┬──────────────────────────┘
                                    │
                     SubscriptionManager (fan-out)
                    ┌───────────────┴──────────────────────┐
                    │                                      │
          ┌─────────▼──────────┐              ┌────────────▼────────────────┐
          │   LocalViewSession │              │   ChromecastViewSession     │
          │                    │              │                             │
          │  subscription:     │              │  subscription:              │
          │  LocalRuntimeSub   │              │  ChromecastRuntimeSub       │
          │  → workbenchStore  │              │  → IRpcTransport            │
          │                    │              │        │ (WebRTC)           │
          │  eventProvider:    │              │  eventProvider:             │
          │  LocalEventProvider│              │  ChromecastEventProvider    │
          │  → runtime.handle()│              │  ← IRpcTransport            │
          └─────────┬──────────┘              └────────────┬────────────────┘
                    │                                      │
          Browser Track Panel                   Chromecast Receiver
          ┌─────────────────┐                  ┌──────────────────────────┐
          │ScriptRuntime    │                  │ChromecastProxyRuntime    │
          │  Provider       │                  │ (mirrors IScriptRuntime) │
          │  (context)      │                  │ ScriptRuntimeProvider    │
          │                 │                  │   (same context!)        │
          │  TimerDisplay   │                  │                          │
          │  VisualState    │                  │  ReceiverTimerPanel      │
          │  Panel          │                  │  ReceiverStackPanel      │
          └─────────────────┘                  └──────────────────────────┘
```

**Key properties of this model:**

- Both surfaces use `ScriptRuntimeProvider` + standard runtime hooks (`useSnapshotBlocks`, `usePrimaryTimer`, `useOutputStatements`) for display state. This already works correctly and is preserved unchanged.
- Both surfaces dispatch user commands as `IEvent` objects via `IRuntimeEventProvider`. This is the change.
- `LocalViewSession` is zero-latency: `LocalEventProvider.dispatch(event)` calls `runtime.handle(event)` directly and manages the 20ms tick loop internally as an implementation detail.
- `ChromecastViewSession` is async: events travel over WebRTC, but the interface is identical to `LocalViewSession`.
- The runtime has no knowledge of how many clients are connected or what transport they use.

---

## Current Architecture: The Privileged Browser Path

### Path 1 — Browser Large-Screen Track Panel (current)

```
TimerStackView buttons
  │ onStart() / onStop() / onNext()        ← four separate callback props
  ▼
useWorkbenchRuntime.handleStart / handleNext / …
  │
  ├── execution.start()                    ← starts 20ms tick loop
  ├── execution.pause()                    ← stops tick loop
  ├── runtime.handle(new NextEvent())      ← dispatches IEvent (inconsistent!)
  └── execution.stop() + completeWorkout() ← side-effects mixed in
```

`execution.start()` manages the 20ms `TickEvent` loop. It is **infrastructure**, not a user command — but it is called directly by UI button handlers. When the user presses Start on the browser, the tick loop starts. When the Chromecast remote presses Start, the event travels over WebRTC and eventually calls `execution.start()` too — via `WorkbenchHandles` stored in the Zustand store as a bridge.

`next` already dispatches an `IEvent` (`runtime.handle(new NextEvent())`), but `start` and `pause` do not. This inconsistency means button behaviour is split across two different execution models in the same component.

### Path 2 — Chromecast Receiver (current)

```
ReceiverTimerPanel button
  │ onEvent('start')                       ← string event name
  ▼
ReceiverApp.sendEvent('start')
  ▼
proxyRuntime.handle({ name: 'start', … })
  ▼
IRpcTransport.send({ type: 'rpc-event', name: 'start', … })
  │ (WebRTC wire)
  ▼
CastButtonRpc.eventProvider.onEvent(handler)
  ▼
state.handles.handleStart()               ← Zustand store lookup
  ▼
execution.start()                         ← 20ms tick loop starts
```

The Chromecast path dispatches string event names and delivers them via `IRpcTransport`. This is correct in shape. But it lands in `WorkbenchHandles` — a Zustand store slot whose only purpose is to be a named target for Chromecast events. The handles are the bridge between "event arrived from RPC" and "execution method on a React closure." They are an artifact of the two paths being different, not a real abstraction.

### The Divergence in One Diagram

```
Browser large-screen                      Chromecast Receiver
──────────────────────────────────────────────────────────────
TimerStackView                            TimerStackView
  ↓ onStart()           (callback prop)     ↓ onEvent('start')   (string)
  ↓
useWorkbenchRuntime                       ChromecastProxyRuntime.handle()
  ↓ execution.start()   (direct)            ↓ IRpcTransport
  ScriptRuntime tick loop                   ChromecastEventProvider
                                            ↓ WorkbenchHandles.handleStart()
                                            execution.start()
```

Both paths end at `execution.start()`, but through completely different routes. `WorkbenchHandles` in the Zustand store exists purely to bridge the gap — it has no value of its own.

---

## What Already Works Correctly

The following seams already follow the design principle and must be preserved:

- **`IRpcTransport`** — transport-agnostic bidirectional channel, independently testable. ✓
- **`IRuntimeSubscription` / `ChromecastRuntimeSubscription`** — fan-out model for delivering runtime state to multiple sinks. ✓
- **`ScriptRuntimeProvider` + standard runtime hooks** — both the browser and Chromecast receiver already use the same hooks (`useSnapshotBlocks`, `usePrimaryTimer`, `useOutputStatements`, `useOutputStatements`). The display-data path is correct. ✓
- **`SerializedBlock` / `RpcMessages`** — well-typed wire protocol. ✓
- **`ProxyBlock` update-in-place cache** — preserves subscriber connections across RPC updates. ✓
- **`ChromecastProxyRuntime.handle()` → RPC** — receiver-to-browser event relay is correctly shaped. ✓
- **`NextEvent` via `runtime.handle()`** — next is already event-driven; start/pause/stop need to follow. ✓

---

## Deepening Opportunities

### 1. `LocalEventProvider` — Browser Joins the Async Interface

**Files:**
- `src/runtime/contracts/IRuntimeEventProvider.ts` (interface exists, needs browser adapter)
- `src/runtime/hooks/useRuntimeExecution.ts` (tick loop — becomes an implementation detail)
- `src/panels/timer-panel.tsx`
- `src/components/workout/TimerStackView.tsx`
- `src/components/workbench/useWorkbenchRuntime.ts`
- `src/components/layout/workbenchSyncStore.ts` (`WorkbenchHandles` — can be removed)

**Problem:**

`IRuntimeEventProvider` is defined and implemented for Chromecast (`ChromecastEventProvider`). The browser has no implementation — it uses prop callbacks instead. This means:

- `TimerStackView` has four callback props (`onStart`, `onPause`, `onStop`, `onNext`) that exist only because the browser path doesn't use the event interface.
- `WorkbenchHandles` in the Zustand store exists only because the Chromecast path needs a named bridge to the React closures that manage the tick loop.
- A new button (e.g., `select-block`, `lap`, `skip`) requires: new prop on `TimerStackViewProps`, prop threaded through `TimerDisplay` → `TrackPanel` → `Workbench.tsx`, new case in `useWorkbenchRuntime`, new case in `CastButtonRpc`'s event handler.

**Solution:**

Implement `LocalEventProvider`:

```typescript
class LocalEventProvider implements IRuntimeEventProvider {
    constructor(
        private readonly runtime: IScriptRuntime,
        private readonly execution: UseRuntimeExecutionReturn,
    ) {}

    dispatch(event: IEvent): void {
        switch (event.name) {
            case 'start':
                this.execution.start();        // starts 20ms tick loop
                break;
            case 'pause':
                this.execution.pause();
                break;
            case 'stop':
                this.execution.stop();
                break;
            default:
                this.runtime.handle(event);    // all other events go through runtime
                break;
        }
    }

    onEvent(handler: (event: IEvent) => void): Unsubscribe {
        return this.runtime.eventBus.on('*', (event) => handler(event), 'local-event-provider');
    }

    dispose(): void {}
}
```

`TimerStackView` drops four callback props in favour of one:

```typescript
interface TimerStackViewProps {
    elapsedMs: number;
    hasActiveBlock: boolean;
    isRunning: boolean;
    eventProvider: IRuntimeEventProvider;   // ← the seam
    compact?: boolean;
    // display-only props …
}
```

A button press becomes:
```typescript
eventProvider.dispatch({ name: 'start', timestamp: new Date() });
```

**`WorkbenchHandles` removal:**

With `LocalEventProvider` handling browser commands and `ChromecastEventProvider` routing cast commands directly to the `LocalEventProvider` (via the runtime), the Zustand store no longer needs `WorkbenchHandles`. Cast events arrive at `ChromecastEventProvider.onEvent()` → `LocalEventProvider.dispatch()` → tick loop + runtime. No Zustand bridge.

**Benefits:**
- Adding a new UI command = define an `IEvent` name + one case in `LocalEventProvider`. No prop threading.
- `TimerStackView` becomes a pure display component testable with a mock `IRuntimeEventProvider`.
- `WorkbenchHandles` in the store is deleted — the store becomes pure display state.
- The 20ms tick loop is hidden behind the interface as an implementation detail.

---

### 2. `IViewSession` — Symmetric Handshake for All Surfaces

**Files:**
- `src/components/cast/CastButtonRpc.tsx` (476 lines)
- `src/services/cast/rpc/ChromecastProxyRuntime.ts` (582 lines)
- `src/receiver-rpc.tsx` (378 lines)
- `src/services/cast/rpc/WebRtcRpcTransport.ts`
- `src/services/cast/rpc/ChromecastRuntimeSubscription.ts`

**Problem:**

A "view session" is the connected pair: subscription (runtime → surface) + event provider (surface → runtime). This concept has no interface. The connection protocol for Chromecast is implicit in 476 lines of `CastButtonRpc`, covering:

1. Cast SDK state management
2. `WebRtcRpcTransport` creation and lifecycle
3. Clock synchronisation (`ClockSyncService`)
4. `ChromecastRuntimeSubscription` → `SubscriptionManager`
5. `ChromecastEventProvider` → `WorkbenchHandles` routing
6. Initial workbench-mode message

Steps 2–6 must be reproduced (in slightly different order) for the page-refresh reconnect path. The receiver side (`receiver-rpc.tsx`) duplicates the transport + runtime wiring manually on every incoming `webrtc-offer`.

**Solution:**

```typescript
interface IViewSession {
    readonly eventProvider: IRuntimeEventProvider;
    readonly subscription: IRuntimeSubscription;
    readonly connected: boolean;
    connect(): Promise<void>;
    onConnectionChange(handler: (connected: boolean) => void): Unsubscribe;
    dispose(): void;
}
```

Implementations:

| Class | Transport | Used by |
|-------|-----------|---------|
| `LocalViewSession` | Direct reference | Browser track panel |
| `ChromecastViewSession` | `WebRtcRpcTransport` | `CastButtonRpc` (sender) |
| `ReceiverViewSession` | `WebRtcRpcTransport` | `receiver-rpc.tsx` (answerer) |

`CastButtonRpc` shrinks to: obtain Cast SDK session, create `ChromecastViewSession`, call `connect()`. All wiring is inside the session.

`ReceiverApp` shrinks to: `ReceiverViewSession.connect()` → `ScriptRuntimeProvider runtime={session.proxyRuntime}`.

The clock sync, subscription registration, and reconnect logic all live inside `ChromecastViewSession.connect()`, testable without React.

**Benefits:**
- **Deletion test**: deleting `CastButtonRpc`'s manual wiring reveals complexity that belongs in `ChromecastViewSession`. After the move, `CastButtonRpc` is ~50 lines.
- **Locality**: the reconnect case is handled by `ChromecastViewSession.connect()` — one implementation, one test.
- `ReceiverViewSession` gives the receiver a symmetric handshake that mirrors the sender's.

---

### 3. Unified View Panels — Chromecast Panels Become Thin Adapters

**Files:**
- `src/panels/timer-panel-chromecast.tsx` (`ReceiverTimerPanel` — ~80 lines, mostly duplicates `TimerDisplay`)
- `src/panels/track-panel-chromecast.tsx` (`ReceiverStackPanel` — ~120 lines, duplicates `VisualStatePanel`)
- `src/panels/visual-state-panel.tsx`
- `src/panels/timer-panel.tsx`

**Problem:**

Once Opportunity 1 is in place, `ReceiverTimerPanel` and `TimerDisplay` differ only in how they obtain their `eventProvider`:

- `TimerDisplay`: constructs a `LocalEventProvider` from the runtime context.
- `ReceiverTimerPanel`: wraps the `onEvent(name: string)` callback as an event provider.

With a unified `IRuntimeEventProvider` interface, both become the same component. `ReceiverTimerPanel` can be deleted; `TimerDisplay` is used on both surfaces.

Similarly, `ReceiverStackPanel` duplicates `VisualStatePanel` entirely — same hooks (`useSnapshotBlocks`, `useOutputStatements`), same rendering. `ReceiverStackPanel` can be deleted; `VisualStatePanel` is used on both surfaces.

The `localNow: number` prop currently passed to Chromecast panels for clock interpolation is the only surface-specific concern. This is resolved by the `LocalViewSession.eventProvider` exposing a `now()` method, or by the shared `useLocalNow()` hook that both surfaces use (the receiver already has clock sync via `ProxyClock`).

**Benefits:**
- ~200 lines of duplicated panel code deleted.
- Any improvement to `TimerDisplay` or `VisualStatePanel` immediately applies to the Chromecast receiver.

---

### 4. `WorkbenchModeResolver` — Single Display Mode Decision

**Files:**
- `src/components/cast/WorkbenchCastBridge.tsx`
- `src/components/cast/CastButtonRpc.tsx` (duplicate `buildPreviewMessage` / `buildReviewMessage`)
- `src/services/cast/rpc/ChromecastProxyRuntime.ts` (`WorkbenchDisplayState`)
- `src/receiver-rpc.tsx` (mode-driven conditional render)

**Problem:**

The mapping from workbench state (`viewMode`, `execution.status`, `runtime`, `analyticsSegments`) to display mode (`idle | preview | active | review`) is implemented twice — once in `WorkbenchCastBridge.tsx` and once in `CastButtonRpc.tsx` — with slightly different trigger conditions and independent fingerprinting. A new display mode (e.g., `countdown`, `warmup`) requires changes in at least three files.

**Solution:**

```typescript
class WorkbenchModeResolver {
    resolve(state: {
        viewMode: ViewMode;
        executionStatus: ExecutionStatus;
        hasRuntime: boolean;
        hasAnalytics: boolean;
        selectedBlock: WodBlock | null;
        documentItems: DocumentItem[];
    }): RpcWorkbenchUpdate;
}
```

One `WorkbenchCastBridge` owns the single deduplication fingerprint and the single send path. `CastButtonRpc`'s duplicate helpers are deleted.

Under `IViewSession`, workbench mode sync becomes a responsibility of `ChromecastViewSession` itself — it subscribes to the workbench store and sends the resolved mode update when state changes. No React component needed.

---

## The `WorkbenchHandles` Artifact

`WorkbenchHandles` in `workbenchSyncStore.ts` is the most visible symptom of the current divergence:

```typescript
// Currently in workbenchSyncStore.ts
interface WorkbenchHandles {
    handleStart: () => void;
    handlePause: () => void;
    handleStop: () => void;
    handleNext: () => void;
    handleStartWorkoutAction: (block: WodBlock) => void;
}
```

This exists because `CastButtonRpc`'s `eventProvider.onEvent()` handler needs to call `execution.start()` (a React closure) when a Chromecast button event arrives. The Zustand store is used as a slot to store the closure so it's accessible from outside the React component tree.

Under the target architecture:
- Chromecast button events arrive at `ChromecastViewSession.eventProvider.onEvent()`.
- The handler calls `localEventProvider.dispatch(event)`.
- `LocalEventProvider.dispatch()` manages the tick loop internally.
- No closures need to be stored in the Zustand store.
- `WorkbenchHandles` is deleted.

The Zustand store (`workbenchSyncStore`) becomes pure display state: runtime reference, execution status (read-only), analytics segments, document structure. No callback slots.

---

## Summary Table

| # | Opportunity | Core Change | Files Deleted / Simplified |
|---|------------|-------------|---------------------------|
| 1 | `LocalEventProvider` | Browser buttons → `IEvent` via `IRuntimeEventProvider` | `WorkbenchHandles` from store; 4 callback props from `TimerStackView` |
| 2 | `IViewSession` | Connection handshake = named interface | `CastButtonRpc` shrinks ~80%; `receiver-rpc.tsx` shrinks ~60% |
| 3 | Unified panels | Chromecast panels adopt shared components | `timer-panel-chromecast.tsx`, `track-panel-chromecast.tsx` deleted |
| 4 | `WorkbenchModeResolver` | Single mode-mapping location | Duplicate helpers in `CastButtonRpc` deleted |

---

## Recommended Sequencing

```
1. LocalEventProvider  ← unblocks everything else
   │
   └── 3. Unified panels  ← Chromecast panels become thin adapters
   │
   └── 2. IViewSession    ← CastButtonRpc / receiver-rpc wiring collapses
             │
             └── 4. WorkbenchModeResolver  ← natural cleanup once IViewSession owns the channel
```

**Start with Opportunity 1.** It is self-contained, requires no protocol changes, and immediately makes `TimerStackView` and the runtime event system testable in isolation. Everything else follows.

---

## Vocabulary Additions for CONTEXT.md

| Term | Definition |
|------|-----------|
| **View Session** | A connected pair of (subscription, eventProvider) linking a UI surface to the runtime. The browser's local view and the Chromecast receiver are both View Sessions. The runtime has no knowledge of how many sessions are attached. |
| **Local View Session** | A zero-latency `IViewSession` where `LocalEventProvider` calls `runtime.handle()` directly and manages the tick loop internally. |
| **Chromecast View Session** | An async `IViewSession` where commands travel over WebRTC via `ChromecastEventProvider` and state travels via `ChromecastRuntimeSubscription`. |
| **UI Command** | A named `IEvent` originating from a user control (button, D-Pad key, gesture). All surfaces dispatch UI Commands through `IRuntimeEventProvider`. The runtime processes them uniformly. |
| **Tick Loop** | The 20ms interval that dispatches `TickEvent` to drive the runtime forward. Infrastructure — managed by `LocalEventProvider`, not exposed to UI components. |
