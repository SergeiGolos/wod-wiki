---
tags: [domain-model]
store: events
keyPath: "id"
db: wodwiki-db (v19)
---

# UnifiedEventRecord

> [!info] Current vs Future State
> This document distinguishes the current implementation in code from proposed/future-state enhancements.

## Current State (Implemented in Code)

- **Store:** `events`
- **Key path:** `id`
- **Type source:** `packages/core/src/types/storage.ts`
- **Database version:** `wodwiki-db` (v19)

Unified query/event representation for workout data; recorded workouts retain archival logs in [[WorkoutResult]]. Grain `event` rows represent raw outputs; grain `summary` rows support derived aggregates. Wellness rows are reconciled from note content rather than requiring a recorded workout. `projectEventToFacts` folds rows into query facts.

### Fields (Current)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | `${resultId}:${seq}` event \| `${resultId}:summary:${metricKey}[:k=v…]` summary \| `wellness:${noteId}:${key}` |
| `resultId` | string | [[WorkoutResult]] for workout rows; synthetic `wellness:<noteId>` source for note-derived wellness |
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

### Indexes (Current)

| Index | Key path | Unique | Purpose |
|-------|----------|--------|---------|
| `by-timestamp` | `timestamp` | no | the one proven culling index |
| `by-result-grain` | `[resultId, grain]` | no | finalize clear, per-result fetch, orphan GC |
| `by-content-grain` | `[blockContentId, grain]` | no | blockContentId join hot path |
| `by-effort` | `effortSlug` | no |  |
| `by-outputType` | `outputType` | no |  |
| `by-grain` | `grain` | no |  |
| `by-metric-date` | `metricDateKeys` | no | multiEntry civil-date keys (V17) |

### Relationships (Current)

#### Outgoing (this row references)

- `resultId` → [[WorkoutResult]] for workout rows; wellness uses a synthetic per-note source ID, not a result foreign key
- `noteId` → [[Note]]
- `pageId` → [[Page]]
- `effortSlug` → [[Effort]]
- `segmentId` → [[NoteSegment]]
- `blockContentId` → [[BlockIndexRow]] — content-hash join

---

## Future State (Proposed)

### Typed-note composition recommendations

- Keep event/query representation separate from authored source and recorded-result ownership. A reusable graph consumes query results; it must not write event rows as an alternative editor-save path.
- Preserve source identity and provenance through note deletion/re-key or projection rebuild. Runtime output type `segment` is not a new [[NoteSegment]] kind.
- Do not create another page-membership projection here. Existing `pageId` semantics follow [[Page#Recommended composition contract]]; query-derived membership does not rewrite events.

**Feedback case:** a workout note appears in a second collection or switches to read presentation. Its recorded facts must remain attached to the original run, not be duplicated or reassigned because presentation changed. See [[WorkoutResult#Typed-note composition recommendations]].

These are review proposals; the session-renaming proposal below is independent and remains unimplemented.

### Proposed Structure (Session Renaming)

In the proposed future state:
- `resultId` transitions to `sessionId` pointing to [[WorkoutResult|sessions]].
- Event ID formatting updates from `${resultId}:${seq}` to `${sessionId}:${seq}`.
- Index `by-result-grain` updates from `[resultId, grain]` to `[sessionId, grain]` (`by-session-grain`).

## Map

![[domain-model.canvas]]
