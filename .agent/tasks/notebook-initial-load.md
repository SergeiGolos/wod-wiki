# Task: Revamp Initial Load and Notebook Behavior

## Goal
Make the Notebook (Notes Page) the primary entry point of the application, seeding it with playground content on first load and defaulting to Edit mode (Plan view) when a new entry is created.

## 🧭 Architecture Changes

1.  **Routing**: Move `NotebookPage` to `/`.
2.  **Seeding**: Add "first-load" detection to `NotebookPage` to seed with playground content.
3.  **Navigation**: Allow `Workbench` to start in a specific `ViewMode` via props.

## 📝 Planned Steps

### 1. Extract Shared Content
- Create `src/constants/defaultContent.ts` to hold the playground and daily templates.

### 2. Enhance Workbench Context
- Update `WorkbenchProviderProps` and `WorkbenchProps` to include `initialViewMode?: ViewMode`.
- Use this prop in `WorkbenchProvider` to set the initial `viewMode` state.

### 3. Update NotebookPage Logic
- Refine the `init` logic in `NotebookPage.tsx`:
    - Check if entries exist at all.
    - If no entries, create "Playground" entry.
    - If entries exist but no daily entry, create "Daily Log".
    - Determine if we should start in `plan` view (if a new entry was just created).

### 4. Update App Routing
- Modify `src/app/App.tsx` to point `/` to `NotebookPage`.

## ✅ Verification Criteria
- [ ] Navigating to `/` for the first time creates the Playground entry.
- [ ] The app starts in `plan` mode (editor visible) when the Playground entry is created.
- [ ] Subsequent loads show the History list if no new entry is being created.
- [ ] Creating a "Daily Log" also defaults to `plan` mode.
