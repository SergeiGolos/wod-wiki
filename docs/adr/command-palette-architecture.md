# Command Palette Architecture — Deepening Opportunities

**Date:** 2026-05-08
**Status:** Implemented
**Area:** `src/components/command-palette/`, `playground/src/services/`

---

## Context

The command palette has four live use cases:

| Use case | Trigger | Component |
|----------|---------|-----------|
| Global navigation / search | `Ctrl+/` (also `Ctrl+P`), search button | `src/components/command-palette/CommandPalette.tsx` |
| Create new journal entry (source picker) | "New entry" button | `playground/src/services/journalNoteStrategy.tsx` |
| Collection item picker | Sidebar click / transition from global search | `playground/src/services/commandStrategies.tsx` |
| WOD block line editor (statement builder) | `Ctrl/Cmd+.` in playground; `Mod-P` in note editor | `playground/src/services/commandStrategies.tsx` |

The command palette has been unified into a single `PaletteShell` component driven by a Promise-based `palette-store`.

---

## Architecture Implementation

The two previous palette implementations (cmdk+Radix and Headless UI) have been consolidated into **`PaletteShell`**.

### 1. Unified Palette Component

**Files:** `src/components/command-palette/PaletteShell.tsx`, `src/components/command-palette/palette-store.ts`, `palette-types.ts`

Opening the palette is now an imperative async call from anywhere in the app:

```ts
const result = await usePaletteStore.getState().open(request);
// Promise<PaletteResponse>
```

The `palette-store` manages the pending promise resolver. This enables clean multi-step chains (e.g., "Create New" flows) where each step is a sequential `await`.

### 2. PaletteDataSource Interface

Search logic has been separated from side-effect handlers. Data sources now implement a pure search interface:

```ts
interface PaletteDataSource {
  id: string;
  label?: string;
  search: (query: string) => PaletteItem[] | Promise<PaletteItem[]>;
}
```

This allows sources like "Collections" or "Journal History" to be reused across different palette contexts (global search vs. import picker).

### 3. Shortcut Unification

The shortcut has been unified to **`Ctrl+/`** across all surfaces. The search button in `Workbench.tsx` has been updated to reflect this.
