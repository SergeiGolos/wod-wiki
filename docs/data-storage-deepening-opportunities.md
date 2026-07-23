# Data Storage Deepening Opportunities

**Status:** architecture review / working document  
**Scope:** review the three in-progress data specifications for storage and analytics flows, identify deepening opportunities, and track resolutions.  
**Companion docs:**
- [`analytics-data-shapes-and-composition.md`](./analytics-data-shapes-and-composition.md)
- [`indexeddb-analytics-workflows.md`](./indexeddb-analytics-workflows.md)
- [`indexeddb-storage-and-page-queries.md`](./indexeddb-storage-and-page-queries.md)

**How to use this file:** each candidate has a `Feedback` section. Annotate inline or add sub-bullets. Edit the `Suggested solution` directly if a direction changes. This is a working document, not an ADR.

---

## Executive summary of findings

1. **The `analytics` store — KEEP.** It is the cross-workout search fact table. The current view loads a single result and shows it, but cannot search *across* results. "Find similar workouts" and comparison/graphing analytics require the normalized table.
   - *Resolution:* Keep the store and its write path. The read path (cross-result search + comparison) is the first consumer to build.

2. **Key resolution — follow the proposed storage spec.** The new `indexeddb-storage-and-page-queries.md` schema wins; inconsistencies follow the proposed structure (a lot of work went into organizing it). The `cross-note-result-aggregation` ADR must be reconciled/superseded to match.
   - *Resolution:* Adopt the proposed `segmentId`-based structure; retain `blockContentId` as the content-stable cross-note key per the ADR. R-03/AN-02 are reversed; the spec is updated, not the ADR.

3. **`segmentId` = `NoteSegment.id` (content-incarnation section id).** `generateSectionId` embeds a hash of the first 64 content characters, so the id identifies the content incarnation that was run; the `version` number is the lineage. The runtime statement id is a separate concept, not a segment id. `blockContentId` remains the content-stable cross-note key. Two keys, two purposes.
   - *Resolution:* `segmentId` always means the content-incarnation `NoteSegment.id` (`generateSectionId`). Rename the runtime statement id usage so it stops masquerading as a segment id.

4. **Two-layer derivation — needs a deep dive.** These are really two different things: *annotations derived from the language* (per-segment, e.g. power/pace/effort) and *summary analytics* that calculate against the whole result for aggregates (e.g. total volume, TIS).
   - *Resolution:* See [`analytics-two-layer-derivation-deep-dive.md`](./analytics-two-layer-derivation-deep-dive.md). The engine already separates the two layers; the leaks are downstream in storage and the second derivation path.

5. **Replay seam — HIGH PRIORITY.** Design and figure out how to make post-hoc re-derivation work. Create a linked deep-dive.
   - *Resolution:* See [`analytics-replay-seam-deep-dive.md`](./analytics-replay-seam-deep-dive.md). Key reframe: the `AnalyticsEngine` is already headless — replay drives the engine directly, skipping `OutputEmitter`.

6. **The `page` store — KEEP.** It creates a name + slug way of looking up a grouped collection of notes.
   - *Resolution:* Keep the page store. It is the named/slug-based lookup for grouped note collections, not just speculative future joins.

---

## Candidate 1 — The `analytics` store (RESOLVED: KEEP)

> **Resolution:** Keep the store and its write path. It is the cross-workout search fact table — the only structure that can answer "find similar workouts" or "compare across results," because the result view loads a single `WorkoutResult` and cannot search across results. The first priority is building the read path, not removing the write path.

### Problem

The `analytics` store is a **derived denormalization with zero consumers**. It is written on every result persistence, but no feature reads it. Both `indexeddb-analytics-workflows.md` and `AnalyticsTransformer.ts` state this explicitly:

> `getAnalyticsFromLogs()` is the authoritative derivation path for display. If the `analytics` store disagrees with the logs, the logs win.

Code path today:

```ts
// src/services/persistence/IndexedDBNotePersistence.ts:319-330
const segmentVersions = await this.getAnalyticsSegmentVersions(analyticsSegments);
const points = normalizeAnalyticsSegments(
  analyticsSegments,
  note.id,
  mutation.analytics?.resultId ?? resultId,
  segmentVersions,
  mutation.workoutResult?.blockContentId,
);
// Persist derived analytics rows for future cross-workout trend queries.
// Non-load-bearing: WorkoutResult.data.logs is the authoritative source.
await this.storage.saveAnalyticsPoints(points);
```

