# Tier 1 — Deletions

> Part of [Architectural Cleanup](./architectural-cleanup.md). These are verified-dead: every item below was checked by grepping for production usage (not just tests). None of these changes require a design decision — they're removal of code that has already been superseded or never wired up.
>
> **Status: ✅ Implemented and independently re-verified.** See the [Verification Appendix](#verification-appendix) at the end of this document for what was checked, one gap found in the original implementation pass and how it was fixed, and an unrelated anomaly flagged for the user's attention.

---

## 1.1 Four deprecated behaviors superseded by `ExitBehavior`

**What exists today.** `src/runtime/behaviors/` contains four `@deprecated`-marked behaviors, each implementing an earlier attempt at "when should this block pop":

| Behavior | File | LOC | Production usage | Test usage |
|---|---|---|---|---|
| `ReEntryBehavior` | `ReEntryBehavior.ts` | 61 | 0 | ~30 references across 6 test files |
| `RoundsEndBehavior` | `RoundsEndBehavior.ts` | 43 | 0 | ~15 references across 4 test files |
| `LeafExitBehavior` | `LeafExitBehavior.ts` | 53 | 0 | ~15 references across 5 test files |
| `CompletedBlockPopBehavior` | `CompletedBlockPopBehavior.ts` | 46 | 0 | comments + 1 barrel export only |

All four are marked `@deprecated` in `src/runtime/behaviors/index.ts:32-56`. Grepping for `new ReEntryBehavior(`, `new RoundsEndBehavior(`, etc. outside `__tests__`/`.test.ts` returns nothing — no strategy, block, or builder constructs them. `ReEntryBehavior.ts:42` still dispatches a live action (`TrackRoundAction`), but since the behavior itself is never mounted in production, that code path never executes outside its own test file.

**Why they're dead.** `ExitBehavior` (`src/runtime/behaviors/ExitBehavior.ts`, 122 LOC) replaced all four with a single parameterized behavior (`mode: 'immediate' | 'deferred'`, an optional event-triggered exit). It is used in production by 8 call sites: `GenericLoopStrategy`, `GenericTimerStrategy`, `ChildrenStrategy`, `IdleBlockStrategy`, `EffortFallbackStrategy`, `WaitingToStartBlock`, `RestBlock`. The four deprecated behaviors are historical scaffolding from before that consolidation, left in place with their test suites.

### Old vs. new

**Old** — four separate behavior classes, each hard-coding one exit rule, each independently tested, all dead:

```ts
// ReEntryBehavior.ts — dead
export class ReEntryBehavior implements IRuntimeBehavior {
  onNext(ctx: IBehaviorContext): IRuntimeAction[] {
    // re-entry-specific pop logic, dispatches TrackRoundAction
  }
}

// RoundsEndBehavior.ts, LeafExitBehavior.ts, CompletedBlockPopBehavior.ts — same shape, dead
```

```ts
// src/runtime/behaviors/index.ts
/** @deprecated use ExitBehavior */
export { ReEntryBehavior } from './ReEntryBehavior';
/** @deprecated use ExitBehavior */
export { RoundsEndBehavior } from './RoundsEndBehavior';
/** @deprecated use ExitBehavior */
export { LeafExitBehavior } from './LeafExitBehavior';
/** @deprecated use ExitBehavior */
export { CompletedBlockPopBehavior } from './CompletedBlockPopBehavior';
```

**New** — nothing. Delete:
- `ReEntryBehavior.ts`, `RoundsEndBehavior.ts`, `LeafExitBehavior.ts`, `CompletedBlockPopBehavior.ts`
- Their four barrel exports in `index.ts`
- `ReEntryBehavior.test.ts`, `RoundsEndBehavior.test.ts`, `LeafExitBehavior.test.ts`, and the corresponding blocks inside `__tests__/integration/*` that exercise them
- Any re-export of these four from `core-entry.ts`, if present

`ExitBehavior` already exists and needs no changes — this is subtraction only.

---

## 1.2 Vestigial strategies and their dead singletons

**What exists today.** Four strategy classes are exported from `src/runtime/compiler/strategies/index.ts` but are **not** in `PRODUCTION_STRATEGIES` (`src/runtime/services/runtimeServices.ts:26-43`), and their `match()` unconditionally returns `false` — they are "direct-build" strategies, invoked (if at all) by name, never through the compile pipeline.

Of these four, two are fully vestigial:

- **`WaitingToStartStrategy`** (`WaitingToStartStrategy.ts:41`, `match()` → `false`). Its `build()` method constructs `new WaitingToStartBlock(...)` (`:67`), but in production the same block is built directly by `WaitingToStartInjectorBehavior.ts:28`. The exported singleton `waitingToStartStrategy` (`:74`) has **zero references** anywhere in the codebase outside its own file.
- **`RestBlockStrategy`** (`RestBlockStrategy.ts:52`, `match()` → `false`). Its `build()`/`buildWithDuration()` construct `RestBlock`, but in production `RestBlock` is built directly by `PushRestBlockAction.ts:29` and `BlockBuilder.ts:223`. The exported singleton `restBlockStrategy` (`:108`) has **zero references**.

Two more are used as classes but their exported singletons are dead weight:

- **`SessionRootStrategy`** — the *class* is legitimately used directly (`StartSessionAction.ts:79`, `StartWorkoutAction.ts:74`), but the exported singleton `sessionRootStrategy` has zero references.
- **`IdleBlockStrategy`** — the *class* is used via `PushIdleBlockAction.ts:15`, but the exported singleton `idleBlockStrategy` has zero references. It also carries a dead method (see §1.3).

Each of the four has a dedicated `.test.ts` file that exercises the dead singleton or the unreachable `build()` path.

### Old vs. new

**Old** — four strategy classes, each with a `match()` that always returns `false` and a module-level singleton nobody imports:

```ts
// WaitingToStartStrategy.ts
export class WaitingToStartStrategy implements IRuntimeBlockStrategy {
  priority = 100;
  match(): boolean { return false; }              // never participates in compile()
  build(config): IRuntimeBlock { return new WaitingToStartBlock(...); }  // dead path
}
export const waitingToStartStrategy = new WaitingToStartStrategy(); // 0 references

// RestBlockStrategy.ts — same shape, also dead
export class RestBlockStrategy implements IRuntimeBlockStrategy { /* ... */ }
export const restBlockStrategy = new RestBlockStrategy(); // 0 references
```

```ts
// runtimeServices.ts — comment explains RestBlockStrategy is intentionally excluded,
// but the class + singleton still exist and are exported publicly
const PRODUCTION_STRATEGIES: IRuntimeBlockStrategy[] = [
  amrapLogicStrategy, intervalLogicStrategy,
  genericTimerStrategy, genericLoopStrategy, genericGroupStrategy, childrenStrategy,
  soundStrategy, reportOutputStrategy, effortFallbackStrategy,
  // RestBlockStrategy deliberately NOT included — built directly by PushRestBlockAction
];
```

**New**:
- Delete `WaitingToStartStrategy.ts` and `RestBlockStrategy.ts` entirely (classes, singletons, tests). The blocks they built are already built elsewhere; nothing references the strategy form.
- Keep `SessionRootStrategy` and `IdleBlockStrategy` as classes (they're legitimately invoked directly by their actions), but delete the exported singleton instances (`sessionRootStrategy`, `idleBlockStrategy`) since only the class is ever used.
- Add a one-line comment at each action call site (`StartSessionAction.ts`, `PushIdleBlockAction.ts`) noting these are direct-build strategies invoked by class, not through `JitCompiler.compile()` — so a future reader doesn't wonder why they're absent from `PRODUCTION_STRATEGIES`.

---

## 1.3 The JIT strategy-match cache

**What exists today.** `JitCompiler.ts:20-115` maintains a `_strategyMatchCache: Map<string, IRuntimeBlockStrategy[]>`. On every `compile()` call it builds a cache key via `_statementCacheKey` (`:56-65`) — for each statement, sort and filter its metric types (excluding `Hint`/`Choice`) and hints, join into a string, join across statements — looks up or populates the cache, and explicitly bypasses it when parent-promotion metrics were projected onto the child (because promotion changes the effective statement shape).

**Why it's disproportionate.** The thing being cached is the result of running the registered strategies' `match()` predicates. Every `match()` in the production set is a one-line boolean check:

```ts
// GenericTimerStrategy.ts:29
match(nodes) { return nodes.some(n => n.metrics.hasType(MetricType.Duration) && ...); }

// GenericLoopStrategy.ts:27
match(nodes) { return nodes.some(n => n.metrics.hasType(MetricType.Rounds)); }

// ChildrenStrategy.ts:25
match(nodes) { return nodes[0]?.children?.length > 0; }
```

There are roughly 8 such predicates in `PRODUCTION_STRATEGIES` (four of the registered strategies — the direct-build ones from §1.2 — return `false` unconditionally and never reach this code path at all). Building the cache key (a sort + filter + string-join per statement, per compile call) is not obviously cheaper than evaluating 8 booleans directly, and it adds: a cache-invalidation rule on `registerStrategy()`, a promotion-bypass rule, and a class of bugs where the key doesn't fully capture what a `match()` actually inspects (e.g., a future strategy that matches on statement `id` or `parent` would silently get stale cache hits, since the key deliberately excludes `id`).

### Old vs. new

**Old**:

```ts
class JitCompiler {
  private _strategyMatchCache = new Map<string, IRuntimeBlockStrategy[]>();

  private _statementCacheKey(nodes: ICodeStatement[]): string {
    return nodes.map(n => {
      const types = [...n.metrics.getTypes()].filter(t => t !== 'Hint' && t !== 'Choice').sort();
      const hints = [...n.metrics.getHints()].sort();
      return `${types.join(',')}:${n.children.length > 0}:${hints.join(',')}`;
    }).join('|');
  }

  compile(nodes, runtime) {
    const effectiveNodes = this._applyPromotions(nodes, runtime);
    const hasPromotions = effectiveNodes !== nodes;
    const cacheKey = hasPromotions ? null : this._statementCacheKey(effectiveNodes);

    let matched = cacheKey && this._strategyMatchCache.get(cacheKey);
    if (!matched) {
      matched = this._strategies
        .filter(s => s.match(effectiveNodes, runtime))
        .sort((a, b) => b.priority - a.priority);
      if (cacheKey) this._strategyMatchCache.set(cacheKey, matched);
    }
    // ... apply matched strategies to a BlockBuilder
  }

  registerStrategy(s: IRuntimeBlockStrategy) {
    this._strategies.push(s);
    this._strategyMatchCache.clear(); // must remember to invalidate
  }
}
```

**New** — evaluate the predicates directly; delete the cache, the key builder, and the invalidation rule:

```ts
class JitCompiler {
  compile(nodes, runtime) {
    const effectiveNodes = this._applyPromotions(nodes, runtime);

    const matched = this._strategies
      .filter(s => s.match(effectiveNodes, runtime))
      .sort((a, b) => b.priority - a.priority);
    // ... apply matched strategies to a BlockBuilder
  }

  registerStrategy(s: IRuntimeBlockStrategy) {
    this._strategies.push(s); // no cache to invalidate
  }
}
```

If profiling ever shows `match()` evaluation is measurably hot (unlikely given it's ~8 predicates per compile, and compiles happen once per block-push, not per tick), memoize at that point with a narrower, verified-correct key — but don't carry the machinery pre-emptively.

---

## 1.4 Small dead items (grab-bag)

Each of these is independently small; batching them into the same PR as the above is reasonable since none require design discussion.

| Item | File:line | Why it's dead |
|---|---|---|
| `RuntimeMemory.subscribe()` (global subscription, distinct from per-location `MemoryLocation.subscribe`) | `RuntimeMemory.ts:56`, contract `IRuntimeMemory.ts:59` | `@deprecated`; grep for `.subscribe(` on a `RuntimeMemory` instance (not `MemoryLocation`) returns zero call sites outside the class itself |
| `IdleBlockStrategy.buildBehaviors()` | `IdleBlockStrategy.ts:137` | Method body is `throw new Error('buildBehaviors is deprecated')` — a method that exists only to throw |
| `DialectAnalysis.inheritance` field | `src/core/models/Dialect.ts:29-37` (field), `src/dialects/DialectStack.ts:39-47` (consumer) | `DialectStack.process` only reads `analysis.metrics`; `analysis.inheritance` is never read anywhere |
| `AnalyticsEngine.addStage()` | `src/core/analytics/AnalyticsEngine.ts:34` | `@deprecated` shim for a retired `IAnalyticsStage` interface |
| `TimerMetric` (legacy alias for `DurationMetric`) | `src/runtime/compiler/metrics/TimerMetric.ts:4`, re-exported `core-entry.ts:64` | No production code constructs or type-checks against `TimerMetric` directly |
| `WorkoutTracker.startSpan` / `endSpan` | `src/runtime/tracking/WorkoutTracker.ts:118-125` | Documented no-ops |
| `console.log` on every metric/round record | `WorkoutTracker.ts:17`, `:40` | Hot-path logging left in production code (fires on every `TrackMetricAction`/`TrackRoundAction`, i.e. every rep and every round transition in a live session) |

**Old** (representative example — the throwing method):

```ts
// IdleBlockStrategy.ts
buildBehaviors(): IRuntimeBehavior[] {
  throw new Error('buildBehaviors is deprecated'); // dead code that only throws
}
```

**New**: delete the method entirely; nothing calls it, so there's no call site to redirect.

---

## Verification Appendix

This section documents an independent re-verification of the implementation, performed after the fact against the actual git diff and a live test run — not a re-review of the plan.

### What was checked

Every diffed file was compared line-by-line against this document's "old vs. new" sketches for §1.1–§1.4: the four dead behaviors and their barrel exports, the two vestigial strategies and four dead singletons (with `SessionRootStrategy`/`IdleBlockStrategy` correctly kept as classes), the JIT cache removal, and each of the six small dead items in §1.4 (`RuntimeMemory.subscribe`, `IdleBlockStrategy.buildBehaviors`, `DialectAnalysis.inheritance`, `AnalyticsEngine.addStage`, `TimerMetric`, `WorkoutTracker`'s no-ops and `console.log` calls). Every diff matched the plan exactly, including the incidental stale-comment fixes at `ClearChildrenAction.ts` and `ChildrenStrategy.ts` referencing the deleted classes.

Test and build results were reproduced independently rather than trusted from the implementation report:

- `bun test ./src --preload ./tests/unit-setup.ts` → **2698 pass, 1 fail** (the single failure is `workbenchSessionStore.test.ts`'s `completeWorkout` test, in `playground/src/services/resultRecorder.ts` — confirmed pre-existing by checking that neither file appears anywhere in this changeset's diff).
- `bun x vite build` → succeeds (`✓ built in ~7.3s`), confirming every consumer of a deleted export was migrated — an unresolved import would fail the build, not just typecheck.

### Gap found: the plan's own verification command didn't cover the whole test surface

The implementation report's verification ran `bun test ./src`, which only covers unit tests under `src/`. It does not cover `tests/`, the directory exercised by `bun run test:components` / `bun run test:all` — and two of this document's own deletions had live consumers there that the `./src`-only check couldn't see:

1. **`tests/analytics/processor-split-validation.test.ts`** contained a `describe('4. Legacy addStage() parity with split interfaces', ...)` block that directly exercised `AnalyticsEngine.addStage()` (§1.4) to assert it produced results identical to the split `addRealtimeProcessor`/`addSummaryProcessor` interfaces. Deleting `addStage()` without touching this test left it failing (not erroring — the file loads fine, the assertion inside just now has no `addStage` method to call). **Fixed**: removed the `describe` block and its one `it`, renumbered the file's docblock comment (`4. Legacy IAnalyticsStage shim...` → replaced with a pointer to this cleanup doc), and confirmed the file's other two imports it used (`ISummaryProcessor`, `ProjectionResult`) are still used elsewhere in the file so nothing else needed touching.
2. **`tests/blocks/RoundsBlock.test.ts`, `tests/blocks/AmrapBlock.test.ts`, `tests/blocks/IntervalBlock.test.ts`** each directly imported and instantiated `ReEntryBehavior` and/or `RoundsEndBehavior` (§1.1) via `MockBlock` compositions — the same "unit-level behavior composition" pattern as the six integration-pattern files the original implementation correctly identified and deleted, just living in a sibling directory (`tests/blocks/` vs. `src/runtime/behaviors/__tests__/integration/`) that the `./src`-scoped check never looked at. These failed to even load (`SyntaxError: Export named 'ReEntryBehavior' not found`), which is a harder failure than a plain assertion mismatch — a `bun run test:components` or `bun run test:all` run would have caught it immediately. **Fixed**: deleted all three files, applying the exact same judgment call the original implementation already used and documented for the six integration files — modern coverage exists via `ChildSelectionBehavior.test.ts` (round-exhaustion → `markComplete('rounds-exhausted')`, `:116`) and `AspectComposers.test.ts` (`startRound`/`totalRounds` init) for the behavior-level assertions, and `AmrapLogicStrategy.test.ts` / `IntervalLogicStrategy.test.ts` for the block-composition assertions these three files were approximating with raw `MockBlock` wiring.

After both fixes, `bun run test:components`'s failure set was diffed against a clean pre-cleanup baseline (via `git stash` on this changeset, including the untracked doc files) and found to be **byte-identical** — same 37 failing tests, same 1 pre-existing error, none new, none newly passing. Full command outputs (`2698 pass / 1 fail` for `./src`; `2547 pass / 37 fail / 1 error` for `tests/`, matching baseline exactly) are reproducible from a clean checkout of this branch.

**Takeaway for future tiers:** verify against `bun run test:all` (which runs both `bun run test` and `bun run test:components`), not `bun run test` alone — per this repo's own documented validation requirements in CLAUDE.md/AGENTS.md. A single-suite check can pass cleanly while a sibling suite silently breaks, exactly as happened here.

### Anomaly flagged, not fixed

While diffing `git status`, two files unrelated to this document's scope appeared deleted in the working tree: `.github/workflows/_preview-delivery.yml` and `.github/workflows/dev.yml` (159 lines total). Nothing in this cleanup plan touches CI workflow files, and neither file is referenced anywhere in this document or its siblings. This predates the verification pass documented here — it was already present in the working tree before this appendix's checks began. **This was not investigated or reverted** — it's outside this document's scope and may be intentional work from a different task. Flagging it here so it isn't silently carried into a commit alongside the Tier 1 changes without the user's awareness.

For the `console.log` calls specifically — if some logging is genuinely wanted for tracker events, replace with the project's structured logging path (if one exists) rather than raw `console.log`; otherwise just delete the two lines. This item is independent of whether `WorkoutTracker` itself survives Tier 2 (§2.1 proposes removing it entirely) — fix it now regardless, since it's shipping in production either way until that lands.
