# Deepening the Presentation Layer: one view model for widget rendering

Status: **Proposed architecture; not implemented or an approved amendment.**

Related work: [ticket 19 — shared query execution and surface cutover](../issues/19-shared-query-execution.md) (scope item 4: widget decoupling, scatter/multi-axis renderers), [shared-execution contract](../assets/shared-execution-contract.md) §2 (rendering parity and widget decoupling), [missing-values contract](../assets/arithmetic-contract.md) §2.2 (charts zero-fill, tables render `—`, scalars format unrounded), [time-bucket contract](../assets/time-alignment-contract.md) (collision-safe group alignment).

Read alongside [query freshness](06-query-freshness.md) and [transactional storage](07-transactional-storage.md).

## 1. What improves

The useful change is not a chart-library wrapper. It is making the decision "what does this widget show, and is that value actually in the result?" have one pure, testable answer that every renderer shares.

Today each widget re-derives display semantics from `QueryResult` and each derivation silently *changes* the data: `QueryValue` collapses a multi-point series to its last point, `WqlBars`/`TopList` take the first point of each series, `mergeSeries` pairs points by exact timestamp, and `useChartShape`'s shape logic is duplicated in the playground. None of these widgets invents an aggregate — but nothing says so, and nothing stops a future widget from "fixing" an empty chart by summing points.

- **Locality:** value-selection policy, presence expansion, and label formatting live in one pure Module.
- **Leverage:** seven renderers ([`QueryValue`](../../../../packages/ui/src/widgets/QueryValue.tsx), [`WqlBars`](../../../../packages/ui/src/widgets/WqlBars.tsx), [`TopList`](../../../../packages/ui/src/widgets/TopList.tsx), [`WqlTable`](../../../../packages/ui/src/widgets/WqlTable.tsx), [`WqlTimeseries`](../../../../packages/ui/src/widgets/WqlTimeseries.tsx), `StackedBar`, and the contract-named scatter/multi-axis renderers that do not exist yet) consume one view model.
- **Deletion test:** deleting the Module forces every widget to re-answer "first or last point?", "zero or absent?", "what key identifies this series?" — three questions it cannot currently answer consistently.

**No Adapter is proposed.** This is a pure in-process computation over an in-memory `QueryResult`. Recharts stays at the rendering edge, behind the existing widget components. Inventing a storage or network Adapter here would be ceremony, not Depth.

## 2. Current code and data

### The shape decision is duplicated

