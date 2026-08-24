# Ticket 001 — IndexedDB index limits and scan-cost evidence

**Status**: complete · 2026-08-24 · Harness:
`wod-wiki-engine-event-store/bench/001-idb-scan/` (engine repo, branch
`event-store`, commit `be5e9a9`) — real Chromium IndexedDB, headless.
Feeds the [Unified event store map](../unified-event-store-map.md) — specifically
ticket 002's record-shape decision.

---

## Part 1 — Constraints: what IndexedDB can and cannot index

Confirmed against the production schema (`IndexedDBService.ts:105-122`) and the
IndexedDB spec:

1. **keyPaths evaluate against top-level structure.** An index keyPath may be a
   field, a dotted path, or an array (compound). It is evaluated on the stored
   value itself — there are no computed, filtered, or expression indexes.
2. **Arrays of objects are unreachable.** `multiEntry: true` indexes the
   *elements* of an array **of valid keys** (`string[]`, `number[]`). It cannot
   reach into `metrics[].type` or `metrics[].metadata.effortSlug` inside a
   `StoredOutputStatement`. **Conclusion: today's log shape is structurally
   unindexable** — a unified model built directly on log-shaped records cannot
   serve `by-metric`-style lookups by index.
3. **Top-level fields stay fully indexable.** Whatever the unified record is,
   fields promoted to its top level (`timestamp`, identity ids, a canonical
   metric column if one exists) keep normal index support, including compound
   leftmost-prefix ranges (the `by-value ['metricKey','value']` precedent).
4. **Every index is a maintained B-tree**: one extra write per index per put.
   Production carries twelve indexes on `analytics` ⇒ roughly 13× write
   amplification on fact writes.
5. **Read cost ∝ records materialized**, not bytes scanned: `getAll` /
   `getAllFromIndex` structured-clone-deserialize every matched row. This
   mechanism drives everything in Part 2.

## Part 2 — Measurement

**Corpus**: synthetic N results × 30 log events (label + canonical-keyed value +
reps per event, 25-effort pool, 182-week spread). Fact rows derived with the
`normalizeSummaryFacts` rule (summary rows keyed `metricKey[:effort]`,
per-event segment rows). Query: *"totalVolume summaries, last 26 weeks"* —
the WQL SELECT leg shape. Median of 3 runs, headless Chromium, localhost page,
real IndexedDB.

| Scenario | 2k results / 110k facts | 5k results / 275k facts |
|---|---|---|
| S1 today · `by-metric` fetch + JS time filter | 337 ms (50k rows fetched) | 842 ms (125k) |
| S2 today · `by-timestamp` window fetch | 90 ms | 254 ms |
| S3 today · combined SELECT (intersect) | **441 ms** | **1130 ms** |
| S4 unified? · full scan of flat facts, no index | 449 ms | 1150 ms |
| S5 unified? · fetch result blobs + parse + filter | **155 ms** (2k blobs) | **380 ms** (5k blobs) |

**Scan : indexed ratio: 0.35 at both scales** — far inside the ≤2× criterion.

### Why the counter-intuitive result holds

The indexed path never *culls* on its most-used leg: `by-metric('totalVolume')`
is non-selective (≈45% of all fact rows), so S1/S3 deserialize hundreds of
thousands of thin rows to keep a few thousand. The blob scan materializes
**55× fewer records** (results vs fact rows) and walks events in JS. IndexedDB
latency tracks records-touched; the dual representation's row explosion is what
today's indexes pay for — and what a unified event table would not.

## Verdict

At personal-journal scale, the proposed unified model ("store events as
result-shaped records, filter on load") **outperforms today's indexed dual
model by ~3×** for the aggregate query family. The structural constraint
(Part 1.2) therefore does *not* block unification — it only forbids expecting
index lookups on nested metric fields, which the measurements show are not
needed at this record-count asymmetry. Design consequences for ticket 002:

- Promote only query-critical fields to the record top level (`timestamp`,
  identity ids); do **not** reintroduce a flattened per-metric projection.
- Keep summary/finalize records distinguishable from live events (map Notes
  decision).
- ⚠ **Semantic gap found**: folding raw events (S5) double-counts repeated
  efforts where production folds keep-last-deduped summary rows — sums differ
  (~15% here). The unified model must specify dedupe semantics explicitly.

## Caveats

- Headless Chromium on one machine; absolute numbers indicative, ratios robust
  across 2k→5k scaling.
- Synthetic logs are uniform; real logs vary more in size (raises blob-parse
  cost slightly, raises fact-row count identically).
- `getAll` materializes whole sets; a cursor streaming variant would trade
  memory, not meaningfully time.
