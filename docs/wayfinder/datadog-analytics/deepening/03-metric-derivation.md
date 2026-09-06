# Deepening the Metric-Derivation Module: lossless identity, honest lineage

Status: **Proposed architecture; not implemented or an approved amendment.** All proposed types and field names below are illustrative sketches, not accepted decisions or runnable code.

Related work: [ticket 16 — contribution selection](../issues/16-contribution-selection.md), [field discovery contract](../assets/field-discovery-contract.md), [automatic grain contract](../assets/automatic-grain-contract.md), [lifecycle migration contract](../assets/lifecycle-migration-contract.md).

Read alongside [contribution selection](01-contribution-selection.md) (the consumer of the lineage produced here), [unit policy](02-unit-policy.md) (dimensional identity of emitted values), and [transactional storage](07-transactional-storage.md) (who writes these rows and when they replace).

## 1. What improves

`packages/wql/src/derivation.ts` is already a real Module with a decent Interface — `toEventRows` / `toSummaryEventRows` / `projectEventToFacts` are exported, deterministic, and documented. The problem is what the pipe *loses* and what it *fails to say*:

- **Key loss.** `projectEventToFacts` ignores the custom property's `key` when choosing `metricKey`. That is the verified loss; a missing TypeScript declaration alone does not prove runtime serialization stripped the property.
- **No lineage.** An event row mirroring an analytics statement and a folded summary row are both "rows"; nothing on either says whether the value is a directly recorded observation, a newly calculated observation, a substitute summary, or a duplicate representation. Contribution selection (doc 01) currently cannot tell a copy from a population.
- **Two id dialects.** Legacy fact rows salt ids with `Date.now()`; unified summary rows use deterministic content keys. Semantic observation identity — which must survive re-finalize — is conflated with storage identity, which must be overwrite-friendly.

The deepening: derivation becomes the single place that stamps **typed identity** and **representation lineage** onto every emitted row, and projection preserves them instead of re-deriving keys from display labels.

- **Locality:** the "what is this value, where did it come from" invariant has one Implementation at the emission boundary.
- **Leverage:** the Field Catalog (ticket 15), contribution selection (doc 01), and storage replacement (doc 07) all read the same stamps instead of re-inferring identity three ways.
- **Deletion test:** delete the Module and every writer (finalize, wellness reconcile, V17 backfill) must restate normalization, key resolution, and lineage rules itself. Renaming `projectEventToFacts` would not.

## 2. Current code and data

### The PropertyMetric key loss, precisely

The parser *keeps* the property key on the runtime object:

