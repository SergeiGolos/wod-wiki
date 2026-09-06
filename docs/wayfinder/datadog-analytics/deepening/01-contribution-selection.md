# Deepening the Contribution-Selection Module: one answer per population

Status: **Proposed architecture; not implemented or an approved amendment.** All proposed types and function names below are illustrative sketches, not accepted decisions or runnable code.

Related work: [ticket 16 — contribution selection](../issues/16-contribution-selection.md), [automatic grain contract](../assets/automatic-grain-contract.md), [field discovery contract](../assets/field-discovery-contract.md), [implementation work breakdown](../assets/implementation-work-breakdown.md).

Read alongside [metric derivation](03-metric-derivation.md) (the lineage this selection consumes), [unit policy](02-unit-policy.md) (reducer capability and dimensional compatibility), and [transactional storage](07-transactional-storage.md) (finalize/replace mechanics that make dedupe stable).

## 1. What improves

The useful change is not making `QueryService.ts` smaller. Its injected-store seam is the good part — [`stores.ts`](../../../../packages/wql/src/stores.ts) keeps the executor 100% storage-free, and that seam should survive untouched. The shallow part is narrower: three execution paths each invent their own answer to "which stored rows may contribute to this aggregate?" and the answers disagree.

- `run` projects **every** event row to a fact and filters by metric key — event grain and summary grain both contribute, so one logical observation arrives twice.
- `applyEffortScope` answers effort attribution with a **global** "does any attributed row exist?" probe, silently discarding unattributed observations across unrelated workouts.
- `deriveMetricFacts` (the content-join path) hard-filters to `grain === 'summary'`, so a content-joined query sees a *different population* than the equivalent direct query.

A contribution-selection Module hides four decisions that no caller should restate: coverage evaluation (does this summary prove the requested population?), dedupe by semantic observation identity, strict grain constraints, and effort/metadata applicability. Callers receive `contributions`, `limitations`, and `ignored` — never raw rows to re-judge.

- **Locality:** the invariant "one complete, non-overlapping representation of the requested population" has one Implementation.
- **Leverage:** `run`, `runJoined`, and `applyMetricJoin` stop maintaining three divergent selection policies; query documents and drill-down (tickets 17–19) inherit the same contract.
- **Deletion test:** deleting the Module forces every execution path to rebuild coverage logic, dedupe, and effort ownership from scratch. Extracting `applyEffortScope` into its own file would not provide that Depth — the policy would still be private knowledge of whichever path called it.

## 2. Current code and data

### One observation, two contributions

