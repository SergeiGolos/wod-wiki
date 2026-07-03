# How to Build Your Own Sport Dialect

This is a practical, tested walkthrough for adding a custom **sport dialect** to wod-wiki without forking the repository. Every code snippet below was run against the current codebase before being written down — see the verification note at the end if you want to reproduce the checks yourself.

## Wait — which "dialect" is this?

The word "dialect" means two unrelated things in this codebase, and it matters which one you're reading about:

| Term | What it is | Where it's documented |
|---|---|---|
| **Fence dialect** | The markdown code-fence language a block is written in — `wod`, `log`, `plan`, `climb`, etc. Chosen by which fence you type (` ```wod `, ` ```climb `). | [`docs/whiteboard-language/`](./whiteboard-language/README.md) |
| **Sport dialect** (`IDialect`) | A parse-time analyzer that inspects a *parsed statement* (from any fence) and tags it with hints and domain metrics — e.g. recognizing "AMRAP" text, or a climbing grade like `V5`. | **This document.** |

This guide is about the second one. If you were expecting to add a new fence type (like `climb`), that's a different, unrelated mechanism — see the whiteboard-language docs instead. This naming collision is a known rough edge in the codebase (see `docs/architectural-cleanup-tier-3-extensibility.md` §3.1) — it isn't just you being confused.

## What a sport dialect does

A sport dialect looks at each parsed line of a workout (a `ICodeStatement`, already carrying whatever metrics the parser extracted — reps, efforts, durations, etc.) and can:

1. **Rewrite** the statement's metrics in place (rare — only the built-in `UnitsDialect` does this, to fuse `95` + `lb` into one `ResistanceMetric`).
2. **Emit hints** — dot-namespaced strings like `workout.amrap` or `domain.climb` that downstream code can check for.
3. **Emit domain metrics** — your own metric types (e.g. a climbing grade, a swim stroke) that ride along on the statement and later on the output log, for analytics and display.

Dialects run in a fixed order (`UnitsDialect` first, so later dialects see fused units), and every registered dialect gets a chance to look at every statement.

## Step 0 — decide what your hints will actually do

Before writing any code, check `src/core/metrics/hints.ts` and its exported `CONSUMED_HINTS` constant. This is the **complete list** of hint strings that the compiler or the label generator actually react to:

```ts
export const CONSUMED_HINTS = {
  REPEATING_INTERVAL: 'behavior.repeating_interval', // IntervalLogicStrategy: treat as EMOM
  REQUIRED_TIMER:      'behavior.required_timer',    // GenericTimerStrategy: block can't be skipped
  INJECT_REST:         'behavior.inject_rest',        // GenericTimerStrategy: adds rest between intervals
  LABEL_AMRAP:         'workout.amrap',               // LabelComposer: label override
  LABEL_EMOM:          'workout.emom',
  LABEL_TABATA:        'workout.tabata',
  LABEL_FOR_TIME:      'workout.for_time',
} as const;
```

**Any hint you invent that isn't in this list is analytics-only** — it will show up on the output stream and can gate a custom analytics processor (see Step 4), but it will never change how a workout compiles or runs. That's not a bug to work around; it's the actual, documented contract. If you need a *new* compiler-consumed hint (e.g. you want a "tabata dialect" hint to force a specific timer shape that doesn't exist yet), that requires adding it to `CONSUMED_HINTS` and updating the strategy that should consume it — a small change to the library itself, not something a pure consumer-side dialect can do alone today.

## Step 1 — write the dialect

Implement `IDialect` (`src/core/models/Dialect.ts`):

```ts
export interface IDialect {
  id: string;
  name: string;
  transform?(statement: ICodeStatement): void; // optional — most dialects skip this
  analyze(statement: ICodeStatement): DialectAnalysis; // required
}
```

Here's a complete, minimal example — a dialect that recognizes swim workouts:

```ts
// src/dialects/SwimDialect.ts  (or anywhere in your own codebase if consuming as a library)
import { IDialect, DialectAnalysis } from '@/core/models/Dialect';
import { ICodeStatement } from '@/core/models/CodeStatement';
import { MetricType } from '@/core/models/Metric';
import { MetricContainer } from '@/core/models/MetricContainer';
import { hintsToContainer } from '@/core/metrics/hints';

export class SwimDialect implements IDialect {
  id = 'swim';
  name = 'Swim Dialect';

  analyze(statement: ICodeStatement): DialectAnalysis {
    const hints: string[] = [];
    const metrics = MetricContainer.from(statement.metrics as any);

    const isSwim = metrics.some(f =>
      (f.type === MetricType.Action || f.type === MetricType.Effort) &&
      typeof f.value === 'string' &&
      f.value.toUpperCase().includes('SWIM'),
    );

    if (isSwim) {
      hints.push('domain.swim'); // analytics-only — not in CONSUMED_HINTS
    }

    return { metrics: hintsToContainer(hints) };
  }
}
```

`hintsToContainer(hints)` is the standard helper — it wraps your hint strings into `MetricType.Hint` metrics and de-duplicates. If you also want to emit a domain-specific value (not just a hint), add it to the same container directly — see the worked example in Step 3.

**Read an existing dialect for reference before writing your own.** `src/dialects/CrossFitDialect.ts` is a good simple example (keyword matching → hints only). `src/dialects/ClimbDialect.ts` is a good complete example (regex-based extraction, a custom `ClimbMetricType` domain-metric set, and a mix of compiler-relevant and analytics-only hints).

## Step 2 — register it

This is the part that changed with the Tier 3 extensibility work: you no longer need to fork `src/dialects/DialectStack.ts` and edit a hardcoded array. Import the live `dialectRegistry` and call `.register(...)`:

```ts
import { dialectRegistry } from '@/dialects/DialectStack';
import { SwimDialect } from './SwimDialect';

dialectRegistry.register(new SwimDialect());
```

