# Testing Surface Deepening Plan

Consolidates six overlapping test infrastructure modules into two seams,
removes dead adapters, closes the parser-to-runtime seam gap, and
eliminates the unit-setup tax. Ordered by dependency: earlier phases
unblock later ones.

Vocabulary: module / interface / seam / depth / leverage / locality.
Domain terms from `CONTEXT.md`: Statement, Block, Behavior, Metric,
Origin, Dialect, Strategy.

---

## Current state

| Module | LOC | Used by | Role |
|--------|-----|---------|------|
| `TestScript` | 173 | 7 test files | Full pipeline + cast |
| `BehaviorTestHarness` | 507 | 12 test files | Single Behavior isolation |
| `ExecutionContextTestHarness` | 539 | 14 test files (`src/runtime/**`) | Action/event recording with MockJitCompiler |
| `WorkoutTestHarness` | 316 | 0 test files | Workout-specific reporting |
| `RuntimeTestBuilder` | 125 | 0 test files | Generic runtime harness |
| `TestableRuntime` | 814 | 1 component (`SnapshotDiffViewer`) | Snapshot diffing wrapper |
| `TestableBlock` | 319 | 1 test file (`RuntimeDebugMode.test.ts`) | Method interception wrapper |
| `MockBlock` | 578 | 20+ test files | Stub block for BehaviorTestHarness / ExecutionContextTestHarness |
| `session-test-utils` | 202 | 25 test files + TestScript itself | Old full-pipeline harness |
| `parser-test-utils` | 486 | 8 test files | Parser assertion DSL |

---

## Phase A — Extract `createFullCompiler`, delete `session-test-utils` path

> Unblocks all later phases. Until `TestScript` stops importing from
> `tests/`, the old path can never be deleted.

### A1. Move `createFullCompiler` to `src/testing/`

**Files.**
- New `src/testing/compiler/createFullCompiler.ts`
- `src/testing/compiler/index.ts`
- `tests/jit-compilation/helpers/session-test-utils.ts` (delete `createFullCompiler`, re-export from new location)

**Change.**
Extract the 22-line `createFullCompiler` function that registers all
production strategies on a `JitCompiler`. Place it at
`src/testing/compiler/createFullCompiler.ts` so both `TestScript` and
old callers import from the same place.

Update `TestScript.ts` import:
```ts
// was: import { createFullCompiler } from '../../../tests/jit-compilation/helpers/session-test-utils';
import { createFullCompiler } from '@/testing/compiler';
```

`session-test-utils.ts` re-exports from the new location for backward
compat during migration:
```ts
export { createFullCompiler } from '@/testing/compiler';
```

**Acceptance.** `TestScript.compile()` no longer imports from `tests/`.
`grep -r "from.*session-test-utils" src/` returns zero hits.

### A2. Migrate the 25 `session-test-utils` callers to `TestScript`

**Files.** All 25 test files importing from `session-test-utils`.

**Change.** Mechanical replacement per the mapping in
`docs/working/testing-howto.md`:

| Old | New |
|-----|-----|
| `createSessionContext(text)` | `await TestScript.compile(text)` |
| `startSession(ctx)` | automatic (compile does it) |
| `userNext(ctx)` | `await script.next()` |
| `advanceClock(ctx, ms)` | `await script.tick(ms)` |
| `simulateEvent(ctx, name, data)` | `await script.userEvent(name, data)` |
| `disposeSession(ctx)` | `await script.dispose()` |
| `ctx.tracer.assertPairedOutputs()` | `assertions(state).outputs().allPaired()` (needs output assertions — see Phase D) |
| `ctx.runtime.stack.count` | `(await script.snapshot()).depth` |

**Caveat.** Tests using `ctx.tracer` (the `OutputTracingHarness`) cannot
migrate until TestScript exposes output-statement assertions. Those
tests stay on `session-test-utils` for now; the rest migrate.

**Order.** Start with the 10 `tests/jit-compilation/*.test.ts` files
(stack-count-only assertions), then the 8
`tests/runtime-compliance/*.compliance.test.ts` files, then
`tests/parser-compliance/parse-then-run.integration.test.ts`, then the
remaining scattered callers.

**Acceptance.** Only tests that use `ctx.tracer` still import from
`session-test-utils`. All others import `TestScript` from
`@/testing/script`.

### A3. Delete `session-test-utils.ts`

**Files.** `tests/jit-compilation/helpers/session-test-utils.ts`

**Change.** Once A2 is complete and no remaining caller uses `ctx.tracer`,
delete the file. If `OutputTracingHarness`-dependent tests remain, keep
the file but stripped to only what those tests need.

**Acceptance.** `session-test-utils.ts` is gone or reduced to a thin
wrapper around `OutputTracingHarness`.

