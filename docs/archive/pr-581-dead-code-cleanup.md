# Dead Code Analysis — Post PR #581 Cleanup

**Scope:** Changes that become removable or superseded after `copilot/deepen-note-persistence-module` merges  
**Date:** 2026-05-08  
**Related:** `docs/pr-581-merge-plan.md`, `docs/note-persistence-module-plan.md`

--- 

## Summary

PR #581 moves the primary persistence seam from scattered `indexedDBService` direct-imports to the new `INotePersistence` interface. That migration exposes three categories of dead code:

1. **`IndexedDBService` methods with zero callers** — safe to delete immediately after merge
2. **Legacy playground pages** that pre-date the WorkbenchContext flow and still call `indexedDBService` directly — candidates for migration or removal
3. **`createContentProvider` factory + `LocalStorageContentProvider`** — the factory wires `history` mode to `LocalStorageContentProvider`, but nothing in the app actually uses this path; the real app uses `IndexedDBContentProvider` directly

There is also one correctness gap in the PR itself: `segmentVersion` is hardcoded to `0` in analytics points inside `IndexedDBNotePersistence`, while `IndexedDBContentProvider` correctly reads the actual latest segment version. That gap is tracked here as cleanup work.

---

## Category 1 — `IndexedDBService` Dead Methods

These methods have **zero callers** anywhere outside `IndexedDBService.ts` itself. They are safe to delete after the PR lands.

### Confirmed dead (0 callers in entire codebase)

| Method | Notes |
|---|---|
| `getSegment(id, version)` | Single-segment fetch never called outside the service |
| `getSegmentHistory(segmentId)` | Segment version history never consumed |
| `getAnalyticsByType(metricType)` | Analytics read-side methods — no UI or service reads analytics by type |
| `getAnalyticsBySegment(segmentId)` | Same — analytics are written but never queried by segment |
| `getAnalyticsByResult(resultId)` | Same — never consumed |
| `deleteAnalyticsForResult(resultId)` | No cascade deletion ever triggered |
| `getAttachment(id)` | Single-attachment fetch by ID — never called; `getAttachmentsForNote` is used instead |

### Deprecated aliases — already marked `@deprecated`, callers are 0

| Method | Delegates to |
|---|---|
| `saveSectionHistory(history)` | → `saveSegment(history)` |
| `getLatestSectionVersion(sectionId)` | → `getLatestSegmentVersion(sectionId)` |
| `getSectionHistory(sectionId)` | → `getSegmentHistory(sectionId)` |

These were added during a rename. The original names have no callers. Delete the three aliases and the `getSegmentHistory` method they delegate to (which itself has no callers after alias removal).

### How to remove

1. Delete the 10 methods listed above from `IndexedDBService.ts`
2. Remove corresponding entries from the `NotePersistenceStorage` interface in `src/services/persistence/types.ts` if any were also mirrored there — **they are not**: `NotePersistenceStorage` only required what the persistence layer actively uses
3. Run `bun run test` — no test coverage exists for any of these methods, so no test changes expected

---

## Category 2 — Legacy Playground Pages Bypassing the Seam

These are routed pages in `playground/src/` that were written before `WorkbenchContext` existed. They import `indexedDBService` directly rather than going through the persistence seam.

### Files and their violations

**`playground/src/pages/TrackerPage.tsx`** (`/tracker/:runtimeId`)
```typescript
import { indexedDBService } from '@/services/db/IndexedDBService'
// ...
indexedDBService.saveResult({ id: runtimeId, noteId: pending.noteId, ... })
```
Writes a result directly. The `WorkbenchContext.completeWorkout()` path via `notePersistence.mutateNote()` is the correct replacement.

**`playground/src/pages/ReviewPage.tsx`** (`/review/:runtimeId`)
```typescript
import { indexedDBService } from '@/services/db/IndexedDBService'
// ...
indexedDBService.getResultById(resultId).then(result => { ... })
```
Reads a result by ID directly. Should use `notePersistence.getNote(noteId, { projection: 'review', resultSelection: { mode: 'by-result-id', resultId } })`.

**`playground/src/pages/JournalPage.tsx`** (used at `/journal/:noteId`)
```typescript
import { indexedDBService } from '@/services/db/IndexedDBService'
// ...
indexedDBService.getResultsForNote(noteId)
indexedDBService.saveResult({ ... })
```
Both reads and writes bypass the seam.

**`playground/src/canvas/MarkdownCanvasPage.tsx`**
```typescript
import { indexedDBService } from '@/services/db/IndexedDBService'
// ...
indexedDBService.getResultsForNote(canvasNoteId)
indexedDBService.saveResult(nextResult)
```
Canvas pages have their own runtime management and persist results directly.

