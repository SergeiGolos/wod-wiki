# Domain Model Overview

## Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────────┐
│  Notebook    │       │     Note         │
│              │◄──────│  (root entity)   │
│ localStorage │ tags  │                  │
└─────────────┘       └────────┬─────────┘
                               │ 1
                               │
              ┌────────────────┼────────────────┐
              │ *              │ *               │ *
    ┌─────────▼──────┐  ┌─────▼───────┐  ┌─────▼──────────┐
    │  NoteSegment   │  │ WorkoutResult│  │  Attachment     │
    │  (versioned)   │  │             │  │  (temporal blob) │
    │  [id, version] │  │             │  │                  │
    └────────────────┘  └──────┬──────┘  └─────────────────┘
                               │ 1
                               │
                        ┌──────▼───────────┐
                        │ AnalyticsDataPoint│
                        │ (denormalized)    │
                        └──────────────────┘
```

### Relationship Summary

| Parent        | Child              | Cardinality | FK Field                                 | Notes                                    |
| ------------- | ------------------ | ----------- | ---------------------------------------- | ---------------------------------------- |
| Note          | NoteSegment        | 1 : N       | `noteId`                                 | Ordered via `Note.segmentIds[]`          |
| Note          | WorkoutResult      | 1 : N       | `noteId`                                 | Each completion creates a new result     |
| Note          | Attachment         | 1 : N       | `noteId`                                 | GPS tracks, HR streams, etc.             |
| NoteSegment   | WorkoutResult      | 1 : N       | `segmentId` + `segmentVersion`           | Links result to the exact script version |
| WorkoutResult | AnalyticsDataPoint | 1 : N       | `resultId`                               | Denormalized metrics for trend queries   |
| Notebook      | Note               | N : M       | `Note.tags[]` containing `notebook:{id}` | Tag-based membership, not a FK           |

## Data Flow

### Write Path (User edits a workout)

```
User types in Editor
        │
        ▼
  Section Parser splits document into Sections
        │
        ▼
  IContentProvider.updateEntry() or saveEntry()
        │
        ├──► Note record upserted (rawContent, title, tags, segmentIds)
        │
        └──► NoteSegment records upserted (one per section, version bumped)
```

### Write Path (User completes a workout)

```
Runtime finishes execution → WorkoutResults collected
        │
        ▼
  IContentProvider.updateEntry(id, { results, sectionId })
        │
        ├──► WorkoutResult record created (links to Note + Segment)
        │
        └──► AnalyticsDataPoint records derived and saved
```

### Read Path (User opens history)

```
  IContentProvider.getEntries(query?)
        │
        ▼
  Notes fetched (indexed by targetDate)
        │
        ▼
  HistoryEntry[] returned (denormalized view)
        │
        ▼
  User selects an entry → IContentProvider.getEntry(id)
        │
        ▼
  Note + latest NoteSegments + latest WorkoutResult assembled
        │
        ▼
  HistoryEntry returned with sections[] and results
```

## Abstraction Layers

The system has two distinct abstraction levels for data access:

### Layer 1: `IContentProvider` (High-Level)

**Consumed by**: React components, hooks, pages  
**Operates on**: `HistoryEntry` (denormalized)  
**Source**: `src/types/content-provider.ts`

This is the **primary abstraction** for all UI code. Components receive an `IContentProvider` via props (or context) and never know which storage backend is active. All methods return `Promise`, enabling both local and remote implementations.

### Layer 2: `IndexedDBService` (Low-Level)

**Consumed by**: `IndexedDBContentProvider`, `MigrationService`  
**Operates on**: `Note`, `NoteSegment`, `WorkoutResult`, `Attachment`, `AnalyticsDataPoint` (normalized)  
**Source**: `src/services/db/IndexedDBService.ts`

This is the **storage engine** layer. It maps directly to IndexedDB object stores and provides fine-grained CRUD over each entity type. Only the `IndexedDBContentProvider` and migration utilities interact with this layer.

### Layer Relationship

```
React Components / Hooks
        │
        │  (IContentProvider interface)
        ▼
┌───────────────────────────┐
│   Content Provider Impl   │   ◄── IndexedDB, LocalStorage, Mock, Static
│   (implements IContent-   │
│    Provider)              │
└───────────┬───────────────┘
            │
            │  (only IndexedDBContentProvider uses this)
            ▼
┌───────────────────────────┐
│    IndexedDBService       │   ◄── Raw idb wrapper
│    (normalized entities)  │
└───────────────────────────┘
```

## Ancillary Models

### Notebook

Notebooks are a **grouping mechanism**, not a storage entity in the main database. They live in `localStorage` under `wodwiki:notebooks` as a JSON array. Entry membership is established via the entry's `tags` array using the `notebook:{notebookId}` convention. The `NotebookService` singleton manages CRUD.

### Exercise

Exercise definitions are **reference data** loaded at startup, not user-generated content. The `ExerciseDefinitionService` singleton holds them in a `Map<string, Exercise>`. The `ExerciseDataProvider` interface allows different sources (bundled JSON, API fetch) to supply exercise data.

### WOD Collections

Static workout collections bundled with the app. Loaded at build time via Vite's `import.meta.glob` from the `wod/` directory. Read-only.

## Schema Versioning

The IndexedDB database (`wodwiki-db`) uses a version number for schema migrations:

| Version | Description |
|---------|-------------|
| 1–3 | Legacy stores: `history`, `scripts`, `section_history` |
| **4** | Current: `notes`, `segments`, `results`, `attachments`, `analytics` |

V4 uses a **destructive upgrade**: if upgrading from < 4, all legacy stores are dropped. The `MigrationService` handles one-time migration of data from `localStorage` (legacy format) into the V4 IndexedDB schema before the stores are dropped.
