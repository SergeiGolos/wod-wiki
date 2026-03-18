# Repositories & Content Providers

This document describes the data access layer: the `IContentProvider` interface, its four existing implementations, and how to add new backends (e.g., a server-backed provider).

## IContentProvider Interface

**Source**: [`src/types/content-provider.ts`](../../src/types/content-provider.ts)

The primary abstraction consumed by all UI code. Components receive an `IContentProvider` via props and never couple to a specific storage backend.

```typescript
interface IContentProvider {
  readonly mode: ContentProviderMode;         // 'history' | 'static'
  readonly capabilities: ProviderCapabilities;

  // ── Read ──────────────────────────────────────────────────
  getEntries(query?: EntryQuery): Promise<HistoryEntry[]>;
  getEntry(id: string): Promise<HistoryEntry | null>;

  // ── Write ─────────────────────────────────────────────────
  saveEntry(entry: Omit<HistoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'>): Promise<HistoryEntry>;
  cloneEntry(sourceId: string, targetDate?: number): Promise<HistoryEntry>;
  updateEntry(id: string, patch: Partial<...>): Promise<HistoryEntry>;
  deleteEntry(id: string): Promise<void>;

  // ── Attachments ───────────────────────────────────────────
  getAttachments(noteId: string): Promise<Attachment[]>;
  saveAttachment(noteId: string, attachment: Omit<Attachment, 'id' | 'noteId' | 'createdAt'>): Promise<Attachment>;
  deleteAttachment(id: string): Promise<void>;
}
```

### ContentProviderMode

| Value | Meaning |
|-------|---------|
| `'history'` | Full CRUD with browsing, filtering, multi-select. Used in production. |
| `'static'` | Fixed/ephemeral content. Used in demos, Storybook, embeds. |

### ProviderCapabilities

```typescript
interface ProviderCapabilities {
  canWrite: boolean;           // Can create / update entries
  canDelete: boolean;          // Can delete entries
  canFilter: boolean;          // Supports date/tag filtering
  canMultiSelect: boolean;     // Supports multi-entry selection
  supportsHistory: boolean;    // false hides the History tab entirely
}
```

### EntryQuery

```typescript
interface EntryQuery {
  dateRange?: { start: number; end: number };  // Unix ms
  daysBack?: number;                            // Sugar for "last N days"
  tags?: string[];                              // Entry must have ALL tags
  limit?: number;
  offset?: number;
}
```

### Factory Helper

**Source**: [`src/services/content/index.ts`](../../src/services/content/index.ts)

```typescript
import { createContentProvider } from '@/services/content';

// Static mode (storybook, demos)
const provider = createContentProvider({ mode: 'static', initialContent: '# Workout' });

// History mode (production)
const provider = createContentProvider({ mode: 'history' });
```

> **Note**: The factory currently returns `LocalStorageContentProvider` for `'history'` mode. Production apps that use IndexedDB instantiate `IndexedDBContentProvider` directly.

---

## Existing Implementations

### 1. IndexedDBContentProvider

**Source**: [`src/services/content/IndexedDBContentProvider.ts`](../../src/services/content/IndexedDBContentProvider.ts)  
**Backend**: IndexedDB via `idb` library  
**Mode**: `'history'`

The **production** provider. Delegates to `IndexedDBService` for normalized storage, then assembles `HistoryEntry` objects by joining Notes with their latest segments and results.

| Capability | Value |
|---|---|
| `canWrite` | `true` |
| `canDelete` | `true` |
| `canFilter` | `true` |
| `canMultiSelect` | `true` |
| `supportsHistory` | `true` |

**Key behaviors**:
- `getEntries()` — Fetches all Notes, applies client-side filtering (tags, date range), sorts by `targetDate` desc.
- `getEntry(id)` — Reconstructs full `HistoryEntry` from Note + latest NoteSegments + latest WorkoutResult. Supports fallback by short ID or title match.
- `saveEntry()` — Parses raw content into sections, creates a Note + one NoteSegment per section, all within a logical transaction.
- `updateEntry()` — Diffs incoming sections against existing segments, versions only changed segments, appends WorkoutResult if results are provided.
- `deleteNote()` — Cascading delete: removes Note, all segments, results, attachments, and associated analytics in a single IndexedDB transaction.

### 2. LocalStorageContentProvider

**Source**: [`src/services/content/LocalStorageContentProvider.ts`](../../src/services/content/LocalStorageContentProvider.ts)  
**Backend**: `window.localStorage`  
**Mode**: `'history'`

A fully functional CRUD provider that serializes `HistoryEntry` objects directly to localStorage under `wodwiki:history:{id}`. This was the original production provider and now serves as a fallback.

| Capability | Value |
|---|---|
| `canWrite` | `true` |
| `canDelete` | `true` |
| `canFilter` | `true` |
| `canMultiSelect` | `true` |
| `supportsHistory` | `true` |

