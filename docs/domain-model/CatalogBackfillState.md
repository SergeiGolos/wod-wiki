---
tags: [domain-model]
store: field_catalog_meta
keyPath: "id"
db: wodwiki-db (v20)
---

# CatalogBackfillState

> [!info] Current vs Future State
> This document distinguishes the current implementation in code from proposed/future-state enhancements.

## Current State (Implemented in Code)

- **Store:** `field_catalog_meta`
- **Key path:** `id`
- **Type source:** `packages/core/src/types/storage.ts`
- **Database version:** `wodwiki-db` (v19)

Singleton `'backfill'` row — resumable progress/completion marker for the initial [[FieldCatalogEntry]] population (V17, ticket 14). Invoked by app bootstrap, not at module scope.

### Fields (Current)

| Field | Type | Notes |
|-------|------|-------|
| `id` | 'backfill' | Singleton |
| `status` | 'initializing' \| 'complete' |  |
| `cursor?` | { results?: string; notes?: string } | Last processed source key per source store — resume cursor |
| `revision` | number |  |
| `updatedAt` | number | Unix ms |

### Relationships (Current)

None — standalone store.

---

## Future State (Proposed)

### Proposed Structure

- Store remains singleton backfill progress marker.
- `cursor` tracks `sessions` instead of `sessions` once session rename lands.

## Map

![[domain-model.canvas]]