**Current excerpt**, [useChartShape.ts:11–21](../../../../packages/ui/src/widgets/useChartShape.ts#L11):

```ts
export function useChartShape(result: QueryResult | undefined): ChartShape {
  return useMemo(() => {
    if (!result) return { kind: 'empty' };
    if (result.parsed.error) return { kind: 'error', message: result.parsed.error };
    if (result.series.length === 0) return { kind: 'empty' };
    if (result.series.length === 1 && result.series[0].points.length === 1) {
      return { kind: 'scalar', value: result.series[0].points[0].value };
    }
    const hasTimeAxis = result.series.some((s) => s.points.length > 1);
    return { kind: hasTimeAxis ? 'timeseries' : 'bars' };
  }, [result]);
}
```

**Current excerpt**, [explorerQueries.ts:101–124](../../../../apps/playground/src/utils/analytics/explorerQueries.ts#L101):

```ts
/** Shape decision for chart rendering — mirrors useChartShape so it can be tested synchronously. */
export type QueryChartShape =
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  | { kind: 'scalar'; value: number }
  | { kind: 'timeseries' }
  | { kind: 'bars' };
```

The playground copy exists "so it can be tested synchronously" — evidence the shape function wants to be a plain function, not a hook, and wants one home.

### First/last point reduction changes values

**Current excerpt**, [QueryValue.tsx:17–21](../../../../packages/ui/src/widgets/QueryValue.tsx#L17):

```ts
  const value = useMemo(() => {
    if (shape.kind === 'scalar') return shape.value;
    if (result.series.length === 0) return 0;
    return result.series[0].points[result.series[0].points.length - 1]?.value ?? 0;
  }, [result, shape]);
```

For a multi-point series this renders the **last** point. [`WqlBars.tsx:26–32`](../../../../packages/ui/src/widgets/WqlBars.tsx#L26) and [`TopList.tsx:18–24`](../../../../packages/ui/src/widgets/TopList.tsx#L18) render `s.points[0]?.value ?? 0` — the **first** point. Same result object, two different "the value" answers, and `?? 0` makes a missing point indistinguishable from a recorded zero — which the arithmetic contract explicitly forbids for tables.

This reduction is legitimate presentation, **not a new aggregate**: the engine already aggregated; picking an endpoint must never recompute (sum, mean) what the engine produced. The proposal makes the policy named and per-widget explicit rather than changing the numbers.

### Group keys are labels today

**Current excerpt (abridged — bucket-point construction elided)**, [QueryService.ts:796–821](../../../../packages/wql/src/QueryService.ts#L796):

```ts
    const series: Series[] = [...groups.entries()].map(([key, rows]) => {
      // … bucket points …
      return { key, label: key, points, unit: seriesUnit };
    });
```

`Series.key` and `Series.label` are the same joined string (`thruster · strength`), built from display-oriented dim values. Downstream, that string is used as a React key, a table column head, a map key in [`WqlTable.tsx:46–49`](../../../../packages/ui/src/widgets/WqlTable.tsx#L46), and a series selector in `mergeSeries`. If labels are ever formatted, localized, truncated, or collide (two dim combinations joining to the same string), identity and presentation change together — the failure the time-alignment contract calls collision-unsafe alignment. The structured group key (the ordered dim→value pairs) is identity; the label is a rendering of it.

### Presence and error metadata exist but are unmodeled

**Current excerpt**, [WqlEmptyState.tsx:11–16](../../../../packages/ui/src/widgets/WqlEmptyState.tsx#L11):

```ts
    if (!result) return 'Loading…';
    if (result.parsed.error) return `Query error: ${result.parsed.error}`;
    if (result.series.length === 0) return 'No data for this range.';
    return null;
```

Three terminal states — loading, error, empty — are reconstructed ad hoc. There is no modeled "partial" state: `QueryResult` carries `stages` (`selected/buckets/aggregated/groups`) but nothing tells a renderer which in-range bucket positions have a real observation versus an absent one. `WqlTable` already distinguishes them for tables (`v !== undefined ? formatValue(v, unit) : '—'` at [WqlTable.tsx:55–57](../../../../packages/ui/src/widgets/WqlTable.tsx#L55)); charts cannot, because absence is not represented.

### Scatter pairing has no renderer and no pairing rule

The shared-execution contract §2.2 names `scatter` and `multi-axis` chart types; no scatter renderer exists in `packages/ui/src/widgets` today (verified — no match outside unrelated prose). Pairing two series as (x, y) scatter points requires a defined join over the shared bucket domain. The settled structural bucket/group matching (time-alignment contract) already fixes pairing as bucket-identity equality — not timestamp proximity — so the open question is only what to do about buckets where one series observed and the other did not, plus a presence rule for those positions. `mergeSeries` ([chartData.ts:9–17](../../../../packages/ui/src/widgets/chartData.ts#L9)) shows the current implicit rule — union of timestamps, absent series left missing:

```ts
export function mergeSeries(series: Series[]): MergedPoint[] {
  const map = new Map<number, MergedPoint>();
  for (const s of series) {
    for (const p of s.points) {
      if (!map.has(p.ts)) map.set(p.ts, { ts: p.ts });
      map.get(p.ts)![s.label] = p.value;
    }
  }
  return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
}
```

For a timeseries line, gaps are drawable. For scatter, an unpaired x or y is a correctness question, not a rendering detail — it must be answered in the view model, not inside a recharts formatter.

## 3. Concrete data example (illustrative, not observed execution)

The following result is hand-written to illustrate the current structure — it was not captured from a real query execution, and exact generated shapes (labels, bucketing instants, rounding) should not be treated as verified. Note in particular that produced `label` values are display-formatted (e.g. an effort display name such as "TIS"), so the `"tis"` string below is a stand-in, not evidence of the real label text.

Input query: `avg:tis{} by {week}.rollup(1w) last 4w`, and a second query `sum:totalVolume{} by {week}.rollup(1w) last 4w` the user wants as a scatter of intensity vs volume.

Illustrative result (one series, four points; values chosen for exposition):

```text
series[0]: key = label = "tis" (label stand-in, see note above), unit = "pts"
  points: [{ts: W1, value: 6.5}, {ts: W2, value: 7.0}, {ts: W3, value: 7.2}, {ts: W4, value: 6.8}]
```

Behavior implied by the current code, same input:

- `QueryValue` renders **6.8** (last point). If the user expected the 4-week mean, the widget silently shows something else — no invented aggregate is allowed to "fix" this.
- A week with no recorded sessions produces **no point**; the chart draws a gap while the contract says in-range missing positions display zero-filled. Absence and zero are conflated downstream.
- Scatter of tis × volume: `mergeSeries` unions on `ts`; if volume has a point at W2 and tis does not, the pair (x=undefined, y=value) exists only implicitly — no rule says whether to drop it, zero it, or refuse to plot.

## 4. Proposed Interface and caller change

**Proposed sketch — names and types below do not exist.** The planner consumes a future `DocumentResult`, required by ticket 19, and an explicit view request. The current runner does not yet emit this shape. Presence, diagnostics, and partial coverage must come from the query Implementation; the planner cannot recover them from bare numbers.

```ts
// ── Engine-supplied identity (NOT derived from label text) ──────────
type GroupKeyValue = string | number | boolean | null;
// null = missing dimension value, distinct from false, 0, and ''.
type SeriesKey = readonly (readonly [dim: string, value: GroupKeyValue])[];
// Identity is the ordered typed dim→value pairs. Reconstructing this from a
// formatted label is unsafe: a collision (two pairs joining to one string)
// cannot be recovered from text. The engine must supply the typed identity;
// the label is a rendering of it, never a source for it.

// ── Buckets carry temporal semantics, not bare instants ─────────────
type BucketIdentity = string; // opaque encoding of kind, size, timezone/origin, and canonical boundary
interface ResultBucket {
  readonly identity: BucketIdentity;
  readonly ordinal: number; // presentation order only; never align independent queries by ordinal
  readonly displayInstant?: number; // optional chart coordinate, never a fabricated observation time
  readonly partial: boolean;
}
type PointValue =
  | { kind: 'value'; value: number; observedCount: number; averageEligible: boolean; missingDerived: boolean }
  | { kind: 'absent'; reason: string }
  | { kind: 'invalid'; diagnostic: string };
interface ResultPoint {
  readonly bucket: ResultBucket;
  readonly cell: PointValue;
}

interface PlannedSeries {
  readonly key: SeriesKey;        // engine-supplied typed identity
  readonly label: string;         // display rendering of key
  readonly unit?: string;
  readonly points: readonly ResultPoint[];
  readonly domainBuckets: readonly ResultBucket[]; // bounded, query-supplied positions including absence
}

// ── Proposed input contract (ticket 19's DocumentResult) ────────────
interface DocumentResult {
  readonly outputs: readonly {
    readonly id: string; // named output; display order follows show
    readonly status: 'ready' | 'error';
    readonly diagnostic?: string;
    readonly series: readonly PlannedSeries[];
  }[];
}

// ── View config: the caller names the view AND the endpoint ─────────
type ViewRequest =
  | { view: 'scalar'; endpoint: 'first' | 'last' } // named explicitly; no hidden per-widget default
  | { view: 'bars' | 'timeseries' | 'table' }
  | { view: 'scatter'; xOutput: string; yOutput: string }; // align under the query contract, retain synthetic provenance

declare function planPresentation(result: DocumentResult, request: ViewRequest & { outputId: string }): PresentationPlan;

type PresentationPlan =
  | { kind: 'error'; message: string }                 // from result.status, not re-parsed
  | { kind: 'empty' }                                  // legitimate no-data, status 'ready'
  | { kind: 'absent'; reason: string }                 // e.g. an all-missing ordinary average
  | { kind: 'partial'; series: readonly PlannedSeries[]; message: string } // preserve valid data and partial coverage
  | { kind: 'scalar'; value: number; unit?: string; endpoint: 'first' | 'last' }
  | { kind: 'bars'; series: readonly PlannedSeries[] }
  | { kind: 'timeseries'; frame: readonly (readonly (number | null)[])[]; zeroFilled: readonly (readonly boolean[])[] }
  | { kind: 'scatter'; pairs: readonly (readonly [number, number])[]; synthetic: readonly boolean[] }
  | { kind: 'table'; columns: readonly string[]; cells: readonly (readonly PointValue[])[] };

declare function chartFrame(plan: Extract<PresentationPlan, { kind: 'timeseries' }>): MergedPoint[];
```

**Proposed caller sketch:**

```ts
const plan = useMemo(
  () => planPresentation(documentResult, { outputId: 'intensity', view: 'scalar', endpoint: 'last' }),
  [documentResult],
);
// 'last' preserves today's QueryValue behavior — chosen at the call site, visible in code,
// not buried in an indexing expression inside the widget.
```

The widgets stop reading `result.series[0].points[…]` directly. Endpoint selection is an explicit, named argument at each call site; the final design has no hidden first/last policy inside widgets or inside the planner.

## 5. Proposed data example, same input

Same illustrative `avg:tis{} by {week}.rollup(1w) last 4w` plus volume series, with W3 absent for tis. Both are illustrative constructions (§3), shown to trace the same input through the proposed contract:

```text
output intensity: status = ready
  series key = [] (ungrouped non-time dimensions in this illustrative query)
  domain buckets = W1, W2, W3, W4 (each carries structural bucket identity and coverage)
  cells = [value 6.5, value 7.0, absent, value 6.8]
output volume: status = ready
  cells = [value 1200, value 1350, value 900, value 1100]

timeseries -> W3 intensity displays 0, flagged synthetic; tables display an absent cell.
explicit last-position view of intensity -> 6.8, with its bucket identity and coverage.
scatter -> shared-domain structural bucket/group alignment, never ordinal-only matching.
  The agreed graph rule permits a displayed (0, 900) at W3 with synthetic provenance.
corr(intensity, volume) -> excludes W3 from statistical pairs because intensity is absent.
  Displayed synthetic points never become observations or feed correlation calculations.
```

## 6. What the Implementation hides

1. View classification from the selected output's carried status and point states, replacing duplicate shape logic. Healthy outputs remain renderable when another output fails; partial temporal coverage is not the same state as a failed query.
2. Value selection without recomputation: endpoints only, named by the caller, never a new aggregate over engine points.
3. Rendering of carried absence per view: synthetic zero for chart frames, absent table cells, and diagnostics that never become zero. Scatter display and correlation statistics remain distinct consumers of the same presence-aware data.
4. Label formatting from the typed key, once, with collisions impossible by construction because identity is never recovered from text.
5. Scatter pairing uses compatible **structural bucket and group identities** over the overlapping domain. Ordinal 0 in one query can represent a different week from ordinal 0 in another. Never match by ordinal alone, display labels, or nearest timestamps.

## 7. Cutover and verification

1. Extract `useChartShape`'s body to the pure planner; keep the hook as a `useMemo` wrapper. Delete the playground duplicate `getQueryChartShape` in the same change (ticket 19 already plans this cutover).
2. Migrate one widget at a time, starting with an explicitly selected output and endpoint for `QueryValue`. Preserve current numbers during extraction; changes that prevent incompatible widget coercions or add missing buckets are deliberate behavioral updates, not claimed behavior-preserving refactors.
3. Switch `WqlTable` cells and timeseries frames to carried presence. Zero-fill only in-range positions (contract rule); out-of-scope dates stay excluded.
4. Add scatter with synthetic-point provenance under the agreed graph rule; use the query evaluator's paired-only population for correlation. A request to hide absent scatter positions would amend the graph presentation contract and needs an explicit decision.

Behavioral acceptance examples:

- Fixture with one series of 4 points: `QueryValue` shows the same number before and after cutover; the call site names `endpoint: 'last'`.
- A group dimension with boolean, numeric, and missing values produces three distinct series with typed key values `true`, `42`, `null` — none collapses to a string, and `null` never aliases `0`/`false`/`''`.
- Two group combinations whose joined labels collide today produce two distinct planned series, because identity arrives typed from the engine rather than being split back out of label text.
- Series with an absent mid-range bucket: line chart zero-fills it marked synthetic; table cell renders `—`; a recorded `0` renders `0` in both.
- A synthetic scatter point is visually distinguishable and does not increase correlation pair count; the same absent bucket remains empty in a table.
- Parse-error and partially-failed document: every renderer shows the same badge text from one plan, including the editor preview; healthy widgets in the same document keep rendering (§2.3).

## 8. Tradeoffs and unresolved decisions

**Update:** the items below are now resolved by [ticket 23](../issues/23-widget-presentation-semantics.md): uniform last-point endpoints for scalar-reducing widgets (explicitly amending bars/toplist's incumbent first-point behavior) and paired-only scatter display — an explicit amendment of the graph-presentation contract scoping zero-fill to time-axis charts. Bullets remain as review context.

- **Endpoint policy for coerced scalars.** Today `QueryValue` shows the last point of a multi-point series. The proposal preserves that number only when the call site explicitly passes `endpoint: 'last'` — which widget types get which endpoint becomes visible, reviewable product configuration instead of an indexing accident. Whether "last" is the right product default for value widgets is a semantic question for a decision ticket, not this Module.
- **Structured identity must come from the engine.** `Series` is defined in the engine ([wql.ts:142–164](../../../../packages/wql/src/wql.ts#L142)); carrying a typed `SeriesKey` touches the producer, the cache equivalence key (ticket 20), and persisted group metadata. Sequencing belongs to tickets 12/17/19. A label-reconstruction intermediate is **rejected**, not deferred: once two typed groups collide in label text, the information needed to separate them is gone, so no presentation-side recovery path is safe.
- **Scatter display is not correlation input.** The contracts can both hold: render missing in-range chart positions as synthetic zeros, but calculate correlation only from pairs where both inputs are present. Never feed a chart frame back into `corr`. If a paired-only scatter display is desired instead, that is a proposed change to the agreed graph rule, not an unresolved statistical requirement or a silent implementation default.
- **Zero-fill ownership.** Arithmetic contract assigns zero-fill display to charts; the proposal keeps it in the view model (chart frame, flagged synthetic), not in `DocumentResult`, so cached results stay full-precision and absence-preserving (ticket 20's cache contract agrees).
- **`stages` telemetry** (selected/buckets/aggregated/groups) remains engine output; the view model does not reinterpret it, and no weighting of observations by input counts is introduced — `stages` is diagnostics, not a calculation input.
