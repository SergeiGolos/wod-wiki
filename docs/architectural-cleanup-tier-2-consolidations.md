# Tier 2 — Consolidations

> Part of [Architectural Cleanup](./architectural-cleanup.md). Each item here is a case of the same job being done more than one way. The fix is mechanical (no new concepts introduced), but each does involve a small design decision — noted per item — so these carry slightly more risk than Tier 1's pure deletions.
>
> **Status: not started.** [Tier 1](./architectural-cleanup-tier-1-deletions.md) is implemented and verified. One overlap with Tier 1 is called out inline in §2.1 below — Tier 1 already removed `WorkoutTracker`'s no-op span methods and hot-path logging as small dead-code items, ahead of this section's larger proposal to remove the tracker entirely.

---

## 2.1 Three observation channels → two

**What exists today.** Runtime state reaches the UI through three independent, uncoordinated channels:

1. **The `OutputStatement` stream** (`OutputEmitter`, 391 LOC) — the primary channel. Consumed by the review grid, editor panels, history log, and the entire analytics stack.
2. **Memory subscriptions** (`MemoryLocation.subscribe`) — consumed by hooks: `useMemorySubscription.ts:41`, `useTimerElapsed.ts:102`, `useBlockMemory.ts:58,300`, `useNextPreview.ts:54`.
3. **`WorkoutTracker`** (`src/runtime/tracking/WorkoutTracker.ts`, 126 LOC) — a `Map`-based side channel fed by two dedicated actions (`TrackMetricAction.ts`, 22 LOC; `TrackRoundAction.ts`, 30 LOC), dispatched from exactly 3 production call sites (`EffortBlock.ts:197`, `ChildSelectionBehavior.ts:67,316`).

The tracker's entire production consumer base is **one hook feeding one component**: `useWorkoutTracker` → `MetricTrackerCard.tsx:114`, rendered once at `wallclock-panel.tsx:340` (plus a Chromecast mirror and an `AnalyticsEngine` write-back that pushes session totals into it). Every value the tracker carries — current reps, current round — is *also* obtainable from an `OutputStatement` (segment/completion metrics) or directly from block memory (`round` tag, `metric:display` tag).

**Why it's a problem.** Three channels means three things to keep in sync, three places a future bug can hide ("why does the tracker say round 2 but the memory says round 3"), and a whole extra concept (`TrackerUpdate`, two action types, a `Map`-based store) that exists to serve a single card.

### Old vs. new

