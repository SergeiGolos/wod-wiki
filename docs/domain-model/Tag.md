---
tags: [domain-model]
store: tags
keyPath: "id"
db: wodwiki-db (v19)
---

# Tag

**Store:** `tags` · **Key path:** `id` · **Type source:** `apps/playground/src/types/storage.ts`

Normalized note tag (V10). Attached to notes exclusively through the [[NoteTag]] relationship table.

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | UUID |
| `label` | string | Unique |
| `type?` | TagType | 'template' \| 'playground' \| 'qualification' \| 'notebook' \| 'general' |
| `createdAt` | number | Unix ms |

## Indexes

| Index | Key path | Unique | Purpose |
|-------|----------|--------|---------|
| `by-label` | `label` | yes | label lookup |
| `by-type` | `type` | no | filter by tag kind |

## Relationships

### Incoming (referenced by)

- [[NoteTag]].`tagId`

## Relationship tables

- [[NoteTag]] — joins Tag ↔ Note

## Map

![[domain-model.canvas]]
