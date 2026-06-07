# How to Test — wod-wiki

A guide for writing tests in this repo. The test surface has three tiers;
pick the right one for what you're asserting.

> **TL;DR.** For runtime/cast state, use `TestScript` + `assertions()` from
> `src/testing/script/`. For per-Behavior unit tests, use
> `BehaviorTestHarness` from `src/testing/harness/`. For React components,
> use React Testing Library in `playground/src/`. For browser/DOM pixels,
> use Puppeteer (existing tests under `tests/canvas/`, `tests/panels/`).
> Don't hand-roll a runtime in a new test — the builder exists for a reason.

---

## Decision tree

```
What are you asserting?
│
├── Runtime state (block on stack, timer values, output metrics)
│   or cast state (RpcStackUpdate received, RpcEvent sent)
│   │
│   └── TestScript + assertions()       ← USE THIS
│       (src/testing/script/)
│
├── A single Behavior in isolation
│   (e.g. TimerBehavior.elapsed after clock advance)
│   │
│   └── BehaviorTestHarness             ← USE THIS
│       (src/testing/harness/)
│
├── React component rendering / DOM assertions
│   │
│   └── React Testing Library          ← USE THIS
│       (playground/src/**/__tests__/)
│
├── Browser pixels / Chromecast UI
│   │
│   └── Puppeteer                       ← existing tests only
│       (tests/canvas/, tests/panels/)
│
└── Pure functions (parser, grammar, data fixtures)
    │
    └── bun:test, no harness            ← direct unit tests
```

When in doubt, default to **TestScript**. It's the path Story 3-5
standardized on; future tests should land there.

---

## Tier 1: TestScript + assertions (the default)

The TestScript builder drives a real `ScriptRuntime`, captures the cast
state via the `FakeRpcTransport`, and returns a frozen `ScriptState` for
read-only assertions. With Stories 1-5 in place, the runtime is
deterministic (one `INowProvider`), the cast is fakable, and block
decisions are inspectable — so a test that says "advance 5 seconds,
assert the next block mounted and the cast received an RpcStackUpdate"
is a single builder call.

### Minimal example

```ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { TestScript, assertions, expectAll } from '@/testing/script';

describe('5:00 Run', () => {
    let script: TestScript;

    beforeEach(async () => {
        script = await TestScript.compile(`
# 5:00 Run

## Timer
5:00 Run
`);
    });

    afterEach(async () => {
        await script.dispose();
    });

    it('advances through the warmup gate to the timer block', async () => {
        // Past the WaitingToStart gate.
        await script.next();

        const state = await script.snapshot();
        expectAll(state, [
            a => a.currentBlock()?.label() === '5:00 Run',
            a => a.stack().depth() === 2,
        ]);
    });

    it('tick past the timer duration pops the block and the cast sees it', async () => {
        await script.next();
        const before = (await script.snapshot()).cast.sent.length;

        // Advance past the 5:00 duration.
        await script.tick(5 * 60 * 1000 + 1);

        const state = await script.snapshot();
        const updates = state.cast.filter('rpc-stack-update');
        // The cast side saw a follow-up RpcStackUpdate after the tick.
        expect(updates.length).toBeGreaterThan(before);
    });
});
```

### What you get

| Method | Purpose | Returns |
|---|---|---|
| `TestScript.compile(text)` | Compile a whiteboard script and start the session | `Promise<TestScript>` |
| `TestScript.from(runtime)` | Wrap an existing runtime (caller started the session) | `TestScript` |
| `script.snapshot()` | Frozen read of stack, cast, clock | `Promise<ScriptState>` |
| `script.next()` | User pressed next on the cast remote (NextEvent) | `Promise<this>` |
| `script.userEvent(name, data?)` | Arbitrary event (e.g. `pause`, custom events) | `Promise<this>` |
| `script.advance(ms)` | Move the mock clock only; no event dispatched | `Promise<this>` |
| `script.tick(ms)` | Advance clock + dispatch a `tick` event | `Promise<this>` |
| `script.advanceToNextBlock(maxMs?)` | Loop: advance + tick until `current.isComplete` or 30 min | `Promise<this>` |
| `script.dispose()` | Tear down runtime + transport | `Promise<void>` |
| `script.runtime` | Escape hatch to the raw runtime | `ScriptRuntime` |
| `script.cast` | Escape hatch to the cast-side fake | `FakeRpcTransport` |

### Assertion DSL

`assertions(state)` returns a read-only tree you can wrap in `expect()`:

```ts
const a = assertions(state);

// Block reads
a.currentBlock()?.label();                    // "5:00 Run"
a.currentBlock()?.blockType();                // "Timer"
a.currentBlock()?.isComplete();                // false
a.currentBlock()?.memoryByTag('display');     // readonly IMetric[]
a.currentBlock()?.metric('time');             // first IMetric with type 'time', or undefined
a.blockByLabel('3 Rounds')?.memoryByTag('display');

// Cast reads
a.cast().filter('rpc-stack-update');          // typed list
a.cast().stackUpdateCount();                  // number
a.cast().lastStackUpdate();                   // most recent RpcStackUpdate
a.cast().sawEvent('pause');                   // bool — did the runtime ever send an RpcEvent('pause')?

// Stack reads
a.stack().depth();                            // 2
a.stack().isEmpty();                          // false
a.stack().changed(baseline);                  // depth or current-block key differs
```

Or use the convenience `expectAll(state, checks)` for a one-shot
aggregate assertion:

```ts
expectAll(state, [
    a => expect(a.currentBlock()?.label()).toBe('5:00 Run'),
    a => expect(a.stack().depth()).toBe(2),
    a => expect(a.cast().stackUpdateCount()).toBeGreaterThan(0),
]);
```

### Rules

1. **Always `await script.snapshot()`.** The runtime defers some
   observer work via `setTimeout(0)`; awaiting the snapshot's
   `flushObservers()` is the only way to see the post-deferred state.
2. **Always `await script.next() / userEvent() / tick()`.** These
   methods are async on purpose — they flush the deferred observer.
3. **Use `TestScript.compile()` for new tests.** It wires the cast
   subscription, the StartSession action, and the deferred observer
   flush in one place. If you find yourself writing those three
   lines manually, you're not using the builder.
4. **Don't import `session-test-utils.ts` or `createMockClock` directly.**
   The builder takes a config with a pre-built `MockClock` only when
   you need a specific time; otherwise the builder creates its own.
5. **Don't construct `FakeRpcTransport` directly.** The builder pairs
   its internal fakes for you. If you need direct access for a
   custom scenario, use `script.cast`.
6. **Don't use `as any` in test code.** The types are tight; if a
   shape is unknown, use `unknown` + a runtime check.
7. **The script text follows the whiteboard grammar.** A blank line
   separates blocks; `## Heading` is a label; `5:00` is a duration.
   See `docs/whiteboard-language/core-syntax.md` for the full grammar.

### Where to put the file

- **Multi-block, end-to-end, cast interaction** → `tests/runtime-compliance/`
  or `tests/cast-integration/`. Existing examples:
  - `tests/runtime-compliance/state-transitions.compliance.test.ts` (port of an old compliance test)
  - `tests/runtime-compliance/full-scale-integration.test.ts` (Story 5 deliverable, exercises all 5 stories)
  - `tests/cast-integration/cast-roundtrip.test.ts` (Story 2 — paired fakes, end-to-end)
- **Block-level runtime behavior** → `tests/runtime-compliance/<name>.compliance.test.ts`
- **Per-Behavior isolation** → use Tier 2, not TestScript.

### What TestScript does NOT do

- It does not run a real timer. It advances the mock clock and dispatches
  `tick` events; the runtime's TimerBehavior responds to those.
- It does not start a real WebRTC data channel. The FakeRpcTransport
  captures all sent messages in memory and routes paired messages
  synchronously.
- It does not mount React. For UI assertions, use Tier 3.

---

## Tier 2: BehaviorTestHarness (per-Behavior unit tests)

When the assertion is "this Behavior does X given clock Y," the
BehaviorTestHarness is the right tool. It gives you a real memory
store, a real stack, a real event bus, and a controllable mock clock —
without booting a full ScriptRuntime. The cost is no JIT compilation
and no real cast integration.

### When to use

- "What does `TimerBehavior.onNext` return after `clock.advance(5_000)`?"
- "What does `RoundsBehavior` do on round 3 of 3?"
- "Does `ReportOutputBehavior` emit the right output when a block unmounts?"

### When NOT to use

- The assertion involves the full pipeline (parser → JIT → runtime).
  → Use TestScript.
- The assertion involves cast integration. → Use TestScript.
- The assertion is "the whole block completes correctly." → Use TestScript.

### Minimal example

```ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createBehaviorHarness } from '@/testing/harness';

describe('TimerBehavior', () => {
    let harness: ReturnType<typeof createBehaviorHarness>;

    beforeEach(() => {
        harness = createBehaviorHarness(new Date('2024-01-01T12:00:00Z'));
    });

    afterEach(() => {
        harness.dispose();
    });

    it('marks the block complete after the duration elapses', () => {
        const block = new SomeTimerBlock({ durationMs: 5_000 });
        harness.push(block).mount();

        harness.advanceClock(4_999);
        expect(harness.currentBlock?.isComplete).toBe(false);

        harness.advanceClock(1);
        harness.simulateTick();
        expect(harness.currentBlock?.isComplete).toBe(true);
    });
});
```

