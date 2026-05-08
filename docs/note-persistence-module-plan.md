# Note Persistence Module — Problem, Proposed Solution, and Planned Fix

**Status:** Proposed  
**Date:** 2026-05-07  
**Decision bias:** Adopt a minimal, high-leverage persistence seam based on Design 1, with optional read projection parameters on `getNote()` to support History / Review workflows.

---

## 1. Problem Description

The current persistence seam is too shallow.

`IContentProvider` gives the UI an async abstraction over storage backends, but significant persistence behavior still leaks into UI and orchestration code. Callers currently need to understand or bypass:

- `HistoryEntry` as a denormalized view of `Note`, latest `NoteSegment`s, and `WorkoutResult`s
- `NoteSegment` versioning and ID matching
- `WorkoutResult` linking by `sectionId`, `segmentId`, `segmentVersion`, and sometimes `resultId`
- latest-result lookup for Review routes
- section-specific result history lookup for WOD cards
- attachment listing, creation, and deletion
- analytics persistence / normalization from runtime output
- fallback ID resolution by full UUID, short ID, or title
- direct `indexedDBService` access from UI modules

### Current symptoms

Examples of leaked persistence behavior:

- `WorkbenchContext.tsx` loads entries through `provider.getEntry()`, but also directly imports `indexedDBService` to resolve route-specific review results.
- `useWodBlockResults.ts` directly queries `indexedDBService.getResultsForSection()` after checking in-memory `extendedResults`.
- `useWorkbenchEffects.ts` normalizes runtime analytics segments into `AnalyticsDataPoint[]` and writes them directly to IndexedDB.
- `IndexedDBContentProvider.ts` owns important Note/Segment/Result reconstruction behavior, but callers still need to know when to bypass it.

### Architectural cost

This lowers module depth:

- **Low locality:** Result linking and denormalization bugs can appear in Workbench, hooks, provider code, or IndexedDB service code.
- **Low leverage:** UI callers ask storage-shaped questions instead of Note-shaped questions.
- **Harder testing:** Tests must mock storage details instead of verifying one Note lifecycle seam.
- **Backend swap risk:** `indexedDBService` direct imports weaken the provider abstraction.

---

## 2. Proposed Solution

Create a deeper **Note Persistence Module** with a minimal public seam.

The module should expose Note-level operations only. It should hide storage adapters, segment versioning, result linking, analytics normalization, and attachment indexing behind the seam.

### Final direction: Design 1 with richer `getNote()` projection options

Design 1 remains the best fit because it maximizes leverage:

- Few public methods
- Callers work with Notes, not storage records
- `mutateNote()` concentrates all write-side lifecycle rules
- `getNote()` concentrates all read-side denormalization and selection rules

The main adjustment is to support History / Review workflows through optional **projection parameters** on `getNote()`.

This validates the proposed user direction: **yes, the history process can be supported cleanly with optional selection parameters on `getNote()`**, as long as those parameters are treated as read projection options, not UI selection state.

---

## 3. Proposed Interface

```typescript
export interface INotePersistence {
  /**
   * Load a Note projection by UUID, short ID, title, or other supported locator.
   *
   * The module returns a denormalized HistoryEntry ready for the caller's use case.
   * Optional projection parameters select result scope, attachments, and history shape.
   */
  getNote(
    locator: NoteLocator,
    options?: GetNoteOptions,
  ): Promise<HistoryEntry>;

  /**
   * List Note summaries for History browsing.
   *
   * This should be lightweight by default: enough for rows/cards, not full result history.
   */
  listNotes(query?: NoteQuery): Promise<HistoryEntry[]>;

  /**
   * Apply Note-level mutations.
   *
   * All storage-specific behavior hides here:
   * - content mutation creates new NoteSegment versions
   * - workout result append links to the selected section / segment version
   * - analytics are normalized and persisted
   * - attachments are added/removed and indexed
   * - metadata changes update the root Note
   */
  mutateNote(
    locator: NoteLocator,
    mutation: NoteMutation,
  ): Promise<HistoryEntry>;

  /**
   * Delete a Note and all owned persistence state.
   * Cascades to segments, results, attachments, and analytics rows where supported.
   */
  deleteNote(locator: NoteLocator): Promise<void>;
}
```