> **Note:** [Tier 1 §1.4](./architectural-cleanup-tier-1-deletions.md#14-small-dead-items-grab-bag) already deleted `WorkoutTracker`'s no-op `startSpan`/`endSpan` and its two hot-path `console.log` calls, since those were independently dead regardless of whether the class itself survives this consolidation. The "Old" sketch below reflects the class's current (post-Tier-1) state — the remaining shape is unchanged: still a `Map`-based side channel, still fed by two dedicated actions, still duplicating data already available via memory and output.

**Old** — a dedicated write path (actions → tracker) parallel to the two paths that already exist:

```
ChildSelectionBehavior.advanceRound()
  ├─▶ writes RoundState into 'round' memory           (existing path — memory subscription)
  ├─▶ emits a 'segment' OutputStatement on next pop     (existing path — output stream)
  └─▶ dispatches TrackRoundAction(current, total)       (third, parallel path)
                    │
                    ▼
          WorkoutTracker.recordRound()
                    │
                    ▼
          notify(TrackerUpdate) ──▶ useWorkoutTracker() ──▶ MetricTrackerCard
```

```ts
// WorkoutTracker.ts (current state, post-Tier-1)
export class WorkoutTracker implements RuntimeStackTracker {
  private metrics = new Map<string, Map<string, TrackedMetric>>();
  private rounds = new Map<string, RoundState>();

  recordMetric(blockId: string, key: string, value: number, unit?: string) {
    // ... Map bookkeeping ...
    this.notify();
  }
  recordRound(blockId: string, current: number, total: number) {
    // ... Map bookkeeping ...
    this.notify();
  }
  // startSpan/endSpan no-ops removed by Tier 1 — RuntimeStackTracker declares
  // them optional, so their absence here is not a breaking change.
}
```

**New** — `MetricTrackerCard` reads the same two channels every other consumer already uses:

```ts
// MetricTrackerCard.tsx (sketch)
function MetricTrackerCard({ runtime }: Props) {
  const round = useBlockMemory(runtime, 'round');       // existing memory-subscription hook
  const lastSegment = useLatestOutput(runtime, 'segment'); // small new hook, same pattern as useScriptLineResults

  return <Card round={round} reps={lastSegment?.metrics.getFirst(MetricType.Rep)} ... />;
}
```

Delete: `WorkoutTracker.ts`, `TrackMetricAction.ts`, `TrackRoundAction.ts`, `RuntimeStackTracker` contract, `subscribeToTracker` on `IScriptRuntime`, the `AnalyticsEngine` write-back (`AnalyticsEngine.ts:45-48` as of Tier 1's cleanup — this line number shifted down from `:73` when Tier 1 removed `addStage()` from the same file), and the three dispatch call sites — replaced by nothing, since the data is already flowing through memory/output. Update `ChromecastProxyRuntime.ts:222-259`'s mirror to read the same two channels instead of relaying tracker events.

**Design decision required:** confirm `MetricTrackerCard`'s exact fields (reps/round/elapsed) map cleanly onto memory + latest-segment reads with no gaps — this is a one-component audit, not a speculative risk, since the data already exists in both places today.

---

## 2.2 Output emission: ten sites, one confirmed double-fire

**What exists today.** Ten distinct places construct an `OutputStatement`:

| Site | `outputType` |
|---|---|
| `OutputEmitter.emitLoad` | `'load'` |
| `OutputEmitter.emitStackEvent` | `'system'` |
| `OutputEmitter.emitSegmentFromResultMemory` | `'segment'` |
| `OutputEmitter.emitRuntimeEvent` | `'event'` |
| `OutputEmitter.emitCompilerBlock` | `'compiler'` |
| `RuntimeBlock.emitNextSystemOutput` | `'system'` |
| `EmitSystemOutputAction` | `'system'` |
| `BehaviorContext.emitOutput` (generic passthrough) | caller-supplied |
| `ReportOutputBehavior` (5 call sites) | `'segment'`, `'milestone'`, `'completion'` |
| `SoundCueBehavior` (3 call sites) | `'system'` |
| `AnalyticsEngine` | `'analytics'` |

**The confirmed double-fire.** On every block pop: the stack's `pop` event triggers `ScriptRuntime.ts:115` → `emitSegmentFromResultMemory` → a `'segment'` output. Separately, the block's `onUnmount` hook runs `ReportOutputBehavior.onUnmount` (`ReportOutputBehavior.ts:132`) → a `'completion'` output. **Both fire for the same pop, from two different code paths that don't know about each other.** `PopBlockAction.ts:63-65` carries an explicit comment that it suppresses its *own* would-be third output "to avoid duplicate 'completion' entries" — i.e., the team is already manually managing overlap at one of the three sites, which is a sign the boundary is in the wrong place.

Checking who actually reads each type shows the two aren't both pulling weight: `'segment'` is consumed by 8+ downstream sites (review grid, script-line results, timer panel, history log, both realtime analytics processors, the analytics transformer). `'completion'` is consumed by exactly one: `DebugTraceViewer.tsx:29,96`.

**Why it's a problem.** Two emission paths for the same event is the acute case; ten emission sites total for a stream that's supposed to be a single authoritative log is the chronic case. Right now, "does this action produce a logged output" requires checking behaviors, actions, *and* the emitter, rather than one place.

### Old vs. new

**Old** — two independent producers for the same lifecycle event:

```ts
// Path A: OutputEmitter, triggered by the stack's own pop notification
class ScriptRuntime {
  constructor() {
    this.stack.onPop((block) => {
      this.outputEmitter.emitSegmentFromResultMemory(block); // 'segment'
    });
  }
}

// Path B: ReportOutputBehavior, triggered by the block lifecycle directly
class ReportOutputBehavior implements IRuntimeBehavior {
  onUnmount(ctx: IBehaviorContext) {
    const results = computeTimeResults(ctx);
    ctx.emitOutput('completion', results); // fires independently of Path A
  }
}

// Path C: PopBlockAction, aware of the overlap, manually opting out
class PopBlockAction implements IRuntimeAction {
  do(runtime) {
    // ... unmount, pop ...
    // NOTE: deliberately not emitting our own output here — would be a THIRD
    // duplicate on top of A and B. See ReportOutputBehavior / emitSegmentFromResultMemory.
  }
}
```

**New** — one producer, one output per pop, `'completion'` becomes a field on that output rather than a separate emission:

```ts
// ReportOutputBehavior no longer emits directly — it writes results into memory only
class ReportOutputBehavior implements IRuntimeBehavior {
  onUnmount(ctx: IBehaviorContext) {
    const results = computeTimeResults(ctx);
    ctx.writeResultMemory(results); // unchanged — this part already existed
    // no ctx.emitOutput() call here anymore
  }
}

// OutputEmitter.emitSegmentFromResultMemory is the single site that turns a pop
// into a logged statement, now also carrying completionReason so DebugTraceViewer
// loses nothing
class OutputEmitter {
  emitSegmentFromResultMemory(block: IRuntimeBlock) {
    const segment = buildSegment(block); // reads metric:display + metric:result, as today
    segment.completionReason = block.completionReason; // was previously only on 'completion'
    this.add(segment); // one output per pop, always 'segment'
  }
}
```

`DebugTraceViewer` switches from filtering on `outputType === 'completion'` to reading `segment.completionReason` off the same `'segment'` stream everyone else already consumes — it loses no information, it just stops needing its own private output type.

**Design decision required:** confirm no other consumer distinguishes `'milestone'` from `'segment'` in a way that depends on `ReportOutputBehavior` being the emitter of record for both — `ReportOutputBehavior`'s other two output kinds (`'milestone'`, and its own non-final `'segment'` emissions for split-time groups) are unaffected by this change and can stay as direct `emitOutput` calls; only the `'completion'`-on-unmount vs `'segment'`-on-pop duplication is in scope.

**Longer-term follow-up (not required for this consolidation):** funnel all ten sites through `OutputEmitter` exclusively — behaviors call `ctx.emitOutput(...)` (already the case for most), but `OutputEmitter` becomes the only class with a public "create and buffer an OutputStatement" method, so there's one place to answer "what can get logged."

---

## 2.3 Strategy pipeline churn: add → remove → re-add, and reorder-after-the-fact

**What exists today.** For a rounds block that has children (the common case — e.g. `(3) 21-15-9` with a Thrusters/Pullups sub-tree), three strategies mutate the same builder's behavior list in a way that partially undoes each other's work:

1. `GenericLoopStrategy.ts:115` adds `ExitBehavior({ mode: 'immediate', onNext: true })` — correct *only if the block turns out to have no children*.
2. `ChildrenStrategy.ts:52-53` checks `builder.hasBehavior(ExitBehavior)`, removes it, then (`:95`) adds a *different* `ExitBehavior({ mode: 'deferred' })` — because it now knows there are children.
3. `GenericLoopStrategy.ts:106` adds `MetricPromotionBehavior`, but `ChildrenStrategy.ts:107` immediately calls `moveBehaviorLast(MetricPromotionBehavior)` — because promotion must run *after* `ChildSelectionBehavior` advances the round, and `ChildrenStrategy` is what adds `ChildSelectionBehavior`, so the ordering can only be fixed after the fact.

Both `ChildrenStrategy.ts:98-106` and `:52-53` carry comments explaining *why* the undo is necessary — the team already knows this is a workaround, not a design.

Separately, `PRODUCTION_STRATEGIES` in `runtimeServices.ts:26-43` is a flat array where several entries share a priority tier (Logic 90, Components 50, Enhancements 15-50, per `IRuntimeBlockStrategy.ts:7-13`), and `JitCompiler.ts:62`'s sort (line number as of Tier 1's cleanup, which removed the match-cache machinery that previously preceded it) is not guaranteed stable for equal-priority entries — so correctness at equal priority depends on array order, not on anything the type system or a priority number expresses.

**Why it's a problem.** A strategy author has to know that another, later-registered strategy might delete or reorder what they just added — the mutation isn't local to one strategy's `apply()`, it's a property of the whole registered set and its order. That's exactly the kind of implicit coupling that makes "add a new strategy" (the sanctioned extension point, per Tier 3) riskier than it should be.

### Old vs. new

**Old** — decisions are made incrementally by whichever strategy runs first, then corrected by whichever runs later:

```ts
// GenericLoopStrategy.apply()
builder.addBehavior(new ExitBehavior({ mode: 'immediate', onNext: true })); // guess: no children
builder.addBehavior(new MetricPromotionBehavior(repScheme));               // order: whenever this runs

// ChildrenStrategy.apply() — runs later, corrects the guess
if (builder.hasBehavior(ExitBehavior)) builder.removeBehavior(ExitBehavior); // undo
builder.addBehavior(new ChildSelectionBehavior(childGroups, loopConfig));
builder.addBehavior(new ExitBehavior({ mode: 'deferred' }));                 // redo, correctly
builder.moveBehaviorLast(MetricPromotionBehavior); // fix order after the fact
```

**New** — strategies declare *intent* on the builder (a fact, not a behavior instance); `BlockBuilder.build()` resolves the actual exit mode and canonical ordering once, in one place, the same way it already unconditionally adds `CompletionTimestampBehavior` today:

```ts
// GenericLoopStrategy.apply() — declares facts, doesn't guess at exit behavior
builder.setRoundConfig({ totalRounds, repScheme });
builder.declareIntent('exit-on-next-if-leaf'); // "if I end up with no children, exit immediately"
builder.addBehavior(new MetricPromotionBehavior(repScheme)); // no manual reordering needed

// ChildrenStrategy.apply() — declares facts, doesn't remove anything
builder.setChildGroups(childGroups);
builder.declareIntent('exit-deferred-to-children'); // supersedes the leaf intent, declaratively

// BlockBuilder.build() — single place that resolves exit mode + canonical order,
// same spot that already enforces the CompletionTimestampBehavior invariant
build(): RuntimeBlock {
  this._resolveExitBehavior();      // reads declared intents, adds exactly one ExitBehavior
  this._canonicalizeBehaviorOrder(); // fixed order: e.g. ChildSelection before MetricPromotion, always
  if (!this.hasBehavior(CompletionTimestampBehavior)) {
    this.addBehavior(new CompletionTimestampBehavior());
  }
  return new RuntimeBlock({ ...this._config, behaviors: [...this.behaviors.values()] });
}
```

This removes `hasBehavior`/`removeBehavior`/`moveBehaviorLast` calls from strategy `apply()` methods entirely — those become private mechanics inside `BlockBuilder`, invoked once, in a documented order, rather than being available for any strategy to call on any other strategy's contribution.

**Design decision required:** enumerate the fixed set of "intents" (exit timing, behavior ordering constraints) `BlockBuilder` needs to resolve. This review found exactly two live cases (exit-mode-depends-on-children, promotion-must-follow-child-selection) — the fix should model those two, not build a general-purpose constraint solver.

---

## 2.4 Honest deprecations

**What exists today.** Two `@deprecated` markers are inconsistent with actual usage, which trains reviewers to distrust the annotation:

- **`MetricType.Time` / `.Elapsed` / `.Total`** (`src/core/models/Metric.ts:112-119`, comment: "Calculated from Spans when needed"). In reality: `Time` is *written* by every live timer (`CountupTimerBehavior.ts:89`, `CountdownTimerBehavior.ts:241`, `ProxyBlock.ts:338`) and read in 3+ UI files. `Elapsed` is read in ~12 files spanning the entire analytics stack (`PowerEnrichmentProcess`, `PaceEnrichmentProcess`, `SessionLoadProjectionEngine`, `MetMinuteProjectionEngine`, `TISProcessor`, plus UI). `Total` is written by `TotalMetric.ts` and read by the analytics transformer and review types.
- **`IEventHandler`** (`src/runtime/contracts/events/IEventHandler.ts:6`, comment: "Use IRuntimeAction[] directly"). In reality: it's the interface every event handler in the system implements — `NextEventHandler`, `AbortEventHandler`, `BehaviorContext`, `EventBus`.

**Why it's a problem.** These aren't wrong forever — they may represent a real intended direction — but as written they're indistinguishable from the four behaviors in §1.1, which *are* genuinely dead. A reader (or an LLM assistant) grepping for `@deprecated` to find cleanup candidates will hit these and either waste time investigating a live hot path, or — worse — start "helpfully" migrating off an interface that 100% of implementations still use.

### Old vs. new

**Old:**

```ts
// Metric.ts
export enum MetricType {
  /** @deprecated Calculated from Spans when needed */
  Time = 'Time',
  /** @deprecated Calculated from Spans when needed */
  Elapsed = 'Elapsed',
  /** @deprecated Calculated from Spans when needed */
  Total = 'Total',
  // ...
}
```

**New** — pick one of two honest states per item, don't leave it ambiguous:

```ts
// Option A: the deprecation is real and worth finishing — track it, don't just tag it
export enum MetricType {
  /**
   * TODO(WOD-xxx): still written by CountupTimerBehavior/CountdownTimerBehavior and
   * read by ~12 analytics files. Not safe to remove until those are migrated to
   * derive Elapsed/Total from Spans at read time. See ADR docs/adr/<name>.md.
   */
  Time = 'Time',
  // ...
}

// Option B: the deprecation isn't going to happen — just remove the tag
export enum MetricType {
  Time = 'Time',       // canonical live timer state — not deprecated
  Elapsed = 'Elapsed',
  Total = 'Total',
  // ...
}
```

Same treatment for `IEventHandler`: either write the migration plan (which handlers move to bare `IRuntimeAction[]`, and why the rest can't) as a tracked follow-up, or remove the tag.

**Related, same root cause:** `scripts/check-unused-exports-regressions.cjs` pins `UNUSED_EXPORT_BASELINE = 1397` as a single frozen number rather than an enumerated, reviewable list. A frozen count can silently absorb both genuinely-fine exports (test utilities, story helpers) and newly-dead ones (like the Tier 1 items in this review) without anyone noticing which is which. Recommend replacing the single number with the actual `ts-prune` output committed as a baseline file, so future PRs show a diff of *which* exports became unused, not just whether the count moved.

---

## 2.5 `ExecutionContext` as a 16-method pass-through

**What exists today.** `ExecutionContext.ts` (189 LOC) implements the full 21-member `IScriptRuntime` interface, but 16 of those members are pure delegation (`this._runtime.script`, `this._runtime.eventBus`, etc.) — the only things it actually *adds* are: the action-processing loop (an ordered queue, depth-first, bounded by `maxActionDepth`) and overriding `clock` with a frozen `SnapshotClock` for the duration of the turn. It's instantiated exactly once per turn, from one call site (`ScriptRuntime.ts:152`).

Meanwhile, every actual consumer inside a turn — actions, behaviors, blocks — only ever asks for the narrow 9-member `IRuntimeContext` (`script`, `eventBus`, `stack`, `clock`, `jit`, `nowProvider`, `options`, `addOutput`, `handle`), never the wide interface. The wide interface is only needed by `ScriptRuntime` itself and by UI/store code (`workbenchSessionStore.ts`, `AnalyticsTransformer`) that lives entirely outside any turn.

**Why it's a problem.** Implementing a 21-method interface to add 2 pieces of behavior means every time `IScriptRuntime` gains a member, `ExecutionContext` must add a matching pass-through line or the build breaks — pure maintenance load for a wrapper whose actual job is much smaller than its declared shape.

### Old vs. new

**Old:**

```ts
class ExecutionContext implements IScriptRuntime {
  private _runtime: IScriptRuntime;
  private _clock: SnapshotClock;

  constructor(runtime: IScriptRuntime) {
    this._runtime = runtime;
    this._clock = new SnapshotClock(runtime.clock.currentDate);
  }

  get script() { return this._runtime.script; }
  get eventBus() { return this._runtime.eventBus; }
  get stack() { return this._runtime.stack; }
  get clock() { return this._clock; } // the one real override
  get jit() { return this._runtime.jit; }
  // ... 11 more pass-through getters ...
  do(action) { /* ... */ }
  doAll(actions) { /* ... */ }
  handle(event) { /* ... */ }
  pushBlock(block) { return this._runtime.pushBlock(block); } // pass-through
  popBlock() { return this._runtime.popBlock(); }              // pass-through
  subscribeToOutput(fn) { return this._runtime.subscribeToOutput(fn); } // pass-through
  // ... etc., 16 total pass-throughs, only 2-3 methods with real logic

  execute(action: IRuntimeAction): void {
    const queue = [action];
    while (queue.length) {
      const next = queue.shift();
      const children = next.do(this); // 'this' — the full IScriptRuntime surface
      if (children) queue.unshift(...children);
    }
  }
}
```

**New** — a plain function that builds a narrow context object, since narrow is all any turn participant needs; `ScriptRuntime.do()` keeps ownership of the wide interface for itself:

```ts
// turn.ts (new, small module — replaces ExecutionContext.ts)
function runTurn(runtime: IScriptRuntime, initialAction: IRuntimeAction, maxDepth: number): void {
  const snapshotClock = new SnapshotClock(runtime.clock.currentDate);
  const turnContext: IRuntimeContext = {
    script: runtime.script,
    eventBus: runtime.eventBus,
    stack: runtime.stack,
    clock: snapshotClock,       // the one real override, same as before
    jit: runtime.jit,
    nowProvider: runtime.nowProvider,
    options: runtime.options,
    addOutput: (o) => runtime.addOutput(o),
    handle: (e) => runtime.handle(e),
  };

  const queue = [initialAction];
  let depth = 0;
  while (queue.length) {
    if (++depth > maxDepth) throw new Error('max action depth exceeded');
    const next = queue.shift()!;
    const children = next.do(turnContext); // narrow context — matches what actions already declare they need
    if (children) queue.unshift(...children);
  }
}

// ScriptRuntime.do() calls runTurn(this, action, this.options.maxActionDepth) instead of
// `new ExecutionContext(this).execute(action)`
```

Every action/behavior already types its `do`/`onNext`/etc. parameter as `IRuntimeContext`, not `IScriptRuntime` — so this is a type-compatible change at every call site, not a breaking one. `ExecutionContext.ts` and its 189 LOC are deleted; `IScriptRuntime`'s 21-vs-9 split becomes visibly real (nothing pretends to implement the wide interface just to move through a turn).

**Design decision required:** confirm no turn-scoped code anywhere reaches for an `IScriptRuntime`-only member (e.g. `subscribeToOutput`, `finalizeAnalytics`) expecting it to be available mid-turn — the review found none, since all actions/behaviors are already typed against `IRuntimeContext`, but this is worth a grep-confirm before deleting `ExecutionContext`.
