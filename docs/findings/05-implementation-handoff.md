# Handoff — unify receiver init paths + fix the boot bug (Finding 05)

> Paste-ready brief for a fresh implementation session. Self-contained: every
> decision, contract, and gate is named here or in the linked artifacts. Do not
> re-derive the design — the scope is settled.

---

## Your objective

Implement **Finding 05**: unify the three init paths in
`playground/src/receiver-rpc.tsx` (669 ln) and **fix the `bootTimeoutRef` bug**.
The substantive cast work already shipped (`createReceiverSession` centralizes
audio + workbench + disconnect fan-out; the three inline `ChromecastProxyRuntime`
rebuilds were replaced). What remains is the init-path duplication — and it has
hidden a real, device-only crash.

**Land the bug fix first**, then the unification.

## Read first (grounding — do not skip)

1. [`docs/findings/05-receiver-init-paths-and-boot-bug.md`](./05-receiver-init-paths-and-boot-bug.md)
   — the finding (the 3 paths, the bug, the deletion-test reasoning).
2. [`docs/findings/03-script-runtime-god-interface.md`](./03-script-runtime-god-interface.md)
   — `ChromecastProxyRuntime implements IScriptRuntime`; it is the **second
   adapter**. Finding 03's narrowing will touch the proxy (see contracts).