---

## Phase B — Delete unused harness modules

> Dead code. `WorkoutTestHarness`, `RuntimeTestBuilder`,
> `TestableRuntime`, and `TestableBlock` have zero or near-zero test
> callers.

### B1. Delete `WorkoutTestHarness` and `WorkoutTestBuilder`

**Files.** `src/testing/harness/WorkoutTestHarness.ts`

**Change.** Zero test callers. Delete the file and remove from
`src/testing/harness/index.ts`. The `WorkoutReport` type is not
referenced anywhere in `tests/`.

**Acceptance.** File deleted, no compile errors.

### B2. Delete `RuntimeTestBuilder` and `RuntimeTestHarness`

**Files.** `src/testing/harness/RuntimeTestBuilder.ts`

**Change.** Zero test callers. Delete and remove from index.

**Acceptance.** File deleted, no compile errors.

### B3. Delete `TestableRuntime` (or reduce to type-only)

**Files.** `src/testing/testable/TestableRuntime.ts`

**Change.** One caller: `SnapshotDiffViewer.tsx` imports
`SnapshotDiff` type. Move the `SnapshotDiff` and `RuntimeSnapshot`
interfaces to `src/testing/contracts/` (or inline them). Delete the
814-line `TestableRuntime` class.

`TestableBlock` has one real caller:
`src/runtime/__tests__/RuntimeDebugMode.test.ts`. That test uses
`TestableBlock` for debug-mode block wrapping. Evaluate whether it can
use `MockBlock` instead — if yes, delete `TestableBlock` too.

**Acceptance.** `TestableRuntime.ts` deleted. `TestableBlock.ts` deleted
or kept with a clear single-caller justification. `SnapshotDiffViewer`
still compiles.

### B4. Clean up `src/testing/index.ts`

**Files.** `src/testing/index.ts`

**Change.** Remove the `export * from './testable'` line (or narrow to
just the moved types). Remove `export * from './components'` if
`SnapshotDiffViewer` moves or is deleted.

**Acceptance.** `src/testing/` exports only: `harness/`, `script/`,
`transport/`, `setup/`, `contracts/`, and `compiler/` (new from Phase A).

---

## Phase C — Close the parser-to-runtime seam gap

> Adds `TestScript.fromScript()` so parse-then-run tests parse once.

### C1. Add `TestScript.fromScript()`

**Files.** `src/testing/script/TestScript.ts`

**Change.** New static method:

```ts
static async fromScript(
    script: WhiteboardScript,
    config?: TestScriptConfig
): Promise<TestScript> {
    const compiler = createFullCompiler();
    const clock = config?.clock ?? createMockClock(new Date('2024-01-01T12:00:00Z'));
    const stack = new RuntimeStack();
    const eventBus = new EventBus();
    const runtime = new ScriptRuntime(script, compiler, { stack, clock, eventBus });
    const castTransport = new FakeRpcTransport();
    const browserFake = new FakeRpcTransport();
    connectPair(browserFake, castTransport);

    const ts = new TestScript(runtime, clock, castTransport);
    runtime.do(new StartSessionAction());
    await ts.flushObservers();
    return ts;
}
```

This is the same body as `compile()` but accepts a pre-parsed
`WhiteboardScript` instead of calling `sharedParser.read()`.

**Acceptance.** A test can call `parse(text)` → assert on tree →
`await TestScript.fromScript(parsedScript)` → assert on runtime. No
double-parse.

### C2. Migrate `tests/parser-compliance/parse-then-run.integration.test.ts`

**Files.** `tests/parser-compliance/parse-then-run.integration.test.ts`

**Change.** Replace the two-harness pattern:
```ts
// Old
const tree = parse(SCRIPT);
tree.select(0).hasMetric(MetricType.Rep, 10);
ctx = createSessionContext(SCRIPT);
startSession(ctx);
```
With:
```ts
// New
const parsed = sharedParser.read(SCRIPT) as WhiteboardScript;
const tree = parseFromScript(parsed);  // or keep parse() if it accepts WhiteboardScript
tree.select(0).hasMetric(MetricType.Rep, 10);
script = await TestScript.fromScript(parsed);
```

**Acceptance.** `parse-then-run.integration.test.ts` imports only from
`@/testing/script` and `@/testing/parser` (or `../helpers/parser-test-utils`).
No `session-test-utils` import.

### C3. Ensure `parser-test-utils` can work from a `WhiteboardScript`

**Files.** `tests/helpers/parser-test-utils.ts`

**Change.** The current `parse(text)` function calls
`sharedParser.read(text)` internally. Add a `parseFromScript(script:
WhiteboardScript, options?)` variant that skips the parse step and
builds `TreeAssertions` directly from the already-parsed script. This
avoids the divergence where `parser-test-utils` uses different dialect
config than the runtime.

