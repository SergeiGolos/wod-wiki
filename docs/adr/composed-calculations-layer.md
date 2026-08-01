# Composed Calculations Layer for Dialects, Efforts, Annotations & Summaries

**Status**: Accepted — 2026-08-01  
**Decided on Map**: [#843 (Wayfinder Map: Composable Calculations)](https://github.com/SergeiGolos/wod-wiki/issues/843)  
**Refers to**: [#844](https://github.com/SergeiGolos/wod-wiki/issues/844) (language), [#845](https://github.com/SergeiGolos/wod-wiki/issues/845) (lookups), [#846](https://github.com/SergeiGolos/wod-wiki/issues/846) (streaming/scopes), [#848](https://github.com/SergeiGolos/wod-wiki/issues/848) (applicability), [#849](https://github.com/SergeiGolos/wod-wiki/issues/849) (migration), [#850](https://github.com/SergeiGolos/wod-wiki/issues/850)/[#864](https://github.com/SergeiGolos/wod-wiki/issues/864) (rollup/series), [#851](https://github.com/SergeiGolos/wod-wiki/issues/851) (dimensions), [#863](https://github.com/SergeiGolos/wod-wiki/issues/863) (authoring UX), [#865](https://github.com/SergeiGolos/wod-wiki/issues/865)/[#869](https://github.com/SergeiGolos/wod-wiki/issues/869) (normalization & grains).

## Context

Today every analytics calculation in WOD Wiki — Tier-1 per-segment line annotations (`PaceEnrichmentProcess`, `PowerEnrichmentProcess`) and Tier-2 workout summaries (`RepProjectionEngine`, `DistanceProjectionEngine`, `VolumeProjectionEngine`, `SessionLoadProjectionEngine`, `MetMinuteProjectionEngine`, `TISProcessor`) — is an imperative TypeScript processor class.

This shape causes three recurring issues:
1. **Lack of dialect & effort composability:** Dialects and sport efforts cannot declare their own derived calculations without modifying the core TypeScript codebase and re-deploying.
2. **Duplicated logic & hidden fallbacks:** Simple maps (e.g. `effortToRpe`) and fallback heuristics (RPE defaults, VO₂max population averages, hierarchy-aware duration logic) are duplicated across processors (`SessionLoadProjectionEngine` and `TISProcessor`) with hardcoded defaults.
3. **Dual systems risk:** Rollup facts (ACWR, monotony, strain) were evaluated lazily by a separate driver (`rollupDriver.ts`), creating divergent timing and persistence contracts across workout summaries.

## Decision

We introduce a **Composed Calculations Layer** where Tier-1 annotations and Tier-2 summaries are declared as expressions over aggregate builtins, WQL store selections, and generic lookup tables — replacing hand-written TypeScript processors.

### Key Architectural Invariants

1. **Definition as Node DAGs with Line-Form Authoring:**
   - Calculations are represented internally as directed acyclic graphs (DAGs) of named nodes. Output calculations publish results under Canonical Metric Keys (`totalVolume`, `tis`, `calc.*`); library calculations (`kind: library`) export nodes without publishing to the store.
   - Authors write expressions in a **line-oriented syntax** (`name = expr -> unit when predicate`, review doc §11). Lossless round-tripping between line form and DAG records is an enforced invariant.

2. **Three Evaluation Scopes & Single Expression Language:**
   - **Segment scope:** Evaluates per-line. Atoms are current-segment metrics (`reps`, `elapsed`, `resistance`, `distance`) and context nodes (`effort`). Appends `analyzed` metrics to the segment's `OutputStatement` (Phase 1).
   - **Workout scope:** Evaluates running totals over the workout log stream after each segment (Phase 2). Atoms are aggregate builtins over the stream (`sum(reps)`, `max(effortRpe)` with optional effort-exclusion like `without: rest|pause|rest-*`) and context nodes (`session.duration`).
   - **Store scope:** Evaluates cross-workout calculations over the Analytics Store at workout finalize. Atoms are full WQL selections (`sum:sessionLoad{} by {day}`) executed by `QueryService`.
   - WQL selection atoms are legal in **store scope only** (where `QueryService` executes them). No parallel log-stream WQL executor is built.

3. **Series Tier for Store-Scope Windows:**
   - Grouped store-scope selections (`sum:sessionLoad{} by {day}`) yield series values.
   - Operations: `windowMean`, `windowSum`, `windowSd` (series→series over trailing periods like `7d`), pointwise arithmetic on same-bucketed series, and scalar reductions (`sum`, `mean`, `min`, `max`, `last`).
   - Absorbs Rollup Facts: ACWR (`windowMean(daily, 7d) / windowMean(daily, 28d)`), monotony, and strain are expressed as store-scope calcs under `calc.*`. The lazy `rollupDriver.ts` is deleted; timing unifies on eager-at-finalize.

4. **Layered Lookup Registry (`lookup(table, key, field)`):**
   - Tables are registered adapters over existing sources: `effort` delegates to `IEffortResolver` (preserving fuzzy matching, aliases, derivation, and modifiers), `disciplines` wraps `DISCIPLINE_FACTORS`, `profile` wraps user profile (VO₂max), `rpe-labels` maps effort labels to RPE.
   - Precedence: bundled → dialect/effort-registered → user-defined (IndexedDB, `Registry<T>` last-wins).
   - Single-row lookups; multi-effort aggregation uses segment-scope nodes + workout-scope aggregate functions (`sum(metMinutes)` pattern). Miss policies: `absent` (profile/disciplines) vs `default-row` (effort table returns synthetic-unresolved row).

5. **Dimension-Aware Evaluation & Static Checking:**
   - Values carry (number, unit, dimension) as exponent vectors over `{length, mass, time, count, energy}`.
   - Arithmetic performs vector algebra (`time ÷ length` → `pace`). `convert(x, unit)` performs vector-checked scalar conversion.
   - Named zero-vector units (`AU`, `pts`, `MET-min`, `ratio`) act as **authoritative casts** — declaration wins over computed dimension.
   - All dimension and unit checks occur **statically at registration time**; invalid dimension math or mismatched units fail registration, never runtime.

6. **Dynamic-Only Applicability & Variant Selection:**
   - Applicability is declared entirely via `when` predicates in the expression language (evaluating presence, comparisons, lookups). No static `fenceTypes`/`requiredMetrics` tier.
   - Variants share an output key; priority descending determines evaluation order (first applicable wins). Missing data in a predicate evaluates to `false` — variants are the explicit mechanism for handling missing inputs.
   - Static declared origin per variant (`analyzed` vs `analyzed-estimated`). Workout aggregates use author-managed companion counts (`sum(metMinutesEstimated) > 0` → estimated variant).
   - Replay strips `analyzed` outputs, but freezes `analyzed-estimated` predictions per `CONTEXT.md`.

7. **Store Normalization & Three-Grain Model:**
   - Published fact rows carry key = Canonical Metric Key + sorted group tags (`totalVolume:effort=thruster`), keep-last deduplicated per result.
   - Facts publish across three grains: `summary` (Tier 2 workout aggregates), `rollup` (store-scope series facts), and `segment` (Tier 0/1 atomic metrics and composed line annotations), revising ADR `analytics-store-summary-only` (2026-07-16) to align with shipped V13 threshold-filter capabilities.
   - `WorkoutResult.data.logs` remains the sole authoritative source for a single workout; the store remains a disposable, re-derivable projection index.

8. **Authoring UX & Parity Migration:**
   - Authoring surface: calc-line editor with contextual typeahead, live diagnostics, and real-time preview against stored workouts (`/proto/calc-authoring`).
   - Migration executed via a **parallel-run parity harness**: replays fixture workout logs through old processors and the new calc engine, exact-diffing outputs with a signed accept-list for deliberate improvements (e.g. pace un-rounding). Cutover proceeds along the difficulty ladder (distance → reps → pace/power → volume → metMinutes → sessionLoad → TIS), ending in a single pass that deletes the 8 legacy processor classes.

## Consequences

- **Deletes ~600 LOC of imperative scan loops** across 8 processor classes, replacing them with ~25 lines of declarative calc definitions.
- **Deletes `rollupDriver.ts` and `ensureRollupFacts()`**, unifying all cross-workout fact generation under the calc engine at finalize time.
- **Enables custom dialect and effort calculations** without code modifications.
- **Revises ADR `analytics-store-summary-only`** to document the three-grain model (`summary`/`rollup`/`segment`) and protect threshold-filter query capabilities.