### Supporting types

```typescript
export type NoteLocator =
  | string
  | {
      id?: string;
      shortId?: string;
      title?: string;
    };

export interface GetNoteOptions {
  /**
   * Shape of returned data.
   * Defaults to `workbench`, which loads current content + latest result summary.
   */
  projection?: 'summary' | 'workbench' | 'review' | 'history-detail';

  /**
   * Optional result selection for Review / WOD history flows.
   * This controls which result is placed in `HistoryEntry.results`
   * and what appears in `HistoryEntry.extendedResults`.
   */
  resultSelection?: ResultSelection;

  /** Include attachments in returned entry. Defaults depend on projection. */
  includeAttachments?: boolean;

  /** Include parsed sections if available. Defaults to true for workbench/review. */
  includeSections?: boolean;
}

export type ResultSelection =
  | {
      mode: 'latest';
    }
  | {
      mode: 'by-result-id';
      resultId: string;
    }
  | {
      mode: 'latest-for-section';
      sectionId: string;
    }
  | {
      mode: 'all-for-section';
      sectionId: string;
      limit?: number;
    }
  | {
      mode: 'all-for-note';
      limit?: number;
    };

export interface NoteQuery {
  ids?: string[];
  dateRange?: { start: number; end: number };
  daysBack?: number;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;

  /**
   * Query rows should remain summary-shaped by default.
   * This exists for analyze/history-detail flows that need richer entries.
   */
  projection?: 'summary' | 'history-detail';
}

export interface NoteMutation {
  /**
   * New markdown content. If changed, creates new NoteSegment versions internally.
   */
  rawContent?: string;

  /** Metadata updates on the root Note. */
  metadata?: Partial<{
    title: string;
    tags: string[];
    targetDate: number;
    notes: string;
    type: 'note' | 'template' | 'playground';
    templateId: string;
    clonedIds: string[];
  }>;

  /**
   * Append workout result.
   * The module links to the current NoteSegment version for `sectionId`.
   */
  workoutResult?: {
    id?: string;
    sectionId?: string;
    data: WorkoutResults;
    completedAt?: number;
  };

  /** Attachment operations. */
  attachments?: {
    add?: File[];
    remove?: string[];
  };
}
```

---

## 4. History Process Validation

The optional `getNote()` selection parameters support the current History / Review process without expanding the public seam.

### A. History browse

Current need:

- Show many entries in History panel
- Filter by date, tags, search
- Support checkbox selection and row open

Use:

```typescript
const entries = await notePersistence.listNotes({
  daysBack: 30,
  tags: ['crossfit'],
  projection: 'summary',
});
```

Notes:

- UI selection state (`selectedIds`, `activeEntryId`) remains in `useHistorySelection` or equivalent UI state.
- The persistence module should not own checkbox selection.
- `listNotes()` returns lightweight `HistoryEntry` rows, not full result history by default.

### B. Open a row into Plan / Workbench

Current need:

- User clicks a History row
- Workbench loads full content and current denormalized Note state
- Attachments and parsed sections may be needed

Use:

```typescript
const entry = await notePersistence.getNote(noteId, {
  projection: 'workbench',
  includeAttachments: true,
  includeSections: true,
  resultSelection: { mode: 'latest' },
});
```

Expected returned shape:

- `entry.rawContent` contains current markdown
- `entry.sections` is populated if available/requested
- `entry.results` contains latest result for the Note, if any
- `entry.extendedResults` may be omitted unless projection requests it
- attachments are available either on the entry projection or through module-owned state, depending on final `HistoryEntry` shape

### C. Review route with explicit result ID

Current need:

- URL may contain `resultId`
- Workbench must show analytics for that exact result
- Current code directly calls `indexedDBService.getResultById(resultId)`

Use:

```typescript
const entry = await notePersistence.getNote(noteId, {
  projection: 'review',
  resultSelection: {
    mode: 'by-result-id',
    resultId,
  },
});
```

