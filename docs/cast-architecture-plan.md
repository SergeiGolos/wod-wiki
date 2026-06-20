# Cast Architecture Simplification Plan

> **Status: SUPERSEDED (2026-Q2).** All four phases shipped.
> Sender session management: `src/services/cast/rpc/CastSessionManager.ts`.
> Receiver session management: `src/services/cast/rpc/ReceiverSessionManager.ts`.
> `ViewSession.ts` deleted; `castTransport` in `CastTransportContext.tsx`.
> Remaining friction (ReceiverApp init paths, CastButtonRpc orchestration)
> is tracked in [global plan Track 4](gml/improve/04-cast-session-wiring-layer.md).

## Problem Statement

The cast system has 5 distinct code paths that all do the same job — wire a sender's runtime to a receiver over an `IRpcTransport` — but with different patterns, different error handling, and duplicated wiring:

| Path | Who wires it | SubscriptionManager | EventProvider | ClockSync |
|------|-------------|-------------------|---------------|-----------|
| CastButtonRpc → ViewSession | `ChromecastSenderViewSession` | ✓ (via registry) | ✓ | ✓ |
| RuntimeTimerPanel inline | React effect (lines 311-348) | ✓ (standalone) | ✓ | ✓ |
| ReceiverApp local-tab | React effect (lines 283-320) | — (receiver side) | — | — |
| ReceiverApp chromecast | `ChromecastReceiverViewSession` | — | — | — |
| EditorCastBridge | React effect | — | ✓ (select-block listener) | — |

When the wire protocol changes, 5 places need updates. When a new RPC message type is added, it must be handled in multiple scattered effects. The `workbenchSyncStore` has become a god store accumulating bridge state (`castTransport`, `subscriptionManager`) solely to cross React context boundaries.

## Principles

- **Depth over breadth**: one module with a small interface behind which the wiring hides.
- **One adapter = hypothetical seam; two adapters = real seam.** The `IRpcTransport` seam is real (two adapters: `BroadcastChannelRpcTransport`, `WebRtcRpcTransport`). The rest of the wiring has one implementation scattered across multiple files.
- **The interface is the test surface.** The new modules should be testable without React.
- **React components render; modules compute.** Orchestration moves out of components.

## New Modules

### 1. CastSessionManager (`src/services/cast/rpc/CastSessionManager.ts`)

**Depth**: encapsulates sender-side session lifecycle — subscription registration, event routing, clock sync, workbench mode push, disconnect handling.

**Interface**:

```typescript
interface CastSessionHandle {
  readonly transport: IRpcTransport;
  readonly eventProvider: IRuntimeEventProvider;
  readonly subscription: IRuntimeSubscription;
  dispose(): void;
}

class CastSessionManager {
  connect(
    transport: IRpcTransport,
    subscriptionRegistry: SubscriptionRegistry | null,
  ): CastSessionHandle;

  dispose(): void;
}
```

**What it absorbs** (deleted from callers):
- `ChromecastSenderViewSession` — entire class, its deps, clock sync wiring
- `RuntimeTimerPanel` lines 311-348 — inline SubscriptionManager, ChromecastRuntimeSubscription, ChromecastEventProvider, ClockSyncService
- `CastButtonRpc` — `connectSession` callback, `senderSessionRef`, `connectingRef`, re-adopt effect, backend state → `cleanupCast` orchestration

**What callers do after**:
- `CastButtonRpc`: click → `backend.startSession()` → `castSession.connect(transport, subscriptionManager)` → set store. ~40 lines.
- `RuntimeTimerPanel`: read `castTransport` from store, use the event subscription already wired by the session manager. No more inline wiring.

### 2. ReceiverSessionManager (`src/services/cast/rpc/ReceiverSessionManager.ts`)

**Depth**: encapsulates receiver-side runtime creation from a transport.

**Interface**:

```typescript
interface ReceiverSessionHandle {
  readonly runtime: ChromecastProxyRuntime;
  onDisconnected(handler: () => void): () => void;
  dispose(): void;
}

function createReceiverSession(
  transport: IRpcTransport,
  options?: { audio?: boolean },
): ReceiverSessionHandle;
```

**What it absorbs** (deleted from callers):
- `ReceiverApp` local-tab effect (lines 283-320) — runtime creation, workbench subscription, audio handler, disconnect handler
- `ReceiverApp` chromecast `setupTransport()` callback (lines 197-274) — same wiring via WebRTC
- `ChromecastReceiverViewSession.recreateTransportSession()` — duplicate of above

**What callers do after**:
- `LocalReceiverApp`: acquire transport → `createReceiverSession(transport)` → pass runtime to `ReceiverApp` for rendering
- `ReceiverApp` (chromecast path): receive transport from CAF signaling → `createReceiverSession(transport)` → render

