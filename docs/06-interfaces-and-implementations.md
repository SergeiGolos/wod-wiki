# 06 — Interfaces & Implementations (the extensible seams)

Several interfaces in WOD Wiki are **seams**: a small contract with many
interchangeable implementations, where you add capability by adding an implementation
rather than editing existing code. This document defines the **convention** for each
seam (how to write a new implementation and how it gets selected) and gives a complete
**inventory** of what ships today.

> Naming convention across the codebase: a seam interface is `IThing`; concrete
> implementations are `ConcreteThing` (no `I`). Implementations are registered in an
> `index.ts` barrel and/or assembled by a builder/profile.

---

## 6.1 `IRuntimeBehavior` — composable block capabilities

**File:** `src/runtime/contracts/IRuntimeBehavior.ts`
**Implementations:** `src/runtime/behaviors/`

A behavior is one aspect of a block's life (timing, rounds, sound, reporting…). A block
holds an array of behaviors; the runtime calls each behavior's lifecycle hooks.

```ts
interface IRuntimeBehavior {
  onMount(ctx: IBehaviorContext): IRuntimeAction[];   // block became active
  onNext(ctx: IBehaviorContext): IRuntimeAction[];    // child completed / advance
  onUnmount(ctx: IBehaviorContext): IRuntimeAction[]; // block leaving
  onDispose(ctx: IBehaviorContext): void;             // final cleanup
}
```

**Conventions**
- All hooks are **optional in spirit** — implement only what you need (others no-op).
- Behaviors are **constructor-configurable** (e.g. `new CountdownTimerBehavior(durationMs)`).
- Behaviors interact **only through `IBehaviorContext`** — never reach into the block
  directly. Use `ctx.subscribe()` for events, `ctx.emitOutput()` for results,
  `ctx.pushMemory()` for state, `ctx.markComplete()` to finish.
- Hooks **return `IRuntimeAction[]`** rather than mutating the stack directly; the
  runtime executes those actions in the turn loop.

**Inventory** (`src/runtime/behaviors/`)

| Behavior | Aspect |
|----------|--------|
| `CountdownTimerBehavior` | Counts a planned duration down to zero |
| `CountupTimerBehavior` | Counts elapsed time up (AMRAP-style) |
| `SpanTrackingBehavior` | Opens/closes a `TimeSpan` for timing without a visible timer |
| `RoundsEndBehavior` | Advances/loops rounds and signals completion |
| `ChildSelectionBehavior` | Chooses/sequences child blocks |
| `CompletedBlockPopBehavior` | Pops a block once complete |
| `CompletionTimestampBehavior` | Stamps completion time |
| `LeafExitBehavior` / `ExitBehavior` | Exit semantics for leaves / general blocks |
| `ReEntryBehavior` | Handles re-entering a block (e.g. next round) |
| `WaitingToStartInjectorBehavior` | Injects a "waiting to start" gate |
| `ButtonBehavior` | Exposes UI buttons/actions for the block |
| `LabelingBehavior` | Provides the human-readable label |
| `MetricPromotionBehavior` | Promotes/normalizes metrics for display |
| `ReportOutputBehavior` | Emits `OutputStatement`s with runtime metrics |
| `SoundCueBehavior` | Plays audio cues at milestones |

➡ To add one: implement `IRuntimeBehavior`, export from `behaviors/index.ts`, and have
a strategy attach it (next section).

---

## 6.2 `IRuntimeBlockStrategy` — how blocks are compiled

**File:** `src/runtime/contracts/IRuntimeBlockStrategy.ts`
**Implementations:** `src/runtime/compiler/strategies/`

A strategy decides whether it applies to a statement shape and, if so, contributes
behaviors/config to a `BlockBuilder`. The JIT runs all strategies in **priority
order**; multiple strategies compose onto one block.

```ts
interface IRuntimeBlockStrategy {
  priority: number;                                                   // higher runs first
  match(statements: ICodeStatement[], runtime: IScriptRuntime): boolean;
  apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void;
}
```

**Convention — priority bands** (from the contract docblock):

| Band | Priority | Examples |
|------|----------|----------|
| Logic / drivers | 90–100 | Interval, AMRAP |
| Components | 50–80 | Timer, Loop, Group, Rest |
| Enhancements | 20–40 | Sound, Children wiring, Report output |
| Fallback | 0 | Effort leaf |

A higher-priority strategy establishes the block's *driver*; lower ones layer on
*components* and *enhancements*; the fallback guarantees every statement compiles to
*something*.

**Inventory** (`src/runtime/compiler/strategies/`)

| Strategy | Band | Role |
|----------|------|------|
| `AmrapLogicStrategy` | logic | "As many rounds as possible" within a clock |
| `IntervalLogicStrategy` | logic | EMOM / fixed-interval drivers |
| `SessionRootStrategy` | logic | The root session block |
| `WaitingToStartStrategy` | logic | Pre-start gate |
| `GenericTimerStrategy` | component | Attaches countdown/countup timing |
| `GenericLoopStrategy` | component | Round looping |
| `GenericGroupStrategy` | component | Groups/superset wrapping |
| `RestBlockStrategy` | component | Rest intervals |
| `ChildrenStrategy` | enhancement | Wires parent→children execution |
| `ReportOutputStrategy` | enhancement | Adds result reporting |
| `SoundStrategy` | enhancement | Adds audio cues |
| `IdleBlockStrategy` | enhancement | Idle/no-op handling |
| `EffortFallbackStrategy` | fallback | Bare effort leaf (priority 0) |

---

## 6.3 `IRuntimeBlock` — execution units

**File:** `src/runtime/contracts/IRuntimeBlock.ts`
**Implementations:** `src/runtime/blocks/` (plus `RuntimeBlock.ts` base)

