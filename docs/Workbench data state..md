The saving lifecycle and structure of the workbench differ significantly between the production environment ("History" mode)
  and the Storybook environment ("Static" mode). Below is an outline of the two data layers and how their paths diverge.

  1. Real Workbench (Production / "History" Mode)
  This mode is designed for persistent, versioned storage using IndexedDB.

  ```mermaid
  sequenceDiagram
      participant UI as UI / WorkbenchContext
      participant Provider as IndexedDBContentProvider
      participant DB as IndexedDB (Notes & Segments)
      participant RDB as IndexedDB (Results)

      Note over UI, DB: Loading Path
      UI->>Provider: getEntry(noteId)
      Provider->>DB: Fetch latest segments
      DB-->>Provider: [Segment_v1, Segment_v2, ...]
      Provider-->>UI: HistoryEntry (Reconstructed Markdown)

      Note over UI, DB: Saving Lifecycle (Auto-save)
      UI->>UI: 5s Debounce
      UI->>Provider: updateEntry(rawContent)
      Provider->>DB: Parse & Compare Sections
      Provider->>DB: Create new Segment versions (if changed)
      Provider->>DB: Update Note metadata

      Note over UI, RDB: Results Persistence
      UI->>Provider: updateEntry({ results, sectionId })
      Provider->>RDB: Create WorkoutResult entry
  ```

   * Data Layer 1: Markdown (Notes & Segments)

       * Provider: IndexedDBContentProvider
       * Structure: Uses a relational-style model within IndexedDB. A Note stores metadata and a list of segmentIds. Segments
         are versioned units (Title, Markdown, or WOD blocks).
       * Loading Path: URL (noteId) → WorkbenchContext → provider.getEntry(id) → Fetches segments from IndexedDB → Reconstructs
         rawContent string for the editor.
       * Saving Lifecycle:
           * Debounced Auto-save: WorkbenchContext triggers a save 5 seconds after the last keystroke.
           * Surgical Updates: updateEntry parses the content into sections and only creates new versions in the segments table
             for sections that actually changed.
           * Flush on Unmount: A final save is attempted when the user navigates away or closes the tab.


   * Data Layer 2: Database (Results)
       * Backing Store: IndexedDB results table.
       * Saving Path: completeWorkout → provider.updateEntry({ results, sectionId }) → Creates a WorkoutResult entry linked to
         the noteId and sectionId.
       * Loading Path: When navigating to the review view via a URL like /note/:id/review/:sectionId/:resultId, the
         WorkbenchContext queries the indexedDBService directly to hydrate the analytics view with that specific historical
         result.

  ---


    2. Storybook Workbench ("Static" Mode)
    This mode is designed for ephemeral demos and rapid testing. While it doesn't persist to a database, it mirrors the production saving lifecycle using an in-memory repository.
  
    ```mermaid
    sequenceDiagram
        participant UI as UI / WorkbenchContext
        participant Provider as StaticContentProvider (Mutable)
        participant State as In-Memory State
        participant Export as Export Action
  
        Note over UI, Provider: Loading Path
        UI->>Provider: Initial Content (Props / ?z=)
        Provider->>State: Initialize In-Memory Entry
        Provider-->>UI: HistoryEntry
  
        Note over UI, State: Saving Lifecycle (Auto-save)
        UI->>UI: 5s Debounce
        UI->>Provider: updateEntry(rawContent / results)
        Provider->>State: Patch In-Memory Entry
        Note right of State: Changes persist until reload
  
        Note over UI, State: "Sideloading" Attachments
        UI->>Provider: Add Results/Metadata
        Provider->>State: Update Sections/Results
        Note right of State: Reflected in Plan/Review views
  
        Note over UI, Export: Manual Persistence
        UI->>Export: Export Runtime State
        Export-->>UI: Download JSON Blob (Full In-Memory State)
    ```
  
     * Data Layer 1: Markdown (In-Memory)
         * Provider: StaticContentProvider
         * Structure: Wraps initial content in a mutable `HistoryEntry` object held in memory.
         * Loading Path: URL (?z= gzip/base64) or Component Props → StaticContentProvider. The initial string is parsed and "hydrated" into the in-memory state.
         * Saving Lifecycle:
             * Parity with Production: The provider sets `capabilities.canWrite = true`.
             * Auto-save: Triggers the same 5s debounce as production, calling `updateEntry` on the provider.
             * Volatile Persistence: Changes are stored in the provider's instance. Navigating between views (Plan/Track/Review) preserves edits and results, but a browser refresh resets the state.
  
  
     * Data Layer 2: Results (In-Memory)
         * Backing Store: The `results` field within the `StaticContentProvider`'s in-memory entry.
         * Path: `completeWorkout` updates the provider's state. Because the UI is bound to this provider, newly recorded results appear in the "Plan" view and history panels immediately, just as they would in the production IndexedDB version.
  