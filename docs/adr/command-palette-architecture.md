# Command Palette Architecture — Deepening Opportunities

**Date:** 2026-05-08
**Status:** Draft — under discussion
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

Each is cobbled together differently, sharing a global `CommandContext` as a coupling bus rather than a clean seam.

> **Stale label:** The search button in `Workbench.tsx` displays `⌘K` but no `Ctrl+K` keyboard handler exists anywhere in the codebase. The actual shortcut is `Ctrl+/` (registered in `playground/src/App.tsx`). The button label needs updating.

---

## Current Architecture Friction

There are **two palette implementations** (`cmdk`+Radix and Headless UI Combobox) that share `CommandContext` as a global side-channel. Callers set `activeStrategy` and `isOpen` on context _before_ rendering — an implicit call sequence instead of a real interface.

The `CommandStrategy` interface is split across consumers:

| Method | Consumed by |
|--------|------------|
| `getCommands()` | `CommandPalette.tsx` (cmdk, src app) only |
| `getResults()` | `playground/CommandPalette.tsx` (Headless UI) only |
| `renderHeader()` | playground only — silently ignored by src app |
| `handleInput()` | src app only |
| `onKeyDown()` | src app only |

Any strategy author must read both components to understand what actually fires.

---

## Deepening Opportunities

### 1. Unify the two palette components _(most critical)_

**Files:** `src/components/command-palette/CommandPalette.tsx`, `src/components/playground/CommandPalette.tsx`, `CommandContext.tsx`, `types.ts`

**Problem:** The two implementations share `CommandContext` as a global side-channel. Callers set `activeStrategy` and `isOpen` on context _before_ rendering — an implicit call sequence instead of an interface. The `CommandStrategy` interface is split: `getCommands()` is only consumed by Component A, `getResults()` only by Component B, `renderHeader()` silently ignored by Component A.

The keyboard trigger is also inconsistent across surfaces:
- `playground/src/App.tsx` binds `Ctrl/Cmd+/` (and also `Ctrl/Cmd+P`) via a `window` event listener
- `src/components/Editor/NoteEditor.tsx` binds `Mod-P` via a CodeMirror keymap
- `src/components/layout/Workbench.tsx` displays `⌘K` on the search button — a shortcut that has no corresponding handler anywhere

Three surfaces, three different triggers, one stale label.

**Solution:** One `<PaletteShell>` built on `cmdk`. Opening it is an imperative async call:

```ts
const result = await palette.open(request);
// Promise<PaletteResponse>
```

The caller owns the result handler. The context becomes a thin Zustand store holding the pending promise resolver — not a strategy registry.

**Benefits:**
- **Locality**: all "what happens on select" logic lives in the caller, not scattered across strategy factories
- **Leverage**: one component, one library, one interface — `renderHeader`, multi-source search, and collection transitions are added once and all callers get them
- **Tests**: each use case is tested by calling `palette.open()` in isolation and asserting on the returned item — no mock context plumbing needed

---

### 2. Split `CommandStrategy` into `PaletteDataSource` + caller handler

**Files:** `playground/src/services/commandStrategies.tsx`, `playground/src/services/journalNoteStrategy.tsx`, `src/components/command-palette/strategies/WodNavigationStrategy.ts`

**Problem:** `CommandStrategy` is a closure factory. Each constructor captures navigation callbacks and IndexedDB calls, then bakes them into `onSelect`. Strategies cannot be reused across callers — `createGlobalSearchStrategy` and `WodNavigationStrategy` both search workouts but can't share logic. Deletion test: delete `CommandStrategy` and the complexity doesn't vanish — it resurfaces in `onSelect` handlers baked into each factory.

**Solution:** Split at the seam into two interfaces:

```ts
// Pure search — no side effects
interface PaletteDataSource {
  id: string;
  label?: string;
  search: (query: string) => PaletteItem[] | Promise<PaletteItem[]>;
}

// Caller owns the result handler
const result = await palette.open({ sources: [journalSource, collectionsSource] });
if (!result.dismissed) navigate(buildDeepLink(result.item));
```

