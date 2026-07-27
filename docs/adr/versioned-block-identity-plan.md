# Versioned Block Identity — Implementation Plan (Revised after Grilling)

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Version derived at display time, not tracked on EditorSection | Parser is sync; no async coupling |
| 2 | Explicit `version` on WorkoutResult, assigned at record time | Handles content cycle (hashA→hashB→hashA) |
| 3 | Lazy write-time migration for old results | Preserves data without permanent fallbacks |
| 4 | ResultSelection uses `blockId`, version filtered client-side | Simple query, display does the grouping |
| 5 | No new IndexedDB index for v1 | Filter in memory from existing `by-note` fetch |
| 6 | No undo handling needed | Content-based display filter is inherently undo-safe |
| 7 | Current-version results by default, collapsed history badge | Matches user expectation |
| 8 | Position-scoped results (`blockId` primary) | Fixes duplication; `contentId` retained for version grouping |

## What Changed from Original Plan

- **Eliminated**: Parser changes (was Phase 2, the riskiest part)
- **Eliminated**: IndexedDB schema changes (no new index needed)
- **Eliminated**: `version` on `EditorSection` and `ScriptBlock`
- **Simplified**: Version is a display-time computation, not a tracked field
- **Added**: Lazy migration function (one-shot, per-note)
- **Reduced**: ~15 files instead of ~25

## Data Model

```ts
// WorkoutResult — the only type that changes
WorkoutResult {
  id: string
  noteId: string
  blockId?: string         // NEW — section position (which block in the note)
  blockContentId?: string  // EXISTING — content hash (which workout)
  version?: number         // NEW — generation number, assigned at record time
  data: WorkoutResults
  completedAt: number
}

// EditorSection — NO CHANGE. Version is derived, not stored.
// ScriptBlock — NO CHANGE. No version field needed.
```

## Display Logic (pure function, no storage changes)

```ts
function groupResultsByVersion(
  results: WorkoutResult[],
  section: EditorSection,
): {
  current: WorkoutResult[]      // matches section.contentId
  history: Map<number, {        // keyed by version number
    contentId: string
    results: WorkoutResult[]
  }>
  currentVersion: number        // max version matching section.contentId
} {
  const blockResults = results.filter(r => r.blockId === section.id);
  const byVersion = new Map<number, WorkoutResult[]>();
  for (const r of blockResults) {
    const v = r.version ?? 1;
    if (!byVersion.has(v)) byVersion.set(v, []);
    byVersion.get(v)!.push(r);
  }
  // Current = version(s) matching section.contentId
  const current = blockResults.filter(r =>
    (r.blockContentId ?? '') === (section.contentId ?? '')
  );
  const currentVersion = current.length > 0
    ? Math.max(...current.map(r => r.version ?? 1))
    : Math.max(0, ...byVersion.keys()) + 1; // next version if no match
  // History = everything not current
  const history = new Map();
  for (const [v, rs] of byVersion) {
    if (!current.some(r => (r.version ?? 1) === v)) {
      history.set(v, { contentId: rs[0].blockContentId, results: rs });
    }
  }
  return { current, history, currentVersion };
}
```

## Phased Rollout

### Phase 1 — Types + Recorder + Migration (~5 files)

1. Add `blockId?`, `version?` to `WorkoutResult` in `src/types/storage.ts`
2. Update `RecordResultInput` in `playground/src/services/resultRecorder.ts`:
   - Accept `blockId: string`
   - At record time: query existing results for blockId, compute version
3. Update 3 callers to pass `blockId`:
   - `JournalPage.tsx`: `blockId: timerBlock.id`
   - `useCanvasRuntime.ts`: `blockId: block?.id`
   - `workbenchSessionStore.ts`: `blockId: selectedBlockId`
4. Add lazy migration function `migrateResults(results, sections)` — called on note load

### Phase 2 — Display Filters (~4 files)

5. Add `groupResultsByVersion()` pure function (location: `src/components/Editor/utils/resultGrouping.ts`)
6. Update `NoteEditor.tsx` useEffect:
   - Filter: `r.blockId === section.id && r.blockContentId === section.contentId` for current
   - Pass `allBlockResults` to widget for history toggle
7. Update `useScriptBlockResults.ts`: same filter
8. Update `useNotePageNav.ts`: badge counts current-version results only

### Phase 3 — UI (~3 files)

9. `InlineResultPanel.tsx`: version badge, history toggle, version labels on rows
10. `whiteboard-results-widget.ts`: widget carries `allBlockResults` for history
11. Version badge CSS (minimal)

### Phase 4 — Tests (~3 files)

12. `resultGrouping.test.ts`: version grouping, cycle case, empty case
13. `resultRecorder.test.ts`: version assignment at record time
14. Update existing test fixtures with `blockId`

### Phase 5 — Docs

15. Update `CONTEXT.md`: Block Content Id entry — note position-scoping
16. Update `docs/adr/versioned-block-identity.md`: reflect grilling decisions

## File Count

| Area | Files | Count |
|------|-------|-------|
| Types | `storage.ts` | 1 |
| Recorder | `resultRecorder.ts` | 1 |
| Callers | `JournalPage.tsx`, `useCanvasRuntime.ts`, `workbenchSessionStore.ts` | 3 |
| Migration | new file or in `IndexedDBService.ts` | 1 |
| Display | new `resultGrouping.ts`, `NoteEditor.tsx`, `useScriptBlockResults.ts`, `useNotePageNav.ts` | 4 |
| UI | `InlineResultPanel.tsx`, `whiteboard-results-widget.ts` | 2 |
| Tests | 3 files | 3 |
| Docs | `CONTEXT.md`, ADR | 2 |
| **Total** | | **17** |

## Migration Function

```ts
/**
 * One-shot migration: backfills blockId + version on legacy results.
 * Called on note load when any results lack blockId.
 * Matched by contentId → assigned to first section with that content.
 */
function migrateResults(
  results: WorkoutResult[],
  sections: EditorSection[],
): { migrated: WorkoutResult[]; dirty: boolean } {
  if (!results.some(r => !r.blockId)) return { migrated: results, dirty: false };
  const byContentId = new Map(
    sections.filter(s => s.contentId).map(s => [s.contentId!, s.id])
  );
  return {
    migrated: results.map(r => ({
      ...r,
      blockId: r.blockId ?? byContentId.get(r.blockContentId ?? '') ?? r.blockContentId,
      version: r.version ?? 1,
    })),
    dirty: true,
  };
}
```