**Key behaviors**:
- Stores the full `HistoryEntry` as a single JSON blob (no normalization).
- Supports date-range, tag, and pagination queries via client-side filtering.
- Attachment storage uses separate keys (`wodwiki:attachment:{id}`) with a note-to-attachment index (`wodwiki:note-attachments:{noteId}`).

### 3. StaticContentProvider

**Source**: [`src/services/content/StaticContentProvider.ts`](../../src/services/content/StaticContentProvider.ts)  
**Backend**: In-memory (single mutable entry)  
**Mode**: `'static'`

Wraps a single piece of initial content as a `HistoryEntry` and maintains mutations in memory. Used for Storybook demos, playground embeds, and ephemeral scenarios where full persistence is unnecessary.

| Capability | Value |
|---|---|
| `canWrite` | `true` |
| `canDelete` | `false` |
| `canFilter` | `false` |
| `canMultiSelect` | `false` |
| `supportsHistory` | `true` (session-scoped) |

**Key behaviors**:
- Single-entry model: `getEntries()` always returns one entry.
- `updateEntry()` with `results` appends to `extendedResults[]` instead of overwriting, providing session-level history.
- Attachments are stored in an in-memory `Map`.

### 4. MockContentProvider

**Source**: [`src/services/content/MockContentProvider.ts`](../../src/services/content/MockContentProvider.ts)  
**Backend**: In-memory (`Map<string, HistoryEntry>`)  
**Mode**: `'static'`

Designed for **unit tests and Storybook stories**. Accepts an array of seed entries in the constructor and provides full CRUD over them in memory.

| Capability | Value |
|---|---|
| `canWrite` | `true` |
| `canDelete` | `true` |
| `canFilter` | `true` |
| `canMultiSelect` | `true` |
| `supportsHistory` | `true` |

**Key behaviors**:
- Constructor accepts `HistoryEntry[]` for pre-seeding.
- All operations are synchronous internally, wrapped in `async` for interface compliance.
- `cloneEntry()` updates the source entry's `clonedIds` array.
- Useful for isolated component testing without any browser API dependency.

---

## Low-Level Data Service: IndexedDBService

**Source**: [`src/services/db/IndexedDBService.ts`](../../src/services/db/IndexedDBService.ts)

A singleton wrapper around the `idb` library that manages the `wodwiki-db` database (V4). This is **not** exposed to UI code — only `IndexedDBContentProvider` and `MigrationService` use it.

### Object Stores

| Store | Key | Indexes | Entity |
|-------|-----|---------|--------|
| `notes` | `id` (string) | `by-updated`, `by-target-date` | `Note` |
| `segments` | `[id, version]` (compound) | `by-note`, `by-type` | `NoteSegment` |
| `results` | `id` (string) | `by-segment`, `by-note`, `by-completed` | `WorkoutResult` |
| `attachments` | `id` (string) | `by-note`, `by-time` | `Attachment` |
| `analytics` | `id` (string) | `by-type`, `by-segment`, `by-result` | `AnalyticsDataPoint` |

### API Summary

```typescript
// Notes
getNote(id): Promise<Note | undefined>
getAllNotes(): Promise<Note[]>
saveNote(note): Promise<string>
deleteNote(id): Promise<void>                    // Cascading delete

// Segments (compound key: [id, version])
saveSegment(segment): Promise<[string, number]>
getSegment(id, version): Promise<NoteSegment | undefined>
getSegmentHistory(segmentId): Promise<NoteSegment[]>
getLatestSegmentVersion(segmentId): Promise<NoteSegment | undefined>
getLatestSegments(segmentIds): Promise<NoteSegment[]>

// Results
saveResult(result): Promise<string>
getResultsForNote(noteId): Promise<WorkoutResult[]>
getResultsForSection(noteId, sectionId): Promise<WorkoutResult[]>
getResultById(resultId): Promise<WorkoutResult | undefined>
getRecentResults(limit?): Promise<WorkoutResult[]>

// Attachments
saveAttachment(attachment): Promise<string>
getAttachmentsForNote(noteId): Promise<Attachment[]>
getAttachment(id): Promise<Attachment | undefined>
deleteAttachment(id): Promise<void>

// Analytics
saveAnalyticsPoints(points): Promise<void>
getAnalyticsByType(metricType): Promise<AnalyticsDataPoint[]>
getAnalyticsBySegment(segmentId): Promise<AnalyticsDataPoint[]>
getAnalyticsByResult(resultId): Promise<AnalyticsDataPoint[]>
deleteAnalyticsForResult(resultId): Promise<void>
```

---

## Ancillary Data Services

### NotebookService

