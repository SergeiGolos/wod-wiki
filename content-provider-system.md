# Content Provider System — Interchangeable History Providers

## Goal

Replace the hardcoded static content injection with an **async `IContentProvider` interface** that the workbench consumes. Ship two implementations — `StaticContentProvider` (current behavior, in-memory) and `LocalStorageContentProvider` (persists completed workouts to localStorage, date-based queries). The interface must be generic enough for future API-backed providers without any refactoring of consumers.

Include a **"Notebook"** Storybook story that runs the full `LocalStorageContentProvider` — data persists across browser sessions on the same machine. This is the primary dev/demo surface for the history-mode workbench.

> **Assumes:** The History Panel UI from `docs/history-panel-expansion.md` is built per spec. This plan focuses on the **data layer** beneath it.

---

## Architecture

```
              ┌──────────────────────────┐
              │    Workbench      │
              │  (accepts IContentProvider)│
              └────────────┬─────────────┘
                           │
              ┌────────────▼─────────────┐
              │    WorkbenchProvider      │
              │   provider: IContentProvider│
              └────────────┬─────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
  ┌───────▼──────┐ ┌──────▼───────┐ ┌──────▼───────┐
  │ Static       │ │ LocalStorage │ │ Api          │
  │ Content      │ │ Content      │ │ Content      │
  │ Provider     │ │ Provider     │ │ Provider     │
  │              │ │              │ │ (future)     │
  │ • read-only  │ │ • read-write │ │              │
  │ • 1 entry    │ │ • localStorage│ │              │
  │ • in-memory  │ │ • date queries│ │              │
  └──────────────┘ └──────────────┘ └──────────────┘
```

Provider is **injected**, not imported. Components receive `IContentProvider` from context.  
Swapping to an API provider = one-line change at the app root.

---

## Storage Model: `HistoryEntry`

```ts
interface HistoryEntry {
  id: string;                          // UUID
  title: string;                       // User-facing name
  createdAt: number;                   // Unix ms — immutable
  updatedAt: number;                   // Unix ms — bumped on edit

  // Source
  rawContent: string;                  // Original markdown
  blocks: WodBlock[];                  // Parsed block JSON snapshot

  // Execution results (optional — present after completion)
  results?: {
    completedAt: number;
    duration: number;                  // ms
    logs: IOutputStatement[];
  };

  // Metadata
  tags: string[];
  notes?: string;
  schemaVersion: number;               // For future migration
}
```

**Decisions:**
- `rawContent` always present — single source of truth
- `blocks` is a save-time snapshot (avoids re-parsing on list views)
- `results` optional — drafts have none, completed workouts do
- Separate `createdAt`/`updatedAt` — edits bump `updatedAt` only

---

## Interface: `IContentProvider`

```ts
interface EntryQuery {
  dateRange?: { start: number; end: number };  // Unix ms
  daysBack?: number;                            // Sugar: "last N days"
  tags?: string[];
  limit?: number;
  offset?: number;
}

interface ProviderCapabilities {
  canWrite: boolean;
  canDelete: boolean;
  canFilter: boolean;
  canMultiSelect: boolean;
  supportsHistory: boolean;            // false → hides History tab
}

type ContentProviderMode = 'static' | 'history';

interface IContentProvider {
  readonly mode: ContentProviderMode;
  readonly capabilities: ProviderCapabilities;

  // Read (always async)
  getEntries(query?: EntryQuery): Promise<HistoryEntry[]>;
  getEntry(id: string): Promise<HistoryEntry | null>;

  // Write (throws if !capabilities.canWrite)
  saveEntry(entry: Omit<HistoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'>): Promise<HistoryEntry>;
  updateEntry(id: string, patch: Partial<Pick<HistoryEntry, 'rawContent' | 'blocks' | 'results' | 'tags' | 'notes' | 'title'>>): Promise<HistoryEntry>;
  deleteEntry(id: string): Promise<void>;
}
```