Expected returned shape:

- `entry.results` is set to the selected `WorkoutResults`
- no UI code imports `indexedDBService`
- if the result does not belong to the Note, return a typed not-found / mismatch error

### D. Review route with section ID but no result ID

Current need:

- URL contains a `sectionId`
- Show latest result for that section
- Current code directly calls `indexedDBService.getResultsForSection(noteId, sectionId)` and picks newest

Use:

```typescript
const entry = await notePersistence.getNote(noteId, {
  projection: 'review',
  resultSelection: {
    mode: 'latest-for-section',
    sectionId,
  },
});
```

Expected returned shape:

- `entry.results` is the newest result matching `sectionId` or matching the corresponding `segmentId`
- legacy `sectionId` and newer `segmentId` matching is hidden inside the module

### E. WOD card section result history

Current need:

- `useWodBlockResults(noteId, sectionId)` lists all results for a WOD section
- Current hook first checks in-memory `extendedResults`, then falls back to direct IndexedDB

Use:

```typescript
const entry = await notePersistence.getNote(noteId, {
  projection: 'history-detail',
  resultSelection: {
    mode: 'all-for-section',
    sectionId,
    limit: 50,
  },
});

const results = entry.extendedResults ?? [];
```

Expected returned shape:

- `entry.extendedResults` contains matching `WorkoutResult[]`, sorted newest first
- callers do not need to know whether the source is in-memory, static, mock, localStorage, or IndexedDB

### F. Multi-select analyze

Current need:

- History panel can select multiple entries
- Analyze view may need richer data for selected IDs

Use:

```typescript
const entries = await notePersistence.listNotes({
  ids: Array.from(selectedIds),
  projection: 'history-detail',
});
```

or, if richer per-note result selection is needed:

```typescript
const entries = await Promise.all(
  Array.from(selectedIds).map(id =>
    notePersistence.getNote(id, {
      projection: 'history-detail',
      resultSelection: { mode: 'all-for-note', limit: 100 },
    }),
  ),
);
```

Validation:

- Multi-select state remains a UI concern.
- The persistence module only resolves selected IDs into Note projections.
- This avoids adding a separate `getResultHistory()` method while still supporting history detail views.

---

## 5. Why This Keeps Design 1 Clean

The risk with adding history support is interface creep. This proposal avoids that by separating:

### UI selection state

Owned by UI / Workbench / History panel:

- selected row IDs
- active row ID
- shift-click ranges
- checked rows
- current route

### Persistence projection selection

Owned by `getNote()` options:

- which result should populate `HistoryEntry.results`
- whether section-specific result history should populate `extendedResults`
- whether attachments or parsed sections should be included
- how much data to return for a use case

That keeps the public seam minimal while giving enough expressiveness for History and Review.

---

## 6. Implementation Plan

### Phase 1 — Define the seam

Create:

- `src/services/persistence/INotePersistence.ts`
- `src/services/persistence/types.ts`
- `src/services/persistence/index.ts`

Add the interface and supporting types from this document.

### Phase 2 — Implement IndexedDB-backed persistence

Create:

- `src/services/persistence/IndexedDBNotePersistence.ts`

Move or wrap behavior currently spread across:

- `src/services/content/IndexedDBContentProvider.ts`
- `src/services/db/IndexedDBService.ts`
- `src/components/layout/WorkbenchContext.tsx` route-specific result lookup
- `src/components/Editor/hooks/useWodBlockResults.ts`
- `src/components/layout/useWorkbenchEffects.ts` analytics persistence

Implementation responsibilities:

- resolve `NoteLocator` by UUID, short ID, or title
- denormalize `HistoryEntry` from Note + latest segments + selected results
- rebuild `rawContent` from latest segments
- select result by result ID, latest-for-section, all-for-section, etc.
- link appended workout results to current segment version
- normalize analytics and persist `AnalyticsDataPoint[]`
- add/remove/list attachments through the mutation/projection API
- cascade delete Note-owned persistence data

### Phase 3 — Provide alternate adapters

Implement or wrap:

- `MockNotePersistence` for tests and Storybook
- `StaticNotePersistence` for static/demo content
- optional `LocalStorageNotePersistence` if still needed

`IContentProvider` can remain as an internal adapter during migration, but UI should consume `INotePersistence`.

### Phase 4 — Refactor callers

Replace persistence access in this order:

1. `WorkbenchContext.tsx`
   - `provider.getEntry()` → `notePersistence.getNote()`
   - route-specific result lookup → `getNote(..., { projection: 'review', resultSelection })`
   - `provider.updateEntry()` → `mutateNote()`
   - `provider.getAttachments()` → `getNote(..., { includeAttachments: true })` or module helper behavior

2. `useWodBlockResults.ts`
   - direct `indexedDBService.getResultsForSection()` → `getNote(..., { resultSelection: { mode: 'all-for-section' } })`

3. `useWorkbenchEffects.ts`
   - direct analytics persistence → `mutateNote(..., { workoutResult })` or module-owned finalize behavior

4. `NoteEditor.tsx`
   - direct storage calls → `mutateNote()` / `getNote()` projections

### Phase 5 — Remove UI direct IndexedDB access

Acceptance criterion:

```bash
rg "indexedDBService" src/components src/hooks src/panels
```

should return no direct UI persistence imports except allowed composition/root wiring files.

---

## 7. Testing Plan

### Core seam tests

Add tests for `IndexedDBNotePersistence` / `MockNotePersistence`:

1. `getNote(id)` denormalizes latest content into `HistoryEntry.rawContent`
2. `getNote(id, { resultSelection: { mode: 'by-result-id' } })` selects exact result
3. `getNote(id, { resultSelection: { mode: 'latest-for-section' } })` selects newest matching result
4. `getNote(id, { resultSelection: { mode: 'all-for-section' } })` returns matching `extendedResults`
5. `listNotes(query)` filters and sorts History rows
6. `listNotes({ ids })` supports multi-select analyze hydration
7. `mutateNote({ rawContent })` creates new segment versions and preserves old versions
8. `mutateNote({ workoutResult })` links to current section/segment and persists analytics
9. `mutateNote({ attachments })` adds/removes attachments and updates projection
10. `deleteNote()` cascades Note-owned data

### Caller regression tests

- Workbench loads a History row with attachments and sections
- Review route with `resultId` shows exact result
- Review route with `sectionId` and no `resultId` shows latest section result
- WOD card result history renders without direct IndexedDB hook fallback
- Completing a workout appends result and navigates to Review with selected result available

---

## 8. Open Questions

1. Should attachments be embedded into returned `HistoryEntry`, or returned alongside it in a `NoteProjection` wrapper?

   Current `HistoryEntry` has no attachment field. A wrapper may be cleaner:

   ```typescript
   interface NoteProjection {
     entry: HistoryEntry;
     attachments?: Attachment[];
   }
   ```

   If we keep `getNote()` returning `HistoryEntry`, we may need to extend the type.

2. Should `getNote()` throw on missing selected result, or return the Note with empty `results`?

   Recommendation: throw a typed `NotePersistenceError` for explicit `by-result-id`; return empty result for latest queries with no matches.

3. Should `mutateNote()` accept both `rawContent` and `workoutResult` in one call?

   Recommendation: yes. Completing a workout currently needs to save latest content and append the result. The module should handle this atomically where the backend supports transactions.

4. Should static mode allow mutation?

   Recommendation: static/demo persistence can be memory-backed and advertise capabilities internally. The public seam should remain async and consistent.

---

## 9. Final Recommendation

Adopt **Design 1** as the persistence module direction:

- `getNote(locator, options?)`
- `listNotes(query?)`
- `mutateNote(locator, mutation)`
- `deleteNote(locator)`

Add `GetNoteOptions.resultSelection` to support History / Review without adding separate result-history methods.

This keeps the seam small while solving the real leakage:

- UI no longer imports `indexedDBService`
- result lookup moves into one module
- segment versioning moves into one module
- analytics persistence moves into one module
- History and Review flows are supported as projections of a Note, not as separate storage-shaped APIs
