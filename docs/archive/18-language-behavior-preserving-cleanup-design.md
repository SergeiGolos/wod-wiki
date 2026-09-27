# Language Behavior-Preserving Cleanup Design

**Status:** Proposed design; no implementation or verification result is claimed here.
**Category:** Internal simplification with unchanged consumer-observable behavior.
**Decision:** Remove a path only when its absence is unobservable at every affected boundary,
not merely when the compiler chooses the same block type.

This document supersedes the cleanup recommendations in
[the complexity review](16-language-complexity-review-and-simplification.md), particularly P1,
P3, P4, and P6. That review remains historical evidence, including its reported corpus counts;
those counts are coverage evidence, not a proof of complete language semantics.
[Correctness fixes](17-language-correctness-fixes-design.md) own intentional corrections.
[Language redesign](19-language-redesign-design.md) owns breaking syntax and data-contract changes.

## 1. Goals and non-goals

The goals are to reduce redundant internal decisions, keep one authoritative implementation of
an already-defined rule, and make future cleanup decisions falsifiable. An author must not have
to edit a valid workout or query to receive this release. A saved result must not become less
readable, less inspectable, or different in a supported query because its implementation changed.

The preservation boundary includes parser/library consumers, dialect extensions, the pre-run
wizard, live execution, debug/review surfaces, analytics, storage, and WQL projections. A public
metric or serialized field is not implementation detail just because the default UI hides it.

Non-goals:

- No new group-head protocol position, reserved words, or changed keyword recognition.
- No removal of fractions, `@` loads, metric-object JSON, `-`, or supported nesting depth.
- No change to `?`, `*`, `^`, units, named groups, property lines, or valid WQL syntax.
- No retirement of persisted hints/tags, public dialect registrations, or exported APIs.
- No correction of identity, protocol precedence, malformed-value handling, or shipped examples
  inside an otherwise behavior-preserving patch; those belong to the correctness design.
- No replacement of content discovery with recorded-row queries, or calendar periods with fixed
  durations. Cleanup preserves these distinctions even if presentation code is shared.

## 2. Grounded baseline

### 2.1 Protocol decisions are not currently one predicate

[CrossFitDialect](../packages/lang/src/dialects/CrossFitDialect.ts) recognizes case-insensitive
substrings in Action/Effort values. It emits both behavior and workout-label hints. Its implicit
interval path checks rounds, duration, and children and emits `workout.implicit_emom` in addition
to the interval and EMOM-label hints.

[AmrapLogicStrategy](../packages/lang/src/runtime/compiler/strategies/logic/AmrapLogicStrategy.ts)
checks duration plus rounds or exact `rounds`/`amrap` text;
[IntervalLogicStrategy](../packages/lang/src/runtime/compiler/strategies/logic/IntervalLogicStrategy.ts)
checks duration plus an interval hint or exact `emom` text. Both declare priority 90.
[JitCompiler](../packages/lang/src/runtime/compiler/JitCompiler.ts) applies every matching
strategy in priority order, not just the first match. Comparing a simulated first-match chassis
cannot establish equivalence to this composition.

[LabelComposer](../packages/lang/src/runtime/compiler/utils/LabelComposer.ts) first reads
`workout.*` hints, then has an uppercase exact-keyword fallback. Its identity filtering is another
consumer of keyword spelling. Substring recognition, exact recognition, label composition, and
implicit protocol inference must not be treated as interchangeable predicates.

### 2.2 Timer fields and execution policies are load-bearing

[Semantic classification](../packages/lang/src/parser/semantic-classifier.ts) passes both trend
and required flags to [DurationMetric](../packages/lang/src/runtime/compiler/metrics/DurationMetric.ts)
and separately emits `behavior.required_timer`. `DurationMetric.direction` is a getter affected
by `forceCountUp`; `:?` has undefined value and `hinted` origin, unlike a numeric parser duration.