**Acceptance.** `TreeAssertions` can be constructed from a
`WhiteboardScript` without re-parsing.

---

## Phase D — Collapse `ExecutionContextTestHarness` into `BehaviorTestHarness`

> 14 test files in `src/runtime/**` use
> `ExecutionContextTestHarness`. It differs from
> `BehaviorTestHarness` in two ways: (1) it uses a `MockJitCompiler`
> that lets tests register JIT matchers, (2) it records all dispatched
> actions and events. Both capabilities can be added to
> `BehaviorTestHarness` as opt-in modes.

### D1. Add action/event recording to `BehaviorTestHarness`

**Files.** `src/testing/harness/BehaviorTestHarness.ts`

**Change.** `BehaviorTestHarness` already captures actions and events
(`CapturedAction`, `CapturedEvent` types exist). Add a
`withRecording()` mode that enables the same `ActionExecution` /
`EventDispatch` record types that `ExecutionContextTestHarness` exposes.
Wire this behind a flag so existing callers don't pay the overhead.

**Acceptance.** `BehaviorTestHarness` has
`.actions: CapturedAction[]` and `.events: CapturedEvent[]` properties
when recording is enabled.

### D2. Add `MockJitCompiler` support to `BehaviorTestHarness`

**Files.** `src/testing/harness/BehaviorTestHarness.ts`,
`src/testing/harness/MockJitCompiler.ts`

**Change.** When a test needs JIT matchers (the
`ExecutionContextTestBuilder.withJitMatcher()` pattern), let
`BehaviorTestHarness` accept an optional `MockJitCompiler` in its
config. This is the same `MockJitCompiler` class, just wired through
the surviving harness.

**Acceptance.** A test can create a `BehaviorTestHarness` with JIT
matchers without using `ExecutionContextTestHarness`.

### D3. Migrate `ExecutionContextTestHarness` callers to `BehaviorTestHarness`

**Files.** All 14 test files in `src/runtime/**/__tests__/` and
`src/runtime/compiler/strategies/__tests__/`.

**Change.** Replace:
```ts
harness = new ExecutionContextTestHarness({ statements: [...] });
```
With:
```ts
harness = new BehaviorTestHarness()
    .withClock(new Date('2024-01-01T12:00:00Z'))
    .withStatements([...])
    .withRecording();
```

Or use the existing factory functions (re-pointed at
`BehaviorTestHarness`).

**Acceptance.** No test file imports
`ExecutionContextTestHarness` or `ExecutionContextTestBuilder`.

### D4. Delete `ExecutionContextTestHarness`, `ExecutionContextTestBuilder`, and factory functions

**Files.**
- `src/testing/harness/ExecutionContextTestHarness.ts`
- `src/testing/harness/ExecutionContextTestBuilder.ts`
- `src/testing/harness/factory.ts`
- `src/testing/harness/README.md`

**Change.** Delete all four files. Update `index.ts` to remove exports.

**Acceptance.** `src/testing/harness/` contains only:
`BehaviorTestHarness`, `MockBlock`, `MockJitCompiler`,
`MockEffortResolver`, and `index.ts`.

---

## Phase E — Reduce `unit-setup.ts` tax

### E1. Identify which mock.module patches are still needed

**Files.** `tests/unit-setup.ts`

**Change.** After Phases A–D, many test files will no longer transitively
import from `src/components/` or `src/services/db/`. Audit which
`mock.module` calls are still needed by running:

```
grep -r "import.*from.*@/repositories" tests/
grep -r "import.*from.*@/services/db" tests/
```

Any `mock.module` that patches a module no longer transitively imported
by any test can be deleted.

### E2. Move remaining patches to the tests that need them

**Files.** `tests/unit-setup.ts`, individual test files.

**Change.** Patches needed only by RTL tests (Tier 3) move into a
shared RTL setup file (e.g. `playground/src/setupTests.ts`). Patches
needed only by Puppeteer tests stay where they are. The universal
`unit-setup.ts` shrinks to only: `fake-indexeddb/auto` and the JSDOM
boot — and only if runtime tests still need JSDOM.

**Acceptance.** A runtime-only test (`TestScript` or
`BehaviorTestHarness`) does not pay the mock.module tax. `unit-setup.ts`
is ≤ 30 lines.

### E3. Defer `import.meta.glob` calls to function invocation

**Files.** `src/repositories/wod-feeds.ts`,
`src/repositories/wod-collections.ts`, `src/repositories/wod-loader.ts`,
`src/repositories/page-examples.ts`, `src/repositories/effort-markdown.ts`

