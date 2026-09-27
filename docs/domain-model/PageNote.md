---
tags: [domain-model]
store: page_notes
keyPath: "id"
db: wodwiki-db (v23)
role: relationship-table
---

# PageNote

> [!info] Relationship Table
> Implemented in DB v22 to establish many-to-many placement and grouping between [[Page]] and [[Note]].

## Current State (Implemented in Code)

- **Store:** `page_notes`
- **Key path:** `id` (UUID)
- **Type source:** `apps/playground/src/types/storage.ts` & `packages/core/src/types/storage.ts`
- **Database version:** `wodwiki-db` (v23)

### Domain role

The canonical join table establishing placement and calendar membership:
- Connects an authored [[Note]] to one or more [[Page]] containers (calendar date pages `/journal/YYYY-MM-DD` or custom pages `/p/:slug`).
- Replaces the legacy 1:N `Note.pageId` field and eliminates synthetic note merging on multi-note calendar pages.

### Fields (Current)

| Field | Type | Notes |
|---|---|---|
| `id` | string | UUID |
| `pageId` | string | FK → [[Page]].id |
| `noteId` | string | FK → [[Note]].id |
| `position?` | number | Display/document ordinal within the parent page |
| `createdAt` | number | Unix ms |

### Indexes (Current)

| Index | Key path | Unique | Purpose |
|---|---|---|---|
| `by-page` | `pageId` | no | Fetch all notes placed on a specific page |
| `by-note` | `noteId` | no | Fetch all pages placing a specific note |
| `by-page-note` | `['pageId', 'noteId']` | yes | Prevent duplicate placement of the same note on a page |

### Relationships (Current)

#### Outgoing (this row references)

- `pageId` → [[Page]]
- `noteId` → [[Note]]

## Map

![[domain-model.canvas]]
