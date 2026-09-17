---
tags: [domain-model]
store: meta
proposedStore: configuration
keyPath: "key"
db: wodwiki-db (v19)
---

# Configuration (Meta)

> [!warning] Implementation Note
> This document describes proposed/future-state table renames and schema evolution. These changes are **not yet implemented** in the codebase. The live IndexedDB store remains `meta`. See the sections below for current code state vs. future state.

## Current State (Implemented in Code)

- **Store:** `meta`
- **Key path:** `key`
- **Type source:** `apps/playground/src/services/db/IndexedDBService.ts`
- **Database version:** `wodwiki-db` (v19)

Opaque key-value store (V19). Values are schema-level `unknown`; readers cast. Current use: seed-import checkpoint state.

### Fields (Current)

| Field | Type | Notes |
|-------|------|-------|
| `key` | string | Key path |
| `value` | unknown | Opaque — readers cast |

### Indexes (Current)

None — key path lookup only.

### Relationships (Current)

None — standalone store.

---

## Future State (Proposed)

- **Store:** `configuration` (renamed from `meta`)
- **Key path:** `key`
- **Purpose:** Central application configuration and key-value metadata store.

Proposed rename of the `meta` table to `configuration` to reflect general application configuration, runtime flags, and checkpoint state.

### Fields (Future)

| Field | Type | Notes |
|-------|------|-------|
| `key` | string | Key path / config setting identifier |
| `value` | unknown | Configuration payload or metadata value |

### Indexes (Future)

None — standalone store.

## Map

![[domain-model.canvas]]
