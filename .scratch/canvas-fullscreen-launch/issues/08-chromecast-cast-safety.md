Type: research
Status: resolved

## Question

What constraints does the Chromecast receiver impose on the unified fullscreen surface, and what must the canvas-editor wiring ticket (05) preserve to avoid regressing cast behavior? Specifically: how does the receiver pick its panel from the sender's `WorkbenchDisplayState.mode`, what payload format carries the timer/review state to the TV, and which transitions during the timer → review handoff (ticket 03) risk a cast-side glitch or stuck state?

The answer is a written risk note + cast-safe-change-set the wiring ticket (05) can adopt verbatim.

## Answer

The receiver is a multi-mode full UI mirror today. It picks one of four panels from `WorkbenchDisplayState.mode` (`playground/src/receiver-rpc.tsx:459–528`):

- `'preview'` → `ReceiverPreviewPanel` (workout picker) — lines 459–474
- `'review'` → `ReceiverReviewPanel` (metric cards) — lines 478–494
- `'idle'` / `'active'` → `ReceiverStackPanel` + `ReceiverTimerPanel` side-by-side — lines 497–528

To make it a wall-clock-only dummy, both ends must be constrained:

**Sender side** (`src/app/cast/workbenchModeResolver.ts:36–58`): replace `WorkbenchModeResolver.resolveMode` to return only `'active'` (when a runtime runs/pauses) or `'idle'` (when it doesn't). Drop `EditorCastBridge`'s preview-data sends (`src/components/organisms/editor/EditorCastBridge.tsx:43–93`) so the receiver never gets a `'preview'` payload via the alternate path.

**Receiver side** (`playground/src/receiver-rpc.tsx:459–495`): delete the `mode === 'preview'` and `mode === 'review'` branches in `ReceiverApp`. Optional cleanup: drop `<ReceiverStackPanel/>` from the left column at line 509 so the timer fills the screen; drop the audio click beep at line 131 for a silent mirror.

**Why this is cast-safe for the canvas-editor unification**:

1. The wall-clock panel already works as a mirror. It is a thin adapter over the shared `TimerDisplay` (`src/panels/wallclock-panel-chromecast.tsx:16–42`), driven by `ChromecastProxyRuntime` (`src/services/cast/rpc/ChromecastProxyRuntime.ts:161–552`) which reflects the sender's state via `IRpcTransport`.
2. The proxy's `ProxyStack` is read-only — push/pop/clear not supported (`src/services/cast/rpc/ChromecastProxyRuntime.ts:23–64`). The receiver cannot wander off the sender's state.
3. Time interpolation uses `Date.now()` corrected by the clock-sync offset (`window.__chromecast_senderClockTimeMs`, set in `playground/src/receiver-rpc.tsx:193–201`).
4. The receiver already routes `'idle'` to the wall-clock panel pair (lines 497–528), so sender-side `'idle'` / `'active'` is the natural language of "wall-clock display."

**Local-tab path is enough for development verification**: `BroadcastChannelRpcTransport.needsClockSync = false` (`src/services/cast/rpc/BroadcastChannelRpcTransport.ts:90–92`), same `/receiver-rpc.html` for both backends. Only difference for real Chromecast is the WebRTC handshake + clock-sync offset.

**Full research asset**: [Chromecast wall-clock mirror analysis](../../../../docs/cast-research/chromecast-wallclock-mirror.md) (246 lines, line-cited receipts, recommended change set, risks, "what I did not verify" section).

**Hand-off to ticket 05 (wiring)**:

- The canvas-editor fullscreen transition (`setFullscreen({ kind: 'review', ... })`) happens sender-side. The cast projection already drives the receiver's panel selection from `WorkbenchDisplayState.mode`. **No cast-specific code change is required for the unification** — the new fullscreen surface is sender-local; the receiver keeps reading the existing active/idle signals.
- The one regression risk: if the sender-side fullscreen transition is implemented as a *modal overlay that captures the sender's runtime*, the sender's cast projection could stall because the `execution.status` signal isn't being polled while the modal is open. The implementation must continue feeding cast projections while the modal is mounted — i.e., the cast bridge must NOT be gated on the editor panel mode (`'editor' | 'running' | 'review'`).