**`playground/src/App.tsx`** and **`playground/src/services/commandStrategies.tsx`** and **`playground/src/views/ListViews.tsx`**
```typescript
indexedDBService.getRecentResults(20 | 50 | 100)
```
`getRecentResults()` is called in three places to populate home-screen recent results and command palette suggestions. This method **is not in `INotePersistence`** — the persistence module plan routes list operations through `listNotes({ limit })` which returns `HistoryEntry[]` sorted by date. These callers should migrate to `notePersistence.listNotes({ limit: N })`.

### Migration approach

**Option A — Migrate each page to use `notePersistence`**  
Thread `notePersistence` into each page via context or prop injection. This is the clean path aligned with the plan.

**Option B — Assess whether TrackerPage and ReviewPage are legacy dead routes**  
`/tracker/:runtimeId` and `/review/:runtimeId` appear to be a pre-WorkbenchContext routing pattern that predates the current note-based workout flow. If the primary workout flow now goes through `WorkbenchContext.startWorkout()` → `WorkbenchContext.completeWorkout()` → `/note/:id/review/:sectionId`, these routes may be unreachable from any UI. If confirmed dead, delete the pages and their routes in `App.tsx`.

### `getRecentResults` — replace with `listNotes`

The three callers of `getRecentResults` are asking the same question `listNotes` answers:

```typescript
// Before
const results = await indexedDBService.getRecentResults(20)

// After — through the persistence seam
const entries = await notePersistence.listNotes({ limit: 20 })
// entries are HistoryEntry[], sorted by updatedAt — use entry.results for last result
```

Once this migration is done, `getRecentResults` on `IndexedDBService` also becomes dead and can be deleted.

---

## Category 3 — `createContentProvider` Factory and `LocalStorageContentProvider`

### The problem

`src/services/content/index.ts` exports a `createContentProvider` factory:

```typescript
export function createContentProvider(
  config: { mode: 'static'; initialContent: string } | { mode: 'history' }
): IContentProvider {
  if (config.mode === 'static') return new StaticContentProvider(config.initialContent);
  return new LocalStorageContentProvider();  // ← never actually used
}
```

**Zero callers invoke this factory** anywhere in `playground/src/` or `src/`. The real app constructs `IndexedDBContentProvider` directly (not through this factory). This means `LocalStorageContentProvider` is only alive via this dead factory path.

### `LocalStorageContentProvider` status

`LocalStorageContentProvider` fully implements `IContentProvider` with localStorage as the backing store. It has no callers in the running application. The test suite in `src/services/content/__tests__/LocalStorageContentProvider.test.ts` still covers it. Two choices:

- **Delete it** if localStorage persistence is genuinely no longer a supported mode
- **Keep it as a named adapter** if it's intended for embedded/offline-first deployment scenarios — but remove it from the `createContentProvider` factory and document it separately

### Recommendation

1. Delete `createContentProvider` from `src/services/content/index.ts` (it creates a false expectation that `LocalStorageContentProvider` is the "history" mode implementation)
2. Decide whether `LocalStorageContentProvider` stays as an explicitly documented adapter or is removed; if keeping it, move it out of the main barrel export and give it a comment explaining its role

---

## Category 4 — `segmentVersion` Hardcoded to 0 (Correctness Gap in PR)

This is not dead code but a correctness hole introduced by the PR that belongs in the same cleanup pass.

**Location:** `src/services/persistence/IndexedDBNotePersistence.ts` lines 52 and 69

```typescript
// Current (wrong)
segmentVersion: 0,

// IndexedDBContentProvider correctly does (line 370):
segmentVersion: latestSegment?.version,
```

`AnalyticsDataPoint.segmentVersion` is meant to link an analytics point to the exact content version that was active when the workout ran. Hardcoding `0` breaks any analytics query that tries to correlate "which version of the workout was run" with "what the content looked like at that time."

### Fix

In `IndexedDBNotePersistence.normalizeAnalyticsSegments()`, accept an optional `segmentVersion` parameter and thread it from `mutateNote()` after the `updateEntry()` call resolves:

```typescript
// After mutateNote calls contentProvider.updateEntry() and gets back the saved entry,
// read the actual segment version and pass it to normalizeAnalyticsSegments

const updatedEntry = await this.contentProvider.updateEntry(note.id, patch);
// updatedEntry carries the actual persisted segmentVersion from the latest segment
const actualSegmentVersion = /* read from updatedEntry or re-query */;

const points = normalizeAnalyticsSegments(
  analyticsSegments,
  note.id,
  mutation.analytics?.resultId ?? resultId,
  actualSegmentVersion,  // pass through
);
```