**Current excerpt** (contiguous, verbatim), [semantic-classifier.ts:117–121](../../../../packages/lang/src/parser/semantic-classifier.ts#L117-L121):

```ts
    case 'property': {
      const metricType = PROPERTY_KEY_TO_METRIC_TYPE[primitive.key.toLowerCase()] ?? MetricType.Custom;
      return [{
        metrics: new PropertyMetric(primitive.key, primitive.value, {
```

**Current excerpt** (contiguous, verbatim), [PropertyMetric.ts:14–27](../../../../packages/lang/src/runtime/compiler/metrics/PropertyMetric.ts#L14-L27):

```ts
export class PropertyMetric implements IMetric {
  readonly key: string;
  readonly value: string | number | boolean | null;
  readonly image: string;
  readonly origin: MetricOrigin;

  constructor(key: string, value: string | number | boolean | null, options: PropertyMetricOptions = {}) {
    this.key = key;
    this.value = value;
    this.image = options.image ?? `${key}: ${formatPropertyValue(value)}`;
    this.origin = options.origin ?? 'parser';
    this.type = options.type ?? MetricType.Custom;
  }

  readonly type: MetricType | string;
}
```

Careful about *where* the loss is. `key` is not declared on the `IMetric` contract ([core Metric.ts:40–52](../../../../packages/core/src/models/Metric.ts#L40-L52)) nor on the loose fallback branch of [`StoredOutputStatement.metrics`](../../../../packages/core/src/types/results.ts#L12-L29), so nothing downstream is *typed* to retain it — but a runtime object may still carry it, and this doc does not claim it is stripped at serialization. The **known, source-verifiable loss is in projection**: `projectEventToFacts` never reads any key field. It resolves the fact key from `metadata.canonicalKey`, the statement's Label metric, a rep special case, or `m.type` — in that order:

**Current excerpt** (contiguous, verbatim), [derivation.ts:300–311](../../../../packages/wql/src/derivation.ts#L300-L311):

```ts
  const label = metrics.find(m => m.type === MetricType.Label);
  const labelName = label ? String(label.value ?? label.image ?? '') : '';
  const effortMetric = metrics.find(m => m.type === MetricType.Effort || m.type === 'effort');
  const effortSlug = metadataString(metrics[0]?.metadata, 'effortSlug')
    ?? record.effortSlug
    ?? (effortMetric && typeof effortMetric.value === 'string' ? effortMetric.value : undefined);

  const facts: AnalyticsDataPoint[] = [];
  metrics.forEach((m) => {
    if (m.type === MetricType.Label || m.type === 'label' || typeof m.value !== 'number') return;
    const metricKey = metadataString(m.metadata, 'canonicalKey')
      ?? (labelName ? resolveCanonicalMetricKey(labelName) : (m.type === MetricType.Rep || m.type === 'rep' ? 'reps' : (m.type ?? 'metric')));
```

A property statement (`shoeSize: 42`) carries no Label metric and no `metadata.canonicalKey`, and `m.type` is `MetricType.Custom` (`'custom'`, [core Metric.ts:161](../../../../packages/core/src/models/Metric.ts#L161)) — so its fact row gets `metricKey: 'custom'`, identical to every other custom property. `PropertyMetric.image` (`'shoeSize: 42'`) is a display string that no query code parses, so the key is unreachable even when the runtime object still has it. The legacy path loses the key the same way, even more directly — [workoutDerivation.ts:299](../../../../apps/playground/src/services/analytics/workoutDerivation.ts#L299): `const metricKey = String(metric.type);`.

**Concrete data example (traced through source, not runtime-executed):** a `shoeSize: 42` property recorded on a workout script (the runtime's property primitive — a recorded measurement, not note metadata) → stored metric `{ type: 'custom', value: 42, image: 'shoeSize: 42', origin: 'parser' }` → event row → fact `{ metricKey: 'custom', value: 42, label: 'custom', timestamp: <workout time> }`. An aggregate over `custom` sums `shoeSize` with `hydration: 3` and every other custom property. Field discovery (ticket 11) cannot discover `shoeSize` as `shoeSize`; the Field Catalog contract names exactly these two entry points as the places typed identity must be carried through.

### Copies vs compressions, and two id dialects

`toEventRows` maps every statement 1:1 — **including** `outputType: 'analytics'` statements ([derivation.ts:190–216](../../../../packages/wql/src/derivation.ts#L190-L216)), while `toSummaryEventRows` folds those same analytics statements into summary rows with deterministic ids `${resultId}:summary:${rowKey}` ([derivation.ts:223–248](../../../../packages/wql/src/derivation.ts#L223-L248)). The fold *is* a legitimate keep-last dedupe per result ([`foldSummaryOutputs`](../../../../packages/wql/src/derivation.ts#L100-L124)), but the event-row mirror of the same analytics statement is a **copy**, and neither row says which is which. Meanwhile the pre-V16 legacy fact path salts ids with the derivation instant — [derivation.ts:145](../../../../packages/wql/src/derivation.ts#L145): `` id: `${identity.resultId}-${f.rowKey}-${now}` `` — so the same observation re-normalized twice gets two unrelated ids, while the summary *event row* for the same value re-finalizes onto one stable storage key. Semantic identity and storage identity are currently the same string doing two incompatible jobs.

## 3. Proposed Interface

Stamp identity and lineage at emission; preserve them through projection. Types live in core so both `lang` (producer) and `wql` (consumer) depend on core, never on each other.

```ts
// Proposed sketch — illustrative names, not decided code.
export interface MetricIdentity {        // lives in core, beside UnifiedEventRecord
  canonicalKey: string;                  // field-contract normalized path, e.g. 'shoeSize'
  kind: 'number' | 'string' | 'boolean' | 'array';
  dimension?: string;                    // physical dimension where applicable (02-unit-policy)
}

export type RepresentationKind =
  | 'direct'              // recorded measurement — one observation
  | 'calculated'          // newly calculated observation at its producing scope
  | 'substituteSummary'   // compressed representation of an existing population
  | 'duplicate'           // another stored/query-reachable representation — adds no observation
  | 'unknown';            // pre-stamp rows — explicit legacy bucket, never fabricated lineage

export interface RepresentationLineage {
  kind: RepresentationKind;
  /** Semantic observation ID — stable across grains and re-finalization. */
  observationRef?: string;               // e.g. `${resultId}:obs:${stableKey}` — allocation, see below
  /** Exact population/partition descriptor — required for substituteSummary. */
  coverage?: CoverageDescriptor;         // schema owned by lifecycle ticket 08/14 — see §7
  reducer?: { name: string; retained: readonly ('sum'|'count'|'min'|'max'|'last')[] };
  derivationVersion?: number;
}
```

**Emission sketch** (inside derivation, replacing silent key resolution):

```ts
// Proposed sketch — illustrative names, not decided code.
const identity: MetricIdentity = knownIdentityFor(m)   // explicit canonicalKey metadata wins
  ?? identityFromPropertyKey(m);                       // 'shoeSize', normalized per field contract
// kind comes from the value itself, never from the key. Arrays remain collections.
// null is a clearing assignment, not a Metric Observation or a numeric zero.
// A verified explicit unit or declared physical metric type supplies dimension
// evidence; never copy a unit spelling into the dimension field or infer it by name.
row.metrics[metricIndex].identity = identity;
row.metrics[metricIndex].lineage = lineageForEmission(m);
// Recorded property: direct; new calc output: calculated. A folded copy of that
// calc shares its observationRef. A true compression of observations instead
// requires substituteSummary coverage. Storage grain alone decides none of this.
```

**Projection sketch** (`projectEventToFacts` stops re-deriving):

```ts
// Proposed sketch — preserve, don't reconstruct.
metricKey: m.identity?.canonicalKey ?? legacyIdentity(m).canonicalKey,
lineage: m.lineage ?? { kind: 'unknown' }, // insufficient evidence stays explicit
```

### Semantic observation ID vs storage ID

Keep them separate on purpose:

- **Semantic observation ID** (`observationRef`): names the logical observation. Proposal: allocate it from the stable producing occurrence — `resultId` + producing scope (segment/statement position) + a within-result stable key — at the moment the observation is produced. It is intentionally **not** a content hash: equal values do not prove the same observation (two genuinely distinct observations may share a value and timestamp — contract acceptance 2), and a re-finalized row with different content may legitimately be a *new* observation rather than a replacement of the old one. Whether re-finalization preserves or version-bumps `observationRef` when content changes is a lifecycle decision (08/14) and is flagged, not settled here. Selection (doc 01) dedupes on it.
- **Storage ID** (`UnifiedEventRecord.id`): an upsert key with replacement semantics — event rows `${resultId}:${seq}` immutable-append, summary rows `${resultId}:summary:${rowKey}` deterministic overwrite. It is *not* evidence about observation count and must never be used as one (contract: "a metric name plus result ID, matching value, row grain, or timestamp is not proof").

### Observation vs summary compression vs copies

- **Observation** (direct or calculated): contributes its value once at its producing scope. A workout-level `sessionLoad` of 200 is one observation regardless of how many segment inputs produced it.
- **Summary compression** (`substituteSummary`): represents an existing population; contributes that population's statistics and weighting (e.g. `{sum: 14, count: 12}` preserves the pooled 14/12 average). Not automatically one new observation.
- **Copy** (`duplicate`): another representation of the same logical observation. It adds no *additional* observation. A valid copy can be the selected representation under strict summary-only selection; selection must not discard every copy just because its producing event is excluded. Count the shared observation once and report the unselected representations as ignored.

### Proposed data example (same input, new output)

Same recorded `shoeSize: 42` workout property:

- The stored metric gains `identity: { canonicalKey: 'shoeSize', kind: 'number' }` at classification/serialization time; `image` remains provenance. Explicit null instead records a clearing assignment, outside the observation identity union.
- Event row: `observationRef` allocated from the producing occurrence (`r1:obs:…` at the property's statement position), lineage `{ kind: 'direct' }`; storage id `r1:0` unchanged.
- Fact row: `metricKey: 'shoeSize'`, lineage preserved. `sum:shoeSize{} last 30d` now addresses exactly shoe sizes; the Field Catalog discovers `shoeSize` from the same stamp without scanning history.
- An emitted-and-folded composed calc (`totalVolume`) now arrives at selection as one `calculated` observation with two representations — exactly the input doc 01's dedupe needs.

### Metric Dates stay with observations

The current event shape has one `timestamp` plus a Metrics array ([storage.ts:212–222](../../../../packages/core/src/types/storage.ts#L212-L222)). The proposed observation shape must preserve a date per Metric rather than promoting every value to the enclosing workout's date. Illustrative additions, not a settled physical index layout:

```ts
type MetricDate =
  | { kind: 'instant'; epochMs: number }
  | { kind: 'civil-date'; date: string }; // validated YYYY-MM-DD; no invented midnight

type DatedObservation = {
  identity: MetricIdentity;
  observationRef: string;
  metricDate: MetricDate;
  value: number | string | boolean | readonly unknown[];
};
```

For a workout crossing Sunday/Monday, observations at Sunday 23:55 and Monday 00:05 retain different Metric Dates and enter different week buckets. A wellness observation recorded as `{kind: 'civil-date', date: '2026-09-05'}` stays September 5 after a timezone change. A substitute summary instead needs coverage of the dates it represents; stamping the summary's creation time cannot replace that evidence. Legacy absence of date evidence remains a limitation, not a date inferred from today's clock. This implements [ticket 12](../issues/12-time-alignment.md); indexed candidate completeness belongs to [ticket 14](../issues/14-db-v17-lifecycle.md).

## 4. Hidden Implementation responsibilities

- **Key recovery and normalization:** parse/classify-side capture of the property path (per field-contract camelCase/dotted-path rules), explicit `canonicalKey` metadata winning over name-derived keys, aliases preserved as provenance only. No synonym inference.
- **Value-kind classification:** `number`/`string`/`boolean`/`array` comes from the source value, never the key. Collections are indexed as fields without expansion. Null records clearing separately from observations.
- **Dimension stamping:** a verified explicit unit or declared physical type establishes dimension, including custom numeric fields with known units. Bare numbers do not acquire dimensions from their names.
- **Lineage assignment:** classify producing observations, substitute summaries, and their copies from real derivation evidence. An analytics output is not necessarily a new calculated observation merely because of its output type; a folded copy shares the producing observation's reference.
- **Legacy bucketing:** rows without stamps read as `kind: 'unknown'` and follow explicit legacy rules (bypass, or limitation) — never silently fabricate coverage or counts for old means (contract: "do not fabricate counts for old means").
- **id policy:** storage ids keep current deterministic/append shapes; `observationRef` allocation is internal. Callers never construct either.

## 5. Dependency and Adapter strategy

- **Types in core, logic at the boundary.** `MetricIdentity`/`RepresentationLineage` live beside `UnifiedEventRecord` in [core storage.ts](../../../../packages/core/src/types/storage.ts) so `lang`, `wql`, and the playground adapter share them. Core gains **no** new imports — in particular core must not import `lang` (the `UnitRegistry` lives there); dimensional conversion stays the wql-owned seam in [units.ts](../../../../packages/wql/src/units.ts), reconciled by [unit policy](02-unit-policy.md).
- **PropertyMetric (lang) gains the stamp at construction** ([semantic-classifier.ts](../../../../packages/lang/src/parser/semantic-classifier.ts) call sites already have the key in hand) — the fix is at the boundary, not by parsing `image` downstream.
- **Writers are the storage Adapter seam:** `appendEvents` / `finalizeSummaries` / `deleteEvents` in `UnifiedEventStore` stay as-is; derivation only changes what the rows they carry contain.

## 6. Semantic vs behavior-preserving, and cutover

Mixed, deliberately staged:

1. **Additive stamps (behavior-preserving):** new optional `identity`/`lineage` fields on new writes. Old rows unchanged; readers treat absence as `unknown`. No query answer changes.
2. **Key-resolution correction (semantic):** once stamps exist, projection stops collapsing custom properties to `metricKey: 'custom'`. Custom properties become addressable — a new capability, and old `custom` aggregates change meaning (they stop mixing unrelated values). This is announced behavior change, not a regression to hide.
3. **Legacy paths are not blind-moved or deleted.** [workoutDerivation.ts](../../../../apps/playground/src/services/analytics/workoutDerivation.ts) (`normalizeSummaryFacts`, `normalizeAllMetrics`, `resolveCanonicalMetricKey` duplicate) still serves the V12/V13 upgrade backfills ([IndexedDBService.ts:440–447, 539](../../../../apps/playground/src/services/db/IndexedDBService.ts#L440-L447)) and `replayResultAnalytics` ([IndexedDBNotePersistence.ts:296](../../../../apps/playground/src/services/persistence/IndexedDBNotePersistence.ts#L296)). V16 deletes the old analytics store in the same transaction, but upgrading a pre-V12 database straight to V17 still runs these backfill steps — reaching V17 does not by itself retire the V12/V13 code paths. They are removed only when no reachable upgrade chain or caller remains (the lifecycle ticket, 08/14, worked in storage doc 07), as a deletion with no remaining callers — not before, and not as part of this Module's landing.

**Behavioral verification examples:**

- Record `shoeSize: 42` on a workout script; `sum:shoeSize{} last 30d` returns 42 and `sum:custom{} last 30d` no longer includes it.
- A composed calc of 100 emitted as event + folded to summary produces one deduped contribution (100) through doc 01's selection.
- Re-finalize a workout twice with unchanged inputs: totals and observation counts identical, `observationRef`s stable. (Re-finalization that legitimately changes content is the flagged lifecycle case — replacement versus new observation is decided there, not assumed here.)
- A legacy mean-only summary yields `insufficient-evidence` in a pooled average — no fabricated count.

## 7. Tradeoffs and unresolved decisions

- **Coverage descriptor schema is not settled here.** The exact shape proving "membership, completeness, and overlap exactly" (compact descriptors vs observation references) is owned by the lifecycle ticket (08/14) and storage doc 07. This doc flags it as a hard dependency for `substituteSummary` stamping rather than inventing a layout.
- **Canonical-key collision policy:** explicit aliases only; discovery never guesses (field contract). What happens when two distinct source paths normalize to one key inside a single statement is a conflict the catalog ticket owns.
- **Derivation versioning:** `derivationVersion` exists so a future reducer change can invalidate stale summaries — but version allocation and invalidation mechanics are lifecycle-owned, unspecified here.
- **Cost:** stamping is per-emission and cheap; the honest cost is schema churn on stored rows and one backfill, priced by the lifecycle ticket.

## 8. Siblings

- [01 — contribution selection](01-contribution-selection.md): consumes `observationRef` and lineage to dedupe and enforce coverage.
- [02 — unit policy](02-unit-policy.md): owns `dimension` values and reducer capability that make stamped identities operation-compatible.
- [07 — transactional storage](07-transactional-storage.md): owns write/replace transactions and the V17 backfill that stamps or honestly buckets legacy rows.
