# Local Storage & Library Architecture Plan

## Overview

This document outlines the plan to implement a local storage system for WOD Wiki. The goal is to persist workout definitions (markdown) and execution results (runtime logs) locally, with a UI to manage these assets. The architecture will be designed to be provider-agnostic, allowing future integration with GitHub or other APIs.

## 1. Data Architecture

### 1.1. Data Models

We will introduce two primary persistent entities: `WodDocument` and `WodResult`.

#### WodDocument
Represents a saved workout definition.

```typescript
interface WodDocument {
  id: string;              // UUID
  title: string;           // Display name (e.g., "Fran")
  content: string;         // The raw Markdown content
  createdAt: number;       // Timestamp
  updatedAt: number;       // Timestamp
  tags: string[];          // e.g., ["benchmark", "girl", "thruster"]
  properties: Record<string, any>; // Key-value pairs parsed from frontmatter or metadata
  schemaVersion: number;   // For migration support (e.g., 1)
}
```

#### WodResult
Represents the outcome of running a workout.

```typescript
interface WodResult {
  id: string;              // UUID
  documentId: string;      // Reference to the WodDocument (if saved)
  documentTitle: string;   // Snapshot of title in case doc is deleted
  timestamp: number;       // When the workout finished
  duration: number;        // Total milliseconds
  logs: ExecutionRecord[]; // The detailed runtime logs (splits, reps)
  metadata: {
    user?: string;
    notes?: string;
  };
  schemaVersion: number;
}
```

### 1.2. Storage Abstraction (Adapter Pattern)

To ensure future extensibility (e.g., swapping LocalStorage for GitHub Gists), we will define a generic interface.

```typescript
interface IStorageProvider {
  // Document Operations
  listDocuments(): Promise<WodDocumentMetadata[]>; // Lightweight list
  getDocument(id: string): Promise<WodDocument>;
  saveDocument(doc: WodDocument): Promise<void>;
  deleteDocument(id: string): Promise<void>;

  // Result Operations
  listResults(documentId?: string): Promise<WodResultMetadata[]>;
  getResult(id: string): Promise<WodResult>;
  saveResult(result: WodResult): Promise<void>;
  deleteResult(id: string): Promise<void>;
}
```

### 1.3. Local Storage Implementation (`LocalStorageProvider`)

We will implement `IStorageProvider` using the browser's `localStorage` (or `localforage` for IndexedDB abstraction if size becomes an issue).

*   **Key Namespacing:**
    *   Documents: `wodwiki:docs:<uuid>`
    *   Results: `wodwiki:results:<uuid>`
    *   Indices: `wodwiki:index:docs`, `wodwiki:index:results` (to avoid scanning all keys)

## 2. Service Layer & State Management

We will wrap the provider in a React Context: `LibraryContext`.

*   **Capabilities:**
    *   Available globally to the Workbench.
    *   Handles loading states (loading, error, success).
    *   Provides hooks: `useLibrary()`, `useDocument(id)`, `useResults(docId)`.
    *   **Sideloading:** A method `importFromJSON(jsonString)` to manually load external data into the local store.

## 3. UI Design: The Library Panel

We will implement a **Slide-out Navigation Panel** attached to the `UnifiedWorkbench`.

### 3.1. Integration Point
In `UnifiedWorkbench.tsx`:
*   Add a new state: `isLibraryOpen` (boolean).
*   Add a toggle button in the header (near the "Plan/Track/Analyze" switcher).
*   Render a `Sheet` (Slide-over) component or a `SlidingPanel` that overlays the workbench from the left.

### 3.2. Component Structure (`LibraryPanel`)

*   **Tabs:** [Workouts] [Results]
*   **Workouts Tab:**
    *   Search bar (filter by name/tag).
    *   "New Workout" button.
    *   List of saved documents.
    *   Actions per item: Load (into Editor), Delete, Edit Metadata.
*   **Results Tab:**
    *   List of recent results (grouped by Workout or Date).
    *   Actions: View (loads into Analyze panel), Export (JSON).

## 4. Implementation Plan

### Phase 1: Core Logic
1.  **Define Models:** Create `src/core/models/StorageModels.ts`.
2.  **Create Interface:** Define `IStorageProvider` in `src/services/storage/IStorageProvider.ts`.
3.  **Implement LocalStorage:** Create `src/services/storage/LocalStorageProvider.ts`.
4.  **Create Service/Context:** Build `src/services/storage/LibraryContext.tsx`.

### Phase 2: UI Implementation
1.  **Create Panel:** Build `src/components/library/LibraryPanel.tsx`.
2.  **Build Sub-components:** `DocumentList`, `ResultList`.
3.  **Integrate:** Add the panel to `UnifiedWorkbench.tsx`.

### Phase 3: Runtime Integration
1.  **Connect Save:** In `UnifiedWorkbench`, add a "Save" button to the Editor toolbar that calls `library.saveDocument`.
2.  **Connect Results:** When a workout finishes (in `useWorkbenchRuntime` or `TrackPanel`), trigger a save to `library.saveResult`.

### Phase 4: Sideloading & Export
1.  Add Import/Export buttons in the Library Panel.
2.  Implement JSON file drag-and-drop handler.

## 5. Testing Strategy
*   **Unit Tests:** Test `LocalStorageProvider` mocking `window.localStorage`.
*   **Integration:** Verify `LibraryContext` correctly updates state.
*   **Manual Verification:** Use the slide-out panel to create, save, reload, and delete documents.
