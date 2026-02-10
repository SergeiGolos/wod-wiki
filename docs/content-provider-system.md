# Content Provider System — Interchangeable History Providers

## Goal

Replace the hardcoded static content injection with an **async `IContentProvider` interface** that the workbench consumes. Ship two implementations — `StaticContentProvider` (current behavior, in-memory) and `LocalStorageContentProvider` (persists completed workouts to localStorage, date-based queries). The interface must be generic enough for future API-backed providers without any refactoring of consumers.

> **Assumes:** The History Panel UI from `docs/history-panel-expansion.md` is built per spec. This plan focuses exclusively on the **data layer** beneath it.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     WorkbenchProvider                    │
│        receives: IContentProvider (injected)             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  IContentProvider (async interface)                     │
│    ├── getEntries(query)  → HistoryEntry[]              │
│    ├── getEntry(id)       → HistoryEntry | null         │
│    ├── saveEntry(entry)   → HistoryEntry                │
│    ├── updateEntry(entry) → HistoryEntry                │
│    ├── deleteEntry(id)    → void                        │
│    └── readonly: mode, capabilities                     │
│                                                         │
│  Implementations:                                       │
│    ┌─────────────────┐  ┌────────────────────────────┐  │
│    │ StaticContent    │  │ LocalStorageContent         │  │
│    │ Provider         │  │ Provider                    │  │
│    │                  │  │                             │  │
│    │ • read-only      │  │ • read-write                │  │
│    │ • single entry   │  │ • date-based queries        │  │
│    │ • no persistence │  │ • localStorage persistence  │  │
│    │ • getEntries →   │  │ • auto-save on complete     │  │
│    │   [the 1 entry]  │  │ • manual save on edit       │  │
│    └─────────────────┘  └────────────────────────────┘  │
│                                                         │
│  Future:                                                │
│    ┌─────────────────┐                                  │
│    │ ApiContent       │                                  │
│    │ Provider         │  (same interface, HTTP calls)    │
│    └─────────────────┘                                  │
└─────────────────────────────────────────────────────────┘
```

---

## Storage Model: `HistoryEntry`

The stored document combines the workout source text, its parsed representation, and optionally the execution results. This extends the existing `WodResult` concept rather than replacing it.

```ts
interface HistoryEntry {
  id: string;                          // UUID
  title: string;                       // User-facing name (derived or manual)
  createdAt: number;                   // Unix timestamp (ms) — when first saved
  updatedAt: number;                   // Unix timestamp (ms) — last modification
  
  // Source content
  rawContent: string;                  // Original markdown text
  
  // Parsed representation (snapshot at save time)
  blocks: WodBlock[];                  // Parsed block JSON
  
  // Execution results (optional — present after workout completion)
  results?: {
    completedAt: number;               // When workout finished
    duration: number;                  // Total milliseconds
    logs: IOutputStatement[];          // Runtime output
  };
  
  // User metadata
  tags: string[];                      // User-defined tags
  notes?: string;                      // Post-workout notes
  
  // Schema versioning
  schemaVersion: number;               // For future migration
}
```

**Key decisions:**
- `rawContent` is always present — it's the single source of truth for the workout definition
- `blocks` is a snapshot of the parsed AST at save time — avoids re-parsing on list views
- `results` is optional — a saved draft has no results, a completed workout does
- `createdAt`/`updatedAt` are separate — `createdAt` is immutable, `updatedAt` tracks edits

> Note: this should store the CodeStatement not runtime blocks.

---

## Interface: `IContentProvider`

```ts
// Query types for date-based access
interface EntryQuery {
  dateRange?: { start: number; end: number };  // Unix timestamps (ms)
  daysBack?: number;                            // Alternative: "last N days"
  tags?: string[];                              // Filter by tags
  limit?: number;                               // Max results
  offset?: number;                              // For pagination
}

