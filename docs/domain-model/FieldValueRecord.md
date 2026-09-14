---
tags: [domain-model]
store: field_values
keyPath: "key"
db: wodwiki-db (v19)
role: relationship-table
---

# FieldValueRecord

**Store:** `field_values` · **Key path:** `key` · **Type source:** `packages/core/src/types/storage.ts`

**Relationship table** — one observed categorical value (string/boolean fields only) of a [[FieldCatalogEntry]], keyed `[fieldId, value]` with the value keeping its original spelling.

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `key` | [string, string] | [fieldId, value] — compound key |
| `fieldId` | string | FK → [[FieldCatalogEntry]] |
| `value` | string | Original spelling |
| `sourceCount` | number | Supporting sources; prunes at zero |

## Indexes

| Index | Key path | Unique | Purpose |
|-------|----------|--------|---------|
| `by-field` | `fieldId` | no | values of a field |

## Relationships

> [!info] This store **is** a relationship table.

### Outgoing (this row references)

- `fieldId` → [[FieldCatalogEntry]]

## Map

![[domain-model.canvas]]
