# Runtime Testability — Stepped Deepening Plan

Stepwise deepening of the runtime so tests can advance time, fake button
clicks, and assert on the resulting state and outbound cast messages.
Each story assumes the previous ones are landed; phrasings are
deliberately cumulative ("With Story N in place…") so the doc reads as a
sequence of deepening moves, not parallel candidates.

Vocabulary: module / interface / seam / depth / leverage / locality for
architecture; **Statement**, **Block**, **Behavior**, **Metric**,
**Origin**, **Hint** for the domain (from `CONTEXT.md`). One
**MockClock** is the singular time source for any test that touches the
runtime.

---

## Story 1 — Wall-clock leaks → single `IRuntimeClock` time source

**Files.** `src/runtime/RuntimeClock.ts:92`, `src/runtime/events/NextEvent.ts:11`,
`src/runtime/actions/events/EmitEventAction.ts:32`, `src/runtime/BehaviorContext.ts:57`,
`src/runtime/adapters/RuntimeAdapter.ts:50`,
`src/runtime/behaviors/ReportOutputBehavior.ts`,
`src/services/cast/rpc/ChromecastProxyRuntime.ts:285`.

**Problem.** The mock clock advances fine, but seven sites independently
read `new Date()` / `Date.now()`. `advanceClock(5_000)` does not produce
matching timestamps across the runtime — the mock clock says one
moment, the dispatched `NextEvent` says another, the cast
`getSenderClockTimeMs` says a third. The single seam that *should* own
time (`IRuntimeClock`) is bypassed wherever state crosses an event
boundary. State-ordering tests in
`tests/runtime-compliance/state-transitions.compliance.test.ts`
compensate by hand-checking outcomes, not timestamps — they cannot
prove causal ordering.

**Solution.** Make `IRuntimeClock` the only time source.

- Introduce a thin `INowProvider` (one method: `now(): Date`) so the
  *fact* of "what time is it" is a seam, not a literal `Date` ctor.
- `ScriptRuntime` owns the single `INowProvider` (delegating to its
  injected `IRuntimeClock`); every constructor below it that builds an
  event/action/cast message takes a `now: () => Date` and never reads
  the wall clock.
- Concrete rewires: `NextEvent`, `EmitEventAction`,
  `ReportOutputBehavior`, `RuntimeAdapter`, `BehaviorContext` accept
  the now-fn at construction; `ChromecastProxyRuntime` is handed the
  runtime's `IRuntimeClock` (not its own `Date.now()`).
- `createMockClock` already returns an `IRuntimeClock`; the same object
  is the `INowProvider` for the test build. One time axis per test.

**Benefit.** Depth on the time seam: one accessor (`clock.now`) drives
every timestamp in the system. Locality: a maintainer who changes
"how time is reported" touches one place. Leverage: existing
`BehaviorTestHarness.advanceClock` and the `session-test-utils`
helpers stop papering over the gaps — tests can now assert ordering
of events by timestamp without hand-rolled date math.

**Done when.**
`grep -R "new Date()" src/runtime src/services/cast | grep -v RuntimeClock.ts`
returns zero hits outside the clock module itself, and
`session-test-utils.advanceClock` is the only time-advancing call in
the test suite.

---

## Story 2 — Faking the cast RPC end-to-end via a `FakeRpcTransport`

**Files.** `src/services/cast/rpc/IRpcTransport.ts`,
`src/services/cast/rpc/ChromecastProxyRuntime.ts:157`,
`src/services/cast/CastManager.ts`,
`src/components/organisms/cast/CastButtonRpc.tsx:75`,
new `src/testing/transport/FakeRpcTransport.ts`.

**Problem.** `IRpcTransport` is the right chokepoint (one union
message type, five methods), but a test wanting to assert "Chromecast
button → next block → cast sends `RpcStackUpdate`" has no way to
stand in for the transport without spinning a real WebRTC data
channel or reaching into private fields. The cast sender/receiver
factories own the transport's lifecycle, so even constructing a
cast-aware runtime in a test is awkward. This is exactly the
"one adapter = hypothetical seam" case from the architecture
glossary; we need a second adapter to make the seam real.

**Solution.** Ship a `FakeRpcTransport` and loosen the factories.

- `FakeRpcTransport` satisfies `IRpcTransport`; it captures every
  `send(message)` into a `sent: RpcMessage[]` array, exposes
  `receive(message)` to inject a message as if it arrived from the
  remote peer, and supports a paired transport (`connectPair(a, b)`)
  so two fakes can model a bidirectional session.
- The factory that currently builds the transport accepts an
  optional `IRpcTransport` parameter; the default is the production
  WebRTC transport. Tests pass the fake.
- `CastButtonRpc.tsx` — which is *also* a chokepoint mapping inbound
  `RpcEvent`s to `runtime.handle(...)` calls — is given a hook so a
  test can inject a script of cast events without going through the
  Zustand store.