The original review applied the deletion test and concluded the store was write-only with no consumer. **Feedback reverses this:** the store is the cross-workout fact table by design; its read path (cross-result search + comparison graphing) is the next feature to build, not a reason to delete it. The deletion-test concern is reclassified from "remove the store" to "make sure the write path produces the right shape for the read path" — which ties directly to Candidates 4 and 5.

### Suggested solution

Keep the write path. Reframe the work as: **the store's shape must serve its first reader** (cross-workout search / comparison). Concretely, adopt the `AnalyticsFact` shape from `analytics-data-shapes-and-composition.md` §4 (summary-only facts with `grain`, `discipline`, `origin`, `blockContentId` + the `by-metric`/`by-discipline`/`by-origin` indexes), and drive fact-row production through the unified derivation module (Candidate 4 / [`analytics-two-layer-derivation-deep-dive.md`](./analytics-two-layer-derivation-deep-dive.md)) so the fact table is consistent with `data.logs`.

### Trade-offs to discuss
- Deleting the write path means we lose the existing derived rows. Is that acceptable? (No feature reads them today.)
- Does the trend feature justify the `analytics` store, or should the first trend implementation derive from `data.logs` directly?
- If we keep the store, what is the smallest reader that justifies the cost?

### Feedback

- *Resolved (feedback):* KEEP — the store is the cross-workout search fact table; the current view cannot search across results.
- *Resolved (2026-07-20):* cross-note read path implemented — `IndexedDBNotePersistence.getSimilarWorkoutResults(blockContentId, { excludeNoteId, includePlayground, limit })`; playground excluded by default; UI surface in `InlineResultPanel` 'Across notes' section (in progress).
- *Open:* the fact table is **summary-only** (`grain: 'summary'`). Per-segment data remains in `data.logs`. This affects the "find similar workouts" query design. See two-layer deep-dive §3 Q3.

---

## Candidate 2 — ADR conflict: `blockContentId` vs `segmentId`

### Problem

The accepted ADR `cross-note-result-aggregation.md` (Accepted 2026-06-28) made **`blockContentId` the cross-note key** because clones share content → same hash. It added `by-content` indexes on both `results` and `analytics`:

```ts
// src/services/db/IndexedDBService.ts:61-86
results: {
  indexes: {
    // ...
    'by-content': string; // V6 — blockContentId; cross-note collection aggregation
  };
},
analytics: {
  indexes: {
    // ...
    'by-content': string; // V6 — blockContentId; cross-workout trend queries
  };
}
```

The new storage spec proposes **removing `blockContentId`**:

| Ticket | Store | Change | Proposed |
|---|---|---|---|
| R-03 | `results` | Remove field | `blockContentId` removed; replaced by `segmentId + segmentVersion` |
| AN-02 | `analytics` | Remove field | `blockContentId` removed; rely on `segmentId + segmentVersion` |

But `segmentId` (as proposed) is a **per-note content-incarnation id** (`NoteSegment.id` — stable across versions of *one* segment instance, not across clones). Two cloned workouts in different notes get **different** `segmentId`s, so `segmentId` cannot answer the ADR's core query: "all my results for this workout, everywhere."

This is a direct contradiction: the ADR's whole decision is to use a *content-stable* key, while the spec replaces it with a *positional* key.

### Suggested solution

Adopt the proposed storage spec's overall structure, **except** R-03/AN-02. The existing `cross-note-result-aggregation` ADR **stands** — `blockContentId` is retained.

- **`segmentId` + `segmentVersion`:** within-note positional key (per the spec).
- **`blockContentId`:** retained as the content-stable cross-note key (per CONTEXT.md "Block Content Id" + the ADR). Two keys, two purposes, on the same rows: *which workout* (content) vs *where in the note* (position).
- **Resolution (grill Q1, 2026-07-16):** `segmentId` is positional (line-based `sectionId`, per `sectionParser.ts:331`); it cannot replace `blockContentId` for cross-note joins. R-03/AN-02 in the spec are reversed. `Collection` cross-note aggregation and the "find similar workouts" feature depend on `blockContentId`.

