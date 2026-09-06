# Query documents, formulas, and attached calculations

Labels: wayfinder:implementation
Type: implementation
Status: open
Assignee: unassigned
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 11, 12, 13, 16
Prerequisites: [Query documents and formulas contract](../assets/query-documents-contract.md); [Missing values, units, and numerical correctness contract](../assets/arithmetic-contract.md); [Implementation work breakdown and acceptance coverage](../assets/implementation-work-breakdown.md)

## Outcome

A query block is a self-contained document: optional `defaults`, named query/formula assignments with dependency-ordered evaluation, explicit `show`. Formulas evaluate post-aggregate over the WQL Alignment Domain or pre-aggregate per segment via `each(...)`; typed selectors, array operations, and `corr` work; the same expression capability drives attached effort/dialect calculations that record metrics.

## Scope

1. **Document parsing.** Extend the [Lezer grammar](../../../../packages/wql/src/grammar/wql.grammar) and AST mapper ([`wql.ts`](../../../../packages/wql/src/wql.ts)) to a `QueryDocument`: `defaults [by {…}] [window]` line; `<ident> = <query | expression> [(normalize <bucket>)] [-> <unit>]` assignments; `show <ident>, …`. Suffix handling stays consistent with [`wqlSuffix.ts`](../../../../packages/wql/src/wqlSuffix.ts); [`serialize.ts`](../../../../packages/wql/src/serialize.ts) round-trips documents losslessly. Single-query blocks parse as a degenerate document — zero behavior change.
2. **Scoping and evaluation order:** strictly block-local names; forward references allowed; evaluation follows the reference graph; cycles produce a document-level diagnostic. Defaults precedence: explicit per-query range/grouping > block defaults > host; explicit per-query `by {…}` fully replaces block grouping (never merges). Host tokens (`$name`) enter as parameter bindings only.
3. **Formula evaluation.** `IFormulaEvaluator` interface defined in `packages/wql`; the Pratt parser/evaluator from [`packages/lang/src/analytics/calc`](../../../../packages/lang/src/analytics/calc) is adapted behind it and **injected** (umbrella `packages/engine` / app composition) so `wql` gains no dependency on `lang`. WQL evaluation enforces strict dimensions and rejects the calc engine's authoritative casts (13's policy).
   - Post-aggregate formulas evaluate pointwise over the Alignment Domain: intersection of input requested ranges (12's context), union of observed group tuples, mismatched bucket specs → diagnostic + persisted `(normalize <bucket>)` intent (user-selected target; recomputed from eligible observations/summaries, never from chart values), mismatched grouping sets → error (no broadcasting). Presence rules per the arithmetic contract (missing operands zero for math; missing-derived zeros excluded from downstream ordinary averages; errors propagate).
   - `each(expr)` pre-aggregation scope: operands resolve within the segment; outer aggregator applies equal observation weighting.
   - `field("path", "kind", "dimension")` typed selector usable in query heads, `each(...)`, and table columns (18 reuses it).
   - Array operations `expand(f)` (element population, equal element weighting), `mean(f)` (per-segment reduction), `at(f, i)` (zero-based) — explicit only.
   - `corr(a, b)`: Pearson over paired in-range positions; either-side-missing pairs excluded (no zero-fill); pair count reported; source series keep full ranges.
4. **`DocumentResult` contract:** ordered `show` outputs with names, units, group/bucket identity, presence/validity/partial state, and pair/coverage metadata — widget-independent (consumed by ticket 19).
5. **Attached calculations (map's required additional consumer).** Author a named calculation on an effort definition or Block Dialect using the same expression capability; the analytics engine executes it for matching data at its declared scope and records the output as a metric observation (existing processor seams — `createCalcEngine`/summary processors). Rules: effort-specific definition overrides the same-named dialect calculation for that effort only; workout-level effort calculations aggregate only that effort's segments (one observation per effort per workout); segment-level attachments emit per matching segment; the winning definition executes once — no duplicate emission; producing-scope observation ownership per the grain contract.

## Clean cutover

- The proposal's inline `show a / b -> km/hr` form is superseded by named assignments + comma `show`; do not implement both.
- `dashboard/model.ts` `isProposedMetric` gating moves to AST-based checks within the document model; string matching over query text disappears (19 finishes the `.includes('calc.')` removal).

## Acceptance scenarios

From the [query documents contract](../assets/query-documents-contract.md) and roadmap Phase 5:

1. The `defaults by {week} last 4w` + `distance/elapsed` speed document evaluates per week; `show distance, speed` returns both outputs in order with distinct units and grouping.
2. Single-query blocks execute byte-identically to today (existing `QueryService.test.ts` corpus passes unchanged).
3. `a = b + 1; b = a + 1` yields a cycle diagnostic; reordering definitions never changes results (forward references).
4. Per-segment `avg:each(distance / elapsed){}` over `100m/10s` and `100m/100s` averages to `5.5 m/s`, while `sum:distance / sum:elapsed` gives `200/110` — both selectable, never conflated.
5. `avg:expand(heartRates)` over arrays `[100,100,100]` and `[200]` = `125`; `avg:each(mean(heartRates))` = `150`; `at(heartRates, 0)` selects first elements.
6. `sum:field("score", "number", "mass"){}` selects the numeric mass variant only; short `sum:score{}` auto-selects when unambiguous.
7. `corr` over series with disjoint missing positions uses only paired positions and reports the pair count; zero-variance input yields the agreed undefined result, not a crash.
8. Daily-vs-weekly input mismatch raises the diagnostic; `(normalize 1w)` persists with the document, survives reload, recomputes from observations, and fails honestly when detail is absent.
9. An effort-attached pace calculation records one metric per matching effort per workout; a dialect default keeps applying to other efforts; re-running the workout replaces, not duplicates.
10. Dimension-incompatible formula output (`distance / duration -> kg`) errors locally; unrelated outputs in the same document still render.