- With Story 1 in place, the fake's outbound messages carry
  runtime-clock timestamps, not wall-clock — so cast-vs-runtime
  ordering is a one-line assertion.

**Benefit.** Two adapters (WebRTC + Fake) turn the cast surface into
a real seam, not a hypothetical one. Locality for "what flows over
the wire" lives in the transport; the test exercises the *same*
sender/receiver code paths the app uses, so the assertion
`sent.filter(m => m.type === 'rpc-event' && m.event.name === 'next')`
is end-to-end without leaving the test process. Leverage: a class of
bugs — "the cast receiver saw a different block state than the sender"
— moves from "user-reported on a TV" to "test fails on CI."

**Done when.** A test exists that:
(a) boots the runtime with a `FakeRpcTransport`,
(b) injects an `RpcEvent` for `next` from the cast side,
(c) asserts the runtime reached the next block *and* the cast side
received a matching `RpcStackUpdate`. The production transport code
path is unchanged.

---

## Story 3 — One test-script builder + assertion DSL, compliance tests re-shaped

**Files.** `tests/jit-compilation/helpers/session-test-utils.ts`,
`src/testing/harness/BehaviorTestHarness.ts`,
`tests/runtime-compliance/*.test.ts` (9 files),
new `src/testing/script/TestScript.ts`,
new `src/testing/script/assertions.ts`.

**Problem.** With Stories 1 and 2 in place, every test can read
runtime state and cast state from the same time axis. But two
overlapping test surfaces remain — `SessionTestContext` (full
pipeline, compliance tests) and `BehaviorTestHarness` (single
behavior, unit tests) — and each compliance test re-implements the
same `createRuntime` + `mockClock` + `userNext/advanceClock/assert`
loop inline. The pattern "do something, advance time, assert state"
isn't named; it lives in 9 files in 9 slightly different shapes.
The friction is not "we can't write the test" — it's that the test
files are mostly harness plumbing, and the actual *Behavior* under
test is hidden.

**Solution.** A fluent script builder that compiles a sequence of
steps and an assertion DSL for state reads. One surface, not two.

- `TestScript.compile(scriptText)` returns a `ScriptHandle` with:
  `next()`, `userEvent(name, data?)`, `advance(ms)`,
  `advanceToNextBlock()` (composes `currentBlock.next()` with a
  `getMemoryByTag('time')` completion check — the shortcut the
  user asked for), `advanceToEnd()`, and `snapshot()` (a frozen
  `ScriptState`).
- `assertions` is a tree of pure read functions on the snapshot:
  `block(type).isRunning(bool)`, `block(type).memory(tag).value`,
  `output(n).metrics`, `castSent.filter(...)`, etc. Pure reads mean
  a test can snapshot once, assert many things, and not worry about
  observer coupling.
- `BehaviorTestHarness` collapses into the same builder (it
  becomes the per-Behavior branch of the script) and
  `SessionTestContext` is re-pointed at it. The two-harness split
  goes away.
- Re-shape each of the 9 compliance files: the script's steps
  become the test body, the assertions become the `expect()` calls.
  No file should have a hand-rolled `createRuntime` block.

**Benefit.** Depth on the test surface: tests get shorter, the
"What is this asserting" content becomes the file's content, not
the harness plumbing. Locality: a maintainer who adds a new shortcut
("advance to next rest block," "skip to last block") touches one
builder, and every compliance test that wanted it gets it for free.
Leverage: the new compliance-shape is also the shape Story 4 needs
— integration tests start looking like compliance tests with real
inputs.

**Done when.** The 9 compliance tests run against the new builder,
each file has at most one `compile(...)` call, and
`BehaviorTestHarness` is no longer imported anywhere in the test
suite.

---

## Story 4 — Split `RuntimeBlock.next()` decision from dispatch

**Files.** `src/runtime/RuntimeBlock.ts:233-297`,
`src/runtime/contracts/IRuntimeBlock.ts:34`,
`src/testing/script/TestScript.ts` (from Story 3).

**Problem.** With Stories 1–3 in place, tests can drive the runtime
and read state cleanly. But `block.next(runtime)` conflates two
concerns: the **decision** "this Behavior says I am complete, the
next step is to pop" and the **dispatch** "actually do it, mutate
the stack." Tests want to assert the decision without paying for
the mutation — and the cast sender wants to *observe* the decision
so it can emit a richer `RpcEvent` than "next" (e.g. the cast
receiver could pre-emptively dim the next block on the TV).
Right now both the timer and the rounds Behavior implement
"complete" by setting a private `_isComplete` flag inside the
block; the assertion surface is whatever the stack ends up looking
like afterwards.

**Solution.** Split the public surface of `IRuntimeBlock`.

