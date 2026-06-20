# Handoff — extract a shared observer collaborator from the runtime (Finding 03)

> Paste-ready brief for a fresh implementation session. Self-contained: every
> decision, contract, and gate is named here or in the linked artifacts. Do not
> re-derive the design — the shape is settled. **This is the highest-blast-radius
> finding in the set (code health 1.0/10). Read the Risks section first.**

---

## Your objective

Implement **Finding 03**: extract the runtime's observer fan-out — the
subscriber Sets, the `subscribe*`/notify machinery, the immediate-initial
snapshot, and the **post-mount contract (G3)** — into a shared **`RuntimeObservers`
collaborator** that **both** `ScriptRuntime` and `ChromecastProxyRuntime` compose.
This shrinks the 466-ln god module (health 1.0/10) and gives the post-mount
invariant a single home at a named seam.

**Sequencing:** 03 lands **after** Finding 01 (per ADR-0002 — the Workbench
Session subscribes reactively and must keep working).

## Read first (grounding — do not skip)

1. [`docs/findings/03-script-runtime-god-interface.md`](./03-script-runtime-god-interface.md)
   — the finding + the shared-seam note in its Related section.
2. [`docs/adr/0002-workbench-session-observes-runtime-via-observer-seams.md`](../adr/0002-workbench-session-observes-runtime-via-observer-seams.md)
   — 01 subscribes to `subscribeToOutput` + `subscribeToStack`. **03 is the other
   half of this contract** — it must preserve those seams + post-mount behavior.
3. [`docs/findings/05-implementation-handoff.md`](./05-implementation-handoff.md)
   — `ChromecastProxyRuntime` is the **second `IScriptRuntime` adapter**; its
   observer surface is explicitly 03's job.
4. [`docs/gml/improve/gaps/G3-script-runtime-post-mount-invariant.md`](../gml/improve/gaps/G3-script-runtime-post-mount-invariant.md)
   + `tests/runtime-compliance/post-mount-snapshot-invariant.compliance.test.ts`
   — the post-mount contract and its regression test. **This is your safety net.**
5. `src/runtime/contracts/IScriptRuntime.ts` + `IRuntimeStack.ts` (`StackSnapshot`,
   `StackObserver`).

## Decisions already made — do not re-litigate

- **Shared `RuntimeObservers` collaborator** (not ScriptRuntime-only). A new
  module owns: the `stackObservers` / `outputListeners` / `trackerListeners`
  Sets, the `subscribeToStack` / `subscribeToOutput` / `subscribeToTracker` API,
  the immediate-initial-snapshot behavior, and the **post-mount contract** (emit
  only post-mount state). **Both adapters compose it.**
- **The `IScriptRuntime` interface stays for subscribers.** Do not remove the
  `subscribe*` methods — 01, the receiver hooks, `SubscriptionManager`,
  `TestScript`, `useRuntimeExecution`/`useStackSnapshot`/`useWorkoutTracker`, and
  the panels all call them. Each adapter's `subscribe*` **delegates** to its
  composed `RuntimeObservers`. The deepening is in the *implementation*, not the
  interface signature.
- **Production stays adapter-specific.** `ScriptRuntime` emits from engine
  actions (post-mount, post-turn); `ChromecastProxyRuntime` emits from RPC
  messages (already post-mount on the sender). Both call
  `observers.emitStack(snapshot)` / `emitOutput(output)` / `emitTracker(update)`.
  The collaborator owns the *subscriber* side; each adapter owns *when* to emit.
- **The `_notifyStackSettled` workaround is re-examined, not blindly removed.**
  Its purpose (re-emit a post-mount snapshot after the turn) may become the
  collaborator's contract. Removing it is **verification-gated** — only if the
  G3 regression test + the cast roundtrip test stay green. If unsure, keep it;
  the collaborator still wins on locality.
- **Secondary pass (optional, separate step):** encapsulate the 10 public fields
  callers reach into (`eventBus`, `stack`, `jit`, `clock`…). Don't bundle this
  with the observer extraction — it's a second, smaller blast radius.

## Cross-finding contracts you MUST preserve

| Boundary | Contract | Action |
| --- | --- | --- |
| **03 → 01 (subscriber)** | Workbench Session calls `subscribeToOutput` (`workbenchSessionStore.ts:928`) + `subscribeToStack` (`:936`), reactive per ADR-0002. | **Preserve both seams + post-mount behavior.** If these break, 01's analytics/segment derivation breaks. This is ADR-0002's other half. |
| **03 ↔ 05 (2nd adapter)** | `ChromecastProxyRuntime implements IScriptRuntime` with its own observer Sets (RPC-driven). | The proxy **composes the same `RuntimeObservers`**. This is the dedup win — one subscriber-side module, two producers. (The 05 handoff already designated the proxy's `IScriptRuntime` surface as 03's job.) |
| **03 → consumers** | `SubscriptionManager`, `TestScript`, `useRuntimeExecution`, `useStackSnapshot`, `useWorkoutTracker`, `RuntimeTimerPanel`, `RuntimeDebugPanel`, receiver hooks. | Keep the `subscribe*` API + immediate-initial snapshot + post-mount timing identical. The `tests/runtime-compliance/` suite + `ChromecastProxyRuntime.test.ts` are the gates. |
| **ExecutionContext** | `ExecutionContext.ts:65-91` delegates the observer methods to the runtime. | Keep the passthrough working — it forwards to the same (now-delegating) methods. |

