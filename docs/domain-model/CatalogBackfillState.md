---
tags: [domain-model]
store: field_catalog_meta
keyPath: "id"
db: wodwiki-db (v19)
---

# CatalogBackfillState

**Store:** `field_catalog_meta` · **Key path:** `id` · **Type source:** `packages/core/src/types/storage.ts`

Singleton `'backfill'` row — resumable progress/completion marker for the initial [[FieldCatalogEntry]] population (V17, ticket 14). Invoked by app bootstrap, not at module scope.

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | 'backfill' | Singleton |
| `status` | 'initializing' \| 'complete' |  |
| `cursor?` | { results?: string; notes?: string } | Last processed source key per source store — resume cursor |
| `revision` | number |  |
| `updatedAt` | number |  |

## Relationships

None — standalone store.

## Map

![[domain-model.canvas]]
