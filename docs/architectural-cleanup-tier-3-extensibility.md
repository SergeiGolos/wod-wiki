# Tier 3 — Extensibility Realignment

> Part of [Architectural Cleanup](./architectural-cleanup.md). This tier directly targets the stated flexibility goals: **techie users programming core behaviors against specific efforts, dialect-specific analytics, and easy dialect authoring/expansion.** The finding across all four items is the same shape — a mechanism that already exists and already works (hints, strategies, `requiredMetrics`) is either mis-scoped or not exposed, rather than something missing needing to be invented. Every proposal below reuses existing machinery instead of adding a new one.
>
> **Status: ✅ Independently re-verified, with real gaps found and fixed — one confirmed architectural gap left open for a decision.** Same rigor as [Tier 1](./architectural-cleanup-tier-1-deletions.md) and [Tier 2](./architectural-cleanup-tier-2-consolidations.md): independent code audits (two background agents, one per pair of items), real bugs found and fixed directly in source, `tsc`/test/build re-verified end-to-end. See the [Verification Appendix](#verification-appendix) at the end of this document for the full account. Short version: §3.1 and §3.2 were implemented correctly and completely, no changes needed. §3.4 had three real gaps (a registry that was never actually wired into the production parse path, a duplicate strategy list, missing exports) — all three fixed. §3.3 had the type/parsing plumbing in place but its two substantive goals were both broken by an architecture mismatch discovered during the audit — effort hints are written to a memory location nothing reads, so **the feature currently has zero effect on runtime behavior**. That one is not silently fixed; see the appendix for why and what fixing it properly would require.

---

## 3.1 Two unrelated "dialect" concepts collide on one filter field

> ✅ **Verified — fully matches plan.** `IAnalyticsProcessorDescriptor.dialects` was renamed to `fenceTypes`, with a doc comment explicitly noting the fence-vs-sport-dialect distinction and pointing sport-specific filtering at `requiredMetrics`. All 9 built-in processors migrated; `StandardAnalyticsProfile.isApplicable()` reads `fenceTypes`; zero remaining `.dialects`/`dialects:` references anywhere in `src/core/analytics/`. No changes needed.

**What exists today.** The codebase has two independent things both called "dialect":

1. **Parse-time `IDialect`** (`src/core/models/Dialect.ts:31-54`) — CrossFit, Wod, Cardio, Yoga, Habits, Climb, Units. These inspect parsed statements and emit hint/domain metrics. This is "dialect" in the sport/training-style sense — the thing a techie user would want to extend.
2. **`FenceDialect`** (`src/components/Editor/types/section.ts:19`) — a 3-value type, `'wod' | 'log' | 'plan'`, describing the markdown code-fence language a block was written in.

These never intersect in the code — but `IAnalyticsProcessorDescriptor.dialects` (`src/core/analytics/IAnalyticsProcessorDescriptor.ts:18`) is typed `readonly FenceDialect[]`, i.e. **only** the fence axis. Every built-in analytics processor sets `dialects` to some subset of `{'wod','log','plan'}` (e.g. `PaceEnrichmentProcess.ts:18` = `['wod','log']`). `createAnalyticsEngineForBlock.ts:36` wires the engine off `block.dialect`, defaulting to `'wod'` — again, the fence axis.

**Why it's a problem.** "I want climbing-specific analytics" is a completely reasonable ask given a `ClimbDialect` exists and already computes `ClimbMetricType.Grade` and discipline data (`src/dialects/ClimbDialect.ts` and friends) — but there is **no filter field an analytics processor can use to say "only run for Climb-dialect statements."** The only axis available is whether the block came from a `wod`, `log`, or `plan` fence, which has nothing to do with sport. This isn't a missing feature so much as a naming collision that makes the existing feature (processor filtering) unable to reach the thing you actually want to filter on.

### Old vs. new

**Old** — one field name, two unrelated meanings, and the type only allows one of them:

```ts
// IAnalyticsProcessorDescriptor.ts
interface IAnalyticsProcessorDescriptor {
  id: string;
  dialects: readonly FenceDialect[]; // 'wod' | 'log' | 'plan' — CANNOT express "climb"
  requiredMetrics?: readonly MetricType[];
}

// PaceEnrichmentProcess.ts — can say "only wod/log fences", cannot say "only Climb dialect"
export const PaceEnrichmentProcess: IRealtimeProcessor = {
  id: 'pace',
  dialects: ['wod', 'log'],
  process(output) { /* ... */ },
};
```

**New** — don't add a second axis to the same field; rename the fence-scoped field to remove the collision, and let sport-specific filtering ride on the mechanism that already carries dialect information onto statements: metrics and hints (see §3.2). A processor that wants "Climb only" checks for a Climb-emitted metric type or hint, exactly like a compiler strategy already does:

```ts
// IAnalyticsProcessorDescriptor.ts — renamed field removes the ambiguity outright
interface IAnalyticsProcessorDescriptor {
  id: string;
  fenceTypes: readonly FenceDialect[];       // renamed from `dialects` — explicit about what it filters
  requiredMetrics?: readonly MetricType[];   // already exists — this is the real sport-dialect hook
}

// A new Climb-specific analytics processor uses the mechanism that already exists —
// no new field needed
export const ClimbGradeProgressionProcess: ISummaryProcessor = {
  id: 'climb-grade-progression',
  fenceTypes: ['wod', 'log'],
  requiredMetrics: [ClimbMetricType.Grade], // present only on statements ClimbDialect touched
  summarize(outputs) {
    const graded = outputs.filter(o => o.metrics.hasType(ClimbMetricType.Grade));
    // ...
  },
};
```

No processor needs to know *which sport dialect* produced a metric — it only needs to know the metric/hint is present, which `requiredMetrics` (already implemented, already checked in `StandardAnalyticsProfile.isApplicable`, `StandardAnalyticsProfile.ts:60-81`) already expresses. This closes the gap with a rename plus a documentation fix, not new plumbing.

**Design decision required:** confirm no external consumer depends on the `dialects` field name (it isn't exported from `core-entry.ts` today per the Tier 3.4 audit, so this is likely a safe rename).

---

## 3.2 Dialect output is ~90% inert — define the hint vocabulary as the real contract

> ✅ **Verified — fully matches plan.** `src/core/metrics/hints.ts` defines `CONSUMED_HINTS`/`CONSUMED_HINT_KEYS` with a header comment explaining the consumed-vs-analytics-only split, exported from `core-entry.ts`. Exhaustive grep of every compiler-side consumer for all 7 raw hint-key string literals returned zero hits — every strategy and `LabelComposer` reference the named constants, no stragglers. (Hint *producers* — `CrossFitDialect.ts`, `semantic-classifier.ts` — still emit raw string literals rather than importing `CONSUMED_HINTS`; this is outside what this section asked for, which was specifically about consumers, but is a minor drift risk worth a follow-up if the vocabulary ever changes.)

**What exists today.** Of everything the six sport dialects compute, grepping every consumer of hints (`hasHint`/`getHints`) across production code turns up exactly:

- **3 hints actually gate compilation:** `behavior.repeating_interval` (checked by `IntervalLogicStrategy.ts:38`), `behavior.required_timer` and `behavior.inject_rest` (checked by `GenericTimerStrategy.ts:53-54`).
- **4 hints used for display labels only:** `workout.amrap/emom/tabata/for_time` (`LabelComposer.ts:96-99`).
- **Everything else** — CrossFit's `behavior.time_bound`, and *every* sport-specific domain metric (`ClimbMetricType.Grade`, climb discipline, cardio distance/pace domain metrics, yoga/habits metrics) — is emitted and **read by nothing** outside the dialect's own file and the shared `Dialect.ts` model. Confirmed by grepping for `ClimbMetricType|climb-grade|domain.climb|domain.cardio|domain.crossfit` outside `src/dialects/`: zero hits.

**Why it's a problem.** A dialect author writing a new sport dialect today has no way to know, short of grepping the strategy and label-composer source, which of their outputs will ever have an effect. They can emit a perfectly well-formed `DialectAnalysis` and have it silently do nothing. This is the single biggest blocker to "easy dialect authoring" — not the mechanics of writing an `IDialect` (three files, ~90 lines, genuinely low effort per the extension survey), but the fact that there's no documented contract for what the runtime and analytics layers will actually *do* with what you emit.

### Old vs. new

**Old** — the contract is implicit, discoverable only by reading strategy source:

```ts
// A new SwimDialect author has no way to know this hint will do anything
// without reading GenericTimerStrategy.ts and IntervalLogicStrategy.ts by hand
export class SwimDialect implements IDialect {
  id = 'swim';
  analyze(statement: ICodeStatement): DialectAnalysis {
    const hints = new Map<string, unknown>();
    if (looksLikeIntervalSet(statement)) {
      hints.set('behavior.repeating_interval', true); // works — but author had to know this string
    }
    hints.set('swim.stroke', detectStroke(statement));  // silently inert — nothing reads 'swim.*'
    return { metrics: hintsToContainer(hints) };
  }
}
```

**New** — no code change is required to *fix* this (the mechanism — hints checked by strategies — already works correctly); the fix is making the vocabulary a first-class, documented, and ideally type-checked contract:

```ts
// src/runtime/compiler/hints.ts (new — the canonical, exported vocabulary)
/**
 * Hints consumed by the compiler and label composer. A dialect that sets one of
 * these keys is guaranteed the listed effect. Any other hint key is currently
 * inert (analytics-only, surfaced as a generic tag) — see docs/whiteboard-language
 * for the dialect-authoring guide.
 */
export const CONSUMED_HINTS = {
  /** IntervalLogicStrategy: treats the block as an EMOM-style repeating interval. */
  REPEATING_INTERVAL: 'behavior.repeating_interval',
  /** GenericTimerStrategy: block cannot be skipped past until timer:complete fires. */
  REQUIRED_TIMER: 'behavior.required_timer',
  /** GenericTimerStrategy: injects a rest block between repeating intervals. */
  INJECT_REST: 'behavior.inject_rest',
  /** LabelComposer: overrides the generated label with a workout-type name. */
  LABEL_AMRAP: 'workout.amrap',
  LABEL_EMOM: 'workout.emom',
  LABEL_TABATA: 'workout.tabata',
  LABEL_FOR_TIME: 'workout.for_time',
} as const;

// SwimDialect now knows exactly what it's opting into, and what it isn't
export class SwimDialect implements IDialect {
  analyze(statement: ICodeStatement): DialectAnalysis {
    const hints = new Map<string, unknown>();
    if (looksLikeIntervalSet(statement)) {
      hints.set(CONSUMED_HINTS.REPEATING_INTERVAL, true); // same string, now discoverable + typo-proof
    }
    // domain metrics for analytics — correctly understood as analytics-only,
    // consumed via requiredMetrics per §3.1, not expected to affect compilation
    return { metrics: hintsToContainer(hints).add(new SwimStrokeMetric(detectStroke(statement))) };
  }
}
```

This also surfaces a decision point rather than leaving it implicit: CrossFit's unconsumed `behavior.time_bound` hint and the sport-domain metrics aren't *bugs* — they're legitimately analytics-only signals. The fix isn't "wire everything into a strategy," it's "make it obvious, in one file, which category (compiler-consumed vs. analytics-only) every hint falls into," so a new dialect author can self-serve the answer instead of grepping strategy source.

---

## 3.3 Effort → behavior binding: reuse hints, don't invent a new binding system

> ❌ **Verified — does not achieve its goal, despite the plumbing being in place.** `IEffort.hints`, markdown parsing (both inline and block YAML forms), and `IRuntimeBlock.mergeHints()` all exist and are wired together. But tracing the actual read/write paths end-to-end during the audit found the feature is currently a **no-op**: `mergeHints` writes hint metrics into `metric:hint` block memory, and nothing — not `hasHint`, not `getHints`, not any strategy — ever reads from that location. The root cause is a timing mismatch this section didn't originally anticipate: dialect hints are attached to the *statement* before `JitCompiler.compile()` runs, so strategies see them during `match()`/`apply()`; effort hints are attached to the *block* by `EffortEnrichmentPass`, which runs *after* `compile()` returns — by which point every strategy has already decided. See the [Verification Appendix](#verification-appendix) for the full trace and what fixing it properly would require. Separately: the `walk()` recursion "fix" targets a `block.children` property no `IRuntimeBlock` implementation has (dead code, but harmless — see appendix for why coverage isn't actually missing), and a real bug was found and fixed in the block-form YAML parser (it would have silently absorbed unrelated frontmatter fields into `hints`).

**What exists today.** There is currently **no path** to attach a runtime behavior to a specific effort (exercise). The effort registry (`src/effort-registry/types.ts:42-63`, `IEffort`) carries only analytics attributes — `baseAttributes: { met, discipline, disciplineFactor, intensityTier }` — and a `derivation` chain for numeric variants. No strategy or behavior anywhere keys off effort `slug` (confirmed by grep: zero hits for `slug` in `src/runtime/behaviors` or `src/runtime/compiler/strategies`).

The one place effort data *does* reach a compiled block is `EffortEnrichmentPass` (`src/runtime/compiler/EffortEnrichmentPass.ts:35`), called from `CompileAndPushBlockAction.do()` (`CompileAndPushBlockAction.ts:39-43`) — but only when `runtime.analyticsContext?.effortResolver` is set, and its tree walk (`EffortEnrichmentPass.ts:39-51`) **only visits the root block**, so any block with children never gets enriched. It attaches exactly one metric type (`effort-data`) into a private memory tag, consumed only by analytics.

**Why it's a problem.** "Program a behavior against a specific effort" is currently impossible without hand-writing a bespoke `IRuntimeBlockStrategy` that inspects the compiled effort label string. That's a much higher bar than the dialect-authoring bar (§3.2), and it doesn't compose with dialects at all — an effort-level customization and a dialect-level customization currently have zero shared vocabulary.

### Old vs. new

**Old** — efforts carry only numeric attributes; there is no hook for behavior:

```ts
// effort-registry/types.ts
interface IEffort {
  slug: string;
  label: string;
  aliases: string[];
  baseAttributes: { met: number; discipline: string; disciplineFactor: number; intensityTier: string };
  registrySource: 'bundled' | 'user' | 'synthetic-unresolved';
  derivation?: { parentSlug: string; coefficients: Record<string, number>; hardOverrides?: Record<string, unknown> };
  body?: string;
  // no field for behavior, no field for hints
}

// EffortEnrichmentPass.ts — only enriches the root block; children are never visited
class EffortEnrichmentPass {
  apply(rootBlock: IRuntimeBlock, runtime: IScriptRuntime) {
    this.walk(rootBlock, runtime); // does not recurse — despite the name, no children are walked
  }
  private walk(block: IRuntimeBlock, runtime: IScriptRuntime) {
    if (block.blockType === 'effort' || block.blockType === 'exercise') {
      const effortData = runtime.analyticsContext?.effortResolver?.resolveEffort(block.label);
      if (effortData) block.pushMemory(new MemoryLocation('metric:tracked', [effortData]));
    }
    // MISSING: no recursion into block.children — a stub
  }
}
```

**New** — extend `IEffort` with a `hints` field, reusing exactly the vocabulary and consumption mechanism dialects already use (§3.2), and fix the two verified bugs on the way:

```ts
// effort-registry/types.ts — one new optional field, same shape as dialect hints
interface IEffort {
  slug: string;
  label: string;
  aliases: string[];
  baseAttributes: { met: number; discipline: string; disciplineFactor: number; intensityTier: string };
  /**
   * Compiler hints attached to any block resolved to this effort. Consumed by
   * strategies exactly like dialect-emitted hints — see src/runtime/compiler/hints.ts.
   */
  hints?: Record<string, unknown>;
  registrySource: 'bundled' | 'user' | 'synthetic-unresolved';
  derivation?: { /* unchanged */ };
  body?: string;
}
```

```yaml
# markdown/efforts/gymnastics/muscle-up.md (sketch — authored the same way efforts already are)
---
slug: muscle-up
label: Muscle-Up
baseAttributes: { met: 8.0, discipline: gymnastics, disciplineFactor: 1.2, intensityTier: high }
hints:
  behavior.required_timer: false   # e.g.: never force a required rest after this movement
  form.spotter_recommended: true   # analytics-only hint, same "declared but not all consumed" model as dialects
---
```

```ts
// EffortEnrichmentPass.ts — fixed to recurse, and to attach hints (not just analytics metrics)
class EffortEnrichmentPass {
  apply(rootBlock: IRuntimeBlock, runtime: IScriptRuntime) {
    this.walk(rootBlock, runtime); // now actually recurses
  }
  private walk(block: IRuntimeBlock, runtime: IScriptRuntime) {
    if (block.blockType === 'effort' || block.blockType === 'exercise') {
      const effort = runtime.effortRegistry?.resolve(block.label); // no longer gated on analyticsContext alone
      if (effort) {
        if (effort.hints) block.mergeHints(effort.hints);          // new: same consumption path as dialect hints
        block.pushMemory(new MemoryLocation('metric:tracked', [toEffortDataMetric(effort)])); // unchanged
      }
    }
    for (const child of block.children) this.walk(child, runtime); // FIXED: was previously a no-op stub
  }
}
```

Because effort hints land in the same place dialect hints do, **no strategy needs to change** — `GenericTimerStrategy`, `IntervalLogicStrategy`, and any future strategy already read hints off the compiled statement/block regardless of whether a dialect or an effort put them there. This is the core simplification: one binding mechanism (hints), two authoring surfaces (dialect files, effort markdown files) that both feed it.

**Design decision required:** whether effort hints merge onto the block *before* or *after* dialect hints when both are present for the same statement (e.g. a CrossFit-dialect AMRAP containing an effort with its own `required_timer` hint) — recommend effort hints as the more specific signal, so they override dialect hints on conflict, consistent with the existing origin-precedence principle (more specific / more local wins).

---

## 3.4 One registration story, exported to consumers

> ✅ **Verified, with three real gaps found and fixed.** `src/core/Registry.ts` implements the `Registry<T>` shape this section proposes almost verbatim, and is solid as written. But the audit found the three consumer registries in three different states of "actually wired in," and fixed all three: **(1)** `dialectRegistry` existed and was exported, but the production `dialectStack` singleton was a one-time array *snapshot* taken at module load — any consumer `dialectRegistry.register(...)` call had zero effect on real parsing, the exact scenario this section wanted to enable. Fixed by making `DialectStack` registry-aware so it re-reads live on every `process()` call. **(2)** `strategyRegistry` was correctly live-wired into `createCompiler()`, but the legacy `PRODUCTION_STRATEGIES` export was a second, independently-constructed array of strategy instances — not an alias — so anything importing it directly (three real consumers did) got objects disconnected from `strategyRegistry.register()`/`unregister()`. Fixed by deriving it from `strategyRegistry.list()`. **(3)** `realtimeProcessorRegistry`/`summaryProcessorRegistry` existed and were correctly live-wired inside `StandardAnalyticsProfile`, but neither was exported from `core-entry.ts` — the module's own doc comment showed `import { summaryProcessorRegistry } from 'wod-wiki/core'` as the intended usage, and that import would have failed. Fixed by adding the export. See the [Verification Appendix](#verification-appendix) for the full trace of each.

**What exists today.** Three separate hardcoded lists gate every extension point in the system:

- `createDialectStack()` — `src/dialects/DialectStack.ts:73-90` — a literal array of dialect instances, `UnitsDialect` first, then six sport dialects, then `...overrides`.
- `PRODUCTION_STRATEGIES` — `src/runtime/services/runtimeServices.ts:24-41` — a literal array of strategy instances, order-dependent (§2.3).
- `StandardAnalyticsProfile`'s processor arrays — `src/core/analytics/StandardAnalyticsProfile.ts:22-33,49-52` — literal `allRealtime`/`allSummary` arrays.

Only the strategies list has a genuine runtime registration method — `JitCompiler.registerStrategy()` — and it *is* exported from the library (`JitCompiler`, `IRuntimeBlockStrategy` in `core-entry.ts:27,38,61`). But `createDialectStack(overrides)` accepts a custom array as a parameter, and nothing in production ever calls it with one — `src/parser/lezer-mapper.ts:29` calls the singleton `dialectStack.processAll(...)`, which was built with zero overrides. The `overrides` parameter and the comment describing a "personal-overrides dialect / CONTEXT.md" story (`DialectStack.ts:86-88`) are **unreachable in production** as written. `IDialect`, everything in `src/effort-registry/`, and every `core/analytics/*` interface (`AnalyticsEngine`, `IAnalyticsProfile`, processor interfaces) are **not exported** from any of `core-entry.ts` / `index.ts` / `clock-entry.ts` / `editor-entry.ts` — confirmed by grep.

**Why it's a problem.** This is the actual root blocker for "flexible and customizable, techie users can extend it": right now, only strategies are consumer-reachable. Adding a dialect, an effort behavior, or an analytics processor requires editing the library's own source files, not importing the library and registering something — which contradicts a design that's otherwise built around composable, priority-ordered registration (strategies already prove the pattern works).

### Old vs. new

**Old** — three different shapes for "register an extension," one of them (dialects) has a documented-but-dead injection point, and none but strategies are exported:

```ts
// DialectStack.ts — has a parameter for overrides, but the production singleton ignores it
export function createDialectStack(overrides: IDialect[] = []): DialectStack {
  return new DialectStack([
    new UnitsDialect(),
    new CrossFitDialect(), new WodDialect(), new CardioDialect(),
    new YogaDialect(), new HabitsDialect(), new ClimbDialect(),
    ...overrides,
  ]);
}
export const dialectStack = createDialectStack(); // called with NO overrides — the only instance ever used

// lezer-mapper.ts
dialectStack.processAll(statements); // always the zero-overrides singleton; no injection point exists here

// runtimeServices.ts — a flat array, no registration API at all for a consumer
const PRODUCTION_STRATEGIES: IRuntimeBlockStrategy[] = [ /* ... */ ];
export function createCompiler(): IJitCompiler {
  const compiler = new JitCompiler();
  PRODUCTION_STRATEGIES.forEach(s => compiler.registerStrategy(s)); // works, but not consumer-facing
  return compiler;
}

// StandardAnalyticsProfile.ts — same flat-array shape, also no registration API
const allRealtime: IRealtimeProcessor[] = [ PaceEnrichmentProcess, PowerEnrichmentProcess ];
const allSummary: ISummaryProcessor[] = [ RepEngine, DistanceEngine, VolumeEngine, SessionLoadProjectionEngine, MetMinuteProjectionEngine, TISProcessor ];
```

```ts
// core-entry.ts — confirmed: no dialect/effort/analytics exports exist today
export { JitCompiler } from './runtime/compiler/JitCompiler';
export type { IRuntimeBlockStrategy } from './runtime/contracts/IRuntimeBlockStrategy';
export * from './runtime/compiler/strategies'; // strategies: yes
// (nothing from src/dialects, src/effort-registry, or src/core/analytics)
```

**New** — one shape, `Registry<T>`, used consistently for dialects, strategies, and analytics processors, each pre-populated with the current defaults and open to consumer additions, all exported:

```ts
// src/core/Registry.ts (new, small, shared shape)
export class Registry<T extends { id: string; priority?: number }> {
  private items = new Map<string, T>();
  constructor(defaults: T[]) { defaults.forEach(d => this.items.set(d.id, d)); }
  register(item: T): void { this.items.set(item.id, item); } // add or override by id
  unregister(id: string): void { this.items.delete(id); }
  list(): T[] { return [...this.items.values()].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)); }
}

// src/dialects/DialectStack.ts — same defaults, now genuinely extensible
export const dialectRegistry = new Registry<IDialect>([
  new UnitsDialect(), new CrossFitDialect(), new WodDialect(), new CardioDialect(),
  new YogaDialect(), new HabitsDialect(), new ClimbDialect(),
]);
export function processAll(statements: ICodeStatement[]): ICodeStatement[] {
  return dialectRegistry.list().reduce((stmts, d) => applyDialect(d, stmts), statements);
}

// src/runtime/services/runtimeServices.ts — same defaults, same Registry shape
export const strategyRegistry = new Registry<IRuntimeBlockStrategy>([
  amrapLogicStrategy, intervalLogicStrategy, genericTimerStrategy, genericLoopStrategy,
  genericGroupStrategy, childrenStrategy, soundStrategy, reportOutputStrategy, effortFallbackStrategy,
]);
export function createCompiler(): IJitCompiler {
  const compiler = new JitCompiler();
  strategyRegistry.list().forEach(s => compiler.registerStrategy(s));
  return compiler;
}

// src/core/analytics/StandardAnalyticsProfile.ts — same defaults, same Registry shape
export const realtimeProcessorRegistry = new Registry<IRealtimeProcessor>([PaceEnrichmentProcess, PowerEnrichmentProcess]);
export const summaryProcessorRegistry = new Registry<ISummaryProcessor>([
  RepEngine, DistanceEngine, VolumeEngine, SessionLoadProjectionEngine, MetMinuteProjectionEngine, TISProcessor,
]);
```

```ts
// core-entry.ts — the actual unlock: export the registries alongside the types
export { dialectRegistry } from './dialects/DialectStack';
export type { IDialect, DialectAnalysis } from './core/models/Dialect';

export { strategyRegistry } from './runtime/services/runtimeServices'; // JitCompiler.registerStrategy already exported

export { realtimeProcessorRegistry, summaryProcessorRegistry } from './core/analytics/StandardAnalyticsProfile';
export type { IRealtimeProcessor, ISummaryProcessor, IAnalyticsProcessorDescriptor } from './core/analytics';

export { effortRegistry } from './effort-registry'; // IEffortRegistry.upsert already exists; just wasn't exported
```

```ts
// Consumer code — now genuinely possible without editing library source
import { dialectRegistry, strategyRegistry, summaryProcessorRegistry } from 'wod-wiki/core';

dialectRegistry.register(new SwimDialect());
strategyRegistry.register(new SwimPacingStrategy());       // priority-ordered alongside the built-ins
summaryProcessorRegistry.register(SwimSplitAnalysisProcess); // requiredMetrics: [SwimMetricType.SplitTime]
```

**Design decision required:** whether `register()` should reject a duplicate `id` (safer, forces explicit intent to override) or silently replace (simpler, matches "last registration wins" already used for dialect metric merges per `DialectStack.ts:22-25`). Recommend reject-by-default with an explicit `{ override: true }` option, since silent replacement of a built-in dialect or strategy by an id collision is the more dangerous failure mode for a public extension API.

This item is the prerequisite for §3.2 and §3.3 to matter in practice — a documented hint vocabulary and an effort-hints field are only genuinely "easy to extend" once a consumer can register a new dialect or effort behavior without forking the repository.

---

## Verification Appendix

This section documents an independent re-verification of the implementation, performed against the actual source (not the implementation's self-report) via two focused code audits, followed by direct fixes and re-verification — the same rigor Tiers 1 and 2 got.

### What was checked

Two background audits covered all four items: §3.1 (fenceTypes rename) + §3.2 (hint vocabulary) in one pass; §3.3 (effort hints) + §3.4 (registries) in a second, larger pass given the greater surface area. Both traced actual read/write paths through the code rather than just checking that named symbols exist. Test and build results were reproduced independently before and after fixes:

- `bun test ./src --preload ./tests/unit-setup.ts` → 2689 pass / 1 fail before this session's fixes, 2683 pass / 1 fail after (the drop is expected — one over-specific test with brittle fixed-index assertions was replaced with fewer, more robust assertions; see §3.4 below). The single failure throughout is the pre-existing `workbenchSessionStore` test, unrelated to this work.
- Full `tests/` suite → diffed byte-for-byte before and after fixes: **identical failure set**, 37 pre-existing failures / 1 pre-existing error, zero new, zero fixed-by-accident.
- `bun x vite build` → succeeds throughout.
- `tsc --noEmit` was run explicitly this time (per the lesson recorded in the Tier 2 appendix), and used to track down one bug (see §3.4/IRuntimeBlock below) that neither the test suites nor the bundler would have caught.

### §3.1 and §3.2: fully verified, no changes needed

Both audits confirmed complete, correct implementations — every consumer migrated, zero stragglers, zero dead references. No fixes were necessary for either item. See the per-item notes above for specifics.

### §3.4, gap 1: `dialectRegistry` was decorative for the actual parse pipeline

**What was found.** `src/dialects/DialectStack.ts` had `export const dialectStack: DialectStack = new DialectStack(dialectRegistry.list());` — `dialectRegistry.list()` is evaluated **once**, at module load, producing a frozen array. `DialectStack` stored that array in a private field and never looked at the registry again. `src/parser/lezer-mapper.ts` — the actual production parse path — calls `dialectStack.processAll(statements)`, i.e. the frozen snapshot. Since `dialectRegistry` and `dialectStack` are defined in the same module and `dialectStack` is constructed immediately after `dialectRegistry`, there was no realistic window in which an external consumer could call `dialectRegistry.register(...)` before the snapshot was already taken — the registry's own module evaluates fully before any importer gets a reference to call `.register()` on. The doc's own comment even claimed "any consumer `register()` call made before the first parse is honored," which does not hold in practice.

**Fix.** Changed `DialectStack`'s constructor to accept either a frozen array (preserves the `createDialectStack(overrides)` test/fixture path unchanged) or a live `Registry<IDialect>` reference. When registry-backed, `process()`, `processAll()`, and the `.list` getter all call `registry.list()` fresh on every invocation. The production singleton is now `export const dialectStack: DialectStack = new DialectStack(dialectRegistry);` — registry-backed, genuinely live.

**Verified the fix works**, not just compiles: wrote a standalone script that reads `dialectStack.list.length` (7), registers a new probe dialect via `dialectRegistry.register(...)` *after* both modules are fully loaded, and re-reads `dialectStack.list.length` (8, including the probe by id). Also ran the existing `src/dialects/__tests__/DialectStack.test.ts` (14/14 pass) to confirm the `instanceof DialectStack` and `.list` contract that test depends on still holds.

### §3.4, gap 2: `PRODUCTION_STRATEGIES` was a genuine duplicate, not an alias

**What was found.** `PRODUCTION_STRATEGIES` re-invoked `new AmrapLogicStrategy()`, `new IntervalLogicStrategy()`, etc. — a **second, independent set of object instances**, disconnected from the ones inside `strategyRegistry`. `createCompiler()` (the recommended, documented entry point) was already correctly reading `strategyRegistry.list()` live — that part worked. But `PRODUCTION_STRATEGIES` was still exported from `core-entry.ts`-adjacent barrels (`src/testing/index.ts`, `src/testing/compiler/index.ts`, `src/hooks/useRuntimeFactory.ts`) and asserted against directly in `runtimeServices.test.ts` as if it were authoritative — any of those consumers would silently miss a `strategyRegistry.register()`/`unregister()` call.

**Fix.** Changed `PRODUCTION_STRATEGIES` to `strategyRegistry.list()` — same instances, no duplicate construction. This changes its element order (from raw insertion order to `Registry.list()`'s priority-sorted order — confirmed by direct comparison that `ChildrenStrategy`, all priority 50, moves from index 7 to index 5 once sorted, since two lower-priority strategies it was previously listed after now sort behind it). The old test asserted fixed indices (`PRODUCTION_STRATEGIES[7]` must be `ChildrenStrategy`), which would have broken under the reordering. Rewrote the test to check presence-and-uniqueness-per-type, descending-priority ordering, and object identity with `strategyRegistry.list()` — more robust than fixed indices and won't need updating again if a priority value changes.

### §3.4, gap 3: processor registries existed but weren't exported

**What was found.** `realtimeProcessorRegistry` and `summaryProcessorRegistry` in `StandardAnalyticsProfile.ts` were correctly implemented and correctly live-wired into `StandardAnalyticsProfile.build()`. But neither was re-exported from `core-entry.ts` — only the *type* exports (`IRealtimeProcessor`, `ISummaryProcessor`, `IAnalyticsProcessorDescriptor`) had made it in. The module's own doc comment (lines 27-28) shows `import { summaryProcessorRegistry } from 'wod-wiki/core'` as the documented usage pattern for this exact file — that import would have failed for any real consumer.

**Fix.** Added `export { realtimeProcessorRegistry, summaryProcessorRegistry } from './core/analytics/StandardAnalyticsProfile';` to `core-entry.ts`. Confirmed via `tsc --noEmit` that the export resolves without error.

### §3.3: a confirmed doc-comment syntax bug (found via `tsc`, not a functional regression)

While reading `IRuntimeBlock.ts`'s new `mergeHints` doc comment, the JSDoc block immediately above it — for the pre-existing `pushMemory` method — was missing its closing `*/`, so the block comment ran on and swallowed the `pushMemory(location: IMemoryLocation): void;` declaration itself into the comment, along with the (correctly closed) `mergeHints` doc block that followed. Verified this really does swallow the declaration with an isolated repro reproducing the identical pattern (`bun x tsc` confirmed `Property 'bar' does not exist on type 'ProbeFoo'` for a hand-built version of the same shape). It did **not** cause a compile error in the real file only because `IRuntimeBlock extends IBlockRef`, and `IBlockRef` *also* declares `pushMemory` correctly — the swallowed redeclaration on `IRuntimeBlock` was redundant, so its loss was silently masked by inheritance. Still fixed (closed the comment, and rewrote the `mergeHints` doc to accurately describe the gap below rather than the false "same mechanism as dialect hints" claim) since a broken doc comment misleads IDE hover-tooltips regardless of whether it causes a type error.

### §3.3: the dead recursion in `EffortEnrichmentPass.walk()` — confirmed harmless, but confirmed dead

**What was found.** `walk()` cast the block to access a `children` field and recursed into it — but no `IRuntimeBlock` implementation anywhere in the codebase has a `children` field. Traced why: `JitCompiler.compile()` returns exactly **one** block per call; the architecture is lazy and per-round (see `docs/parser-compiler-runtime-metrics.md`) — a parent's children are compiled and pushed *later*, via their own separate `CompileAndPushBlockAction`, not eagerly as a pre-built tree under the parent. Confirmed `CompileAndPushBlockAction.do()` calls `applyEffortEnrichment(compiledBlock, ...)` for **every** compiled block, unconditionally — meaning every real exercise block already receives its own enrichment call when it is individually compiled, regardless of whether `walk()` recurses. **This means the original diagnosis in this document's §3.3 — "only the root block is ever enriched" — was itself incorrect**, based on an earlier, shallower exploration that didn't trace the lazy per-block compile flow far enough. The recursion "fix" solves a coverage problem that didn't actually exist; it's dead code (the cast target is always `undefined` in production, so the loop body never runs), not a functional regression.

**Fix.** Simplified `applyEffortEnrichment` to a single, non-recursive call — removed the `walk()` wrapper, the `visited` guard (pointless without real recursion), and the misleading cast. Rewrote both the function-level and module-level doc comments to explain the actual lazy-compile architecture and correct the record on why no recursion is needed.

### §3.3: a real bug, found and fixed — block-form YAML `hints:` parsing had no boundary check

**What was found.** `parseKeyValues()` in `src/repositories/effort-markdown.ts` parses `hints:` in two forms: inline (`hints: { k: v }`) and multi-line YAML block (`hints:\n  k: v`). The block-mode branch set `inBlock = true` and then absorbed every subsequent line matching a `key: value` pattern until it saw a literal `}` — which never appears in block form. Unlike the adjacent `parseStringArray()` function (which has an explicit "stop at the next top-level key" check), this branch had no equivalent guard, so if `hints:` wasn't the last field in the frontmatter, every subsequent field that also happened to look like `key: value` (nearly all of them) would be silently absorbed into the `hints` object. Moot in the current bundled data only because no shipped markdown file under `markdown/efforts/` actually uses block-form `hints:` yet, and there was no test coverage for this parser at all.

**Fix.** Added a boundary check: when in block mode, a non-indented line (checked against the original `line`, not the already-left-trimmed `trimmed` — trimming would make the check always pass) ends the block instead of being silently skipped. **Verified the bug and the fix directly**: extracted the exact pre-fix function into an isolated script and confirmed it leaked `updatedAt: 2024-01-01T00:00:00Z` (and even an unrelated `body` field) into the parsed `hints` object when `hints:` wasn't the last frontmatter key; re-ran the same script against the fixed function and confirmed only the two intended hint keys were captured. (Testing had to happen via an extracted standalone script rather than through the module's own test suite, because `effort-markdown.ts` uses `import.meta.glob` — a Vite-only API — and is globally replaced by a fixture mock in `tests/unit-setup.ts`/`tests/setup.ts`; writing a real regression test for this parser would need either a dedicated Vite-powered test config or refactoring the parsing functions into a Vite-independent module. Also widened `parseEffortFile` from module-private to exported, so a future test can reach it directly once that harness question is resolved.)

### §3.3: the confirmed, NOT fixed, architectural gap — effort hints do not reach strategies

This is the one item in this entire cleanup (Tiers 1–3) that was found broken and **deliberately left unfixed**, because fixing it correctly is a design decision, not a bug fix.

**The gap.** `IEffort.hints` values are written by `EffortEnrichmentPass` via `block.mergeHints(...)` into a `metric:hint` memory location — but that write happens on a **compiled block**, strictly after `JitCompiler.compile()` has already returned (confirmed: `CompileAndPushBlockAction.do()` calls `compile()`, then `applyEffortEnrichment()`, in that order). Meanwhile, every consumer of hints — `IntervalLogicStrategy`, `GenericTimerStrategy`, `LabelComposer` — calls `hasHint()`/`getHints()` on **statement** metrics, during strategy `match()`/`apply()`, which is the mechanism `JitCompiler.compile()` runs internally. By the time an effort hint could theoretically be read, every strategy decision it might have influenced has already been made. A repo-wide grep for `'metric:hint'` (the tag `mergeHints` writes to) found exactly two hits, both inside `RuntimeBlock.ts` — the writer. **Nothing reads it.** This means `IEffort.hints` currently has **zero effect on runtime behavior** — a technie user authoring `hints: { behavior.required_timer: false }` in an effort markdown file today gets no error, no warning, and no effect.

**Why this wasn't silently fixed.** Dialect hints work because `DialectStack.processAll(statements)` runs *before* `JitCompiler.compile(statements, ...)` — hints land on the statement in time. Making effort hints work the same way means moving effort resolution to run at the same pre-compile, statement-level stage as dialect processing — a different insertion point in the pipeline than where `EffortEnrichmentPass` currently runs, and a different data shape to resolve against (statements don't carry a `blockType`/`label` the way compiled blocks do — `tryEnrichBlock`'s current effort-identification heuristic would need to be re-derived from the statement's `Effort` metric instead). This is a real design decision about *where* effort resolution belongs in the compile pipeline, not a one-line fix, and is exactly the kind of change this cleanup's own precedent (e.g. Tier 2's flagged `OutputStatementType` literal) treats as "flag for the user's judgment" rather than "silently redesign."

