# Tier 3 — Extensibility Realignment

> Part of [Architectural Cleanup](./architectural-cleanup.md). This tier directly targets the stated flexibility goals: **techie users programming core behaviors against specific efforts, dialect-specific analytics, and easy dialect authoring/expansion.** The finding across all four items is the same shape — a mechanism that already exists and already works (hints, strategies, `requiredMetrics`) is either mis-scoped or not exposed, rather than something missing needing to be invented. Every proposal below reuses existing machinery instead of adding a new one.
>
> **Status: ⚠️ Apparently implemented, not independently verified.** [Tier 1](./architectural-cleanup-tier-1-deletions.md) and [Tier 2](./architectural-cleanup-tier-2-consolidations.md) went through the same rigor: independent code audits, real bugs found and fixed, `tsc`/test/build re-verification, written up as verification appendices. **Tier 3 has not had that pass.** A commit landed mid-cleanup (concurrent with the Tier 2 verification work, by a different agent/session or the user directly) whose message claims Tier 3 is complete, and a light inspection of the diff supports that: `src/core/Registry.ts` (new — the §3.4 `Registry<T>` class), `src/dialects/DialectStack.ts` (`dialectRegistry`, §3.4), `src/core/metrics/hints.ts` (`CONSUMED_HINTS` vocabulary, §3.2), `src/effort-registry/types.ts` (`IEffort.hints`, §3.3), `src/runtime/compiler/EffortEnrichmentPass.ts` (the child-recursion bug from §3.3 fixed), `src/core/analytics/IAnalyticsProcessorDescriptor.ts` (`dialects` → `fenceTypes` rename, §3.1), and `core-entry.ts` (all four now exported, §3.4) are all present and closely match this document's proposals — several of the new code comments even cite this document's section numbers directly. Per the item-by-item status notes below, this reflects an inspection of the diff only — no independent audit (line-by-line correctness check, `tsc --noEmit`, full test/build re-verification, dangling-reference sweep) has been run against it, unlike Tiers 1 and 2. Treat "implemented" as provisional until that audit happens.

---

## 3.1 Two unrelated "dialect" concepts collide on one filter field

> ⚠️ **Apparently implemented, unverified.** `IAnalyticsProcessorDescriptor.dialects` was renamed to `fenceTypes`, with a doc comment explicitly noting the fence-vs-sport-dialect distinction and pointing sport-specific filtering at `requiredMetrics` — matching this section's proposal. Not independently checked for every call site that referenced the old `dialects` field name.

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

> ⚠️ **Apparently implemented, unverified.** `src/core/metrics/hints.ts` now defines `CONSUMED_HINTS`/`CONSUMED_HINT_KEYS` with a header comment explaining the consumed-vs-analytics-only split in the same terms as this section, and is exported from `core-entry.ts`. Not independently checked that every strategy that reads a hint string literal was migrated to reference the new constants (vs. still comparing against a raw string).

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

> ⚠️ **Apparently implemented, unverified.** `IEffort` gained an optional `hints?: Record<string, unknown>` field with a doc comment pointing at `CONSUMED_HINTS`, matching this section's proposal. Separately, `EffortEnrichmentPass`'s `walk()` was changed from a non-recursive stub to one that recurses into `block.children` — the exact bug this section flagged. Not independently checked: whether effort hints actually reach the same memory location dialect hints do end-to-end, whether the effort-vs-dialect hint precedence question this section raised as a design decision was addressed one way or the other, and whether `applyEffortEnrichment`'s gate on `analyticsContext?.effortResolver` being set was loosened.

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

> ⚠️ **Apparently implemented, unverified.** A new `src/core/Registry.ts` implements the `Registry<T>` shape this section proposes almost verbatim (`register`/`unregister`/`has`/`get`/`list`, priority-sorted, "last registration wins" on `id` collision — the doc's own recommended default). `dialectRegistry` (in `DialectStack.ts`) and `strategyRegistry` (in `runtimeServices.ts`) both exist, and `core-entry.ts` now exports `Registry`, `dialectRegistry`, `strategyRegistry`, the effort registry classes, and the hint vocabulary. Not independently checked: whether a `summaryProcessorRegistry`/`realtimeProcessorRegistry` equivalent was added for `StandardAnalyticsProfile` (this section's third hardcoded list) or whether that one was left as-is; whether the `dialectRegistry` genuinely reaches production compilation (i.e. `extractStatements`/`lezer-mapper.ts` reads from the registry rather than a separately-hardcoded stack); and whether the reject-vs-override design decision this section flagged for `register()` was made deliberately or defaulted silently.

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
