---
tags: [domain-model]
store: page
keyPath: "id"
db: wodwiki-db (v19)
---

# Page

**Store:** `page` · **Key path:** `id` · **Type source:** `apps/playground/src/types/storage.ts`

Named/slug-addressable grouped collection of notes (V10). Two flavors: calendar page (`date` set, one per journal date) and custom page (`slug` set).

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | UUID |
| `date?` | string | YYYY-MM-DD — calendar page; unique when present |
| `slug?` | string | Custom page slug; unique when present |
| `title?` | string |  |
| `createdAt` | number | Unix ms |

## Indexes

| Index | Key path | Unique | Purpose |
|-------|----------|--------|---------|
| `by-date` | `date` | yes | calendar lookup |
| `by-slug` | `slug` | yes | custom page lookup |

## Relationships

### Incoming (referenced by)

- [[Note]].`pageId`
- [[NoteSegment]].`pageId` — copied from parent note
- [[WorkoutResult]].`pageId` — copied from parent note
- [[Attachment]].`pageId` — copied from parent note
- [[UnifiedEventRecord]].`pageId`

## Map

![[domain-model.canvas]]
