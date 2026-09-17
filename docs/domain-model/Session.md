---
tags: [domain-model]
store: sessions
legacyStore: results
keyPath: "id"
db: wodwiki-db (v20)
---

# Session

> [!info] Implementation Note
> Renamed from `WorkoutResult` with table rename `sessions` → `sessions` in DB v20. Legacy alias `WorkoutResult` is retained for backwards compatibility.

## Current State (Implemented in Code)

- **Store:** `sessions` (legacy `sessions` migrated on V20 upgrade)
- **Key path:** `id`
- **Type source:** `apps/playground/src/types/storage.ts` (`Session`)
- **Database version:** `wodwiki-db` (v20)

Outcome of running a specific [[NoteSegment]] version. Born `status: 'in-progress'` at workout start, flipped to `'completed'` at finalize; `data.logs` stay the archival source of truth folded into [[EventRecord]] rows.

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
| `data` | WorkoutResults | The actual results data |
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

**Feedback case:** run the second of two identical workouts on a read-presented note. Where is the result stored and displayed if the source cannot accept a results-query insertion? The run must not overwrite seed content or attach to the first occurrence.

### Separate session-renaming proposal

The pre-existing rename below is outside the typed-note review and remains a proposal, not a prerequisite. No schema or helper aliases are introduced by these documents.

- **Store:** `sessions` (renamed from `sessions`)
- **Key path:** `id`
- **Domain concept:** Represents a recorded workout execution session.

### Proposed Structure / Changes

1. **Table Rename:** `sessions` → `sessions`.
2. **Entity Terminology:** `WorkoutResult` → `Session` or `WorkoutSession`.
3. **Foreign Keys:** References pointing to `resultId` (such as in `attachments`, `events`, and `field_sources`) will transition conceptually to `sessionId`.
4. **Fields & Indexes:** Retain the execution payload structure (`data: WorkoutResults`, `createdAt`, `origin`, `status`, `blockContentId`). Any future rename must migrate callers and references as its own complete change, not add parallel terminology here.

## Map

![[domain-model.canvas]]