**Why async everywhere:** Even `StaticContentProvider.getEntries()` returns a `Promise`. Components never know if data is from memory, localStorage, or HTTP. The cost is a resolved microtask for static; the benefit is zero refactoring when swapping providers.

**`daysBack` as sugar:** `daysBack: 7` internally converts to `dateRange: { start: now - 7d, end: now }`. Only range filtering is implemented; `daysBack` is converted at the interface boundary.

---

## Relationship to Existing `LocalStorageProvider`

The existing `LocalStorageProvider` stores `WodResult` under `wodwiki:results:*` (logs only — no source markdown, no blocks). The new `LocalStorageContentProvider` is a **separate class** using `wodwiki:history:*`. Both coexist — no migration needed now.

---

## Tasks

### Phase 1: Types & Interface

- [ ] **Task 1: Create `HistoryEntry` and query types**
  File: `src/types/history.ts`
  Define: `HistoryEntry`, `EntryQuery`, `ProviderCapabilities`, `ContentProviderMode`
  → Verify: `npx tsc --noEmit` passes

- [ ] **Task 2: Create `IContentProvider` interface**
  File: `src/types/content-provider.ts`
  Define `IContentProvider` with all methods. Import `WodBlock`, `IOutputStatement` from existing types.
  → Verify: `npx tsc --noEmit` passes

### Phase 2: StaticContentProvider

- [ ] **Task 3: Implement `StaticContentProvider`**
  File: `src/services/content/StaticContentProvider.ts`
  - Constructor takes `initialContent: string`
  - `mode = 'static'`, capabilities: all false except basic read
  - `getEntries()` → single entry with `id: 'static'`, parsed `blocks`, no results
  - `getEntry(id)` → returns entry if ID matches, null otherwise
  - Write methods → throw `Error('Static provider is read-only')`
  → Verify: Unit test — getEntries returns 1, saveEntry throws

- [ ] **Task 4: Unit tests for `StaticContentProvider`**
  File: `src/services/content/__tests__/StaticContentProvider.test.ts`
  → Verify: `npx vitest run` — all pass

### Phase 3: LocalStorageContentProvider

- [ ] **Task 5: Implement `LocalStorageContentProvider`**
  File: `src/services/content/LocalStorageContentProvider.ts`
  Key namespace: `wodwiki:history:{id}`
  - `mode = 'history'`, capabilities: all true
  - `getEntries(query)`:
    - Filter by `dateRange` OR `daysBack` (convert daysBack → dateRange)
    - Filter by `tags` (entry must have ALL specified tags)
    - Apply `limit`/`offset`, sort by `updatedAt` desc
  - `saveEntry(data)` → generate UUID, set `createdAt = updatedAt = Date.now()`, `schemaVersion = 1`
  - `updateEntry(id, patch)` → load, merge, bump `updatedAt`, write back
  - `deleteEntry(id)` → `localStorage.removeItem(key)`
  - Validation: skip entries with invalid JSON (graceful degradation)
  → Verify: Unit test with mocked localStorage

- [ ] **Task 6: Unit tests for `LocalStorageContentProvider`**
  File: `src/services/content/__tests__/LocalStorageContentProvider.test.ts`
  Cover: save, get, list, date range filter, daysBack filter, tag filter, pagination, update (bumps updatedAt, preserves createdAt), delete, invalid JSON gracefully skipped
  → Verify: `npx vitest run` — all pass

### Phase 4: Barrel & Factory

- [ ] **Task 7: Create barrel export + factory helper**
  File: `src/services/content/index.ts`
  Export all providers + types. Factory:
  ```ts
  function createContentProvider(
    config: { mode: 'static'; initialContent: string } | { mode: 'history' }
  ): IContentProvider
  ```
  → Verify: `import { createContentProvider } from '@/services/content'` works

### Phase 5: WorkbenchProvider Integration