### Trade-offs to discuss
- The ADR already recorded a known consequence: the workbench patch path dropped `blockId` and `version`. That gap is still open; fixing it should not be conflated with removing `blockContentId`.
- Is the plan to keep cross-note aggregation at all, or has the product priority changed? If the priority changed, the ADR should be superseded with a reason.
- Do we want a three-key identity (`blockContentId`, `blockId`, `version`) or a two-key identity (`segmentId` that is content-stable, `segmentVersion`)?

### Feedback

- *Resolved (feedback):* follow the proposed spec's overall structure.
- *Resolved (grill Q1):* **RETAIN `blockContentId`** (content-stable cross-note key). The `cross-note-result-aggregation` ADR stands; the spec's R-03/AN-02 are reversed.
- *Resolved (2026-07-20):* R-02 (remove `blockId`) and R-04 (remove `version`) are additionally gated: `blockId` is renamed to `segmentId` (same content-incarnation value — `NoteSegment.id`), and `version` (`computeVersion` lineage) is retired in favor of `segmentVersion` (`NoteSegment.version`). The v10 migration maps them; `computeVersion` is deleted; `results.version` is legacy-read only. Drop the legacy `version` field in v11+.
- *Action:* update the storage spec to carry both `segmentId` and `blockContentId` on `results` + `analytics`.

---

## Candidate 3 — The word `segmentId` means three different things

### Problem

The interface around `segmentId` is shallow: the type `string` tells you nothing about which join semantics apply. There are at least three different concepts all called `segmentId`:

1. **Runtime OutputStatement id** — `String(segment.id)` in `normalizeAnalyticsSegments`:

```ts
// src/services/persistence/IndexedDBNotePersistence.ts:145-146
for (const segment of segments) {
  const segmentId = String(segment.id); // runtime statement id, usually a number
```

2. **NoteSegment content-incarnation id** — the line-based section id (`generateSectionId`) assigned to a segment; it embeds a hash of the first 64 content characters. The old comment calling it a "Stable UUID" was incorrect and has been fixed in code:

```ts
// src/types/storage.ts:64-66
export interface NoteSegment {
    id: string;           // Positional line-based section id
    version: number;      // 1, 2, 3…
```

3. **The storage spec's proposed `results.segmentId` FK** — which it says links to `segments.id` (`NoteSegment.id`).

The `getAnalyticsSegmentVersions` function expects the runtime ids to be `NoteSegment` content-incarnation ids:

```ts
// src/services/persistence/IndexedDBNotePersistence.ts:407-410
private async getAnalyticsSegmentVersions(segments: AnalyticsSegmentInput[]): Promise<Record<string, number | undefined>> {
  const segmentIds = Array.from(new Set(segments.map(segment => String(segment.id))));
  const latestSegments = await this.storage.getLatestSegments(segmentIds); // expects NoteSegment content-incarnation ids
  return Object.fromEntries(latestSegments.map(segment => [segment.id, segment.version]));
}
```

This only works if runtime statement ids accidentally coincide with `NoteSegment` content-incarnation ids, which is not guaranteed. The current interface makes this impossible to verify at the type level.

### Suggested solution

Give each concept an unambiguous name and introduce a single module that converts between them. For example:

- `runtimeStatementId` — the id from a live `OutputStatement` / `AnalyticsSegmentInput`.
- `noteSegmentId` / `noteSegmentVersion` — the FK to the `segments` store.
- `blockContentId` — the content-stable cross-note key (see Candidate 2).

A single identity resolver owns the mapping `runtimeStatementId → { noteSegmentId, noteSegmentVersion, blockContentId }`. Callers stop guessing which `segmentId` they hold because the type system tells them.

### Trade-offs to discuss
- Renaming fields is a schema migration. Can we do it incrementally (e.g., add `noteSegmentId`, deprecate `segmentId` over one version)?
- How is the runtime statement id actually correlated with a NoteSegment today? Is the correlation implicit (same position) or explicit (stored on the result)?
- If `segmentId` is kept as the name, which semantics should it carry?

### Feedback

