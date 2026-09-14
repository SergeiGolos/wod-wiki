---
tags: [domain-model]
store: field_catalog
keyPath: "id"
db: wodwiki-db (v19)
---

# FieldCatalogEntry

**Store:** `field_catalog` · **Key path:** `id` · **Type source:** `packages/core/src/types/storage.ts`

Derived typed field identity for authoring-surface typeahead (V17, ticket 14). Reference-counted: rows prune when `sourceCount` hits zero; deltas commit atomically with the source mutation.

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Collision-free typed key — fieldRefKey |
| `path` | string | Normalized full path — ordered prefix-lookup key for typeahead |
| `kind` | string |  |
| `dimension?` | string | Physical/named dimension of a numeric variant |
| `spellings` | Record<string, number> | Observed original spellings → supporting-source counts |
| `units` | Record<string, number> | Observed effective units → supporting-source counts |
| `sourceCount` | number | Sources currently supporting this identity |
| `firstSeen / lastSeen` | number |  |

## Indexes

| Index | Key path | Unique | Purpose |
|-------|----------|--------|---------|
| `by-path` | `path` | no | ordered normalized-path prefix lookup |

## Relationships

### Incoming (referenced by)

- [[FieldValueRecord]].`fieldId`
- [[FieldSourceRecord]].`contributions[].fieldId`

## Relationship tables

- [[FieldSourceRecord]] — reversal records feeding this entry
- [[FieldValueRecord]] — observed categorical values

## Map

![[domain-model.canvas]]
