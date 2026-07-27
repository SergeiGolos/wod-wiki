# Chromecast receiver as a "dummy remote UI" of the WallClock display

> **Status.** Research note grounded in primary source code, written 2026-07-09.
> Every claim cites a file path and line range. Companion to:
> [`docs/cast-architecture-plan.md`](../cast-architecture-plan.md) (architectural plan, marked SUPERSEDED 2026-Q2),
> [`docs/whiteboard-language/`](../whiteboard-language/) (language docs).

## Executive summary

The Chromecast receiver today is a **multi-mode full UI mirror** that renders one of four panels — preview, review, stack, or wall-clock timer — depending on a `mode` string pushed by the sender in `rpc-workbench-update` messages (`playground/src/receiver-rpc.tsx:L459-L528`). To make it act as a **"dummy remote UI version of the wall clock display"** — i.e. a thin read-only mirror that only ever shows the timer — you need to constrain **both ends** of the wire:

1. **Sender side**: constrain `WorkbenchModeResolver` (`src/app/cast/workbenchModeResolver.ts:L36-L58`) to never emit `preview` or `review`, and only emit `active` while a runtime is running (and the trivial `idle` while it's not).
2. **Receiver side**: force `ReceiverApp`'s mode-switch in `playground/src/receiver-rpc.tsx:L459-L495` to ignore `preview`/`review` and always render the wall-clock panel.
3. **Optionally**: drop `EditorCastBridge` preview-data sends (`src/components/organisms/editor/EditorCastBridge.tsx:L43-L93`), drop D-Pad dispatch beyond what the wall-clock needs (`start`/`pause`/`stop`/`next`), and drop the audio service + D-Pad flash if you want it truly silent.

The wall-clock panel itself is already a thin adapter over the shared browser `TimerDisplay` (`src/panels/wallclock-panel-chromecast.tsx:L1-L42`), driven by `useScriptRuntime()` → `ChromecastProxyRuntime` (`src/services/cast/rpc/ChromecastProxyRuntime.ts:L161-L552`) which reflects the sender's state via `IRpcTransport` (`src/services/cast/rpc/IRpcTransport.ts`). So once the panel-switch is constrained, the wall-clock panel "just works" as the mirror — the proxy runtime, clock sync, and subscription plumbing all stay.

The local-tab path (`VITE_CAST_BACKEND=local`) is sufficient for development verification of the constraint; the real Chromecast adds only the WebRTC handshake and clock-sync offset (`src/services/cast/rpc/WebRtcRpcTransport.ts:L107-L109`).

---

## 1. The four receiver display surfaces today

| Panel | File | Renders | Consumes |
|-------|------|---------|----------|
| `ReceiverStackPanel` | `src/panels/track-panel-chromecast.tsx:L10-L12` | `<VisualStatePanel/>` — the stack, lookahead, tracker card | Proxy runtime stack/memory |
| `ReceiverTimerPanel` | `src/panels/wallclock-panel-chromecast.tsx:L16-L42` | The shared `TimerDisplay` (rounds label + countdown + controls) | Proxy runtime stack/memory + `IRuntimeEventProvider` for dispatch |
| `ReceiverPreviewPanel` | `src/panels/preview-panel-chromecast.tsx:L18-L96` | Workout title + scrollable block list with timer hints / dialect chips | `WorkbenchDisplayState.previewData` + D-Pad `onBlockSelect` |
| `ReceiverReviewPanel` | `src/review-panel-chromecast.tsx` (mirror of) | Aggregate metric cards (≤6 cards, 2-column) + Dismiss button | `WorkbenchDisplayState.reviewData` / `analyticsSummary` |

The **dispatch path** for the wall-clock panel is intentionally one-way:

```ts
// src/panels/wallclock-panel-chromecast.tsx:L23-L25
const dispatchEvent = (name: string): void => {
  eventProvider.dispatch({ name, timestamp: new Date() });
};
```

That `dispatchEvent` is mapped to `runtime.handle(...)` in `playground/src/receiver-rpc.tsx:L515-L519`, which sends the event **back to the sender** through `eventRouter.ts` (`src/services/cast/rpc/eventRouter.ts:L44-L60`). The receiver never *executes* anything — every event name (`start`/`pause`/`stop`/`next`/`dismiss`) is just a string bounced to the browser, where the real runtime decides what to do.

## 2. The `WorkbenchDisplayState` mode machine

The mode that selects which panel renders lives on the receiver, set by `workbenchState.mode` (`playground/src/receiver-rpc.tsx:L55-L56`). The sender decides which mode to push via `workbenchModeResolver.resolve(...)` (`src/app/cast/workbenchModeResolver.ts:L22-L34`):

```ts
// src/app/cast/workbenchModeResolver.ts:L36-L58 (private resolveMode)
if (state.viewMode === 'track') {
  if (state.runtime && (state.executionStatus === 'running' || state.executionStatus === 'paused')) return 'active';
  if (state.analyticsSegments.length > 0) return 'review';
  if (state.runtime) return 'active';
  return 'preview';
}
if (state.viewMode === 'review' && state.analyticsSegments.length > 0) return 'review';
return 'preview';
```

The mode string is consumed by the receiver in three branches (`playground/src/receiver-rpc.tsx:L459-L528`):

- `mode === 'preview' && previewData` → `ReceiverPreviewPanel` (lines 459–475)
- `mode === 'review' && reviewData` → `ReceiverReviewPanel` (lines 478–495)
- otherwise (covers `'idle'` and `'active'`) → `ReceiverStackPanel` + `ReceiverTimerPanel` side-by-side (lines 497–528)

The `WorkbenchDisplayState` type itself is `src/services/cast/rpc/ChromecastProxyRuntime.ts:L134-L143`:

```ts
export interface WorkbenchDisplayState {
  mode: 'idle' | 'preview' | 'active' | 'review';
  previewData?: RpcWorkbenchUpdate['previewData'];
  reviewData?: RpcWorkbenchUpdate['reviewData'];
  analyticsSummary?: { totalDurationMs: number; completedSegments: number; projections: ... };
}
```

Note: `'idle'` is the default initial state (`L195` `_workbenchState = { mode: 'idle' }`). The fallback branch in the receiver treats `'idle'` and `'active'` identically — both render the timer panel pair. **This is the single most useful fact for our constraint: the receiver already routes `'idle'` to the wall-clock panel.** Constraining the sender to emit `'active'` while a runtime runs and `'idle'` when nothing is running is sufficient on the sender side.

`EditorCastBridge` is a separate channel that **only** sends `mode: 'preview'` payloads with rich block data (`src/components/organisms/editor/EditorCastBridge.tsx:L43-L93`). If we constrain `workbenchModeResolver` to never emit `'preview'`, but leave `EditorCastBridge` in place, the receiver will get stuck on whatever mode it last had — `EditorCastBridge` is gated on `isRuntimeActive` being false (so it sends when no runtime is active), and `WorkbenchCastBridge` sends during the same window via the resolver. **Both must be constrained together** to keep the receiver's state consistent.

## 3. Data contract pushed over the RPC transport

The transport is a thin interface: `IRpcTransport` (`src/services/cast/rpc/IRpcTransport.ts`). All sender→receiver messages are JSON envelopes carrying one of several `RpcMessage` shapes (see `src/services/cast/rpc/RpcMessages.ts`, referenced from `WorkbenchCastBridge.tsx:L19` and `EditorCastBridge.tsx:L19`). The receiver's runtime listens to all of them inside `ChromecastProxyRuntime.handleRpcMessage` (`L217-L219`, `transport.onMessage`).

Key flags on `IRpcTransport`:
- `needsClockSync: boolean` — `true` on `WebRtcRpcTransport` (`src/services/cast/rpc/WebRtcRpcTransport.ts:L107-L109`), `false` on `BroadcastChannelRpcTransport` (`src/services/cast/rpc/BroadcastChannelRpcTransport.ts:L90-L92`). `CastSessionManager` only spins up `ClockSyncService` when the transport says it needs it (`src/services/cast/rpc/CastSessionManager.ts:L153-L157`).
- `connected: boolean` — gates `WorkbenchCastBridge` and `EditorCastBridge` sends (`WorkbenchCastBridge.tsx:L23`, `EditorCastBridge.tsx:L23`).

**Time** on the receiver: `ProxyClock` returns `Date.now()` *corrected by the sender–receiver clock offset* (`ChromecastProxyRuntime.ts:L66-L81`, the offset is stored at `L204` and applied inside `getSenderClockTimeMs`). The offset is measured by the clock-sync handshake and exposed globally as `window.__chromecast_senderClockTimeMs` (`playground/src/receiver-rpc.tsx:L193-L201`). The shared `TimerDisplay` reads `Date.now()` at `requestAnimationFrame` cadence and calls `calculateDuration(spans, now)` (`src/panels/wallclock-panel.tsx:L137-L156`, `:163-L167`).

This means: **the receiver doesn't run a real clock**. It reads the open timer spans from the proxy stack and interpolates elapsed locally using `Date.now()` + clock-offset. So as long as the proxy runtime keeps the open span up-to-date (it does — `ProxyStack` reflects block state from the sender), the wall-clock panel just shows the timer. No additional wiring needed.

**ProxyStack** (`ChromecastProxyRuntime.ts:L23-L64`) is **read-only** — push/pop/clear are not supported. The browser owns execution. So the receiver cannot "wander" off the sender's state; the wall-clock panel can only ever show what the sender has decided to show.

## 4. The receiver entry point and panel switch

`playground/src/receiver-rpc.tsx` is the entire receiver app. Three init paths (lines 327–430):

1. **Path 1** — local-tab with parent-supplied `externalHandle` (line 337): skips CAF entirely.
2. **Path 2** — local-tab with bare `transport` prop (line 347): builds the session via `createReceiverSession(transport)` in place.
3. **Path 3** — real Chromecast (line 357): initialises the CAF SDK, listens for `READY`, then for `webrtc-offer` signals which call `setupTransport()`.

All three paths converge at the panel-switch return statement (lines 449–529):

```ts
if (!proxyRuntime) { return <WaitingScreen/>; }
if (workbenchState.mode === 'preview' && workbenchState.previewData) { return <PreviewBranch/>; }
if (workbenchState.mode === 'review' && workbenchState.reviewData) { return <ReviewBranch/>; }
return <ActiveBranch/>;  // idle or active → stack + timer
```

The wall-clock panel appears **only** inside the active branch (lines 514–521), wrapped in a two-column layout with the stack panel on the left and the timer on the right. **Constraint target**: collapse the `workbenchState.mode === 'preview'` and `workbenchState.mode === 'review'` branches, so the active-branch is the only possible return path after connection. (If `proxyRuntime` is null, the waiting screen still shows — that's correct for a "dummy mirror": if there's no sender, there's nothing to mirror.)

`ReceiverSessionManager` (`src/services/cast/rpc/ReceiverSessionManager.ts:L108-L164`) is what `wireSession` calls. Its job is to wrap the transport in a `ChromecastProxyRuntime`, route `rpc-audio` messages to the local `audioService`, expose a single workbench-update stream, and surface disconnect. **For a wall-clock-only mirror, the audio routing and the workbench stream are both optional** — see §7.

## 5. D-Pad input handling

`useSpatialNavigation` (`src/hooks/useSpatialNavigation.ts:L1-L334`) scans for `data-nav-id` elements and moves focus on arrow keys. It's used by `ReceiverApp` to wire D-Pad to DOM focus + Enter/Select → `onSelect(elementId, element)`.

In `playground/src/receiver-rpc.tsx:L128-L161`, the `onSelect` handler maps element IDs to events:

- `preview-block-N` → `sendEvent('next')` (line 134–137)
- `btn-stop` → `sendEvent('stop')` (line 147–149)
- `btn-next` → `sendEvent('next')` (line 150–152)
- `btn-dismiss` → `dismissToWaiting()` (line 153–155) — sends `'dismiss'` and forces the receiver back to waiting (line 108–115)

**All of these dispatch to the sender via `runtime.handle(...)` (`playground/src/receiver-rpc.tsx:L72-L80`).** The receiver never interprets them — it's a pure remote control. The `eventRouter` (`src/services/cast/rpc/eventRouter.ts:L44-L60`) maps the strings to runtime-side actions on the sender.

The D-Pad flash overlay (`playground/src/receiver-rpc.tsx:L82-L85`, `:503-L505`) is a 200 ms visual confirmation that a button press was registered. The `audioService.playSound('select', 0.5)` (line 131) is a click beep. Both are pure cosmetics.

The Escape/Backspace handler (lines 433–447) is the only mode-conditional keypress — it sends `'stop'` only in active mode. For a wall-clock-only mirror that's still active, so the Escape → stop handler stays.

## 6. Local-tab vs real-Chromecast divergence

| Aspect | `LocalTabBackend` (dev) | `ChromecastBackend` (prod) |
|--------|-------------------------|---------------------------|
| File | `src/services/cast/adapters/LocalTabBackend.ts:L64-L281` | `src/services/cast/adapters/ChromecastBackend.ts:L44-L181` |
| Transport | `BroadcastChannelRpcTransport` (popup tab via `MessageChannel`) | `WebRtcRpcTransport` (CAF SDK over WebRTC) |
| Receiver HTML | Same `/receiver-rpc.html` opened in popup | Same HTML served on Chromecast via CAF |
| `needsClockSync` | `false` (`BroadcastChannelRpcTransport.ts:L90-L92`) | `true` (`WebRtcRpcTransport.ts:L107-L109`) |
| Session setup | `window.open` + postMessage handshake (LocalTabBackend.ts:L1-L33) | CAF `requestSession()` blocks on user gesture, then WebRTC offer/answer |
| Build flag | `VITE_CAST_BACKEND=local` | `VITE_CAST_BACKEND=chromecast` (or `auto` which resolves at runtime) |

The receiver HTML is the **same file** for both paths (`playground/src/receiver-rpc.tsx:L638-L643` — `Root` component dispatches on `?local=<sessionId>` query param). So a change that constrains the receiver applies to both paths identically. The only behavioural difference is the clock-sync handshake (skipped in local) and the `Window.postMessage` vs WebRTC transport. Either path is sufficient for verifying the wall-clock-only constraint; use the local path for fast iteration and the real Chromecast only for the clock-drift E2E test (`e2e/receiver-clock-drift.e2e.ts`).

## 7. What changes for "dummy wall-clock only"

The constraint is **two-sided**. Sender-side and receiver-side must agree, otherwise the receiver either renders the wrong panel (sender pushes `'preview'`, receiver falls back to active) or sits in waiting (sender doesn't push anything).

### Sender-side (3 changes)

**A. Constrain `WorkbenchModeResolver.resolveMode` to never emit `'preview'` or `'review'`** — `src/app/cast/workbenchModeResolver.ts:L36-L58`. Replace the body with:

```ts
private resolveMode(state: WorkbenchModeResolverState): 'active' | 'idle' {
  if (state.runtime && (state.executionStatus === 'running' || state.executionStatus === 'paused')) {
    return 'active';
  }
  return 'idle';
}
```

This drops the `viewMode === 'track'` short-circuits that returned `'preview'`/`'review'`. The `buildPreviewProjection` / `buildReviewProjection` imports in `workbenchProjection.ts` become dead on this branch.

**B. Suppress `EditorCastBridge` sends** — `src/components/organisms/editor/EditorCastBridge.tsx:L43-L93`. Either remove the component from `NoteEditor`'s render tree, or short-circuit its useEffect to no-op when the wall-clock-only mode is active. Without this, the bridge still sends `mode: 'preview'` payloads with rich block data when no runtime is active, which would conflict with the constrained resolver.

**C. Optional: drop the `workbenchSyncStore` selectors that drive the resolver** — `src/components/organisms/cast/WorkbenchCastBridge.tsx:L12-L17`. If the resolver no longer reads `analyticsSegments` / `selectedBlock` / `documentItems` (because it can't emit review/preview), the bridge's dependency list shrinks. Leave the bridge in place; just remove the unused state subscriptions.

### Receiver-side (1 change)

**D. Force the active branch in `ReceiverApp`** — `playground/src/receiver-rpc.tsx:L459-L495`. Delete the `mode === 'preview'` and `mode === 'review'` branches entirely. After deletion, the only returns are `<WaitingScreen/>` (no runtime) and `<ActiveBranch/>` (timer panel pair). The active branch's left column renders `<ReceiverStackPanel/>` (`L509`); if you want truly timer-only, change `L507-L511` from a two-column flex to omit `<ReceiverStackPanel/>` and let the timer fill the screen.

### Optional cleanup

**E. Audio on the receiver** — `playground/src/receiver-rpc.tsx:L33` `audioService` + `L131` `audioService.playSound('select', 0.5)`. The receiver-side audio routing happens inside `ReceiverSessionManager` (`src/services/cast/rpc/ReceiverSessionManager.ts:L31` imports `audioService`, and routes `rpc-audio` messages). For a "dummy mirror" that emits no UI feedback, drop the D-Pad click beep (`:131`) and drop the audio subscription in `createReceiverSession` (the `audio: boolean` option, `ReceiverSessionManager.ts:L60-L67`).

**F. D-Pad flash overlay** — `playground/src/receiver-rpc.tsx:L82-L85`, `:462-L464`, `:481-L483`, `:503-L505`. Cosmetic 200 ms highlight. Drop if you want a perfectly silent mirror.

**G. The `onSelect` preview-block branch** — `playground/src/receiver-rpc.tsx:L134-L137`. With no preview panel, no `preview-block-N` element exists, so this branch is dead. The `btn-stop` / `btn-next` / `btn-dismiss` branches (`:147-L154`) are inside `ReceiverTimerPanel`'s `TimerDisplay`, so they remain live.

**H. The Escape/Backspace → stop handler** — `playground/src/receiver-rpc.tsx:L433-L447`. Stays. Sends `'stop'` to the sender. Useful as a "kill switch" on the wall-clock.

### What stays the same

- `ChromecastProxyRuntime` and the `ProxyStack` / `ProxyClock` / `ProxyEventBus` infrastructure — they're already read-only and reflect the sender.
- The clock-sync handshake (`WebRtcRpcTransport.needsClockSync = true`) — required for the wall-clock panel to show the right elapsed time on real Chromecast.
- The `window.__chromecast_senderClockTimeMs` global — needed by `calculateDuration` in `TimerDisplay` via `getRuntimeNowMs`.
- The two-column active layout (if you keep both panels) — leaving the stack panel gives the user block context on the TV.

## 8. Existing test coverage

### Stories under `stories/catalog/templates/WallClock/Chromecast.stories.tsx`

12 stories covering the wall-clock + stack panel pair:

| Story | State | Verified |
|-------|-------|----------|
| `Idle` | Receiver booted, no cast | Pulsing waiting splash |
| `Preview` | Note loaded, no runtime | Block list, timer hints, dialect chips |
| `ReadyToStart` | Session root + WaitingToStart on stack | Start/Next transitions |
| `ActiveFran` | 21-15-9 benchmark live | Two-column layout, stack + timer |
| `ActiveAmrap` | 20-minute AMRAP | Countdown + rounds |
| `ActiveEmom` | 10-round EMOM | Interval timer |
| `ActiveRounds` | 5 rounds explicit rep target | Round counter |
| `DeepNesting` | Nested loops | Stack nesting depth |
| `PausedState` | Pause event dispatched | Control states |
| `InterleavedHistory` | Several completed blocks | Completion summary interleaving |
| `LongLabels` | Oversized block labels | Truncation stability |
| `NoMetrics` | Bodyweight, no weight/distance | Layout without MetricTrackerCard |

These cover the **active branch** thoroughly. Constraining the receiver to wall-clock-only would not regress these — they're already driving the active/idle panels.

### E2E tests

- `e2e/acceptance/receiver-workflow.smoke.e2e.ts` — covers the workflow states: idle, preview, ready-to-start, active-fran, active-amrap, paused-state, review-with-projections, fran-results, empty-review. **The `preview` and `review` story assertions would break if the receiver rejects preview/review modes.** Either remove those test cases (preferred if you really want wall-clock-only) or keep them as "if the resolver ever regressed, these fail" guards.
- `e2e/receiver-clock-drift.e2e.ts` — proves the clock-sync handshake works on the receiver. Stays relevant: clock sync is what makes the wall-clock panel show the right elapsed time on real Chromecast.
- `e2e/receiver-tv-platform.e2e.ts` — TV platform tests at 1920×1080 viewport (D-Pad nav, 10-foot font sizes, focus halos). Mostly orthogonal to the mode-switch constraint; layout tests would still pass if you keep the active branch's two-column layout.

### Unit tests to update

- `src/services/cast/__tests__/chromecast-panel-adapters.test.tsx` — verifies the four receiver panels exist and render their respective state. After constraint, two of the four are no longer reachable from the receiver. Decide whether to delete them or keep them as "panel-level unit tests" for if/when the constraint loosens.
- `src/panels/__tests__/preview-panel-chromecast.test.tsx` and `review-panel-chromecast.test.tsx` — same dilemma.

## Recommended change set (ordered, minimum-viable)

1. **`src/app/cast/workbenchModeResolver.ts:L36-L58`** — replace `resolveMode` body so it only returns `'active'` or `'idle'`. Update `src/app/cast/workbenchModeResolver.test.ts` to match.
2. **`playground/src/receiver-rpc.tsx:L459-L495`** — delete the `mode === 'preview'` and `mode === 'review'` branches in `ReceiverApp`. Update `playground/src/receiver-rpc.test.tsx` (if any) to expect the new return values.
3. **`src/components/organisms/editor/EditorCastBridge.tsx`** — short-circuit the useEffect at `L43-L93` to no-op (or remove the bridge from `NoteEditor`).
4. (Optional) **`playground/src/receiver-rpc.tsx:L507-L511`** — remove `<ReceiverStackPanel/>` from the left column if you want the timer to fill the screen.
5. (Optional) **`playground/src/receiver-rpc.tsx:L131`** — drop `audioService.playSound('select', 0.5)` for a silent mirror.
6. (Optional) **`src/services/cast/rpc/ReceiverSessionManager.ts:L60-L67`** — pass `audio: false` to `createReceiverSession` in `wireSession` (line 271 of `receiver-rpc.tsx`) so the receiver doesn't subscribe to `rpc-audio`.
7. **`e2e/acceptance/receiver-workflow.smoke.e2e.ts`** — drop the `preview` and `review` workflow test cases (or repurpose them as resolver-regression guards).
8. **`docs/cast-research/chromecast-wallclock-mirror.md`** — this note. Update when the constraint lands.

## Risks / open questions

- **Sender-side preview data**: if `EditorCastBridge` is suppressed but the editor still wants to show preview info locally (in the browser tab), nothing changes — `EditorCastBridge` only sends to the receiver. But the resolver's `previewData` shape (built in `src/app/cast/workbenchProjection.ts`) becomes dead. Whether to delete that code or leave it for future re-use is a code-hygiene call.
- **`dismissToWaiting` and `'dismiss'` event**: the receiver can dismiss itself back to the waiting screen via the `btn-dismiss` element (currently only rendered by `ReceiverReviewPanel`). If we remove the review panel, the only way to dismiss is `Escape/Backspace` → `sendEvent('stop')`. That's fine — `'stop'` halts the runtime on the sender, which drops the proxy runtime, which flips the receiver to waiting via `proxyRuntime === null` (`:L450`). But verify this end-to-end with `e2e/receiver-workflow.smoke.e2e.ts` before relying on it.
- **Stack panel value**: keeping `<ReceiverStackPanel/>` next to `<ReceiverTimerPanel/>` is the *useful* version of a "wall-clock display" — it shows the upcoming blocks context. Removing it gives a bigger timer but loses context. Worth a UX call before step 4.
- **Clock sync on real Chromecast**: the wall-clock panel will show the wrong elapsed time if clock sync fails (drift accumulates at ~Date.now()). The boot-fallback timer at `playground/src/receiver-rpc.tsx:L60-L66, L391-L395` (`armReceiverBootFallback`) covers *boot* failure, not *clock sync* failure. If the sender's clock-sync handshake hangs, the receiver still renders but with raw `Date.now()`. Consider adding a `clockSyncFailed` degraded UI for the wall-clock mode.
- **`workbenchProjection.ts`**: it builds both `buildPreviewProjection` and `buildReviewProjection`. After step 1, both are dead unless the editor-side preview data still flows (it does, via `EditorCastBridge` which calls them directly — verify). If `EditorCastBridge` is also suppressed in step 3, `workbenchProjection.ts` is fully dead.

## What I did NOT verify

- I did not read `src/services/cast/rpc/RpcMessages.ts` to confirm the exact `RpcWorkbenchUpdate` shape; cited via `WorkbenchBridge.tsx:L6` and `ChromecastProxyRuntime.ts:L136-L137` only. Open the file before relying on `previewData` / `reviewData` field names.
- I did not read `src/services/cast/rpc/RpcMessages.ts` for the `rpc-clock-sync-request` / `rpc-clock-sync-result` envelopes. The clock-drift E2E test at `e2e/receiver-clock-drift.e2e.ts` references them by name only.
- I did not run any test or build. The change set above is grounded in code structure; actual test runs / Storybook renders would catch regressions. Run `npm run test` and `npm run storybook` before merging.
- I did not check whether `TimerDisplay`'s `usePrimaryTimer` / `useSecondaryTimers` hooks return empty arrays on the receiver when no stack snapshots have arrived yet — i.e. what the wall-clock panel renders in the first ~100 ms after connection. The "Idle" story covers this (the splash, not the panel itself).
- I did not verify the `ReceiverSessionHandle.dispose()` cleanup chain when the receiver is forced to wall-clock-only mode (does the workbench subscription get torn down properly even though we never read from it?).