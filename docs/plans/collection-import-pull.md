# Collection Import (Pull) — Implementation Plan

**Branch:** `feat/collection-import-pull`  
**Goal:** Add pull-import for WOD blocks from collections and history into the journal editor.

## Design Decisions

### Button tropes (match existing conventions)

**In-block pull button (single-select):**
```
[ + 🔍 ]  →  <Plus h-3 w-3> + <Search h-3 w-3>
```
Renders inside the WodCompanion STRIP (same row as existing command buttons) **only when the block is empty**. Styled identically to existing `CommandPill` secondary buttons: `bg-secondary border border-border/50 text-[10px] px-2 py-0.5`.  
Clicking opens the command palette with `CollectionImportStrategy` in single-block mode, which inserts content into that specific empty fence.

**Nav-bar pull button (multi-select):**
```
[ + 🔍 ]  →  <Plus h-3 w-3> + <Search h-3 w-3>
```
Renders in `JournalPageShell`'s `actions` slot (right of nav bar) when editing a journal entry. Same icon pair, slightly larger (`h-4 w-4`), standard `Button variant="outline" size="sm"`.  
Clicking opens `CollectionImportStrategy` in multi-block mode — imported blocks are appended sequentially to the end of the note.

### Command palette flow (3 levels, uses existing `setStrategy`)

```
Level 1 — Source picker
  group: Collections        group: History
  ─────────────────────     ─────────────────────
  Crossfit Girls (24)       Apr 28 2026 – Fran (1 block)
  Dan John (12)             Apr 21 2026 – Murph (2 blocks)
  …                         …

Level 2 — Workout picker (after selecting a collection/history entry)
  ← Back    CrossFit Girls
  ──────────────────────────
  Fran  (1 WOD block)
  Murph (2 WOD blocks)
  …

Level 3 — Block picker (after selecting a workout)
  ← Back    Fran
  ──────────────────────────
  ☐  Block 1 · 21-15-9 thrusters and pull-ups …
  (single-select mode: auto-confirm on click)
  (multi-select mode: checkboxes + "Import N blocks" confirm action)
```

---

## Tasks

### T1 — `extractWodBlocks()` utility
**File:** `src/lib/wodBlockExtract.ts` (new)

```ts
export interface ExtractedWodBlock {
  index: number;        // 0-based
  dialect: string;      // 'wod' | 'log' | 'plan'
  content: string;      // text inside the fences (trimmed)
  preview: string;      // first line, max 60 chars
}

export function extractWodBlocks(markdown: string): ExtractedWodBlock[]
```

Regex: `` /^```(wod|log|plan)\n([\s\S]*?)^```/gm ``

No external deps. Export from `src/lib/index.ts`.

---

### T2 — `CollectionImportStrategy` (command palette strategy)
**File:** `src/components/command-palette/strategies/CollectionImportStrategy.ts` (new)

Implements `CommandStrategy`. Three internal states map to levels 1–3:

```ts
type ImportMode = 'single-block' | 'multi-block';

interface CollectionImportStrategyOptions {
  mode: ImportMode;
  provider: IContentProvider;
  /** In single-block mode: insert into this specific section */
  targetSectionId?: string;
  /** Callback once blocks are confirmed */
  onImport: (blocks: ExtractedWodBlock[]) => void;
  /** Called by strategy to swap itself back out */
  onDismiss: () => void;
}
```

Level 1 (`getResults`): returns collection rows + history entries (last 30 days). Groups: `'Collections'` and `'Recent History'`.

Level 2 (`onSelect` of level 1 result → `setInternalState('workout-list')`): re-calls `getResults` returning workout rows from that source.

Level 3 (`onSelect` of workout → `setInternalState('block-picker')`): renders block list. In single-block mode, calls `onImport([block])` immediately. In multi-block mode, shows checkboxes and `getCommands()` returns a dynamic "Import N blocks" command.

Uses `setStrategy(this)` to replace itself on each level transition. Uses history provider's `getEntries()` for history source; uses `getWodCollections()` + `extractWodBlocks()` for collection source.

---

### T3 — `useCollectionImport` hook
**File:** `src/hooks/useCollectionImport.ts` (new)

