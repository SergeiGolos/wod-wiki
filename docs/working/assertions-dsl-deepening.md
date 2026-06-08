# Assertions DSL Deepening — Detailed Analysis

Candidate 4 from the testing surface architecture review. This document
answers: is `assertions.ts` earning its depth, and if so, how should it
be deepened?

---

## Current state

**File.** `src/testing/script/assertions.ts` (222 lines)

**Interface surface.** 16 methods across 4 interfaces:

| Interface | Methods | What each does |
|-----------|---------|----------------|
| `Assertions` | `currentBlock()`, `blockByLabel()`, `blockByKey()`, `blocks()`, `blocksByType()`, `cast()`, `stack()` | Root accessors |
| `BlockAssertions` | `label()`, `blockType()`, `isComplete()`, `memoryByTag(tag)`, `metric(type)`, `receivedEvent(name)` | Per-block reads |
| `CastAssertions` | `messages()`, `filter(type)`, `stackUpdateCount()`, `lastStackUpdate()`, `sawEvent(name)` | Cast message reads |
| `StackAssertions` | `depth()`, `isEmpty()`, `changed(baseline)` | Stack shape reads |

**Implementation.** 4 `*Impl` classes. Every method is a one-liner that
delegates to `ScriptState` fields or `IRuntimeBlock` methods.

---

## Deletion test

If `assertions.ts` were deleted, what would tests write instead?

### What's trivially replaceable

These methods are 1:1 with `ScriptState` or `IRuntimeBlock` properties:

```ts
a.currentBlock()?.label()     // → state.current?.label
a.currentBlock()?.blockType() // → state.current?.blockType
a.currentBlock()?.isComplete()// → state.current?.isComplete
a.stack().depth()             // → state.depth
a.stack().isEmpty()           // → state.depth === 0
a.cast().messages()           // → state.castSent
a.cast().stackUpdateCount()   // → state.castSent.filter(m => m.type === 'rpc-stack-update').length
```

**Conclusion: these are shallow.** The class layer adds no leverage
over direct property access.

### What's NOT trivially replaceable

These methods encode a **repeated pattern** that tests copy-paste:

1. **`memoryByTag(tag)`** — `block.getAllMemory().filter(loc => loc.tag === tag).flatMap(loc => loc.metrics.toArray())`
2. **`metric(type)`** — `block.getAllMemory().flatMap(loc => loc.metrics.toArray()).find(m => m.type === type)`
3. **`cast().filter(type)`** — typed array filter with `Extract<RpcMessage, { type: T }>`
4. **`stack().changed(baseline)`** — depth + current-key comparison

These are 2–4 lines each. Not deep individually, but they appear
dozens of times across the test suite.

**Conclusion: partial depth.** The methods wrap real repeated logic, but
each is still a single expression.

### What's completely missing

The **real** gap: tests need domain-specific queries that the DSL
doesn't provide. Every compliance test file defines local helper
functions that the DSL should own:

#### Pattern 1: Round state extraction (repeated 6+ times in tests, 14+ in production)

```ts
// tests/runtime-compliance/amrap.compliance.test.ts:31
function getRoundState(ctx: SessionTestContext): RoundState | undefined {
    const amrapBlock = ctx.runtime.stack.blocks.find(b => b.blockType === 'AMRAP');
    if (!amrapBlock) return undefined;
    return amrapBlock.getMemoryByTag('round')[0]?.metrics[0] as unknown as RoundState | undefined;
}
```

This exact pattern (find block by type → get memory by tag → cast first
metric) appears in:
- `amrap.compliance.test.ts` — `getRoundState()` (AMRAP block)
- `rounds.compliance.test.ts` — `getRoundState()` (Rounds block)
- `rest.compliance.test.ts` — `getRoundState()` (Rounds block)
- `emom.compliance.test.ts` — `getRoundState()` (EMOM block)

And in production code:
- `ChildSelectionBehavior.ts` — 3 occurrences
- `CountdownTimerBehavior.ts` — 1 occurrence
- `MetricPromotionBehavior.ts` — 3 occurrences
- `ReportOutputBehavior.ts` — 4 occurrences
- `RoundsEndBehavior.ts` — 1 occurrence

**Every one uses `as unknown as RoundState`** — a type-unsafe cast
because the metric system stores structured data as `IMetric` and the
consumer knows the `value` field is actually a `RoundState`.

#### Pattern 2: Block type matching (repeated 12+ times per file)

```ts
// tests/runtime-compliance/effort.compliance.test.ts:43
function currentBlockType(ctx: SessionTestContext): string | undefined {
    return ctx.runtime.stack.current?.blockType;
}
// Then used as: expect(currentBlockType(ctx)).toMatch(/effort/i)
```

