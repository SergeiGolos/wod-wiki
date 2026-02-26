# Phase 3: State Management & View Compartments

**Goal**: Implement advanced view synchronization and state isolation using CodeMirror 6's `Compartment` and `StateField` APIs.

## 3.1 Compartment Architecture

Each editor mode (Edit, Track, Data) will be managed via a `Compartment` to allow for runtime reconfiguration without rebuilding the entire editor state.

### Planned Compartments:
- **`modeCompartment`**: Swaps between Edit/Track/Data extensions (e.g., adding timer widgets in Track mode).
- **`themeCompartment`**: Dynamically updates highlighting colors and font styles.
- **`languageCompartment`**: Allows toggling between plain Markdown and Markdown + WodScript.

## 3.2 View Synchronization (Linked Documents)

Implementing linked documents as researched in `codemirror-compartments-research.md`.

### Use Case:
- **Split View**: Allow the user to have an "Edit" view and a "Live Track" view open simultaneously.
- **Shared State**: Changes in the "Edit" document must reflect in the "Live Track" view without losing timer or progression state.
- **Undo/Redo**: A unified undo history across all views sharing the same master document.

## 3.3 Zustand Integration

Synchronizing CodeMirror's transaction-based state with the project's global Zustand stores.

### Implementation:
- **`useEditorState` Hook**: A bridge between Zustand and CodeMirror.
- **Action Dispatching**: When a workout is updated via the editor, dispatch a Zustand action.
- **State Fields**: Use `StateField` to store "runtime" metadata (active exercise index, timer state) directly within the `EditorState`.

## 3.4 Key Tasks:
1.  **Refactor Zustand Store**: Ensure it can handle the incremental updates from CodeMirror transactions.
2.  **State Field Development**: Create fields for exercise completion status (`true`/`false`) and collectible values (`reps`, `weight`).
3.  **Compartment Management**: Build a helper to manage `state.reconfigure()` calls for the different editor modes.

## 3.5 Deliverables:
- `src/editor/state-fields.ts` (WOD metadata storage)
- `src/editor/compartments.ts` (Reconfiguration logic)
- Refactored `WorkoutStore` with CodeMirror state synchronization.