---

## Cleanup Execution Order

Do these in order to avoid breaking intermediate states:

### Step 1 — Merge PR #581 with the 9 fixes from `docs/pr-581-merge-plan.md`

This is the prerequisite. Everything below assumes the PR is merged.

### Step 2 — Delete `IndexedDBService` dead methods

**Files:** `src/services/db/IndexedDBService.ts`  
**Delete:** `getSegment`, `getSegmentHistory`, `getAnalyticsByType`, `getAnalyticsBySegment`, `getAnalyticsByResult`, `deleteAnalyticsForResult`, `getAttachment`, `saveSectionHistory`, `getLatestSectionVersion`, `getSectionHistory`  
**Validation:** `bun run test` — no test changes needed (no test coverage for these methods)

### Step 3 — Fix `segmentVersion: 0` in `IndexedDBNotePersistence`

**File:** `src/services/persistence/IndexedDBNotePersistence.ts`  
**Change:** Thread actual segment version from `contentProvider.updateEntry()` result into `normalizeAnalyticsSegments`  
**Validation:** Existing analytics normalization tests should still pass; add a test asserting `segmentVersion` is non-zero when a segment exists

### Step 4 — Migrate `getRecentResults` callers to `listNotes`

**Files:** `playground/src/App.tsx`, `playground/src/services/commandStrategies.tsx`, `playground/src/views/ListViews.tsx`  
**Change:** Replace `indexedDBService.getRecentResults(N)` with `notePersistence.listNotes({ limit: N })`  
**After:** Delete `getRecentResults` from `IndexedDBService.ts`

### Step 5 — Assess and remove/migrate legacy playground pages

**Audit:** Confirm whether `/tracker/:runtimeId` and `/review/:runtimeId` are reachable from any current UI entry point. If not:
- Delete `playground/src/pages/TrackerPage.tsx`
- Delete `playground/src/pages/ReviewPage.tsx`
- Remove their routes from `playground/src/App.tsx`

If they are reachable (e.g., through `pendingRuntimes` flow from canvas pages), migrate them to use `notePersistence` instead of direct `indexedDBService`.

**Also migrate:** `JournalPage.tsx` and `MarkdownCanvasPage.tsx` direct result writes → `notePersistence.mutateNote()`

### Step 6 — Remove dead `createContentProvider` factory

**File:** `src/services/content/index.ts`  
**Delete:** The `createContentProvider` function  
**Decision point:** Keep or delete `LocalStorageContentProvider` — if keeping, document explicitly; if deleting, also remove `LocalStorageContentProvider.ts` and its tests

### Step 7 — Verify acceptance criterion from the plan

After all steps, this should return no results:

```bash
rg "indexedDBService" src/components src/hooks src/panels
rg "indexedDBService" playground/src/
```

---

## Final State After Cleanup

| Area | Before PR | After PR | After Cleanup |
|---|---|---|---|
| UI direct `indexedDBService` imports (src/) | 4 files | 0 files ✅ | 0 files |
| Playground direct `indexedDBService` imports | 0 (was never in scope) | 8 call sites | 0 after step 4–5 |
| `IndexedDBService` public method count | 27 | 27 | ~14 (dead methods removed) |
| `LocalStorageContentProvider` status | Used via factory | Unused | Deleted or explicitly documented |
| `segmentVersion` accuracy | N/A | Hardcoded 0 | Correct live value |

---

## Quick Reference: What to Touch in Each File

| File | Action |
|---|---|
| `src/services/db/IndexedDBService.ts` | Delete 10 dead methods (steps 2, 4) |
| `src/services/persistence/IndexedDBNotePersistence.ts` | Fix `segmentVersion: 0` (step 3) |
| `src/services/content/index.ts` | Delete `createContentProvider` factory (step 6) |
| `src/services/content/LocalStorageContentProvider.ts` | Delete or document (step 6) |
| `playground/src/App.tsx` | Replace `getRecentResults`, remove dead routes (steps 4, 5) |
| `playground/src/services/commandStrategies.tsx` | Replace `getRecentResults` (step 4) |
| `playground/src/views/ListViews.tsx` | Replace `getRecentResults` (step 4) |
| `playground/src/pages/TrackerPage.tsx` | Delete or migrate (step 5) |
| `playground/src/pages/ReviewPage.tsx` | Delete or migrate (step 5) |
| `playground/src/pages/JournalPage.tsx` | Migrate direct writes (step 5) |
| `playground/src/canvas/MarkdownCanvasPage.tsx` | Migrate direct writes (step 5) |
