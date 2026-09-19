---
tags: [domain-model]
store: field_catalog
keyPath: "id"
db: wodwiki-db (v20)
---

# FieldCatalogEntry

> [!info] Current vs Future State
> This document distinguishes the current implementation in code from proposed/future-state enhancements.

## Current State (Implemented in Code)

- **Store:** `field_catalog`
- **Key path:** `id`
- **Type source:** `packages/core/src/types/storage.ts`
- **Database version:** `wodwiki-db` (v19)

Derived typed field identity for authoring-surface typeahead (V17, ticket 14). Reference-counted: rows prune when `sourceCount` hits zero; deltas commit atomically with the source mutation.

### Fields (Current)

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

### Indexes (Current)

| Index | Key path | Unique | Purpose |
|-------|----------|--------|---------|
| `by-path` | `path` | no | ordered normalized-path prefix lookup |

### Relationships (Current)

#### Incoming (referenced by)

- [[FieldValueRecord]].`fieldId`
- [[FieldSourceRecord]].`contributions[].fieldId`

#### Relationship tables

- [[FieldSourceRecord]] — reversal records feeding this entry
- [[FieldValueRecord]] — observed categorical values

---

## Future State (Proposed)

### Proposed Structure

- Retains current schema; tracks contributions from future `sessions` records alongside notes.

## Map

![[domain-model.canvas]]
