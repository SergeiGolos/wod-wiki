---
tags: [domain-model]
store: field_sources
keyPath: "id"
db: wodwiki-db (v19)
role: relationship-table
---

# FieldSourceRecord

**Store:** `field_sources` · **Key path:** `id` · **Type source:** `packages/core/src/types/storage.ts`

**Relationship table** — the reversal record making re-saves idempotent and deletes reversible: the field-identity contribution set of one stable source record ([[Note]] or [[WorkoutResult]]).

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | `${entityKind}:${recordId}` — e.g. `result:r1`, `note:n1` |
| `contributions` | Array<FieldContribution & { rowId: string }> | fieldId, path, kind, unit?, spelling?, value? per contribution |

## Relationships

> [!info] This store **is** a relationship table.

### Outgoing (this row references)

- `id` → [[Note]] — polymorphic — `note:<id>`
- `id` → [[WorkoutResult]] — polymorphic — `result:<id>`
- `contributions[].fieldId` → [[FieldCatalogEntry]]

## Map

![[domain-model.canvas]]
