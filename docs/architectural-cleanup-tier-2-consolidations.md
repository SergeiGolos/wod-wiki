# Tier 2 — Consolidations

> Part of [Architectural Cleanup](./architectural-cleanup.md). Each item here is a case of the same job being done more than one way. The fix is mechanical (no new concepts introduced), but each does involve a small design decision — noted per item — so these carry slightly more risk than Tier 1's pure deletions.
>
> **Status: ✅ Implemented and independently re-verified.** [Tier 1](./architectural-cleanup-tier-1-deletions.md) is also implemented and verified. See the [Verification Appendix](#verification-appendix) at the end of this document for what was checked, a real regression that was found and fixed, and one item flagged for the user's judgment rather than silently fixed.

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

**What was actually implemented (§2.5):** the class was not deleted. `ExecutionContext` still exists, but was narrowed from `implements IScriptRuntime` to `implements IRuntimeContext` and stripped of the 8 wide-only members (`pushBlock`, `popBlock`, `subscribeToOutput`, `getOutputStatements`, `subscribeToStack`, `setAnalyticsEngine`, `finalizeAnalytics`, `dispose`). This achieves the same goal this section describes ("adding a member to `IScriptRuntime` no longer forces a matching pass-through") without renaming the one production call site (`ScriptRuntime.ts:144`) or its test call sites. See the Verification Appendix for the full comparison.

---

## Verification Appendix

This section documents an independent re-verification of the implementation, performed after the fact against the actual git diff, live test runs, and two dedicated code-reading audits — not a re-review of the plan.

### What was checked

Two focused audits verified each of the five items against the actual source (not the implementation report's claims): §2.1 (tracker removal) and §2.2 (output consolidation) in one pass; §2.3 (builder resolves exit), §2.4 (honest deprecations), and §2.5 (ExecutionContext narrowing) in a second pass. Test and build results were reproduced independently:

- `bun test ./src --preload ./tests/unit-setup.ts` → 2690 pass / 1 fail before fixes (the pre-existing `workbenchSessionStore` failure), same after.
- `bun run test:components`-equivalent full `tests/` run → diffed byte-for-byte against a clean pre-Tier-1/2 baseline (via `git stash`). One extra failure appeared in one run (`widgetBlockPreview — decoration building`) but was confirmed pre-existing suite-order flakiness, not a regression: the file is completely untouched by this changeset's diff, and the test passes cleanly (18/18) when run in isolation via its own file path.
- `bun x vite build` → succeeds throughout.

### Verdicts

| Item | Verdict | Notes |
|---|---|---|
| §2.1 Tracker removal | **PARTIAL → fixed** | Architecture correctly consolidated (AnalyticsEngine → OutputEmitter → MetricTrackerCard verified end-to-end), but the removal shipped with one real regression and several un-migrated test files. See below. |
| §2.2 Output consolidation | **PARTIAL → fixed** | The double-fire is genuinely eliminated (traced the full pop path — confirmed exactly one `'segment'` output per pop) and the fix is correctly scoped (milestone/non-final-segment emissions untouched). ~9 comments across 8 files still described the pre-fix behavior. Fixed. |
| §2.3 Builder resolves exit | **FULLY MATCHES PLAN** | `declareExit('immediate'\|'deferred')` + `BlockBuilder.build()` centrally resolving exit mode and canonical ordering, exactly as sketched. Two trivial nits (see below), fixed. |
| §2.4 Honest deprecations | **FULLY MATCHES PLAN** | Both `@deprecated` tags removed and replaced with accurate documentation (Option B from this doc, chosen consistently for both). |
| §2.5 ExecutionContext narrowing | **Reasonable alternate design** | Narrowed the existing class's implemented interface rather than deleting it for a `runTurn()` function (see note above). Single production call site, zero `as any` casts, no member reached outside the narrow surface, tests pass. |

### Gap found: a real regression in §2.1

**`src/runtime/ScriptRuntime.ts` — undefined `ownerKey` (fixed).** The diff removed `const ownerKey = currentBlock.key.toString();` together with the adjacent `this.options.tracker?.endSpan?.(ownerKey);` line it fed — correctly, since the tracker call is gone — but left two other uses of `ownerKey` dangling further down in `popBlock()`:

```ts
this.options.hooks?.unregisterByOwner?.(ownerKey);   // TS2304: Cannot find name 'ownerKey'
this.options.logger?.debug?.('runtime.popBlock', {
    blockKey: ownerKey,                               // same
    stackDepth: this.stack.count,
});
```

This was a confirmed `tsc` error (`TS2304`), but **latent** at runtime — both call sites are behind optional chaining on `hooks`/`logger`, which are unset in every current test, so it never threw during verification. It would throw `ReferenceError: ownerKey is not defined` the moment any caller configures `options.hooks.unregisterByOwner` or `options.logger.debug` and calls `popBlock()`. **Fixed** by replacing both remaining `ownerKey` references with `currentBlock.key.toString()` inline.

### Gap found: un-migrated tracker references across test files (§2.1)

Beyond the production code (which was correctly and completely migrated — `WorkoutTracker.ts`, `TrackMetricAction.ts`, `TrackRoundAction.ts`, the `RuntimeStackTracker` contract, and the Chromecast RPC mirror are all genuinely deleted, not stubbed), several test files still referenced the removed `tracker` option or `onTrackerUpdate` interface member. All were fixed:

- **`src/runtime/compiler/__tests__/RuntimeFactory.test.ts`** — an entire test, `'wires tracker into the analytics engine when provided in options'`, still constructed a fake tracker and passed `{ tracker }` into `createRuntime`, a key `RuntimeStackOptions` no longer accepts. Deleted (there's no direct replacement at this scope — session totals are now proven end-to-end by `AnalyticsEngine.test.ts` and `MetricTrackerCard`'s own tests).
- **`src/__tests__/smoke/application-launch.smoke.test.ts`** — `customOptions = { debug: true, tracker: undefined }`. Dropped the dead `tracker: undefined` key. (Separately, `debug` itself is not a valid `RuntimeStackOptions` key either — the real field is `debugMode` — but that mismatch predates this changeset entirely and is out of scope here.)
- **`src/runtime/subscriptions/__tests__/SubscriptionManager.test.ts`** — 12 occurrences of `onTrackerUpdate: () => {}` in mocks typed as `IRuntimeSubscription`, which no longer declares that member. Removed all 12.
- **`src/services/cast/rpc/__tests__/CastSessionManager.test.ts`** — a `MockSubscription implements IRuntimeSubscription` class with a dead `onTrackerUpdate(): void {}` method (found by an independent sweep, not in the original audit's list — different syntax shape than the object-literal cases above, so a narrower grep missed it). Removed.
- **`src/runtime/__tests__/ExecutionContextStack.test.ts`**, **`src/runtime/subscriptions/__tests__/LocalEventProvider.test.ts`**, **`src/testing/harness/StrategyTestHarness.ts`** — three more mock objects with a dead `subscribeToTracker: () => () => {}` property (and one dead `tracker: null as any,` property in `LocalEventProvider.test.ts`), found by an independent repo-wide sweep. All masked by `as any`/`as unknown as X` casts so they never surfaced as `tsc` errors, but were stale nonetheless. Removed.
- **`src/runtime/__tests__/RuntimeStackLifecycle.test.ts`** — two tests constructed a full `tracker = { startSpan: vi.fn(...), endSpan: vi.fn(...) }` mock and included it in the `options` object passed to `ScriptRuntime` — but neither test's own assertion (`expect(callOrder).toEqual([...])`) ever expected a `tracker.*` entry in the recorded call order, meaning the mocks were already dead weight before this audit even started, just masked by `as any`. The first test's title, `'sequences push hooks, tracker, wrapper, and logger in order'`, was also inaccurate once tracker sequencing was removed. Deleted both dead mocks and renamed the title to `'sequences push hooks, wrapper, and logger in order'`.

None of these test-file gaps were caught by `bun test` (which doesn't type-check) or by `vite build`'s bundler alone in every case — some only surface under a dedicated `tsc --noEmit` pass. **Takeaway for future tiers:** run `tsc --noEmit` explicitly as part of verification, not just the test suites and the bundler — a mock object typed loosely enough (`as any`) can hide a stale reference from every other check.

### Gap found: stale comments describing removed behavior (§2.2)

The double-fire elimination itself was correctly implemented and verified (traced: `ReportOutputBehavior.onUnmount` writes result memory only; `OutputEmitter.emitSegmentFromResultMemory`, triggered by the stack's pop event, is the sole site that turns a pop into an `OutputStatement`, and it now carries `completionReason`). But ~9 comments and JSDoc examples across 8 files still described the pre-fix behavior ("Unmount emits 'completion' output") as if it were current — exactly the kind of misleading residue this document's own §2.4 warns about for `@deprecated` tags, just for prose instead of annotations. All updated to describe the current single-emission-per-pop design:

- `src/runtime/actions/stack/PopBlockAction.ts` — comment explaining why the action doesn't emit output rewritten to name the actual current emission site.
- `src/runtime/actions/stack/AbortSessionAction.ts` — class-level lifecycle doc and an inline comment, both updated (2 locations).
- `src/runtime/actions/stack/ClearChildrenAction.ts` — lifecycle doc step 2 updated.
- `src/runtime/blocks/RestBlock.ts`, `WaitingToStartBlock.ts`, `SessionRootBlock.ts` — each had a "Unmount: Emits 'completion' output" lifecycle-doc line, updated to describe the pop-time 'segment' emission.
- `src/runtime/contracts/IBehaviorContext.ts` — a full worked `@example` showing `onUnmount` calling `ctx.emitOutput('completion', ...)` (the exact anti-pattern this section removed) rewritten to emit `'milestone'` instead and note the correct pattern (write result memory, let the pop emit the segment); plus the `emitOutput` doc's lifecycle-point list and its second inline example, both updated.
- `src/runtime/contracts/IScriptRuntime.ts` — the `addOutput` JSDoc example constructed an `OutputStatement` with `outputType: 'completion'`; updated to `'segment'` with a `completionReason` field.
- `src/testing/script/assertions.ts` — the `OutputAssertions` interface doc comments for `byType`, `completions()`, `assertPairedOutputs()`, and `allPaired()` all described pairing a `'segment'` against a separate `'completion'` output; updated to describe the actual (already-correct) implementation, where `completions()` filters segments by `completionReason` and `assertPairedOutputs()` always returns `[]` because pairing is now structural.
- `src/core/models/OutputStatement.ts` and `src/components/organisms/review/types.ts` — both had a `completionReason` field doc claiming it's "only present on `'completion'` output type"; updated to say it's present on the closing `'segment'` output.
- `stories/catalog/molecules/MetricTrackerCard.mdx` — the component's Storybook doc page still described `useWorkoutTracker()`/`WorkoutTracker` as its data source (a docs file, not source, but still actively misleading for anyone consulting the component catalog). Updated to describe the actual `useOutputStatements()` + `'analytics'`-output mechanism.

### Two trivial nits fixed in §2.3

- `GenericLoopStrategy.test.ts` and `ChildrenStrategy.test.ts` each had a dead `ExitBehavior` import left over from before the `declareExit`-based rewrite (flagged by `tsc` as `TS6133`). Removed both; confirmed each file's other imports (`MetricPromotionBehavior`, `ChildSelectionBehavior`) are still genuinely used.
- `BlockBuilder.removeBehavior` and `BlockBuilder.moveBehaviorLast` were still `public`, even though — confirmed by a repo-wide grep — nothing outside `BlockBuilder.build()` itself calls either anymore. This was exactly the coupling this section's proposal wanted removed at the type level, not just by convention (a future strategy author could still reach for them). Made both `private` and rewrote their doc comments to point at this document instead of the now-obsolete "used by enhancement strategies" framing. Verified via `tsc --noEmit` that no caller broke.

### Flagged, not fixed: the dead `'completion'` type literal

`OutputStatementType` (`src/core/models/OutputStatement.ts:20`) still lists `'completion'` as a legal literal, even though nothing in the codebase emits it anymore after this section's fix. Unlike the comment fixes above, **this was deliberately left alone** rather than silently removed: it's an exported public type, and removing a union member is a genuine API-surface change — a downstream TypeScript consumer doing an exhaustive `switch` over `OutputStatementType`, or any historical `OutputStatement` data already persisted to IndexedDB from before this change with `outputType: 'completion'`, could be affected in ways this audit didn't fully scope. Recommend a deliberate follow-up decision (remove the literal in a documented breaking-change pass, or keep it permanently as a legacy-data-compatible value) rather than folding it into this verification pass.