Every compliance file defines this. It's trivial — but the regex match
(`toMatch(/effort/i)`) is also repeated, suggesting the DSL could offer:

```ts
a.currentBlock()?.isA('Effort')   // true if blockType matches /effort/i
```

#### Pattern 3: Display metric presence (repeated 4+ times)

```ts
// tests/runtime-compliance/effort.compliance.test.ts:52
function blockHasDisplayMetric(ctx: SessionTestContext, metricType: MetricType | string): boolean {
    const block = ctx.runtime.stack.current;
    if (!block) return false;
    return block.getMemoryByTag('metric:display')
        .flatMap(loc => loc.metrics.toArray())
        .some(m => m.type === metricType);
}
```

This is what `a.currentBlock()?.memoryByTag('metric:display')` almost
does — but the test needs "does this metric type exist?" not "give me
all metrics." The DSL lacks a `hasMetric(tag, type)` convenience.

#### Pattern 4: Timer elapsed time

Multiple compliance tests assert "after advancing X ms, the timer has
elapsed Y." Currently they access block memory directly:

```ts
const timer = block.getMemoryByTag('timer')[0]?.metrics[0] as unknown as TimerState;
expect(timer.elapsed).toBeGreaterThanOrEqual(5_000);
```

The DSL doesn't know about timer state, round state, or any
domain-specific memory shape.

---

## Decision: deepen, don't delete

The DSL is in a "local minimum" — shallow enough to question its
existence, but the real value isn't in what it wraps today; it's in
what it *should* wrap. Deleting it removes the only place where these
domain-specific queries could live.

The right move: **add the methods that would make the existing
copy-pasted helpers unnecessary.**

---

## Proposed deepened interface

### BlockAssertions additions

```ts
export interface BlockAssertions {
    // ── Existing (keep) ──────────────────────────────
    readonly block: IRuntimeBlock;
    label(): string;
    blockType(): string;
    isComplete(): boolean;
    memoryByTag(tag: string): readonly IMetric[];
    metric(type: string): IMetric | undefined;
    receivedEvent(name: string): boolean;

    // ── New: domain-specific queries ─────────────────

    /** Does this block's type match the given tag (case-insensitive)?
     *  Supports the common /effort/i, /timer/i, /rest/i patterns. */
    isA(typeTag: string): boolean;

    /** Does this block have a metric of the given type in the given memory tag? */
    hasMetric(tag: string, metricType: string): boolean;

    /** Read the structured round state from this block's 'round' memory.
     *  Returns undefined if no round memory exists. */
    roundState(): RoundState | undefined;

    /** Read the structured timer state from this block's 'timer' memory.
     *  Returns undefined if no timer memory exists. */
    timerState(): TimerState | undefined;

    /** All display metrics (convenience for memoryByTag('metric:display')). */
    displayMetrics(): readonly IMetric[];

    /** Find a display metric by type. */
    displayMetric(type: string): IMetric | undefined;
}
```

### Assertions additions

```ts
export interface Assertions {
    // ── Existing (keep) ──────────────────────────────
    currentBlock(): BlockAssertions | undefined;
    blockByLabel(label: string): BlockAssertions | undefined;
    blockByKey(key: string): BlockAssertions | undefined;
    blocks(): BlockAssertions[];
    blocksByType(type: string): BlockAssertions[];
    cast(): CastAssertions;
    stack(): StackAssertions;

    // ── New: output statements ───────────────────────

    /** Output statement assertions (currently only available via
     *  OutputTracingHarness). */
    outputs(): OutputAssertions;
}
```

### New: OutputAssertions

```ts
export interface OutputAssertions {
    /** All output statements emitted so far. */
    all(): readonly IOutputStatement[];
    /** Count of output statements. */
    count(): number;
    /** Assert that every segment output has a matching completion output.
     *  Throws with details if any are unpaired. */
    allPaired(): void;
    /** Outputs for a specific block key. */
    forBlock(key: string): readonly IOutputStatement[];
    /** Outputs of a specific type (segment, completion, milestone). */
    byType(type: OutputStatementType): readonly IOutputStatement[];
}
```

### New: OutputAssertions

This unblocks the `ctx.tracer`-dependent tests (Phase A2/F1 from the
plan). `TestScript` captures output statements in `ScriptState` (or a
parallel capture), and `OutputAssertions` reads them.

---

## Impact on existing tests

### Before (current pattern in amrap.compliance.test.ts)