**Abridged current excerpt** (elided lines load note tags only), [QueryService.ts:719–727](../../../../packages/wql/src/QueryService.ts#L719-L727):

```ts
    const candidates = eventRows
      .flatMap(projectEventToFacts)
      .filter(row => matchesMetric(row.metricKey, parsed.metric));
    …
    const matched = this.applyEffortScope(
      candidates.filter(row => matchesFilters(row, parsed.filters, noteTags)), parsed,
    );
```

Nothing here distinguishes a directly recorded observation from a summary representation or a copy. Both grain kinds flow through [`projectEventToFacts`](../../../../packages/wql/src/derivation.ts#L264-L339), which emits one fact per numeric metric per row. The writer appends per-statement events and folded summaries from the same logs ([IndexedDBNotePersistence.ts:211–216](../../../../apps/playground/src/services/persistence/IndexedDBNotePersistence.ts#L211-L216)); an analytics output carrying `metadata.canonicalKey` can therefore produce the same `totalVolume` fact through both paths.

**Concrete data example (source-proposal reported, not runtime-verified here):** roadmap defect 3.2 reports that one workout computing `totalVolume = 100` stores an event row projecting a `totalVolume` fact of 100 **and** a summary row projecting a `totalVolume` fact of 100, so today's `sum:totalVolume{} last 30d` sums both — **200** for a workout whose true total is 100. This reading is consistent with the code paths shown above; this doc did not execute it against a live store. It is contract acceptance example 1 ("contributes 100 kg, not 200 kg").

The fold itself already knows these rows are the same logical value — it dedupes keep-last per rowKey inside one result ([derivation.ts:100–124](../../../../packages/wql/src/derivation.ts#L100-L124)). What is missing is carrying that identity *across* the event/summary boundary into selection.

### Global effort suppression

**Current excerpt**, [QueryService.ts:927–940](../../../../packages/wql/src/QueryService.ts#L927-L940):

```ts
  private applyEffortScope(matched: AnalyticsDataPoint[], scope: { filters: TagFilter[]; groupBy: string[] }): AnalyticsDataPoint[] {
    if (scope.groupBy.includes('effort') || scope.filters.some(f => f.key === 'effort')) {
      return matched.some(r => r.effortSlug !== undefined)
        ? matched.filter(r => r.effortSlug !== undefined)
        : matched;
    }
    return matched.some(r => r.effortSlug === undefined)
      ? matched.filter(r => r.effortSlug === undefined)
      : matched;
  }
```

`matched.some(...)` is evaluated over the **whole query result**. In the effort-grouped branch, one attributed row suppresses unrelated unattributed observations; in the ungrouped branch, any unattributed row suppresses attributed ones. For the contract's 5 km running plus 3 km unattributed example, neither global rule preserves the required 8 km population. The grouped result also loses the unassigned group (defect 3.8).

### Summary-only join projection

**Current excerpt**, [QueryService.ts:942–953](../../../../packages/wql/src/QueryService.ts#L942-L953):

```ts
  private async deriveMetricFacts(
    contentIds: Iterable<string>,
    metricKey: string,
  ): Promise<AnalyticsDataPoint[]> {
    const ids = [...new Set(contentIds)];
    const rows = await Promise.all(ids.map((blockContentId) => this.store.getEventsByContent(blockContentId)));
    return rows
      .flat()
      .filter((row) => row.grain === 'summary')
      .flatMap(projectEventToFacts)
      .filter((f) => f.metricKey === metricKey);
  }
```

The `grain === 'summary'` filter means `sum:distance{grain:event} where find:block{...}` (ticket 16 acceptance 6) silently reads a different population than the same metric without the join (defect 3.7). Selection is currently three policies, not one.

### Weighting: pooled averages and calculated observations

The contract's two arithmetic anchors, stated here because selection must feed aggregators the right population:

- Ten observations of 1 m/s plus two of 2 m/s: pooled **14/12 ≈ 1.1667**, never the mean-of-means 1.5. A substitute summary serves this only if it retains sum **and** true observed count.
- A newly calculated workout-level `sessionLoad` of 200 and one of 400 average to **300** — one observation each at their producing scope. A calculated observation is *not* weighted by its input count (ten segment inputs do not make ten session-load observations).

Selection decides which representation reaches the aggregator; the reducer-capability matrix that decides *whether* a summary may serve an operation lives in [unit policy](02-unit-policy.md) per ticket 13/16. This doc does not duplicate it.

## 3. Proposed Interface

Keep one internal Module behind the existing QueryService Interface. The following exported-looking TypeScript declarations illustrate its internal contract; they need not become public package exports. Coverage helpers remain private. The test surface is the same query Interface callers use, with focused pure selection tests only where they defend an independent invariant.

```ts
// Proposed sketch — illustrative names, not decided code.
export interface ContributionSelectionInput {
  candidates: readonly ContributionCandidate[]; // projected facts + representation lineage (doc 03)
  metric: TypedMetricSelector;                  // typed identity from field discovery (ticket 11)
  operation: ReducerRequirement;               // reducer, scope, and required sufficient statistics
  temporal: ResolvedTimeDomain;                // civil/instant eligibility, bounds, inclusivity, buckets, timezone
  scope: {
    filters: readonly TagFilter[];              // contextual metadata ALREADY resolved (see caller sketch)
    groupBy: readonly string[];
    grain?: 'event' | 'summary';                // explicit constraint — strict
  };
}

export interface ContributionSelection {
  select(input: ContributionSelectionInput): SelectionResult;
}

export interface SelectionResult {
  contributions: readonly ContributionCandidate[]; // one representation per logical observation/summary
  ignored: readonly IgnoredRef[];                  // bounded compact refs (reason + count); detail on demand
  limitations: readonly SelectionLimitation[];     // insufficient evidence / strict-grain misses
}
```

`ignored` carries bounded references only — enough for the explainability contract's compact coverage summary (ticket 16 scope item 6); full lineage resolves on demand through the drill-down ticket (18), not eagerly in every result.

**Caller sketch** (one contract for direct and joined execution):

```ts
// Proposed sketch — replaces both the blanket projection in run() and the
// summary-only filter in deriveMetricFacts().
const resolved = facts.map(f => this.metadataResolver.resolve(f)); // effort → note → workout → segment
                                                                   // precedence; winning source kept as provenance
const result = this.selection.select({
  candidates: resolved,
  metric: parsed.metric,
  operation: reducerRequirement(parsed),
  temporal: resolvedDomain, // preserve unbounded sides and civil dates; no invented 0..MAX interval
  scope: { filters: parsed.filters, groupBy: parsed.groupBy, grain: parsed.grainConstraint },
});
if (result.limitations.length) return this.buildLimitedResult(parsed, result.limitations);
const matched = result.contributions;
```

`ReducerRequirement` and `ResolvedTimeDomain` are proposed semantic inputs, not existing exports. The latter must preserve the time contract's half-open buckets, inclusive captured-now cutoff, explicit civil-date endpoints, and partial coverage. A pair of epoch numbers alone cannot express that contract.

`run`, `runJoined`, and `contentIdsSatisfying` all call this same `select`. The join stops imposing summary grain; content relationships constrain *population*, not grain — exactly the contract's "joined and non-joined aggregate execution use the same selection contract."

### Hidden Implementation responsibilities

- **Coverage evaluation:** match a summary's declared coverage/partitions and retained reducer statistics against the requested operation, filters, grouping, and weighting. A summary without shoe partitioning cannot answer `by {shoe}`; a mean-only summary cannot serve a pooled average. Exact coverage schema: **not settled here** — flagged below.
- **Dedupe:** collapse duplicate representations by semantic observation identity and representation lineage (derivation doc 03), never by numeric equality or block content id. Reaching the same observation through two note/block/result paths adds nothing.
- **Strict grain:** an explicit `grain:event`/`grain:summary` constraint filters *representations*; if the surviving set cannot answer, emit a limitation — never silently fall back to the excluded grain (acceptance 9/10).
- **Effort ownership (result-local):** per workout/result and typed metric — an overall summary is never relabeled "unassigned"; totals use either a complete overall summary or complete disjoint parts; grouping keeps genuinely unattributed observations in a structural unassigned group. The global `some()` probe is deleted, not wrapped.
- **Metadata applicability:** which effort/note/workout/segment-resolved fields a given representation can filter/group on, per the field contract's precedence (effort defaults → note → workout → segment; explicit null clears).

### Proposed data example (same input, new output)

Same workout as §2: the composed calc `totalVolume = 100` is emitted as an event row and folded into a summary row — **one calculated observation with two representations**, not an observation plus an arbitrary substitute summary.

- Both candidates share one `observationRef`; the event row is the producing representation (`kind: 'calculated'`), the folded summary row is a `duplicate` representation of the same observation (a finalize-owned copy). (When a summary instead compresses a *population* of detail observations, it is a `substituteSummary` with an exact coverage descriptor — the other case selection must handle.)
- `select` returns **one** contribution (value 100) and a bounded `ignored` ref naming the dropped duplicate with reason `overlapping-coverage`.
- `sum:totalVolume{} last 30d` now yields **100**; the explainability payload can state "1 workout, 1 contributing representation, 1 duplicate ignored" — the bounded coverage reference ticket 16 scope item 6 asks for.

## 4. Dependency and Adapter strategy

- **Reads stay on the existing seam.** Selection consumes `UnifiedEventRecord`s already fetched through `UnifiedEventStore` (`getEventsByTimeRange`, `getEventsByContent`, `scanAll`). The store Interface gains *no* new methods for selection. What stored rows must provably carry for selection (coverage stamps, reducer stats) is an index-completeness decision owned by the lifecycle ticket (14) and storage doc 07; caching, scan coalescing, and the < 250 ms budgets are ticket 20's. This doc claims neither.
- **Live metadata** resolves through `NoteQueryStore`/`EffortQueryStore` (existing seams), so tag/discipline edits reclassify past workouts without touching selection internals.
- **No reverse dependency.** Core stays free of wql/lang imports; unit conversion remains the wql-owned seam ([units.ts](../../../../packages/wql/src/units.ts)) described in [unit policy](02-unit-policy.md). Selection receives already-typed candidates from derivation (doc 03) and does not re-derive keys from labels.
- **Adapter shape:** the IndexedDB store adapter ([IndexedDBService.ts](../../../../apps/playground/src/services/db/IndexedDBService.ts)) implements `UnifiedEventStore` today and is untouched by this Module.

## 5. Semantic vs behavior-preserving, and cutover

This is a **semantic** change by intent: `sum:totalVolume` over the duplicated workout changes 200 → 100. That is the point, but it means staged rollout, not a flag day:

1. **Add lineage first (behavior-preserving):** derivation stamps representation kind/coverage on new writes and the backfill (storage doc 07, lifecycle ticket 14). Old rows read as `kind: 'unknown'`, handled by explicit legacy rules — never fabricated coverage.
2. **Route `run` through `select`:** the only visible change is corrected totals and new limitations where evidence is insufficient (mean-only summaries in pooled averages). Existing filters/grouping keep working.
3. **Unify the join path:** drop the `grain === 'summary'` filter by routing `deriveMetricFacts` through the same `select` — acceptance 6.
4. **Delete the old policy:** once acceptance passes, the blanket projection leg, `applyEffortScope`'s global probe, and the summary-only join filter are removed together. No legacy selection path remains behind a flag (ticket 16 clean-cutover clause). The deletion is provable: `applyEffortScope` and the inline `grain` filter have no remaining callers.

**Behavioral verification examples** (from ticket 16 acceptance, restated as executable checks):

- Finalized workout, `sum:totalVolume{}` equals the workout's summary volume with no grain filter → **100**, not 200 (defect 3.2's reported symptom; confirm with a live run during implementation).
- 10 × 1 m/s + 2 × 2 m/s → **14/12** via detail or via sum+count summaries; a count-less mean reports insufficient evidence.
- Directly recorded HRV summary value counts once; sessionLoad 200 + 400 → **300**.
- 5 km running + unrelated 3 km unattributed: total **8 km**; grouped `running 5 km` + structural unassigned `3 km`; effort-filtered **5 km**.
- Content-joined event-grain query returns the same observations as the direct content-ID query.
- Re-finalization changes no totals (replacement semantics, storage doc 07).

## 6. Tradeoffs and unresolved decisions

- **Index completeness belongs to the lifecycle/storage track, not this Module.** What exactly `summaryCoverage` / `reducerStats` look like on a stored row — compact descriptors vs observation references, exact reducer vocabulary — is owned by the lifecycle ticket (08/14) and worked in storage doc 07. Ticket 20 owns measured budgets, caching, and scan coalescing only. Selection is written against the contract's *required capabilities* (membership proof, completeness, non-overlap), not a guessed layout.
- **Cost:** coverage evaluation adds per-summary capability checks on the hot path; the mitigation is validate-descriptor-not-recompute, and it is unproven until ticket 20's budgets measure it.
- **Explainability payload size:** carrying coverage references on every result must stay bounded; detailed lineage resolves on demand (ticket 18). Exact split is a presentation decision ([query presentation](05-query-presentation.md)).

## 7. Siblings

- [03 — metric derivation](03-metric-derivation.md): produces the typed identity and representation lineage `select` consumes.
- [02 — unit policy](02-unit-policy.md): reducer capability matrix and dimensional compatibility that gate summary substitution.
- [07 — transactional storage](07-transactional-storage.md): finalize/replace idempotence that makes dedupe-by-identity stable across re-finalization.