## Implementation steps — green between each, compliance suite is the gate

**Step 1 — Create `RuntimeObservers`.** New module: the three Sets, the
`subscribe*` API (returns `Unsubscribe`), the immediate-initial-snapshot logic
(new stack subscribers get an `'initial'` snapshot with current state), and a
docblock naming the **post-mount contract** (snapshots reflect post-mount state;
pre-mount blocks never appear). Pure subscriber-management, no production logic.
Unit-test it directly (subscribe, unsubscribe, initial snapshot, multi-subscriber
fan-out). Build green.

**Step 2 — Wire `ScriptRuntime` to compose it.** Replace the inline
`_stackObservers` / `_trackerListeners` Sets + notify sites with a
`private readonly _observers = new RuntimeObservers()`. The `subscribe*` methods
delegate. Engine action sites call `_observers.emitStack(...)` etc. **Keep
`_notifyStackSettled` for now.** Run the full `tests/runtime-compliance/` suite —
it must stay at baseline (or improve). Pay attention to
`post-mount-snapshot-invariant` and `mixed-timers`. Build green.

**Step 3 — Wire `ChromecastProxyRuntime` to compose it.** Replace the proxy's
`stackObservers` / `outputListeners` / `trackerListeners` Sets + notify sites
with the same `RuntimeObservers`. RPC-message handlers call
`_observers.emitStack(...)` etc. Run `ChromecastProxyRuntime.test.ts` — the
initial-snapshot, multi-subscriber, and dispose tests must pass. Build green.

**Step 4 — Re-examine `_notifyStackSettled` (verification-gated).** Now that the
collaborator owns the post-mount contract, test whether the post-turn re-emit is
still needed. **Only remove it if** the G3 regression test + the cast roundtrip
test (receiver gets a post-mount snapshot immediately after the turn) stay green.
If any doubt, keep it — the locality win is already banked in Step 2.

**Step 5 (optional, separate) — Field encapsulation.** Audit which of the 10
public fields callers genuinely reach into vs. could route through a method.
Encapsulate the ones that aren't truly public. Separate PR; smaller blast radius.

## Definition of done

- `bun run test ./src` green — no new failures beyond the documented baseline.
- `bun x tsc --noEmit` clean on `src/runtime/**` + `src/services/cast/rpc/**`.
- `tests/runtime-compliance/` — **no regressions** vs baseline (394 pass / 17
  fail; the post-mount-snapshot-invariant + mixed-timers tests must pass).
- `ChromecastProxyRuntime.test.ts` + `OutputStatementEmission.test.ts` +
  `ScriptRuntimeSnapshot.test.ts` — all pass.
- `ScriptRuntime.ts` no longer holds the observer Sets/notify inline; it
  composes `RuntimeObservers`.
- `ChromecastProxyRuntime.ts` composes the **same** `RuntimeObservers`.
- The Workbench Session's reactive subscriptions (ADR-0002) still drive
  analytics/segments.
- The cast receiver still gets a post-mount snapshot immediately after the turn
  (manual/remote-debug verify if the `_notifyStackSettled` path changed).

## Baseline (2026-06-20)

- `bun test ./src` — 2820 pass / 1 fail (pre-existing `AggregateError`; not yours).
- `tests/runtime-compliance/` — 394 pass / 17 fail (pre-existing metric-cascade
  + perf; do not regress).
- Storybook — 55 files / 212 tests pass.

## Out of scope (separate findings)

- **Finding 01** (Workbench Session) — lands **before** 03; 03 preserves its
  subscriptions.
- **Finding 05** (receiver init paths) — separate; 03 only touches the proxy's
  observer *implementation*, not the receiver's init paths.
- **Findings 02, 04, 06** — unrelated.

## Risks to respect (highest in the set)

- **Highest blast radius.** `IScriptRuntime` has ~121 reference sites and two
  adapters. The `subscribe*` API stays (subscribers need it) — only the
  implementation moves. Sequence behind the compliance suite; A/B behaviour
  equivalence (current output == refactored output) over `runtime-compliance/`.
- **Post-mount ordering is load-bearing for Chromecast.** The TV proxy needs a
  post-mount snapshot immediately after the turn — that's why
  `_notifyStackSettled` exists. Step 4 only removes it if the cast roundtrip
  stays green; when in doubt, keep it.
- **The proxy's emit timing differs (RPC-driven).** Sharing the subscriber side
  is safe; do not try to share the *production* timing — engine and RPC emit at
  different points by design.
- **`ExecutionContext` delegates the observer methods** — keep that passthrough
  intact; behaviors that go through `ExecutionContext` must behave identically.
- If scope pressure hits, ship Steps 1-3 (the collaborator + both adapters
  wired, `_notifyStackSettled` kept). Step 4 (removing the workaround) and
  Step 5 (field encapsulation) are independently deferrable.