- *Resolved (feedback):* `segmentId` = `NoteSegment.id`, which code revealed to be the **POSITIONAL line-based section id** (`generateSectionId`), not a UUID (the `storage.ts` type comment claiming "Stable UUID" was wrong and has been corrected in code). The runtime statement id is renamed `runtimeStatementId` (done, in `AnalyticsSegmentInput`) and is never a FK. Note the two silent no-ops found and fixed: (a) `getAnalyticsSegmentVersions` fed runtime statement numbers into a `NoteSegment` UUID lookup (every analytics row had `segmentVersion` 0) — deleted; one result = one block, so all rows carry the block's identity; (b) `updateEntry` looked up `getLatestSegmentVersion(blockContentId)` — a content hash in a segment-id lookup, so every result's `segmentVersion` was undefined — now keyed by `segmentId`.
- *Nuance (2026-07-20):* `generateSectionId` embeds a hash of the first 64 content characters, so `NoteSegment.id` is not purely positional — it identifies the content incarnation that was run. The `version` number is the lineage; a content edit chains to a new id with a bumped version via `updateEntry`'s position+type ordinal match. Cross-edit "same workout" identity at read time relies on `blockContentId` + version grouping (`groupResultsByVersion` splits current vs history by contentId).
- *Action:* reserve `segmentId` for `NoteSegment.id` (content-incarnation section id); `runtimeStatementId` is the id from `AnalyticsSegmentInput` / `OutputStatement`.

---

## Candidate 4 — Two parallel metric-extraction paths

### Problem

Analytics is derived twice from two different inputs with no shared owner. The two policies already diverge.

Display path, from `data.logs`:

```ts
// src/services/AnalyticsTransformer.ts:35-52
function resolveAnalyticsMetricKey(metric: IMetric): string {
  const enrichedMetric = metric as IMetric & { key?: string; metadata?: { target?: string } };
  const explicitKey = enrichedMetric.key ?? enrichedMetric.metadata?.target;
  if (typeof explicitKey === 'string' && explicitKey.trim().length > 0) {
    return explicitKey;
  }

  switch (metric.type) {
    case 'rep':
      return 'reps'; // canonical key for rep metrics (repetitions retired)
    // ...
  }
}
```

Persistence path, from runtime `Segment[]`:

```ts
// src/services/persistence/IndexedDBNotePersistence.ts:42-80
function resolveMetricKey(source: PersistableMetricSource): string {
  return source.key ?? source.metadata?.target ?? source.type ?? '';
}
// `rep` stays `reps` here; it is now the canonical key in both paths.
```

The workflow doc explicitly calls out the mismatch:

> Gap 3: `analyticsSegments` passed to persistence is display-shaped, not record-shaped.

So the display path and the persistence path not only have different policies — they start from different shapes. A fix to how reps are extracted must be made in both places, and the two can silently drift.

### Suggested solution

One module owns "derive the analytics view of a workout" behind a small interface. The current `getAnalyticsFromLogs` and `normalizeAnalyticsSegments` become **internal adapters**, not independent entry points. Both adapters share the same metric-extraction policy. This is the natural home for the proposed `normalizeAnalyticsFacts` / `composeSummaryFromLogs` API in `analytics-data-shapes-and-composition.md` §8.

```ts
// Sketch: one module, multiple adapters
const analytics = deriveWorkoutAnalytics(input); // input can be logs, runtime, or fact rows
const segments = analytics.toSegments();          // for display
const facts = analytics.toFacts({ noteId, resultId, pageId }); // for persistence
const summary = analytics.toSummary();            // for ComposedSummaryRecord
```

### Trade-offs to discuss
- Should the canonical input be `StoredOutputStatement[]` (the log source of truth) or `AnalyticsSegmentInput[]` (the runtime display shape)? The spec and docs agree logs are canonical, so the source-of-truth adapter should probably take `StoredOutputStatement[]`.
- The persistence path currently gets `analyticsSegments` at record time. Would the recorder instead persist `data.logs` and derive the fact rows from logs, or keep the dual input?
- How do we migrate existing analytics rows if the shared policy changes the canonical key for a metric?

### Feedback