### 3. Clock sync strategy on `IRpcTransport`

**Depth**: transport knows whether it needs clock sync.

**Interface change**:

```typescript
interface IRpcTransport {
  // ... existing methods ...
  /** Whether clock sync is beneficial for this transport. */
  readonly needsClockSync: boolean;
}
```

- `BroadcastChannelRpcTransport.needsClockSync = false` — same machine, sub-ms offset
- `WebRtcRpcTransport.needsClockSync = true` — real device, potential clock skew

**What it absorbs**: the `ClockSyncService` is only instantiated when `transport.needsClockSync`. Local-tab connections skip it entirely.

## Phases

### Phase 1: CastSessionManager (candidates #1, #3, #5)

Eliminate duplicate sender-side wiring. This is the highest-impact change.

**Step 1.1 — Create `CastSessionManager`**

New file: `src/services/cast/rpc/CastSessionManager.ts`

Move into it:
- Clock sync logic (conditional on `transport.needsClockSync`)
- Subscription creation + registry registration
- Event provider creation + event routing setup
- Workbench mode initial push
- Disconnect cascade (dispose subscription, event provider, clock sync)
- The `connectingRef` guard pattern (built into `connect()`)

The class takes an `IRpcTransport` and a `SubscriptionRegistry | null` and returns a `CastSessionHandle`. No React. No refs. No effects.

**Step 1.2 — Add `needsClockSync` to `IRpcTransport`**

- Add `readonly needsClockSync: boolean` to `IRpcTransport`
- `BroadcastChannelRpcTransport`: `get needsClockSync() { return false; }`
- `WebRtcRpcTransport`: `get needsClockSync() { return true; }`
- Update `FakeRpcTransport` in `src/testing/transport/FakeRpcTransport.ts`
- `CastSessionManager` checks `transport.needsClockSync` before creating `ClockSyncService`

**Step 1.3 — Rewrite `CastButtonRpc`**

Delete from `CastButtonRpc`:
- `senderSessionRef`, `connectingRef` refs
- `connectSession` callback (the entire 40-line async function)
- Re-adopt effect
- Backend state → `setIsCasting` / `cleanupCast` orchestration in state handler

Replace with:
```typescript
const sessionManager = useMemo(() => new CastSessionManager(), []);
const sessionRef = useRef<CastSessionHandle | null>(null);

// Click: cast on
const onNativeClick = async () => {
  if (sessionRef.current) { /* disconnect */ return; }
  const transport = await backend.startSession();
  sessionRef.current = sessionManager.connect(
    transport,
    useWorkbenchSyncStore.getState().subscriptionManager,
  );
  setCastTransport(transport);
  setIsCasting(true);
};

// Click: cast off
// ... sessionRef.current.dispose(); sessionRef.current = null; ...
```

**Step 1.4 — Delete inline wiring from `RuntimeTimerPanel`**

Delete lines ~311-348 (the inline SubscriptionManager, ChromecastRuntimeSubscription, ChromecastEventProvider, ClockSyncService creation).

The runtime events are already flowing through the subscription that `CastSessionManager` registered with the `SubscriptionManager` via `CastButtonRpc`. The `RuntimeTimerPanel` no longer needs to create its own subscription.

For event routing (D-Pad next/start/pause/stop): route through the session manager's event provider, which is already wired. The `CastButtonRpc` already subscribes to events and calls `routeRuntimeEvent`. `RuntimeTimerPanel` can subscribe to the same event stream via the store or a context.

**Step 1.5 — Remove `castTransport`-dependent wiring from `EditorCastBridge`**

`EditorCastBridge` sends preview data when no runtime is active. After Phase 1, the `castTransport` is still in the store (used by `WorkbenchCastBridge` too). `EditorCastBridge` continues to read it for preview sends and select-block handling — this is correct and doesn't duplicate the session wiring.

**Step 1.6 — Remove `subscriptionManager` from `workbenchSyncStore`**

The store bridge was added to get `SubscriptionManager` to `CastButtonRpc`. With `CastSessionManager`, the click handler reads it via `useWorkbenchSyncStore.getState().subscriptionManager` at connect time (one-shot read, no subscription). Remove the `subscriptionManager` selector from `CastButtonRpc` — pass the store getter to the session manager instead.

Actually: keep the store field. It's useful for one-shot reads. But remove the React subscription (`useWorkbenchSyncStore(s => s.subscriptionManager)`) from `CastButtonRpc` — use `getState()` at connect time instead. This eliminates the dep that was causing `connectSession` reference changes.

**Step 1.7 — Update tests**

