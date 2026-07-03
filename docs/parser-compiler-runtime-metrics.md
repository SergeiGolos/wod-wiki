# From Text to Logged Metrics: How the Parser, Compiler, and Runtime Work Together

This document explains, end to end, how a workout written in the Whiteboard Language becomes a stream of logged metrics during a live workout session. It was derived directly from the source code (not from prior documentation), with file references throughout.

The system is a four-stage pipeline:

```
 Workout text
     │
     ▼
 ┌─────────┐   ICodeStatement[]   ┌──────────────┐   IRuntimeBlock   ┌─────────────┐
 │ PARSER  │ ───────────────────▶ │ JIT COMPILER │ ────────────────▶ │   RUNTIME   │
 │ (Lezer) │   (tree of metrics)  │ (strategies) │  (lazy, per push) │ (stack+turn)│
 └─────────┘                      └──────────────┘                   └─────────────┘
                                                                           │
                                                                           ▼
                                                                  OutputStatement[]
                                                                  (logged metrics)
                                                                           │
                                                                           ▼
                                                                    IndexedDB journal
```

A unifying design idea runs through all stages: **metrics are the universal currency**. The parser produces metrics, the compiler routes and promotes metrics, runtime memory stores metrics, and the session log is a stream of metric-carrying output statements.

---

## 1. The Parser: Text → Statement Tree of Metrics