[GenericTimerStrategy](../packages/lang/src/runtime/compiler/strategies/components/GenericTimerStrategy.ts)
ignores runtime-origin duration metrics, reads the direction getter, and reads required/rest
hints. [BlockTemplateComposer](../packages/lang/src/runtime/compiler/BlockTemplateComposer.ts)
forwards timer options to [BlockBuilder](../packages/lang/src/runtime/compiler/BlockBuilder.ts),
which selects count-up/countdown behavior and conditionally supplies a rest-block factory.
A duration value alone does not determine whether Next is accepted, rest is inserted, an interval
resets, or a parent completes. AMRAP and interval templates configure these policies differently.

### 2.3 Hints, groups, choices, and origins escape the compiler

[OutputEmitter.emitLoad](../packages/lang/src/runtime/OutputEmitter.ts) includes statement metrics
in load outputs. [toStoredOutputStatement](../packages/lang/src/conversion/toStoredOutputStatement.ts)
preserves the metric array and writes a separate `hints` field. The stored field is **`hints`**;
[AnalyticsTransformer](../packages/lang/src/analytics/AnalyticsTransformer.ts) exposes derived
segment **`tags`** and implements `filterByTags`. The review's shorthand “stored tags” must not
obscure these distinct contracts. Its stored-log reader also retains historical timestamp and
output-type normalization behavior.

[BlockBuilder.setFragments](../packages/lang/src/runtime/compiler/BlockBuilder.ts) excludes hints
from display fragments, not from all outputs or consumers. The
[hint helpers](../packages/lang/src/metrics/hints.ts) distinguish compiler-consumed keys from
analytics-only keys. Neither fact licenses deletion of analytics-only data.

[`groupChildrenByLap`](../packages/lang/src/parser/syntax-parser.ts) appends compose-marked
children to the previous group; other children begin new groups. The semantic classifier also
emits [GroupMetric](../packages/lang/src/runtime/compiler/metrics/GroupMetric.ts).
[MetricPresentationPolicy](../packages/lang/src/metrics/presentation/MetricPresentationPolicy.ts)
recognizes `+`/`-` group metrics and keeps structural metrics visible on the debug surface;
the [review column definitions](../apps/playground/src/components/organisms/review/cdlColumnDefinitions.tsx)
include a group column. Equal child topology does not imply an inert group metric.

[ChoiceResolution](../packages/lang/src/runtime/compiler/metrics/ChoiceResolution.ts) owns
selection and structural collapse. It replaces the chosen group with a concrete `user-plan`
metric, removes a previous same-type plan pick, and defaults unresolved choices before execution
through [RuntimeFactory](../packages/lang/src/runtime/compiler/RuntimeFactory.ts). It also handles
a stale unresolved group beside an existing plan selection. These are transitions, not just
alternative values in a parse snapshot.

[The ownership ledger](../packages/core/src/ownership/ledger.ts) distinguishes raw contributions
from visible winners, preserves original order within winning layers, and supports suppression.
[JIT promotion](../packages/lang/src/runtime/compiler/JitCompiler.ts) clones statements before
appending promoted metrics. Equal visible values can conceal changed provenance or later override
behavior. [WQL derivation](../packages/wql/src/derivation.ts) copies stored metrics into event rows
and assigns summary coverage at workout, partition, or effort scope.

## 3. Boundary classification