3. `src/services/cast/rpc/ReceiverSessionManager.ts` — its header states the
   load-bearing seam: **the transport/CAF lifetime is NOT owned here** ("The
   transport itself is left to its owner"). Respect this.
4. [`CONTEXT.md`](../../CONTEXT.md) — **Cast Backend**, **Workbench Session**.

## The bug — fix first, one line, shippable independently

`bootTimeoutRef` is referenced 6× in the chromecast CAF path
(`receiver-rpc.tsx:366-368, 371, 392-394`) but **never declared**. The declared
refs are `runtimeRef`, `transportRef`, `activeSessionHandleRef`,
`bootFadeTimerRef`, `signalingRef`, `workbenchStateRef` (`:57-63, 99`). At
runtime the CAF path throws `ReferenceError: bootTimeoutRef is not defined` —
but only on a real Chromecast device, which is why dev/local-tab testing (paths
1 & 2) never caught it. (The file builds because Vite/esbuild strips types
without type-checking.)

The intent is a **boot-fallback timer** (show a degraded shell if the CAF
`READY` event never arrives) — distinct from `bootFadeTimerRef` (the loader
fade). **Fix:** add
`const bootTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)` to
the refs list. (Optionally rename to `bootFallbackRef` to match
`armReceiverBootFallback` — but the minimal fix is the declaration.) Land this
on its own; it closes the device-only crash now, independent of the unification.

## Decisions already made — do not re-litigate

- **Fix the bug first** (above), as a standalone change. Green, ship.
- **Unify paths 1 & 2** (the `externalHandle` path `:271-300` and the `transport`
  path `:303-336`) by extracting their **shared wiring** into one helper:
  `setProxyRuntime`, `setConnectionStatus('connected')`, `dismissBootLoader('ready')`,
  `activeSessionHandleRef`/`runtimeRef` bookkeeping, `handle.onWorkbenchUpdate`,
  `handle.onDisconnected`, and the cleanup unsubscribes. The helper is
  **parameterized by who owns the handle lifetime** (path 1: caller owns, no
  `dispose`; path 2: receiver owns, `handle.dispose()` on cleanup). That
  lifetime difference is the *only* thing that varies between them.
- **Keep the CAF boot (path 3, `:337-407`) in the receiver app.** Do NOT move
  `castContext.start` / signaling / boot-fallback into `createReceiverSession` —
  `ReceiverSessionManager` deliberately does not own transport/CAF lifetime
  (its header says so). Path 3 stays a distinct block; only its now-fixed
  boot-fallback timer + the shared disconnect wiring align with the helper.
- **`receiver-rpc.tsx` keeps:** the route/transport-kind detection, the CAF boot,
  the keyboard/D-Pad handlers, and the React render tree. It composes the shared
  wiring helper + the CAF boot.

## Cross-finding contracts you MUST preserve

| Boundary | Contract | Action |
| --- | --- | --- |
| **05 ← 01 (via wire)** | The receiver consumes `WorkbenchDisplayState` (`{mode, previewData?, reviewData?, analyticsSummary?}`, `ChromecastProxyRuntime.ts:133`) over `handle.onWorkbenchUpdate`. The sender-side bridges now read `workbenchSessionStore` (Finding 01 landed in parallel) — but the receiver only ever sees the resolved wire message. | **Insulated.** Keep `WorkbenchDisplayState` stable. Do not reach into any sender store from the receiver. |
| **05 ↔ 03 (at the proxy)** | `ChromecastProxyRuntime implements IScriptRuntime` (the 2nd adapter; `:160`). | The receiver's **init paths** go through `createReceiverSession` + the handle, **not** raw `IScriptRuntime` methods — so this unification is insulated from 03's narrowing. Updating the proxy to a narrowed `IScriptRuntime` is **Finding 03's job**, not yours. Do not change the proxy's interface here. |
| **05 ↔ 02 (via wire)** | Sender (`CastButtonRpc` + bridges) is mounted in App.tsx; the receiver is a separate entry (`receiver-rpc.html`). | Indirect — the contract is the RPC wire protocol, not source coupling. App.tsx is untouched. |

The receiver unification is **almost entirely internal** — no other finding's
source changes. The one external touchpoint (the proxy's `IScriptRuntime`
surface) belongs to Finding 03.

## Implementation steps — green between each (`bun run test`)

**Step 1 — Fix `bootTimeoutRef` (standalone).** Declare the ref in the refs
list. Verify the file type-checks (`bun x tsc --noEmit` on the file — this is
the gate that would have caught it). Build green. Ship independently.

**Step 2 — Extract the shared wiring helper.** Pull the common body of paths 1
& 2 (proxy/connection/loader/refs + `onWorkbenchUpdate`/`onDisconnected` +
cleanup) into a helper that takes the handle + an `ownsLifetime` flag. Paths 1
& 2 each become a thin call. Verify local-tab mode (path 1) and legacy
transport mode (path 2) still connect, receive workbench updates, and disconnect
cleanly. Build green.

**Step 3 — Align path 3's disconnect/boot wiring.** Path 3 (CAF) keeps its
device-specific boot, but its disconnect cleanup + the (now-fixed) boot-fallback
should align with the helper's shape where they overlap. Don't force path 3
through `createReceiverSession` for the CAF start — only the post-transport
session wiring goes through it (as today). Build green.

**Step 4 — Slim + document.** Confirm the `useEffect` reads as: route/transport
detection → shared wiring helper (paths 1 & 2) → CAF boot block (path 3). Update
the stale *"Two paths"* comment (`:259-264`) — there are three, and after this,
one shared wiring path + a CAF boot block. Build green.

## Definition of done

- `bun run test ./src` green — no new failures beyond the documented baseline.
- `bun x tsc --noEmit` clean on `receiver-rpc.tsx` (this is the gate that would
  have caught `bootTimeoutRef`).
- `bunx vite build --config vite.config.ts` (receiver) succeeds;
  `receiver-rpc.html` boots.
- `bootTimeoutRef` is **declared**; the CAF boot-fallback no longer throws on
  the device path.
- Paths 1 & 2 share one wiring helper; the only difference is handle-lifetime
  ownership.
- The CAF boot stays in the receiver app (not moved into `ReceiverSessionManager`).
- The 3 cross-finding contracts above are intact (`WorkbenchDisplayState`
  stable; no raw `IScriptRuntime` calls added to the init paths; App.tsx
  untouched).

## Baseline (2026-06-20)

- `bun test ./src` — 2820 pass / 1 fail (pre-existing `AggregateError`; not
  yours).
- Receiver build + `receiver-rpc.html` boot — the gate for path 3.
- `ReceiverSessionManager.test.ts` — passes (the session-manager unit tests are
  your safety net for the shared wiring).

## Out of scope (separate findings)

- **Finding 03** (narrow `IScriptRuntime`) — owns the `ChromecastProxyRuntime`
  interface update. Do not narrow the proxy here.
- **Finding 01** (Workbench Session) — landed in parallel on the sender side;
  the receiver is insulated by the wire contract.
- **Findings 02, 04, 06** — unrelated.

## Risks to respect

- **Path 3 is device-only and hard to test.** Paths 1 & 2 (local-tab, transport)
  are exercisable in dev; the CAF path is not. Verify the `bootTimeoutRef` fix
  and the CAF boot isolation via remote debug (`chrome://inspect`) on a device,
  or by careful reading — do not assume. The `ReceiverSessionManager.test.ts`
  suite covers the shared wiring but not the CAF start.
- **CAF boot ordering is load-bearing:** `castContext.start()` must precede
  `addCustomMessageListener()`; signaling is created after `start()`. Preserve
  this ordering exactly when isolating path 3.
- **Transport/CAF lifetime is deliberately not in `ReceiverSessionManager`.**
  Don't "fix" the duplication by moving CAF into it — that violates the seam its
  header documents.
- The `bootTimeoutRef` fix is the highest-value, lowest-risk change — if scope
  pressure hits, ship Step 1 alone and defer the unification.
