# WOD Wiki — Domain Model Documentation

This directory documents the domain model, data access patterns, and storage abstraction layer used by WOD Wiki.

## Documents

| Document | Description |
|----------|-------------|
| [Overview](domain-model/overview.md) | High-level entity map, relationships, and data flow |
| [Entities](entities.md) | Every persisted entity with full field specifications |
| [Repositories & Providers](repositories.md) | Repository interfaces, implementations, and how to add new backends |

## Quick Orientation

WOD Wiki persists five core entities — **Note**, **NoteSegment**, **WorkoutResult**, **Attachment**, and **AnalyticsDataPoint** — plus two ancillary models (**Notebook** and **Exercise**). All persistent data flows through **two abstraction layers**:

1. **`IContentProvider`** — the high-level async interface consumed by React components. Operates on `HistoryEntry` (a denormalized view of a Note and its segments/results).
2. **`IndexedDBService`** — the low-level store that operates directly on the normalized entities (`Note`, `NoteSegment`, etc.).

The architecture is designed so that swapping the storage backend — to a remote HTTP API, an in-memory store for testing, or any other mechanism — requires implementing only the `IContentProvider` interface. Four implementations already exist:

| Implementation | Backend | Use Case |
|---|---|---|
| `IndexedDBContentProvider` | IndexedDB (via `idb` library) | Production browser storage |
| `LocalStorageContentProvider` | `localStorage` | Legacy / fallback browser storage |
| `StaticContentProvider` | In-memory (single entry) | Storybook demos, embedded playgrounds |
| `MockContentProvider` | In-memory (`Map`) | Unit tests, Storybook seeding |
