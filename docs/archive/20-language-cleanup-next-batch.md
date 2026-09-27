# Language Cleanup — Next Batch

**Status:** Proposed. No implementation is claimed here.
**Category:** Execution plan for the behavior-preserving cleanup defined in
[the cleanup design](18-language-behavior-preserving-cleanup-design.md). This document does not
supersede it; it sequences the first implementable batch and records the audit that grounds it.

## 1. Audit result (2026-09-13)

Doc 18's §2 baseline was verified claim-by-claim against source (six parallel evidence passes,
file:line level). Result: the baseline is accurate; none of the proposed work has started.

### 1.1 Verified as described (no action)

| Area                               | Key evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duplicate protocol predicates      | [CrossFitDialect](../packages/lang/src/dialects/CrossFitDialect.ts) substring `hasKeyword` + hint pairs + 3-hint implicit EMOM (L24-84); [AmrapLogicStrategy](../packages/lang/src/runtime/compiler/strategies/logic/AmrapLogicStrategy.ts) L32-40 and [IntervalLogicStrategy](../packages/lang/src/runtime/compiler/strategies/logic/IntervalLogicStrategy.ts) L38-47, both priority 90; [JitCompiler](../packages/lang/src/runtime/compiler/JitCompiler.ts) applies every match (L60-73) and clones before promotion append (L45-52); [LabelComposer](../packages/lang/src/runtime/compiler/utils/LabelComposer.ts) hints-first + uppercase fallback + identity filter re-deriving keyword spelling (L94-128).                                                                                                                                                                                                                  |
| Timer chain                        | [semantic-classifier](../packages/lang/src/parser/semantic-classifier.ts) passes trend+required (L61) and emits `behavior.required_timer` separately (L63-65); [DurationMetric](../packages/lang/src/runtime/compiler/metrics/DurationMetric.ts) `direction` getter short-circuited by `forceCountUp` (L93-96), `:?` → undefined value + `hinted` origin (L36-43); [GenericTimerStrategy](../packages/lang/src/runtime/compiler/strategies/components/GenericTimerStrategy.ts) excludes runtime-origin durations, reads required/rest hints (L34-55), `isCountdown` still gates exit (L90-94) and sound (L101-106); timer options forwarded to [BlockBuilder](../packages/lang/src/runtime/compiler/BlockBuilder.ts) with conditional rest factory (L243-266).                                                                                                                                                                    |
| Emitted data contracts             | [OutputEmitter](../packages/lang/src/runtime/OutputEmitter.ts) `emitLoad` copies statement metrics (L263-291), `emitCompilerBlock` emits behavior class names (L427-447); [toStoredOutputStatement](../packages/lang/src/conversion/toStoredOutputStatement.ts) preserves metrics + separate `hints` field (L18-36); [AnalyticsTransformer](../packages/lang/src/analytics/AnalyticsTransformer.ts) derived `tags` + `filterByTags` (L174, L232-241); [hints.ts](../packages/lang/src/metrics/hints.ts) consumed-vs-analytics-only split (L24-69).                                                                                                                                                                                                                                                                                                                                                                                |
| Groups / choices / ownership / WQL | `groupChildrenByLap` has no separate `-` structural path ([syntax-parser](../packages/lang/src/parser/syntax-parser.ts) L115, L348-366); structural `+`/`-` groups debug-visible ([MetricPresentationPolicy](../packages/lang/src/metrics/presentation/MetricPresentationPolicy.ts) L46-58); group column present ([cdlColumnDefinitions](../apps/playground/src/components/organisms/review/cdlColumnDefinitions.tsx) L630, L848); [ChoiceResolution](../packages/lang/src/runtime/compiler/metrics/ChoiceResolution.ts) `user-plan` swap + stale-group default (L41-109), invoked from [RuntimeFactory](../packages/lang/src/runtime/compiler/RuntimeFactory.ts) before runtime construction (L91 vs L106); [ledger](../packages/core/src/ownership/ledger.ts) raw/visible/order/suppression (L48, L118-146); [derivation](../packages/wql/src/derivation.ts) metric copy + effort/partition/workout coverage (L243, L291-295). |
| Dialects                           | All seven registered in order Units→CrossFit→Wod→Cardio→Yoga→Habits→Climb; live registry, `:sport` aliasing, transform→analyze order ([DialectStack](../packages/lang/src/dialects/DialectStack.ts) L21-23, L76-91, L111-118, L139-172).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Enrichment timing                  | [EffortEnrichmentPass](../packages/lang/src/runtime/compiler/EffortEnrichmentPass.ts) runs strictly after `jit.compile` (sole caller `CompileAndPushBlockAction.ts:32→39-43`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Cross-references                   | Docs 16/17/19 exist; doc 16's superseded items P1/P3/P4/P6 match doc 18's table; `?`/`*`/`^`/`-`/`+` markers exist in the parser.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

### 1.2 Described but absent (the actual work backlog)

1. §4 differential/observation harness — nothing equivalent exists (only unrelated
   fingerprint-dedup code and the narrow `analytics-contract` invariant test).
2. §5.3 constant-mode simplification — `mode: isCountdown ? 'complete-block' : 'complete-block'`
   still verbatim at [GenericTimerStrategy](../packages/lang/src/runtime/compiler/strategies/components/GenericTimerStrategy.ts) L70.
3. §5.1 protocol consolidation — not started, and its precondition (doc 17's explicit-beats-inferred
   precedence) is also not implemented.
4. §7 acceptance cases — unexecuted, as the doc states.

### 1.3 One wording correction owed

Doc 18 §2.3 says the stored-log reader performs "output-type normalization". Code shows an
exclusion filter keeping `segment | analytics | milestone` plus a `?? 'segment'` default
([AnalyticsTransformer](../packages/lang/src/analytics/AnalyticsTransformer.ts) L181, L346-352) —
no legacy value remapping. Timestamp normalization is real (flat `timestamp` → `timeSpan.started`,
L342; legacy field in `core/src/types/results.ts:28`). Fix the sentence, no behavior change.

## 2. Batch scope

Ordered by dependency. W1 is independent and unblocks nothing; W2 is the critical path for every
candidate after it.

### W1 — Constant timer mode (one reviewable change)

`GenericTimerStrategy.ts` L70: replace the ternary with `mode: 'complete-block'`.
Keep `isCountdown`; it still controls exit policy (L90-94) and sound cues (L101-106).

This lands ahead of the harness deliberately: both arms are the same token, so equivalence holds
by inspection and no observation can differ. Doc 18's gate is for deleting behavioral decisions;
this deletes none. It also pilots the review process W2 will enforce.

Acceptance: no ternary remains; existing timer strategy tests pass unchanged; diff touches one line
plus this document's tracking note.

### W2 — Observation harness (the §4 gate, first slice)

Build the differential runner skeleton, not the full seven-boundary matrix at once.

- Input: reference revision + candidate revision; same source bytes, fence metadata, registry,
  effort data, selections, actions, controlled clock.
- Phase-1 boundaries: parse/statements, metrics (including getter-backed fields — serialize
  `DurationMetric.direction` explicitly), compilation. Execution/persistence/WQL boundaries join
  before W3 starts, per doc 18 §4.1.
- Perturbed-fixture gate (§4.2): the harness must reject at least one fixture per perturbation
  class — cleared `required`, changed choice order, dropped hint, changed metric origin.
- Run-local block keys compared through the reference-equality bijection doc 18 §4.1 requires.

Acceptance: candidate = reference produces zero diffs on the corpus plus boundary cases; every
perturbed fixture is rejected with a named observation. ponytail: phase-1 covers three of seven
boundaries; extend before any consolidation work — that is the ceiling, not the goal.

### W3 — Out of scope until W2 is complete

- Doc 17 correctness precedence (explicit protocol beats inference), then doc 18 §5.1
  consolidation as a single cutover.
- Dialect keyword-code sharing (doc 18 §5.2 marks it optional; current duplicates verified — likely
  never worth it).
- P3/P4/P6 deletions: rejected by doc 18 §3; no work exists here. Audit's only follow-up is the
  §1.3 doc correction.

## 3. Risks

- W2 scope creep: seven boundaries is the end state, not the first PR. Phase-1 slice must still
  cover every field W1's successors (W3) can mutate — protocol hints, choice order, origins, timer
  flags — or the gate is theater.
- `emitCompilerBlock` emits behavior class names (verified L427-447): any W3 rename is an
  observation diff and must be justified, not suppressed.
- Compose-lap edge (`+` as first child starts a new group, `groups.length > 0` guard) is part of
  the observation set; do not "fix" it during cleanup.
