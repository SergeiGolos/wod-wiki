# Ticket 002 — Unified event-record shape (decided spec)

**Status**: decided 2026-08-24 · grilling session · feeds
[003 QueryService & WQL impact](../tickets/003-query-service-and-wql-impact.md),
[004 migration & backfill](../tickets/004-migration-and-backfill-story.md),
[005 write-path lifecycle](../tickets/005-write-path-lifecycle.md)

## The record

```ts
/**
 * THE single stored record for all workout data.
 * Replaces StoredOutputStatement-in-logs AND AnalyticsDataPoint-in-analytics.
 */
interface UnifiedEventRecord {
  // ── identity ──────────────────────────────────────────────────────
  id: string;
  //   events:    `${resultId}:${seq}`                — immutable, append-only
  //   summaries: `${resultId}:summary:${canonicalKey}:${groupTags.join('|')}`
  //              — deterministic; re-finalize overwrites cleanly
  resultId: string;

  // ── promoted scalars (columns on every row) ───────────────────────
  timestamp: number;            // workout-time (NOT derivation-time)
  grain: 'event' | 'summary';   // derived-ness IS the grain value
  outputType: string;           // open vocabulary, see Decision 5
  effortSlug?: string;

  // ── payload ───────────────────────────────────────────────────────
  metrics: Metric[];            // typed array; EXACTLY ONE entry when grain:'summary'
  timeSpan?: TimeSpan;          // event rows only
  sourceBlockKey?: string;
  stackLevel?: number;
  completionReason?: string;
  // canonicalKey + group tags stay inside metrics[0].metadata (shape-uniform
  // with events); the summary key-derivation function reads them from there.
}
```

## Decisions

1. **Event-grain statement rows.** One row = one output statement; `metrics`
   stays a small typed array; no per-metric-family columns (composed calcs
   #878 and future user-defined metrics make column sets unbounded).
   *Accepted*: metric-level filtering is scan-based — ticket 001 measured
   scan-first at 0.35× the indexed path, so no by-metric index is needed.
2. **Finalize-owns-summaries.** Live emissions stay in engine memory; the
   store sees only event rows during a run. Finalize writes the summary set
   in one transaction (delete `[resultId,'summary']` range + put finals —
   atomic, retry-safe). The N9 duplicate-emission class dies structurally.
   *Accepted*: mid-workout store reads see events only (live summaries come
   from engine memory); orphan partial-save results have no summaries until
   finalize — and are cleanly re-derivable.
3. **Five indexes.** `by-timestamp`, `['resultId','grain']` (finalize clear,
   per-result fetch, orphan GC), `by-effort`, `by-outputType`, `by-grain`.
   *Accepted*: ~6× write amplification (vs 13× today) at human write cadence;
   per 001 these buy first-class access paths and ops, not speed — non-selective
   legs still may lose to scans.
4. **grain discrimination; rollups unstored.** `grain: 'event' | 'summary'`
   (renames today's fact-grain 'segment'); summaries carry exactly one metrics
   entry — same record interface, one reader path. Rollups (Foster
   ACWR/monotony/strain) are pure read-time math over summaries, never rows —
   no stale-derived state (#877 class). *Flag*: `outputType: 'event'` exists
   producer-side (`OutputEmitter.ts:415`) — producer-kind vs store-row-kind,
   different axes sharing a word; documented, tolerated.
5. **Open outputType vocabulary.** `outputType: string`; a vocabulary module
   lists the seven known producer values (`segment`, `system`, `load`,
   `event`, `compiler`, `completion`, `analytics`) for UI completion and docs.
   *Accepted*: consumers must tolerate unknown kinds — unknowns are stored and
   returned, matched only by kind-agnostic logic; a vocabulary-drift report
   surfaces unseen values rather than letting them vanish silently.

## Lifecycle consequences

- **During run**: event rows appended at save points; no summary writes.
- **Finalize**: one tx via `by-result-grain` — clear summaries, write finals
  (deterministic keys ⇒ idempotent re-finalize after edits/re-derivation).
- **Orphan GC**: `by-result-grain` range scan finds partial-save leftovers.
- **Rollups**: computed at read; nothing to invalidate.
- **`normalizeSummaryFacts`**: survives with exactly two callers — finalize
  (write path) and cross-store joins (derive-at-query). One derivation
  definition, unchanged locality.

## Handed downstream

- **003 (QueryService/WQL)**: SELECT legs read event rows directly;
  summary-grain queries read `grain:'summary'`; joins re-derive from events.
- **004 (migration)**: logs + fact rows → event rows (≈1:1 from statements);
  summaries re-derived once at backfill; version-bump swap, old stores dropped.
- **005 (write-path)**: emission → memory buffer → event-row flush points;
  finalize tx contract; failure fallback = events survive, summaries absent
  and re-derivable.