The "create journal entry" flow becomes a caller-driven sequence of `palette.open()` calls instead of a strategy that self-mutates via `updateStrategy`.

**Benefits:**
- **Locality**: search logic and navigation logic separated — IndexedDB bugs and routing bugs land in different files
- **Leverage**: `PaletteDataSource` implementations (journal, collection, recents) are reusable across any caller
- **Tests**: each data source is testable as a pure async function — no strategy context required

---

### 3. Refactor `StatementBuilder` as a caller-driven segment loop

**Files:** `playground/src/services/commandStrategies.tsx` (`createStatementBuilderStrategy`), `playground/src/App.tsx` (key handler), `src/components/Editor/NoteEditor.tsx` (Ctrl+. handler)

**Problem:** The statement builder calls `context.updateStrategy(createStatementBuilderStrategy({...newState}))` to advance through segments — it replaces _itself_ on the context. This is the only strategy with this pattern and it is invisible to the palette component.

The two entry points are also disconnected from each other:
- `playground/src/App.tsx` binds `Ctrl/Cmd+.` and opens the statement builder with a **hardcoded fake line** (`"10 Kettlebell Swings 24kg"`) — it does not read the actual editor cursor state.
- `src/components/Editor/NoteEditor.tsx` binds `Ctrl+.` via CodeMirror, reads the real cursor state via `getCursorFocusState()`, but only calls `setIsOpen(true)` with no strategy attached — so the palette opens in default command mode, not statement-builder mode.

Neither path delivers what was intended: the playground fakes it, the editor ignores it.

**Solution:** The WOD block editor owns the segment loop. When `Ctrl+.` fires, it reads `getCursorFocusState()`, builds a `SegmentSequence` from the cursor context, then drives a `for` loop of `palette.open()` calls — one per segment:

```ts
for (const segment of segments) {
  const result = await palette.open({
    placeholder: `Set ${segment.label}…`,
    header: <SegmentProgress segments={segments} active={segment} />,
    sources: [segment.source],
  });
  if (result.dismissed) break;
  applySegment(segment, result.item);
}
commitLine(segments);
```

No self-reinvocation. No strategy mutation. The segment progress header is a `PaletteRequest.header` slot passed in at open time.

**Benefits:**
- **Locality**: all segment sequencing logic sits in the editor `Ctrl+.` handler — one place to read, one place to debug
- **Leverage**: the palette knows nothing about segments; the loop is testable without a rendered palette
- **Tests**: the segment loop is a pure async loop — mockable at the `palette.open()` seam

---

### 4. Refactor "create new" as an n-step async chain

**Files:** `playground/src/services/journalNoteStrategy.tsx`, callers in `playground/src/App.tsx`

**Problem:** `createJournalNoteStrategy` is a tree of strategies (`createCollectionPickStrategy`, `createHistoryPickStrategy`) chained by `updateStrategy`. Top-level options (Blank, Template, Collection, History, Feed) are hard-coded inside the factory. Adding a new source type means editing the factory — not registering a new source at the call site. More critically, the depth is fixed at two levels: pick source type, then pick item. Real flows need more steps — e.g. pick mode → pick collection → pick note → pick WOD block to clone.

**Solution:** Each `palette.open()` call returns one selection; the caller decides whether to open another. Steps are just sequential awaits — any number can be chained. The caller is a plain async function, not a recursive strategy factory.

Example: cloning a WOD block into a new journal entry:

```ts
async function createNewEntry(dateKey: string) {
  // Step 1 — pick a mode
  const modeResult = await palette.open({
    placeholder: 'Choose a starting point…',
    header: <NewEntryHeader date={dateKey} />,
    sources: [modeSource],          // Blank | Template | Collection | History | Feed
  });
  if (modeResult.dismissed) return;

  if (modeResult.item.id === 'blank') {
    return createEntry(blankTemplate);
  }

  // Step 2 — pick a collection
  const collectionResult = await palette.open({
    placeholder: 'Pick a collection…',
    sources: [collectionSource],
  });
  if (collectionResult.dismissed) return;

  // Step 3 — pick a note within that collection
  const noteResult = await palette.open({
    placeholder: `Pick a note from ${collectionResult.item.label}…`,
    sources: [noteSource(collectionResult.item.id)],
  });
  if (noteResult.dismissed) return;

  // Step 4 — pick a WOD block within that note to clone
  const blockResult = await palette.open({
    placeholder: 'Pick a WOD block to clone…',
    sources: [wodBlockSource(noteResult.item.id)],
  });
  if (blockResult.dismissed) return;

  createEntry(cloneWodBlock(blockResult.item));
}
```