**Change.**ok`import.meta.glob` at evaluation time,
forcing every test that transitively imports them to mock the call. Wrap
the glob in a lazy initializer:
```ts
// was: const pages = import.meta.glob('./wods/*.md', { eager: true });
const pages = () => import.meta.glob('./wods/*.md', { eager: true });
```

Tests that don't use these repos never trigger the glob. The mock.module
patches become unnecessary for runtime tests.

**Acceptance.** `mock.module('@/repositories/*')` calls are removed from
`unit-setup.ts`.

---

## Phase F — Compliance test reshaping

> Mechanical cleanup. Each old compliance file gets a describe-level
> `beforeEach` that compiles once.

### F1. Add output-statement assertions to `TestScript`

**Files.** `src/testing/script/assertions.ts`, `src/testing/script/ScriptState.ts`

**Change.** Extend `ScriptState` to capture output statements (currently
only available via `OutputTracingHarness`). Add to `Assertions`:
```ts
outputs(): OutputAssertions;
```
Where `OutputAssertions` provides:
- `all(): IOutputStatement[]`
- `allPaired(): void` (throws if any segment lacks a completion)
- `count(): number`
- `forBlock(key: string): IOutputStatement[]`

This unblocks migrating the `ctx.tracer`-dependent tests from Phase A2.

**Acceptance.** A test can assert on output statements via
`assertions(state).outputs()`.

### F2. Reshape each old compliance file

**Files.** All 8 unported `tests/runtime-compliance/*.compliance.test.ts`.

**Change.** Per-file:
1. Replace `createSessionContext` + `startSession` with `TestScript.compile` in `beforeEach`.
2. Use `await script.next()`, `await script.tick(ms)`, `await script.snapshot()` instead of direct `ctx.runtime` access.
3. Keep helper functions (`getRoundState`, `currentBlockType`) if they add clarity; inline if trivial.

Example reshape for `amrap.compliance.test.ts`:
```ts
describe('Classic AMRAP — Cindy', () => {
    const SCRIPT = '20:00 AMRAP\n  5 Pullups\n  10 Pushups\n  15 Air Squats';
    let script: TestScript;

    beforeEach(async () => {
        script = await TestScript.compile(SCRIPT);
    });
    afterEach(async () => {
        await script.dispose();
    });

    function oneRound() {
        return script.next().next().next(); // chain or sequential
    }

    it('step 0: depth = 2', async () => {
        const state = await script.snapshot();
        expect(state.depth).toBe(2);
    });

    it('step 1: AMRAP block present', async () => {
        await script.next();
        const a = assertions(await script.snapshot());
        expect(a.currentBlock()?.blockType()).toMatch(/AMRAP/i);
    });
});
```

**Acceptance.** Every compliance test uses `TestScript`. No file imports
`session-test-utils`. The 9 pre-existing metric-display failures are
reproduced identically (same assertions, same outcomes).

---

## Dependency graph

```
Phase A (extract createFullCompiler)
    ↓
Phase B (delete dead modules) ← independent of each other
    ↓
Phase C (parser-to-runtime seam) ← needs A done
    ↓
Phase D (collapse ExecutionContext into Behavior) ← needs A done
    ↓
Phase E (unit-setup tax) ← can start after D, partially after A
    ↓
Phase F (compliance reshape) ← needs A done, F1 before F2
```

Phases B and C can proceed in parallel after A lands.

---

## What the testing surface looks like after

```
src/testing/
  compiler/
    createFullCompiler.ts    ← production JIT factory
    index.ts
  script/
    TestScript.ts            ← Tier 1: full pipeline + cast
    assertions.ts            ← deep read API on ScriptState
    ScriptState.ts           ← frozen snapshot contract
    index.ts
  harness/
    BehaviorTestHarness.ts   ← Tier 2: single Behavior (with optional JIT + recording)
    MockBlock.ts             ← stub block adapter
    MockJitCompiler.ts       ← mock JIT for BehaviorTestHarness
    MockEffortResolver.ts
    index.ts
  transport/
    FakeRpcTransport.ts      ← cast fake
    index.ts
  setup/                     ← test setup actions (unchanged)
  contracts/                 ← shared test types

tests/
  unit-setup.ts              ← ≤ 30 lines (fake-indexeddb + JSDOM only)
  helpers/
    parser-test-utils.ts     ← parser DSL (unchanged)
    test-utils.ts            ← deleted (deprecated helpers)
  jit-compilation/helpers/
    session-test-utils.ts    ← deleted
```

Two seams:
1. **TestScript** — for anything that touches the full pipeline (parse →
   JIT → runtime → cast).
2. **BehaviorTestHarness** — for anything that tests a single Behavior
   or a Block in isolation.

Every other harness module is deleted.
