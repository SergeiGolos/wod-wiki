# Brainstorm: Command Palette Unification

**Brainstorm Date:** March 21, 2026
**Status:** Draft
**Goal:** Streamline all command palette surfaces onto a single technology and a common launch/response contract, decoupling what is displayed from what the caller does with the result.

---

## Current State: What We Have

There are currently **two separate palette implementations** sharing one `CommandContext`:

| Component | Library | Props | Data model | Used by |
|-----------|---------|-------|------------|---------|
| `src/components/command-palette/CommandPalette.tsx` | `cmdk` + Radix Dialog | none (reads context) | `Command[]` via `getCommands()` | src app — Notebooks/History |
| `src/components/playground/CommandPalette.tsx` | Headless UI Combobox | `isOpen, onClose, items[], onSelect, initialCategory` | `CommandPaletteResult[]` via `getResults(query)` | playground — App, HomePage |

### Current Strategies

| Strategy | Trigger | Result action |
|----------|---------|---------------|
| `WodNavigationStrategy` | Page mount on NotebooksPage; search button | `navigate('/path')` |
| `createGlobalSearchStrategy` | `Ctrl+K` / search button | `navigate()` or `window.location.hash` |
| `createCollectionStrategy` | Sidebar collection click | `navigate(result.payload)` |
| `createStatementBuilderStrategy` | `Ctrl+.` | `onModifyLine(segments)` → restarts itself for next segment |

### Problems with the Current Architecture

1. **Two palette implementations** — `cmdk` vs Headless UI Combobox, diverged in technology and behavior. Hard to add features consistently.
2. **Strategy interface is split** — Component A reads `getCommands()`, Component B reads `getResults()`. A strategy must implement both to work across both surfaces.
3. **`handleInput()` and `onKeyDown()` are surface-specific** — only one component consumes each; impossible to know without reading the source.
4. **`renderHeader()` slot** — only consumed by Component B (playground), silently ignored by Component A.
5. **Result handling is embedded in strategies** — `onSelect` side effects (navigation, line edits) are baked into strategy construction, making strategies difficult to reuse across different callers.
6. **Opening is inconsistent** — some callers set `isOpen` on context, others pass `isOpen` as a prop.
7. **`StatementBuilderStrategy` is stateful and self-referential** — it re-invokes itself with new state via `updateStrategy()`. This is the only strategy that chains itself, and the pattern is fragile.

---

## Target Architecture: Unified Palette

### Core Design Principle: Promise-Based Launch Contract

The palette should be **requested like a dialog and respond with a selection**. The caller decides what to do with the result — the palette does not know or care.

```ts
// Caller opens palette and awaits a selection
const result = await commandPalette.open(request);
if (result) {
  // caller handles it
  navigate(result.payload);
}
```

This mirrors browser-native patterns (`window.showOpenFilePicker()`, `window.prompt()`) and completely decouples the palette from the result handler.

### Unified Technology Choice

Pick **one** library for all palette surfaces. Candidate: `cmdk` (already used in the main app, well-maintained, accessible, keyboard-native). The playground's Headless UI Combobox should be replaced.

---

## Unified Data Shapes

### `PaletteRequest` — what the caller passes when opening

```ts
interface PaletteRequest {
  mode: 'navigation' | 'collection' | 'statement-builder' | string;
  placeholder?: string;
  initialQuery?: string;
  // Zero or more data sources to query against
  sources?: PaletteDataSource[];
  // Optional: force an initial view filter (e.g. a specific collection name)
  initialFilter?: { type: 'collection'; value: string } | { type: 'category'; value: string };
}
```

### `PaletteDataSource` — a pluggable search backend

```ts
interface PaletteDataSource {
  id: string;
  label?: string;
  // Sync or async search — palette calls this as the user types
  search: (query: string) => PaletteItem[] | Promise<PaletteItem[]>;
}
```

### `PaletteItem` — a single result row

```ts
interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  category?: string;
  type?: 'journal-entry' | 'collection' | 'workout' | 'action' | 'statement-part';
  payload?: unknown;   // caller-defined; returned as-is on selection
  // If type === 'collection', selecting it re-opens palette in collection mode
  collectionId?: string;
}
```

### `PaletteResponse` — what the palette resolves with

```ts
type PaletteResponse =
  | { dismissed: true }
  | { dismissed: false; item: PaletteItem };
```

---

## Modes

### Mode 1: Global Navigation (`Ctrl+K` or search button click)

**Purpose:** Search across journal entries and collections. If the user selects a collection folder, the palette automatically narrows into Collection mode for that collection.

**Trigger:** `Ctrl+K` keyboard shortcut or search icon/button click anywhere in the app.

**Data sources:**
- Journal entries (stored notes, indexed by title/date/content)
- Collections (grouped workout folders)
- Recent results (IndexedDB recents)

**Selection behavior (resolved by caller):**
- `type === 'journal-entry'` → deep-link to journal view URL: `navigate('/journal/:id')`
- `type === 'collection'` → palette transitions to Collection mode for that collection (not closed — re-opened in next mode)
- `type === 'workout'` → deep-link to workout view URL: `navigate('/workout/:cat/:name')`

**Example caller:**
```ts
const result = await palette.open({
  mode: 'navigation',
  placeholder: 'Search journals and collections…',
  sources: [journalSource, collectionsSource, recentsSource],
});

if (!result.dismissed) {
  if (result.item.type === 'collection') {
    // Transition — open collection mode for the chosen collection
    openCollectionPalette(result.item.collectionId!);
  } else {
    navigate(buildDeepLink(result.item));
  }
}
```