// Provider capabilities (what the UI should enable/disable)
interface ProviderCapabilities {
  canWrite: boolean;          // false for static
  canDelete: boolean;         // false for static
  canFilter: boolean;         // false for static (only 1 entry)
  canMultiSelect: boolean;    // false for static
  supportsHistory: boolean;   // false for static → hides History tab
}

type ContentProviderMode = 'static' | 'history';

interface IContentProvider {
  readonly mode: ContentProviderMode;
  readonly capabilities: ProviderCapabilities;
  
  // Read
  getEntries(query?: EntryQuery): Promise<HistoryEntry[]>;
  getEntry(id: string): Promise<HistoryEntry | null>;
  
  // Write (throws if !capabilities.canWrite)
  saveEntry(entry: Omit<HistoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'>): Promise<HistoryEntry>;
  updateEntry(id: string, patch: Partial<Pick<HistoryEntry, 'rawContent' | 'blocks' | 'results' | 'tags' | 'notes' | 'title'>>): Promise<HistoryEntry>;
  deleteEntry(id: string): Promise<void>;
}
```

**Why async everywhere:** Even `StaticContentProvider.getEntries()` returns a `Promise`. This means components never need to know whether data comes from memory, localStorage, or a network call. The cost is trivial (resolved microtask for static) but the benefit is zero refactoring when swapping providers.

---

## Relationship to Existing `LocalStorageProvider`

The existing `LocalStorageProvider` stores `WodResult` (execution logs only — no source markdown, no blocks). The new `LocalStorageContentProvider` is a **separate class** using a different key namespace (`wodwiki:history:` instead of `wodwiki:results:`). 

The existing provider remains untouched. Over time, migration logic could merge old `WodResult` entries into the new `HistoryEntry` format, but that's out of scope.

---

## Tasks

### Phase 1: Types & Interface

- [ ] **Task 1: Create `HistoryEntry` and query types**
  File: `src/types/history.ts`
  Define: `HistoryEntry`, `EntryQuery`, `ProviderCapabilities`, `ContentProviderMode`
  → Verify: `npx tsc --noEmit` passes, types importable from other modules

- [ ] **Task 2: Create `IContentProvider` interface**
  File: `src/types/content-provider.ts`
  Define: `IContentProvider` with all methods, re-export types from `history.ts`
  Import `WodBlock` from existing types, `IOutputStatement` from existing models
  → Verify: `npx tsc --noEmit` passes

### Phase 2: StaticContentProvider

- [ ] **Task 3: Implement `StaticContentProvider`**
  File: `src/services/content/StaticContentProvider.ts`
  Behavior:
  - Constructor takes `initialContent: string` 
  - `mode = 'static'`, capabilities: all false except basic read
  - `getEntries()` → returns single entry built from `initialContent` (parse blocks on construction)
  - `getEntry(id)` → returns the one entry if ID matches, null otherwise
  - `saveEntry()` / `updateEntry()` / `deleteEntry()` → throw `Error('Static provider is read-only')`
  - The single entry has `id: 'static'`, no results, no tags
  → Verify: Unit test — construct with markdown string, `getEntries()` returns array of 1, `saveEntry` throws

- [ ] **Task 4: Unit tests for `StaticContentProvider`**
  File: `src/services/content/__tests__/StaticContentProvider.test.ts`
  Cover: construction, getEntries returns 1 entry, getEntry with valid/invalid ID, write methods throw
  → Verify: `npx vitest run` — all pass

### Phase 3: LocalStorageContentProvider

- [ ] **Task 5: Implement `LocalStorageContentProvider`**
  File: `src/services/content/LocalStorageContentProvider.ts`
  Key namespace: `wodwiki:history:` (separate from existing `wodwiki:results:`)
  Behavior:
  - `mode = 'history'`, capabilities: all true
  - `getEntries(query)`:
    - Load all keys with prefix, parse, filter by `dateRange` OR `daysBack` (convert daysBack to dateRange internally using `Date.now() - daysBack * 86400000`)
    - Filter by `tags` if provided (entry must have ALL specified tags)
    - Apply `limit` and `offset`
    - Sort by `updatedAt` descending (newest first)
  - `getEntry(id)` → direct key lookup `wodwiki:history:{id}`
  - `saveEntry(data)` → generate UUID, set `createdAt = updatedAt = Date.now()`, `schemaVersion = 1`, write to localStorage, return full `HistoryEntry`
  - `updateEntry(id, patch)` → load existing, merge patch, set `updatedAt = Date.now()`, write back, return updated
  - `deleteEntry(id)` → `localStorage.removeItem(key)`
  - Validation: validate parsed JSON structure before returning (like existing `LocalStorageProvider.validateWodResult`)
  → Verify: Unit test with mocked localStorage

- [ ] **Task 6: Unit tests for `LocalStorageContentProvider`**
  File: `src/services/content/__tests__/LocalStorageContentProvider.test.ts`
  Cover:
  - `saveEntry` → generates ID, sets timestamps, persists
  - `getEntries()` → returns all, sorted by updatedAt desc
  - `getEntries({ daysBack: 7 })` → filters correctly
  - `getEntries({ dateRange: { start, end } })` → filters correctly
  - `getEntries({ tags: ['strength'] })` → filters by tag
  - `getEntries({ limit: 5, offset: 10 })` → pagination
  - `updateEntry` → merges patch, updates `updatedAt`, preserves `createdAt`
  - `deleteEntry` → removes from storage
  - Invalid JSON in localStorage → gracefully skipped
  → Verify: `npx vitest run` — all pass

### Phase 4: Provider Barrel & Factory

- [ ] **Task 7: Create barrel export + factory helper**
  File: `src/services/content/index.ts`
  Export: `StaticContentProvider`, `LocalStorageContentProvider`, `IContentProvider`, all types
  Factory helper:
  ```ts
  function createContentProvider(
    config: { mode: 'static'; initialContent: string } | { mode: 'history' }
  ): IContentProvider
  ```
  → Verify: `import { createContentProvider } from '@/services/content'` works

### Phase 5: WorkbenchProvider Integration

- [ ] **Task 8: Add `IContentProvider` to `WorkbenchProvider` props**
  File: `src/components/layout/WorkbenchContext.tsx`
  Changes:
  - Add `provider: IContentProvider` to `WorkbenchProviderProps` (required)
  - Remove `initialContent?: string` prop (provider replaces it)
  - Add `provider` and `providerCapabilities` to context state
  - Default `viewMode` based on `provider.mode`: `'history'` → `'history'`, `'static'` → `'plan'`
  - Backward compat: if existing code passes `initialContent`, wrap in a deprecation warning at dev time
  → Verify: Existing code compiles after updating call sites

- [ ] **Task 9: Update `Workbench` to accept provider**
  File: `src/components/layout/Workbench.tsx`
  Changes:
  - Accept `provider?: IContentProvider` prop
  - If `provider` not given but `initialContent` is → auto-create `StaticContentProvider(initialContent)` internally (backward compat)
  - Pass provider down to `WorkbenchProvider`
  - Strip mode derived from `provider.mode` (existing `static` → 3-view strip, `history` → dynamic strip)
  → Verify: Existing Storybook stories render unchanged (they pass `initialContent`, get auto-wrapped)

- [ ] **Task 10: Wire auto-save on workout completion**
  File: `src/components/layout/WorkbenchContext.tsx` (or new hook `src/hooks/useAutoSave.ts`)
  Behavior:
  - When `completeWorkout(results)` is called AND `provider.capabilities.canWrite`:
    1. Build entry from current content + blocks + results
    2. Call `provider.saveEntry(...)` 
    3. On success: entry appears in history
  - When provider is static: no save (canWrite = false), just collect results in memory as today
  → Verify: Complete a workout in history mode → entry appears in `getEntries()` after save

### Phase 6: Storybook & Verification

- [ ] **Task 11: Update Storybook stories**
  Existing stories that pass `initialContent` should continue working via the backward-compat path in Task 9.
  Add one new story: `HistoryModeWorkbench` that uses `createContentProvider({ mode: 'history' })` and pre-seeds 3-5 sample entries.
  → Verify: `npm run storybook` — all existing stories render, new story shows History panel with seeded entries

- [ ] **Task 12: Integration smoke test**
  Manual or automated:
  1. Static mode: load → Plan visible → run workout → complete → results in Review → no localStorage change
  2. History mode: load → History visible → create workout → complete → saved to localStorage → refresh → entry persists → select → loads into Plan
  → Verify: Both flows work end-to-end

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/types/history.ts` | **NEW** | `HistoryEntry`, `EntryQuery`, `ProviderCapabilities`, `ContentProviderMode` |
| `src/types/content-provider.ts` | **NEW** | `IContentProvider` interface |
| `src/services/content/StaticContentProvider.ts` | **NEW** | Read-only in-memory provider (replaces direct `initialContent` injection) |
| `src/services/content/LocalStorageContentProvider.ts` | **NEW** | Read-write localStorage provider with date-based queries |
| `src/services/content/index.ts` | **NEW** | Barrel export + `createContentProvider` factory |
| `src/services/content/__tests__/StaticContentProvider.test.ts` | **NEW** | Unit tests |
| `src/services/content/__tests__/LocalStorageContentProvider.test.ts` | **NEW** | Unit tests |
| `src/components/layout/WorkbenchContext.tsx` | **MODIFY** | Accept `IContentProvider`, expose in context |
| `src/components/layout/Workbench.tsx` | **MODIFY** | Accept provider prop, backward-compat wrapper |
| `src/hooks/useAutoSave.ts` | **NEW** | Hook to auto-save on workout completion |

---

## Key Design Decisions

1. **Separate from existing `LocalStorageProvider`:** The existing class stores `WodResult` (logs only). The new `LocalStorageContentProvider` stores `HistoryEntry` (source + blocks + optional results) under a different key prefix. No migration needed now — they coexist.

2. **`daysBack` as sugar:** `daysBack: 7` is internally converted to `dateRange: { start: now - 7d, end: now }`. The provider only implements range filtering; `daysBack` is converted at the interface boundary.

3. ==**`WodBlock[]` stored as snapshot:** We store the parsed blocks at save time so we don't need to re-parse on every list load. When `rawContent` is updated via `updateEntry`, the caller must also pass updated `blocks`.==^[should be CodeStatement]

4. **`saveEntry` vs `updateEntry` distinction:** `saveEntry` creates a new entry (generates ID, sets `createdAt`). `updateEntry` patches an existing entry (preserves `createdAt`, bumps `updatedAt`). This maps to: auto-save on complete → `saveEntry`; user edits notes/tags later → `updateEntry`.

5. **Provider injected, not imported:** Components never `import { localStorageContentProvider }` directly. They receive `IContentProvider` from context. This is what makes swapping to an API provider a one-line change at the app root.

---

## Notes

- The `HistoryEntry.blocks` field stores `WodBlock[]` — this is the same type already used in `WorkbenchContext`. No new models needed for the parsed representation.
- Tags are free-form strings. No tag registry or autocomplete yet — that's a UI concern for a later iteration.
- localStorage has a ~5MB limit per origin. For heavy users, this could be a constraint. A future `IndexedDBContentProvider` would use the same interface. Not in scope now.
- The `schemaVersion` field on `HistoryEntry` enables future migrations (e.g., adding fields, restructuring results).
- The `IContentProvider` interface has no `subscribe` or `onChange` method. The UI re-fetches after mutations. Reactive subscriptions (for multi-tab sync) can be added later without breaking the interface.

## Done When

- [ ] `StaticContentProvider` passes all unit tests (read-only, single entry)
- [ ] `LocalStorageContentProvider` passes all unit tests (CRUD, date filtering, pagination)
- [ ] `WorkbenchProvider` accepts `IContentProvider` — existing Storybook stories unchanged
- [ ] Workout completion in history mode auto-saves to localStorage
- [ ] Page refresh in history mode → saved entries persist and load
