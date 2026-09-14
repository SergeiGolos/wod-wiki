---
tags: [domain-model]
store: note_tags
keyPath: "id"
db: wodwiki-db (v19)
role: relationship-table
---

# NoteTag

**Store:** `note_tags` · **Key path:** `id` · **Type source:** `apps/playground/src/types/storage.ts`

**Relationship table** — normalized many-to-many join between [[Note]] and [[Tag]] (V10).

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | UUID |
| `noteId` | string | FK → [[Note]] |
| `tagId` | string | FK → [[Tag]] |

## Indexes

| Index | Key path | Unique | Purpose |
|-------|----------|--------|---------|
| `by-note` | `noteId` | no | tags of a note |
| `by-tag` | `tagId` | no | notes carrying a tag |

## Relationships

> [!info] This store **is** a relationship table.

### Outgoing (this row references)

- `noteId` → [[Note]]
- `tagId` → [[Tag]]

## Map

![[domain-model.canvas]]