### Rules

1. **Always `harness.dispose()` in `afterEach`.** The harness holds
   memory subscriptions; without dispose you get cross-test bleed.
2. **Don't manually push, mount, and call `runtime.handle`.** Use the
   fluent helpers: `harness.push(block).mount().next()`.
3. **The harness is NOT the cast.** If you need cast assertions,
   promote the test to TestScript.

### Where to put the file

`tests/blocks/<name>.test.ts` (block-level) or
`tests/strategies/<name>.test.ts` (strategy-level).

---

## Tier 3: React Testing Library (component tests)

For React component behavior — props, state, user interaction, DOM
structure — use RTL in `playground/src/**/__tests__/`. This is the
only tier that exercises the React tree.

### When to use

- "The Timer button is disabled when status is 'idle'."
- "Clicking 'next' on the runtime panel calls `runtime.handle(NextEvent)`."
- "The workbench renders the right block when the store has 3 blocks."

### Minimal example

```tsx
import { describe, it, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { TimerButton } from '../TimerButton';

describe('TimerButton', () => {
    it('disables itself when status is "idle"', () => {
        render(<TimerButton status="idle" onStart={() => {}} />);
        const button = screen.getByRole('button', { name: /start/i });
        expect(button).toBeDisabled();
    });
});
```

### Known gotchas

- **Provider wrapping.** Many components depend on
  `EffortRegistryProvider`, `SubscriptionManagerProvider`, etc. If
  `useEffortRegistry must be used within EffortRegistryProvider` shows
  up, the test is missing a Provider wrapper. See existing tests for
  the pattern.
- **Zustand store hydration.** `useWorkbenchSyncStore` may need
  initial state via `useWorkbenchSyncStore.setState(...)` in
  `beforeEach`.
- **No cast integration.** RTL tests do not exercise the cast surface
  — for that, use TestScript.

### Where to put the file

`playground/src/<area>/<Component>.test.tsx` — colocated with the
component source.

---

## Tier 4: Puppeteer (browser pixels, Chromecast)

For tests where the assertion is "the pixel matches the snapshot" or
"the Chromecast receiver UI renders correctly," Puppeteer is the
existing seam. This tier has the most setup overhead; only use it
when the assertion is genuinely browser-level.

### When to use

- "The home page renders the new welcome card after the data loads."
- "The Chromecast panel shows the timer countdown."

### Known gotchas

- Long timeouts (5s default; tests with images can hit 10s+).
- Headless Chromium environment must be available.

### Where to put the file

`tests/canvas/`, `tests/panels/`. Co-located with the area being
tested.

---

## Common anti-patterns

| Anti-pattern | What it looks like | Why it's wrong | What to do |
|---|---|---|---|
| Hand-rolled `createRuntime` | `new ScriptRuntime(script, compiler, {stack, clock, eventBus})` plus manual `StartSessionAction` plus manual cast subscription | Re-implements the builder; the deferred-observer flush gets missed | `TestScript.compile(text)` |
| Sync assertions after async ops | `script.next(); expect(state.current).toBe(...)` (no await) | The observer is deferred; the assertion sees pre-next state | Always `await script.next()` and `await script.snapshot()` |
| `runtime.do(new NextAction())` from a test | Reaches into the action bus instead of dispatching an event | The whole point of NextEventHandler is to centralize this; bypassing it skips a real code path | `await script.next()` |
| Direct `new Date()` in production code | `new Event({ timestamp: new Date() })` | Bypasses the `INowProvider` seam from Story 1; the mock clock doesn't apply | Take `now: INowProvider` in ctor; use `now.now()` |
| `as any` in test code | `(block as any).someField` | Loses type safety; the project has zero-tolerance for `as any` | Use `unknown` + a type guard, or `satisfies` |
| `import('@/...').Type` in a signature | `function foo(x: import('@/foo').Bar)` | Hides the dependency; use top-level `import type` | `import type { Bar } from '@/foo';` |
| One-line wrapper functions | `function getId(b: Block) { return b.key; }` | The architecture glossary says: inline it unless the name carries weight | Inline the expression |

---

## Test layout

