# Notebook Management — Implementation Plan

## Summary

Add multi-notebook support where notebooks are **tag-based collections** of workout entries. Workouts can belong to multiple notebooks. An "All" virtual notebook shows everything.

## Requirements

1. **Notebook data model** — name, description, icon, createdAt, lastEditedAt
2. **Tag-based membership** — entries tagged `notebook:{notebookId}` belong to that notebook
3. **Hamburger menu** — on ALL screens, between GitHub and theme toggle, listing notebooks with checkmark for active
4. **Create Notebook dialog** — name (required), description (optional), icon selection
5. **"Add to Notebook" button** — across list items, plan page, review page
6. **Auto-create default notebook** on first visit
7. **Auto-load last-edited notebook** if no explicit selection
8. **"All" virtual notebook** showing all workouts
9. **Route change**: `/` → history (active notebook), remove `/history` redirect

## Data Model

```ts
interface Notebook {
  id: string;           // UUID
  name: string;
  description: string;
  icon: string;         // emoji
  createdAt: number;    // Unix ms
  lastEditedAt: number; // Unix ms
}
```

**Storage keys:**
- `wodwiki:notebooks` → `Notebook[]`
- `wodwiki:active-notebook` → `string | null` (notebook ID, null = "All")
- Entry membership via existing `tags[]` field using `notebook:{id}` prefix

## Architecture

### Phase 1: Service Layer ✅
- [x] Create `NotebookService` — CRUD for notebooks, active notebook tracking
- [ ] Tests for NotebookService

### Phase 2: React Context ✅
- [x] Create `NotebookContext` + `NotebookProvider` — wraps app root
- [x] Exposes: notebooks, activeNotebook, setActiveNotebook, createNotebook, addToNotebook, removeFromNotebook, getNotebookTags

### Phase 3: UI Components ✅
- [x] `NotebookMenu` — hamburger dropdown (notebook list + create button)
- [x] `CreateNotebookDialog` — dialog with name, description, icon picker
- [x] `AddToNotebookButton` — reusable button component (dropdown of notebooks with check toggles)

### Phase 4: Integration ✅
- [x] **App.tsx** — `NotebookProvider` wraps entire app; routing: `/` shows HistoryPage directly, `/history` redirects to `/`
- [x] **Workbench.tsx** header — `NotebookMenu` between AudioToggle and ThemeToggle; `AddToNotebookButton` for current entry
- [x] **HistoryPage.tsx** header — `NotebookMenu` between New Workout and ThemeToggle; active notebook name badge
- [x] **HistoryPage.tsx** — filter entries by active notebook tag
- [x] **HistoryPostList.tsx** — `AddToNotebookButton` per row with tag toggle callback
- [x] **ListOfNotes.tsx** — passes through `onNotebookToggle` prop
- [x] **WorkbenchContext.tsx** — auto-tags saved workouts with active notebook; navigates to `/` instead of `/history`
- [x] **WodNavigationStrategy.ts** — command palette navigates to `/` instead of `/history`
- [x] **Dialog.tsx** — dark mode support (bg-popover, text-foreground, border-border)

### Phase 5: Auto-behaviors ✅
- [x] On first visit, create "My Workouts" default notebook (via NotebookService.ensureDefault)
- [x] On load without selection, activate last-edited notebook (via NotebookProvider init)
- [x] New workouts auto-tagged with active notebook (via useCreateWorkoutEntry + WorkbenchContext.completeWorkout + NotebookPage)

## File Map

| File | Action | Status |
|------|--------|--------|
| `src/types/notebook.ts` | **NEW** — Notebook types + tag helpers | ✅ |
| `src/services/NotebookService.ts` | **NEW** — Notebook CRUD | ✅ |
| `src/components/notebook/NotebookContext.tsx` | **NEW** — React context | ✅ |
| `src/components/notebook/NotebookMenu.tsx` | **NEW** — Hamburger dropdown | ✅ |
| `src/components/notebook/CreateNotebookDialog.tsx` | **NEW** — Create dialog | ✅ |
| `src/components/notebook/AddToNotebookButton.tsx` | **NEW** — Reusable add button | ✅ |
| `src/app/App.tsx` | **EDIT** — NotebookProvider + route updates | ✅ |
| `src/app/pages/HistoryPage.tsx` | **EDIT** — NotebookMenu + filter + toggle handler | ✅ |
| `src/app/pages/NotebookPage.tsx` | **EDIT** — Auto-tag on create | ✅ |
| `src/components/layout/Workbench.tsx` | **EDIT** — NotebookMenu + AddToNotebookButton | ✅ |
| `src/components/layout/WorkbenchContext.tsx` | **EDIT** — Auto-tag + nav fix | ✅ |
| `src/components/history/HistoryPostList.tsx` | **EDIT** — Add to notebook per row | ✅ |
| `src/components/workbench/ListOfNotes.tsx` | **EDIT** — Pass through notebook toggle | ✅ |
| `src/components/headless/Dialog.tsx` | **EDIT** — Dark mode support | ✅ |
| `src/components/command-palette/strategies/WodNavigationStrategy.ts` | **EDIT** — Nav fix | ✅ |
| `src/hooks/useCreateWorkoutEntry.ts` | **EDIT** — Auto-tag with active notebook | ✅ |

## Remaining Work

- [ ] Unit tests for NotebookService
- [ ] Integration testing of the full flow
- [ ] Delete notebook confirmation dialog
- [ ] Edit notebook (rename, change icon) UI
