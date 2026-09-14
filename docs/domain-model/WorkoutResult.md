---
tags: [domain-model]
store: results
keyPath: "id"
db: wodwiki-db (v19)
---

# WorkoutResult

**Store:** `results` · **Key path:** `id` · **Type source:** `apps/playground/src/types/storage.ts`

Outcome of running a specific [[NoteSegment]] version. Born `status: 'in-progress'` at workout start, flipped to `'completed'` at finalize; `data.logs` stay the archival source of truth folded into [[UnifiedEventRecord]] rows.

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | UUID |
| `segmentId?` | string | Positional identity → [[NoteSegment]].id |
| `segmentVersion?` | number | Segment version at record time |
| `noteId` | string | FK → [[Note]] |
| `blockId?` | string | Section-position identity |
| `blockContentId?` | string | Content-stable hash → [[BlockIndexRow]] |
| `version?` | number | LEGACY — retired computeVersion() generation |
| `origin?` | ResultOrigin | 'journal' \| 'playground' \| 'user'; playground excluded from default filters |
| `status?` | 'in-progress' \| 'completed' | Absent = 'completed' (legacy rows) |
| `pageId?` | string | FK → [[Page]] — copied from parent note (V10) |
| `data` | WorkoutResults | The actual results data |
| `createdAt` | number | When the workout was finished |

## Indexes

| Index | Key path | Unique | Purpose |
|-------|----------|--------|---------|
| `by-segment` | `segmentId` | no | per-block journal queries |
| `by-note` | `noteId` | no |  |
| `by-completed` | `createdAt` | no | recency ordering |
| `by-content` | `blockContentId` | no | cross-workout joins (V6) |
| `by-block` | `blockId` | no | position identity (V6) |

## Relationships

### Outgoing (this row references)

- `noteId` → [[Note]] — parent
- `segmentId` → [[NoteSegment]] — positional identity
- `pageId` → [[Page]]
- `blockContentId` → [[BlockIndexRow]] — content-hash join

### Incoming (referenced by)

- [[Attachment]].`resultId`
- [[UnifiedEventRecord]].`resultId`
- [[FieldSourceRecord]].`id` — polymorphic `result:<id>`

## Relationship tables

- [[FieldSourceRecord]] — field contributions of this result

## Map

![[domain-model.canvas]]