```ts
export function useCollectionImport(opts: {
  provider: IContentProvider;
  noteId: string;
  getCurrentContent: () => string;
  setContent: (s: string) => void;
}): {
  openSingleBlockImport: (sectionId: string, insertCallback: (text: string) => void) => void;
  openMultiBlockImport: () => void;
}
```

Wraps `useCommandPalette()` → calls `setStrategy(new CollectionImportStrategy(...))` → opens palette.

`onImport` callback for **multi-block**: appends each selected block as ` ```wod\n...\n``` ` fence to the current note content, separated by blank lines.

`onImport` callback for **single-block**: calls the `insertCallback` provided by the calling WodCompanion to replace the empty fence content in-place via a CodeMirror transaction.

---

### T4 — Empty-block pull button in `WodCompanion`
**File:** `src/components/Editor/overlays/WodCompanion.tsx` (modify)

In `CommandButtons` (the compact STRIP row), add a new `ImportFromCollectionCommand` **before** the existing commands, shown only when `block.content.trim() === ''`.

The command icon: `<><Plus className="h-3 w-3"/><Search className="h-3 w-3"/></>` — two icons side-by-side, same as existing pills.

Label: `Import`

Wiring: `WodCompanion` receives a new optional prop `onImportBlock?: (sectionId: string, insertFn: (text: string) => void) => void`. The insert function uses a CodeMirror dispatch to replace `contentFrom..contentTo` with the selected text.

`NoteEditor` must thread this prop down. `PlanPanel` exposes it upward to its parent.

---

### T5 — Nav-bar `[ + 🔍 ]` button in `Workbench`
**File:** `src/components/layout/Workbench.tsx` (modify)

When a note is open and the editor is active, add an `ImportButton` to the `JournalPageShell` `actions` prop:

```tsx
<Button
  variant="outline"
  size="sm"
  className="h-7 px-2 gap-1 text-xs"
  title="Import WOD blocks from collections or history"
  onClick={openMultiBlockImport}
>
  <Plus className="h-3.5 w-3.5" />
  <Search className="h-3.5 w-3.5" />
</Button>
```

`openMultiBlockImport` comes from `useCollectionImport`.

---

### T6 — Wire history entries as import sources
**File:** `src/components/command-palette/strategies/CollectionImportStrategy.ts` (part of T2)

In Level 1, alongside collections, include history entries with at least one WOD block. Use provider `getEntries()` → filter type `!= 'template'` → `extractWodBlocks(e.rawContent).length > 0` → sort by `targetDate` desc → take 30.

Display: `"Apr 28 · Fran"` — `{shortDate} · {entry.title}` in group `'Recent History'`.

---

### T7 — `CollectionsPage` click-through fix
**File:** `src/app/pages/CollectionsPage.tsx` (modify)

The existing `createHistoryView` returns `null` when no history panel is registered, which breaks the PanelGrid. Null-guard: if `historyView == null`, render a `WorkoutPreviewPanel` directly instead of passing null to PanelGrid.

This is a separate fix from import but unblocks discoverability from the Collections page.

---

## File Checklist

```
NEW
  src/lib/wodBlockExtract.ts
  src/components/command-palette/strategies/CollectionImportStrategy.ts
  src/hooks/useCollectionImport.ts

MODIFY
  src/components/Editor/overlays/WodCompanion.tsx      (T4 — onImportBlock prop + empty-block pill)
  src/components/Editor/NoteEditor.tsx                  (T4 — thread onImportBlock)
  src/panels/plan-panel.tsx                             (T4 — expose onImportBlock upward)
  src/components/layout/Workbench.tsx                   (T5 — nav-bar import button)
  src/app/pages/CollectionsPage.tsx                     (T7 — null guard)
```

## Acceptance Criteria

1. Empty ` ```wod``` ` block in journal editor shows `[ + 🔍 ]` pill in the companion strip.
2. Clicking it opens the palette → user picks collection → picks workout → picks one block → block content is inserted into the fence.
3. `[ + 🔍 ]` button in the journal nav bar opens multi-select flow → multiple WOD fences appended to note.
4. History entries with WOD blocks appear in Level 1 under "Recent History".
5. Clicking a workout on the Collections page no longer silently fails.
6. `bun x tsc --noEmit` clean.