- Delete `ChromecastSenderViewSession` tests → replace with `CastSessionManager` tests
- `LocalTabBackend` tests unchanged (transport creation)
- `ClockSyncService` tests unchanged (still used for WebRTC)
- Add `CastSessionManager` unit test: connect with local transport → no clock sync, subscription registered
- Add `CastSessionManager` unit test: connect with WebRTC transport → clock sync runs

### Phase 2: ReceiverSessionManager (candidates #2, #4)

Unify receiver-side wiring. Depends on Phase 1 being stable.

**Step 2.1 — Create `ReceiverSessionManager`**

New file: `src/services/cast/rpc/ReceiverSessionManager.ts`

Extract into `createReceiverSession(transport, options)`:
- Create `ChromecastProxyRuntime(transport)`
- Subscribe to workbench updates
- Subscribe to audio messages
- Register disconnect handler
- Return `{ runtime, onDisconnected, dispose }`

**Step 2.2 — Simplify `ReceiverApp` local-tab path**

In `ReceiverApp` (or its parent `LocalReceiverApp`):
```typescript
// In LocalReceiverApp's .then() callback:
const handle = createReceiverSession(result.transport, { audio: true });
handle.onDisconnected(() => { /* reset state */ });
setState({ kind: 'connected', handle, runtime: handle.runtime, dispose: handle.dispose });
```

`ReceiverApp` receives the already-created runtime. No more inline effect for local-tab wiring.

**Step 2.3 — Simplify `ReceiverApp` chromecast path**

In the chromecast CAF signaling handler:
```typescript
signaling.onSignal((signal) => {
  if (signal.type === 'webrtc-offer') {
    const transport = new WebRtcRpcTransport('answerer', signalingFacade);
    const handle = createReceiverSession(transport);
    handle.onDisconnected(() => { /* cleanup */ });
    setProxyRuntime(handle.runtime);
  }
});
```

**Step 2.4 — Delete `ChromecastReceiverViewSession` and `LocalViewSession`**

Neither has external consumers (only re-exported from `index.ts`). After Steps 2.2-2.3, they have no internal consumers either. Delete them from `ViewSession.ts` and `index.ts`.

**Step 2.5 — Remove `runtime` prop from `ReceiverApp`**

`ReceiverApp` currently accepts `transport?` and `runtime?` props for the local-tab path. After Phase 2, `LocalReceiverApp` passes a `ReceiverSessionHandle` instead. `ReceiverApp` accepts just the runtime (already connected and wired).

### Phase 3: Store cleanup (candidate #5)

Narrow `workbenchSyncStore` scope. Depends on Phase 1.

**Step 3.1 — Remove `castTransport` from the store**

After Phase 1, `CastButtonRpc` no longer needs to set `castTransport` in the store for `RuntimeTimerPanel` (the inline wiring is gone). But `WorkbenchCastBridge` and `EditorCastBridge` still read `castTransport` from the store.

Options:
- **A**: Keep `castTransport` in the store but as a simple `IRpcTransport | null` with no subscription. Components that need it read via `getState()` one-shot.
- **B**: Move to a `CastTransportContext` provided by `CastButtonRpc`. Bridges inside the provider tree read from context.

Recommend **B**: `CastButtonRpc` is always in the tree above the bridges. A context is the React-native way to pass this down. The store stops being the cast bridge.

**Step 3.2 — Keep `subscriptionManager` in the store for one-shot reads**

`CastSessionManager` reads `subscriptionManager` at connect time via `useWorkbenchSyncStore.getState().subscriptionManager`. No React subscription. The field stays in the store as a "cross-context accessor" — acceptable because it's read once, not observed.

### Phase 4: Clean up dead exports and files

After Phases 1-3.

- Delete `ChromecastSenderViewSession` from `ViewSession.ts` (absorbed by `CastSessionManager`)
- Delete `ChromecastReceiverViewSession` from `ViewSession.ts` (absorbed by `ReceiverSessionManager`)
- Delete `LocalViewSession` from `ViewSession.ts` (dead code)
- Clean up `ViewSession.ts` — if all three classes are gone, delete the file and move `IViewSession` to its own file or inline it
- Update `src/services/cast/rpc/index.ts` exports
- Update `src/hooks/useCastSignaling.ts` barrel
- Remove `SubscriptionManagerContext.ts` and `useSubscriptionManager` if no longer used directly

## Dependency graph

```
Phase 1 (CastSessionManager + clock sync strategy)
  └── Phase 2 (ReceiverSessionManager) — independent of Phase 1, but do after
  └── Phase 3 (Store cleanup) — depends on Phase 1
       └── Phase 4 (Dead code cleanup) — depends on Phases 1-3
```

Phases 1 and 2 are independent and could run in parallel, but Phase 1 is higher impact and should land first.

