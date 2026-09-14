---
tags: [domain-model]
store: segments
keyPath: "[id, version]"
db: wodwiki-db (v19)
---

# NoteSegment

**Store:** `segments` · **Key path:** `[id, version]` · **Type source:** `apps/playground/src/types/storage.ts`

Versioned chunk of note content — replaces the V3 scripts + section_history stores. Compound key `[id, version]`: every edit creates a new row; superseded versions flagged `isHistory`.

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Positional section id (line-based); key part 1 |
| `version` | number | 1, 2, 3… bumps on content change; key part 2 |
| `noteId` | string | FK → [[Note]] |
| `position?` | number | Ordinal within parent note, document order (V11) |
| `pageId?` | string | FK → [[Page]] — copied from parent note (V10) |
| `dataType` | SegmentDataType | 'script' \| 'youtube' \| 'markdown' \| 'header' \| 'frontmatter' \| 'wod' \| 'title' \| 'h1'…'h6' |
| `data` | ScriptBlock \| null | Structured JSON payload for WOD sections |
| `rawContent` | string | Original markdown / source text |
| `createdAt` | number | When this version was saved |
| `updatedAt?` | number | Last touch of this incarnation (V10) |
| `isHistory?` | boolean | true for superseded versions; false for latest per id |

## Indexes

| Index | Key path | Unique | Purpose |
|-------|----------|--------|---------|
| `by-note` | `noteId` | no | segments of a note |
| `by-type` | `dataType` | no | filter by kind |
| `by-page` | `pageId` | no | page-scoped queries (V10) |
| `by-history` | `isHistory` | no | live vs superseded |

## Relationships

### Outgoing (this row references)

- `noteId` → [[Note]] — parent
- `pageId` → [[Page]] — copied from parent note

### Incoming (referenced by)

- [[WorkoutResult]].`segmentId + segmentVersion` — positional identity of the block run
- [[UnifiedEventRecord]].`segmentId + segmentVersion`
- [[BlockIndexRow]].`segmentId + segmentVersion` — derived projection

## Map

![[domain-model.canvas]]
