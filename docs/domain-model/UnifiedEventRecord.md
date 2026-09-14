---
tags: [domain-model]
store: events
keyPath: "id"
db: wodwiki-db (v19)
---

# UnifiedEventRecord

**Store:** `events` · **Key path:** `id` · **Type source:** `packages/core/src/types/storage.ts`

THE single stored record for all workout data (V16, tickets 002–004) — replaced the deleted `analytics` store. Grain `'event'` rows are immutable/append-only; grain `'summary'` rows use deterministic content keys so re-finalize overwrites cleanly. `projectEventToFacts` folds rows into AnalyticsDataPoint at query time.

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | `${resultId}:${seq}` event \| `${resultId}:summary:${metricKey}[:k=v…]` summary \| `wellness:${noteId}:${key}` |
| `resultId` | string | FK → [[WorkoutResult]] |
| `noteId` | string | FK → [[Note]] |
| `blockContentId?` | string | Content-stable cross-workout join key → [[BlockIndexRow]] |
| `pageId?` | string | FK → [[Page]] |
| `origin?` | ResultOrigin |  |
| `timestamp` | number | Canonical time — when the workout happened |
| `grain` | EventGrain | 'event' raw statement \| 'summary' folded row |
| `effortSlug?` | string | FK → [[Effort]].slug |
| `outputType` | string | Open vocabulary — KNOWN_OUTPUT_TYPES: segment, system, load, event, compiler, completion, analytics, wellness |
| `metrics` | StoredOutputStatement['metrics'] | Typed metric array; EXACTLY ONE entry on summary rows |
| `timeSpan?` | { started: number; ended?: number } |  |
| `sourceBlockKey?` | string |  |
| `stackLevel?` | number |  |
| `completionReason?` | string |  |
| `segmentId? / segmentVersion?` | string / number | → [[NoteSegment]] |
| `metricTemporal?` | MetricTemporal[] | Per-metric temporal anchors — instant or civil-date (ticket 12) |
| `metricDateKeys?` | string[] | `d:YYYY-MM-DD` keys — multiEntry index source (ticket 14) |
| `representationKind?` | 'direct' \| 'calculated' \| 'substitute_summary' |  |
| `summaryCoverage?` | SummaryCoverage | Scope a substitute summary covers |
| `reducerStats?` | ReducerStats | Retained stats for substitution proofs |

## Indexes

| Index | Key path | Unique | Purpose |
|-------|----------|--------|---------|
| `by-timestamp` | `timestamp` | no | the one proven culling index |
| `by-result-grain` | `[resultId, grain]` | no | finalize clear, per-result fetch, orphan GC |
| `by-content-grain` | `[blockContentId, grain]` | no | blockContentId join hot path |
| `by-effort` | `effortSlug` | no |  |
| `by-outputType` | `outputType` | no |  |
| `by-grain` | `grain` | no |  |
| `by-metric-date` | `metricDateKeys` | no | multiEntry civil-date keys (V17) |

## Relationships

### Outgoing (this row references)

- `resultId` → [[WorkoutResult]]
- `noteId` → [[Note]]
- `pageId` → [[Page]]
- `effortSlug` → [[Effort]]
- `segmentId` → [[NoteSegment]]
- `blockContentId` → [[BlockIndexRow]] — content-hash join

## Map

![[domain-model.canvas]]
