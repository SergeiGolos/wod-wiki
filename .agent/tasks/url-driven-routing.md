# Task: URL-Driven Routing for Workbench

## Goal
Transform the workbench from internal state-based navigation to URL-driven routing. Each view (Plan, Track, Review, History, etc.) should have a unique path, and navigating between them should preserve the application state.

## 🧭 Architecture Changes

1.  **Context Refactoring**: `WorkbenchContext` will derive its `viewMode` from the URL and use `navigate` for transitions.
2.  **Route Redesign**:
    -   `/history`: The root notebook/history browser.
    -   `/note/:id/:view`: Individual workout view (view = plan | track | review).
    -   `/note/:id`: Auto-redirects to `/note/:id/plan`.
3.  **State Preservation**: The `WorkbenchProvider` must wrap the `Outlet` or be at a level that doesn't unmount during view transitions.

## 📝 Planned Steps

### 1. Update Routing Definitions
- Revise `App.tsx` routes to support nested paths and parameters.

### 2. Refactor WorkbenchContext
- Remove `viewMode` state.
- Use `useParams` and `useNavigate` from `react-router-dom`.
- Transform `setViewMode(mode)` into a `navigate` call.

### 3. Update Workbench Component
- Ensure it handles the id-based loading for the provider correctly.
- Remove redundant internal state for `viewMode`.

### 4. Update NotebookPage
- Ensure it navigates to `/note/:id/plan` after seeding or creating a daily log.

## ✅ Verification Criteria
- [ ] Navigating to `/note/123/plan` shows the editor.
- [ ] Navigating to `/note/123/track` shows the timer without reloading the workout content.
- [ ] URL changes correctly reflect the "sliding" viewport position.
- [ ] Reaching the root `/` redirects to the history list or active note.