```ts
function getRoundState(ctx: SessionTestContext): RoundState | undefined {
    const amrapBlock = ctx.runtime.stack.blocks.find(b => b.blockType === 'AMRAP');
    if (!amrapBlock) return undefined;
    return amrapBlock.getMemoryByTag('round')[0]?.metrics[0] as unknown as RoundState | undefined;
}

// In test:
expect(getRoundState(ctx)?.current).toBe(1);
```

### After (deepened DSL)

```ts
// In test (after TestScript migration):
const state = await script.snapshot();
const a = assertions(state);

expect(a.blocksByType('AMRAP')[0]?.roundState()?.current).toBe(1);
```

No local helper function. No `as unknown as` cast. The type-safe
`roundState()` method knows the `RoundState` shape and returns it
properly typed.

### Before (display metric check)

```ts
function blockHasDisplayMetric(ctx, metricType) {
    const block = ctx.runtime.stack.current;
    return block.getMemoryByTag('metric:display')
        .flatMap(loc => loc.metrics.toArray())
        .some(m => m.type === metricType);
}
expect(blockHasDisplayMetric(ctx, MetricType.Resistance)).toBe(true);
```

### After

```ts
expect(a.currentBlock()?.hasMetric('metric:display', 'Resistance')).toBe(true);
// or:
expect(a.currentBlock()?.displayMetric('Resistance')).toBeDefined();
```

---

## What about the shallow methods?

The existing `label()`, `blockType()`, `isComplete()`, `depth()`,
`isEmpty()` are thin wrappers. Two options:

### Option A: Keep them as convenience

They're cheap (one-liners) and the `expectAll(state, checks)` pattern
depends on the `Assertions` interface. Removing them forces callers to
alternate between `a.` and `state.` access. Not worth the churn.

### Option B: Delete the class layer, make `assertions()` return the state plus extension methods

Make `Assertions` extend `ScriptState`:

```ts
export interface Assertions extends ScriptState {
    currentBlock(): BlockAssertions | undefined;
    // ... domain methods
}
```

This way `a.depth` works (from `ScriptState`) and `a.currentBlock()?.roundState()`
works (from `Assertions`). No need for `a.stack().depth()`.

**Recommendation: Option A** — keep the shallow methods, add the deep
ones. The churn of Option B isn't worth it while 25 tests are still on
`session-test-utils`. After the migration is complete, the shallow
methods can be evaluated for removal.

---

## What about `roundState()` as production code?

The `as unknown as RoundState` cast appears **14 times in production
code**. This is a separate but related problem: the memory system
stores structured data as `IMetric` but consumers know the shape. The
right fix is a typed memory reader in the runtime (not in test
infrastructure):

```ts
// In src/runtime/memory/TypedMemory.ts
export function readRoundState(block: IRuntimeBlock): RoundState | undefined {
    const loc = block.getMemoryByTag('round')[0];
    if (!loc) return undefined;
    return loc.metrics[0]?.value as RoundState | undefined;
}
```

Then `BlockAssertions.roundState()` calls `readRoundState()` instead of
duplicating the cast. This is the **locality** win: the cast lives in
one place, both production and test code use it.

This is a separate change from the DSL deepening — it's a production
code improvement that the DSL can consume. Document it as a follow-up.

---

## Implementation order

1. **Add `isA()`, `hasMetric()`, `displayMetrics()`, `displayMetric()`**
   to `BlockAssertions`. These are pure convenience — no new data, just
   wrapping existing access patterns. ~20 lines each.

2. **Add `roundState()` and `timerState()`** to `BlockAssertions`.
   These require importing `RoundState` and `TimerState` types and
   doing the `as unknown as` cast centrally. ~15 lines each.

3. **Add `OutputAssertions`** to `ScriptState` + `assertions()`. This
   requires `TestScript` to capture output statements during execution.
   Medium effort — depends on wiring an `OutputTracingHarness` into the
   test script.

4. **Extract `readRoundState()` and `readTimerState()`** into
   `src/runtime/memory/TypedMemory.ts` and use them from both
   production code and the DSL. This is a separate PR.

5. **Delete the local helper functions** from compliance tests as they
   migrate to `TestScript` (Phase F in the plan).

---

## Acceptance criteria

1. Every compliance test file that currently defines `getRoundState()`
   or `blockHasDisplayMetric()` uses the DSL instead.
2. Zero `as unknown as RoundState` casts in test code.h
3. The `assertions.ts` test file covers all new methods.
4. The 9 pre-existing metric-display failures are reproduced identically.
5. `expectAll()` still works with the extended `Assertions` interface.