## Risks

| Risk | Mitigation |
|------|-----------|
| `RuntimeTimerPanel` inline wiring exists because `CastButtonRpc`'s session didn't cover the runtime-level path | Verify that the subscription registered by `CastSessionManager` reaches the SAME `SubscriptionManager` that `RuntimeLifecycleProvider` owns. The whole point of the `subscriptionRegistry` parameter. |
| `EditorCastBridge` and `WorkbenchCastBridge` both read `castTransport` from the store | Phase 3 (context migration) must move both bridges. Test by confirming preview/active mode transitions still work. |
| Receiver-side `ChromecastReceiverViewSession` is used by tests | Check `ViewSession.test.ts` before deleting. Rewrite tests against `ReceiverSessionManager`. |
| Clock sync skip might hide real latency issues in local mode | `needsClockSync = false` is correct for `BroadcastChannelRpcTransport` (same-machine, same-clock). The offset is always ~0ms. |

## File change summary

| File | Phase | Action |
|------|-------|--------|
| `src/services/cast/rpc/CastSessionManager.ts` | 1 | **CREATE** — sender session manager |
| `src/services/cast/rpc/ReceiverSessionManager.ts` | 2 | **CREATE** — receiver session factory |
| `src/services/cast/rpc/IRpcTransport.ts` | 1 | **EDIT** — add `needsClockSync` |
| `src/services/cast/rpc/BroadcastChannelRpcTransport.ts` | 1 | **EDIT** — `needsClockSync = false` |
| `src/services/cast/rpc/WebRtcRpcTransport.ts` | 1 | **EDIT** — `needsClockSync = true` |
| `src/services/cast/rpc/ViewSession.ts` | 1,4 | **EDIT** — remove `ChromecastSenderViewSession`, delete `ChromecastReceiverViewSession`, `LocalViewSession`. File may be deleted entirely. |
| `src/services/cast/rpc/index.ts` | 1,4 | **EDIT** — update exports |
| `src/hooks/useCastSignaling.ts` | 1,4 | **EDIT** — re-export `CastSessionManager` instead of `ChromecastSenderViewSession` |
| `src/components/organisms/cast/CastButtonRpc.tsx` | 1 | **REWRITE** — shrink to ~40 lines using `CastSessionManager` |
| `src/components/organisms/editor/RuntimeTimerPanel.tsx` | 1 | **EDIT** — delete inline cast wiring (lines 305-348) |
| `src/components/organisms/cast/WorkbenchCastBridge.tsx` | 3 | **EDIT** — read transport from context instead of store |
| `src/components/organisms/editor/EditorCastBridge.tsx` | 3 | **EDIT** — read transport from context instead of store |
| `playground/src/receiver-rpc.tsx` | 2 | **REWRITE** — `LocalReceiverApp` and `ReceiverApp` use `ReceiverSessionManager` |
| `src/stores/workbenchSyncStore.ts` | 3 | **EDIT** — remove `castTransport`, keep `subscriptionManager` |
| `src/contexts/RuntimeLifecycleProvider.tsx` | 1 | **EDIT** — remove store sync for subscriptionManager (or keep for one-shot) |
| `src/testing/transport/FakeRpcTransport.ts` | 1 | **EDIT** — add `needsClockSync` |
| `src/services/cast/rpc/ViewSession.test.ts` | 2 | **REWRITE** — test `ReceiverSessionManager` instead |

## Verification checklist

After each phase:

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] Local-tab cast: popup opens, handshake completes, clock sync runs once or not at all
- [ ] Local-tab cast: runtime stack snapshots appear on receiver
- [ ] Local-tab cast: D-Pad events (next/start/pause/stop) route correctly
- [ ] Local-tab cast: disconnect cleans up both sides
- [ ] No runaway clock sync loop in console

## Progress (2026-06-19)

**S4a (Phase 4 partial) is done.** See `docs/gml/improve/EXECUTION-LOG.md` and `docs/gml/improve/04-cast-session-wiring-layer.md` for details. Specifically:

- `registerRuntime` / `unregisterRuntime` deleted from `CastSessionManager.ts` (0 production callers).
- `useCastSignaling.ts` barrel deleted; 4 consumers now import from real sources.
- `eventRouter.ts` **kept** (2 real consumers: `CastButtonRpc` and the cast-roundtrip test — one consumer would have been a hypothetical seam, two is a real one).
- `config.ts` import-time `console.log`s removed; stale `CastTransportContext` comment rewritten.

Phases 1–3 and the remaining Phase 4 work (ViewSession cleanup, SubscriptionManagerContext removal) are tracked under S4b and S4c in `docs/gml/improve/00-global-plan.md`.
