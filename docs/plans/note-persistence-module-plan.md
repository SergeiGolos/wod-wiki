# Note Persistence Module — Problem, Proposed Solution, and Planned Fix

**Status:** Completed
**Date:** 2026-05-07  
**Updated:** 2026-05-13
**Decision bias:** Adopted a minimal, high-leverage persistence seam based on Design 1, with optional read projection parameters on `getNote()` to support History / Review workflows.

---

## 1. Status: Implementation Complete

The Note Persistence Module has been fully implemented and integrated. The shallow `IContentProvider` has been replaced by a deep persistence layer that handles denormalization, versioning, and analytics internally.

### Key Implementation Milestones

- **`INotePersistence`**: Unified interface defined in `src/services/persistence/`.
- **`IndexedDBNotePersistence`**: Full implementation of the Note lifecycle.
- **UI Decoupling**: All direct `indexedDBService` imports have been removed from `src/components`, `src/hooks`, and `src/panels`.
- **Atomic Mutations**: `mutateNote()` handles simultaneous content updates and workout results.

---

## 2. Proposed Interface (Implemented)

```typescript
export interface INotePersistence {
  /**
   * Load a Note projection by UUID, short ID, title, or other supported locator.
   *
   * The module returns a denormalized HistoryEntry ready for the caller's use case.
   * Optional projection parameters select result scope, attachments, and history shape.
   */
  getNote(
    locator: NoteLocator,
    options?: GetNoteOptions,
  ): Promise<HistoryEntry>;

  /**
   * List Note summaries for History browsing.
   *
   * This should be lightweight by default: enough for rows/cards, not full result history.
   */
  listNotes(query?: NoteQuery): Promise<HistoryEntry[]>;

  /**
   * Apply Note-level mutations.
   *
   * All storage-specific behavior hides here:
   * - content mutation creates new NoteSegment versions internally
   * - workout result append links to the selected section / segment version
   * - analytics are normalized and persisted
   * - attachments are added/removed and indexed
   * - metadata changes update the root Note
   */
  mutateNote(
    locator: NoteLocator,
    mutation: NoteMutation,
  ): Promise<HistoryEntry>;

  /**
   * Delete a Note and all owned persistence state.
   * Cascades to segments, results, attachments, and analytics rows where supported.
   */
  deleteNote(locator: NoteLocator): Promise<void>;
}
```

---

## 3. Benefits Realized

- **Locality**: Result linking and denormalization logic is concentrated in the persistence module.
- **Leverage**: UI callers work with high-level Note projections.
- **Trustworthy State**: Removing direct DB access from hooks ensures the persistence layer is the single source of truth for Note state.
- **Backend Swappable**: The persistence seam is now deep enough to support future backend transitions (e.g. to a remote sync server) without touching UI code.

---
*Maintained by the Librarian Agent.*