- *Resolved (feedback):* needs a deep dive — these are really two layers: *annotations derived from the language* (per-segment) vs *summary analytics over the whole result* (aggregates).
- *Resolved (2026-07-20):* unified derivation module implemented in `src/services/analytics/workoutDerivation.ts`. The `data.logs` / `data.analytics` split was **rejected and reverted**: a single `logs` stream holds all tiers, with Tier 2 discriminated by `outputType === 'analytics'`. `WorkoutResults.analytics` removed; `buildWorkoutResults` no longer partitions; `getAnalyticsFromResults` deleted; call sites back on `getAnalyticsFromLogs`.
- *Resolved (2026-07-20):* the analytics store is **summary-only** — `normalizeSummaryFacts(logs, identity)` extracts `outputType: 'analytics'` outputs, producing one row per `result × canonical metric key`. The per-segment pipeline is deleted: `normalizeAnalyticsSegments`, `AnalyticsSegmentInput`, `NoteMutation.analytics`, `workoutResult.analyticsSegments`, recorder `analyticsSegments` param, `toAnalyticsSegmentInputs`.
- *Resolved (2026-07-20):* canonical metric key is `'reps'` in both fact and display (`repetitions` retired; `resolveAnalyticsMetricKey` maps `rep` → `reps`).
- *Deferred:* `toSummary` / `ComposedSummaryRecord` are not built — no consumer yet.
- *Action:* see [`analytics-two-layer-derivation-deep-dive.md`](./analytics-two-layer-derivation-deep-dive.md). The engine already separates the two layers; unify the downstream derivation behind one module.

---

## Candidate 5 — No replay seam for edited results

### Problem

Once a `WorkoutResult` is persisted, nothing can replay `data.logs` through the analytics layers to re-derive Tier-1 and Tier-2 metrics. The workflow doc states:

> Gap 1: No post-hoc re-derivation. The `AnalyticsEngine` is wired to a live runtime.

```ts
// From indexeddb-analytics-workflows.md §8.5 — aspirational sketch today
async function rederiveResultAnalytics(result: WorkoutResult): Promise<WorkoutResult> {
  const engine = createAnalyticsEngineForBlock(/* profile, context */); // exists at src/core/analytics/createAnalyticsEngineForBlock.ts; headless
  const emitter = new OutputEmitter();
  emitter.setAnalyticsEngine(engine);

  for (const rawOutput of result.data.rawLogs ?? result.data.logs) {
    emitter.add(rawOutput);
  }

  emitter.finalizeAnalytics();
  result.data.logs = emitter.getAll();
  // ...
}
```

> *Body corrected (2026-07-20):* `createAnalyticsEngineForBlock` exists at `src/core/analytics/createAnalyticsEngineForBlock.ts`; the `AnalyticsEngine` is headless and replay can drive it directly, skipping `OutputEmitter`. The sketch above is the legacy aspirational shape; the implementation path is via the headless engine.

The spec's §7 re-derivation cascade is correct, but the building blocks don't exist:

1. Strip existing `origin: 'analyzed'` metrics from the edited segment.
2. Re-run the applicable `IRealtimeProcessor`(s) on that segment.
3. Re-run all `ISummaryProcessor`s over the full `data.logs` → new `StoredOutputStatement[]` (`outputType: 'analytics'`).
4. Replace Tier-2 outputs inside `data.logs`.
5. Re-normalize summary `analytics` store facts.

Steps 1-4 are trapped inside the live-runtime path.

### Suggested solution

A headless "derive from logs" module that wraps the same annotation + aggregation layers, but with no runtime lifecycle. Both the live path and the edit-replay path call it.

```ts
// Sketch: headless derivation
const derived = deriveWorkoutFromLogs({
  logs: result.data.logs,
  profile, // effort registry, processor config
});

result.data.logs = derived; // single stream: Tier 0 + Tier 1 + Tier 2
// Then normalize summary facts: normalizeSummaryFacts(result.data.logs, identity)
```

### Trade-offs to discuss
- What context does the headless engine need (effort registry, user profile, processor config)? Today this context is implicit in the live runtime.
- Is edit replay an actual product feature, or just a future capability? If the UI does not allow editing logs today, this is lower priority than Candidates 1-4.
- If we keep the `analytics` store (Candidate 1), this module becomes essential. If we retire the store, the headless derivation is still useful for the live path and any future edit feature.

### Feedback