---

### Mode 2: Single Collection (`nav panel click` or transition from Mode 1)

**Purpose:** Browse and select a single item within one collection. Launched either by clicking a collection link in the nav panel, or when a collection is selected in the Navigation palette.

**Trigger:**
- Clicking a collection link in the left nav panel
- Selecting a `type === 'collection'` item in the Navigation palette

**Data sources:**
- One collection's items (filtered from the full workout index)

**Selection behavior (resolved by caller):**
- Depends on the calling context:
  - **From nav panel in journal** → open item in journal view: `navigate('/journal/:entryId')`
  - **From tutorial slide** → load item content into the targeted in-page view (does NOT navigate)
  - **From homepage editor** → load item script into the frozen editor panel
  - **From tracker** → load item blocks into the tracker preview

**Example callers:**
```ts
// Nav panel context
const result = await palette.open({
  mode: 'collection',
  initialFilter: { type: 'collection', value: collectionId },
  sources: [collectionSource(collectionId)],
});
if (!result.dismissed) navigate(`/journal/${result.item.id}`);

// Tutorial slide context — same palette, different result handler
const result = await palette.open({ mode: 'collection', sources: [...] });
if (!result.dismissed) targetedView.loadContent(result.item.payload);
```

This is the key decoupling: **the same palette mode, different result handlers** based on what opened it.

---

### Mode 3: Statement Builder (`Ctrl+.`)

**Purpose:** Drive configuration of statement metrics — reps, movements, weights, duration. Each palette invocation configures one segment; Tab or selection advances to the next.

**Status:** Prototype — partially working. Full design TBD.

**Trigger:** `Ctrl+.` in the editor.

**Data sources:** Per-segment type: RepSource, MovementSource, WeightSource, DurationSource

**Selection behavior:** Modifies the active line in the editor. Advances through segments sequentially.

**Notes for future design:**
- The chained self-reinvocation (`updateStrategy`) should be replaced with a sequential multi-step flow — a single caller drives a loop of `palette.open()` calls, one per segment.
- `renderHeader()` (showing in-progress segment state) should be a first-class feature of the unified palette component.

```ts
// Future pattern — caller drives the segment loop
for (const segment of segments) {
  const result = await palette.open({
    mode: 'statement-builder',
    placeholder: `Set ${segment.label}…`,
    sources: [segment.source],
  });
  if (result.dismissed) break;
  applySegment(segment, result.item);
}
commitLine(segments);
```

---

## Implementation Plan

### Phase 1: Unify the component

- Choose `cmdk` as the single UI library.
- Build one `<CommandPalette>` component that:
  - Accepts an imperative open method (via a `ref` or Zustand store) returning a `Promise<PaletteResponse>`.
  - Renders query input + result list + optional header slot.
  - Calls `source.search(query)` for each data source and merges results.
  - Has built-in handling for `type === 'collection'` items transitioning to collection mode.
- Remove `src/components/playground/CommandPalette.tsx` (Headless UI version).

### Phase 2: Migrate strategies to data sources

- Convert `createGlobalSearchStrategy` → `PaletteDataSource[]` (journal + collections + recents).
- Convert `createCollectionStrategy` → single `PaletteDataSource` filtered to one collection.
- Remove the `CommandStrategy` interface (or reduce it to the statement-builder use case).
- Keep `WodNavigationStrategy` until the src app is migrated.

### Phase 3: Migrate all call sites

- `playground/src/App.tsx` — `Ctrl+K`, collection clicks → async `palette.open()` calls.
- `playground/src/HomePage.tsx` — editor search and tracker search → `palette.open()` with different result handlers.
- `src/components/history/HistoryLayout.tsx` — search button → `palette.open()`.
- `src/app/pages/NotebooksPage.tsx` — remove pre-set strategy; open imperatively.

### Phase 4: Statement builder

- Redesign as a sequential async loop (see Mode 3 above).
- Use the `renderHeader` slot for segment progress display.

---

## Key Design Decisions to Make

1. **Imperative API shape** — `ref`-based imperative handle (`paletteRef.current.open(request)`) vs a Zustand action (`usePaletteStore.getState().open(request)`)?
   - Zustand is simpler to access from non-React contexts (key handlers, event listeners).
   - `ref` keeps it local to the component tree.
   - **Leaning toward:** Zustand store with a Promise resolver pattern.

2. **Multi-source merging** — how to interleave results from multiple async sources?
   - Options: sequential (simpler, no flickering), parallel with progressive render (faster UX).
   - For v1: sequential per-source sectioned results.

3. **Collection transition** — should selecting a collection re-use the same palette instance (clear + repopulate) or close and re-open?
   - Re-use is smoother UX; re-open is simpler to implement.
   - **Leaning toward:** re-use same instance, swap the active source.

4. **`CommandProvider` / `CommandContext` fate** — keep for static shortcut registration (`Command[]`), but strip out the strategy machinery once all sites are migrated to imperative `palette.open()`.

---

## Open Questions

- Should `Ctrl+K` and the search button always open the **same** navigation palette, or should context (which page you're on) affect the default mode/sources?
- For tutorial slides, how does the slide know which `PaletteDataSource` to pass? Does the slide author configure it, or does the workbench provide it?
- How does the statement builder know which line is "active" when launched via `Ctrl+.` in the editor?
- Should palette history (recently selected items) be per-mode or global?