| Candidate from the review | Category here | Decision |
| --- | --- | --- |
| Duplicate local expressions with the same effects and value | Cleanup | Remove after an exact before/after comparison. |
| P1 raw protocol/label fallbacks | Conditional cleanup | Consolidate only after correctness defines precedence and all input channels retain behavior. |
| P1 explicit group-head token position | Redesign | Changes where a keyword is meaningful; excluded. |
| P1 deletion of `workout.implicit_emom` / `behavior.time_bound` | Redesign if externally removed | No compiler branch is insufficient evidence; preserve emitted data here. |
| P3 deletion of `-` recognition | Redesign | Valid authoring would cease to work. |
| P3 dropping `group=round` but keeping `-` parsing | Redesign if observable | Debug, raw metrics, emitted/stored outputs, and row projections must retain it. |
| P4 retirement of WOD/cardio/yoga/habits dialects | Redesign | Changes hint output, registry/API behavior, and potentially suffix selection. |
| P6 removal of fractions, `@`, JSON, or modifier spellings | Redesign | Identical metrics after source migration do not preserve the original authoring contract. |
| P6 explanation of the existing modifier matrix | Documentation | Allowed only if accurate; no warning or newly rejected syntax implied. |
| Identity, malformed-value, precedence, or example corrections | Correctness | Separate review and baseline; never an equality exception hidden in cleanup. |

“Keep reading old data” alone is not enough for cleanup: changing newly written metrics still
changes an observable contract. Redesign may define a distinct historical-data reader, but that
is not permission for cleanup to strip fields, emit deprecation warnings, or rewrite author text.

## 4. Equivalence mechanism

### 4.1 Compare complete observations, not internal class names

Use a differential runner against a fixed reference revision and the candidate revision.
This is verification tooling, not a second production parser. Feed both the same source bytes,
fence metadata, registry contents, effort data, plan selections, user actions, and logical clock.
Use the actual production parser/compiler/runtime and public conversion/query entry points.

Capture the following ordered observations:

| Boundary | Required comparison |
| --- | --- |
| Parse and public statements | Success/diagnostics, statement text/spans, unique identities and references, parents, ordered child groups, dialect selection, full raw metrics and metadata. |
| Metrics | Type, value, unit, image, origin, explicit ownership layer, suppression, collectible state, nested choice alternatives/order, timer `required`, `forceCountUp`, and evaluated `direction`; retain undefined versus zero. |
| Compilation | Block type, labels, source associations, ordered display/promoted groups, timer/repeater/container configuration, exit/rest policy, sound cues, and observable compiler output. |
| Execution | Ordered mount/Next/pause/resume/expiry/child-exhaustion transitions, stack pushes/pops, current round/child selection, completion reasons, prompts and accepted/rejected actions. |
| Outputs | Output kind/order, source statement/block links, parent/depth, all raw and resolved metrics, hints, times/spans, elapsed/total, milestones, analytics emission and finalization behavior. |
| Persistence and review | Serialized field presence/values, round-trip read behavior, historical rows, debug/review visibility, derived tags and tag-filter membership. |
| Analytics and WQL | Segment annotations, per-effort identity and totals, workout summaries, units/provenance/coverage, event and summary rows, query membership/order/grouping/aggregates. |

Behavior class names are a secondary diagnostic, not sufficient proof. Conversely, names emitted
by `OutputEmitter.emitCompilerBlock` are observable debug data today; do not silently discard that
output when comparing a cleanup that renames behaviors. Configuration needs a test-side semantic
projection and execution evidence, not a production reflection framework.

Use a controlled clock and deterministic inputs first. For generated run-local block keys, compare
through a bijection that retains reference equality, parent relationships, and output association.
Never normalize away statement identity collisions, missing metrics, origin, child order, numeric
precision, hint data, completion reasons, or timer flags. Evaluate getter-backed fields explicitly:
serializing enumerable fields alone misses `DurationMetric.direction`.

Statement identity remains unique within a parse, with source spans separate. Historical output
references are compared as stored. They must not be reparsed or reassigned to a new statement by
line number or ordinal; a runner's run-local key mapping is not a persistence migration.

### 4.2 Exercise transitions and both persistence directions

Compile lazily through actual child entry, rather than compiling only root groups. Replay actions
before expiry, at expiry, after pause/resume, and at round exhaustion. Compare the observed rest
block and remaining duration when an interval finishes early. Cover both Next-driven and timer-
driven completion, including a parent whose child lifecycle controls advancement.

