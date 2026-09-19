---
tags: [domain-model]
store: sessions
legacyStore: results
keyPath: "id"
db: wodwiki-db (v21)
---

# Session

> [!info] Implementation Note
> Renamed from `WorkoutResult` (table `results` → `sessions`, DB v20) and flattened in V21: the statement stream no longer lives on the row. Every statement is an [[EventRecord]].

## Current State (Implemented in Code)

- **Store:** `sessions` (legacy `results` copied on V20, flattened on V21)
- **Key path:** `id`
- **Type source:** `apps/playground/src/types/storage.ts` (`Session`)
- **Database version:** `wodwiki-db` (v21)

Outcome of running a specific [[NoteSegment]] version. Born `status: 'in-progress'` at workout start, flipped to `'completed'` at finalize. A session row is **execution metadata only** (V21): statements and metrics live as [[EventRecord]] rows, and display/replay shapes are reconstructed from them (`eventsToStoredLogs`).

### Fields (Current)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | UUID |
| `segmentId?` | string | Recorded occurrence identity → [[NoteSegment]].id |
| `segmentVersion?` | number | Pinned segment version at record time |
| `noteId` | string | FK → [[Note]] |
| `blockId?` | string | Section-position identity |
| `blockContentId?` | string | Same-content history join with [[BlockIndexRow]]; not a foreign key or occurrence identifier |
| `version?` | number | LEGACY — retired computeVersion() generation |
| `origin?` | ResultOrigin | 'journal' \| 'playground' \| 'user'; playground excluded from default filters |
| `status?` | 'in-progress' \| 'completed' | Absent = 'completed' (legacy rows) |
| `pageId?` | string | FK → [[Page]] — copied from parent note (V10) |
| `startTime` | number | When the workout started (flattened from `data` in V21) |
| `endTime` | number | When the workout ended |
| `duration` | number | Total elapsed time (ms) |
| `roundsCompleted?` / `totalRounds?` | number | Rounds-based workouts |
| `repsCompleted?` | number | Rep-based workouts |
| `completed` | boolean | Finished vs stopped early |
| `createdAt` | number | When the workout was finished |

### Indexes (Current)

| Index | Key path | Unique | Purpose |
|-------|----------|--------|---------|
| `by-segment` | `segmentId` | no | per-block journal queries |
| `by-note` | `noteId` | no |  |
| `by-completed` | `createdAt` | no | recency ordering |
| `by-content` | `blockContentId` | no | cross-workout joins (V6) |
| `by-block` | `blockId` | no | position identity (V6) |

### Relationships (Current)

#### Outgoing (this row references)

- `noteId` → [[Note]] — parent
- `segmentId + segmentVersion` → [[NoteSegment]] — pinned recorded occurrence/version
- `pageId` → [[Page]]
- `blockContentId` → [[BlockIndexRow]] — content-hash join

#### Incoming (referenced by)

- [[Attachment]].`resultId`
- [[EventRecord]].`resultId`
- [[FieldSourceRecord]].`id` — polymorphic `result:<id>`

#### Relationship tables

- [[FieldSourceRecord]] — field contributions of this result

---

## Future State (Proposed)

### Typed-note composition recommendations

These recommendations do not implement behavior or resolve a ticket; mode policy lives in [[Page#Mode and write destinations]] and identity questions in [[NoteSegment#Identity and round-trip questions]].

- Saving a result is separate from editing note source. Run may be available in read presentation, but its owning note, occurrence/version and save destination must be explicit.
- Preserve the two identity axes: a specific recorded occurrence/version versus intentional same-content history. Identical blocks do not share edit targets merely because their content IDs match.
- Keep result identity stable between completion, persistence and any inserted session-results query. Read-only source must not be mutated just to display results; the host needs a permitted presentation/destination.
- Do not derive result `origin` solely from a newly named note type or silently reassign history when a note moves between pages. Existing journal/playground filtering remains a compatibility constraint.
- **Canonical execution routes:** browsing execution sessions lives at `/sessions` (with optional WQL query); session detail lives at `/sessions/:sessionId`; sessions from a specific date live at `/session/:date`. Legacy `/results` and `/results/:resultId` redirect to these routes.
- **Outgoing note links:** links from a session record to its parent workout target `/notes/:noteId` (or `/c/:slug/:page-slug` for corpus items without stored note rows).

**Feedback case:** run the second of two identical workouts on a read-presented note. Where is the result stored and displayed if the source cannot accept a results-query insertion? The run must not overwrite seed content or attach to the first occurrence.

### Implemented rename and flattening

Landed as its own cutover (commit `0988427e` and the V21 migration). No compatibility aliases remain.

- **Store:** `sessions` (renamed from `results` in V20; flattened in V21).
- **Entity:** `Session` (renamed from `WorkoutResult`); `UnifiedEventRecord` → [[EventRecord]].
- **Fields:** the inline `data` payload is gone — scalars flattened onto the row, statements stored as [[EventRecord]] rows.
- **Ids:** stored identifiers keep their historical names (`resultId`, `field_sources` prefix `result:<id>`, `${resultId}:${seq}` row ids) because they are persisted keys, not vocabulary.


## Map

![[domain-model.canvas]]