`dialectRegistry` is also re-exported from the package's public entry point (`src/core-entry.ts`, alongside `IDialect`/`DialectAnalysis` for typing your own dialect). Registration is **live** — the underlying parser reads the registry fresh on every parse, so it doesn't matter whether you register before or after the module has already loaded and parsed something else. (This wasn't always true — see the note at the bottom about what was fixed to make this work.)

If you ever need to remove or replace a built-in dialect, `dialectRegistry.unregister('crossfit')` or registering a new dialect with the *same* `id` as a built-in (e.g. `id: 'crossfit'`) both work — the registry is a map keyed by `id`, and registering an existing id replaces it ("last registration wins").

## Step 3 — a complete worked example, with a domain metric

Here's a fuller example showing both an analytics-only hint *and* a domain metric, modeled on `ClimbDialect`'s pattern:

```ts
import { IDialect, DialectAnalysis } from '@/core/models/Dialect';
import { ICodeStatement } from '@/core/models/CodeStatement';
import { IMetric, MetricType } from '@/core/models/Metric';
import { MetricContainer } from '@/core/models/MetricContainer';
import { hintsToContainer } from '@/core/metrics/hints';

// Your own domain metric type — a plain string constant, not a MetricType enum
// member. IMetric.type is typed `MetricType | string`, so this is supported.
export const SwimMetricType = {
  Stroke: 'swim-stroke',
} as const;

const STROKE_KEYWORDS: Record<string, string> = {
  free: 'freestyle', freestyle: 'freestyle',
  breast: 'breaststroke', breaststroke: 'breaststroke',
  back: 'backstroke', backstroke: 'backstroke',
  fly: 'butterfly', butterfly: 'butterfly',
};

export class SwimDialect implements IDialect {
  id = 'swim';
  name = 'Swim Dialect';

  analyze(statement: ICodeStatement): DialectAnalysis {
    const hints: string[] = [];
    const dialectMetrics = MetricContainer.empty('swim-dialect');
    const metrics = MetricContainer.from(statement.metrics as any);
    const text = metrics.toArray()
      .map(m => (typeof m.value === 'string' ? m.value : ''))
      .join(' ')
      .toLowerCase();

    const isSwim = text.includes('swim');
    if (!isSwim) return {};

    hints.push('domain.swim');

    for (const [keyword, stroke] of Object.entries(STROKE_KEYWORDS)) {
      if (text.includes(keyword)) {
        dialectMetrics.add({ type: SwimMetricType.Stroke, value: stroke, origin: 'dialect' } as IMetric);
        break;
      }
    }

    return { metrics: hintsToContainer(hints, dialectMetrics) };
  }
}
```

`hintsToContainer(hints, dialectMetrics)`'s second argument lets you seed the container with your domain metrics *and* append hints onto the same container — this is exactly how `ClimbDialect` combines climbing-grade metrics with `domain.climb`/`behavior.grade_based` hints in one return value.

## Step 4 — dialect-specific analytics (optional)

If you want a custom analytics processor that only activates for your dialect's data, gate it with `requiredMetrics` on your processor's descriptor — **not** by inventing a new hint for the analytics engine to special-case:

```ts
import type { ISummaryProcessor } from '@/core/analytics/ISummaryProcessor';
import { summaryProcessorRegistry } from '@/core/analytics/StandardAnalyticsProfile';
import { SwimMetricType } from './SwimDialect';

export const SwimStrokeBreakdownProcess: ISummaryProcessor = {
  id: 'swim-stroke-breakdown',
  requiredMetrics: [SwimMetricType.Stroke], // only runs when this metric is present
  summarize(outputs) {
    // ... aggregate stroke counts across the workout ...
    return [];
  },
};

summaryProcessorRegistry.register(SwimStrokeBreakdownProcess);
```

`requiredMetrics` accepts your custom domain metric type string directly (it's typed `MetricType | string`, matching `IMetric.type` itself) — you don't need to cast anything. There's a matching `realtimeProcessorRegistry` for per-segment (not just end-of-workout) processors; both are exported from `@/core/analytics/StandardAnalyticsProfile` and from the package's public entry point.

Do **not** use `fenceTypes` for this — that field filters on the markdown fence (`wod`/`log`/`plan`), a completely different, unrelated axis from your sport dialect. See the "which dialect" table at the top of this guide.

## Step 5 — try it out

The fastest way to see your dialect working, without spinning up Storybook or the full runtime, is a small script:

```ts
// try-swim-dialect.ts
import { dialectRegistry } from '@/dialects/DialectStack';
import { createParser } from '@/parser/parserInstance';
import { MetricType } from '@/core/models/Metric';
import { SwimDialect } from './SwimDialect';

dialectRegistry.register(new SwimDialect());

const script = createParser().read('400m Swim');
const hints = script.statements[0].metrics
  .toArray()
  .filter(m => m.type === MetricType.Hint)
  .map(m => m.value);

console.log(hints);
// → [ 'domain.cardio', 'workout.swim', 'behavior.aerobic', 'behavior.distance_based',
//     'behavior.pace_based', 'domain.swim' ]
```

Run it with `bun run try-swim-dialect.ts` from the repo root. A few things to notice when you run your own version:

- **Other dialects still ran too.** `400m Swim` already trips the built-in `CardioDialect` (hence `domain.cardio`, `workout.swim`, etc., appearing alongside your `domain.swim`). Dialects compose — they don't compete for one statement.
- If your dialect's hint isn't showing up, check that your keyword-matching logic actually inspects the right metric type. Efforts/actions land on `MetricType.Effort`/`MetricType.Action`; a bare number is `MetricType.Rep`; a `95lb`-style value is `MetricType.Resistance`. Log `metrics.toArray()` to see what the parser actually produced for your input line before writing matching logic against it.
- Statements that don't match your keyword get an empty `{}` return from `analyze()` — that's correct and expected; you don't need to return an empty `MetricContainer` explicitly.

### Proving a compiler-consumed hint actually changes behavior

If your dialect emits one of the `CONSUMED_HINTS` values (Step 0), you can verify it actually flips a compile-time decision without spinning up a full runtime, by calling a strategy's `match()` directly:

```ts
import { dialectRegistry } from '@/dialects/DialectStack';
import { createParser } from '@/parser/parserInstance';
import { CONSUMED_HINTS, hintsToContainer } from '@/core/metrics/hints';
import { GenericTimerStrategy } from '@/runtime/compiler/strategies/components/GenericTimerStrategy';
import { MetricContainer } from '@/core/models/MetricContainer';
import { MetricType } from '@/core/models/Metric';
import type { IDialect, DialectAnalysis } from '@/core/models/Dialect';
import type { ICodeStatement } from '@/core/models/CodeStatement';

class StrictDialect implements IDialect {
  id = 'strict-demo';
  name = 'Strict Demo';
  analyze(statement: ICodeStatement): DialectAnalysis {
    const metrics = MetricContainer.from(statement.metrics as any);
    const isStrict = metrics.some(f =>
      (f.type === MetricType.Action || f.type === MetricType.Effort) &&
      typeof f.value === 'string' && f.value.toUpperCase().includes('STRICT'));
    return isStrict ? { metrics: hintsToContainer([CONSUMED_HINTS.REQUIRED_TIMER]) } : {};
  }
}

dialectRegistry.register(new StrictDialect());

const script = createParser().read('5:00 STRICT Plank');
const stmt = script.statements[0];

console.log(new GenericTimerStrategy().match([stmt], {} as any)); // → true
```

This is the same pattern `GenericTimerStrategy.test.ts` and the other strategy test files use — see `src/testing/harness/StrategyTestHarness.ts` for a fuller harness (`apply()`, `stubRuntime()`) if you want to inspect the resulting compiled block, not just whether a strategy matches.

## Common mistakes

- **Expecting an analytics-only hint to change compile-time behavior.** It won't. Check `CONSUMED_HINTS` first (Step 0) — if your hint isn't listed, it's metadata, not a lever.
- **Gating an analytics processor on `fenceTypes` instead of `requiredMetrics`.** `fenceTypes` is the `wod`/`log`/`plan` markdown-fence axis, unrelated to sport dialects. See Step 4.
- **Forgetting that dialects run in a fixed order.** `UnitsDialect` runs first so it can fuse `95` + `lb` before your dialect sees the statement. If your dialect needs to react to a fused resistance/distance value (not the raw number + unit-word pair), that's already handled by the time your `analyze()` runs — you don't need to do the fusion yourself.
- **Trying to attach a hint to a specific *effort* (exercise) instead of a workout pattern.** That's a related but different mechanism — `IEffort.hints` on an effort markdown file, not a dialect. As of this writing that mechanism has a known gap (effort hints don't currently reach any strategy — see `docs/architectural-cleanup-tier-3-extensibility.md` §3.3 and the companion proposal doc, `docs/adr/effort-hints-pre-compile-resolution-plan.md`).

## Verification note

Every code snippet in this guide was tested end-to-end against the current codebase (not hand-derived from the source alone): the Step 5 example was run verbatim via `bun run` and produced the exact hint list shown; the compiler-consumed example was run against the real `GenericTimerStrategy.match()` and confirmed to return `true`; the `requiredMetrics` custom-string typing in Step 4 was confirmed with a `tsc --noEmit` probe (and required a small library fix — `IAnalyticsProcessorDescriptor.requiredMetrics` was previously typed `MetricType[]` only, which would have rejected `SwimMetricType.Stroke`; it's now typed `(MetricType | string)[]`, matching `IMetric.type` itself).