**Conventions**
- Blocks **initialize in their constructor** and register resources there (not on
  push).
- Lifecycle is **stack-orchestrated**: `RuntimeStack.pop()` runs unmount → dispose →
  context release → parent.next. Callers no longer manually dispose popped blocks.
- `dispose()`/`unmount()` must be **idempotent** (safe to call more than once) and
  complete within ~50 ms.
- Every block exposes `key` (`BlockKey`), `sourceIds`, and a `blockType` discriminator
  for UI/logging.

**Inventory:** `EffortBlock`, `RestBlock`, `SessionRootBlock`, `WaitingToStartBlock`,
and the generic `RuntimeBlock` base assembled from behaviors.

---

## 6.4 `IDialect` — semantic pattern recognizers

**File:** `src/core/models/Dialect.ts`
**Implementations:** `src/dialects/`

```ts
interface IDialect {
  id: string;
  name: string;
  analyze(statement: ICodeStatement): DialectAnalysis;   // → hints (+ optional metrics)
}
```

**Conventions**
- Dialects are **pure analyzers** — they read a statement and return hints; they do not
  execute anything.
- Hints are **dot-namespaced** strings (`domain.*`, `workout.*`, `behavior.*`) so
  downstream code can match by prefix.
- Injected metrics use `origin: 'dialect'` and a `MetricAction` (`set`/`suppress`/`inherit`).

**Inventory** (`src/dialects/index.ts`)

| Dialect | Recognizes |
|---------|------------|
| `CrossFitDialect` | AMRAP, EMOM, FOR TIME, TABATA |
| `WodDialect` | STRENGTH, METCON, SKILLS, WOD, SUPERSET |
| `CardioDialect` | RUN, ROW, BIKE, SWIM, WALK, distance patterns |
| `YogaDialect` | poses, flows, breathing, meditation |
| `HabitsDialect` | daily habits, streaks, check-offs |
| `ClimbDialect` | climbing grades, send types, attempts |

---

## 6.5 Analytics processors — `IRealtimeProcessor` & `ISummaryProcessor`

**Files:** `src/core/analytics/IRealtimeProcessor.ts`, `ISummaryProcessor.ts`
**Implementations:** `src/core/analytics/`, `src/timeline/analytics/analytics/engines/`

```ts
interface IRealtimeProcessor { id: string; process(output: IOutputStatement): IOutputStatement | void; }
interface ISummaryProcessor  { id: string; summarize(outputs: IOutputStatement[]): ProjectionResult; }
```

**Conventions**
- **Realtime** = enrich one output as it arrives (per-set derived metrics).
- **Summary** = project across all outputs at session end (aggregate metrics).
- Both emit metrics with `origin: 'analyzed'`; they never mutate `parser` metrics.
- Applicability is decided by an **analytics profile** (doc 08), not by the processor
  selecting itself.

**Inventory**

| Realtime (`IRealtimeProcessor`) | Produces |
|---------------------------------|----------|
| `PaceEnrichmentProcess` | pace / speed |
| `PowerEnrichmentProcess` | power / work |
| `TwoPassEffortResolutionProcess` | binds outputs to registry efforts |

| Summary (`ISummaryProcessor`) | Produces |
|-------------------------------|----------|
| `RepProjectionEngine` | total reps |
| `DistanceProjectionEngine` | total distance |
| `VolumeProjectionEngine` | `Volume` (reps × load) |
| `SessionLoadProjectionEngine` | `SessionLoad` (RPE × minutes) |
| `MetMinuteProjectionEngine` | `METScore` / MET-minutes |
| `TISProcessor` | `TIS` (Training Intensity Score) |

---

## 6.6 `IEffortRegistry` — exercise definition lookup

**File:** `src/effort-registry/types.ts`
**Implementations:** `src/effort-registry/`

Supplies `IEffort` records (MET, discipline, intensity tier, aliases) used by analytics
and by editor autocomplete.

**Conventions**
- Read methods return canonical `IEffort`s; fuzzy lookup goes through `EffortResolver`
  (Levenshtein + alias matching in `fuzzyMatch.ts`).
- Sources are layered via the **composite** pattern: bundled data, in-memory user
  edits, and persistent storage are merged behind one registry.

**Inventory**

| Implementation | Backing store |
|----------------|---------------|
| `InMemoryEffortRegistry` | In-process map (tests, defaults) |
| `IndexedDBEffortRegistry` | Persistent (`efforts` object store) |
| `CompositeEffortRegistry` | Merges bundled + in-memory + persistent |

Bundled seed data: `src/effort-registry/data/bundled-efforts.ts`.

---

## 6.7 `IMetricSource` — uniform metric reads

**File:** `src/core/contracts/IMetricSource.ts`
**Implementations:** `CodeStatement` (plan) and `OutputStatement` (reality).

One read interface (`getMetric`, `getDisplayMetrics`, `hasMetric`, `rawMetrics`) so UI
and analytics treat plan nodes and runtime outputs identically. This is the seam that
makes plan-vs-actual overlays trivial.

---

## 6.8 Where seams are assembled

| Seam | Assembled by |
|------|--------------|
| Behaviors → block | `IRuntimeBlockStrategy.apply()` via `BlockBuilder` |
| Strategies → compiler | `JitCompiler` (priority-ordered registry) |
| Dialects → semantics | dialect registry (`src/dialects/index.ts`) |
| Processors → engine | analytics **profile** (`StandardAnalyticsProfile`) → `AnalyticsEngine` |
| Registries → lookup | `CompositeEffortRegistry` |

To extend the system you almost always **add an implementation and register it** at one
of these assembly points — existing implementations stay untouched.