**Source**: [`src/services/NotebookService.ts`](../../src/services/NotebookService.ts)  
**Backend**: `localStorage` (`wodwiki:notebooks` key)

Manages `Notebook` entities. Not part of `IContentProvider` — this is a standalone singleton service. Notebooks group entries via the tag convention `notebook:{id}`.

```typescript
getAll(): Notebook[]
getById(id): Notebook | null
create(name, description?, icon?): Notebook
update(id, patch): Notebook
delete(id): void
touchNotebook(id): void
getActiveId(): string | null
setActiveId(id): void
ensureDefault(): string
```

### ExerciseDefinitionService

**Source**: [`src/repositories/workout/ExerciseDefinitionService.ts`](../../src/repositories/workout/ExerciseDefinitionService.ts)  
**Backend**: In-memory `Map`

Reference data singleton for exercise metadata. Loaded once at startup from whatever source the host app provides (bundled JSON, API, etc.).

```typescript
static getInstance(exercises?): ExerciseDefinitionService
static reset(): void
findById(exerciseId): Exercise | undefined
getAllExercises(): Exercise[]
addExercise(exercise): void
```

### ExerciseDataProvider Interface

**Source**: [`src/core/types/providers.ts`](../../src/core/types/providers.ts)

An injection interface that decouples exercise data loading from the library. Host applications implement this to supply exercise data from any source.

```typescript
interface ExerciseDataProvider {
  loadIndex(): Promise<ExercisePathIndex>;
  loadExercise(path: string): Promise<Exercise>;
  searchExercises(query: string, limit?: number): Promise<ExercisePathEntry[]>;
}
```

---

## Adding a New Backend

To add a new storage backend (e.g., a REST API server), implement `IContentProvider`:

### Step 1: Create the Provider

```typescript
// src/services/content/ApiContentProvider.ts

import type { IContentProvider, ContentProviderMode } from '../../types/content-provider';
import type { HistoryEntry, EntryQuery, ProviderCapabilities } from '../../types/history';
import type { Attachment } from '../../types/storage';

export class ApiContentProvider implements IContentProvider {
  readonly mode: ContentProviderMode = 'history';
  readonly capabilities: ProviderCapabilities = {
    canWrite: true,
    canDelete: true,
    canFilter: true,
    canMultiSelect: true,
    supportsHistory: true,
  };

  constructor(private baseUrl: string) {}

  async getEntries(query?: EntryQuery): Promise<HistoryEntry[]> {
    const params = new URLSearchParams();
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.offset) params.set('offset', String(query.offset));
    // ... map other query fields

    const res = await fetch(`${this.baseUrl}/entries?${params}`);
    return res.json();
  }

  async getEntry(id: string): Promise<HistoryEntry | null> {
    const res = await fetch(`${this.baseUrl}/entries/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    return res.json();
  }

  // ... implement remaining methods
}
```

### Step 2: Register in the Factory (optional)

```typescript
// src/services/content/index.ts

export function createContentProvider(
  config:
    | { mode: 'static'; initialContent: string }
    | { mode: 'history' }
    | { mode: 'api'; baseUrl: string }
): IContentProvider {
  if (config.mode === 'static') return new StaticContentProvider(config.initialContent);
  if (config.mode === 'api') return new ApiContentProvider(config.baseUrl);
  return new LocalStorageContentProvider();
}
```

### Step 3: Inject at the App Root

Since providers are passed as props (not imported directly), the swap is localized:

```tsx
// Before
<Workbench provider={new IndexedDBContentProvider()} />

// After
<Workbench provider={new ApiContentProvider('https://api.example.com')} />
```

### Implementation Checklist for New Providers

- [ ] Implement all `IContentProvider` methods
- [ ] Set `mode` and `capabilities` correctly
- [ ] Throw on write operations if `capabilities.canWrite` is false
- [ ] Return entries sorted by `targetDate` descending from `getEntries()`
- [ ] Support `EntryQuery` filtering (at minimum: `tags`, `dateRange`, `limit`, `offset`)
- [ ] Handle `cloneEntry()` — create a copy and update source's `clonedIds`
- [ ] Handle attachment lifecycle (`save`, `get`, `delete`)
- [ ] Assign `schemaVersion: 1` to all returned `HistoryEntry` objects
- [ ] Generate UUIDs for new entries (use `uuid` v4)

### Testing a New Provider

Use `MockContentProvider` as a reference implementation. The existing `StaticContentProvider.test.ts` demonstrates the test patterns:

```typescript
describe('MyNewProvider', () => {
  it('should save and retrieve entries', async () => {
    const provider = new MyNewProvider(/* config */);
    const saved = await provider.saveEntry({
      title: 'Test',
      rawContent: '# Test',
      tags: [],
      targetDate: Date.now(),
    });
    const retrieved = await provider.getEntry(saved.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.title).toBe('Test');
  });
});
```