- [ ] **Task 8: Add `IContentProvider` to `WorkbenchProvider` props**
  File: `src/components/layout/WorkbenchContext.tsx`
  - Add `provider: IContentProvider` to props (required)
  - Expose `provider` and `providerCapabilities` in context state
  - Default `viewMode` based on provider mode: `'history'` → `'history'`, `'static'` → `'plan'`
  - Backward compat: keep `initialContent?` prop — if given without provider, auto-create `StaticContentProvider` internally
  → Verify: Existing stories compile unchanged

- [ ] **Task 9: Update `Workbench` to accept provider**
  File: `src/components/layout/Workbench.tsx`
  - Accept `provider?: IContentProvider` prop
  - If no provider but `initialContent` present → auto-create `StaticContentProvider` (backward compat)
  - Pass provider down to `WorkbenchProvider`
  → Verify: Existing Storybook stories render unchanged

- [ ] **Task 10: Wire auto-save on workout completion**
  File: `src/hooks/useAutoSave.ts` (new)
  - On `completeWorkout()` when `provider.capabilities.canWrite`:
    1. Build entry from current content + blocks + results
    2. Call `provider.saveEntry(...)`
  - When provider is static: no save (canWrite = false)
  → Verify: Complete workout in history mode → `getEntries()` returns it

### Phase 6: "Notebook" Storybook Story

- [ ] **Task 11: Create `Notebook` story with persistent LocalStorage provider**
  File: `stories/Notebook.stories.tsx`

  This story is the primary dev/demo surface for history-mode. It wraps `Workbench` with a real `LocalStorageContentProvider` so that **all data persists in the browser's localStorage across sessions**.

  ```tsx
  import { Workbench } from '@/components/layout/Workbench';
  import { LocalStorageContentProvider } from '@/services/content/LocalStorageContentProvider';
  import type { Meta, StoryObj } from '@storybook/react';

  // Singleton — same instance across hot reloads
  const notebookProvider = new LocalStorageContentProvider();

  const meta: Meta<typeof Workbench> = {
    title: 'Notebook',
    component: Workbench,
    parameters: {
      layout: 'fullscreen',
      docs: {
        description: {
          component:
            'Full workbench with persistent localStorage history. ' +
            'Workouts you create and complete are saved and survive page reloads. ' +
            'This is the closest experience to production mode.',
        },
      },
    },
  };

  export default meta;
  type Story = StoryObj<typeof meta>;

  export const Default: Story = {
    args: {
      provider: notebookProvider,
      showToolbar: false,
      theme: 'wod-dark',
    },
  };
  ```

  **Key behaviors:**
  - `LocalStorageContentProvider` is instantiated at module scope → same instance across Storybook hot reloads
  - Data stored under `wodwiki:history:*` keys → survives browser refresh, tab close, reopening Storybook
  - Landing view is `History` (provider mode = `'history'`)
  - User can create workouts, run them, complete → auto-saved → appear in History panel on next visit
  - Selecting an entry from History loads it into Plan → Track → Review (full flow)
  - No mock data seeded — starts empty, user builds their own persistent library
  - Optional: Add a `Seeded` story variant that calls `provider.saveEntry()` with 3-5 sample workouts in a `play()` function, but only if the store is empty (idempotent seeding)

  → Verify: 
    1. Open Notebook story → History panel shows (empty on first run)
    2. Create a workout → complete it → entry appears in History
    3. Refresh browser → entry still visible
    4. Close/reopen Storybook → entry still visible
    5. Clear localStorage manually → entries gone (expected)

- [ ] **Task 12: (Optional) Seeded Notebook variant**
  File: Same `stories/Notebook.stories.tsx`
  Add `Seeded` story that checks if localStorage is empty and pre-populates with sample workouts using `play()`:
  ```tsx
  export const Seeded: Story = {
    args: { ...Default.args },
    play: async () => {
      const existing = await notebookProvider.getEntries();
      if (existing.length === 0) {
        await notebookProvider.saveEntry({
          title: 'Fran',
          rawContent: franMarkdown,
          blocks: [],  // parsed at save time
          tags: ['benchmark', 'couplet'],
        });
        // ... 2-3 more sample entries
      }
    },
  };
  ```
  → Verify: First visit shows seeded entries; subsequent visits don't duplicate them

