---
tags: [domain-model]
store: meta
keyPath: "key"
db: wodwiki-db (v19)
---

# Meta

**Store:** `meta` · **Key path:** `key` · **Type source:** `apps/playground/src/services/db/IndexedDBService.ts`

Opaque key-value store (V19). Values are schema-level `unknown`; readers cast. Current use: seed-import checkpoint state.

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `key` | string | Key path |
| `value` | unknown | Opaque — readers cast |

## Relationships

None — standalone store.

## Map

![[domain-model.canvas]]