**What was done instead:**
- Confirmed and documented the gap precisely (this appendix, plus doc-comment updates on `IRuntimeBlock.mergeHints` and inline in `EffortEnrichmentPass.tryEnrichBlock` pointing here).
- Left the existing plumbing in place (it's harmless — a well-formed but currently-inert write) rather than ripping it out, since it's a reasonable foundation for whichever fix direction gets chosen.
- Did **not** attempt to move effort resolution into the pre-compile pipeline, since that's new design work beyond "verify and fix what's there."

**Open question for a decision:** two ways forward, not mutually exclusive —
1. **Move effort hint resolution pre-compile.** Add an effort-hint-attachment pass that runs on statements (likely alongside or immediately after `DialectStack.processAll`, before `JitCompiler.compile()`), resolving each statement's effort by its `EffortMetric` and appending hint metrics the same way dialects do. This delivers the feature's original promise (strategies can react to effort-specific hints) but touches the compile pipeline's statement-preparation stage.
2. **Re-scope the feature to analytics-only and say so.** If moving resolution pre-compile is out of scope, keep `mergeHints`/`metric:hint` as-is for potential future analytics consumers (nothing currently reads it for that either, but the door is open), and update `IEffort.hints`'s doc comment and any user-facing effort-authoring documentation to be explicit that hints are analytics-only today, not a way to program compile-time behavior — closing the gap between promise and reality without new pipeline work.
