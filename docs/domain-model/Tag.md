---
tags: [domain-model]
store: tags
keyPath: "id"
db: wodwiki-db (v19)
---

# Tag

> [!info] Current vs Future State
> This document distinguishes the current implementation in code from proposed/future-state enhancements.

## Current State (Implemented in Code)

- **Store:** `tags`
- **Key path:** `id`
- **Type source:** `apps/playground/src/types/storage.ts`
- **Database version:** `wodwiki-db` (v19)

Normalized note tag (V10). Attached to notes exclusively through the [[NoteTag]] relationship table.

### Fields (Current)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | UUID |
| `label` | string | Unique |
| `type?` | TagType | 'template' \| 'playground' \| 'qualification' \| 'notebook' \| 'general' |
| `createdAt` | number | Unix ms |

### Indexes (Current)

| Index | Key path | Unique | Purpose |
|-------|----------|--------|---------|
| `by-label` | `label` | yes | label lookup |
| `by-type` | `type` | no | filter by tag kind |

### Relationships (Current)

#### Incoming (referenced by)

- [[NoteTag]].`tagId`

#### Relationship tables

- [[NoteTag]] — joins Tag ↔ Note

---

## Future State (Proposed)

### Typed-note composition recommendations

- Keep tags as classification/discovery, separate from [[Note]] type, [[Page]] placement and source-write authority. Tagging a note `effort` or `page` does not create an owning relationship or parsed projection.
- Reuse [[NoteTag]] for actual note records. An effort's proposed owning note can use that junction; no polymorphic tag target is needed merely to call an effort a note.

**Feedback question:** if a tag changes which collection queries display a note, should it ever change the editor mode or ownership? Recommended answer: no; those contracts belong to [[Note#Wayfinder questions and proposed answers]] and [[Page#Mode and write destinations]].

These are review proposals, not implemented changes. The earlier idea of direct session/query-document tagging is separate and needs a concrete use case before expanding the schema.

## Map

![[domain-model.canvas]]
