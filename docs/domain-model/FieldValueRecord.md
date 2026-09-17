---
tags: [domain-model]
store: field_values
keyPath: "key"
db: wodwiki-db (v19)
role: relationship-table
---

# FieldValueRecord

> [!info] Current vs Future State
> This document distinguishes the current implementation in code from proposed/future-state enhancements.

## Current State (Implemented in Code)

- **Store:** `field_values`
- **Key path:** `key`
- **Type source:** `packages/core/src/types/storage.ts`
- **Database version:** `wodwiki-db` (v19)

**Relationship table** — one observed categorical value (string/boolean fields only) of a [[FieldCatalogEntry]], keyed `[fieldId, value]` with the value keeping its original spelling.

### Fields (Current)

| Field | Type | Notes |
|-------|------|-------|
| `key` | [string, string] | [fieldId, value] — compound key |
| `fieldId` | string | FK → [[FieldCatalogEntry]] |
| `value` | string | Original spelling |
| `sourceCount` | number | Supporting sources; prunes at zero |

### Indexes (Current)

| Index | Key path | Unique | Purpose |
|-------|----------|--------|---------|
| `by-field` | `fieldId` | no | values of a field |

### Relationships (Current)

> [!info] This store **is** a relationship table.

#### Outgoing (this row references)

- `fieldId` → [[FieldCatalogEntry]]

---

## Future State (Proposed)

### Proposed Structure

- Retains current schema and pruning logic; tracks categorical value frequencies from both notes and future sessions.

## Map

![[domain-model.canvas]]
