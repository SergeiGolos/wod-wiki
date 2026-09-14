---
tags: [domain-model]
store: notes
keyPath: "id"
db: wodwiki-db (v19)
---

# Note

**Store:** `notes` · **Key path:** `id` · **Type source:** `apps/playground/src/types/storage.ts`

Root container — identity, routing and grouping only. Content lives in versioned [[NoteSegment]] rows; journal grouping via [[Page]]; tags via [[NoteTag]].

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | UUID — canonical storage identity (V8) |
| `title` | string | Display name |
| `slug?` | string | Routing sugar; routes resolve slug → UUID. Never a join key |
| `pageId?` | string | FK → [[Page]] (V10) |
| `createdAt` | number | Unix ms |
| `type?` | NoteKind | 'note' \| 'template' \| 'playground' \| 'journal' |
| `sourceId?` | string | Note this one was created from — template/collection source (N-10) |
| `catalog?` | string | Static-note catalog id; undefined for journal notes |
| `seedOrigin?` | 'seed' \| 'user' | Seed-import ownership marker; absent ≡ user-owned |
| `seedVersion?` | number | manifest.version of last seed write |
| `seedChunkId?` | string | Seed chunk provenance |

## Indexes

| Index | Key path | Unique | Purpose |
|-------|----------|--------|---------|
| `by-slug` | `slug` | yes | slug (route) → UUID (V8) |
| `by-page` | `pageId` | no | page-scoped note queries (V10) |

## Relationships

### Outgoing (this row references)

- `pageId` → [[Page]] — journal-date grouping
- `sourceId` → [[Note]] — self — creation source

### Incoming (referenced by)

- [[NoteSegment]].`noteId`
- [[WorkoutResult]].`noteId`
- [[Attachment]].`noteId`
- [[NoteTag]].`noteId`
- [[UnifiedEventRecord]].`noteId`
- [[BlockIndexRow]].`noteId`
- [[FieldSourceRecord]].`id` — polymorphic `note:<id>`

## Relationship tables

- [[NoteTag]] — joins Note ↔ Tag
- [[FieldSourceRecord]] — field contributions of this note

## Map

![[domain-model.canvas]]
