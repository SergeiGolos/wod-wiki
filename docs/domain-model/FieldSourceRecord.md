---
tags: [domain-model]
store: field_sources
keyPath: "id"
db: wodwiki-db (v19)
role: relationship-table
---

# FieldSourceRecord

> [!info] Current vs Future State
> This document distinguishes the current implementation in code from proposed/future-state enhancements.

## Current State (Implemented in Code)

- **Store:** `field_sources`
- **Key path:** `id`
- **Type source:** `packages/core/src/types/storage.ts`
- **Database version:** `wodwiki-db` (v19)

**Relationship table** — the reversal record making re-saves idempotent and deletes reversible: the field-identity contribution set of one stable source record ([[Note]] or [[WorkoutResult]]).

### Fields (Current)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | `${entityKind}:${recordId}` — e.g. `result:r1`, `note:n1` |
| `contributions` | Array<FieldContribution & { rowId: string }> | fieldId, path, kind, unit?, spelling?, value? per contribution |

### Relationships (Current)

> [!info] This store **is** a relationship table.

#### Outgoing (this row references)

- `id` → [[Note]] — polymorphic — `note:<id>`
- `id` → [[WorkoutResult]] — polymorphic — `result:<id>`
- `contributions[].fieldId` → [[FieldCatalogEntry]]

---

## Future State (Proposed)

### Typed-note composition recommendations

- Keep field contributions derived from their owning note/result. Type descriptors and reusable widgets do not become extra independently writable catalog sources.
- A note re-key must reconcile the `note:<id>` source and contributions, not just change the note row. Current legacy UUID re-key omits `field_sources`; see [[BlockIndexRow#Recommended projection contract]].

**Feedback case:** a note is re-keyed or deleted after contributing frontmatter fields. Search/typeahead must not retain a duplicate or orphan contribution. Define transaction/rebuild recovery before reporting the operation successful.

These are review proposals, not implemented fixes. The session-prefix change below is a separate proposal.

### Proposed Structure (Session Prefixing)

In the proposed future state:
- Source records originating from recorded workouts update their prefix from `result:<id>` to `session:<id>` pointing to [[WorkoutResult|sessions]].
- Note-level contributions remain `note:<id>`.

## Map

![[domain-model.canvas]]