> Note: the parser is **Lezer-based** (CodeMirror's LR parser), not Chevrotain. The old `timer.tokens.ts` / `timer.parser.ts` / `timer.visitor.ts` files no longer exist. There is also no `src/fragments/` directory — what used to be "fragments" is now split into parser-native **syntax primitives** and runtime **metrics**.

### 1.1 Pipeline stages

Entry point: `MdTimerRuntime.read()` in `src/parser/md-timer.ts:15` (created via `createParser()` in `src/parser/parserInstance.ts:14`).

| Stage | What happens | Where |
|---|---|---|
| 0. Entry | Guard empty input, append trailing `\n`, build a CodeMirror `EditorState` with the language extension | `src/parser/md-timer.ts:15-27` |
| 1. Lex + parse | Lezer grammar produces a CST (syntax tree) | `src/grammar/whiteboardscript.grammar`, compiled to `src/grammar/parser.ts` |
| 2. CST → primitives | `extractSyntaxFacts` walks the tree, producing `SyntaxStatement`s of typed `SyntaxPrimitive`s, and builds the indentation tree | `src/parser/syntax-parser.ts:21` |
| 3. Primitives → metrics | `classifyStatements` converts each primitive into one or more `IMetric` objects and merges adjacent ones | `src/parser/semantic-classifier.ts:28` |
| 4. Dialects | The dialect stack fuses unit words into dimensioned metrics (`95` + `lb` → Resistance; `1.5` + `km` → Distance; `\|` → ChoiceGroup) | `src/parser/lezer-mapper.ts:27`, `src/dialects/units/fuseUnits.ts` |
| 5. Wrap | Result is a `WhiteboardScript` (implements `IScript`) with id-indexed statement lookup | `src/parser/WhiteboardScript.ts:15` |

This is a deliberate **two-seam design** (documented in `src/parser/README.md`): the grammar layer knows nothing about workout semantics, and the semantic layer knows nothing about the grammar.

### 1.2 What the syntax means (token → meaning)

From the grammar's token block (`src/grammar/whiteboardscript.grammar:72-127`):

| Syntax | Token/rule | Meaning |
|---|---|---|
| `10:00`, `1:30:00`, `:30` | `Timer` | A duration |
| `:?` | `collectibleTimer` | Unknown duration, record at runtime |
| `^20:00` | `trend` on Duration | Force count-up |
| `*5:00` | `rest` on Duration | Required timer (block can't be skipped past it) |
| `(3)`, `(21-15-9)`, `(AMRAP)` | `Rounds` with `Sequence` or label | Round count / rep scheme / labeled scheme |
| `21-15-9` (bare) | `Sequence` | Rep scheme (also implies round count) |
| `-` line prefix | `Lap` (`round`) | Each line is its own round group |
| `+` line prefix | `Lap` (`compose`) | Line composes into the previous group |
| `@95` | `Quantity` with `atSign` | Load / weight |
| `21` (bare number before an effort) | `Quantity` | Rep count |
| `?` | `question` | Collectible quantity (fill in at runtime) |
| `Thrusters` | `Effort` | Movement / exercise name |
| `Run \| Walk` | `pipe` | Alternatives (choice) |
| `1/4 mile` | `slash` | Fraction |
| `[:rest]` | `Action` | Action directive |
| `// note` | `textComment` | Free text |
| `# Warmup` | `heading` | Section heading |
| `key: value`, `{load: 100}` | `Property` / `MetricObject` | Metadata properties (rpe, rir, load…) |

### 1.3 Primitives → metrics

`classifyPrimitive` (`src/parser/semantic-classifier.ts:51-144`) maps each primitive to concrete metric classes (all in `src/runtime/compiler/metrics/`):

| Primitive                     | Metric(s) produced                                                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `duration`                    | `DurationMetric` (value in ms, `direction`, `forceCountUp`, `required`); plus a hint metric `behavior.required_timer` if `*` was present |
| `rounds` single value         | `RoundsMetric(n)`                                                                                                                        |
| `rounds` sequence (`21-15-9`) | `RoundsMetric(3)` **plus** one `RepMetric` per value — the rep scheme is carried as individual Rep metrics                               |
| `quantity` with `@`           | `ResistanceMetric(value, empty-unit)` — unit fused later by dialect                                                                      |
| `quantity` bare               | `RepMetric(value)`                                                                                                                       |
| `effort`                      | `EffortMetric(text)`                                                                                                                     |
| `lap`                         | `GroupMetric('round' \| 'compose')`                                                                                                      |
| `action`                      | `ActionMetric`                                                                                                                           |
| `text`/`heading`              | `TextMetric`                                                                                                                             |
| `property`/`metric_object`    | `PropertyMetric` (key mapped to `MetricType` — `rpe`→SessionRPE, `load`→Load, etc.)                                                      |

Every metric implements `IMetric` (`src/core/models/Metric.ts:41`): a pure data shape with `type: MetricType`, `value`, `unit?`, `image?` (source text), and crucially **`origin: MetricOrigin`** — `'parser' | 'compiler' | 'dialect' | 'runtime' | 'user' | 'collected' | 'hinted' | 'tracked' | 'analyzed' | ...`. Origin drives ownership precedence later (user > runtime > compiler > parser).

Two merge passes then clean things up:
- `mergeFragments` (`semantic-classifier.ts:151`) — adjacent efforts concatenate ("Push Ups" is one effort); a `RepMetric` followed by an empty-unit dimensioned metric fuses into it.
- The **Units dialect** (`src/dialects/units/fuseUnits.ts`) — `95` + `lb` → `ResistanceMetric(95, "lb")`; `400` + `m` → `DistanceMetric(400, "m")`.

### 1.4 The statement tree

Each source line becomes an `ICodeStatement` (`src/core/models/CodeStatement.ts:6`):

- `id: number` — the source line number.
- `metrics: MetricContainer` — the classified metrics for the line.
- `meta: CodeMetadata` — line/column/offset info; `metricMeta` maps each metric back to its exact source span (this is how the editor highlights results per token).
- `parent?: number` and `children: number[][]` — the tree.

**Indentation creates nesting** (`applyIndentationNesting`, `src/parser/syntax-parser.ts:270`): a stack-based algorithm makes each line a child of the nearest less-indented line above it.

**`children` is a `number[][]` (grouped), not flat** (`groupChildrenByLap`, `syntax-parser.ts:297`): a `+`-prefixed line joins the previous child's group (they execute together as one block); normal and `-` lines each start their own group. This grouping is exactly what the compiler later compiles as one runtime block per group.

### 1.5 Worked example

```
(3) 21-15-9
  Thrusters 95lb
  Pullups
```

| Statement | Metrics | Tree |
|---|---|---|
| id=1 `(3) 21-15-9` | `RoundsMetric(3)`, `RoundsMetric(3)`, `RepMetric(21)`, `RepMetric(15)`, `RepMetric(9)` | `children = [[2],[3]]` |
| id=2 `Thrusters 95lb` | `EffortMetric("Thrusters")`, `ResistanceMetric(95,"lb")` (fused by dialect) | `parent = 1`, leaf |
| id=3 `Pullups` | `EffortMetric("Pullups")` | `parent = 1`, leaf |

---

## 2. The JIT Compiler: Statements → Runtime Blocks (Lazily)

Key files: `src/runtime/compiler/JitCompiler.ts`, `BlockBuilder.ts`, `BlockTemplateComposer.ts`, `PromotionResolver.ts`; strategy registry in `src/runtime/services/runtimeServices.ts`.

### 2.1 Compilation is a composition pipeline, not a single-strategy pick

There are no monolithic `TimerStrategy`/`RoundsStrategy` classes that each fully build a block. Instead, `JitCompiler.compile(nodes, runtime)` (`JitCompiler.ts:67`):

1. **Projects parent promotions** into the child statements (see §2.4).
2. **Matches ALL strategies** whose `match(nodes, runtime)` returns true, sorts them by priority descending. Matching results are cached by a structural key (metric types + hints + has-children — so "5 Burpees" and "10 Pullups" share a cache entry; the cache is bypassed when promotions changed the node shape).
3. **Every matching strategy runs `apply(builder, nodes, runtime)`** against one shared `BlockBuilder` — each strategy contributes its aspect.
4. `builder.build()` produces the final `RuntimeBlock`.

Priority bands (`src/runtime/contracts/IRuntimeBlockStrategy.ts:7-13`): **Logic 90–100** (workout patterns like AMRAP/EMOM), **Components 50–80** (timer/rounds/group chassis), **Enhancements 20–40** (sound, output reporting, children wiring), **Fallback 0**.

### 2.2 The strategy roster

| Strategy | Pri | Matches when | Contributes |
|---|---|---|---|
| `AmrapLogicStrategy` | 90 | Duration + (Rounds or "amrap"/"rounds" text) | Countdown timer (`complete-block`), **unbounded** repeater, AMRAP label, sound cues |
| `IntervalLogicStrategy` (EMOM) | 90 | Duration + interval hint or "emom" text | Countdown timer (`reset-interval` — paces rounds without completing the block), fixed rounds, rest injection, sound cues |
| `GenericTimerStrategy` | 50 | Any non-runtime Duration metric | Countdown/countup timer from `DurationMetric.direction`; `ExitBehavior` (required countdowns exit only on `timer:complete`) |
| `GenericLoopStrategy` | 50 | Any Rounds metric | Round config (`totalRounds`, rep scheme collected from all `Rep` metrics), `MetricPromotionBehavior`, label like "21-15-9" |
| `GenericGroupStrategy` | 50 | Has children, no timer/rounds | Group chassis + promotion |
| `ChildrenStrategy` | 50 (runs after components) | `statements[0].children` non-empty | Replaces leaf `ExitBehavior` with `ChildSelectionBehavior` + deferred exit; wires loop condition (`rounds-remaining` vs `timer-active`) |
| `SoundStrategy` | 20 | Always | Adds `SoundCueBehavior` if none present |
| `ReportOutputStrategy` | 15 | Always | Adds `ReportOutputBehavior` (the metrics logger — see §4) |
| `EffortFallbackStrategy` | 0 | No duration, no rounds, no children | Count-up secondary timer (just shows elapsed), immediate exit on user "next" |

Direct-build strategies (never pipeline-matched, invoked explicitly): `SessionRootStrategy` (session root block), `IdleBlockStrategy`, `WaitingToStartStrategy` (the "press start" gate), `RestBlockStrategy` (injected rest periods).

`BlockBuilder.build()` (`BlockBuilder.ts:304`) enforces one universal invariant: every block gets a `CompletionTimestampBehavior`. It also pushes the initial memory: one `metric:display` location per fragment group and a `metric:label` location.

### 2.3 Compilation is lazy — per stack push, per round

Only the `SessionRootBlock` is built eagerly at session start (`StartSessionAction` → `SessionRootStrategy.build`). Everything else compiles **at the moment it is pushed**:

1. `ChildSelectionBehavior.dispatchNext` on the parent emits `CompileAndPushBlockAction(nextGroupOfStatementIds)`.
2. `CompileAndPushBlockAction.do` (`src/runtime/actions/stack/CompileAndPushBlockAction.ts:19`) resolves statement IDs → statements via `runtime.script.getIds`, calls `runtime.jit.compile(...)`, and wraps the result in `PushBlockAction`.

In a rounds workout, **the same child statements are re-compiled every round**. That's intentional — because of promotion (next section), round 2 of a 21-15-9 workout compiles the Thrusters block with `Rep=15` baked in.

### 2.4 Metric inheritance: how 21-15-9 reaches the child block

Two cooperating mechanisms:

**A. Compile-time promotion projection** (`PromotionResolver`, `src/runtime/compiler/PromotionResolver.ts:16`). When compiling a child, the compiler asks the current parent block for promotions from two sources: static memory locations with visibility `'promote'` (`metric:promote`, `metric:rep-target`), and dynamic values from any parent behavior implementing `IMetricPromoter`. The promoted metrics are **appended** to a clone of the child's statements — appended, not prepended, so a child's own explicit metrics win at equal origin.

**B. `MetricPromotionBehavior`** (`src/runtime/behaviors/MetricPromotionBehavior.ts:26`) lives on the parent (added by `GenericLoopStrategy`). It holds the rep scheme and answers `getRepsForRound(round) = repScheme[(round-1) % length]`. Its `getPromotedFragments` reads the parent's current `round` memory and emits a `RepMetric` with origin `'compiler'` for that round — this is the dynamic path the resolver consumes. `ChildrenStrategy` deliberately moves this behavior to the end of the chain so it observes the round *after* `ChildSelectionBehavior` advances it.

Standalone context lines (a bare `95lb` or `400m` on its own line) are merged into the following group by `SessionRootStrategy.buildChildGroupsWithContext`, so their loads cascade to children the same way.

---

## 3. The Runtime: Stack, Turns, Behaviors, Memory

### 3.1 Execution model — a stack plus atomic "turns"

- **`RuntimeStack`** (`src/runtime/RuntimeStack.ts:12`) is a pure state container (push/pop/current/notify). All lifecycle logic lives in `ScriptRuntime`.
- **`ScriptRuntime`** (`src/runtime/ScriptRuntime.ts:36`) owns the event bus, clock, stack, JIT compiler, and the `OutputEmitter`.
- Every mutation flows through **`ScriptRuntime.do(action)`**, which creates an **`ExecutionContext`** (`src/runtime/ExecutionContext.ts:36`) — a "turn". The context processes an ordered action stack depth-first: actions return child actions, which are pushed to the front of the queue (bounded by `maxActionDepth`, default 20).
- **The frozen-clock invariant**: each turn captures a `SnapshotClock` at creation. Every action within one turn — a pop, the parent's `next()`, the next child's push — sees the *same timestamp*. This is why spans, completion times, and child start times line up exactly in the logs with no drift.

### 3.2 Block lifecycle

`RuntimeBlock` (`src/runtime/RuntimeBlock.ts:60`) lifecycle, each phase running its behaviors' hooks in attach order:

| Phase | What happens |
|---|---|
| `mount` | Stamps `executionTiming.startTime`; runs `behavior.onMount(ctx)` for each behavior; collects returned actions |
| `next` | Emits a system output, runs the `onNext` chain (via `inspectNext`), applies completion decision, returns actions |
| `inspectNext` | Pure-read preview of what `next()` would do — runs the chain against a temporary context, then restores state |
| `unmount` | Stamps `endTime`; runs `onUnmount` hooks (this is where results are computed — §4); unsubscribes events |
| `dispose` | Runs `onDispose`; disposes all memory locations |

`PushBlockAction` = push + mount. `PopBlockAction` = mark completion (or `'forced-pop'`), unmount, pop, dispose — and if a parent remains, it queues a `NextAction` for the parent, which is how the workout advances to the next element.

### 3.3 Behaviors — composable units of block logic

Behaviors implement `IRuntimeBehavior` (optional `onMount/onNext/onUnmount/onDispose` returning actions) and receive an `IBehaviorContext` (`src/runtime/BehaviorContext.ts:41`) with: event `subscribe` (scoped to the block), `emitEvent`, `emitOutput`, typed memory access, and `markComplete`. Behaviors coordinate through a shared **capability registry** (e.g., `ChildSelectionBehavior` declares `'childSelection'`; `CountdownTimerBehavior` checks it to avoid double rest-injection).

The working set:

- **Time aspect** (exactly one per block): `SpanTrackingBehavior` (spans only), `CountupTimerBehavior`, `CountdownTimerBehavior` (tick-driven expiry → `timer:complete` → either complete the block or reset the interval for EMOM).
- **Iteration**: `ChildSelectionBehavior` (child dispatch, round init/advance, loop conditions, rest injection), `MetricPromotionBehavior` (rep scheme / load promotion).
- **Completion**: `ExitBehavior` (`immediate` for leaves — pop on user "next"; `deferred` for containers — pop when children exhaust), `CompletionTimestampBehavior` (universal).
- **Output/UX**: `ReportOutputBehavior` (the metrics logger), `SoundCueBehavior`, `LabelingBehavior`, `ButtonBehavior`, `WaitingToStartInjectorBehavior`.

### 3.4 Memory — typed, observable, visibility-tiered

Blocks hold a list of `MemoryLocation`s (`src/runtime/memory/MemoryLocation.ts:75`), each wrapping a `MetricContainer` and observable via `subscribe` (the UI binds to these). Locations carry a `MemoryTag`; tags map to **visibility tiers** (`src/runtime/memory/MetricVisibility.ts:28`):

| Tier | Tags | Purpose |
|---|---|---|
| `display` | `metric:display` | What the workout card shows (efforts, reps, loads) |
| `result` | `metric:result` | Computed results collected when the block pops |
| `promote` | `metric:promote`, `metric:rep-target` | Inherited by child blocks at compile time |
| `private` | `metric:label`, `metric:tracked`, `metric:next` | Internal |

Structured state uses typed shapes (`src/runtime/memory/MemoryTypes.ts`): `TimerState {spans, durationMs, direction, ...}` under tag `'time'`, `RoundState {current, total}` under `'round'`, plus children-status, completion, display, and button state.

**Time is tracked as spans.** A `TimeSpan` (`src/runtime/models/TimeSpan.ts:16`) is `{started, ended?}` in epoch ms. Pause/resume closes/opens spans; only the trailing span may be open (invariant enforced by `TimerSpans.ts`). Elapsed = sum of span durations.

### 3.5 Events → actions

The `EventBus` (`src/runtime/events/EventBus.ts:39`) dispatches `IEvent`s to handlers filtered by scope: `global` (always), `bubble` (owner block anywhere on stack), `active` (owner is the current block). Handlers return actions, which `ScriptRuntime.handle` runs in a turn.

The two drivers of a live session:

- **Clock ticks**: `useRuntimeExecution` (`src/runtime/hooks/useRuntimeExecution.ts:52`) fires `runtime.handle(new TickEvent())` every **20 ms**. Timer behaviors (bubble-scoped) recompute elapsed; countdown expiry emits `timer:complete`.
- **User "Next"**: UI → `NextEvent` → `NextEventHandler` → `NextAction` → `currentBlock.next()` → behaviors decide (e.g. `ExitBehavior` returns `PopBlockAction`, `ChildSelectionBehavior` returns `CompileAndPushBlockAction` for the next child).

---

## 4. The Metrics Path: How a Session Produces Logged Metrics

This is the heart of the system. A workout session's log is a stream of **`OutputStatement`s** — metric-carrying records emitted as blocks live and die.

### 4.1 During a block's life

1. **On mount** — the timer behavior writes a `TimerState` with an open `TimeSpan` into `'time'` memory. `ChildSelectionBehavior` writes a `CurrentRoundMetric` into `'round'` memory and emits `TrackRoundAction` (feeding the live `WorkoutTracker` for real-time UI).
2. **During execution** — ticks recompute elapsed from spans; pause/resume close/open spans; `MetricPromotionBehavior` writes per-round rep targets into `metric:rep-target`/`metric:promote`.
3. **On unmount (block pops)** — **`ReportOutputBehavior.onUnmount`** (`src/runtime/behaviors/ReportOutputBehavior.ts:84`) is the primary metrics producer. It:
   - reads the timer spans from `'time'` memory,
   - computes result metrics: `ElapsedMetric` (working time, mm:ss image), `TotalMetric` (wall time), `SpansMetric` (the raw spans), `SystemTimeMetric` (wall-clock timestamps), `CurrentRoundMetric`,
   - for blocks with multiple display groups, splits time proportionally by reps (`computeSplitTimeResults`),
   - **writes these into `metric:result` memory** and emits a `'completion'` OutputStatement.
4. **On pop** — the stack's pop event triggers `OutputEmitter.emitSegmentFromResultMemory` (`src/runtime/OutputEmitter.ts:297`), which combines `metric:display` (what was planned: effort, reps, load) with `metric:result` (what happened: elapsed, spans, round) into a **`segment`** OutputStatement. This pairing — *plan metrics + measured time under one record* — is the logged unit of work.

### 4.2 OutputStatement anatomy

`OutputStatement` (`src/core/models/OutputStatement.ts:126`) extends `ICodeStatement`, so a logged record has the same shape as a parsed one — it's "a statement that happened" rather than "a statement that was written":

- `outputType`: `segment | milestone | completion | metric | system | event | group | load | compiler | analytics`
- `timeSpan` — when it happened
- `metrics: MetricContainer` — the payload (efforts, reps, resistance, elapsed, spans, round…)
- `sourceStatementId` / `sourceBlockKey` / `stackLevel` — traceability back to the source line and block
- `completionReason` — e.g. `'user-advance'`, `'timer-expired'`, `'forced-pop'`

All outputs funnel through the **`OutputEmitter`** (`src/runtime/OutputEmitter.ts:56`): a single buffered pipeline with analytics enrichment, listener notification, and catch-up replay for late subscribers. It also emits `load` outputs (one per script statement at session start — the plan), `system` outputs (push/pop/next), and `event` outputs.

### 4.3 Persistence — where the log ends up

1. On completion (or stop), `useWorkbenchRuntime` (`src/hooks/useWorkbenchRuntime.ts:81-118`) calls `runtime.finalizeAnalytics()` and then `completeWorkout({ logs: runtime.getOutputStatements().map(toStoredOutputStatement), completed: true })`. Partial results are saved if the component unmounts mid-workout.
2. `toStoredOutputStatement` (`src/components/Editor/types/index.ts:65`) serializes each live statement to a JSON-safe `StoredOutputStatement` (metrics flattened via `toArray()`).
3. `workbenchSessionStore.completeWorkout` (`src/stores/workbenchSessionStore.ts:647`) generates a result UUID and hands off to the **result recorder** (`playground/src/services/resultRecorder.ts:69`), which resolves note/block identity and versioning.
4. **`IndexedDBNotePersistence.mutateNote`** (`src/services/persistence/IndexedDBNotePersistence.ts:256`) writes the result onto the journal note (creating the note lazily if needed) and saves derived analytics points to a separate store for cross-workout trends.

**`WorkoutResults.logs` (the StoredOutputStatement array) is the authoritative record.** The review UI (`useScriptLineResults`) and the offline analytics path both re-derive their views from these logs; the separate analytics store is a non-load-bearing projection.

---

## 5. End-to-End Trace: One Round of "(3) 21-15-9 / Thrusters 95lb / Pullups"

1. **Parse** — three statements; parent (id 1) carries `Rounds(3)` + `Rep(21/15/9)`; children carry `Effort` + `Resistance` metrics; tree `1 → [[2],[3]]`.
2. **Session start** — `SessionRootBlock` is built and pushed; a `WaitingToStart` gate is pushed. User presses Start.
3. **Compile parent** — root dispatches statement 1's group. `GenericLoopStrategy` (rounds + rep scheme) + `ChildrenStrategy` (children) + `SoundStrategy` + `ReportOutputStrategy` compose a `Rounds` block: `ChildSelectionBehavior`, `MetricPromotionBehavior(repScheme=[21,15,9])`, deferred `ExitBehavior`, `SpanTracking`, `CompletionTimestamp`, `ReportOutput`. Mount writes `round = {current:1, total:3}`.
4. **Compile first child** — parent dispatches `[2]`. The compiler asks the parent for promotions: `MetricPromotionBehavior` sees round 1 → emits `Rep(21)` (origin `compiler`); resolver appends it to a clone of statement 2. `EffortFallbackStrategy` + enhancements build an `effort` block whose display metrics read: *Thrusters, 95 lb, 21 reps*. Push + mount opens a `TimeSpan`.
5. **User does 21 thrusters, clicks Next** — `NextEvent` → `NextAction` → child's `ExitBehavior` marks `'user-advance'` and returns `PopBlockAction`. Unmount: `ReportOutputBehavior` computes `Elapsed`/`Spans`/`SystemTime` into `metric:result`; pop emits a **`segment`** OutputStatement: `{Effort: Thrusters, Resistance: 95lb, Rep: 21, Elapsed: 1:07, spans, round 1}` — all timestamps from one frozen clock.
6. **Parent advances** — pop queues the parent's `NextAction`; `ChildSelectionBehavior` dispatches `[3]` (Pullups, also promoted `Rep(21)`). After Pullups pops, children are exhausted → `advanceRound` writes `round=2`, emits `TrackRoundAction`, and re-dispatches `[2]` — which **re-compiles Thrusters, now promoted with `Rep(15)`**.
7. **Rounds exhaust** — after round 3, the parent's loop condition (`rounds-remaining`) fails; deferred `ExitBehavior` pops the parent (emitting its own completion/segment outputs with `CurrentRound(3/3)`); the session root pops; the stack empties; execution status flips to `completed`.
8. **Persist** — the full OutputStatement log is serialized and written to the journal note in IndexedDB. The review screen renders per-line results by joining `sourceStatementId` back to the editor's statements.

---

## 6. Design Principles Worth Knowing

- **Metrics as universal currency** — one data shape (`IMetric` in a `MetricContainer`) flows from parser to persistence; each stage only adds origin-tagged metrics.
- **Origin-based ownership** — when the same metric type exists from multiple sources, precedence is user > runtime > compiler > parser. A user-corrected rep count beats the plan.
- **Composition over inheritance, twice** — compiler strategies compose a block; behaviors compose its runtime logic. No block subclass hierarchy for workout types.
- **Lazy compilation as the round mechanism** — re-compiling children each round is not waste; it's how per-round state (rep schemes, loads) is injected declaratively.
- **Frozen-clock turns** — one event, one timestamp, no matter how many pops/pushes cascade; logs are temporally consistent by construction.
- **Output as statements** — logged results reuse the statement shape, making "the plan" (`load` outputs) and "what happened" (`segment` outputs) directly joinable by statement id.