- *Resolved (feedback):* HIGH PRIORITY — design and figure out how to make replay work.
- *Resolved (2026-07-20):* replay seam implemented in `src/services/analytics/workoutDerivation.ts` (`deriveWorkoutFromLogs` / `replayResultAnalytics`) and `IndexedDBNotePersistence.rederiveResultAnalytics(resultId)`. Flow: pinned segment incarnation → replay → write back `data.logs` (single stream) → purge + rewrite summary facts via `deleteAnalyticsPointsForResult`. Strip rule is `origin === 'analyzed'` only; `origin: 'analyzed-estimated'` predictions are **preserved as recorded**. `deriveWorkoutFromLogs` returns a single `StoredOutputStatement[]` containing enriched segments + Tier-2 outputs.
- *Action:* see [`analytics-replay-seam-deep-dive.md`](./analytics-replay-seam-deep-dive.md). Reframe: the `AnalyticsEngine` is already headless; replay drives the engine directly, skipping `OutputEmitter`.

---

## Candidate 6 — The `page` store (RESOLVED: KEEP)

### Problem

The storage spec introduces a new `page` store and `pageId` on five tables. The change log has ~30 rows (P-*, N-*, REL-*) around this abstraction. But the spec's own inventory says the current pattern is universal client-side filtering:

> `getAllNotes()` is the universal list entry point. Most filtering (tags, dates, search, kind, notebook) happens client-side after this single IndexedDB call.

There is no `calendar` store to rename. V9 `IndexedDBService.ts` does not create one:

```ts
// Current V9 stores (IndexedDBService.ts:46-92)
export interface WodWikiDB extends DBSchema {
  notes: { ... };
  segments: { ... };
  results: { ... };
  attachments: { ... };
  analytics: { ... };
  efforts: { ... };
}
```

So the `page` store is not a rename — it is a **net-new store** plus a **new FK on every row** in five tables. The only current page-scoped query (journal-date grouping) is served by `notes.journalDate`/`targetDate` + client-side filtering.

By "one adapter = hypothetical seam," the `page` store is hypothetical today. It would become a real seam when a feature issues a page-scoped IndexedDB query that cannot be done client-side — most likely cross-workout trends.

### Suggested solution

Keep the `page` store (feedback: it creates a name + slug way of looking up a grouped collection of notes). It is the lookup mechanism for named/slug-addressable note collections, not merely speculative future joins. The original "speculative seam" framing is retracted.

Design priorities now that it is kept:
- Confirm the first concrete reader (grouped-collection lookup by name/slug) and design the `page` schema against it.
- Decide whether `pageId` replaces `journalDate`/`targetDate` or coexists, so we don't add a field without retiring the old grouping path.

### Trade-offs to discuss
- Is the page store needed for the migration away from `notes.rawContent`/`segmentIds` (N-03, N-04)? Those note-simplification tickets seem separable from adding `page`.
- Does `pageId` replace `journalDate`/`targetDate` entirely, or coexist? If it coexists, we add a field without removing one.
- The trend feature would genuinely want page-scoped queries. Should the page store be implemented only when that feature is scheduled?

### Feedback

- *Resolved (feedback):* KEEP — the page store is the name + slug lookup for grouped note collections.
- *Open:* does `pageId` replace or coexist with `journalDate`/`targetDate`?

---

## Candidate 7 — Playground provenance (RESOLVED: origin field)

### Problem

Results recorded from the playground surface and results recorded from a journal note currently share the same `WorkoutResult` shape and the same default filters. There is no way to distinguish a "real" journal entry from an experimental playground run, so playground results pollute trend queries and progress views by default. None of the six existing candidates covered this gap.

### Suggested solution

Add an `origin` field to `WorkoutResult` and `AnalyticsDataPoint` / `AnalyticsFact` with values `'journal' | 'playground'`. Stamp the value at the Result Recorder seam:

- Default derived from the `noteId` prefix (journal vs. playground).
- Explicit override available for canvas surfaces (e.g. `MarkdownCanvasPage`) that run a workout in a non-journal context.

Default journal and progress filters exclude `origin === 'playground'`; playground results remain recorded and viewable via a toggle. Legacy rows without `origin` fall back to the `playground/` noteId prefix heuristic. A `by-origin` index is a v10 candidate, but filtering is client-side today.

### Trade-offs to discuss

- Should origin be inferred from the note type, the route, or an explicit recorder flag? The recorder seam is the single source of truth.
- Does excluding playground from default trends hide useful data, or is that the desired default? (Desired: journal is the authoritative training log; playground is experimental.)
- Is a database index needed immediately, or is client-side filtering acceptable until v10? (Client-side is acceptable; add `by-origin` in v10.)