Each step is injected with its own `PaletteDataSource` at the call site. A different flow (e.g. cloning from history rather than a collection) simply uses different sources at steps 2–4 — or fewer steps if the data model is shallower. The palette itself has no knowledge of the chain.

**Benefits:**
- **Locality**: the full creation flow lives in one async function — readable top-to-bottom, debuggable with a single breakpoint
- **Leverage**: any n-step "pick, then narrow, then confirm" flow reuses `palette.open()` without new abstractions
- **Tests**: each step is an independent `palette.open()` call — mock it at any depth; test step 3 without executing steps 1–2

---

## Candidate Summary

| # | Candidate | Core problem | Key benefit |
|---|-----------|-------------|-------------|
| 1 | Unify the two palette components | Implicit call sequence via context; split interface | Testable at the open-call seam |
| 2 | Split `CommandStrategy` into `PaletteDataSource` + caller handler | Side effects baked into search factories | Data sources reusable; handlers local |
| 3 | Refactor `StatementBuilder` as a caller-driven segment loop | Self-mutating strategy; editor can't pass cursor context | Segment sequencing is a pure loop |
| 4 | Refactor "create new" as an n-step async chain | Hard-coded source tree inside factory; depth fixed at 2 | Arbitrarily deep flows as plain sequential awaits |

---

## Dependencies

Candidates build on each other: **1 enables 2**, and **2 enables 3 and 4**. Each can be tackled independently, but the full benefit is realised in sequence.

---

## Proposed Unified Interfaces

### `PaletteRequest`

```ts
interface PaletteRequest {
  placeholder?: string;
  initialQuery?: string;
  header?: React.ReactNode;
  sources: PaletteDataSource[];
}
```

### `PaletteDataSource`

```ts
interface PaletteDataSource {
  id: string;
  label?: string;
  search: (query: string) => PaletteItem[] | Promise<PaletteItem[]>;
}
```

### `PaletteItem`

```ts
interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  category?: string;
  type?: 'journal-entry' | 'collection' | 'workout' | 'action' | 'statement-part';
  payload?: unknown;
}
```

### `PaletteResponse`

```ts
type PaletteResponse =
  | { dismissed: true }
  | { dismissed: false; item: PaletteItem };
```

### Imperative open (Zustand store)

```ts
// Access from anywhere — React component, key handler, CodeMirror keymap
const result = await usePaletteStore.getState().open(request);
```

---

## Open Questions

- **Imperative API shape**: `ref`-based handle vs Zustand store with a Promise resolver? (Leaning Zustand — accessible from non-React contexts like CodeMirror key handlers.)
- **Multi-source merging**: sequential per-source sections (v1) or parallel with progressive render?
- **Step continuity UX**: when chaining steps, does the palette visually transition in-place (clear + repopulate, showing a breadcrumb of prior selections) or close and re-open? In-place is smoother; re-open is simpler. Breadcrumb state would live in the caller, passed as `header` on each `palette.open()` call.
- **Collection transition**: re-use same palette instance (clear + repopulate) or close and re-open?
- **`CommandProvider` / `CommandContext` fate**: keep for static shortcut registration (`Command[]`) and strip out the strategy machinery once all sites are migrated?
- **Shortcut unification**: settle on one trigger (`Ctrl+/`? `Ctrl+P`?) across all surfaces — playground App, note editor CodeMirror keymap, and the Workbench search button label.
- **`Ctrl+/` context sensitivity**: should it always open navigation, or should the active page affect the default sources?
