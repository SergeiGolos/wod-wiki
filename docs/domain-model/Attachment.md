---
tags: [domain-model]
store: attachments
keyPath: "id"
db: wodwiki-db (v19)
---

# Attachment

**Store:** `attachments` · **Key path:** `id` · **Type source:** `apps/playground/src/types/storage.ts`

Temporal blob data attached to a workout — GPS/HR streams (GPX, JSON).

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | UUID |
| `noteId` | string | FK → [[Note]] |
| `pageId?` | string | FK → [[Page]] (V10) |
| `resultId?` | string | FK → [[WorkoutResult]] when known (V10) |
| `mimeType` | string | e.g. 'application/gpx+xml', 'application/json' |
| `label` | string | Human-readable, e.g. "Garmin HR stream" |
| `data` | ArrayBuffer \| string | Raw blob or JSON string |
| `timeSpan` | { start: number; end: number } | Unix ms |
| `createdAt` | number |  |

## Indexes

| Index | Key path | Unique | Purpose |
|-------|----------|--------|---------|
| `by-note` | `noteId` | no |  |
| `by-time` | `createdAt` | no |  |
| `by-page` | `pageId` | no |  |
| `by-result` | `resultId` | no |  |

## Relationships

### Outgoing (this row references)

- `noteId` → [[Note]] — parent
- `pageId` → [[Page]]
- `resultId` → [[WorkoutResult]] — owning result when known

## Map

![[domain-model.canvas]]