Compare fresh live outputs, their serialized form, and their restored analytics/query results.
Separately feed archived rows directly to the candidate reader, including historical hints,
missing time spans where supported, and old source references. Do not reparse the old workout as
a substitute for reading its results. Rebuilding derived rows must preserve metric temporal anchors
and summary coverage, not date observations from the rebuild clock.

The corpus is one input set. Add adversarial boundary cases and public API inputs because corpus
absence does not prove an exported entry point or supported syntax unused. For each candidate,
include one deliberately perturbed fixture that the comparison rejects, such as clearing
`required`, changing choice order, dropping a hint, or changing a metric origin. This establishes
that the gate observes the property the deletion claims to preserve.

## 5. Concrete candidate decisions

### 5.1 P1: conditional protocol decision consolidation

First adopt the correctness design's protocol precedence, including explicit protocol winning
over inference, without changing valid syntax. Only then can cleanup remove duplicate decisions.
One internal protocol/hint decision channel is acceptable **only** when all consumers preserve
their corrected behavior. Existing emitted behavior and label hints are data contracts, not
temporary aliases to delete as part of this consolidation.

Locate the common decision before strategy matching and label generation. It must distinguish
explicit protocol, inferred protocol, and no protocol; preserve the correctness-defined conflict
handling; and handle the existing exact `rounds` fallback without reserving new author text.
Use the existing Metric/Hint channel for this internal decision, not a parallel mutable protocol
state store or new authoring syntax. Preserve labels and raw Effort/Action metrics; do not mutate persisted statement metrics just to make a compiler predicate
shorter. If a safe shared boundary cannot cover every current input, retain the fallback.

In particular, exercise direct compiler statements, Action versus Effort, mixed keyword case,
substring matches, explicit versus implicit intervals, and custom/sport-scoped dialect stacks.
[DialectStack](../packages/lang/src/dialects/DialectStack.ts) exposes a live registry, resolves
`:sport`, and preserves transform/analyze order. A scoped stack can omit CrossFit analysis, so
“the parser always emitted the hint” is not a valid universal assumption.

Do not move [effort enrichment](../packages/lang/src/runtime/compiler/EffortEnrichmentPass.ts)
before compilation merely to reuse hints: it currently adds effort hints after JIT compilation.
Changing that timing could alter matching and belongs in a separately specified change.

### 5.2 P3/P4: preserve observable data; reject blanket deletion

Keep `-` recognition and its Group metric. Removing an independently proven redundant internal
branch is possible, but `groupChildrenByLap` already routes non-compose children through its
ordinary branch. There is no demonstrated separate structural path here to delete. Do not invent
a new abstraction to claim a cleanup, or drop a metric because LabelComposer excludes its type.

Keep [WodDialect](../packages/lang/src/dialects/WodDialect.ts),
[CardioDialect](../packages/lang/src/dialects/CardioDialect.ts),
[YogaDialect](../packages/lang/src/dialects/YogaDialect.ts), and
[HabitsDialect](../packages/lang/src/dialects/HabitsDialect.ts) registered and emitting existing
metrics. Their [public exports](../packages/lang/src/dialects/index.ts), registry IDs, ordering,
and suffix behavior also matter. Sharing private keyword-checking code is optional only if it
preserves each dialect's metric-type set, substring/case rules, emission order, and duplicate
handling; the variants are not identical enough to justify a generic rules engine by default.

Effort-registry analytics are not a replacement for these hints: equal summary values do not
preserve raw output tags or tag filtering. Retiring a domain's emitted metadata requires an
explicit redesign contract for both new writes and historical reads, not a cleanup normalizer.

### 5.3 P6 and a small proven-inert starting point

Keep every currently valid value/modifier spelling and the complete metric representation.
Document `?`, `*`, and `^` from actual parser/runtime behavior; do not infer that two equal numeric
values have the same timer or collection behavior. Choice collapse already has a shared owner;
reuse it rather than recreating selection in compiler or presentation code.