### Feedback

- *Resolved (2026-07-20):* `origin: 'journal' | 'playground'` added to `WorkoutResult` and `AnalyticsDataPoint`. Recorder seam stamps origin; default filters exclude playground; legacy fallback uses `playground/` noteId prefix; `by-origin` index shipped in v10. This closes the playground-filtering gap.

---

```mermaid
flowchart TD
    C2[Candidate 2: adopt spec] --> C3[Candidate 3: segmentId = NoteSegment.id\n(positional line-based section id)]
    C3 --> C4[Candidate 4: unified derivation]
    C4 --> C5[Candidate 5: replay seam — HIGH PRIORITY]
    C4 -.shares one module.-> C5
    C1[Candidate 1: analytics store KEPT] --> C4
    C1 --> C6[Candidate 6: page store KEPT]
    C4 --> C7[Candidate 7: origin field\nplayground provenance]
```

**Recommended sequencing:**
1. **Candidates 2 + 3** — adopt the proposed schema; pin `segmentId` = `NoteSegment.id` (content-incarnation section id); confirm the content-stable cross-note key. Blocks all schema work.
2. **Candidate 5 (HIGH PRIORITY)** — replay seam; reframe in [`analytics-replay-seam-deep-dive.md`](./analytics-replay-seam-deep-dive.md). Its unified module is shared with Candidate 4.
3. **Candidate 4** — unified two-layer derivation ([`analytics-two-layer-derivation-deep-dive.md`](./analytics-two-layer-derivation-deep-dive.md)); makes the analytics store (Candidate 1) consistent.
4. **Candidates 1 + 6** — analytics read path + page store, built once derivation is unified.

---

## Open questions

1. **(Resolved)** Does a product read the `analytics` store? — Yes: cross-workout search / "find similar workouts." Store is KEPT.
2. **(Resolved)** Is cross-note aggregation still a priority? — Yes; the `cross-note-result-aggregation` ADR stands. The content-stable cross-note key is `blockContentId` (retained); `segmentId` is a content-incarnation section id. R-03/AN-02 are reversed.
3. **(Resolved)** How are runtime statement ids correlated with NoteSegment ids today? `getAnalyticsSegmentVersions` fed runtime ids into `getLatestSegments` (UUID lookup) — it was silently a no-op. Deleted 2026-07-20; analytics rows now carry the block's identity directly.
4. **(Resolved)** Does the UI allow editing `WorkoutResult.data.logs` today? No log-edit UI exists; the replay seam is capability-building until an edit UI ships.
5. **(Resolved)** Justification for the `page` store? — name + slug lookup for grouped note collections. KEPT. Open: replace or coexist with `journalDate`/`targetDate`?

---

## Changelog

| Date | Author | Change |
|---|---|---|
| 2026-07-16 | — | Initial review from the three in-progress specs. |
| 2026-07-16 | — | Folded in feedback: C1/C6 KEEP, C2 follow spec, C3 segmentId=UUID, C4/C5 → deep dives. Added two linked deep-dive docs. |
| 2026-07-20 | — | Validated against code. C3 amended (`segmentId` = content-incarnation `NoteSegment.id`, not UUID; embeds content hash, version is lineage); C5 stale claim corrected; added Candidate 7 (playground origin); R-02/R-04 gated; identity write path + version consolidation implemented. |
| 2026-07-20 | — | Second wave: C1 cross-note read path implemented; C4 unified derivation module + data.logs/data.analytics split implemented (ComposedSummaryRecord deferred); C5 replay seam implemented (`workoutDerivation.ts`, `rederiveResultAnalytics`); v10 shipped additively. |
| 2026-07-20 | — | Third wave: CONTEXT reconciliation — data.logs/data.analytics split rejected and reverted; analytics store summary-only (`normalizeSummaryFacts`); per-segment pipeline deleted; canonical key `'reps'` everywhere; replay preserves `analyzed-estimated` predictions; `getOrCreatePageForDate` race-tolerant. |
| 2026-07-20 | — | **Fourth wave (v11):** destructive schema migration shipped — `notes` slimmed; `segments` flattened with `position`; `results.completedAt` → `createdAt`; `note_tags` migration + cascade delete. |