### Phase 7: Integration Verification

- [ ] **Task 13: Verify backward compatibility**
  - All existing stories (`Playground`, `Overview`, etc.) render unchanged — they use `initialContent` which auto-wraps in `StaticContentProvider`
  - No History tab visible in any existing story
  - Plan is the landing view in static mode
  → Verify: `npm run storybook` — zero regressions

- [ ] **Task 14: End-to-end smoke test**
  Manual or automated:
  1. **Static mode** (Playground story): load → Plan → run → complete → results in Review → no localStorage change
  2. **History mode** (Notebook story): load → History → create → complete → saved → refresh → persists → select → loads into Plan
  → Verify: Both flows work end-to-end

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/types/history.ts` | **NEW** | `HistoryEntry`, `EntryQuery`, `ProviderCapabilities`, `ContentProviderMode` |
| `src/types/content-provider.ts` | **NEW** | `IContentProvider` interface |
| `src/services/content/StaticContentProvider.ts` | **NEW** | Read-only in-memory provider |
| `src/services/content/LocalStorageContentProvider.ts` | **NEW** | Read-write localStorage provider with date queries |
| `src/services/content/index.ts` | **NEW** | Barrel export + `createContentProvider` factory |
| `src/services/content/__tests__/StaticContentProvider.test.ts` | **NEW** | Unit tests |
| `src/services/content/__tests__/LocalStorageContentProvider.test.ts` | **NEW** | Unit tests |
| `src/hooks/useAutoSave.ts` | **NEW** | Auto-save on workout completion |
| `src/components/layout/WorkbenchContext.tsx` | **MODIFY** | Accept `IContentProvider`, expose in context |
| `src/components/layout/Workbench.tsx` | **MODIFY** | Accept provider prop, backward-compat wrapper |
| `stories/Notebook.stories.tsx` | **NEW** | Persistent history-mode Storybook story |

---

## Key Design Decisions

1. **Separate from existing `LocalStorageProvider`:** Different key namespace (`wodwiki:history:` vs `wodwiki:results:`). No migration, both coexist.

2. **`saveEntry` vs `updateEntry`:** `saveEntry` = new entry (auto-save on workout complete). `updateEntry` = patch existing (user edits notes/tags later). Separate methods, separate semantics.

3. **Notebook story uses real localStorage:** Not mocked. Data survives across sessions on that machine. This is intentional — it makes the story a genuine dev sandbox for the history-mode workbench. The consequence is that Storybook on the same origin shares localStorage state — which is the desired behavior (persistent notebook).

4. **Provider singleton at module scope:** `const notebookProvider = new LocalStorageContentProvider()` at file top level ensures the same instance survives Storybook hot module reloads without losing reference to the store.

5. **`daysBack` converted to `dateRange` internally:** Single filtering code path. UI can offer "Last 7 days" / "Last 30 days" buttons that map to `daysBack` values.

6. **`WodBlock[]` stored as snapshot:** Avoids re-parsing on list loads. When `rawContent` changes via `updateEntry`, caller passes updated `blocks` too.

---

## Done When

- [ ] `StaticContentProvider` passes all unit tests (read-only, single entry)
- [ ] `LocalStorageContentProvider` passes all unit tests (CRUD, date filtering, pagination)
- [ ] `WorkbenchProvider` accepts `IContentProvider` — existing stories unchanged
- [ ] Workout completion in history mode auto-saves to localStorage
- [ ] **Notebook** Storybook story loads with History panel, persists data across browser sessions
- [ ] Page refresh in Notebook → saved entries still visible
- [ ] Existing Playground/Overview stories → zero regressions (static mode, 3-view strip)