An immediate narrow candidate is GenericTimerStrategy's identical conditional arms:
`mode: isCountdown ? 'complete-block' : 'complete-block'` can become the constant mode.
This changes neither evaluation side effects nor the resulting value. Keep `isCountdown`, which
still controls exit and sound behavior, and preserve the separate interval reset policy.
This is a concrete cleanup, not evidence that the surrounding timer configuration is redundant.

## 6. Rollout and review boundaries

1. Record the reference revision, source/registry inputs, execution scenarios, and observation
   schema. Establish the complete comparison before deleting a behavioral decision.
2. Land correctness separately. Its review records each intentional old/new observation and
   reason. If correctness changes an input's result or rejects it, that is not an equivalence
   success; retain its regression case and start cleanup from the corrected reference revision.
3. Land the constant-mode simplification as one reviewable change. For protocol consolidation,
   migrate every internal caller in one cutover only after its full input contract is covered.
4. Delete only the displaced internal path. No dual production parser, temporary syntax alias,
   source rewriting, or deprecation warning is introduced. Historical data readers remain their
   own compatibility contract, not competing parsers of newly authored syntax.
5. Review the observation diff with the code diff. Any unexplained change blocks that candidate.
   A newly discovered desirable correction returns to category 1; an intended syntax/data loss
   returns to category 3. Neither receives an ad hoc cleanup allow-list entry.

Retain focused regression cases for uncertain transitions and precedence; use differential
artifacts for broad corpus coverage rather than checking in huge implementation snapshots.
The final release gate is zero unexplained observable differences against the corrected baseline,
with no source or storage migration required by this category.

## 7. Acceptance cases and risks

These are proposed comparison cases, not a report of executed checks. Examples use existing
authoring forms; no proposed syntax is introduced by this document.

| Case | Required observable result before and after cleanup |
| --- | --- |
| `5:00 Row`, `^5:00 Row`, `*:30 Rest`, `:? Bike` | Same parser flags/origins and effective direction; same early-Next behavior, completion, prompts, spans, labels, and output values. |
| Numeric duration supplied at runtime origin | Same generic-timer eligibility; no promotion of a recorded result into a new authored timer. |
| `(6) :60 EMOM` with children; corresponding implicit interval; explicit AMRAP | Same corrected protocol selection and complete timer/repeater configuration; same interval reset/rest and round/parent completion traces. |
| `FOR TIME`, `TABATA`, mixed case, Action/Effort API metrics, scoped/custom dialect | Same corrected inference/explicit precedence, labels, hints, and matching through every supported entry point. |
| `Run \| Walk`, `185 \| 125 lb` | Same alternatives/order, default pick, re-selection, stale-group handling, `user-plan` origin, concrete compiled metrics, effort identity, and load/reps totals. |
| Parent load with child override and later user entry | Same raw contributions, layer winner, suppression and promotion behavior; no flattening away provenance or parent/child scope. |
| Siblings with no marker, `-`, and `+`; deeper nesting | Same ordered child groups and execution order for each source; retain Group metrics, source links, debug output, and supported depth. |
| Cardio, WOD, yoga, habits, and climb inputs | Same dialect selection, full hint/domain metric payload, serialized hints, review tags, and tag-filter membership. |
| Historical stored rows and new runtime outputs | Same field presence, read normalization, output filtering/deduplication, event timestamps, summary coverage, WQL results, and persisted source references. |
| Repeated effort across rounds, pauses, and finalization | Same segment annotations, effort slug/discipline/intensity identity, reps/volume/sets and workout summaries; no duplicate or missing emissions. |

Primary risks are incomplete observation coverage, treating public API inputs as impossible,
conflating visible winners with raw data, and over-normalizing clocks or identities. Mitigate them
with consumer-boundary comparisons and controlled action traces, not larger lists of behavior
classes. Protocol consolidation is the highest-risk candidate because current recognition paths
are not equivalent and extensions can alter analysis. Keep it conditional; leaving a path intact
is preferable to calling a breaking deletion “cleanup.”
