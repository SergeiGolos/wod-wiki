---
tags: [domain-model]
store: block_index
keyPath: "id"
db: wodwiki-db (v19)
---

# BlockIndexRow

**Store:** `block_index` · **Key path:** `id` · **Type source:** `apps/playground/src/types/storage.ts`

Derived projection of [[NoteSegment]] for WQL `find:block` content queries (V14). Canonical source is `segments`; this store is disposable and rebuilt by `backfillV14`. One row per non-history segment.

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | `${noteId}:${segmentId}:${segmentVersion}` |
| `noteId` | string | FK → [[Note]] |
| `segmentId` | string | → [[NoteSegment]].id |
| `segmentVersion` | number | → [[NoteSegment]].version |
| `position?` | number | Ordinal within parent note |
| `dataType` | string | 'wod' \| 'h1'..'h6' \| 'markdown' \| 'frontmatter' |
| `blockContentId?` | string | Content-stable identity for wod blocks (FNV-1a hash); undefined for prose |
| `rawContent` | string | Searchable snippet — raw markdown |
| `noteTitle` | string | Denormalized for display |
| `createdAt` | number |  |
| `isStatic?` | boolean | Bundled static content vs user journal |
| `sourceId?` | string | Original source id for static files |

## Indexes

| Index | Key path | Unique | Purpose |
|-------|----------|--------|---------|
| `by-note` | `noteId` | no | per-note rebuilds |
| `by-content` | `blockContentId` | no | cross-store joins |
| `by-type` | `dataType` | no | filter by block kind |

## Relationships

### Outgoing (this row references)

- `noteId` → [[Note]]
- `segmentId + segmentVersion` → [[NoteSegment]] — derived projection source

### Incoming (referenced by)

- [[WorkoutResult]].`blockContentId` — content-hash join, not an FK
- [[UnifiedEventRecord]].`blockContentId` — content-hash join, not an FK

## Map

![[domain-model.canvas]]