- Keep `next(runtime, options?)` for the side-effecting path.
- Add `inspectNext(runtime): CompletionDecision` (or
  `IRuntimeAction[]`) — a pure read that returns what the next
  call *would* dispatch, without dispatching. Implementations:
  timer Behavior returns `[PopBlockAction]` when elapsed ≥
  duration; rounds Behavior returns `[PushBlockAction(repeat)]`
  when round < total, `[PopBlockAction]` when round == total.
- The existing `next()` becomes
  `inspectNext(runtime).forEach(a => runtime.do(a))`. Same
  observable behavior, one extra indirection.
- The test builder (Story 3) exposes a `decide()` step that
  asserts on the decision without dispatching — distinct from
  `next()`, which dispatches.

**Benefit.** Depth: a `Behavior`'s "complete" semantics become
data, not a side effect on a private flag. Locality: every Behavior
expresses completion the same way, in the return value of one
method. Leverage: cast can pre-render based on `inspectNext`; tests
can compare decision trees across Behaviors without state churn;
analytics can explain "why did the block end?" from the decision
trail alone.

**Done when.** A test exists that calls `inspectNext` on each
Behavior type, asserts the returned action list, and confirms the
subsequent `next()` produces the same final state. No private
`_isComplete` flag remains in `RuntimeBlock` — completion is in
the return value.

---

## Story 5 — Inventory existing tests; rewrite the overlapping ones on the new builder

**Files.** All test files under `tests/**` — the inventory itself
goes in a new doc `docs/working/test-inventory.md`.

**Problem.** With Stories 1–4 in place, the runtime is fully
time-travelable, the cast is fakable, the script builder is the
single test surface, and block decisions are inspectable. The
final question is: **which existing tests are doing the work the
new builder was built for, but aren't using it?** Most of the
unit and compliance tests will already be on the builder (Story 3
re-shaped them). The candidates worth finding are tests that
(a) drive a real running app — e.g. the `tests/playground/*` and
`tests/canvas/*` suites that spin a real browser, click real
buttons, observe real DOM — and (b) would still be valid as
runtime+cast integration tests if the assertions came through
`TestScript` and `FakeRpcTransport` instead of through Puppeteer.
The ones that genuinely need the browser (CSS, layout, drag-drop)
stay; the ones that need "the runtime saw X, the cast saw Y" move.

**Solution.** Inventory, classify, rewrite.

- Walk `tests/**` and produce `docs/working/test-inventory.md`:
  a table with columns *File / What it asserts / Currently
  exercises / Could exercise / Decision*. The "Could exercise"
  column answers: "if I rewrote this against the new builder +
  fake transport, would the assertion still hold?" Mark each row
  `KEEP-AS-BROWSER` (genuinely needs a real DOM/CSS), `REWRITE-ON-BUILDER`
  (the assertion is about runtime/cast state), or `DELETE`
  (redundant with a compliance test after Story 3).
- For each `REWRITE-ON-BUILDER` row, port it. The shape is:
  `TestScript.compile(...).userEvent('next').castReceive(RpcEvent('pause')).snapshot()`,
  asserting on `castSent` and `block(...).memory(...)` instead of
  pixel diffs. The test runs in milliseconds, not seconds.
- Leave a one-line note on the inventory doc for each ported test
  pointing to the new test path, so the file's deletion is
  traceable.

**Benefit.** Depth on the integration surface: the same builder
that drives single-Behavior unit tests also drives the
end-to-end "script → runtime → cast → back" scenarios that
previously needed a browser. Locality: every assertion about
runtime/cast state lives in one shape. Leverage: a new "what if
the user pauses mid-timer and the cast tries to skip" scenario
takes minutes to write, not a half-hour of Puppeteer plumbing.
And the surviving browser tests are *only* the ones that earn
their keep — the ones where pixels are the assertion.

**Done when.** `docs/working/test-inventory.md` lists every test
file with a `Decision` column filled in, the `REWRITE-ON-BUILDER`
rows have been ported and deleted at the old path, and the
remaining browser tests are the genuinely-pixel-asserting ones.
A new "full-scale integration" test — script → runtime → cast →
back, in a single `TestScript` run, asserting on both ends —
exists alongside the compliance suite and runs in CI.

---

## Notes for future explorers

- After Story 1, **never** add a `new Date()` call outside
  `RuntimeClock.ts`. If a module needs "now," take an `INowProvider`
  in its constructor. CI will fail the grep gate before this drifts.
- After Story 2, **never** add a transport field that the factory
  owns. The transport is a parameter; only the default binding
  lives in the factory.
- After Story 3, **never** hand-roll a `createRuntime` in a test.
  If the builder doesn't expose what you need, extend the builder;
  do not work around it in a single test file.
- After Story 4, **never** set a private "complete" flag on a
  Block. Completion is `inspectNext(...)`'s return value.
- After Story 5, the only browser tests in the suite are the ones
  whose assertion is on a pixel. Everything else lives in the
  builder.