```
src/testing/
  script/                    ← Tier 1: TestScript + assertions
    TestScript.ts            Builder
    assertions.ts            Read-only DSL
    ScriptState.ts           Frozen snapshot contract
    index.ts                 Re-exports
  harness/                   ← Tier 2: per-Behavior unit tests
    BehaviorTestHarness.ts   350-line legacy harness; still used
  transport/                 ← Story 2: cast fake
    FakeRpcTransport.ts      Second adapter on IRpcTransport

tests/
  runtime-compliance/        ← Compliance suite (TestScript + legacy mix)
  cast-integration/          ← Cast end-to-end (TestScript + paired fakes)
  blocks/                    ← Per-block Behavior tests (BehaviorTestHarness)
  strategies/                ← JIT strategy tests (legacy session helper)
  jit-compilation/           ← JIT integration (legacy session helper)
  lifecycle/                 ← Mount/next/unmount (BehaviorTestHarness)
  parser/                    ← Pure-function parser tests
  language-compilation/      ← Lezer grammar tests
  canvas/                    ← Puppeteer canvas tests
  panels/                    ← Puppeteer panel tests
  analytics/                 ← Analytics engine tests
  harness/                   ← Self-tests of the test infrastructure
  wods/                      ← WOD data fixtures
  playground/                ← Playground routing tests

playground/src/**/__tests__/ ← Tier 3: React component tests
docs/working/
  test-inventory.md          ← 86-file classification (KEEP/REWRITE/OUT-OF-SCOPE)
  testing-howto.md           ← This file
  runtime-testability-plan.md ← The plan that produced Stories 1-5
```

---

## Pre-existing failure surface (do not be alarmed)

When you run `bun test`, you'll see ~168 pre-existing failures. These
are NOT introduced by Stories 1-5. They are:

1. **9 metric-display failures** in `tests/runtime-compliance/` —
   Resistance / Distance / Rep on Effort blocks. Tracked in
   `docs/working/cat4-type-fixes-handoff.md` (B1 was resolved; B2-B7
   still open).
2. **RTL Provider-wrapping failures** in `playground/src/**/__tests__/`
   — `useEffortRegistry must be used within EffortRegistryProvider`.
   These are the tests missing a Provider wrapper; fix the test, not
   the production code.
3. **Missing export failures** in `tests/lifecycle/` —
   `Export named 'TimerTickBehavior' not found in module
   'src/runtime/behaviors/index.ts'`. The export was removed in an
   earlier refactor; the test imports were not updated.
4. **~150 canvas/playground component failures** from the same family
   of issues as #2.

The compliance suite baseline (the right one to gate on) is
**297 pass / 9 fail** on `dev`. After Story 5 it is **301 pass / 9 fail**
(+4 from the new full-scale integration test). The 9 failures are
unchanged.

---

## What to do when your test would have been REWRITE-ON-BUILDER

The test inventory (`docs/working/test-inventory.md`) lists 25 files
still on the old `session-test-utils` path. When you need to touch
one of them:

1. **Read the existing test.** It uses `createSessionContext` from
   `tests/jit-compilation/helpers/session-test-utils.ts`. That helper
   returns a `SessionTestContext` with `runtime`, `clock`,
   `tracer`, `compiler`.
2. **The mapping is mechanical:**
   - `createSessionContext(script)` → `await TestScript.compile(script)`
   - `startSession(ctx)` → automatic (compile does it)
   - `userNext(ctx)` → `await script.next()`
   - `advanceClock(ctx, ms)` → `await script.tick(ms)`
   - `simulateEvent(ctx, name, data)` → `await script.userEvent(name, data)`
   - `getDisplayMetrics(ctx)` → `assertions(state).currentBlock()?.memoryByTag('display')`
   - `disposeSession(ctx)` → `await script.dispose()`
3. **Re-shape the test.** Replace the `ctx` access pattern with
   `await script.snapshot()` and the assertion DSL.
4. **Verify.** The new test should pass; if it has the same pre-existing
   9 metric-display failures, the port reproduces them faithfully.

When the bulk-reshape happens (the next session's work), every test
in `tests/blocks/`, `tests/strategies/`, `tests/jit-compilation/`,
`tests/analytics/`, `tests/lifecycle/`, and the 8 remaining
`tests/runtime-compliance/` files will follow this pattern.

---

## Cheat sheet: minimum viable test

```ts
// tests/runtime-compliance/my-feature.compliance.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { TestScript, assertions, expectAll } from '@/testing/script';

describe('My Feature', () => {
    let script: TestScript;

    beforeEach(async () => {
        script = await TestScript.compile(`
# My Feature

## Block
*:30 Do the thing
`);
    });

    afterEach(async () => {
        await script.dispose();
    });

    it('does the thing', async () => {
        await script.next();              // past WaitingToStart
        const state = await script.snapshot();

        expectAll(state, [
            a => expect(a.currentBlock()?.label()).toBe('Do the thing'),
            a => expect(a.stack().depth()).toBe(2),
            a => expect(a.cast().stackUpdateCount()).toBeGreaterThan(0),
        ]);
    });
});
```

That's it. Run `bun test tests/runtime-compliance/my-feature.compliance.test.ts`
and you have a deterministic, time-traveling, cast-asserting test.
